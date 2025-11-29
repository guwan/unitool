// src/types/hardware.ts

export interface HardwareDevice {
  id: string;
  category: 'CPU' | 'GPU' | 'Network' | 'Audio' | 'USB' | 'Storage' | 'Other';
  name: string;
  manufacturer: string;
  model: string;
  deviceId?: string;  // 改为可选
  vendorId?: string;  // 改为可选
  driver?: DriverInfo;
}

export interface DriverInfo {
  installed: boolean;
  version?: string;
  date?: string;
  isLatest: boolean;
  isLTS: boolean;
  availableVersion?: string;
  updateAvailable: boolean;
  status: 'ok' | 'outdated' | 'missing' | 'unknown'|'checking';
}

export interface SystemInfo {
  os: {
    platform: string;
    distro: string;
    release: string;
    arch: string;
  };
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
  };
  devices: HardwareDevice[];
}

export interface DriverInstallProgress {
  deviceId: string;
  status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';
  progress: number;
  message: string;
}
