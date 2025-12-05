import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home as HomeIcon, Settings, Code, PackageOpen, Power, FileText, Menu, ChevronLeft } from 'lucide-react'

// 定义导航项的数据结构
interface NavItem {
  path: string;
  name: string;
  icon: ReactNode;
}

// 导航配置
const navItems: NavItem[] = [
  { path: '/', name: '主页概览', icon: <HomeIcon size={20} /> },
  { path: '/JsonSplitter', name: 'JSON 拆分', icon: <Code size={20} /> },
  { path: '/Shutdown', name: '定时关机', icon: <Power size={20} /> },
  { path: '/Settings', name: '应用设置', icon: <Settings size={20} /> },
  { path: '/KnowledgeConverter', name: '知识库转换', icon: <FileText size={20} /> },
]

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  // 状态管理：侧边栏是否展开
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // 动态计算侧边栏宽度
  const sidebarWidth = isSidebarOpen ? 'w-64' : 'w-20'

  // 切换侧边栏状态
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  return (
    // 使用 h-screen 确保占据整个视口，并设置 overflow-hidden
    <div className="flex h-screen bg-gray-50 text-gray-900 antialiased overflow-hidden">

      {/* 侧边栏 (Layout) */}
      <aside
        className={`
          ${sidebarWidth}
          bg-white shadow-2xl p-4 flex flex-col border-r border-gray-100 flex-shrink-0
          transition-width duration-300 ease-in-out
          overflow-y-auto
        `}
      >
        {/* 顶部 Logo 和收起按钮 */}
        <div className="flex items-center justify-between h-16 select-none border-b border-gray-100 pb-4 mb-4">
          {/* Logo 区域 */}
          <div className={`
            text-2xl font-extrabold text-blue-600 flex items-center gap-2
            transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}
            whitespace-nowrap overflow-hidden
          `}>
            <PackageOpen size={28} /> unitool
          </div>

          {/* 收起/展开 按钮 */}
          <button
            onClick={toggleSidebar}
            className={`
              p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-blue-600
              transition-all duration-300
              ${isSidebarOpen ? '' : 'mx-auto'} // 侧边栏收起时居中显示
            `}
            title={isSidebarOpen ? '收起菜单' : '展开菜单'}
          >
            {isSidebarOpen ? <ChevronLeft size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* 导航栏 */}
        <nav className="space-y-2 flex-1">
          {navItems.map((item) => {
            const isActive = location.pathname.toLowerCase() === item.path.toLowerCase()
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center rounded-xl transition-all duration-200
                  ${isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }
                  // 展开时的布局和样式
                  ${isSidebarOpen
                  ? 'p-3 gap-3 justify-start'
                  // 收起时的布局：变成一个大方形按钮，图标居中
                  : 'w-12 h-12 mx-auto justify-center'
                }
                `}
                title={!isSidebarOpen ? item.name : undefined} // 收起时显示 tooltip
              >
                {item.icon}

                {/* 文本部分：根据状态显示或隐藏 */}
                <span className={`
                  font-medium transition-opacity duration-200
                  ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}
                `}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* 主内容区域 */}
      {/* 使用 flex-1 占据剩余所有空间，p-8 提供内边距 */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
