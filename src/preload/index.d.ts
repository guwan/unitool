import { ElectronAPI } from '@electron-toolkit/preload'
import type { HardwareDevice, SystemInfo, DriverInstallProgress, DriverInfo } from '../types/hardware'

// 定义硬件 API 类型
interface HardwareAPI {
  getSystemInfo: () => Promise<SystemInfo>
  getHardwareDevices: () => Promise<HardwareDevice[]>
  checkDriverUpdates: (deviceId: string) => Promise<DriverInfo>
  checkAllDrivers: () => Promise<void>
  installDriver: (deviceId: string) => Promise<boolean>
  installAllDrivers: () => Promise<void>
  onDriverProgress: (callback: (progress: DriverInstallProgress) => void) => () => void
  onHardwareChange: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: HardwareAPI
  }
}
