import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout' // 导入 Layout
import Home from './pages/Home' // 导入 Home
import JsonSplitter from './pages/JsonSplitter'
import KnowledgeConverter from "@renderer/pages/KnowledgeConverter"; // 导入 JsonSplitter

const App = () => {
  return (
    // 使用 HashRouter 确保在 Electron 环境中路由正常工作
    <HashRouter>
      <Layout>
        <Routes>
          {/* 主页路由 */}
          <Route path="/" element={<Home />} />

          {/* JSON 拆分工具路由 (对应 Next.js 的 /json-splitter 页面) */}
          <Route path="/json-splitter" element={<JsonSplitter />} />
          {/* 知识库工具路由 */}
          <Route path="/knowledge-converter" element={<KnowledgeConverter />} />

          {/* 示例：其他工具/页面 */}
          <Route path="/shutdown" element={
            <div className="text-xl font-bold p-4 bg-yellow-100 rounded-lg">
              定时关机助手页面 (待开发)
            </div>
          } />
          <Route path="/settings" element={
            <div className="text-xl font-bold p-4 bg-yellow-100 rounded-lg">
              设置页面 (待开发)
            </div>
          } />

          {/* 404 页面 */}
          <Route path="*" element={
            <div className="text-center p-20 bg-red-50 rounded-lg">
              <h2 className="text-4xl font-bold text-red-700">404</h2>
              <p className="text-red-500">页面未找到</p>
            </div>
          } />
        </Routes>
      </Layout>
    </HashRouter>
  )
}

export default App
