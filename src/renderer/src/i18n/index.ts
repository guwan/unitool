// src/renderer/src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  zh: {
    translation: {
      // 标题和按钮
      title: '硬件驱动管理器',
    }
  },
  en: {
    translation: {
      // Titles and buttons
      title: 'Hardware Driver Manager',

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
