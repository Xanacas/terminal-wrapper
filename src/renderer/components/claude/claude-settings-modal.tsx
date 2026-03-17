import { useState, useEffect, useCallback } from 'react'
import { api } from '~/lib/ipc'
import type { ClaudePanelConfig } from '~/stores/claude-store'

interface ClaudeSettingsModalProps {
  config: ClaudePanelConfig
  onSave: (updates: Partial<ClaudePanelConfig>) => void
  onClose: () => void
}

export function ClaudeSettingsModal({ config, onSave, onClose }: ClaudeSettingsModalProps) {
  const [maxBudget, setMaxBudget] = useState(config.maxBudgetUsd?.toString() ?? '')
  const [maxTurns, setMaxTurns] = useState(config.maxTurns?.toString() ?? '')
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt ?? '')
  const [appendSystemPrompt, setAppendSystemPrompt] = useState(config.appendSystemPrompt ?? '')
  const [allowedTools, setAllowedTools] = useState(config.allowedTools.join(', '))
  const [disallowedTools, setDisallowedTools] = useState(config.disallowedTools.join(', '))
  const [additionalDirs, setAdditionalDirs] = useState(config.additionalDirectories)

  useEffect(() => {
    setMaxBudget(config.maxBudgetUsd?.toString() ?? '')
    setMaxTurns(config.maxTurns?.toString() ?? '')
    setSystemPrompt(config.systemPrompt ?? '')
    setAppendSystemPrompt(config.appendSystemPrompt ?? '')
    setAllowedTools(config.allowedTools.join(', '))
    setDisallowedTools(config.disallowedTools.join(', '))
    setAdditionalDirs(config.additionalDirectories)
  }, [config])

  const handleSave = useCallback(() => {
    const updates: Partial<ClaudePanelConfig> = {}

    const budget = parseFloat(maxBudget)
    updates.maxBudgetUsd = isNaN(budget) ? undefined : budget

    const turns = parseInt(maxTurns)
    updates.maxTurns = isNaN(turns) ? undefined : turns

    updates.systemPrompt = systemPrompt || undefined
    updates.appendSystemPrompt = appendSystemPrompt || undefined

    updates.allowedTools = allowedTools
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    updates.disallowedTools = disallowedTools
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    updates.additionalDirectories = additionalDirs

    onSave(updates)
    onClose()
  }, [maxBudget, maxTurns, systemPrompt, appendSystemPrompt, allowedTools, disallowedTools, additionalDirs, onSave, onClose])

  const handleAddDir = useCallback(async () => {
    const folder = await api.openFolderDialog()
    if (folder) {
      setAdditionalDirs((prev) => [...prev, folder])
    }
  }, [])

  const handleRemoveDir = useCallback((idx: number) => {
    setAdditionalDirs((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const inputClass =
    'rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40'
  const labelClass = 'text-[11px] font-medium uppercase tracking-wide text-text-dim'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl border border-white/[0.04] bg-surface shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0">
          <h2 className="text-[15px] font-semibold text-text tracking-tight">Session Settings</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-dim transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="mx-5 border-t border-white/[0.06]" />

        {/* Body */}
        <div className="flex flex-col gap-5 px-6 py-5 overflow-y-auto">
          {/* Budget */}
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Max Budget (USD)</label>
            <input
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              className={inputClass}
              placeholder="No limit"
              type="number"
              step="0.01"
              min="0"
            />
          </div>

          {/* Max turns */}
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Max Turns</label>
            <input
              value={maxTurns}
              onChange={(e) => setMaxTurns(e.target.value)}
              className={inputClass}
              placeholder="Unlimited"
              type="number"
              min="1"
            />
          </div>

          {/* System prompt */}
          <div className="flex flex-col gap-2">
            <label className={labelClass}>System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className={`${inputClass} min-h-[64px] resize-y`}
              placeholder="Custom system prompt..."
              rows={3}
            />
          </div>

          {/* Append system prompt */}
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Append to System Prompt</label>
            <textarea
              value={appendSystemPrompt}
              onChange={(e) => setAppendSystemPrompt(e.target.value)}
              className={`${inputClass} min-h-[64px] resize-y`}
              placeholder="Appended after the default system prompt..."
              rows={3}
            />
          </div>

          {/* Allowed tools */}
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Allowed Tools</label>
            <input
              value={allowedTools}
              onChange={(e) => setAllowedTools(e.target.value)}
              className={inputClass}
              placeholder="e.g., Read, Glob, Grep"
              spellCheck={false}
            />
            <p className="text-[10.5px] text-text-dim">Comma-separated list of tools to allow</p>
          </div>

          {/* Disallowed tools */}
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Disallowed Tools</label>
            <input
              value={disallowedTools}
              onChange={(e) => setDisallowedTools(e.target.value)}
              className={inputClass}
              placeholder="e.g., Bash"
              spellCheck={false}
            />
            <p className="text-[10.5px] text-text-dim">Comma-separated list of tools to block</p>
          </div>

          {/* Additional directories */}
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Additional Directories</label>
            {additionalDirs.map((dir, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 truncate rounded-md bg-bg-tertiary px-2.5 py-1.5 font-mono text-[11px] text-text-secondary">
                  {dir}
                </span>
                <button
                  onClick={() => handleRemoveDir(i)}
                  className="shrink-0 rounded-md px-2 py-1 text-[11px] text-text-dim hover:text-danger transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={handleAddDir}
              className="self-start rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-text-muted transition-all duration-150 hover:border-border-bright hover:text-text-secondary hover:bg-bg-hover"
            >
              Add Directory
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mx-5 border-t border-white/[0.06] shrink-0" />
        <div className="flex justify-end gap-2.5 px-6 py-4 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-1.5 text-[11px] font-medium text-text-muted transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary hover:border-border-bright"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-accent px-5 py-1.5 text-[11px] font-semibold text-white transition-all duration-150 hover:bg-accent-hover shadow-[0_1px_3px_0_rgba(0,0,0,0.3)]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
