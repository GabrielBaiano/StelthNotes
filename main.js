const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require('electron');
const path = require('path');

let windowProtection;
let mainWindow;
let tray = null; // Variável para manter a referência do ícone da bandeja

// Carrega o módulo C++ compilado
try {
  windowProtection = require('./build/Release/windowprotection.node');
  console.log('Módulo C++ carregado com sucesso');
} catch (error) {
  console.error('Erro ao carregar módulo C++:', error);
  dialog.showErrorBox('Erro', 'Não foi possível carregar o módulo C++. Execute npm run build primeiro.');
  // Se o módulo não carregar, encerramos o app para evitar erros.
  app.quit(); 
}

function createWindow() {
  // Cria a janela principal
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Window Protection App',
    skipTaskbar: true, // Remove o ícone da barra de tarefas
    icon: path.join(__dirname, 'assets/testicon.jpg'), // Define o ícone da janela
    alwaysOnTop: true // Mantém a janela sempre visível por padrão
  });

  mainWindow.loadFile('index.html');

  // Abre DevTools em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Limpa a referência da janela ao ser fechada
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- Funções da Bandeja do Sistema ---
function createTray() {
    const iconPath = path.join(__dirname, 'assets/testicon.jpg');
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Manter no Topo',
            type: 'checkbox',
            checked: true, // Inicia marcado, pois alwaysOnTop é true
            click: (menuItem) => {
                if (mainWindow) {
                    // Define o estado de alwaysOnTop baseado no estado do checkbox
                    mainWindow.setAlwaysOnTop(menuItem.checked);
                }
            }
        },
        {
            label: 'Minimizar/Restaurar',
            click: () => {
                if (mainWindow) {
                    // Se a janela estiver minimizada ou não visível, restaura. Caso contrário, minimiza.
                    if (mainWindow.isMinimized() || !mainWindow.isVisible()) {
                        mainWindow.restore();
                        mainWindow.show();
                    } else {
                        mainWindow.minimize();
                    }
                }
            }
        },
        { type: 'separator' }, // Adiciona uma linha de separação visual
        {
            label: 'Fechar',
            click: () => {
                app.isQuiting = true; // Sinaliza que o app está sendo fechado
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Window Protection App');
    tray.setContextMenu(contextMenu);

    // Opcional: Clicar no ícone da bandeja também pode restaurar a janela
    tray.on('click', () => {
        if (mainWindow) {
             if (mainWindow.isMinimized() || !mainWindow.isVisible()) {
                mainWindow.show();
                mainWindow.restore();
            } else {
                 mainWindow.focus();
            }
        }
    });
}


// IPC handlers para comunicação com o renderer (sem alterações aqui)
ipcMain.handle('protect-window', async (event, windowTitle) => {
  if (!windowProtection) {
    throw new Error('Módulo C++ não carregado');
  }

  try {
    const hwnd = windowProtection.getWindowByTitle(windowTitle);
    
    if (!hwnd) {
      throw new Error(`Janela com título "${windowTitle}" não encontrada`);
    }

    const result = windowProtection.setWindowDisplayAffinity(hwnd);
    
    return {
      success: result,
      message: result ? 'Proteção aplicada com sucesso' : 'Falha ao aplicar proteção',
      hwnd: hwnd
    };
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('unprotect-window', async (event, windowTitle) => {
  if (!windowProtection) {
    throw new Error('Módulo C++ não carregado');
  }

  try {
    const hwnd = windowProtection.getWindowByTitle(windowTitle);
    
    if (!hwnd) {
      throw new Error(`Janela com título "${windowTitle}" não encontrada`);
    }

    const result = windowProtection.removeWindowDisplayAffinity(hwnd);
    
    return {
      success: result,
      message: result ? 'Proteção removida com sucesso' : 'Falha ao remover proteção',
      hwnd: hwnd
    };
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('protect-current-window', async () => {
  if (!windowProtection || !mainWindow) {
    throw new Error('Módulo C++ não carregado ou janela não encontrada');
  }

  try {
    const hwnd = mainWindow.getNativeWindowHandle();
    
    const hwndNumber = Buffer.isBuffer(hwnd) 
      ? hwnd.readBigUInt64LE ? Number(hwnd.readBigUInt64LE(0)) : hwnd.readUInt32LE(0)
      : hwnd;

    const result = windowProtection.setWindowDisplayAffinity(hwndNumber);
    
    return {
      success: result,
      message: result ? 'Janela atual protegida' : 'Falha ao proteger janela atual'
    };
  } catch (error) {
    throw error;
  }
});

// Eventos do app
app.whenReady().then(() => {
  createWindow();
  createTray(); // Cria o ícone e o menu da bandeja

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // No macOS, é comum os aplicativos e suas barras de menu 
  // permanecerem ativos até que o usuário saia explicitamente com Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});