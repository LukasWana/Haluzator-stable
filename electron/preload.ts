import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Read file from Electron main process
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
});

