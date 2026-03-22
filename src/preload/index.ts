import { contextBridge, ipcRenderer } from 'electron'

export interface ShellInfo {
  id: string
  name: string
  path: string
  args?: string[]
}

export interface BrowserNavInfo {
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
}

const api = {
  // System
  getHomeDir: (): Promise<string> => ipcRenderer.invoke('system:home-dir'),
  isPackaged: (): Promise<boolean> => ipcRenderer.invoke('system:is-packaged'),

  // Package.json
  getPackageScripts: (cwd: string): Promise<Record<string, string>> =>
    ipcRenderer.invoke('pkg:scripts', cwd),

  // Git
  getGitBranch: (cwd: string): Promise<string> =>
    ipcRenderer.invoke('git:branch', cwd),

  // Shell
  listShells: (): Promise<ShellInfo[]> => ipcRenderer.invoke('shell:list'),

  // Terminal
  spawnTerminal: (id: string, shellId: string, cwd: string, cols: number, rows: number) =>
    ipcRenderer.invoke('terminal:spawn', id, shellId, cwd, cols, rows),
  writeTerminal: (id: string, data: string) => ipcRenderer.send('terminal:write', id, data),
  resizeTerminal: (id: string, cols: number, rows: number) =>
    ipcRenderer.send('terminal:resize', id, cols, rows),
  killTerminal: (id: string) => ipcRenderer.send('terminal:kill', id),
  onTerminalData: (callback: (id: string, data: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, id: string, data: string) =>
      callback(id, data)
    ipcRenderer.on('terminal:data', handler)
    return () => ipcRenderer.removeListener('terminal:data', handler)
  },
  onTerminalExit: (callback: (id: string, exitCode: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, id: string, exitCode: number) =>
      callback(id, exitCode)
    ipcRenderer.on('terminal:exit', handler)
    return () => ipcRenderer.removeListener('terminal:exit', handler)
  },

  // Browser
  createBrowser: (projectId: string, url?: string) =>
    ipcRenderer.invoke('browser:create', projectId, url),
  navigateBrowser: (projectId: string, url: string) =>
    ipcRenderer.send('browser:navigate', projectId, url),
  browserBack: (projectId: string) => ipcRenderer.send('browser:back', projectId),
  browserForward: (projectId: string) => ipcRenderer.send('browser:forward', projectId),
  browserReload: (projectId: string) => ipcRenderer.send('browser:reload', projectId),
  browserToggleDevTools: (projectId: string) =>
    ipcRenderer.send('browser:toggle-devtools', projectId),
  browserOpenInChrome: (projectId: string) =>
    ipcRenderer.send('browser:open-in-chrome', projectId),
  setBrowserBounds: (
    projectId: string,
    bounds: { x: number; y: number; width: number; height: number }
  ) => ipcRenderer.send('browser:set-bounds', projectId, bounds),
  showBrowser: (projectId: string) => ipcRenderer.send('browser:show', projectId),
  hideBrowser: (projectId: string) => ipcRenderer.send('browser:hide', projectId),
  hideAllBrowsers: () => ipcRenderer.send('browser:hide-all'),
  destroyBrowser: (projectId: string) => ipcRenderer.send('browser:destroy', projectId),
  getBrowserInfo: (projectId: string): Promise<BrowserNavInfo> =>
    ipcRenderer.invoke('browser:get-info', projectId),
  setupBrowserNavListener: (projectId: string) =>
    ipcRenderer.invoke('browser:setup-nav-listener', projectId),
  onBrowserNavigated: (callback: (projectId: string, info: BrowserNavInfo) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      projectId: string,
      info: BrowserNavInfo
    ) => callback(projectId, info)
    ipcRenderer.on('browser:navigated', handler)
    return () => ipcRenderer.removeListener('browser:navigated', handler)
  },

  // Dialogs
  openFolderDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:open-folder'),

  // Terminal buffer persistence
  saveTerminalBuffer: (id: string, content: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('terminal-buffer:save', id, content),
  loadTerminalBuffer: (id: string): Promise<string | null> =>
    ipcRenderer.invoke('terminal-buffer:load', id),
  deleteTerminalBuffer: (id: string): Promise<void> =>
    ipcRenderer.invoke('terminal-buffer:delete', id),
  onSaveAllBuffers: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('terminal-buffer:save-all', handler)
    return () => ipcRenderer.removeListener('terminal-buffer:save-all', handler)
  },

  // Shortcuts
  onShortcut: (channel: string, callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },

  // Store
  getState: () => ipcRenderer.invoke('store:get-state'),
  dispatch: (action: string, payload: Record<string, unknown>) =>
    ipcRenderer.invoke('store:dispatch', action, payload),
  onStateChanged: (callback: (state: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state)
    ipcRenderer.on('store:state-changed', handler)
    return () => ipcRenderer.removeListener('store:state-changed', handler)
  },

  // Claude
  createClaudeSession: (panelId: string, config: Record<string, unknown>) =>
    ipcRenderer.invoke('claude:create-session', panelId, config),
  sendClaudeMessage: (panelId: string, text: string, images?: Array<{ base64: string; mediaType: string }>) =>
    ipcRenderer.invoke('claude:send-message', panelId, text, images),
  interruptClaude: (panelId: string) => ipcRenderer.send('claude:interrupt', panelId),
  destroyClaude: (panelId: string) => ipcRenderer.send('claude:destroy-session', panelId),
  respondClaudePermission: (panelId: string, toolUseId: string, allowed: boolean) =>
    ipcRenderer.send('claude:respond-permission', panelId, toolUseId, allowed),
  updateClaudeConfig: (panelId: string, updates: Record<string, unknown>): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('claude:update-config', panelId, updates),
  setClaudeCwd: (panelId: string, cwd: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('claude:set-cwd', panelId, cwd),
  listClaudeSessions: (cwd: string): Promise<unknown[]> =>
    ipcRenderer.invoke('claude:list-sessions', cwd),
  getClaudeSessionHistory: (sessionId: string): Promise<unknown[]> =>
    ipcRenderer.invoke('claude:get-session-history', sessionId),
  resumeClaudeSession: (panelId: string, sessionId: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('claude:resume-session', panelId, sessionId),
  globClaudeFiles: (cwd: string, pattern: string): Promise<string[]> =>
    ipcRenderer.invoke('claude:glob-files', cwd, pattern),
  onClaudeMessage: (callback: (panelId: string, msg: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, panelId: string, msg: unknown) =>
      callback(panelId, msg)
    ipcRenderer.on('claude:message', handler)
    return () => ipcRenderer.removeListener('claude:message', handler)
  },
  onClaudePermissionRequest: (callback: (panelId: string, msg: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, panelId: string, msg: unknown) =>
      callback(panelId, msg)
    ipcRenderer.on('claude:permission-request', handler)
    return () => ipcRenderer.removeListener('claude:permission-request', handler)
  },
  onClaudeSessionEnded: (callback: (panelId: string, msg: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, panelId: string, msg: unknown) =>
      callback(panelId, msg)
    ipcRenderer.on('claude:session-ended', handler)
    return () => ipcRenderer.removeListener('claude:session-ended', handler)
  },
  onClaudeError: (callback: (panelId: string, msg: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, panelId: string, msg: unknown) =>
      callback(panelId, msg)
    ipcRenderer.on('claude:error', handler)
    return () => ipcRenderer.removeListener('claude:error', handler)
  },

  // Logging
  getLoggingEnabled: (): Promise<boolean> => ipcRenderer.invoke('logging:get-enabled'),
  setLoggingEnabled: (enabled: boolean): Promise<boolean> => ipcRenderer.invoke('logging:set-enabled', enabled),
  openLogFolder: () => ipcRenderer.invoke('logging:open-folder'),

  // URL
  openExternal: (url: string) => ipcRenderer.send('url:open-external', url)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
