import { useState, useRef, useEffect, useCallback } from 'react'

type ChoosablePanelType = 'terminal' | 'browser' | 'claude' | 'todo'

interface PanelOption {
  type: ChoosablePanelType
  label: string
  description: string
  icon: React.ReactNode
}

const panelOptions: PanelOption[] = [
  {
    type: 'terminal',
    label: 'Terminal',
    description: 'Shell session',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M5 8l5 4-5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    type: 'browser',
    label: 'Browser',
    description: 'Embedded web browser',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <ellipse cx="12" cy="12" rx="4" ry="9" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3.5 9h17M3.5 15h17" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    type: 'claude',
    label: 'Claude',
    description: 'AI assistant session',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l2.8 7.6L22 12l-7.2 2.4L12 22l-2.8-7.6L2 12l7.2-2.4L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <path d="M12 8l1 2.8 2.8 1.2-2.8 1-1 2.8-1-2.8L8.2 12l2.8-1.2L12 8z" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    type: 'todo',
    label: 'Todo',
    description: 'Task checklist',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M9 11l3 3 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

interface PanelChooserProps {
  onChoose: (type: ChoosablePanelType) => void
}

export function PanelChooser({ onChoose }: PanelChooserProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = panelOptions.filter((opt) => {
    if (!query) return true
    const q = query.toLowerCase()
    return opt.label.toLowerCase().includes(q) || opt.description.toLowerCase().includes(q)
  })

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % filtered.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length)
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault()
        onChoose(filtered[selectedIndex].type)
      }
    },
    [filtered, selectedIndex, onChoose]
  )

  return (
    <div className="flex h-full items-center justify-center bg-bg">
      <div className="w-[280px] overflow-hidden rounded-lg border border-border/60 bg-bg-secondary shadow-xl">
        <div className="border-b border-border/40 px-3 py-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Select panel type..."
            className="w-full bg-transparent text-[13px] text-text placeholder-text-dim/50 outline-none"
          />
        </div>
        <div className="max-h-[240px] overflow-y-auto py-1">
          {filtered.map((opt, i) => (
            <button
              key={opt.type}
              onClick={() => onChoose(opt.type)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                i === selectedIndex ? 'bg-accent/10 text-text' : 'text-text-muted hover:bg-bg-tertiary'
              }`}
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                i === selectedIndex ? 'bg-accent/15 text-accent' : 'bg-bg-tertiary text-text-dim'
              }`}>
                {opt.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium">{opt.label}</div>
                <div className="text-[11px] text-text-dim">{opt.description}</div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-center text-[12px] text-text-dim">No matching panel type</div>
          )}
        </div>
      </div>
    </div>
  )
}
