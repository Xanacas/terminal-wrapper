import { useState, useCallback, useRef, useEffect } from 'react'
import { useAppStore } from '~/stores/app-store'
import type { QuickCommand } from '~/stores/app-store'
import { useUIStore } from '~/stores/ui-store'
import { useQuickCommandStore } from '~/stores/quick-command-store'
import { generateId, createLeafPanel } from '~/lib/panel-utils'
import type { LeafPanel } from '~/lib/panel-utils'

const COMMAND_ICONS: Record<string, React.ReactNode> = {
  play: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M6 4l14 8-14 8V4z" fill="currentColor" />
    </svg>
  ),
  build: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  test: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M9 11l3 3 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  deploy: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l10 6.5v7L12 22 2 15.5v-7L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 22v-7.5M12 14.5L2 8.5M12 14.5l10-6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  script: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M4 8l6 5-6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
}

interface CommandsViewProps {
  projectId: string
  cwd: string
  defaultShellId: string
  onSplitInCommandsTab: (newPanel: LeafPanel) => void
  onAddTab: (name: string, panel: LeafPanel) => void
}

export function CommandsView({
  projectId,
  cwd,
  defaultShellId,
  onSplitInCommandsTab,
  onAddTab,
}: CommandsViewProps) {
  const project = useAppStore((s) => s.projects.find((p) => p.id === projectId))
  const globalCommands = useAppStore((s) => s.quickCommands ?? [])
  const projectCommands = project?.quickCommands ?? []
  const openCommandEditor = useUIStore((s) => s.openCommandEditor)
  const openPopover = useQuickCommandStore((s) => s.openPopover)

  const [commitMessage, setCommitMessage] = useState('')
  const [commitMode, setCommitMode] = useState<'commit' | 'commit-push' | null>(null)
  const commitInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (commitMode) commitInputRef.current?.focus()
  }, [commitMode])

  const executeCommand = useCallback(
    (cmd: QuickCommand) => {
      const cmdCwd = cmd.cwdOverride || cwd
      const cmdShell = cmd.shellIdOverride || defaultShellId

      if (cmd.executionMode === 'popover') {
        openPopover({
          id: generateId(),
          commandId: cmd.id,
          commandStr: cmd.command,
          cwd: cmdCwd,
          shellId: cmdShell,
          autoDismiss: cmd.autoDismiss ?? false,
        })
      } else if (cmd.executionMode === 'panel') {
        const panel = createLeafPanel('terminal', {
          shellId: cmdShell,
          initialCommand: cmd.command,
        })
        onSplitInCommandsTab(panel)
      } else if (cmd.executionMode === 'tab') {
        const panel = createLeafPanel('terminal', {
          shellId: cmdShell,
          initialCommand: cmd.command,
        })
        onAddTab(cmd.name, panel)
      }
    },
    [cwd, defaultShellId, openPopover, onSplitInCommandsTab, onAddTab]
  )

  const handleGitCommit = useCallback(
    (push: boolean) => {
      if (!commitMessage.trim()) return
      const escapedMsg = commitMessage.replace(/"/g, '\\"')
      const cmd = push
        ? `git add -A && git commit -m "${escapedMsg}" && git push`
        : `git add -A && git commit -m "${escapedMsg}"`

      openPopover({
        id: generateId(),
        commandId: push ? '__git-commit-push' : '__git-commit',
        commandStr: cmd,
        cwd,
        shellId: defaultShellId,
        autoDismiss: true,
      })

      setCommitMessage('')
      setCommitMode(null)
    },
    [commitMessage, cwd, defaultShellId, openPopover]
  )

  const allCommands = [
    ...globalCommands.map((c) => ({ ...c, scope: 'global' as const })),
    ...projectCommands.map((c) => ({ ...c, scope: 'project' as const })),
  ]

  return (
    <div className="flex h-full flex-col overflow-auto bg-bg p-4">
      {/* Git Section */}
      <div className="mb-6">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
          Git
        </h3>
        <div className="flex flex-col gap-2">
          {commitMode ? (
            <div className="flex items-center gap-2">
              <input
                ref={commitInputRef}
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commitMessage.trim()) {
                    handleGitCommit(commitMode === 'commit-push')
                  }
                  if (e.key === 'Escape') {
                    setCommitMode(null)
                    setCommitMessage('')
                  }
                }}
                placeholder="Commit message..."
                className="flex-1 rounded-md border border-border-bright/60 bg-bg-secondary px-3 py-2 text-[12px] text-text placeholder:text-text-dim/50 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30"
              />
              <button
                onClick={() => handleGitCommit(commitMode === 'commit-push')}
                disabled={!commitMessage.trim()}
                className="shrink-0 rounded-md bg-accent/90 px-3 py-2 text-[12px] font-medium text-white transition-all hover:bg-accent disabled:opacity-40 disabled:hover:bg-accent/90"
              >
                {commitMode === 'commit-push' ? 'Commit & Push' : 'Commit'}
              </button>
              <button
                onClick={() => { setCommitMode(null); setCommitMessage('') }}
                className="shrink-0 rounded-md px-2 py-2 text-[12px] text-text-muted transition-all hover:bg-bg-hover hover:text-text-secondary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setCommitMode('commit')}
                className="flex items-center gap-2 rounded-md border border-border-bright/60 bg-bg-secondary px-3 py-2 text-[12px] text-text-secondary transition-all hover:border-accent/40 hover:bg-bg-hover hover:text-text"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 2v6M12 16v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Git Commit
              </button>
              <button
                onClick={() => setCommitMode('commit-push')}
                className="flex items-center gap-2 rounded-md border border-border-bright/60 bg-bg-secondary px-3 py-2 text-[12px] text-text-secondary transition-all hover:border-accent/40 hover:bg-bg-hover hover:text-text"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 2v6M12 16v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M17 7l2-2 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19 17V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Commit & Push
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Commands Section */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
          Quick Commands
        </h3>
        <button
          onClick={() => openCommandEditor(projectId)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-text-muted transition-all hover:bg-bg-hover hover:text-text-secondary"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1.5v7M1.5 5h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Edit Commands
        </button>
      </div>

      {allCommands.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-text-dim/40">
            <path d="M4 8l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-[12px] text-text-dim">
            No commands yet. Add commands to run them quickly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
          {allCommands.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => executeCommand(cmd)}
              className="group flex items-center gap-3 rounded-lg border border-border-bright/40 bg-bg-secondary/80 px-3 py-2.5 text-left transition-all hover:border-accent/40 hover:bg-bg-hover"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-bg-tertiary text-text-dim transition-colors group-hover:bg-accent/15 group-hover:text-accent">
                {COMMAND_ICONS[cmd.icon ?? 'script']}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-text-secondary group-hover:text-text">
                  {cmd.name}
                </div>
                <div className="truncate text-[10px] text-text-dim">
                  {cmd.command}
                </div>
              </div>
              <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-dim/60">
                {cmd.scope === 'global' ? 'G' : 'P'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
