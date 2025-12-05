/// <reference types="vite/client" />

// 添加以下类型定义
declare module '~react-pages' {
  import type { RouteObject } from 'react-router-dom'
  const routes: RouteObject[]
  export default routes
}
