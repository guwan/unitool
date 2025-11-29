import { ReactNode } from 'react'
import { FileJson, Power, Monitor, ArrowRight, PackageOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom' // 引入 useNavigate

// 定义工具卡片的数据结构
interface ToolCardProps {
  title: string
  desc: string
  icon: ReactNode
  color: string // Tailwind background color class
  onClick: () => void
}

/**
 * 工具卡片组件
 */
const ToolCard = ({ title, desc, icon, color, onClick }: ToolCardProps) => (
  <div
    onClick={onClick}
    className="
      bg-white p-6 rounded-2xl shadow-xl border border-gray-100
      hover:shadow-2xl hover:bg-gradient-to-br from-white to-gray-50
      hover:scale-[1.02] transition-all duration-300 cursor-pointer group
    "
  >
    {/* Icon 容器 */}
    <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center mb-4 text-white shadow-lg transition-transform`}>
      {icon}
    </div>

    {/* 标题和描述 */}
    <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
    <p className="text-sm text-gray-500">{desc}</p>

    {/* 动作提示 */}
    <div className="mt-4 text-sm font-semibold text-blue-500 flex items-center">
      开始使用 <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
    </div>
  </div>
)

/**
 * Home 页面组件
 */
const Home = () => {
  const navigate = useNavigate() // 启用导航钩子

  // 导航逻辑：跳转到指定的 URL 路径
  const handleToolClick = (toolPath: string) => {
    navigate(toolPath)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 头部区域 */}
      <div className="mb-12 pt-4">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
          <span className="text-blue-600">unitool</span> 工具总览
        </h1>
        <p className="text-lg text-gray-500">
          欢迎回来, 开发者。今天你想处理什么任务？
        </p>
      </div>

      {/* 核心日常工具箱 */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <PackageOpen size={24} className="text-blue-600"/> 核心日常工具箱
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <ToolCard
            // 修正名称：只保留 JSON 拆分
            title="JSON 拆分"
            desc="快速解析、拆分大型 JSON 数组文件，按条数批量导出。"
            icon={<FileJson size={28} />}
            color="bg-orange-500"
            // 跳转到路由 /json-splitter
            onClick={() => handleToolClick('/json-splitter')}
          />
          <ToolCard
            title="定时关机助手"
            desc="智能化电源管理，设置倒计时或指定时间自动关机/重启。"
            icon={<Power size={28} />}
            color="bg-red-500"
            onClick={() => handleToolClick('/shutdown')}
          />
          <ToolCard
            title="远程桌面控制"
            desc="轻量级远程连接工具，支持多协议快速访问远程服务器。"
            icon={<Monitor size={28} />}
            color="bg-indigo-500"
            onClick={() => handleToolClick('/remote-desktop')} // 假设的路由
          />
        </div>
      </section>
    </div>
  )
}

export default Home
