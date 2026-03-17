import { BaseWindow, WebContentsView } from 'electron'
import { join } from 'path'
import { getState, setState } from './store'
import { setParentWindow } from './browser/browser-manager'

let mainWindow: BaseWindow | null = null
let rendererView: WebContentsView | null = null

export function createMainWindow(): BaseWindow {
  const savedBounds = getState().windowBounds
  const isMaximized = getState().isMaximized

  mainWindow = new BaseWindow({
    width: savedBounds?.width ?? 1200,
    height: savedBounds?.height ?? 800,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 600,
    minHeight: 400,
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#131316',
      symbolColor: '#8888a0',
      height: 34
    }
  })

  setParentWindow(mainWindow)

  // Renderer WebContentsView fills the whole window
  rendererView = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      sandbox: false, // needed for node-pty IPC
      nodeIntegration: false
    }
  })

  mainWindow.contentView.addChildView(rendererView)

  // Fill the window
  const updateRendererBounds = (): void => {
    if (!mainWindow || !rendererView) return
    const { width, height } = mainWindow.getContentBounds()
    rendererView.setBounds({ x: 0, y: 0, width, height })
  }

  mainWindow.on('resize', updateRendererBounds)
  updateRendererBounds()

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    rendererView.webContents.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    rendererView.webContents.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Show once renderer content is loaded
  rendererView.webContents.on('did-finish-load', () => {
    if (isMaximized) {
      mainWindow?.maximize()
    }
    mainWindow?.show()
  })

  // Persist window bounds
  const saveBounds = (): void => {
    if (!mainWindow) return
    const maximized = mainWindow.isMaximized()
    if (!maximized) {
      const bounds = mainWindow.getBounds()
      setState({ windowBounds: bounds, isMaximized: false })
    } else {
      setState({ isMaximized: true })
    }
  }

  mainWindow.on('resize', saveBounds)
  mainWindow.on('move', saveBounds)

  mainWindow.on('closed', () => {
    mainWindow = null
    rendererView = null
  })

  return mainWindow
}

export function getMainWindow(): BaseWindow | null {
  return mainWindow
}

export function getRendererWebContents(): Electron.WebContents | null {
  return rendererView?.webContents ?? null
}
