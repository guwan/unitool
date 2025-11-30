import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    // ❗ 更新 api 的类型定义，包含我们新增的方法
    api: {
      dialog: {
        showOpenDialog: (options: any) => Promise<{ filePaths: string[] | undefined }>
      },
      fs: {
        splitJson: (
          filePath: string,
          chunkSize: number,
          outputPath: string
        ) => Promise<{ fileCount: number, totalRecords: number, time: number }>,
        // 添加新方法的类型定义
        convertKnowledge: (
          filePath: string,
          outputPath: string
        ) => Promise<{ fileCount: number, totalItems: number, outputFiles: string[] }>
      }
    }
  }
}
