import { ipcMain, app, shell } from 'electron'
import { homedir } from 'os'
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join, resolve, isAbsolute } from 'path'
import { spawnPty, spawnDockerPty, writePty, resizePty, killPty } from './terminal/pty-manager'
import { detectShells } from './terminal/shell-detector'
import * as browserManager from './browser/browser-manager'
import * as store from './store'
import * as claudeSessionManager from './claude/claude-session-manager'
import * as logger from './logger'
import * as devcontainerManager from './devcontainer/devcontainer-manager'

/**
 * Validates an IPC path argument — must be absolute with no null bytes.
 * Returns the resolved path or throws.
 */
function validateIpcPath(input: string): string {
  if (typeof input !== 'string' || input.includes('\0')) {
    throw new Error('Invalid path')
  }
  const resolved = resolve(input)
  if (!isAbsolute(resolved)) {
    throw new Error('Path must be absolute')
  }
  return resolved
}

export function registerIpcHandlers(): void {
  // ---- System ----
  ipcMain.handle('system:home-dir', () => homedir())
  ipcMain.handle('system:user-data-path', () => app.getPath('userData'))
  ipcMain.handle('system:is-packaged', () => app.isPackaged)

  // ---- Package.json scripts ----
  ipcMain.handle('pkg:scripts', (_event, cwd: string) => {
    try {
      const safeCwd = validateIpcPath(cwd)
      const raw = readFileSync(join(safeCwd, 'package.json'), 'utf-8')
      const pkg = JSON.parse(raw)
      return pkg.scripts ?? {}
    } catch {
      return {}
    }
  })

  // ---- Git branch ----
  ipcMain.handle('git:branch', async (_event, cwd: string) => {
    try {
      const safeCwd = validateIpcPath(cwd)
      const { execSync } = await import('child_process')
      return execSync('git rev-parse --abbrev-ref HEAD', { cwd: safeCwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
    } catch {
      return ''
    }
  })

  // ---- Dialogs ----
  ipcMain.handle('dialog:open-folder', async () => {
    const { dialog } = await import('electron')
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select default working directory'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // ---- Terminal buffer persistence ----
  const buffersDir = join(app.getPath('userData'), 'terminal-buffers')

  // Validate buffer IDs to prevent path traversal
  const safeBufferId = (id: string) => {
    if (typeof id !== 'string' || /[/\\:]/.test(id) || id.includes('..') || id.includes('\0')) {
      throw new Error('Invalid buffer id')
    }
    return id
  }

  ipcMain.handle('terminal-buffer:save', (_event, id: string, content: string) => {
    try {
      const safeId = safeBufferId(id)
      if (!existsSync(buffersDir)) mkdirSync(buffersDir, { recursive: true })
      writeFileSync(join(buffersDir, `${safeId}.txt`), content, 'utf-8')
      return { ok: true }
    } catch (e) {
      console.error('Failed to save terminal buffer:', e)
      return { ok: false }
    }
  })

  ipcMain.handle('terminal-buffer:load', (_event, id: string) => {
    try {
      const safeId = safeBufferId(id)
      const file = join(buffersDir, `${safeId}.txt`)
      if (existsSync(file)) {
        return readFileSync(file, 'utf-8')
      }
    } catch {
      // ignore
    }
    return null
  })

  ipcMain.handle('terminal-buffer:delete', (_event, id: string) => {
    try {
      const safeId = safeBufferId(id)
      const file = join(buffersDir, `${safeId}.txt`)
      if (existsSync(file)) unlinkSync(file)
    } catch {
      // ignore
    }
  })

  // ---- Shell detection ----
  ipcMain.handle('shell:list', () => detectShells())

  // ---- Terminal ----
  ipcMain.handle(
    'terminal:spawn',
    (event, id: string, shellId: string, cwd: string, cols: number, rows: number) => {
      const shells = detectShells()
      const shell = shells.find((s) => s.id === shellId) ?? shells[0]
      if (!shell) return { error: 'No shells available' }

      spawnPty(
        id,
        shell,
        cwd,
        cols,
        rows,
        (data) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('terminal:data', id, data)
          }
        },
        (exitCode) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('terminal:exit', id, exitCode)
          }
        }
      )
      return { ok: true }
    }
  )

  ipcMain.on('terminal:write', (_event, id: string, data: string) => {
    writePty(id, data)
  })

  ipcMain.on('terminal:resize', (_event, id: string, cols: number, rows: number) => {
    resizePty(id, cols, rows)
  })

  ipcMain.on('terminal:kill', (_event, id: string) => {
    killPty(id)
  })

  // ---- Browser ----
  ipcMain.handle('browser:create', (_event, projectId: string, url?: string) => {
    browserManager.createBrowserView(projectId, url)
    return { ok: true }
  })

  ipcMain.on('browser:navigate', (_event, projectId: string, url: string) => {
    browserManager.navigateTo(projectId, url)
  })

  ipcMain.on('browser:back', (_event, projectId: string) => {
    browserManager.goBack(projectId)
  })

  ipcMain.on('browser:forward', (_event, projectId: string) => {
    browserManager.goForward(projectId)
  })

  ipcMain.on('browser:reload', (_event, projectId: string) => {
    browserManager.reload(projectId)
  })

  ipcMain.on('browser:toggle-devtools', (_event, projectId: string) => {
    browserManager.toggleDevTools(projectId)
  })

  ipcMain.on('browser:open-in-chrome', (_event, projectId: string) => {
    browserManager.openInChrome(projectId)
  })

  ipcMain.on(
    'browser:set-bounds',
    (
      _event,
      projectId: string,
      bounds: { x: number; y: number; width: number; height: number }
    ) => {
      browserManager.setBrowserBounds(projectId, bounds)
    }
  )

  ipcMain.on('browser:show', (_event, projectId: string) => {
    browserManager.showBrowserView(projectId)
  })

  ipcMain.on('browser:hide', (_event, projectId: string) => {
    browserManager.hideBrowserView(projectId)
  })

  ipcMain.on('browser:hide-all', () => {
    browserManager.hideAllBrowserViews()
  })

  ipcMain.on('browser:destroy', (_event, projectId: string) => {
    browserManager.destroyBrowserView(projectId)
  })

  ipcMain.handle('browser:get-info', (_event, projectId: string) => {
    return {
      url: browserManager.getCurrentUrl(projectId),
      title: browserManager.getTitle(projectId),
      canGoBack: browserManager.canGoBack(projectId),
      canGoForward: browserManager.canGoForward(projectId)
    }
  })

  // Listen for navigation events from browser views to push URL updates
  ipcMain.handle('browser:setup-nav-listener', (event, projectId: string) => {
    const view = browserManager.getBrowserView(projectId)
    if (!view) return

    view.webContents.on('did-navigate', () => {
      event.sender.send('browser:navigated', projectId, {
        url: view.webContents.getURL(),
        title: view.webContents.getTitle(),
        canGoBack: view.webContents.canGoBack(),
        canGoForward: view.webContents.canGoForward()
      })
    })

    view.webContents.on('did-navigate-in-page', () => {
      event.sender.send('browser:navigated', projectId, {
        url: view.webContents.getURL(),
        title: view.webContents.getTitle(),
        canGoBack: view.webContents.canGoBack(),
        canGoForward: view.webContents.canGoForward()
      })
    })

    view.webContents.on('page-title-updated', () => {
      event.sender.send('browser:navigated', projectId, {
        url: view.webContents.getURL(),
        title: view.webContents.getTitle(),
        canGoBack: view.webContents.canGoBack(),
        canGoForward: view.webContents.canGoForward()
      })
    })
  })

  // ---- Store ----
  ipcMain.handle('store:get-state', () => store.getState())

  ipcMain.handle(
    'store:dispatch',
    (_event, action: string, payload: Record<string, unknown>) => {
      switch (action) {
        case 'addProject':
          return store.addProject(payload as unknown as store.Project)
        case 'updateProject':
          return store.updateProject(
            payload.id as string,
            payload.updates as Partial<store.Project>
          )
        case 'removeProject':
          return store.removeProject(payload.id as string)
        case 'setActiveProject':
          return store.setActiveProject(payload.id as string)
        case 'setState':
          return store.setState(payload as Partial<store.AppState>)
        case 'updateDevContainerGlobal':
          return store.setState({ devContainerGlobal: payload as store.AppState['devContainerGlobal'] })
        default:
          console.warn('Unknown store action:', action)
          return store.getState()
      }
    }
  )

  // ---- Claude ----
  ipcMain.handle('claude:create-session', (_event, panelId: string, config: Record<string, unknown>) => {
    return claudeSessionManager.createSession(panelId, config as Parameters<typeof claudeSessionManager.createSession>[1])
  })

  ipcMain.handle('claude:send-message', async (_event, panelId: string, text: string, images?: Array<{ base64: string; mediaType: string }>) => {
    try {
      // Fire and forget the streaming — but catch launch errors
      claudeSessionManager.sendMessage(panelId, text, images).catch((err) => {
        console.error('Claude sendMessage error:', err)
        // Send error back to renderer so it can clear the running state
        _event.sender.send('claude:session-ended', panelId, {
          type: 'session-ended',
          reason: 'error',
          error: err instanceof Error ? err.message : String(err),
          costUsd: 0,
          inputTokens: 0,
          outputTokens: 0,
          ts: Date.now(),
        })
      })
      return { ok: true }
    } catch (err) {
      console.error('Claude sendMessage launch error:', err)
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.on('claude:interrupt', (_event, panelId: string) => {
    claudeSessionManager.interruptSession(panelId)
  })

  ipcMain.on('claude:destroy-session', (_event, panelId: string) => {
    claudeSessionManager.destroySession(panelId)
  })

  ipcMain.on('claude:respond-permission', (_event, panelId: string, toolUseId: string, allowed: boolean, updatedInput?: Record<string, unknown>) => {
    claudeSessionManager.respondToPermission(panelId, toolUseId, allowed, updatedInput)
  })

  ipcMain.handle('claude:update-config', (_event, panelId: string, updates: Record<string, unknown>) => {
    claudeSessionManager.updateConfig(panelId, updates)
    return { ok: true }
  })

  ipcMain.handle('claude:set-cwd', (_event, panelId: string, cwd: string) => {
    const safeCwd = validateIpcPath(cwd)
    claudeSessionManager.updateConfig(panelId, { cwd: safeCwd })
    return { ok: true }
  })

  ipcMain.handle('claude:list-sessions', (_event, cwd: string) => {
    const safeCwd = validateIpcPath(cwd)
    return claudeSessionManager.listPastSessions(safeCwd)
  })

  ipcMain.handle('claude:get-session-history', (_event, sessionId: string) => {
    return claudeSessionManager.getSessionHistory(sessionId)
  })

  ipcMain.handle('claude:get-session-state', (_event, panelId: string) => {
    return claudeSessionManager.getSessionState(panelId)
  })

  ipcMain.handle('claude:get-cached-init-result', (_event, cwd?: string, docker?: { container: string }) => {
    return claudeSessionManager.getCachedInitResult(cwd, docker)
  })

  ipcMain.handle('claude:resume-session', (_event, panelId: string, sessionId: string) => {
    claudeSessionManager.resumeSession(panelId, sessionId)
    return { ok: true }
  })

  ipcMain.handle('claude:stop-task', (_event, panelId: string, taskId: string) => {
    return claudeSessionManager.stopBackgroundTask(panelId, taskId)
  })

  ipcMain.handle('claude:fork-session', (_event, panelId: string, options?: { upToMessageId?: string; title?: string }) => {
    return claudeSessionManager.forkSessionFromPanel(panelId, options)
  })

  ipcMain.handle('claude:rewind-files', (_event, panelId: string, userMessageId: string, options?: { dryRun?: boolean }) => {
    return claudeSessionManager.rewindFilesInSession(panelId, userMessageId, options)
  })

  ipcMain.handle('claude:glob-files', async (_event, cwd: string, pattern: string) => {
    try {
      const safeCwd = validateIpcPath(cwd)
      if (typeof pattern !== 'string' || pattern.includes('\0')) return []
      const { readdir } = await import('fs/promises')
      const files = await readdir(safeCwd, { recursive: true })
      const lower = pattern.toLowerCase()
      return (files as string[])
        .filter(f => f.toLowerCase().includes(lower))
        .slice(0, 50)
    } catch {
      return []
    }
  })

  // ---- Logging ----
  ipcMain.handle('logging:get-enabled', () => logger.isEnabled())

  ipcMain.handle('logging:set-enabled', (_event, enabled: boolean) => {
    logger.setEnabled(enabled)
    return logger.isEnabled()
  })

  ipcMain.handle('logging:open-folder', () => {
    logger.openLogFolder()
    return { ok: true }
  })

  // ---- DevContainer ----
  ipcMain.handle('devcontainer:spawn', (_event, repo: string, branch: string, name: string, projectType?: string) =>
    devcontainerManager.spawnContainer(repo, branch, name, projectType)
  )

  ipcMain.handle('devcontainer:stop', (_event, name: string) =>
    devcontainerManager.stopContainer(name)
  )

  ipcMain.handle('devcontainer:start', (_event, name: string) =>
    devcontainerManager.startContainer(name)
  )

  ipcMain.handle('devcontainer:destroy', (_event, name: string) =>
    devcontainerManager.destroyContainer(name)
  )

  ipcMain.handle('devcontainer:pause', (_event, name: string) =>
    devcontainerManager.pauseContainer(name)
  )

  ipcMain.handle('devcontainer:unpause', (_event, name: string) =>
    devcontainerManager.unpauseContainer(name)
  )

  ipcMain.handle('devcontainer:status', (_event, name: string) =>
    devcontainerManager.inspectContainer(name)
  )

  ipcMain.handle('devcontainer:list-branches', (_event, repo: string) =>
    devcontainerManager.listRemoteBranches(repo)
  )

  ipcMain.handle('devcontainer:git-status', (_event, name: string) =>
    devcontainerManager.checkGitStatus(name)
  )

  ipcMain.handle('devcontainer:push', (_event, name: string) =>
    devcontainerManager.pushContainerBranch(name)
  )

  // ---- Docker Terminal ----
  ipcMain.handle(
    'terminal:spawn-docker',
    (event, id: string, containerName: string, user: string, workdir: string, cols: number, rows: number) => {
      spawnDockerPty(
        id,
        containerName,
        user,
        workdir,
        cols,
        rows,
        (data) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('terminal:data', id, data)
          }
        },
        (exitCode) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('terminal:exit', id, exitCode)
          }
        }
      )
      return { ok: true }
    }
  )

  // ---- URL ----
  ipcMain.on('url:open-external', (_event, url: string) => {
    shell.openExternal(url)
  })
}

export function setupStoreSync(webContents: Electron.WebContents): () => void {
  return store.subscribe((state) => {
    if (!webContents.isDestroyed()) {
      webContents.send('store:state-changed', state)
    }
  })
}
