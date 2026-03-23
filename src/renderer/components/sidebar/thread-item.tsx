import { useState, useRef, useEffect, useCallback } from 'react'
import type { Thread } from '~/stores/app-store'
import { collectLeafPanels } from '~/lib/panel-utils'
import { useClaudeStore, getHighestPriorityStatus, STATUS_CONFIG } from '~/stores/claude-store'
import type { ClaudeStatus } from '~/stores/claude-store'
import { useDevContainerStore } from '~/stores/devcontainer-store'
import type { ContainerStatus } from '~/stores/devcontainer-store'
import { ContainerStatusBadge } from '~/components/devcontainer/container-status-badge'
import { api } from '~/lib/ipc'

function ThreadContainerBadge({ containerName }: { containerName: string }) {
  const status = useDevContainerStore((s) => s.containers.get(containerName)?.status)
  if (!status) return null
  return <ContainerStatusBadge status={status} compact />
}

interface ThreadItemProps {
  thread: Thread
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (name: string) => void
  onDuplicate: () => void
}

function ThreadStatusDot({ thread }: { thread: Thread }) {
  const panels = useClaudeStore((s) => s.panels)
  const claudeIds: string[] = []
  for (const tab of thread.tabs) {
    for (const leaf of collectLeafPanels(tab.panel)) {
      if (leaf.panelType === 'claude') claudeIds.push(leaf.id)
    }
  }
  if (claudeIds.length === 0) return null
  const statuses = claudeIds.map((id) => panels.get(id)?.status ?? 'idle' as ClaudeStatus)
  const status = getHighestPriorityStatus(statuses)
  if (!status) return null
  const config = STATUS_CONFIG[status]
  if (!config) return null
  return (
    <span
      className="ml-auto shrink-0 rounded-full px-[5px] py-px text-[9px] font-medium"
      style={{ color: config.color, background: `color-mix(in srgb, ${config.color} 12%, transparent)` }}
    >
      {config.label}
    </span>
  )
}

function getContainerActions(status: ContainerStatus) {
  const actions: Array<{ label: string; action: 'start' | 'stop' | 'pause' | 'unpause' }> = []
  switch (status) {
    case 'running':
      actions.push({ label: 'Pause Container', action: 'pause' })
      actions.push({ label: 'Stop Container', action: 'stop' })
      break
    case 'paused':
      actions.push({ label: 'Resume Container', action: 'unpause' })
      actions.push({ label: 'Stop Container', action: 'stop' })
      break
    case 'stopped':
    case 'error':
      actions.push({ label: 'Start Container', action: 'start' })
      break
  }
  return actions
}

async function executeContainerAction(containerName: string, action: 'start' | 'stop' | 'pause' | 'unpause') {
  const store = useDevContainerStore.getState()
  switch (action) {
    case 'start': {
      store.setStatus(containerName, 'starting')
      const startResult = await api.startDevContainer(containerName)
      if (startResult.ok) store.setStatus(containerName, 'running')
      else store.setStatus(containerName, 'error', startResult.error)
      break
    }
    case 'stop':
      await api.stopDevContainer(containerName)
      store.setStatus(containerName, 'stopped')
      break
    case 'pause':
      await api.pauseDevContainer(containerName)
      store.setStatus(containerName, 'paused')
      break
    case 'unpause':
      await api.unpauseDevContainer(containerName)
      store.setStatus(containerName, 'running')
      break
  }
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

  const containerStatus = useDevContainerStore((s) =>
    thread.devContainer ? s.containers.get(thread.devContainer.containerName)?.status : undefined
  )

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

  const containerActions = thread.devContainer && containerStatus
    ? getContainerActions(containerStatus)
    : []

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
        {!editing && <ThreadStatusDot thread={thread} />}
        {!editing && thread.devContainer && (
          <ThreadContainerBadge containerName={thread.devContainer.containerName} />
        )}
        {!editing && thread.tabs.length > 1 && (
          <span className="ml-1 shrink-0 rounded-full bg-bg-tertiary px-[5px] py-px text-[10px] tabular-nums text-text-dim">
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
          {containerActions.length > 0 && (
            <>
              {containerActions.map(({ label, action }) => (
                <button
                  key={action}
                  onClick={() => {
                    setContextMenu(null)
                    executeContainerAction(thread.devContainer!.containerName, action)
                  }}
                  className="flex w-full items-center gap-2 rounded-[6px] px-3 py-[6px] text-[12px] text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:text-text"
                >
                  <ContainerActionIcon action={action} />
                  {label}
                </button>
              ))}
              <div className="mx-2 my-1 border-t border-border" />
            </>
          )}
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

function ContainerActionIcon({ action }: { action: 'start' | 'stop' | 'pause' | 'unpause' }) {
  switch (action) {
    case 'start':
    case 'unpause':
      return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M4 2l10 6-10 6V2z" fill="currentColor" />
        </svg>
      )
    case 'pause':
      return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <rect x="3" y="2" width="3.5" height="12" rx="0.75" fill="currentColor" />
          <rect x="9.5" y="2" width="3.5" height="12" rx="0.75" fill="currentColor" />
        </svg>
      )
    case 'stop':
      return (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" fill="currentColor" />
        </svg>
      )
  }
}
