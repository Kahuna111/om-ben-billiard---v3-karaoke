const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // App controls
  exitApp: () => ipcRenderer.invoke('app:exit'),
  reloadApp: () => ipcRenderer.invoke('app:reload'),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('system:info'),

  // WiFi controls
  scanWifi: () => ipcRenderer.invoke('wifi:scan'),
  getCurrentWifi: () => ipcRenderer.invoke('wifi:current'),
  connectWifi: (ssid, password) => ipcRenderer.invoke('wifi:connect', ssid, password),
  disconnectWifi: () => ipcRenderer.invoke('wifi:disconnect'),

  // Flag to detect we're inside Electron
  isElectron: true
});
