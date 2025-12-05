import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import Pages from 'vite-plugin-pages' // [!code ++]
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      react(),
      // 添加 Pages 插件配置
      Pages({
        // 指定页面文件夹路径，相对于 renderer 的 root (通常是 src/renderer/src)
        dirs: 'src/pages',
        // 排除组件文件（如果你的页面文件夹里混有组件）
        exclude: ['**/components/*.tsx'],
        // 支持的文件扩展名
        extensions: ['tsx', 'jsx'],
      })
    ],
  }
})
