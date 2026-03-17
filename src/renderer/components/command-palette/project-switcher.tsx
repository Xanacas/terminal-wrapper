import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useUIStore } from '~/stores/ui-store'
import { useAppStore } from '~/stores/app-store'
import { useProjects } from '~/hooks/use-projects'

interface SwitchItem {
  key: string
  projectId: string
  threadId?: string
  label: string
  sublabel?: string
  kind: 'project' | 'thread'
}

export function ProjectSwitcher() {
  const open = useUIStore((s) => s.projectSwitcherOpen)
  const close = useUIStore((s) => s.closeProjectSwitcher)
  const threadFocusOrder = useUIStore((s) => s.threadFocusOrder)
  const projects = useAppStore((s) => s.projects)
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const { switchProject, switchThread } = useProjects()

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

  const items = useMemo((): SwitchItem[] => {
    const list: SwitchItem[] = []
    for (const project of projects) {
      list.push({
        key: `p-${project.id}`,
        projectId: project.id,
        label: project.name,
        sublabel: project.defaultCwd,
        kind: 'project'
      })
      const sortedThreads = project.threads.slice().sort((a, b) => {
        const ai = threadFocusOrder.indexOf(`${project.id}:${a.id}`)
        const bi = threadFocusOrder.indexOf(`${project.id}:${b.id}`)
        return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi)
      })
      for (const thread of sortedThreads) {
        list.push({
          key: `t-${project.id}-${thread.id}`,
          projectId: project.id,
          threadId: thread.id,
          label: thread.name,
          sublabel: project.name,
          kind: 'thread'
        })
      }
    }
    return list
  }, [projects, threadFocusOrder])

  const filtered = useMemo(() => {
    if (!query) return items
    const lower = query.toLowerCase()
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        (item.sublabel?.toLowerCase().includes(lower) ?? false)
    )
  }, [items, query])

  useEffect(() => { setSelectedIndex(0) }, [query])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIndex] as HTMLElement
    if (item) item.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const execute = useCallback(
    (index: number) => {
      const item = filtered[index]
      if (!item) return
      if (item.threadId) {
        switchThread(item.projectId, item.threadId)
      } else {
        switchProject(item.projectId)
      }
      close()
    },
    [filtered, switchProject, switchThread, close]
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
            placeholder="Switch to project or thread..."
            className="min-w-0 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-text-dim"
            spellCheck={false}
          />
        </div>
        <div className="mx-3 border-t border-white/[0.06]" />
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-[12.5px] text-text-muted">No matches</div>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.key}
              onClick={() => execute(i)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12.5px] transition-all duration-150 ${
                i === selectedIndex ? 'bg-accent/[0.08] text-text' : 'text-text-secondary hover:text-text-secondary'
              }`}
            >
              {item.kind === 'project' ? (
                <svg width="15" height="15" viewBox="0 0 14 14" fill="none" className={`shrink-0 transition-all duration-150 ${item.projectId === activeProjectId ? 'text-accent' : 'text-text-dim'}`}>
                  <path
                    d="M1.5 4V11C1.5 11.5523 1.94772 12 2.5 12H11.5C12.0523 12 12.5 11.5523 12.5 11V5.5C12.5 4.94772 12.0523 4.5 11.5 4.5H7L5.5 2.5H2.5C1.94772 2.5 1.5 2.94772 1.5 3.5V4Z"
                    stroke="currentColor"
                    strokeWidth="1.1"
                  />
                </svg>
              ) : (
                <div className="ml-2 w-[15px] shrink-0 flex justify-center">
                  <div className="h-3 w-px bg-border-bright" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate font-medium">{item.label}</span>
                  {item.projectId === activeProjectId && item.kind === 'project' && (
                    <span className="shrink-0 rounded-md bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">active</span>
                  )}
                </div>
                {item.sublabel && (
                  <div className="truncate text-[10px] text-text-dim mt-0.5">{item.sublabel}</div>
                )}
              </div>
              <span className="shrink-0 rounded-md bg-bg-tertiary px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-text-dim">{item.kind}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
