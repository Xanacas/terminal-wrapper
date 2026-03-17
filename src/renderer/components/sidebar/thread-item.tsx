import { useState, useRef, useEffect, useCallback } from 'react'
import type { Thread } from '~/stores/app-store'

interface ThreadItemProps {
  thread: Thread
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (name: string) => void
  onDuplicate: () => void
}

export function ThreadItem({
  thread,
  isActive,
  onSelect,
  onDelete,
  onRename,
  onDuplicate
}: ThreadItemProps) {
  const [editing, setEditing] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [contextMenu])

  const handleRenameSubmit = useCallback(() => {
    const value = inputRef.current?.value.trim()
    if (value && value !== thread.name) onRename(value)
    setEditing(false)
  }, [thread.name, onRename])

  return (
    <>
      <button
        onClick={onSelect}
        onDoubleClick={() => setEditing(true)}
        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }) }}
        className={`relative flex w-full items-center rounded-[6px] px-2 py-[4px] text-left text-[12px] transition-all duration-150 ${
          isActive
            ? 'text-accent'
            : 'text-text-muted hover:bg-bg-hover/50 hover:text-text-secondary'
        }`}
      >
        {/* Active vertical bar indicator */}
        {isActive && (
          <div className="absolute -left-[13px] top-1/2 h-[10px] w-[1.5px] -translate-y-1/2 rounded-full bg-accent" />
        )}

        {editing ? (
          <input
            ref={inputRef}
            defaultValue={thread.name}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="min-w-0 flex-1 rounded-[6px] bg-bg-tertiary px-1.5 py-[1px] text-[12px] text-text outline-none ring-1 ring-accent/50"
            style={{ boxShadow: '0 0 0 3px var(--color-accent-glow)' }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">{thread.name}</span>
        )}
        {!editing && thread.tabs.length > 1 && (
          <span className="ml-2 shrink-0 rounded-full bg-bg-tertiary px-[5px] py-px text-[10px] tabular-nums text-text-dim">
            {thread.tabs.length}
          </span>
        )}
      </button>

      {contextMenu && (
        <div
          className="glass fixed z-50 min-w-[150px] overflow-hidden rounded-[10px] p-1"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
            border: '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={() => { setContextMenu(null); setEditing(true) }}
            className="flex w-full items-center rounded-[6px] px-3 py-[6px] text-[12px] text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:text-text"
          >
            Rename
          </button>
          <button
            onClick={() => { setContextMenu(null); onDuplicate() }}
            className="flex w-full items-center rounded-[6px] px-3 py-[6px] text-[12px] text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:text-text"
          >
            Duplicate
          </button>
          <div className="mx-2 my-1 border-t border-border" />
          <button
            onClick={() => { setContextMenu(null); onDelete() }}
            className="flex w-full items-center rounded-[6px] px-3 py-[6px] text-[12px] text-danger transition-all duration-150 hover:bg-danger/10"
          >
            Delete
          </button>
        </div>
      )}
    </>
  )
}
