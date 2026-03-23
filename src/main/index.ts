import { app, Menu } from 'electron'

// Allow E2E tests to use an isolated userData directory
if (process.env.TERMINAL_WRAPPER_USER_DATA) {
  app.setPath('userData', process.env.TERMINAL_WRAPPER_USER_DATA)
}

import { loadState, setClaudeSessionIdForPanel, flushState } from './store'
import { createMainWindow, getRendererWebContents } from './window-manager'
import { registerIpcHandlers, setupStoreSync } from './ipc-handlers'
import { killAll } from './terminal/pty-manager'
import { destroyAll } from './browser/browser-manager'
import { setWebContents, destroyAll as destroyAllClaude, getAllSessionIds } from './claude/claude-session-manager'
import { setWebContents as setDevContainerWebContents } from './devcontainer/devcontainer-manager'
import { matchShortcut } from './shortcuts'
import { initLogger, disposeLogger } from './logger'

app.whenReady().then(() => {
  loadState()
  registerIpcHandlers()
  initLogger()

  // Remove native menu bar
  Menu.setApplicationMenu(null)

  const window = createMainWindow()

  const wc = getRendererWebContents()
  if (wc) {
    wc.on('did-finish-load', () => {
      setupStoreSync(wc)
      setWebContents(wc)
      setDevContainerWebContents(wc)
    })
  }

  const sendShortcut = (channel: string) => {
    const rendererWc = getRendererWebContents()
    if (rendererWc && !rendererWc.isDestroyed()) {
      rendererWc.send(channel)
    }
  }

  // Intercept shortcuts at the WebContents level (window-scoped, not OS-wide).
  // This fires before input reaches xterm.js/DOM, so shortcuts still work when
  // a terminal canvas has focus, but don't swallow keys in other applications.
  if (wc) {
    wc.on('before-input-event', (event, input) => {
      const channel = matchShortcut(input)
      if (channel) {
        event.preventDefault()
        sendShortcut(channel)
      }
    })
  }

  // Before the window closes, snapshot Claude session IDs and tell renderer to save terminal buffers
  window.on('close', () => {
    const allSessions = getAllSessionIds()
    for (const { panelId, sdkSessionId } of allSessions) {
      setClaudeSessionIdForPanel(panelId, sdkSessionId)
    }
    flushState()

    const rendererWc = getRendererWebContents()
    if (rendererWc && !rendererWc.isDestroyed()) {
      rendererWc.send('terminal-buffer:save-all')
    }
  })

  window.on('closed', () => {
    killAll()
    destroyAll()
    destroyAllClaude()
  })
})

app.on('window-all-closed', () => {
  killAll()
  destroyAll()
  destroyAllClaude()
  disposeLogger()
  app.quit()
})
