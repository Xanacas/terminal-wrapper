interface ClaudeCwdPromptProps {
  onBrowse: () => void
  defaultCwd?: string
  onUseDefault?: () => void
}

export function ClaudeCwdPrompt({ onBrowse, defaultCwd, onUseDefault }: ClaudeCwdPromptProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/8">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent/60">
          <path
            d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="3"
            y="7"
            width="18"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="text-[13px] font-medium text-text-secondary">
          Select a working directory
        </div>
        <div className="max-w-[260px] text-[12px] text-text-dim">
          Claude needs a working directory to read files, run commands, and make changes
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onBrowse}
          className="rounded-lg bg-accent px-4 py-2 text-[12px] font-medium text-white transition-all duration-150 hover:bg-accent-hover shadow-[0_1px_3px_0_rgba(0,0,0,0.3)]"
        >
          Browse...
        </button>
        {defaultCwd && onUseDefault && (
          <button
            onClick={onUseDefault}
            className="rounded-lg border border-border px-4 py-2 text-[12px] font-medium text-text-muted transition-all duration-150 hover:border-border-bright hover:text-text-secondary hover:bg-bg-hover"
          >
            Use project default
          </button>
        )}
      </div>

      {defaultCwd && (
        <div className="text-[10.5px] text-text-dim">
          Project default: <span className="font-mono text-text-muted">{defaultCwd}</span>
        </div>
      )}
    </div>
  )
}
