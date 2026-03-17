import { useState } from 'react'

interface ToolUseBlockProps {
  toolName: string
  toolUseId: string
  input?: unknown
  output?: string
  isError?: boolean
}

const toolIcons: Record<string, string> = {
  Bash: '>_',
  Read: 'R',
  Write: 'W',
  Edit: 'E',
  Grep: 'G',
  Glob: '*',
}

function getToolLabel(toolName: string) {
  return toolName
}

function getToolSummary(toolName: string, input: unknown) {
  const inp = input as Record<string, unknown> | undefined
  if (!inp) return null

  switch (toolName) {
    case 'Bash':
      return inp.command as string | undefined
    case 'Read':
      return inp.file_path as string | undefined
    case 'Write':
      return inp.file_path as string | undefined
    case 'Edit':
      return inp.file_path as string | undefined
    case 'Grep':
      return inp.pattern as string | undefined
    case 'Glob':
      return inp.pattern as string | undefined
    default:
      return null
  }
}

function renderSpecializedInput(toolName: string, input: unknown) {
  const inp = input as Record<string, unknown> | undefined
  if (!inp) return null

  switch (toolName) {
    case 'Bash':
      return (
        <div>
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-dim">Command</div>
          <pre className="overflow-x-auto rounded-md bg-bg-tertiary p-2.5 text-[11px] font-mono leading-[1.6] text-text-secondary">
            {inp.command as string}
          </pre>
        </div>
      )
    case 'Read':
    case 'Write':
      return (
        <div className="space-y-2">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-dim">File </span>
            <span className="font-mono text-[11px] text-accent">{inp.file_path as string}</span>
          </div>
          {inp.content ? (
            <pre className="max-h-[200px] overflow-auto rounded-md bg-bg-tertiary p-2.5 text-[11px] font-mono leading-[1.6] text-text-secondary">
              {String(inp.content)}
            </pre>
          ) : null}
        </div>
      )
    case 'Edit':
      return (
        <div className="space-y-2">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-dim">File </span>
            <span className="font-mono text-[11px] text-accent">{inp.file_path as string}</span>
          </div>
          {inp.old_string ? (
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-dim">Old</div>
              <pre className="max-h-[100px] overflow-auto rounded-md bg-danger/5 p-2.5 text-[11px] font-mono leading-[1.6] text-danger/80">
                {String(inp.old_string)}
              </pre>
            </div>
          ) : null}
          {inp.new_string ? (
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-dim">New</div>
              <pre className="max-h-[100px] overflow-auto rounded-md bg-success/5 p-2.5 text-[11px] font-mono leading-[1.6] text-success/80">
                {String(inp.new_string)}
              </pre>
            </div>
          ) : null}
        </div>
      )
    case 'Grep':
    case 'Glob':
      return (
        <div className="space-y-1.5">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-dim">Pattern </span>
            <span className="font-mono text-[11px] text-text-secondary">{inp.pattern as string}</span>
          </div>
          {inp.path ? (
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-text-dim">Path </span>
              <span className="font-mono text-[11px] text-text-secondary">{String(inp.path)}</span>
            </div>
          ) : null}
        </div>
      )
    default:
      return (
        <pre className="max-h-[200px] overflow-auto rounded-md bg-bg-tertiary p-2.5 text-[11px] font-mono leading-[1.6] text-text-secondary">
          {JSON.stringify(input, null, 2)}
        </pre>
      )
  }
}

function renderOutput(toolName: string, output: string, isError?: boolean) {
  const textColor = isError ? 'text-danger' : 'text-text-secondary'
  const bgColor = isError ? 'bg-danger/5' : 'bg-bg-tertiary'

  // For file search tools, render as a file list
  if ((toolName === 'Grep' || toolName === 'Glob') && !isError) {
    const lines = output.split('\n').filter(Boolean)
    if (lines.length > 0 && lines.every((l) => l.includes('/') || l.includes('\\'))) {
      return (
        <div className="max-h-[200px] overflow-auto rounded-md bg-bg-tertiary p-2.5">
          {lines.map((line, i) => (
            <div key={i} className="font-mono text-[11px] leading-[1.6] text-text-secondary">
              {line}
            </div>
          ))}
        </div>
      )
    }
  }

  return (
    <pre className={`max-h-[300px] overflow-auto rounded-md ${bgColor} p-2.5 text-[11px] font-mono leading-[1.6] ${textColor}`}>
      {output}
    </pre>
  )
}

export function ToolUseBlock({ toolName, toolUseId: _toolUseId, input, output, isError }: ToolUseBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const icon = toolIcons[toolName] ?? 'T'
  const summary = getToolSummary(toolName, input)

  // Determine left accent bar color
  const accentBarColor = isError ? 'bg-danger' : output !== undefined ? 'bg-success' : 'bg-accent'

  return (
    <div className="group my-1 flex overflow-hidden rounded-lg border border-border/70 bg-bg-secondary/80">
      {/* Thin left accent bar */}
      <div className={`w-[2px] shrink-0 ${accentBarColor}`} />

      <div className="min-w-0 flex-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-2 px-2.5 py-[7px] text-left transition-all duration-150 hover:bg-bg-hover/50"
        >
          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[9px] font-mono font-bold text-accent/70">
            {icon}
          </span>
          <span className="text-[12px] font-medium text-text-secondary">
            {getToolLabel(toolName)}
          </span>
          {summary && (
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-dim">
              {summary}
            </span>
          )}
          {isError && (
            <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">
              error
            </span>
          )}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className={`shrink-0 text-text-dim transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
          >
            <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {expanded && (
          <div className="space-y-3 border-t border-border/50 px-3 py-2.5">
            {input !== undefined && (
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                  Input
                </div>
                {renderSpecializedInput(toolName, input)}
              </div>
            )}
            {output !== undefined && (
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                  Output
                </div>
                {renderOutput(toolName, output, isError)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
