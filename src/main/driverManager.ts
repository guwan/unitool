// src/main/driverManager.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import iconv from 'iconv-lite';
import type { HardwareDevice, DriverInfo } from '../types/hardware';

const execAsync = promisify(exec);

// 使用 buffer 模式执行命令并转换编码
async function execWmic(wmicCommand: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`wmic ${wmicCommand}`, { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      const output = iconv.decode(stdout as Buffer, 'cp936');
      resolve(output);
    });
  });
}

interface WMIDriver {
  DeviceName: string;
  DriverVersion: string;
  DriverDate: string;
  Manufacturer: string;
  InfName: string;
  DeviceID: string;
  Status: string;
}

class DriverManager {
  private driverCache: Map<string, WMIDriver[]> = new Map();
  private cacheTime: number = 0;
  private readonly CACHE_DURATION = 60000; // 60秒缓存

  // Windows Update 检查状态
  private updateCheckCache: string[] = [];
  private updateCheckTime: number = 0;
  private updateCheckPromise: Promise<string[]> | null = null;
  private updateCheckCallbacks: Array<(updates: string[]) => void> = [];

  /**
   * 获取所有已安装的驱动信息（使用缓存）
   */
  async getAllDrivers(): Promise<WMIDriver[]> {
    const now = Date.now();

    // 如果缓存有效，直接返回
    if (this.driverCache.has('all') && (now - this.cacheTime) < this.CACHE_DURATION) {
      console.log('Using cached driver list');
      return this.driverCache.get('all')!;
    }

    try {
      console.log('Fetching fresh driver list from WMI...');
      const output = await execWmic(
        'path Win32_PnPSignedDriver get DeviceName,DriverVersion,DriverDate,Manufacturer,InfName,DeviceID,Status /format:csv'
      );

      const drivers = this.parseWmicCSV(output);

      // 更新缓存
      this.driverCache.set('all', drivers);
      this.cacheTime = now;

      console.log(`Found ${drivers.length} drivers in WMI`);
      return drivers;
    } catch (error) {
      console.error('Failed to get drivers:', error);
      return [];
    }
  }

  /**
   * 解析 WMIC CSV 输出
   */
  private parseWmicCSV(output: string): WMIDriver[] {
    const lines = output.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('Node'));

    const drivers: WMIDriver[] = [];

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());

      if (parts.length >= 7 && parts[2]) {
        drivers.push({
          DeviceID: parts[1] || '',
          DeviceName: parts[2] || '',
          DriverDate: parts[3] || '',
          DriverVersion: parts[4] || '',
          InfName: parts[5] || '',
          Manufacturer: parts[6] || '',
          Status: parts[7] || 'Unknown'
        });
      }
    }

    return drivers;
  }

  /**
   * 根据设备名称查找驱动（改进的模糊匹配）
   */
  private findDriverByDevice(deviceName: string, manufacturer: string, drivers: WMIDriver[]): WMIDriver | undefined {
    const nameLower = deviceName.toLowerCase();
    const mfgLower = manufacturer.toLowerCase();

    // 提取关键词（去除括号和特殊符号）
    const nameKeywords = nameLower
      .replace(/\(r\)/g, '')
      .replace(/[()]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // 1. 精确匹配
    let match = drivers.find(driver => {
      const driverNameLower = driver.DeviceName.toLowerCase();
      return driverNameLower === nameLower || driver.DeviceName === deviceName;
    });
    if (match) return match;

    // 2. 包含匹配
    match = drivers.find(driver => {
      const driverNameLower = driver.DeviceName.toLowerCase();
      return driverNameLower.includes(nameLower) || nameLower.includes(driverNameLower);
    });
    if (match) return match;

    // 3. 关键词匹配
    match = drivers.find(driver => {
      const driverNameLower = driver.DeviceName.toLowerCase();
      const driverMfgLower = driver.Manufacturer.toLowerCase();
      let matchCount = 0;
      if (mfgLower && driverMfgLower.includes(mfgLower)) matchCount++;
      for (const keyword of nameKeywords) {
        if (driverNameLower.includes(keyword)) matchCount++;
      }
      return matchCount >= 2;
    });
    if (match) return match;

    // 4. 显卡特殊匹配
    if (nameLower.includes('graphics') || nameLower.includes('display') || nameLower.includes('video')) {
      match = drivers.find(driver => {
        const driverNameLower = driver.DeviceName.toLowerCase();
        const driverMfgLower = driver.Manufacturer.toLowerCase();
        return (driverMfgLower.includes(mfgLower) || mfgLower.includes(driverMfgLower)) &&
          (driverNameLower.includes('graphics') || driverNameLower.includes('display') ||
            driverNameLower.includes('video') || driverNameLower.includes('adapter'));
      });
    }

    return match;
  }

  /**
   * 获取有问题的设备
   */
  async getProblematicDevices(): Promise<string[]> {
    try {
      const output = await execWmic(
        'path Win32_PnPEntity where "ConfigManagerErrorCode<>0" get Name /format:csv'
      );

      const lines = output.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('Node'));

      const devices = lines.map(line => {
        const parts = line.split(',');
        return parts[1] || '';
      }).filter(name => name);

      console.log(`Found ${devices.length} problematic devices`);
      return devices;
    } catch (error) {
      console.error('Failed to get problematic devices:', error);
      return [];
    }
  }

  /**
   * 🔥 启动后台 Windows Update 检查（不阻塞）
   */
  startBackgroundWindowsUpdateCheck(): void {
    const now = Date.now();

    // 如果缓存有效，不需要重新检查
    if (this.updateCheckCache.length > 0 && (now - this.updateCheckTime) < this.CACHE_DURATION) {
      console.log(`✅ Using cached Windows Update results (${this.updateCheckCache.length} updates)`);
      return;
    }

    // 如果正在检查中，不需要重复启动
    if (this.updateCheckPromise) {
      console.log('⏳ Windows Update check already in progress');
      return;
    }

    console.log('🚀 Starting background Windows Update check...');
    this.updateCheckPromise = this.performWindowsUpdateCheck();

    this.updateCheckPromise
      .then(updates => {
        this.updateCheckCache = updates;
        this.updateCheckTime = Date.now();
        console.log(`✅ Windows Update check complete: ${updates.length} updates found`);
        if (updates.length > 0) {
          console.log('Updates:', updates);
        }

        // 触发所有回调
        this.updateCheckCallbacks.forEach(callback => {
          try {
            callback(updates);
          } catch (err) {
            console.error('Error in update callback:', err);
          }
        });
        this.updateCheckCallbacks = [];
      })
      .catch(err => {
        console.error('❌ Windows Update check failed:', err);
      })
      .finally(() => {
        this.updateCheckPromise = null;
      });
  }

  /**
   * 🔥 获取当前 Windows Update 结果（不等待）
   */
  getCurrentWindowsUpdateResults(): string[] {
    const now = Date.now();
    if (this.updateCheckCache.length > 0 && (now - this.updateCheckTime) < this.CACHE_DURATION) {
      return this.updateCheckCache;
    }
    return [];
  }

  /**
   * 执行 Windows Update 检查
   */
  private async performWindowsUpdateCheck(): Promise<string[]> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⚠️ Windows Update check timeout after 15s');
        resolve([]);
      }, 15000); // 15秒超时

      const command = `powershell -NoProfile -NonInteractive -Command "try { $s = New-Object -ComObject Microsoft.Update.Session; $r = $s.CreateUpdateSearcher().Search('IsInstalled=0 and Type=''Driver'''); $r.Updates | ForEach-Object { $_.Title } } catch { }"`;

      exec(command, { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
        clearTimeout(timeout);

        if (error) {
          console.log('❌ Windows Update check error:', error.message);
          resolve([]);
          return;
        }

        const output = iconv.decode(stdout as Buffer, 'cp936');
        const updates = output.split('\n')
          .map(line => line.trim())
          .filter(line => line);

        resolve(updates);
      });
    });
  }

  /**
   * 🔥 统一检查所有设备（立即返回，后台更新）
   */
  async checkAllDevicesUnified(
    devices: HardwareDevice[],
    onWindowsUpdateComplete?: (updates: Map<string, DriverInfo>) => void
  ): Promise<Map<string, DriverInfo>> {
    const result = new Map<string, DriverInfo>();

    try {
      console.log('Starting unified driver check...');

      // 1. 获取基础数据
      const [allDrivers, problematicDevices] = await Promise.all([
        this.getAllDrivers(),
        this.getProblematicDevices()
      ]);

      // 2. 获取当前可用的 Windows Update 结果（不等待）
      const currentUpdates = this.getCurrentWindowsUpdateResults();
      console.log(`Using current Windows Update results: ${currentUpdates.length} updates`);

      // 3. 构建初始结果
      for (const device of devices) {
        const info = this.buildDriverInfo(device, allDrivers, problematicDevices, currentUpdates);
        result.set(device.id, info);
      }

      // 4. 注册回调：当 Windows Update 完成后重新构建
      if (onWindowsUpdateComplete && this.updateCheckPromise) {
        this.updateCheckCallbacks.push((finalUpdates) => {
          console.log('🔄 Rebuilding driver info with final Windows Update results...');
          const updatedResult = new Map<string, DriverInfo>();

          for (const device of devices) {
            const info = this.buildDriverInfo(device, allDrivers, problematicDevices, finalUpdates);
            updatedResult.set(device.id, info);
          }

          onWindowsUpdateComplete(updatedResult);
        });
      }

      console.log('Unified driver check complete (initial)');

    } catch (error) {
      console.error('Failed to check all drivers:', error);
    }

    return result;
  }

  /**
   * 🔥 检查单个设备（等待 Windows Update）
   */
  async checkSingleDevice(device: HardwareDevice): Promise<Map<string, DriverInfo>> {
    const result = new Map<string, DriverInfo>();

    try {
      const [allDrivers, problematicDevices] = await Promise.all([
        this.getAllDrivers(),
        this.getProblematicDevices()
      ]);

      // 对单个设备，等待 Windows Update 结果
      this.startBackgroundWindowsUpdateCheck();
      await this.updateCheckPromise;
      const updates = this.getCurrentWindowsUpdateResults();

      const info = this.buildDriverInfo(device, allDrivers, problematicDevices, updates);
      result.set(device.id, info);
    } catch (error) {
      console.error('Failed to check single device:', error);
    }

    return result;
  }

  /**
   * 🔥 统一的驱动信息构建方法
   */
  private buildDriverInfo(
    device: HardwareDevice,
    allDrivers: WMIDriver[],
    problematicDevices: string[],
    availableUpdates: string[]
  ): DriverInfo {
    const driver = this.findDriverByDevice(device.name, device.manufacturer, allDrivers);

    const hasProblem = problematicDevices.some(name =>
      name.toLowerCase().includes(device.name.toLowerCase())
    );

    const hasWindowsUpdate = availableUpdates.some(title => {
      const titleLower = title.toLowerCase();
      const nameLower = device.name.toLowerCase();
      const mfgLower = device.manufacturer.toLowerCase();
      return titleLower.includes(nameLower) || titleLower.includes(mfgLower);
    });

    if (driver) {
      const needsUpdate = hasProblem || hasWindowsUpdate;

      const info: DriverInfo = {
        installed: true,
        version: driver.DriverVersion || undefined,
        date: driver.DriverDate || undefined,
        isLatest: !needsUpdate,
        isLTS: false,
        updateAvailable: needsUpdate,
        status: needsUpdate ? 'outdated' : 'ok'
      };

      if (hasWindowsUpdate) {
        console.log(`✓ ${device.name}: Update available via Windows Update`);
      } else if (hasProblem) {
        console.log(`⚠ ${device.name}: Hardware problem detected`);
      } else {
        console.log(`✓ ${device.name}: Driver is up to date (v${driver.DriverVersion})`);
      }

      return info;
    } else {
      // 🔥 特殊处理：GPU 设备如果找不到驱动，可能是虚拟显示器或特殊设备
      const isVirtualDisplay = device.name.toLowerCase().includes('oray') ||
        device.name.toLowerCase().includes('virtual') ||
        device.name.toLowerCase().includes('indirect');

      const info: DriverInfo = {
        installed: isVirtualDisplay ? true : false, // 虚拟显示器标记为已安装
        isLatest: isVirtualDisplay ? true : false,  // 虚拟显示器标记为最新
        isLTS: false,
        updateAvailable: hasWindowsUpdate,
        status: isVirtualDisplay ? 'ok' : (hasWindowsUpdate ? 'missing' : 'unknown')
      };

      if (isVirtualDisplay) {
        console.log(`✓ ${device.name}: Virtual display adapter (no driver check needed)`);
      } else if (hasWindowsUpdate) {
        console.log(`⚠ ${device.name}: Driver missing, update available`);
      } else {
        console.log(`? ${device.name}: No driver found in WMI`);
        console.log(`  Searched for: "${device.name}" from manufacturer: "${device.manufacturer}"`);
      }

      return info;
    }
  }

  /**
   * 安装驱动更新（通过 Windows Update）
   */
  async installDriverUpdates(progressCallback?: (message: string, progress: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      progressCallback?.('正在搜索驱动更新...', 10);

      const psCommand = `
        try {
          $session = New-Object -ComObject Microsoft.Update.Session
          $searcher = $session.CreateUpdateSearcher()

          Write-Host "Searching..."
          $result = $searcher.Search("IsInstalled=0 and Type='Driver'")

          if ($result.Updates.Count -eq 0) {
            Write-Host "NoUpdates"
            exit 0
          }

          Write-Host "Found:$($result.Updates.Count)"

          $toDownload = New-Object -ComObject Microsoft.Update.UpdateColl
          foreach ($update in $result.Updates) {
            if (!$update.IsDownloaded) {
              [void]$toDownload.Add($update)
            }
          }

          if ($toDownload.Count -gt 0) {
            Write-Host "Downloading"
            $downloader = $session.CreateUpdateDownloader()
            $downloader.Updates = $toDownload
            [void]$downloader.Download()
          }

          Write-Host "Installing"
          $toInstall = New-Object -ComObject Microsoft.Update.UpdateColl
          foreach ($update in $result.Updates) {
            if ($update.IsDownloaded) {
              [void]$toInstall.Add($update)
            }
          }

          if ($toInstall.Count -gt 0) {
            $installer = $session.CreateUpdateInstaller()
            $installer.Updates = $toInstall
            $installResult = $installer.Install()
            Write-Host "Completed:$($installResult.ResultCode)"
          }
        } catch {
          Write-Host "Error:$_"
          exit 1
        }
      `.replace(/\n/g, ' ');

      const command = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`;

      const child = exec(command, {
        encoding: 'buffer',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30 * 60 * 1000
      });

      let progress = 10;

      child.stdout?.on('data', (data) => {
        const text = iconv.decode(data as Buffer, 'cp936');
        console.log('Update output:', text);

        if (text.includes('Searching')) {
          progress = 20;
          progressCallback?.('正在搜索驱动更新...', progress);
        } else if (text.includes('Found:')) {
          progress = 30;
          const match = text.match(/Found:(\d+)/);
          const count = match ? match[1] : '0';
          progressCallback?.(`找到 ${count} 个驱动更新`, progress);
        } else if (text.includes('NoUpdates')) {
          progress = 100;
          progressCallback?.('没有可用的驱动更新', progress);
        } else if (text.includes('Downloading')) {
          progress = 50;
          progressCallback?.('正在下载驱动...', progress);
        } else if (text.includes('Installing')) {
          progress = 70;
          progressCallback?.('正在安装驱动...', progress);
        } else if (text.includes('Completed')) {
          progress = 100;
          progressCallback?.('驱动安装完成', progress);
        }
      });

      child.stderr?.on('data', (data) => {
        console.error('PowerShell Error:', iconv.decode(data as Buffer, 'cp936'));
      });

      child.on('close', (code) => {
        if (code === 0) {
          progressCallback?.('驱动更新完成', 100);
          this.clearCache();
          resolve();
        } else {
          reject(new Error(`Installation failed with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  /**
   * 调试：列出所有显卡相关的驱动
   */
  async debugListGraphicsDrivers(): Promise<void> {
    try {
      const allDrivers = await this.getAllDrivers();

      console.log('\n=== All Graphics/Display/Video Drivers ===');
      const graphicsDrivers = allDrivers.filter(d => {
        const name = d.DeviceName.toLowerCase();
        return name.includes('graphics') || name.includes('display') || name.includes('video') ||
          name.includes('adapter') || name.includes('intel') || name.includes('nvidia') ||
          name.includes('amd') || name.includes('oray') || name.includes('virtual');
      });

      graphicsDrivers.forEach(d => {
        console.log(`Name: ${d.DeviceName}`);
        console.log(`Manufacturer: ${d.Manufacturer}`);
        console.log(`Version: ${d.DriverVersion}`);
        console.log(`Date: ${d.DriverDate}`);
        console.log(`Status: ${d.Status}`);
        console.log(`DeviceID: ${d.DeviceID}`);
        console.log('---');
      });
      console.log(`Total: ${graphicsDrivers.length} graphics-related drivers found\n`);
    } catch (error) {
      console.error('Failed to debug list drivers:', error);
    }
  }

  /**
   * 🔥 新增：调试显卡设备匹配情况
   */
  async debugMatchGraphicsDevices(devices: HardwareDevice[]): Promise<void> {
    try {
      const allDrivers = await this.getAllDrivers();
      const gpuDevices = devices.filter(d => d.category === 'GPU');

      console.log('\n=== GPU Device Matching Debug ===');
      for (const device of gpuDevices) {
        console.log(`\n📱 Device: ${device.name}`);
        console.log(`   Manufacturer: ${device.manufacturer}`);
        console.log(`   ID: ${device.id}`);

        const driver = this.findDriverByDevice(device.name, device.manufacturer, allDrivers);

        if (driver) {
          console.log(`✅ MATCHED to WMI Driver:`);
          console.log(`   Name: ${driver.DeviceName}`);
          console.log(`   Version: ${driver.DriverVersion}`);
          console.log(`   Manufacturer: ${driver.Manufacturer}`);
        } else {
          console.log(`❌ NO MATCH FOUND`);
          console.log(`   Trying to match against ${allDrivers.length} drivers...`);

          // 显示最接近的5个候选
          const candidates = allDrivers
            .map(d => ({
              driver: d,
              score: this.calculateMatchScore(device.name, device.manufacturer, d)
            }))
            .filter(c => c.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

          if (candidates.length > 0) {
            console.log(`   Top ${candidates.length} candidates:`);
            candidates.forEach((c, i) => {
              console.log(`   ${i+1}. ${c.driver.DeviceName} (score: ${c.score})`);
            });
          } else {
            console.log(`   No candidates found`);
          }
        }
      }
      console.log('\n=== End GPU Matching Debug ===\n');
    } catch (error) {
      console.error('Failed to debug match devices:', error);
    }
  }

  /**
   * 计算匹配分数（用于调试）
   */
  private calculateMatchScore(deviceName: string, manufacturer: string, driver: WMIDriver): number {
    let score = 0;
    const nameLower = deviceName.toLowerCase();
    const mfgLower = manufacturer.toLowerCase();
    const driverNameLower = driver.DeviceName.toLowerCase();
    const driverMfgLower = driver.Manufacturer.toLowerCase();

    // 制造商匹配
    if (driverMfgLower.includes(mfgLower) || mfgLower.includes(driverMfgLower)) {
      score += 50;
    }

    // 名称包含匹配
    if (driverNameLower.includes(nameLower) || nameLower.includes(driverNameLower)) {
      score += 100;
    }

    // 关键词匹配
    const keywords = nameLower.split(/\s+/).filter(w => w.length > 2);
    for (const keyword of keywords) {
      if (driverNameLower.includes(keyword)) {
        score += 20;
      }
    }

    // 显卡特殊关键词
    const graphicsKeywords = ['graphics', 'display', 'video', 'adapter', 'uhd', 'hd'];
    for (const keyword of graphicsKeywords) {
      if (nameLower.includes(keyword) && driverNameLower.includes(keyword)) {
        score += 10;
      }
    }

    return score;
  }

  /**
   * 获取缓存信息
   */
  getCacheInfo(): {
    isValid: boolean;
    remainingTime: number;
    lastCheckTime: number;
    updateCount: number;
  } {
    const now = Date.now();
    const isValid = this.updateCheckCache.length > 0 && (now - this.updateCheckTime) < this.CACHE_DURATION;
    const remaining = isValid ? Math.ceil((this.CACHE_DURATION - (now - this.updateCheckTime)) / 1000) : 0;

    return {
      isValid,
      remainingTime: remaining,
      lastCheckTime: this.updateCheckTime,
      updateCount: this.updateCheckCache.length
    };
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.driverCache.clear();
    this.cacheTime = 0;
    this.updateCheckCache = [];
    this.updateCheckTime = 0;
    console.log('Driver cache cleared');
  }
}

export default new DriverManager();
