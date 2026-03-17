import { useState, useRef, useEffect, useCallback } from 'react'
import type { Project } from '~/stores/app-store'
import { ThreadItem } from './thread-item'

interface ProjectItemProps {
  project: Project
  isActiveProject: boolean
  isOverviewOpen: boolean
  onSelectProject: () => void
  onDeleteProject: () => void
  onRenameProject: (name: string) => void
  onDuplicateProject: () => void
  onOpenSettings: () => void
  onOpenOverview: () => void
  onAddThread: () => void
  onSelectThread: (threadId: string) => void
  onDeleteThread: (threadId: string) => void
  onRenameThread: (threadId: string, name: string) => void
  onDuplicateThread: (threadId: string) => void
}

export function ProjectItem({
  project,
  isActiveProject,
  isOverviewOpen,
  onSelectProject,
  onDeleteProject,
  onRenameProject,
  onDuplicateProject,
  onOpenOverview,
  onAddThread,
  onSelectThread,
  onDeleteThread,
  onRenameThread,
  onDuplicateThread,
  onOpenSettings
}: ProjectItemProps) {
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
    if (value && value !== project.name) onRenameProject(value)
    setEditing(false)
  }, [project.name, onRenameProject])

  const handleClick = useCallback(() => {
    if (!isActiveProject) onSelectProject()
    onOpenOverview()
  }, [isActiveProject, onSelectProject, onOpenOverview])

  return (
    <div className="mb-px">
      {/* Project header row */}
      <div
        onClick={handleClick}
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }) }}
        className={`group relative flex w-full cursor-pointer items-center gap-1.5 rounded-[6px] px-2 py-[5px] text-left transition-all duration-150 ${
          isActiveProject ? 'text-text' : 'text-text-secondary hover:text-text'
        }`}
        style={isActiveProject ? {
          background: 'linear-gradient(to right, var(--color-accent-subtle), transparent)',
        } : undefined}
        onMouseEnter={(e) => { if (!isActiveProject) e.currentTarget.style.background = 'linear-gradient(to right, var(--color-bg-hover), transparent)' }}
        onMouseLeave={(e) => { if (!isActiveProject) e.currentTarget.style.background = 'transparent' }}
      >
        {/* Active accent bar — full accent on overview, very subtle on thread */}
        {isActiveProject && (
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full transition-all duration-150 ${isOverviewOpen ? 'h-[14px] w-[2px] bg-accent' : 'h-[10px] w-[2px] bg-accent/25'}`} />
        )}

        {/* Folder icon */}
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-dim">
          <path d="M2 5v7a1.5 1.5 0 001.5 1.5h9A1.5 1.5 0 0014 12V6.5A1.5 1.5 0 0012.5 5H8.5L7 3.5H3.5A1.5 1.5 0 002 5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        </svg>

        {editing ? (
          <input
            ref={inputRef}
            defaultValue={project.name}
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
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium" style={{ letterSpacing: '-0.01em' }}>{project.name}</span>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onAddThread() }}
          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] text-text-dim opacity-0 transition-all duration-150 hover:bg-bg-active hover:text-text-secondary group-hover:opacity-100"
          title="New thread"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M4.5 1.5v6M1.5 4.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="glass fixed z-50 min-w-[170px] overflow-hidden rounded-[10px] p-1"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
            border: '1px solid var(--color-border)',
          }}
        >
          {[
            { label: 'Settings...', action: () => onOpenSettings() },
            { label: 'Rename', action: () => setEditing(true) },
            { label: 'New Thread', action: () => onAddThread() },
            { label: 'Duplicate', action: () => onDuplicateProject() }
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { setContextMenu(null); item.action() }}
              className="flex w-full items-center rounded-[6px] px-3 py-[6px] text-[12px] text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:text-text"
            >
              {item.label}
            </button>
          ))}
          <div className="mx-2 my-1 border-t border-border" />
          <button
            onClick={() => { setContextMenu(null); onDeleteProject() }}
            className="flex w-full items-center rounded-[6px] px-3 py-[6px] text-[12px] text-danger transition-all duration-150 hover:bg-danger/10"
          >
            Delete
          </button>
        </div>
      )}

      {/* Threads — always visible */}
      {project.threads.length > 0 && (
        <div className="relative ml-[14px] mt-[2px] pl-[16px]">
          {/* Tree line */}
          <div className="absolute bottom-1 left-[5px] top-0 w-px" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, var(--color-border) 0px, var(--color-border) 2px, transparent 2px, transparent 5px)' }} />
          {project.threads.map((thread) => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              isActive={isActiveProject && !isOverviewOpen && thread.id === project.activeThreadId}
              onSelect={() => onSelectThread(thread.id)}
              onDelete={() => onDeleteThread(thread.id)}
              onRename={(name) => onRenameThread(thread.id, name)}
              onDuplicate={() => onDuplicateThread(thread.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
