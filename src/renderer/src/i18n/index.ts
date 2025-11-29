// src/renderer/src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  zh: {
    translation: {
      // 标题和按钮
      title: '硬件驱动管理器',
      checkUpdates: '检查更新',
      checking: '检查中...',
      installAll: '一键安装',
      updateDriver: '更新驱动',
      installDriver: '安装驱动',
      latest: '已是最新',
      loading: '加载硬件信息...',
      noDevices: '未找到设备',

      // 分类
      all: '全部',
      cpu: 'CPU',
      gpu: '显卡',
      network: '网络',
      audio: '音频',
      usb: 'USB',
      storage: '存储',
      other: '其他',

      // 设备信息
      manufacturer: '制造商',
      model: '型号',
      driverVersion: '驱动版本',
      status: '状态',

      // 驱动状态
      notInstalled: '未安装',
      canUpdate: '可更新',
      latestLTS: '最新 LTS',
      latestVersion: '最新版本',
      installed: '已安装',

      // 安装进度
      startDownload: '开始下载驱动...',
      downloading: '下载中...',
      installing: '正在安装驱动...',
      installComplete: '安装完成',
      installFailed: '安装失败'
    }
  },
  en: {
    translation: {
      // Titles and buttons
      title: 'Hardware Driver Manager',
      checkUpdates: 'Check Updates',
      checking: 'Checking...',
      installAll: 'Install All',
      updateDriver: 'Update Driver',
      installDriver: 'Install Driver',
      latest: 'Latest',
      loading: 'Loading hardware info...',
      noDevices: 'No devices found',

      // Categories
      all: 'All',
      cpu: 'CPU',
      gpu: 'GPU',
      network: 'Network',
      audio: 'Audio',
      usb: 'USB',
      storage: 'Storage',
      other: 'Other',

      // Device info
      manufacturer: 'Manufacturer',
      model: 'Model',
      driverVersion: 'Driver Version',
      status: 'Status',

      // Driver status
      notInstalled: 'Not Installed',
      canUpdate: 'Update Available',
      latestLTS: 'Latest LTS',
      latestVersion: 'Latest Version',
      installed: 'Installed',

      // Installation progress
      startDownload: 'Starting download...',
      downloading: 'Downloading...',
      installing: 'Installing driver...',
      installComplete: 'Installation complete',
      installFailed: 'Installation failed'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh', // 默认语言
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
