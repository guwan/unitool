// src/renderer/src/components/HardwareManager.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { HardwareDevice, SystemInfo, DriverInstallProgress } from '../../../types/hardware';
import {DeviceSkeleton} from "@renderer/components/DeviceSkeleton";



const HardwareManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [installProgress, setInstallProgress] = useState<Map<string, DriverInstallProgress>>(new Map());
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    loadData();

    const unsubProgress = window.api.onDriverProgress((progress) => {
      setInstallProgress(prev => new Map(prev).set(progress.deviceId, progress));
    });

    const unsubHardware = window.api.onHardwareChange(() => {
      loadData();
    });

    return () => {
      unsubProgress();
      unsubHardware();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sysInfo, deviceList] = await Promise.all([
        window.api.getSystemInfo(),
        window.api.getHardwareDevices()
      ]);
      setSystemInfo(sysInfo);
      setDevices(deviceList);
    } catch (error) {
      console.error('Failed to load hardware info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAllDrivers = async () => {
    setLoading(true);
    try {
      await window.api.checkAllDrivers();
      await loadData();
    } catch (error) {
      console.error('Failed to check drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallDriver = async (deviceId: string) => {
    try {
      await window.api.installDriver(deviceId);
      await loadData();
    } catch (error) {
      console.error('Failed to install driver:', error);
    }
  };

  const handleInstallAllDrivers = async () => {
    setIsInstalling(true);
    try {
      await window.api.installAllDrivers();
      await loadData();
    } catch (error) {
      console.error('Failed to install all drivers:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  const categories = [
    { key: 'all', label: t('all') },
    { key: 'CPU', label: t('cpu') },
    { key: 'GPU', label: t('gpu') },
    { key: 'Network', label: t('network') },
    { key: 'Audio', label: t('audio') },
    { key: 'USB', label: t('usb') },
    { key: 'Storage', label: t('storage') },
    { key: 'Other', label: t('other') }
  ];

  const filteredDevices = selectedCategory === 'all'
    ? devices
    : devices.filter(d => d.category === selectedCategory);

  const needsUpdate = devices.filter(d => d.driver?.updateAvailable || !d.driver?.installed).length;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ok': return 'text-green-400';
      case 'outdated': return 'text-yellow-400';
      case 'missing': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (driver?: any) => {
    if (!driver?.installed) return t('notInstalled');
    if (driver.updateAvailable) return t('canUpdate');
    if (driver.isLTS) return t('latestLTS');
    if (driver.isLatest) return t('latestVersion');
    return t('installed');
  };

  // 计算各分类的设备数量
  const getCategoryCount = (categoryKey: string) => {
    if (loading) return '...';
    if (categoryKey === 'all') return devices.length;
    return devices.filter(d => d.category === categoryKey).length;
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* 动态背景效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* 顶部系统信息栏 */}
      <div className="relative backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-2xl flex-shrink-0">
        <div className="w-full px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-2 flex items-center gap-2 lg:gap-3">
                <span className="inline-block w-1.5 lg:w-2 h-6 lg:h-8 bg-gradient-to-b from-purple-400 to-blue-500 rounded-full flex-shrink-0"></span>
                <span className="truncate">{t('title')}</span>
              </h1>
              <div className="flex items-center gap-2 lg:gap-4 text-xs lg:text-sm text-gray-300 flex-wrap">
                {loading ? (
                  <>
                    <div className="h-6 w-32 bg-white/10 rounded-full animate-pulse"></div>
                    <span className="hidden sm:inline">•</span>
                    <div className="h-6 w-40 bg-white/10 rounded-full animate-pulse"></div>
                  </>
                ) : (
                  <>
                    <span className="px-2 lg:px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm whitespace-nowrap">
                      {systemInfo?.os.distro} {systemInfo?.os.release}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="px-2 lg:px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm truncate max-w-xs">
                      {systemInfo?.cpu.brand}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 lg:gap-3 flex-shrink-0">
              {/* 语言切换按钮 */}
              <button
                onClick={toggleLanguage}
                className="px-3 lg:px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all duration-300 border border-white/20 flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <span className="hidden sm:inline">{i18n.language === 'zh' ? 'EN' : '中文'}</span>
              </button>

              <button
                onClick={handleCheckAllDrivers}
                disabled={loading}
                className="px-3 lg:px-5 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-blue-500/50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
              >
                {loading ? t('checking') : t('checkUpdates')}
              </button>
              {needsUpdate > 0 && (
                <button
                  onClick={handleInstallAllDrivers}
                  disabled={isInstalling}
                  className="px-3 lg:px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-green-500/50 flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline">{t('installAll')} ({needsUpdate})</span>
                  <span className="sm:hidden">({needsUpdate})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 分类标签 */}
      <div className="relative backdrop-blur-xl bg-white/5 border-b border-white/10 flex-shrink-0">
        <div className="w-full px-4 lg:px-6">
          <div className="flex gap-2 py-3 overflow-x-auto scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent">
            {categories.map(cat => {
              const count = getCategoryCount(cat.key);
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 lg:px-5 py-2 lg:py-2.5 rounded-xl whitespace-nowrap transition-all duration-300 flex items-center gap-2 text-sm ${
                    selectedCategory === cat.key
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/50 scale-105'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20 backdrop-blur-sm border border-white/10'
                  }`}
                >
                  <span className="font-medium">{cat.label}</span>
                  <span className={`text-xs px-1.5 lg:px-2 py-0.5 rounded-full min-w-[1.5rem] text-center ${
                    selectedCategory === cat.key
                      ? 'bg-white/20'
                      : 'bg-white/10'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 设备列表 - 可滚动，占据剩余空间 */}
      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent px-4 lg:px-6 py-4 lg:py-6">
          {loading ? (
            // 加载中显示骨架屏
            <div className="grid gap-3 lg:gap-4">
              {[1, 2, 3, 4, 5].map(i => (
                <DeviceSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 lg:gap-4">
              {filteredDevices.map(device => {
                const progress = installProgress.get(device.id);

                return (
                  <div
                    key={device.id}
                    className="backdrop-blur-xl bg-white/10 rounded-xl lg:rounded-2xl border border-white/20 p-4 lg:p-6 hover:bg-white/15 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.01] group"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap lg:flex-nowrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3 flex-wrap">
                          <span className="px-2 lg:px-3 py-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-blue-300 text-xs font-medium rounded-lg backdrop-blur-sm border border-blue-400/30">
                            {device.category}
                          </span>
                          <h3 className="text-base lg:text-xl font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                            {device.name}
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 lg:gap-x-8 gap-y-2 lg:gap-y-3 text-xs lg:text-sm mb-3 lg:mb-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-gray-400 flex-shrink-0">{t('manufacturer')}:</span>
                            <span className="text-gray-200 truncate">{device.manufacturer}</span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-gray-400 flex-shrink-0">{t('model')}:</span>
                            <span className="text-gray-200 truncate">{device.model}</span>
                          </div>
                          {device.driver?.version && (
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-gray-400 flex-shrink-0">{t('driverVersion')}:</span>
                              <span className="text-gray-200 truncate">{device.driver.version}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 flex-shrink-0">{t('status')}:</span>
                            <span className={`font-medium ${getStatusColor(device.driver?.status)}`}>
                              {getStatusText(device.driver)}
                            </span>
                          </div>
                        </div>

                        {progress && progress.status !== 'completed' && (
                          <div className="mt-3 lg:mt-4 p-3 lg:p-4 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
                            <div className="flex items-center justify-between text-xs lg:text-sm mb-2">
                              <span className="text-gray-300 truncate mr-2">{progress.message}</span>
                              <span className="text-purple-400 font-semibold flex-shrink-0">{progress.progress}%</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2 lg:h-2.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-300 relative overflow-hidden"
                                style={{ width: `${progress.progress}%` }}
                              >
                                <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0 w-full sm:w-auto">
                        {(device.driver?.updateAvailable || !device.driver?.installed) && !progress && (
                          <button
                            onClick={() => handleInstallDriver(device.id)}
                            className="w-full sm:w-auto px-4 lg:px-5 py-2 lg:py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-blue-500/50 text-xs lg:text-sm font-medium"
                          >
                            {device.driver?.installed ? t('updateDriver') : t('installDriver')}
                          </button>
                        )}
                        {device.driver?.isLatest && (
                          <div className="flex items-center gap-2 text-green-400 text-xs lg:text-sm bg-green-500/10 px-3 lg:px-4 py-2 rounded-lg backdrop-blur-sm border border-green-500/20 justify-center">
                            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-medium">{t('latest')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && filteredDevices.length === 0 && (
            <div className="text-center py-12 lg:py-20">
              <div className="inline-block p-4 lg:p-6 bg-white/5 rounded-full backdrop-blur-sm border border-white/10 mb-4">
                <svg className="w-12 h-12 lg:w-16 lg:h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-400 text-base lg:text-lg">{t('noDevices')}</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }

        /* 自定义滚动条样式 */
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.5);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.7);
        }
      `}</style>
    </div>
  );
};

export default HardwareManager;
