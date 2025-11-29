import { contextBridge, ipcRenderer } from 'electron' // ❗ 增加 ipcRenderer 导入
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 1. 暴露 Dialog API 给前端调用
  dialog: {
    // 转发文件选择请求到 Main 进程
    showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:open', options),
  },

  // 2. 暴露文件系统 (FS) 操作 API
  fs: {
    // 转发 JSON 拆分请求到 Main 进程
    splitJson: (filePath: string, chunkSize: number, outputPath: string) =>
      ipcRenderer.invoke('fs:split-json', filePath, chunkSize, outputPath),
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api) // 自定义 API 在这里被安全暴露
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
