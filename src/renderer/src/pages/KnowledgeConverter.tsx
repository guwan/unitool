import { useState } from 'react'
import { FileInput, FolderOpen, Download, AlertCircle, CheckCircle2 } from 'lucide-react'

interface ConversionResult {
  fileCount: number
  totalItems: number
  outputFiles: string[]
}

const KnowledgeConverter = () => {
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [outputPath, setOutputPath] = useState<string>('')
  const [isConverting, setIsConverting] = useState<boolean>(false)
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [error, setError] = useState<string>('')

  // 选择输入文件
  const handleSelectInputFile = async () => {
    try {
      const result = await window.api.dialog.showOpenDialog({
        title: '选择 JSON 文件',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        setSelectedFile(result.filePaths[0])
        setError('')

        // 自动设置输出路径
        const inputPath = result.filePaths[0]
        const outputDir = inputPath.replace(/\.json$/, '_markdown')
        setOutputPath(outputDir)
      }
    } catch (err) {
      setError(`选择文件失败: ${err}`)
    }
  }

  // 选择输出目录
  const handleSelectOutputPath = async () => {
    try {
      const result = await window.api.dialog.showOpenDialog({
        title: '选择输出目录',
        properties: ['openDirectory', 'createDirectory']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        setOutputPath(result.filePaths[0])
      }
    } catch (err) {
      setError(`选择输出目录失败: ${err}`)
    }
  }

  // 执行转换
  const handleConvert = async () => {
    if (!selectedFile) {
      setError('请选择要转换的 JSON 文件')
      return
    }

    if (!outputPath) {
      setError('请选择输出目录')
      return
    }

    setIsConverting(true)
    setError('')
    setResult(null)

    try {
      const conversionResult = await window.api.fs.convertKnowledge(selectedFile, outputPath)
      setResult(conversionResult)
    } catch (err: any) {
      setError(`转换失败: ${err.message || '未知错误'}`)
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">JSON 到知识库转换器</h1>
        <p className="text-gray-600">
          将 JSON 格式的数据转换为 Dify 知识库支持的 Markdown 格式，自动拆分大文件
        </p>
      </div>

      {/* 文件选择区域 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="space-y-6">
          {/* 输入文件选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择 JSON 文件
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={selectedFile}
                readOnly
                placeholder="请选择 JSON 文件..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-700"
              />
              <button
                onClick={handleSelectInputFile}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FileInput size={20} />
                选择文件
              </button>
            </div>
          </div>

          {/* 输出目录选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择输出目录
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={outputPath}
                readOnly
                placeholder="请选择输出目录..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-700"
              />
              <button
                onClick={handleSelectOutputPath}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FolderOpen size={20} />
                选择目录
              </button>
            </div>
          </div>

          {/* 转换按钮 */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleConvert}
              disabled={isConverting || !selectedFile || !outputPath}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg font-semibold"
            >
              {isConverting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  转换中...
                </>
              ) : (
                <>
                  <Download size={24} />
                  开始转换
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle size={20} />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* 结果展示 */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 text-green-800 mb-4">
            <CheckCircle2 size={24} />
            <span className="text-xl font-semibold">转换成功！</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{result.fileCount}</div>
              <div className="text-gray-600">生成文件数</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{result.totalItems}</div>
              <div className="text-gray-600">处理条目数</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{result.outputFiles.length}</div>
              <div className="text-gray-600">输出文件</div>
            </div>
          </div>

          {/* 文件列表 */}
          {result.outputFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-3">生成的文件：</h3>
              <div className="bg-white rounded-lg p-4 max-h-60 overflow-y-auto">
                <ul className="space-y-2">
                  {result.outputFiles.map((file, index) => (
                    <li key={index} className="text-sm text-gray-700 font-mono p-2 hover:bg-gray-50 rounded">
                      {file}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 使用说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mt-8">
        <h3 className="font-semibold text-blue-900 mb-3">使用说明</h3>
        <ul className="text-blue-800 space-y-2 text-sm">
          <li>• 支持标准的 JSON 数组格式，每个对象包含 instruction、input、output、system 字段</li>
          <li>• 自动将大文件拆分为多个 Markdown 文件，每个文件约 10MB</li>
          <li>• 输出格式符合 Dify 知识库要求，支持批量上传</li>
          <li>• 转换后的 Markdown 文件可以直接导入到 Dify 知识库中</li>
        </ul>
      </div>
    </div>
  )
}

export default KnowledgeConverter
