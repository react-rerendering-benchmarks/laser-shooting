import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { Injectable } from '@nestjs/common'
import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'
@Injectable()
export class ElectronService {
  mainWindow: BrowserWindow
  constructor() {
    function createWindow() {
      // Create the browser window.
      const mainWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
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
      return mainWindow
    }
    electronApp.setAppUserModelId('com.electron')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    this.mainWindow = createWindow()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) this.mainWindow = createWindow()
    })
  }
  send(channel: string, data?: unknown) {
    this.mainWindow.webContents.send(channel, data)
  }
}
