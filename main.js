const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let windowProtection;
let mainWindow;

// Carrega o módulo C++ compilado
try {
  windowProtection = require('./build/Release/windowprotection.node');
  console.log('Módulo C++ carregado com sucesso');
} catch (error) {
  console.error('Erro ao carregar módulo C++:', error);
  dialog.showErrorBox('Erro', 'Não foi possível carregar o módulo C++. Execute npm run build primeiro.');
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
    title: 'Window Protection App'
  });

  mainWindow.loadFile('index.html');

  // Abre DevTools em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// IPC handlers para comunicação com o renderer
ipcMain.handle('protect-window', async (event, windowTitle) => {
  if (!windowProtection) {
    throw new Error('Módulo C++ não carregado');
  }

  try {
    // Obtém o handle da janela pelo título
    const hwnd = windowProtection.getWindowByTitle(windowTitle);
    
    if (!hwnd) {
      throw new Error(`Janela com título "${windowTitle}" não encontrada`);
    }

    // Aplica proteção contra captura de tela
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
    // Obtém o handle da janela atual do Electron
    const hwnd = mainWindow.getNativeWindowHandle();
    
    // Converte Buffer para número se necessário
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});