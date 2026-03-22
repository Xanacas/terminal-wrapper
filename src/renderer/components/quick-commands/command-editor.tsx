import { useState, useEffect, useRef, useCallback } from 'react'
import { useUIStore } from '~/stores/ui-store'
import { useAppStore } from '~/stores/app-store'
import type { QuickCommand } from '~/stores/app-store'
import { useProjects } from '~/hooks/use-projects'
import { generateId } from '~/lib/panel-utils'

const ICON_OPTIONS: Array<{ value: QuickCommand['icon']; label: string }> = [
  { value: 'play', label: 'Play' },
  { value: 'build', label: 'Build' },
  { value: 'test', label: 'Test' },
  { value: 'deploy', label: 'Deploy' },
  { value: 'script', label: 'Script' },
]

const MODE_OPTIONS: Array<{ value: QuickCommand['executionMode']; label: string; desc: string }> = [
  { value: 'popover', label: 'Popover', desc: 'Floating overlay' },
  { value: 'panel', label: 'Panel', desc: 'Split in commands tab' },
  { value: 'tab', label: 'Tab', desc: 'New tab in thread' },
]

export function CommandEditor() {
  const open = useUIStore((s) => s.commandEditorOpen)
  const editorProjectId = useUIStore((s) => s.commandEditorProjectId)
  const editCommandId = useUIStore((s) => s.commandEditorCommandId)
  const closeEditor = useUIStore((s) => s.closeCommandEditor)
  const project = useAppStore((s) =>
    editorProjectId ? s.projects.find((p) => p.id === editorProjectId) : undefined
  )
  const globalCommands = useAppStore((s) => s.quickCommands ?? [])
  const { addQuickCommand, updateQuickCommand, deleteQuickCommand } = useProjects()

  const [scope, setScope] = useState<'global' | 'project'>('project')
  const [editingCommand, setEditingCommand] = useState<QuickCommand | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const projectCommands = project?.quickCommands ?? []
  const commands = scope === 'global' ? globalCommands : projectCommands
  const scopeProjectId = scope === 'global' ? null : editorProjectId

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setEditingCommand(null)
      if (editCommandId) {
        const found =
          projectCommands.find((c) => c.id === editCommandId) ??
          globalCommands.find((c) => c.id === editCommandId)
        if (found) {
          setEditingCommand(found)
          setScope(projectCommands.some((c) => c.id === editCommandId) ? 'project' : 'global')
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editCommandId])

  const handleSave = useCallback(
    async (cmd: QuickCommand) => {
      const existing = commands.find((c) => c.id === cmd.id)
      if (existing) {
        await updateQuickCommand(scopeProjectId, cmd.id, cmd)
      } else {
        await addQuickCommand(scopeProjectId, cmd)
      }
      setEditingCommand(null)
    },
    [commands, scopeProjectId, addQuickCommand, updateQuickCommand]
  )

  const handleDelete = useCallback(
    async (commandId: string) => {
      await deleteQuickCommand(scopeProjectId, commandId)
      setEditingCommand(null)
    },
    [scopeProjectId, deleteQuickCommand]
  )

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) closeEditor() }}
    >
      <div className="flex h-[520px] w-[560px] flex-col overflow-hidden rounded-xl border border-border-bright/60 bg-surface shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <span className="text-[13px] font-medium text-text">Quick Commands</span>
          <button
            onClick={closeEditor}
            className="flex h-5 w-5 items-center justify-center rounded text-text-dim hover:bg-bg-hover hover:text-text-secondary"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scope tabs */}
        {editorProjectId && (
          <div className="flex border-b border-border/60">
            <button
              onClick={() => { setScope('project'); setEditingCommand(null) }}
              className={`flex-1 px-4 py-2 text-[12px] transition-all ${
                scope === 'project'
                  ? 'border-b-2 border-accent text-text'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Project
            </button>
            <button
              onClick={() => { setScope('global'); setEditingCommand(null) }}
              className={`flex-1 px-4 py-2 text-[12px] transition-all ${
                scope === 'global'
                  ? 'border-b-2 border-accent text-text'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Global
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {editingCommand ? (
            <CommandForm
              command={editingCommand}
              onSave={handleSave}
              onDelete={handleDelete}
              onCancel={() => setEditingCommand(null)}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {commands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => setEditingCommand(cmd)}
                  className="flex items-center justify-between rounded-lg border border-border-bright/40 bg-bg-secondary/80 px-3 py-2.5 text-left transition-all hover:border-accent/40 hover:bg-bg-hover"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-text-secondary">
                      {cmd.name}
                    </div>
                    <div className="truncate text-[10px] text-text-dim">{cmd.command}</div>
                  </div>
                  <span className="shrink-0 rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] text-text-dim">
                    {cmd.executionMode}
                  </span>
                </button>
              ))}
              <button
                onClick={() =>
                  setEditingCommand({
                    id: generateId(),
                    name: '',
                    command: '',
                    icon: 'script',
                    executionMode: 'popover',
                  })
                }
                className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-bright/40 py-3 text-[12px] text-text-muted transition-all hover:border-accent/40 hover:text-text-secondary"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1.5v7M1.5 5h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                New Command
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CommandForm({
  command,
  onSave,
  onDelete,
  onCancel,
}: {
  command: QuickCommand
  onSave: (cmd: QuickCommand) => void
  onDelete: (id: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(command.name)
  const [cmd, setCmd] = useState(command.command)
  const [icon, setIcon] = useState(command.icon ?? 'script')
  const [mode, setMode] = useState(command.executionMode)
  const [autoDismiss, setAutoDismiss] = useState(command.autoDismiss ?? false)
  const [cwdOverride, setCwdOverride] = useState(command.cwdOverride ?? '')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const isNew = !command.name

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onCancel}
        className="flex items-center gap-1 self-start text-[11px] text-text-dim transition-all hover:text-text-secondary"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M5.5 1.5L2 4l3.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-text-dim">Name</label>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Run Dev Server"
          className="rounded-md border border-border-bright/60 bg-bg-secondary px-3 py-2 text-[12px] text-text placeholder:text-text-dim/50 outline-none focus:border-accent/60"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-text-dim">Command</label>
        <input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          placeholder="npm run dev"
          className="rounded-md border border-border-bright/60 bg-bg-secondary px-3 py-2 text-[12px] font-mono text-text placeholder:text-text-dim/50 outline-none focus:border-accent/60"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-[11px] font-medium text-text-dim">Icon</label>
          <select
            value={icon}
            onChange={(e) => setIcon(e.target.value as QuickCommand['icon'])}
            className="rounded-md border border-border-bright/60 bg-bg-secondary px-3 py-2 text-[12px] text-text outline-none focus:border-accent/60"
          >
            {ICON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-[11px] font-medium text-text-dim">Execution Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as QuickCommand['executionMode'])}
            className="rounded-md border border-border-bright/60 bg-bg-secondary px-3 py-2 text-[12px] text-text outline-none focus:border-accent/60"
          >
            {MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label} - {o.desc}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-text-dim">Working Directory Override (optional)</label>
        <input
          value={cwdOverride}
          onChange={(e) => setCwdOverride(e.target.value)}
          placeholder="Leave empty to use project default"
          className="rounded-md border border-border-bright/60 bg-bg-secondary px-3 py-2 text-[12px] text-text placeholder:text-text-dim/50 outline-none focus:border-accent/60"
        />
      </div>

      {mode === 'popover' && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoDismiss}
            onChange={(e) => setAutoDismiss(e.target.checked)}
            className="rounded border-border-bright/60"
          />
          <span className="text-[12px] text-text-secondary">Auto-dismiss on success (exit code 0)</span>
        </label>
      )}

      <div className="flex items-center justify-between pt-2">
        {!isNew ? (
          <button
            onClick={() => onDelete(command.id)}
            className="rounded-md px-3 py-1.5 text-[12px] text-red-400 transition-all hover:bg-red-500/10"
          >
            Delete
          </button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-[12px] text-text-muted transition-all hover:bg-bg-hover hover:text-text-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!name.trim() || !cmd.trim()) return
              onSave({
                ...command,
                name: name.trim(),
                command: cmd.trim(),
                icon,
                executionMode: mode,
                autoDismiss: mode === 'popover' ? autoDismiss : undefined,
                cwdOverride: cwdOverride.trim() || undefined,
              })
            }}
            disabled={!name.trim() || !cmd.trim()}
            className="rounded-md bg-accent/90 px-4 py-1.5 text-[12px] font-medium text-white transition-all hover:bg-accent disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
