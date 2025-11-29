import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron' // ❗ 增加 dialog 导入
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { splitJson } from './utils/fileHandler' // ❗ 导入拆分逻辑

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

  // 1. 文件/目录选择对话框 (需要访问 BrowserWindow)
  ipcMain.handle('dialog:open', async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender)!
    return dialog.showOpenDialog(window, options)
  })

  // 2. JSON 拆分操作 (委托给外部模块)
  ipcMain.handle('fs:split-json', async (event, filePath: string, chunkSize: number, outputPath: string) => {
    try {
      // 调用 utils/fileHandler.ts 中的核心函数
      return await splitJson(filePath, chunkSize, outputPath)
    } catch (error: any) {
      // 捕获并抛出错误给前端
      throw new Error(error.message || 'JSON 拆分过程中发生未知错误。')
    }
  })

  // IPC test
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
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
