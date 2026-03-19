import { useState, useRef, useEffect, useCallback } from 'react'
import type { Tab, PanelType } from '~/lib/panel-utils'
import { collectLeafPanels } from '~/lib/panel-utils'
import { useClaudeStore, getHighestPriorityStatus } from '~/stores/claude-store'
import type { ClaudeStatus } from '~/stores/claude-store'
import { ClaudeStatusBadge } from '~/components/claude/claude-status-badge'

type Placement = 'new-tab' | 'split-right' | 'split-down'

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string
  onSwitch: (tabId: string) => void
  onClose: (tabId: string) => void
  onRename: (tabId: string, name: string) => void
  onAdd: (type: PanelType, placement: Placement) => void
}

const PANEL_TYPES: Array<{ type: PanelType; label: string; icon: React.ReactNode }> = [
  {
    type: 'terminal',
    label: 'Terminal',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-text-dim">
        <path d="M4 8l6 5-6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    type: 'browser',
    label: 'Browser',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-text-dim">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M3 12h18M12 3c-2 2.5-3 5.5-3 9s1 6.5 3 9c2-2.5 3-5.5 3-9s-1-6.5-3-9z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    type: 'claude',
    label: 'Claude',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-text-dim">
        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    type: 'todo',
    label: 'Todo',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-text-dim">
        <path d="M9 11l3 3 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

const PLACEMENTS: Array<{ placement: Placement; label: string; icon: React.ReactNode }> = [
  {
    placement: 'new-tab',
    label: 'New Tab',
    icon: (
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path d="M5.5 1.5v8M1.5 5.5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    placement: 'split-right',
    label: 'Split Right',
    icon: (
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <rect x="1" y="1" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
        <path d="M5.5 2v7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M7 5.5l1.5 1.5L7 8.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    placement: 'split-down',
    label: 'Split Down',
    icon: (
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <rect x="1" y="1" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
        <path d="M2 5.5h7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M5.5 7l1.5 1.5L3.5 8.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

function TabItemStatus({ tab }: { tab: Tab }) {
  const panels = useClaudeStore((s) => s.panels)
  const leaves = collectLeafPanels(tab.panel)
  const claudeLeaves = leaves.filter((l) => l.panelType === 'claude')
  if (claudeLeaves.length === 0) return null
  const statuses = claudeLeaves.map((l) => panels.get(l.id)?.status ?? 'idle' as ClaudeStatus)
  const status = getHighestPriorityStatus(statuses)
  if (!status) return null
  return <ClaudeStatusBadge status={status} compact />
}

export function TabBar({ tabs, activeTabId, onSwitch, onClose, onRename, onAdd }: TabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<PanelType | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editingId) inputRef.current?.focus()
  }, [editingId])

  const handleRenameSubmit = useCallback(
    (tabId: string) => {
      const value = inputRef.current?.value.trim()
      if (value) onRename(tabId, value)
      setEditingId(null)
    },
    [onRename]
  )

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    setSelectedType(null)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [menuOpen, closeMenu])

  const handleTypeClick = useCallback((type: PanelType) => {
    setSelectedType(type)
  }, [])

  const handlePlacementClick = useCallback(
    (placement: Placement) => {
      if (!selectedType) return
      onAdd(selectedType, placement)
      closeMenu()
    },
    [selectedType, onAdd, closeMenu]
  )

  return (
    <div className="flex h-[36px] shrink-0 items-end bg-bg-secondary">
      <div className="flex flex-1 items-stretch overflow-x-auto">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId
          const nextIsActive = index < tabs.length - 1 && tabs[index + 1]?.id === activeTabId
          return (
            <div
              key={tab.id}
              className={`group relative flex items-center transition-all duration-150 ${
                isActive
                  ? 'z-10 rounded-t-lg bg-bg text-text'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {isActive && (
                <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-lg bg-accent" />
              )}
              {!isActive && !nextIsActive && index < tabs.length - 1 && (
                <div className="absolute right-0 top-[10px] bottom-[10px] w-px bg-border/60" />
              )}
              <button
                onClick={() => onSwitch(tab.id)}
                onDoubleClick={() => setEditingId(tab.id)}
                className="flex h-full items-center px-4 text-[12px] transition-all duration-150"
              >
                {editingId === tab.id ? (
                  <input
                    ref={inputRef}
                    defaultValue={tab.name}
                    onBlur={() => handleRenameSubmit(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit(tab.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-[80px] rounded-[3px] bg-bg-tertiary px-1.5 text-[12px] text-text outline-none ring-1 ring-accent"
                  />
                ) : (
                  <>
                    <span className="max-w-[150px] truncate">{tab.name}</span>
                    <TabItemStatus tab={tab} />
                  </>
                )}
              </button>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
                  className="mr-2 flex h-[18px] w-[18px] items-center justify-center rounded text-text-dim opacity-0 transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary group-hover:opacity-100"
                  title="Close tab"
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Add button */}
      <div className="relative flex shrink-0 items-center self-stretch border-l border-border/60 px-2">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); setSelectedType(null) }}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-md text-text-dim transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary"
          title="Add panel"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1.5v8M1.5 5.5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full z-40 mt-1.5 overflow-hidden rounded-lg border border-border-bright/60 bg-surface/95 shadow-xl shadow-black/40 backdrop-blur-xl"
          >
            {!selectedType ? (
              /* Step 1: choose type */
              <div className="min-w-[150px] p-1">
                <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                  Panel Type
                </div>
                {PANEL_TYPES.map(({ type, label, icon }) => (
                  <button
                    key={type}
                    onClick={() => handleTypeClick(type)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-[6px] text-[12px] text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:text-text"
                  >
                    <span className="flex items-center gap-2">
                      {icon}
                      {label}
                    </span>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-text-dim">
                      <path d="M2 1.5l3.5 2.5L2 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </div>
            ) : (
              /* Step 2: choose placement */
              <div className="min-w-[150px] p-1">
                <button
                  onClick={() => setSelectedType(null)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-[5px] text-[11px] text-text-dim transition-all hover:text-text-secondary"
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M5.5 1.5L2 4l3.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {PANEL_TYPES.find((p) => p.type === selectedType)?.label}
                </button>
                <div className="mx-2 my-1 border-t border-border/60" />
                <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                  Placement
                </div>
                {PLACEMENTS.map(({ placement, label, icon }) => (
                  <button
                    key={placement}
                    onClick={() => handlePlacementClick(placement)}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-[6px] text-[12px] text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:text-text"
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
