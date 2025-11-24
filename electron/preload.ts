import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Read file from Electron main process
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  // Save file using Electron save dialog
  saveFile: (data: string, defaultFileName: string) => ipcRenderer.invoke('save-file', data, defaultFileName),
  // Configure projection window (call after window.open)
  configureProjectionWindow: () => ipcRenderer.invoke('configure-projection-window'),
  // Listen for projection window closed
  onProjectionClosed: (callback: () => void) => {
    ipcRenderer.on('projection-window-closed', () => callback());
    return () => ipcRenderer.removeAllListeners('projection-window-closed');
  },
});

