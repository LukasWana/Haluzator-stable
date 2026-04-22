import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Read file from Electron main process
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  // Save file using Electron save dialog
  saveFile: (data: string, defaultFileName: string) => ipcRenderer.invoke('save-file', data, defaultFileName),
  // Create projection window
  createProjectionWindow: () => ipcRenderer.invoke('create-projection-window'),
  // Check if projection window exists
  getProjectionWindow: () => ipcRenderer.invoke('get-projection-window'),
  // Get projection window webContents ID
  getProjectionWindowId: () => ipcRenderer.invoke('get-projection-window-id'),
  // Move elements to projection window
  moveElementsToProjection: (canvasId: string, overlayId: string) => ipcRenderer.invoke('move-elements-to-projection', canvasId, overlayId),
  // Listen for projection window closed
  onProjectionClosed: (callback: () => void) => {
    ipcRenderer.on('projection-window-closed', () => callback());
    return () => ipcRenderer.removeAllListeners('projection-window-closed');
  },
  // Listen for projection ready for elements
  onProjectionReady: (callback: (data: { canvasId: string, overlayId: string }) => void) => {
    ipcRenderer.on('projection-ready-for-elements', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('projection-ready-for-elements');
  },
});

