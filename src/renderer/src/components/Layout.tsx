import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home as HomeIcon, Settings, Code, PackageOpen, Power } from 'lucide-react'

// 定义导航项的数据结构
interface NavItem {
  path: string;
  name: string;
  icon: ReactNode;
}

// 导航配置
const navItems: NavItem[] = [
  { path: '/', name: '主页概览', icon: <HomeIcon size={20} /> },
  { path: '/json-splitter', name: 'JSON 拆分', icon: <Code size={20} /> },
  { path: '/shutdown', name: '定时关机', icon: <Power size={20} /> },
  { path: '/settings', name: '应用设置', icon: <Settings size={20} /> },
]

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation() // 获取当前路由信息

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 antialiased">
      {/* 侧边栏 (Layout) */}
      <aside className="w-64 bg-white shadow-xl p-6 flex flex-col border-r border-gray-100 flex-shrink-0">
        <div className="text-2xl font-extrabold text-blue-600 mb-10 flex items-center gap-2 select-none">
          <PackageOpen size={28} /> unitool
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              // 根据当前路径判断是否激活
              className={`
                                flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                                ${location.pathname === item.path
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
              }
                            `}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-y-auto p-10">
        {children}
      </main>
    </div>
  )
}
