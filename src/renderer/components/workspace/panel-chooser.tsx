interface PanelChooserProps {
  onChoose: (type: 'terminal' | 'browser' | 'claude' | 'todo') => void
}

export function PanelChooser({ onChoose }: PanelChooserProps) {
  return (
    <div className="flex h-full items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-6">
        <span className="text-[13px] font-medium text-text-muted">Choose panel type</span>
        <div className="flex gap-4">
          <button
            onClick={() => onChoose('terminal')}
            className="group flex flex-col items-center gap-3.5 rounded-xl border border-border bg-bg-secondary p-7 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-bg-tertiary transition-all duration-150 group-hover:bg-accent/10 group-hover:shadow-[0_0_20px_rgba(129,140,248,0.1)]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-text-muted transition-colors duration-150 group-hover:text-accent">
                <path d="M5 8l5 4-5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-[12px] font-medium text-text-muted transition-colors duration-150 group-hover:text-text">Terminal</span>
          </button>
          <button
            onClick={() => onChoose('browser')}
            className="group flex flex-col items-center gap-3.5 rounded-xl border border-border bg-bg-secondary p-7 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-bg-tertiary transition-all duration-150 group-hover:bg-accent/10 group-hover:shadow-[0_0_20px_rgba(129,140,248,0.1)]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-text-muted transition-colors duration-150 group-hover:text-accent">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <ellipse cx="12" cy="12" rx="4" ry="9" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3.5 9h17M3.5 15h17" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </div>
            <span className="text-[12px] font-medium text-text-muted transition-colors duration-150 group-hover:text-text">Browser</span>
          </button>
          <button
            onClick={() => onChoose('claude')}
            className="group flex flex-col items-center gap-3.5 rounded-xl border border-border bg-bg-secondary p-7 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-bg-tertiary transition-all duration-150 group-hover:bg-accent/10 group-hover:shadow-[0_0_20px_rgba(129,140,248,0.1)]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-text-muted transition-colors duration-150 group-hover:text-accent">
                <path d="M12 2l2.8 7.6L22 12l-7.2 2.4L12 22l-2.8-7.6L2 12l7.2-2.4L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
                <path d="M12 8l1 2.8 2.8 1.2-2.8 1-1 2.8-1-2.8L8.2 12l2.8-1.2L12 8z" fill="currentColor" opacity="0.3" />
              </svg>
            </div>
            <span className="text-[12px] font-medium text-text-muted transition-colors duration-150 group-hover:text-text">Claude</span>
          </button>
          <button
            onClick={() => onChoose('todo')}
            className="group flex flex-col items-center gap-3.5 rounded-xl border border-border bg-bg-secondary p-7 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-bg-tertiary transition-all duration-150 group-hover:bg-accent/10 group-hover:shadow-[0_0_20px_rgba(129,140,248,0.1)]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-text-muted transition-colors duration-150 group-hover:text-accent">
                <path d="M9 11l3 3 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[12px] font-medium text-text-muted transition-colors duration-150 group-hover:text-text">Todo</span>
          </button>
        </div>
      </div>
    </div>
  )
}
