import { HashRouter, useRoutes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Suspense } from 'react'
// 导入自动生成的路由配置
import routes from '~react-pages'

// 创建一个组件来处理 useRoutes，因为 useRoutes 必须在 Router 上下文内部使用
const AppRoutes = () => {
  // 这里自动加载 pages 目录下的所有文件生成的路由
  const element = useRoutes(routes)
  return element
}

const App = () => {
  return (
    <HashRouter>
      <Layout>
        {/* Suspense 用于处理路由懒加载（vite-plugin-pages 默认支持代码分割） */}
        <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
          <AppRoutes />
        </Suspense>
      </Layout>
    </HashRouter>
  )
}

export default App
