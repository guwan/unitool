// src/renderer/src/pages/[...all].tsx
export default function NotFound() {
  return (
    // 1. 最外层容器：确保占据整个视口高度 (min-h-screen) 并提供居中布局
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">

      {/* 2. 核心卡片：设置最大宽度和充足的内边距，使其在屏幕上占比合理 */}
      <div className="text-center p-12 sm:p-16 lg:p-24 w-full max-w-2xl mx-auto
                      bg-white shadow-2xl rounded-3xl border-t-4 border-indigo-500
                      transition-all duration-500 hover:shadow-3xl">

        {/* 3. 标题行：使用 Flex 布局让图标和数字在同一行居中且对齐 */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          {/* 图标 - 确保尺寸更大 */}
          <svg className="w-16 h-16 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {/* 感叹号图标路径 */}
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>

          {/* 主标题 - 确保数字更大，视觉冲击更强 */}
          <h2 className="text-8xl font-black text-indigo-700 tracking-tighter">
            404
          </h2>
        </div>

        {/* 4. 副标题和描述：提供清晰的间距 */}
        <p className="text-2xl text-gray-800 font-bold mb-4">
          目标页面未找到 (Page Not Found)
        </p>

        <p className="text-lg text-gray-500 mb-8">
          访问的路径不存在，请检查 URL 或联系技术支持。
        </p>

        <hr className="my-8 pt-3 pb-3 border-gray-100" />


        {/* 用户引导操作 - 确保按钮之间有足够的水平间距 */}
        <div className="mt-10 space-x-6 flex justify-center">
          <button
            onClick={() => window.history.back()}
            className="px-8 py-3 text-md font-semibold rounded-full shadow-sm
                           text-indigo-700 bg-indigo-100 hover:bg-indigo-200
                           transition duration-150 transform hover:scale-105"
          >
            &larr; 返回上一步
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-8 py-3 text-md font-semibold rounded-full text-white
                           bg-indigo-600 shadow-lg hover:bg-indigo-700
                           transition duration-150 transform hover:scale-105"
          >
            回到首页
          </button>
        </div>
      </div>
    </div>
  )
}
