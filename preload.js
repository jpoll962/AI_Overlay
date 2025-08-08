const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openClaude: () => ipcRenderer.invoke('open-claude'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  toggleAccordion: (isMinimized) => ipcRenderer.invoke('toggle-accordion', isMinimized),
  toggleWindowless: (isWindowless) => ipcRenderer.invoke('toggle-windowless', isWindowless),
  
  // Service management
  startService: (serviceType, config) => ipcRenderer.invoke('start-service', serviceType, config),
  stopService: (serviceType) => ipcRenderer.invoke('stop-service', serviceType),
  getServiceStatus: (serviceType) => ipcRenderer.invoke('get-service-status', serviceType)
});