import { useState } from 'react'
import type { UrlRoutingConfig, UrlPattern } from '~/lib/url-routing'

interface UrlRoutingSettingsProps {
  config: UrlRoutingConfig
  onChange: (config: UrlRoutingConfig) => void
}

export function UrlRoutingSettings({ config, onChange }: UrlRoutingSettingsProps) {
  const [newPattern, setNewPattern] = useState('')
  const [newType, setNewType] = useState<UrlPattern['type']>('glob')
  const [newTarget, setNewTarget] = useState<UrlPattern['target']>('browser-panel')

  const handleAdd = () => {
    const trimmed = newPattern.trim()
    if (!trimmed) return
    onChange({
      ...config,
      patterns: [...config.patterns, { pattern: trimmed, type: newType, target: newTarget }]
    })
    setNewPattern('')
  }

  const handleRemove = (index: number) => {
    onChange({
      ...config,
      patterns: config.patterns.filter((_, i) => i !== index)
    })
  }

  const handleDefaultTargetChange = (target: UrlRoutingConfig['defaultTarget']) => {
    onChange({ ...config, defaultTarget: target })
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">URL Routing</label>

      {/* Default target */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-text-secondary">Default target:</span>
        <select
          value={config.defaultTarget}
          onChange={(e) => handleDefaultTargetChange(e.target.value as UrlRoutingConfig['defaultTarget'])}
          className="rounded-lg border border-border bg-bg-tertiary px-2 py-1.5 text-[11px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
        >
          <option value="external">External Browser</option>
          <option value="browser-panel">Browser Panel</option>
        </select>
      </div>

      {/* Existing patterns */}
      {config.patterns.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {config.patterns.map((rule, i) => (
            <div
              key={i}
              className="group flex items-center gap-2.5 rounded-lg border border-border bg-bg-tertiary px-3 py-2 transition-all duration-150 hover:border-border-bright"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-text" title={rule.pattern}>
                {rule.pattern}
              </span>
              <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                rule.type === 'glob' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
              }`}>
                {rule.type}
              </span>
              <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                rule.target === 'browser-panel' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400'
              }`}>
                {rule.target === 'browser-panel' ? 'panel' : 'external'}
              </span>
              <button
                onClick={() => handleRemove(i)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-text-dim transition-all duration-150 opacity-0 group-hover:opacity-100 hover:bg-danger/10 hover:text-danger"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add pattern form */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            placeholder="e.g. *://docs.* or https://github.com/**"
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 font-mono text-[11px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40 placeholder:text-text-dim"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as UrlPattern['type'])}
            className="rounded-lg border border-border bg-bg-tertiary px-2 py-1.5 text-[11px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
          >
            <option value="glob">Glob</option>
            <option value="regex">Regex</option>
          </select>
          <select
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value as UrlPattern['target'])}
            className="rounded-lg border border-border bg-bg-tertiary px-2 py-1.5 text-[11px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
          >
            <option value="browser-panel">Browser Panel</option>
            <option value="external">External Browser</option>
          </select>
          <button
            onClick={handleAdd}
            className="shrink-0 rounded-lg border border-border px-3 py-1 text-[11px] font-medium text-text-muted transition-all duration-150 hover:border-border-bright hover:text-text-secondary hover:bg-bg-hover"
          >
            Add
          </button>
        </div>
      </div>

      <p className="text-[10.5px] text-text-dim">
        URLs matching a pattern route to the specified target. First match wins.
      </p>
    </div>
  )
}
