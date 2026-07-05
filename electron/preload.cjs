const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("oolong", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  getHistory: () => ipcRenderer.invoke("history:list"),
  clearHistory: () => ipcRenderer.invoke("history:clear"),
  deleteHistoryEntry: (id) => ipcRenderer.invoke("history:delete", id),
  runAction: (request) => ipcRenderer.invoke("action:run", request),
  copyText: (text) => ipcRenderer.invoke("clipboard:copy", text),
  onFocusInput: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("focus-input", listener);
    return () => ipcRenderer.removeListener("focus-input", listener);
  },
  onOpenSettings: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("open-settings", listener);
    return () => ipcRenderer.removeListener("open-settings", listener);
  },
  onServiceInput: (callback) => {
    const listener = (_, request) => callback(request);
    ipcRenderer.on("service-input", listener);
    return () => ipcRenderer.removeListener("service-input", listener);
  }
});
