import { Component, useEffect, useMemo } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { useAppStore } from '~/stores/app-store'
import { useUIStore } from '~/stores/ui-store'
import { useProjects } from '~/hooks/use-projects'
import { useShortcuts } from '~/hooks/use-shortcuts'
import { collectLeafPanels } from '~/lib/panel-utils'
import { Sidebar } from '~/components/sidebar/sidebar'
import { Workspace } from '~/components/workspace/workspace'
import { CommandPalette } from '~/components/command-palette/command-palette'
import { ProjectSwitcher } from '~/components/command-palette/project-switcher'
import { ProjectSettings } from '~/components/project-settings/project-settings'
import { CommandPopover } from '~/components/quick-commands/command-popover'
import { CommandEditor } from '~/components/quick-commands/command-editor'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('React error boundary caught:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#ef4444', background: '#0c0c0e', height: '100%', fontFamily: 'monospace', fontSize: 13, overflow: 'auto' }}>
          <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#e0e0e0' }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#888', marginTop: 8, fontSize: 11 }}>{this.state.error.stack}</pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: '6px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Try Again</button>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  const init = useAppStore((s) => s.init)
  const initialized = useAppStore((s) => s.initialized)

  const { createProject, closeTab, addTab, splitPanelInTab, switchThread, switchTab } = useProjects()

  const openCommandPalette = useUIStore((s) => s.openCommandPalette)
  const openProjectSwitcher = useUIStore((s) => s.openProjectSwitcher)
  const closeAllOverlays = useUIStore((s) => s.closeAllOverlays)
  const focusedPanelId = useUIStore((s) => s.focusedPanelId)
  const setFocusedPanel = useUIStore((s) => s.setFocusedPanel)
  const threadFocusOrder = useUIStore((s) => s.threadFocusOrder)

  const activeProject = useAppStore((s) => s.getActiveProject())
  const activeTab = useAppStore((s) => s.getActiveTab())

  useEffect(() => {
    init()
  }, [init])

  const shortcutHandlers = useMemo(() => {
    const switchToThreadByIndex = (idx: number) => {
      if (!activeProject) return
      const thread = activeProject.threads[idx]
      if (thread) switchThread(activeProject.id, thread.id)
    }

    const switchToAdjacentTab = (offset: number) => {
      if (!activeProject || !activeTab) return
      const thread = activeProject.threads.find((t) => t.id === activeProject.activeThreadId)
      if (!thread) return
      const idx = thread.tabs.findIndex((t) => t.id === activeTab.id)
      const next = thread.tabs[(idx + offset + thread.tabs.length) % thread.tabs.length]
      if (next) switchTab(activeProject.id, next.id)
    }

    const focusPanelByIndex = (idx: number) => {
      if (!activeTab) return
      const panel = collectLeafPanels(activeTab.panel)[idx]
      if (!panel) return
      setFocusedPanel(panel.id)
      window.dispatchEvent(new CustomEvent('panel:focus-request', { detail: { panelId: panel.id } }))
    }

    const cycleThread = (offset: number) => {
      if (!activeProject) return
      const threads = activeProject.threads
      const idx = threads.findIndex((t) => t.id === activeProject.activeThreadId)
      const next = threads[(idx + offset + threads.length) % threads.length]
      if (next) switchThread(activeProject.id, next.id)
    }

    return {
      'shortcut:command-palette': () => openCommandPalette(),
      'shortcut:project-switcher': () => openProjectSwitcher(),
      'shortcut:new-project': () => createProject(),
      'shortcut:close-tab': () => {
        if (activeProject && activeTab) closeTab(activeProject.id, activeTab.id)
      },
      'shortcut:new-terminal-tab': () => { if (activeProject) addTab(activeProject.id, 'terminal') },
      'shortcut:new-browser-tab': () => { if (activeProject) addTab(activeProject.id, 'browser') },
      'shortcut:new-claude-tab':   () => { if (activeProject) addTab(activeProject.id, 'claude') },
      'shortcut:split-right': () => {
        if (activeProject && activeTab && focusedPanelId)
          splitPanelInTab(activeProject.id, activeTab.id, focusedPanelId, 'horizontal')
      },
      'shortcut:split-down': () => {
        if (activeProject && activeTab && focusedPanelId)
          splitPanelInTab(activeProject.id, activeTab.id, focusedPanelId, 'vertical')
      },
      'shortcut:focus-terminal': () => {
        document.querySelector<HTMLDivElement>('.xterm-helper-textarea')?.focus()
      },
      'shortcut:focus-address-bar': () => {
        document.querySelector<HTMLInputElement>('[data-address-bar]')?.focus()
      },
      'shortcut:escape': () => closeAllOverlays(),
      // Thread cycling (natural order)
      'shortcut:thread-next': () => cycleThread(+1),
      'shortcut:thread-prev': () => cycleThread(-1),
      // Jump to thread by 1-based position
      'shortcut:thread-1': () => switchToThreadByIndex(0),
      'shortcut:thread-2': () => switchToThreadByIndex(1),
      'shortcut:thread-3': () => switchToThreadByIndex(2),
      'shortcut:thread-4': () => switchToThreadByIndex(3),
      'shortcut:thread-5': () => switchToThreadByIndex(4),
      'shortcut:thread-6': () => switchToThreadByIndex(5),
      'shortcut:thread-7': () => switchToThreadByIndex(6),
      'shortcut:thread-8': () => switchToThreadByIndex(7),
      'shortcut:thread-9': () => switchToThreadByIndex(8),
      // Tab navigation
      'shortcut:tab-prev': () => switchToAdjacentTab(-1),
      'shortcut:tab-next': () => switchToAdjacentTab(+1),
      // Focus pane by 1-based index
      'shortcut:panel-1': () => focusPanelByIndex(0),
      'shortcut:panel-2': () => focusPanelByIndex(1),
      'shortcut:panel-3': () => focusPanelByIndex(2),
      'shortcut:panel-4': () => focusPanelByIndex(3),
      'shortcut:panel-5': () => focusPanelByIndex(4),
      'shortcut:panel-6': () => focusPanelByIndex(5),
      'shortcut:panel-7': () => focusPanelByIndex(6),
      'shortcut:panel-8': () => focusPanelByIndex(7),
      'shortcut:panel-9': () => focusPanelByIndex(8),
    }
  }, [
    activeProject,
    activeTab,
    focusedPanelId,
    threadFocusOrder,
    createProject,
    closeTab,
    addTab,
    splitPanelInTab,
    switchThread,
    switchTab,
    setFocusedPanel,
    openCommandPalette,
    openProjectSwitcher,
    closeAllOverlays,
  ])

  useShortcuts(shortcutHandlers)

  if (!initialized) {
    return (
      <div className="flex h-full items-center justify-center bg-bg text-text-muted">
        Loading...
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="flex h-full bg-bg">
        <Sidebar />
        <Workspace />
        <CommandPalette />
        <ProjectSwitcher />
        <ProjectSettings />
        <CommandPopover />
        <CommandEditor />
      </div>
    </ErrorBoundary>
  )
}
