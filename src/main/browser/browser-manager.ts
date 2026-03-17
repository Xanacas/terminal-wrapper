import { WebContentsView, shell } from 'electron'

interface BrowserInstance {
  view: WebContentsView
  projectId: string
}

const instances = new Map<string, BrowserInstance>()
let parentView: Electron.BaseWindow | null = null

export function setParentWindow(win: Electron.BaseWindow): void {
  parentView = win
}

export function createBrowserView(projectId: string, url?: string): WebContentsView {
  destroyBrowserView(projectId)

  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      sandbox: true
    }
  })

  if (url) {
    view.webContents.loadURL(url)
  }

  instances.set(projectId, { view, projectId })
  return view
}

export function destroyBrowserView(projectId: string): void {
  const instance = instances.get(projectId)
  if (instance && parentView) {
    try {
      parentView.contentView.removeChildView(instance.view)
    } catch {
      // not attached
    }
    instance.view.webContents.close()
    instances.delete(projectId)
  }
}

export function getBrowserView(projectId: string): WebContentsView | undefined {
  return instances.get(projectId)?.view
}

export function navigateTo(projectId: string, url: string): void {
  const instance = instances.get(projectId)
  if (!instance) return
  // Normalize url
  if (!/^https?:\/\//i.test(url) && !/^file:\/\//i.test(url)) {
    url = 'https://' + url
  }
  instance.view.webContents.loadURL(url)
}

export function goBack(projectId: string): void {
  instances.get(projectId)?.view.webContents.goBack()
}

export function goForward(projectId: string): void {
  instances.get(projectId)?.view.webContents.goForward()
}

export function reload(projectId: string): void {
  instances.get(projectId)?.view.webContents.reload()
}

export function toggleDevTools(projectId: string): void {
  const wc = instances.get(projectId)?.view.webContents
  if (!wc) return
  if (wc.isDevToolsOpened()) {
    wc.closeDevTools()
  } else {
    wc.openDevTools({ mode: 'detach' })
  }
}

export function openInChrome(projectId: string): void {
  const wc = instances.get(projectId)?.view.webContents
  if (!wc) return
  const url = wc.getURL()
  if (url) shell.openExternal(url)
}

export function setBrowserBounds(
  projectId: string,
  bounds: { x: number; y: number; width: number; height: number }
): void {
  const instance = instances.get(projectId)
  if (!instance) return

  instance.view.setBounds({
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(Math.max(bounds.width, 1)),
    height: Math.round(Math.max(bounds.height, 1))
  })
}

export function showBrowserView(projectId: string): void {
  const instance = instances.get(projectId)
  if (!instance || !parentView) return
  try {
    parentView.contentView.addChildView(instance.view)
  } catch {
    // already attached
  }
}

export function hideBrowserView(projectId: string): void {
  const instance = instances.get(projectId)
  if (!instance || !parentView) return
  try {
    parentView.contentView.removeChildView(instance.view)
  } catch {
    // not attached
  }
}

export function hideAllBrowserViews(): void {
  for (const [projectId] of instances) {
    hideBrowserView(projectId)
  }
}

export function destroyAll(): void {
  for (const [projectId] of instances) {
    destroyBrowserView(projectId)
  }
}

export function getCurrentUrl(projectId: string): string {
  return instances.get(projectId)?.view.webContents.getURL() ?? ''
}

export function getTitle(projectId: string): string {
  return instances.get(projectId)?.view.webContents.getTitle() ?? ''
}

export function canGoBack(projectId: string): boolean {
  return instances.get(projectId)?.view.webContents.canGoBack() ?? false
}

export function canGoForward(projectId: string): boolean {
  return instances.get(projectId)?.view.webContents.canGoForward() ?? false
}
