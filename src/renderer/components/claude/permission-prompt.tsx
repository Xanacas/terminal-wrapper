interface PermissionPromptProps {
  toolName: string
  toolUseId: string
  input: unknown
  title?: string
  onApprove: (toolUseId: string) => void
  onDeny: (toolUseId: string) => void
  onAlwaysAllow?: (toolUseId: string, toolName: string) => void
}

function getPermissionDescription(toolName: string, input: unknown, title?: string) {
  if (title) return title

  const inp = input as Record<string, unknown> | undefined
  if (!inp) return `${toolName} wants to execute`

  switch (toolName) {
    case 'Bash':
      return `Run command: ${inp.command}`
    case 'Write':
      return `Write to file: ${inp.file_path}`
    case 'Edit':
      return `Edit file: ${inp.file_path}`
    case 'Read':
      return `Read file: ${inp.file_path}`
    default:
      return `${toolName} wants to execute`
  }
}

export function PermissionPrompt({ toolName, toolUseId, input, title, onApprove, onDeny, onAlwaysAllow }: PermissionPromptProps) {
  const description = getPermissionDescription(toolName, input, title)
  const inp = input as Record<string, unknown> | undefined

  return (
    <div className="my-2 flex overflow-hidden rounded-lg border border-warning/20 bg-warning/[0.04]">
      {/* Left accent bar in amber */}
      <div className="w-[2.5px] shrink-0 bg-warning" />

      <div className="min-w-0 flex-1 p-3">
        <div className="mb-2 flex items-center gap-2">
          {/* Shield icon */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-warning">
            <path
              d="M7 1.5L2.5 3.5v3c0 2.75 1.75 5.25 4.5 6 2.75-.75 4.5-3.25 4.5-6v-3L7 1.5z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M7 5v2M7 9h.005" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span className="text-[12px] font-medium text-text">Permission Required</span>
        </div>

        <p className="mb-2.5 text-[12px] leading-[1.5] text-text-secondary">{description}</p>

        {inp && toolName === 'Bash' && inp.command ? (
          <pre className="mb-3 overflow-x-auto rounded-md bg-bg-tertiary p-2.5 text-[11px] font-mono leading-[1.6] text-text-secondary">
            {String(inp.command)}
          </pre>
        ) : null}

        {inp && (toolName === 'Write' || toolName === 'Edit') && inp.file_path ? (
          <div className="mb-3 rounded-md bg-bg-tertiary px-2.5 py-1.5">
            <span className="font-mono text-[11px] text-accent">{String(inp.file_path)}</span>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            onClick={() => onApprove(toolUseId)}
            className="rounded-md bg-accent px-3.5 py-1.5 text-[12px] font-medium text-white transition-all duration-150 hover:bg-accent-hover"
          >
            Allow
          </button>
          {onAlwaysAllow && (
            <button
              onClick={() => onAlwaysAllow(toolUseId, toolName)}
              className="rounded-md border border-accent/40 bg-accent/10 px-3.5 py-1.5 text-[12px] font-medium text-accent transition-all duration-150 hover:bg-accent/20"
            >
              Always Allow
            </button>
          )}
          <button
            onClick={() => onDeny(toolUseId)}
            className="rounded-md border border-border-bright/60 bg-transparent px-3.5 py-1.5 text-[12px] font-medium text-text-secondary transition-all duration-150 hover:border-danger/40 hover:text-danger"
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  )
}
