const { contextBridge, ipcRenderer } = require('electron');

/**
 * Bayan Desktop Preload Script
 * Follows Electron security best practices:
 * - contextIsolation: true
 * - nodeIntegration: false
 * - Controlled, specific IPC channels
 */

contextBridge.exposeInMainWorld('bayanDesktop', {
  isDesktop: true,
  version: '1.0.0',
  platform: process.platform,

  // Status updates during startup
  onStatus: (callback) => {
    const handler = (_event, message) => callback(message);
    ipcRenderer.on('desktop:status', handler);
    return () => ipcRenderer.removeListener('desktop:status', handler);
  },

  // Error notifications
  onServerError: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('desktop:server-error', handler);
    return () => ipcRenderer.removeListener('desktop:server-error', handler);
  },

  // Recovery actions
  restartServer: () => {
    ipcRenderer.send('desktop:restart-server');
  },

  openLogs: () => {
    ipcRenderer.send('desktop:open-logs');
  },
});

