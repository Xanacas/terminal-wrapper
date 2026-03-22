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

export interface ClaudeSessionSummary {
  sessionId: string
  summary: string
  lastModified: number
  firstPrompt?: string
  cwd?: string
  createdAt?: number
}

export interface Api {
  // System
  getHomeDir: () => Promise<string>
  isPackaged: () => Promise<boolean>

  // Package.json
  getPackageScripts: (cwd: string) => Promise<Record<string, string>>

  // Git
  getGitBranch: (cwd: string) => Promise<string>

  // Shell
  listShells: () => Promise<ShellInfo[]>

  // Terminal
  spawnTerminal: (
    id: string,
    shellId: string,
    cwd: string,
    cols: number,
    rows: number
  ) => Promise<{ ok?: boolean; error?: string }>
  writeTerminal: (id: string, data: string) => void
  resizeTerminal: (id: string, cols: number, rows: number) => void
  killTerminal: (id: string) => void
  onTerminalData: (callback: (id: string, data: string) => void) => () => void
  onTerminalExit: (callback: (id: string, exitCode: number) => void) => () => void

  // Browser
  createBrowser: (projectId: string, url?: string) => Promise<{ ok: boolean }>
  navigateBrowser: (projectId: string, url: string) => void
  browserBack: (projectId: string) => void
  browserForward: (projectId: string) => void
  browserReload: (projectId: string) => void
  browserToggleDevTools: (projectId: string) => void
  browserOpenInChrome: (projectId: string) => void
  setBrowserBounds: (
    projectId: string,
    bounds: { x: number; y: number; width: number; height: number }
  ) => void
  showBrowser: (projectId: string) => void
  hideBrowser: (projectId: string) => void
  hideAllBrowsers: () => void
  destroyBrowser: (projectId: string) => void
  getBrowserInfo: (projectId: string) => Promise<BrowserNavInfo>
  setupBrowserNavListener: (projectId: string) => Promise<void>
  onBrowserNavigated: (callback: (projectId: string, info: BrowserNavInfo) => void) => () => void

  // Terminal buffer persistence
  saveTerminalBuffer: (id: string, content: string) => Promise<{ ok: boolean }>
  loadTerminalBuffer: (id: string) => Promise<string | null>
  deleteTerminalBuffer: (id: string) => Promise<void>
  onSaveAllBuffers: (callback: () => void) => () => void

  // Dialogs
  openFolderDialog: () => Promise<string | null>

  // Shortcuts
  onShortcut: (channel: string, callback: () => void) => () => void

  // Store
  getState: () => Promise<unknown>
  dispatch: (action: string, payload: Record<string, unknown>) => Promise<unknown>
  onStateChanged: (callback: (state: unknown) => void) => () => void

  // Claude
  createClaudeSession: (panelId: string, config: Record<string, unknown>) => Promise<{ sessionId: string }>
  sendClaudeMessage: (panelId: string, text: string, images?: Array<{ base64: string; mediaType: string }>) => Promise<{ ok: boolean }>
  interruptClaude: (panelId: string) => void
  destroyClaude: (panelId: string) => void
  respondClaudePermission: (panelId: string, toolUseId: string, allowed: boolean) => void
  updateClaudeConfig: (panelId: string, updates: Record<string, unknown>) => Promise<{ ok: boolean }>
  setClaudeCwd: (panelId: string, cwd: string) => Promise<{ ok: boolean }>
  listClaudeSessions: (cwd: string) => Promise<ClaudeSessionSummary[]>
  getClaudeSessionHistory: (sessionId: string) => Promise<unknown[]>
  resumeClaudeSession: (panelId: string, sessionId: string) => Promise<{ ok: boolean }>
  globClaudeFiles: (cwd: string, pattern: string) => Promise<string[]>
  onClaudeMessage: (callback: (panelId: string, msg: unknown) => void) => () => void
  onClaudePermissionRequest: (callback: (panelId: string, msg: unknown) => void) => () => void
  onClaudeSessionEnded: (callback: (panelId: string, msg: unknown) => void) => () => void
  onClaudeError: (callback: (panelId: string, msg: unknown) => void) => () => void

  // URL
  openExternal: (url: string) => void
}
