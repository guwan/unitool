import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { splitJson } from './utils/fileHandler'
import { convertJsonToMarkdown } from './utils/knowledgeConverter' // ❗ 导入新工具

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // --- 注册自定义 IPC 处理器 ---

  // 1. 文件/目录选择对话框 (必须保留在 index.ts 中)
  ipcMain.handle('dialog:open', async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender)!
    return dialog.showOpenDialog(window, options)
  })

  // 2. JSON 拆分操作 (委托给 fileHandler.ts)
  ipcMain.handle('fs:split-json', async (event, filePath: string, chunkSize: number, outputPath: string) => {
    try {
      return await splitJson(filePath, chunkSize, outputPath)
    } catch (error: any) {
      throw new Error(error.message || 'JSON 拆分过程中发生未知错误。')
    }
  })

  // 3. JSON 到知识库 Markdown 转换操作
  ipcMain.handle('fs:convert-knowledge', async (event, filePath: string, outputPath: string) => {
    try {
      return await convertJsonToMarkdown(filePath, outputPath)
    } catch (error: any) {
      throw new Error(error.message || 'JSON 转换过程中发生未知错误。')
    }
  })

  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
