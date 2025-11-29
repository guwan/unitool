// src/main/hardwareHandler.ts
import { ipcMain, BrowserWindow } from 'electron';
import si from 'systeminformation';
import { exec } from 'child_process';
import { promisify } from 'util';
import iconv from 'iconv-lite';
import driverManager from './driverManager';
import type { HardwareDevice, SystemInfo, DriverInfo } from '../types/hardware';

const execAsync = promisify(exec);

async function execWithEncoding(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { encoding: 'buffer' }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      const output = iconv.decode(stdout as Buffer, 'cp936');
      resolve(output);
    });
  });
}

class HardwareManager {
  private mainWindow: BrowserWindow | null = null;
  private driverCache: Map<string, DriverInfo> = new Map();
  private isCheckingDrivers: boolean = false;

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  async getSystemInfo(): Promise<SystemInfo> {
    let osInfo;
    let cpuInfo;

    if (process.platform === 'win32') {
      try {
        const osData = await this.getWindowsOSInfo();
        osInfo = osData;
      } catch {
        osInfo = await si.osInfo();
      }
    } else {
      osInfo = await si.osInfo();
    }

    cpuInfo = await si.cpu();

    return {
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch
      },
      cpu: {
        manufacturer: cpuInfo.manufacturer,
        brand: cpuInfo.brand,
        cores: cpuInfo.cores
      },
      devices: await this.getHardwareDevices()
    };
  }

  private async getWindowsOSInfo() {
    try {
      const stdout = await execWithEncoding(
        'wmic os get Caption,Version,OSArchitecture /format:csv'
      );

      const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
      if (lines.length > 0) {
        const parts = lines[0].split(',').map(p => p.trim());
        return {
          platform: 'Windows',
          distro: parts[1] || 'Windows',
          release: parts[3] || '',
          arch: parts[2] || ''
        };
      }
    } catch (error) {
      console.error('Error fetching OS info:', error);
    }

    return await si.osInfo();
  }

  async getHardwareDevices(): Promise<HardwareDevice[]> {
    const devices: HardwareDevice[] = [];

    try {
      // 并行获取硬件信息以加速
      const [cpuInfo, graphics] = await Promise.all([
        si.cpu(),
        si.graphics()
      ]);

      // CPU
      devices.push({
        id: 'cpu-0',
        category: 'CPU',
        name: cpuInfo.brand,
        manufacturer: cpuInfo.manufacturer,
        model: cpuInfo.brand,
        driver: this.driverCache.get('cpu-0') || {
          installed: true,
          isLatest: false,
          isLTS: false,
          updateAvailable: false,
          status: 'checking' // 初始状态为检查中
        }
      });

      // GPU
      graphics.controllers.forEach((gpu, index) => {
        const deviceId = `gpu-${index}`;
        const gpuName = gpu.model || 'Unknown GPU';

        // 检测是否为虚拟显示适配器（不需要驱动）
        const isVirtualDisplay =
          gpuName.toLowerCase().includes('oray') ||
          gpuName.toLowerCase().includes('virtual') ||
          gpuName.toLowerCase().includes('indirect') ||
          gpuName.toLowerCase().includes('basic display') ||
          gpuName.toLowerCase().includes('basic render');

        devices.push({
          id: deviceId,
          category: 'GPU',
          name: gpuName,
          manufacturer: gpu.vendor || 'Unknown',
          model: gpuName,
          deviceId: gpu.deviceId || undefined,
          vendorId: gpu.vendorId || undefined,
          driver: this.driverCache.get(deviceId) || {
            // 虚拟显卡标记为已安装且最新，其他显卡默认为检查中
            installed: isVirtualDisplay ? true : true,
            version: undefined,
            date: undefined,
            isLatest: isVirtualDisplay,
            isLTS: false,
            updateAvailable: false,
            status: isVirtualDisplay ? 'ok' : 'checking'
          }
        });
      });

      // Network
      if (process.platform === 'win32') {
        const networkDevices = await this.getWindowsNetworkDevices();
        devices.push(...networkDevices);
      } else {
        const networkInterfaces = await si.networkInterfaces();
        networkInterfaces.forEach((nic, index) => {
          if (nic.virtual === false || nic.virtual === undefined) {
            const deviceId = `network-${index}`;
            devices.push({
              id: deviceId,
              category: 'Network',
              name: nic.iface,
              manufacturer: 'Network Adapter',
              model: nic.iface,
              driver: this.driverCache.get(deviceId) || {
                installed: true,
                isLatest: false,
                isLTS: false,
                updateAvailable: false,
                status: 'checking'
              }
            });
          }
        });
      }

      // Audio
      if (process.platform === 'win32') {
        const audioDevices = await this.getWindowsAudioDevices();
        devices.push(...audioDevices);
      }

      // Storage
      if (process.platform === 'win32') {
        const storageDevices = await this.getWindowsStorageDevices();
        devices.push(...storageDevices);
      } else {
        const diskLayout = await si.diskLayout();
        diskLayout.forEach((disk, index) => {
          const deviceId = `storage-${index}`;
          devices.push({
            id: deviceId,
            category: 'Storage',
            name: disk.name,
            manufacturer: disk.vendor || 'Unknown',
            model: disk.name,
            driver: this.driverCache.get(deviceId) || {
              installed: true,
              isLatest: false,
              isLTS: false,
              updateAvailable: false,
              status: 'checking'
            }
          });
        });
      }

      // USB设备
      if (process.platform === 'win32') {
        const usbDevices = await this.getWindowsUSBDevices();
        devices.push(...usbDevices);
      } else {
        const usbDevices = await si.usb();
        usbDevices.forEach((usb, index) => {
          const deviceId = `usb-${index}`;
          devices.push({
            id: deviceId,
            category: 'USB',
            name: usb.name || 'USB Device',
            manufacturer: usb.manufacturer || 'Unknown',
            model: usb.name || '',
            deviceId: usb.deviceId?.toString() || undefined,
            vendorId: usb.vendor || undefined,
            driver: this.driverCache.get(deviceId) || {
              installed: true,
              isLatest: false,
              isLTS: false,
              updateAvailable: false,
              status: 'checking'
            }
          });
        });
      }

    } catch (error) {
      console.error('Error fetching hardware devices:', error);
    }

    return devices;
  }

  private async getWindowsNetworkDevices(): Promise<HardwareDevice[]> {
    try {
      const stdout = await execWithEncoding(
        'wmic nic where "NetEnabled=true" get Name,Manufacturer,DeviceID /format:csv'
      );

      const lines = stdout.split('\n').slice(1).filter(line => line.trim() && !line.startsWith('Node'));

      return lines.map((line, index) => {
        const parts = line.split(',').map(p => p.trim());
        const deviceId = `network-${index}`;
        return {
          id: deviceId,
          category: 'Network' as const,
          name: parts[3] || 'Unknown Network Device',
          manufacturer: parts[2] || 'Unknown',
          model: parts[3] || '',
          deviceId: parts[1],
          driver: this.driverCache.get(deviceId) || {
            installed: true,
            isLatest: false,
            isLTS: false,
            updateAvailable: false,
            status: 'checking' as const
          }
        };
      });
    } catch (error) {
      console.error('Error fetching network devices:', error);
      return [];
    }
  }

  private async getWindowsAudioDevices(): Promise<HardwareDevice[]> {
    try {
      const stdout = await execWithEncoding(
        'wmic sounddev get Name,Manufacturer,DeviceID /format:csv'
      );

      const lines = stdout.split('\n').slice(1).filter(line => line.trim() && !line.startsWith('Node'));

      return lines.map((line, index) => {
        const parts = line.split(',').map(p => p.trim());
        const deviceId = `audio-${index}`;
        return {
          id: deviceId,
          category: 'Audio' as const,
          name: parts[3] || 'Unknown Audio Device',
          manufacturer: parts[2] || 'Unknown',
          model: parts[3] || '',
          deviceId: parts[1],
          driver: this.driverCache.get(deviceId) || {
            installed: true,
            isLatest: false,
            isLTS: false,
            updateAvailable: false,
            status: 'checking' as const
          }
        };
      });
    } catch (error) {
      console.error('Error fetching audio devices:', error);
      return [];
    }
  }

  private async getWindowsStorageDevices(): Promise<HardwareDevice[]> {
    try {
      const stdout = await execWithEncoding(
        'wmic diskdrive get Caption,Manufacturer,Model,DeviceID /format:csv'
      );

      const lines = stdout.split('\n').slice(1).filter(line => line.trim() && !line.startsWith('Node'));

      return lines.map((line, index) => {
        const parts = line.split(',').map(p => p.trim());
        const deviceId = `storage-${index}`;
        return {
          id: deviceId,
          category: 'Storage' as const,
          name: parts[1] || parts[4] || 'Unknown Storage Device',
          manufacturer: parts[3] || 'Unknown',
          model: parts[4] || parts[1] || '',
          deviceId: parts[2],
          driver: this.driverCache.get(deviceId) || {
            installed: true,
            isLatest: false,
            isLTS: false,
            updateAvailable: false,
            status: 'checking' as const
          }
        };
      });
    } catch (error) {
      console.error('Error fetching storage devices:', error);
      return [];
    }
  }

  private async getWindowsUSBDevices(): Promise<HardwareDevice[]> {
    try {
      const stdout = await execWithEncoding(
        'wmic path Win32_PnPEntity where "DeviceID like \'USB%\'" get Name,Manufacturer,DeviceID /format:csv'
      );

      const lines = stdout.split('\n').slice(1).filter(line => line.trim() && !line.startsWith('Node'));

      return lines.map((line, index) => {
        const parts = line.split(',').map(p => p.trim());
        const deviceIdStr = parts[1] || '';
        const name = parts[3] || 'USB Device';
        const manufacturer = parts[2] || 'Unknown';

        if (name.includes('Root Hub') || name.includes('Composite') || name.includes('Generic')) {
          return null;
        }

        const deviceId = `usb-${index}`;
        return {
          id: deviceId,
          category: 'USB' ,
          name: name,
          manufacturer: manufacturer,
          model: name,
          deviceId: deviceIdStr,
          driver: this.driverCache.get(deviceId) || {
            installed: true,
            isLatest: false,
            isLTS: false,
            updateAvailable: false,
            status: 'checking' as const
          }
        };
      }).filter((device): device is HardwareDevice => device !== null);
    } catch (error) {
      console.error('Error fetching USB devices:', error);
      return [];
    }
  }

  async checkDriverUpdates(deviceId: string): Promise<DriverInfo> {
    if (process.platform !== 'win32') {
      return {
        installed: true,
        isLatest: true,
        isLTS: false,
        updateAvailable: false,
        status: 'ok'
      };
    }

    try {
      const devices = await this.getHardwareDevices();
      const device = devices.find(d => d.id === deviceId);

      if (device) {
        // 使用单设备检查
        const driverInfoMap = await driverManager.checkSingleDevice(device);
        const driverInfo = driverInfoMap.get(deviceId);

        if (driverInfo) {
          this.driverCache.set(deviceId, driverInfo);
          return driverInfo;
        }
      }
    } catch (error) {
      console.error('Check driver update failed:', error);
    }

    return {
      installed: true,
      isLatest: false,
      isLTS: false,
      updateAvailable: false,
      status: 'unknown'
    };
  }

  /**
   * 🔥 统一的驱动检查方法
   */
  async checkAllDrivers(): Promise<void> {
    if (process.platform !== 'win32') {
      return;
    }

    // 防止重复检查
    if (this.isCheckingDrivers) {
      console.log('Driver check already in progress, skipping...');
      return;
    }

    this.isCheckingDrivers = true;

    try {
      const startTime = Date.now();
      console.log('🚀 Starting unified driver check...');

      // 调试：列出所有显卡驱动
      await driverManager.debugListGraphicsDrivers();

      const devices = await this.getHardwareDevices();
      console.log(`Got ${devices.length} devices in ${Date.now() - startTime}ms`);

      // 🔥 调试：显示 GPU 设备匹配情况
      await driverManager.debugMatchGraphicsDevices(devices);

      // 🔥 启动后台 Windows Update 检查（不阻塞）
      driverManager.startBackgroundWindowsUpdateCheck();

      // 🔥 统一检查：使用当前已知的信息立即返回
      const checkStart = Date.now();
      const driverInfoMap = await driverManager.checkAllDevicesUnified(devices, (updatedDriverInfoMap) => {
        // 🔥 回调函数：当 Windows Update 完成后执行
        console.log(`📢 Windows Update completed, updating cache and UI`);

        // 更新缓存
        updatedDriverInfoMap.forEach((info, deviceId) => {
          this.driverCache.set(deviceId, info);
        });

        // 通知前端更新
        this.mainWindow?.webContents.send('hardware-changed');
      });
      console.log(`Initial check finished in ${Date.now() - checkStart}ms`);

      // 更新缓存（第一次）
      driverInfoMap.forEach((info, deviceId) => {
        this.driverCache.set(deviceId, info);
      });

      // 通知前端（第一次）
      this.mainWindow?.webContents.send('hardware-changed');
      console.log(`✅ Initial driver check complete in ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error('Check all drivers failed:', error);
    } finally {
      this.isCheckingDrivers = false;
    }
  }

  async installDriver(deviceId: string): Promise<boolean> {
    // 单个驱动安装通过 Windows Update 完成
    // 这里先模拟进度，实际会调用 installAllDrivers
    this.sendProgress(deviceId, 'installing', 50, '请使用"一键安装"功能安装所有驱动');
    return true;
  }

  async installAllDrivers(): Promise<void> {
    if (process.platform !== 'win32') {
      throw new Error('Driver installation is only supported on Windows');
    }

    try {
      await driverManager.installDriverUpdates((message, progress) => {
        this.sendProgress('all', 'installing', progress, message);
      });

      // 安装完成提示（建议重启）
      this.sendProgress('all', 'completed', 100, '所有驱动安装完成，建议重启系统以使更改生效');

      // 刷新驱动信息
      await this.checkAllDrivers();
    } catch (error) {
      console.error('Install all drivers failed:', error);
      this.sendProgress('all', 'failed', 0, '安装失败');
      throw error;
    }
  }

  /**
   * 获取驱动缓存信息
   */
  async getDriverCacheInfo(): Promise<{
    isValid: boolean;
    remainingTime: number;
    lastCheckTime: number;
  }> {
    const cacheInfo = driverManager.getCacheInfo();
    return {
      isValid: cacheInfo.isValid,
      remainingTime: cacheInfo.remainingTime,
      lastCheckTime: cacheInfo.lastCheckTime
    };
  }

  private sendProgress(
    deviceId: string,
    status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed',
    progress: number,
    message: string
  ) {
    this.mainWindow?.webContents.send('driver-progress', {
      deviceId,
      status,
      progress,
      message
    });
  }
}

const hardwareManager = new HardwareManager();

export function registerHardwareHandlers(mainWindow: BrowserWindow) {
  hardwareManager.setMainWindow(mainWindow);

  ipcMain.handle('get-system-info', () => hardwareManager.getSystemInfo());
  ipcMain.handle('get-hardware-devices', () => hardwareManager.getHardwareDevices());
  ipcMain.handle('check-driver-updates', (_, deviceId) => hardwareManager.checkDriverUpdates(deviceId));
  ipcMain.handle('check-all-drivers', () => hardwareManager.checkAllDrivers());
  ipcMain.handle('install-driver', (_, deviceId) => hardwareManager.installDriver(deviceId));
  ipcMain.handle('install-all-drivers', () => hardwareManager.installAllDrivers());
  ipcMain.handle('get-driver-cache-info', () => hardwareManager.getDriverCacheInfo());
}

export default hardwareManager;
