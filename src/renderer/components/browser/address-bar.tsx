import { useState, useCallback } from 'react'

interface AddressBarProps {
  url: string
  canGoBack: boolean
  canGoForward: boolean
  onNavigate: (url: string) => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onToggleDevTools: () => void
  onOpenInChrome: () => void
}

export function AddressBar({
  url,
  canGoBack,
  canGoForward,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onToggleDevTools,
  onOpenInChrome
}: AddressBarProps) {
  const [inputValue, setInputValue] = useState(url)
  const [focused, setFocused] = useState(false)

  if (!focused && inputValue !== url) {
    setInputValue(url)
  }

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = inputValue.trim()
      if (trimmed) onNavigate(trimmed)
    },
    [inputValue, onNavigate]
  )

  const navBtnClass = (enabled: boolean) =>
    `flex h-[30px] w-[30px] items-center justify-center rounded-md transition-all duration-150 ${
      enabled
        ? 'text-text-muted hover:bg-bg-hover hover:text-text'
        : 'text-text-dim/30 cursor-default'
    }`

  return (
    <div className="flex items-center gap-1 border-b border-border/60 bg-bg-secondary px-2.5 py-2">
      <button onClick={onBack} disabled={!canGoBack} className={navBtnClass(canGoBack)} title="Back">
        <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
          <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button onClick={onForward} disabled={!canGoForward} className={navBtnClass(canGoForward)} title="Forward">
        <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button onClick={onReload} className={navBtnClass(true)} title="Reload">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2.5 7a4.5 4.5 0 1 1 1.32 3.18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M2.5 11V7h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <form onSubmit={handleSubmit} className="mx-1.5 flex-1">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          data-address-bar
          className="w-full rounded-full bg-bg-tertiary/80 px-4 py-[5px] text-[12px] text-text shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] outline-none ring-1 ring-transparent transition-all duration-150 placeholder:text-text-dim focus:bg-bg-tertiary focus:ring-accent/50 focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]"
          placeholder="Enter URL..."
          spellCheck={false}
        />
      </form>

      <button onClick={onToggleDevTools} className={navBtnClass(true)} title="Toggle DevTools">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5.5 2L3 7l2.5 5M8.5 2L11 7l-2.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button onClick={onOpenInChrome} className={navBtnClass(true)} title="Open in default browser">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 1h4v4M5 9L13 1M11 7.67V11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3.33" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
