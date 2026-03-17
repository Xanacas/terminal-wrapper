import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useUIStore } from '~/stores/ui-store'
import { useAppStore } from '~/stores/app-store'
import { useProjects } from '~/hooks/use-projects'

interface Command {
  id: string
  label: string
  category: string
  shortcut?: string
  action: () => void
}

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen)
  const close = useUIStore((s) => s.closeCommandPalette)
  const focusedPanelId = useUIStore((s) => s.focusedPanelId)
  const openProjectSettings = useUIStore((s) => s.openProjectSettings)
  const project = useAppStore((s) => s.getActiveProject())
  const activeThread = useAppStore((s) => s.getActiveThread())
  const activeTab = useAppStore((s) => s.getActiveTab())

  const {
    createProject,
    deleteProject,
    duplicateProject,
    addThread,
    deleteThread,
    duplicateThread,
    addTab,
    closeTab,
    duplicateTab,
    splitPanelInTab,
    removePanelInTab
  } = useProjects()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const commands = useMemo((): Command[] => {
    const cmds: Command[] = []

    if (project && activeTab && focusedPanelId) {
      cmds.push(
        { id: 'split-right', label: 'Split Right', category: 'Layout', shortcut: 'Ctrl+Shift+D', action: () => { splitPanelInTab(project.id, activeTab.id, focusedPanelId, 'horizontal'); close() } },
        { id: 'split-down', label: 'Split Down', category: 'Layout', shortcut: 'Ctrl+Shift+E', action: () => { splitPanelInTab(project.id, activeTab.id, focusedPanelId, 'vertical'); close() } },
        { id: 'split-right-terminal', label: 'Split Right: Terminal', category: 'Layout', action: () => { splitPanelInTab(project.id, activeTab.id, focusedPanelId, 'horizontal', 'terminal'); close() } },
        { id: 'split-down-terminal', label: 'Split Down: Terminal', category: 'Layout', action: () => { splitPanelInTab(project.id, activeTab.id, focusedPanelId, 'vertical', 'terminal'); close() } },
        { id: 'split-right-browser', label: 'Split Right: Browser', category: 'Layout', action: () => { splitPanelInTab(project.id, activeTab.id, focusedPanelId, 'horizontal', 'browser'); close() } },
        { id: 'split-down-browser', label: 'Split Down: Browser', category: 'Layout', action: () => { splitPanelInTab(project.id, activeTab.id, focusedPanelId, 'vertical', 'browser'); close() } },
        { id: 'split-right-claude', label: 'Split Right: Claude', category: 'Layout', action: () => { splitPanelInTab(project.id, activeTab.id, focusedPanelId, 'horizontal', 'claude'); close() } },
        { id: 'split-down-claude', label: 'Split Down: Claude', category: 'Layout', action: () => { splitPanelInTab(project.id, activeTab.id, focusedPanelId, 'vertical', 'claude'); close() } },
        { id: 'close-panel', label: 'Close Panel', category: 'Layout', action: () => { removePanelInTab(project.id, activeTab.id, focusedPanelId); close() } }
      )
    }

    if (project) {
      cmds.push(
        { id: 'new-terminal-tab', label: 'New Terminal Tab', category: 'Tab', shortcut: 'Ctrl+Shift+T', action: () => { addTab(project.id, 'terminal'); close() } },
        { id: 'new-browser-tab', label: 'New Browser Tab', category: 'Tab', shortcut: 'Ctrl+Shift+B', action: () => { addTab(project.id, 'browser'); close() } },
        { id: 'new-claude-tab', label: 'New Claude Tab', category: 'Tab', shortcut: 'Ctrl+Shift+A', action: () => { addTab(project.id, 'claude'); close() } }
      )
      if (activeTab) {
        cmds.push(
          { id: 'duplicate-tab', label: 'Duplicate Tab', category: 'Tab', action: () => { duplicateTab(project.id, activeTab.id); close() } },
          { id: 'close-tab', label: 'Close Tab', category: 'Tab', shortcut: 'Ctrl+W', action: () => { closeTab(project.id, activeTab.id); close() } }
        )
      }
    }

    if (project) {
      cmds.push({ id: 'new-thread', label: 'New Thread', category: 'Thread', action: () => { addThread(project.id); close() } })
      if (activeThread) {
        cmds.push(
          { id: 'duplicate-thread', label: 'Duplicate Thread', category: 'Thread', action: () => { duplicateThread(project.id, activeThread.id); close() } },
          { id: 'delete-thread', label: 'Delete Thread', category: 'Thread', action: () => { deleteThread(project.id, activeThread.id); close() } }
        )
      }
    }

    cmds.push({ id: 'new-project', label: 'New Project', category: 'Project', shortcut: 'Ctrl+T', action: () => { createProject(); close() } })
    if (project) {
      cmds.push(
        { id: 'project-settings', label: 'Project Settings...', category: 'Project', action: () => { close(); openProjectSettings(project.id) } },
        { id: 'duplicate-project', label: 'Duplicate Project', category: 'Project', action: () => { duplicateProject(project.id); close() } },
        { id: 'delete-project', label: 'Delete Project', category: 'Project', action: () => { deleteProject(project.id); close() } }
      )
    }

    return cmds
  }, [
    project, activeThread, activeTab, focusedPanelId, close, openProjectSettings,
    createProject, deleteProject, duplicateProject,
    addThread, deleteThread, duplicateThread,
    addTab, closeTab, duplicateTab,
    splitPanelInTab, removePanelInTab
  ])

  const filtered = useMemo(() => {
    if (!query) return commands
    const lower = query.toLowerCase()
    return commands.filter(
      (c) => c.label.toLowerCase().includes(lower) || c.category.toLowerCase().includes(lower)
    )
  }, [commands, query])

  useEffect(() => { setSelectedIndex(0) }, [query])

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIndex] as HTMLElement
    if (item) item.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const execute = useCallback(
    (index: number) => { filtered[index]?.action() },
    [filtered]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)) }
      else if (e.key === 'Enter') { e.preventDefault(); execute(selectedIndex) }
      else if (e.key === 'Escape') { close() }
    },
    [filtered.length, selectedIndex, execute, close]
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-center pt-20 bg-black/60 backdrop-blur-sm" onClick={close}>
      <div
        className="h-fit w-full max-w-[560px] overflow-hidden rounded-2xl border border-white/[0.04] bg-surface shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-muted">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="min-w-0 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-text-dim"
            spellCheck={false}
          />
        </div>
        <div className="mx-3 border-t border-white/[0.06]" />
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-[12.5px] text-text-muted">No matching commands</div>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => execute(i)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[12.5px] transition-all duration-150 ${
                i === selectedIndex ? 'bg-accent/[0.08] text-text' : 'text-text-secondary hover:text-text-secondary'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 rounded-md bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-dim">{cmd.category}</span>
                <span className="truncate font-medium">{cmd.label}</span>
              </div>
              {cmd.shortcut && (
                <div className="ml-3 flex shrink-0 items-center gap-1">
                  {cmd.shortcut.split('+').map((key) => (
                    <kbd key={key} className="rounded-md border border-border bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-medium text-text-dim shadow-[0_1px_0_0_rgba(0,0,0,0.4)]">
                      {key}
                    </kbd>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
