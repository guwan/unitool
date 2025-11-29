import { useState } from 'react'
import { FileText, Split, FolderOpen, AlertTriangle, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom' // 引入 useNavigate

// 扩展 Window 接口以包含我们暴露的 Electron API
declare global {
  interface Window {
    api: {
      dialog: {
        showOpenDialog: (options: any) => Promise<{ filePaths: string[] | undefined }>
      },
      fs: {
        splitJson: (
          filePath: string,
          chunkSize: number,
          outputPath: string
        ) => Promise<{ fileCount: number, totalRecords: number, time: number }>
      }
    }
  }
}


const JsonSplitter = () => {
  const navigate = useNavigate() // 启用导航钩子
  const [filePath, setFilePath] = useState('')
  const [outputPath, setOutputPath] = useState('')
  const [chunkSize, setChunkSize] = useState(1000)
  const [status, setStatus] = useState('等待选择文件...')
  const [isProcessing, setIsProcessing] = useState(false)

  // 1. 选择输入文件
  const handleFileSelect = async () => {
    if (isProcessing) return
    setStatus('正在打开文件选择对话框...')

    try {
      const result = await window.api.dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      })

      if (result && result.filePaths && result.filePaths.length > 0) {
        setFilePath(result.filePaths[0])
        setStatus(`文件已选择: ${result.filePaths[0]}`)
      } else {
        setStatus('未选择文件。')
      }
    } catch (error: any) {
      setStatus(`文件选择失败: ${error.message}`)
    }
  }

  // 2. 选择输出目录
  const handleOutputSelect = async () => {
    if (isProcessing) return
    setStatus('正在打开目录选择对话框...')

    try {
      const result = await window.api.dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
      })

      if (result && result.filePaths && result.filePaths.length > 0) {
        setOutputPath(result.filePaths[0])
        setStatus(`输出目录已选择: ${result.filePaths[0]}`)
      } else {
        setStatus('未选择输出目录。')
      }
    } catch (error: any) {
      setStatus(`目录选择失败: ${error.message}`)
    }
  }

  // 3. 执行拆分操作
  const handleSplitClick = async () => {
    if (!filePath || !outputPath || chunkSize <= 0 || isProcessing) {
      setStatus('请检查文件路径、输出路径和拆分数量是否正确。')
      return
    }

    setIsProcessing(true)
    setStatus('正在开始拆分...')

    try {
      const result = await window.api.fs.splitJson(filePath, chunkSize, outputPath)
      setStatus(`拆分完成！成功创建 ${result.fileCount} 个文件，共 ${result.totalRecords} 条记录，耗时 ${result.time}ms。`)
    } catch (error: any) {
      setStatus(`拆分失败: ${error.message}`)
      console.error('Split Error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/')}
        className="text-blue-600 hover:text-blue-800 font-semibold mb-8 flex items-center gap-1 transition-colors"
      >
        <ArrowLeft size={20} /> 返回主页
      </button>

      {/* 标题 */}
      <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <Split size={28} className="text-blue-600" /> JSON 数据集拆分工具
      </h2>
      <p className="text-gray-500 mb-8">
        用于将大型 JSON 数组文件按指定条数拆分成多个小型 JSON 文件。
      </p>

      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-6">

        {/* 输入文件路径 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">步骤 1: 选择 JSON 源文件</label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              readOnly
              value={filePath}
              placeholder="点击选择文件..."
              className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 focus:outline-none"
            />
            <button
              onClick={handleFileSelect}
              disabled={isProcessing}
              className="bg-blue-500 text-white px-5 py-3 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <FileText size={20} /> 选择文件
            </button>
          </div>
        </div>

        {/* 拆分数量设置 */}
        <div className="space-y-2">
          <label htmlFor="chunkSize" className="text-sm font-medium text-gray-700">步骤 2: 设置每文件数据条数</label>
          <input
            id="chunkSize"
            type="number"
            value={chunkSize}
            onChange={(e) => setChunkSize(parseInt(e.target.value) || 0)}
            min="100"
            disabled={isProcessing}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-400">建议值 500 - 5000。文件越大，内存占用越高。</p>
        </div>

        {/* 输出目录路径 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">步骤 3: 选择拆分文件输出目录</label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              readOnly
              value={outputPath}
              placeholder="点击选择输出目录..."
              className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 focus:outline-none"
            />
            <button
              onClick={handleOutputSelect}
              disabled={isProcessing}
              className="bg-green-500 text-white px-5 py-3 rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <FolderOpen size={20} /> 选择目录
            </button>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSplitClick}
            disabled={!filePath || !outputPath || chunkSize <= 0 || isProcessing}
            className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在拆分中...
              </>
            ) : (
              '开始拆分'
            )}
          </button>
        </div>

        {/* 状态显示 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-blue-800 flex items-start gap-2">
          <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm">状态: {status}</p>
        </div>
      </div>
    </div>
  )
}

export default JsonSplitter
