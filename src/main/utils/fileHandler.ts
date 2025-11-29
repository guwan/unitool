import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * 核心 JSON 拆分逻辑。
 * @param filePath 输入的 JSON 文件路径
 * @param chunkSize 每个拆分文件包含的记录数
 * @param outputPath 拆分文件的输出目录
 * @returns 包含拆分结果统计信息的对象
 */
export async function splitJson(filePath: string, chunkSize: number, outputPath: string) {
  const startTime = Date.now()

  try {
    // 1. 读取整个文件内容
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const data: any[] = JSON.parse(fileContent)

    if (!Array.isArray(data)) {
      throw new Error('文件内容不是一个有效的 JSON 数组。')
    }

    const totalRecords = data.length
    let fileCount = 0

    // 2. 循环拆分数组并写入文件
    const baseFileName = path.basename(filePath, path.extname(filePath))

    for (let i = 0; i < totalRecords; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize)

      // 构造输出文件名：originalName_part_X.json
      const outputFileName = `${baseFileName}_part_${fileCount + 1}.json`
      const outputFilePath = path.join(outputPath, outputFileName)

      // 写入文件（格式化为可读的 JSON）
      await fs.writeFile(outputFilePath, JSON.stringify(chunk, null, 2), 'utf-8')
      fileCount++
    }

    const endTime = Date.now()

    return {
      success: true,
      fileCount,
      totalRecords,
      time: endTime - startTime,
    }
  } catch (error: any) {
    // 捕获所有文件/JSON 解析错误，并向上抛出
    throw new Error(`文件操作失败: ${error.message}`)
  }
}
