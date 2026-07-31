import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  request: (method, endpoint, data) =>
    ipcRenderer.invoke('api:request', method, endpoint, data),
})
