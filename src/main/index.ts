import { app, globalShortcut, Menu } from 'electron'
import { loadState } from './store'
import { createMainWindow, getMainWindow, getRendererWebContents } from './window-manager'
import { registerIpcHandlers, setupStoreSync } from './ipc-handlers'
import { killAll } from './terminal/pty-manager'
import { destroyAll } from './browser/browser-manager'
import { setWebContents, destroyAll as destroyAllClaude } from './claude/claude-session-manager'

app.whenReady().then(() => {
  loadState()
  registerIpcHandlers()

  // Remove native menu bar
  Menu.setApplicationMenu(null)

  const window = createMainWindow()

  const wc = getRendererWebContents()
  if (wc) {
    wc.on('did-finish-load', () => {
      setupStoreSync(wc)
      setWebContents(wc)
    })
  }

  const sendShortcut = (channel: string) => {
    const rendererWc = getRendererWebContents()
    if (rendererWc && !rendererWc.isDestroyed()) {
      rendererWc.send(channel)
    }
  }

  // Track OS-level window focus via events rather than calling isFocused() at
  // shortcut time. With BaseWindow + WebContentsView, isFocused() on the
  // BaseWindow can return false while a child view holds DOM focus. The
  // focus/blur events fire at the OS level whenever our window becomes the
  // active window or loses it, so this is reliable.
  let windowFocused = false
  window.on('focus', () => { windowFocused = true })
  window.on('blur',  () => { windowFocused = false })

  // globalShortcut captures keys system-wide (works even when xterm canvas has
  // DOM focus), and the windowFocused guard prevents stealing shortcuts from
  // other applications when our window is in the background.
  const shortcuts: Record<string, string> = {
    'CommandOrControl+Shift+P': 'shortcut:command-palette',
    'CommandOrControl+P':       'shortcut:project-switcher',
    'CommandOrControl+T':       'shortcut:new-project',
    'CommandOrControl+W':       'shortcut:close-tab',
    'CommandOrControl+L':       'shortcut:focus-address-bar',
    'CommandOrControl+`':       'shortcut:focus-terminal',
    'CommandOrControl+Shift+D': 'shortcut:split-right',
    'CommandOrControl+Shift+E': 'shortcut:split-down',
    'CommandOrControl+Shift+T': 'shortcut:new-terminal-tab',
    'CommandOrControl+Shift+B': 'shortcut:new-browser-tab',
    'CommandOrControl+Shift+A': 'shortcut:new-claude-tab',
    // Thread cycling
    'CommandOrControl+Tab':       'shortcut:thread-next',
    'CommandOrControl+Shift+Tab': 'shortcut:thread-prev',
    // Jump to thread by position
    'CommandOrControl+1': 'shortcut:thread-1',
    'CommandOrControl+2': 'shortcut:thread-2',
    'CommandOrControl+3': 'shortcut:thread-3',
    'CommandOrControl+4': 'shortcut:thread-4',
    'CommandOrControl+5': 'shortcut:thread-5',
    'CommandOrControl+6': 'shortcut:thread-6',
    'CommandOrControl+7': 'shortcut:thread-7',
    'CommandOrControl+8': 'shortcut:thread-8',
    'CommandOrControl+9': 'shortcut:thread-9',
    // Tab navigation
    'CommandOrControl+PageUp':   'shortcut:tab-prev',
    'CommandOrControl+PageDown': 'shortcut:tab-next',
    // Focus pane by index
    'Alt+1': 'shortcut:panel-1',
    'Alt+2': 'shortcut:panel-2',
    'Alt+3': 'shortcut:panel-3',
    'Alt+4': 'shortcut:panel-4',
    'Alt+5': 'shortcut:panel-5',
    'Alt+6': 'shortcut:panel-6',
    'Alt+7': 'shortcut:panel-7',
    'Alt+8': 'shortcut:panel-8',
    'Alt+9': 'shortcut:panel-9',
  }

  for (const [accelerator, channel] of Object.entries(shortcuts)) {
    globalShortcut.register(accelerator, () => {
      if (windowFocused) {
        sendShortcut(channel)
      }
    })
  }

  // Before the window closes, tell renderer to save terminal buffers
  window.on('close', () => {
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  killAll()
  destroyAll()
  destroyAllClaude()
  app.quit()
})
