import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname, basename } from 'path'

interface KnowledgeItem {
  instruction: string
  input: string
  output: string
  system: string
}

/**
 * 将 JSON 数据转换为 Markdown 格式
 */
function convertToMarkdown(items: KnowledgeItem[]): string {
  let markdown = '# 知识库文档\n\n'

  items.forEach((item, index) => {
    markdown += `## 条目 ${index + 1}\n\n`

    if (item.instruction) {
      markdown += `### 指令\n${item.instruction}\n\n`
    }

    if (item.input) {
      markdown += `### 输入\n${item.input}\n\n`
    }

    if (item.output) {
      markdown += `### 输出\n${item.output}\n\n`
    }

    if (item.system) {
      markdown += `### 系统\n${item.system}\n\n`
    }

    markdown += '---\n\n'
  })

  return markdown
}

/**
 * 估算 Markdown 文件大小（字节）
 */
function estimateMarkdownSize(markdown: string): number {
  // 简单估算：每个字符约 1-2 字节，加上一些额外开销
  return markdown.length * 1.5
}

/**
 * 将 JSON 文件转换为 Markdown 文件，支持拆分大文件
 */
export async function convertJsonToMarkdown(
  filePath: string,
  outputPath: string,
  maxFileSize: number = 10 * 1024 * 1024 // 默认 10MB，留出安全余量
): Promise<{ fileCount: number; totalItems: number; outputFiles: string[] }> {
  try {
    // 读取 JSON 文件
    const fileContent = await readFile(filePath, 'utf-8')
    const data: KnowledgeItem[] = JSON.parse(fileContent)

    if (!Array.isArray(data)) {
      throw new Error('JSON 文件应该包含一个数组')
    }

    console.log(`开始转换，共 ${data.length} 个条目`)

    // 确保输出目录存在
    const outputDir = dirname(outputPath)
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true })
    }

    const baseName = basename(filePath, '.json')
    const outputFiles: string[] = []
    let currentChunk: KnowledgeItem[] = []
    let currentSize = 0
    let fileCount = 0
    let totalProcessed = 0

    // 计算每个条目的大致大小，用于智能分块
    const sampleItem = data[0]
    const sampleMarkdown = convertToMarkdown([sampleItem])
    const avgItemSize = estimateMarkdownSize(sampleMarkdown)

    const itemsPerChunk = Math.floor(maxFileSize / avgItemSize)
    console.log(`预计每文件约 ${itemsPerChunk} 个条目`)

    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      const itemMarkdown = convertToMarkdown([item])
      const itemSize = estimateMarkdownSize(itemMarkdown)

      // 如果当前块加上新条目会超过大小限制，或者已经达到预估数量，就保存当前块
      if (currentSize + itemSize > maxFileSize * 0.8 || currentChunk.length >= itemsPerChunk) {
        if (currentChunk.length > 0) {
          fileCount++
          const chunkFileName = `${baseName}_part${fileCount}.md`
          const chunkFilePath = join(outputDir, chunkFileName)

          const markdownContent = convertToMarkdown(currentChunk)
          await writeFile(chunkFilePath, markdownContent, 'utf-8')
          outputFiles.push(chunkFilePath)

          console.log(`已创建文件: ${chunkFileName} (${currentChunk.length} 个条目)`)

          totalProcessed += currentChunk.length
          currentChunk = []
          currentSize = 0
        }
      }

      currentChunk.push(item)
      currentSize += itemSize
    }

    // 处理最后一批数据
    if (currentChunk.length > 0) {
      fileCount++
      const chunkFileName = fileCount === 1 ? `${baseName}.md` : `${baseName}_part${fileCount}.md`
      const chunkFilePath = join(outputDir, chunkFileName)

      const markdownContent = convertToMarkdown(currentChunk)
      await writeFile(chunkFilePath, markdownContent, 'utf-8')
      outputFiles.push(chunkFilePath)

      console.log(`已创建文件: ${chunkFileName} (${currentChunk.length} 个条目)`)
      totalProcessed += currentChunk.length
    }

    console.log(`转换完成！共生成 ${fileCount} 个文件，处理了 ${totalProcessed} 个条目`)

    return {
      fileCount,
      totalItems: totalProcessed,
      outputFiles
    }
  } catch (error) {
    console.error('转换过程中发生错误:', error)
    throw error
  }
}
