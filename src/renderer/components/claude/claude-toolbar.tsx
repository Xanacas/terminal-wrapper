import { useState, useEffect, useRef } from 'react'
import type { EffortLevel, PermissionMode } from '~/stores/claude-store'

interface ClaudeToolbarProps {
  config: {
    model: string
    permissionMode: PermissionMode
    effort: EffortLevel
    cwd: string
  }
  costUsd: number
  inputTokens: number
  outputTokens: number
  sessionId: string | null
  onModelChange: (model: string) => void
  onPermissionModeChange: (mode: PermissionMode) => void
  onEffortChange: (effort: EffortLevel) => void
  onCwdClick: () => void
  onSettingsClick: () => void
  onHistoryClick: () => void
  onNewSession: () => void
}

const models = [
  { id: 'sonnet', label: 'Sonnet' },
  { id: 'opus', label: 'Opus' },
  { id: 'haiku', label: 'Haiku' },
]

const permissionModes: Array<{ id: PermissionMode; label: string; desc: string }> = [
  { id: 'default', label: 'Default', desc: 'Ask for permissions' },
  { id: 'acceptEdits', label: 'Accept Edits', desc: 'Auto-approve file edits' },
  { id: 'plan', label: 'Plan', desc: 'Read-only mode' },
  { id: 'bypassPermissions', label: 'Bypass', desc: 'Skip all permission prompts' },
]

const effortLevels: Array<{ id: EffortLevel; label: string }> = [
  { id: 'low', label: 'lo' },
  { id: 'medium', label: 'med' },
  { id: 'high', label: 'hi' },
  { id: 'max', label: 'max' },
]

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function truncatePath(p: string) {
  if (!p) return ''
  // Show last 2 segments
  const sep = p.includes('/') ? '/' : '\\'
  const parts = p.split(sep).filter(Boolean)
  if (parts.length <= 2) return p
  return '~/' + parts.slice(-2).join('/')
}

export function ClaudeToolbar({
  config,
  costUsd,
  inputTokens,
  outputTokens,
  sessionId,
  onModelChange,
  onPermissionModeChange,
  onEffortChange,
  onCwdClick,
  onSettingsClick,
  onHistoryClick,
  onNewSession,
}: ClaudeToolbarProps) {
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [permMenuOpen, setPermMenuOpen] = useState(false)
  const modelRef = useRef<HTMLDivElement>(null)
  const permRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!modelMenuOpen && !permMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (modelMenuOpen && modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false)
      }
      if (permMenuOpen && permRef.current && !permRef.current.contains(e.target as Node)) {
        setPermMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [modelMenuOpen, permMenuOpen])

  const currentModel = models.find((m) => m.id === config.model)
  const currentPerm = permissionModes.find((m) => m.id === config.permissionMode)

  return (
    <div className="flex h-[34px] shrink-0 items-center gap-1.5 bg-bg px-2">
      {/* Model selector */}
      <div ref={modelRef} className="relative">
        <button
          onClick={() => { setModelMenuOpen(!modelMenuOpen); setPermMenuOpen(false) }}
          className="flex items-center gap-1.5 rounded-md bg-bg-secondary px-2 py-[3px] text-[11px] font-medium text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:text-text"
        >
          <span>{currentModel?.label ?? config.model}</span>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-text-dim">
            <path d="M2 3l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {modelMenuOpen && (
          <div className="glass absolute left-0 top-full z-40 mt-1.5 min-w-[120px] overflow-hidden rounded-lg border border-border-bright/60 p-1 shadow-xl shadow-black/40">
            {models.map((m) => (
              <button
                key={m.id}
                onClick={() => { onModelChange(m.id); setModelMenuOpen(false) }}
                className={`flex w-full items-center rounded-md px-2.5 py-[5px] text-[12px] transition-all duration-150 hover:bg-bg-hover ${
                  m.id === config.model ? 'text-accent font-medium' : 'text-text-secondary hover:text-text'
                }`}
              >
                {m.id === config.model && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="mr-1.5 text-accent">
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Permission mode */}
      <div ref={permRef} className="relative">
        <button
          onClick={() => { setPermMenuOpen(!permMenuOpen); setModelMenuOpen(false) }}
          className="flex items-center gap-1.5 rounded-md bg-bg-secondary px-2 py-[3px] text-[11px] font-medium text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:text-text"
        >
          <span>{currentPerm?.label ?? config.permissionMode}</span>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-text-dim">
            <path d="M2 3l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {permMenuOpen && (
          <div className="glass absolute left-0 top-full z-40 mt-1.5 min-w-[170px] overflow-hidden rounded-lg border border-border-bright/60 p-1 shadow-xl shadow-black/40">
            {permissionModes.map((m) => (
              <button
                key={m.id}
                onClick={() => { onPermissionModeChange(m.id); setPermMenuOpen(false) }}
                className={`flex w-full flex-col items-start rounded-md px-2.5 py-[5px] transition-all duration-150 hover:bg-bg-hover ${
                  m.id === config.permissionMode ? 'text-accent' : 'text-text-secondary hover:text-text'
                }`}
              >
                <span className={`text-[12px] ${m.id === config.permissionMode ? 'font-medium' : ''}`}>{m.label}</span>
                <span className="text-[10px] text-text-dim">{m.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Effort level segmented control */}
      <div className="flex items-center overflow-hidden rounded-md bg-bg-secondary">
        {effortLevels.map((e) => (
          <button
            key={e.id}
            onClick={() => onEffortChange(e.id)}
            className={`px-1.5 py-[3px] text-[10px] font-medium transition-all duration-150 ${
              e.id === config.effort
                ? 'bg-accent/20 text-accent'
                : 'text-text-dim hover:text-text-secondary'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* CWD indicator */}
      {config.cwd && (
        <button
          onClick={onCwdClick}
          className="flex max-w-[140px] items-center gap-1 rounded-md px-1.5 py-[3px] text-[10px] text-text-dim transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary"
          title={config.cwd}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
            <path d="M1.5 2h2.5l1 1h3.5v5h-7V2z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          <span className="truncate">{truncatePath(config.cwd)}</span>
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Stats */}
      {sessionId && (
        <div className="flex items-center gap-2 font-mono">
          {(inputTokens > 0 || outputTokens > 0) && (
            <span className="text-[10px] text-text-dim/70" title={`In: ${inputTokens.toLocaleString()} / Out: ${outputTokens.toLocaleString()}`}>
              {formatTokens(inputTokens + outputTokens)} tok
            </span>
          )}
          {costUsd > 0 && (
            <span className="text-[10px] text-text-dim/70">
              ${costUsd.toFixed(4)}
            </span>
          )}
        </div>
      )}

      {/* Settings */}
      <button
        onClick={onSettingsClick}
        className="flex h-6 w-6 items-center justify-center rounded-md text-text-dim transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary"
        title="Settings"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.1" />
          <path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11M2.46 2.46l1.06 1.06M8.48 8.48l1.06 1.06M9.54 2.46l-1.06 1.06M3.52 8.48l-1.06 1.06" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </button>

      {/* History */}
      <button
        onClick={onHistoryClick}
        className="flex h-6 w-6 items-center justify-center rounded-md text-text-dim transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary"
        title="Session history"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.1" />
          <path d="M6 3.5V6l2 1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* New session */}
      <button
        onClick={onNewSession}
        className="flex h-6 w-6 items-center justify-center rounded-md text-text-dim transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary"
        title="New session"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 3a4 4 0 1 1 .88 4.36" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M2 8V3h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
