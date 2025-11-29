import { contextBridge , ipcRenderer} from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { HardwareDevice, SystemInfo, DriverInstallProgress } from '../types/hardware'


// Custom APIs for renderer
const api = {
  // 获取系统信息
  getSystemInfo: (): Promise<SystemInfo> =>
    ipcRenderer.invoke('get-system-info'),

  // 获取硬件设备列表
  getHardwareDevices: (): Promise<HardwareDevice[]> =>
    ipcRenderer.invoke('get-hardware-devices'),

  // 检查驱动更新
  checkDriverUpdates: (deviceId: string) =>
    ipcRenderer.invoke('check-driver-updates', deviceId),

  // 批量检查所有驱动
  checkAllDrivers: (): Promise<void> =>
    ipcRenderer.invoke('check-all-drivers'),

  // 安装驱动
  installDriver: (deviceId: string): Promise<boolean> =>
    ipcRenderer.invoke('install-driver', deviceId),

  // 一键安装所有必要驱动
  installAllDrivers: (): Promise<void> =>
    ipcRenderer.invoke('install-all-drivers'),

  // 监听驱动安装进度
  onDriverProgress: (callback: (progress: DriverInstallProgress) => void) => {
    const subscription = (_event: any, progress: DriverInstallProgress) => callback(progress)
    ipcRenderer.on('driver-progress', subscription)
    return () => ipcRenderer.removeListener('driver-progress', subscription)
  },

  // 监听硬件变化
  onHardwareChange: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on('hardware-changed', subscription)
    return () => ipcRenderer.removeListener('hardware-changed', subscription)
  }
}


// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
