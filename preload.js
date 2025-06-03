const { contextBridge, ipcRenderer } = require('electron');

// Expõe APIs seguras para o renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Protege uma janela por título
  protectWindow: (windowTitle) => {
    return ipcRenderer.invoke('protect-window', windowTitle);
  },
  
  // Remove proteção de uma janela por título
  unprotectWindow: (windowTitle) => {
    return ipcRenderer.invoke('unprotect-window', windowTitle);
  },
  
  // Protege a janela atual do Electron
  protectCurrentWindow: () => {
    return ipcRenderer.invoke('protect-current-window');
  }
});