import { useState, useEffect } from 'react'
import { api } from '~/lib/ipc'

export function LoggingToggle() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    api.getLoggingEnabled().then(setEnabled)
  }, [])

  const toggle = async () => {
    const newState = await api.setLoggingEnabled(!enabled)
    setEnabled(newState)
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-[11px] transition-colors duration-150"
        style={{ color: enabled ? 'var(--color-accent)' : 'var(--color-text-dim)' }}
        onMouseEnter={(e) => {
          if (!enabled) e.currentTarget.style.color = 'var(--color-text-muted)'
        }}
        onMouseLeave={(e) => {
          if (!enabled) e.currentTarget.style.color = 'var(--color-text-dim)'
        }}
        title={enabled ? 'Detailed logging enabled — click to disable' : 'Enable detailed logging'}
      >
        {/* Log/document icon */}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="2" y="1" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <line x1="4" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="4" y1="6" x2="8" y2="6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="4" y1="8" x2="6.5" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
        <span>Logging</span>
        {/* Toggle indicator */}
        <span
          className="ml-auto inline-block h-[6px] w-[6px] rounded-full transition-colors duration-150"
          style={{
            background: enabled ? 'var(--color-success)' : 'var(--color-text-dim)',
            boxShadow: enabled ? '0 0 6px var(--color-success)' : 'none',
          }}
        />
      </button>
      {enabled && (
        <button
          onClick={() => api.openLogFolder()}
          className="text-[10px] transition-colors duration-150"
          style={{ color: 'var(--color-text-dim)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-dim)' }}
          title="Open log folder"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 2.5C1 1.95 1.45 1.5 2 1.5H4L5 2.5H8C8.55 2.5 9 2.95 9 3.5V7.5C9 8.05 8.55 8.5 8 8.5H2C1.45 8.5 1 8.05 1 7.5V2.5Z" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      )}
    </div>
  )
}
