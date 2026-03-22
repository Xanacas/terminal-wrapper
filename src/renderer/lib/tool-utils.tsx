import type { ClaudeMessage } from '~/stores/claude-store'

export const toolIcons: Record<string, string> = {
  Bash: '>_',
  Read: 'R',
  Write: 'W',
  Edit: 'E',
  Grep: 'G',
  Glob: '*',
  AskUserQuestion: '?',
  ToolSearch: 'S',
}

export interface ToolEntry {
  toolUseMsg: ClaudeMessage
  toolResultMsg: ClaudeMessage | null
}

export function getToolSummary(toolName: string, input: unknown): string | null {
  const inp = input as Record<string, unknown> | undefined
  if (!inp) return null

  switch (toolName) {
    case 'Bash':
      return inp.command as string | undefined ?? null
    case 'Read':
      return inp.file_path as string | undefined ?? null
    case 'Write':
      return inp.file_path as string | undefined ?? null
    case 'Edit':
      return inp.file_path as string | undefined ?? null
    case 'Grep':
      return inp.pattern as string | undefined ?? null
    case 'Glob':
      return inp.pattern as string | undefined ?? null
    default:
      return null
  }
}

export function renderOutput(toolName: string, output: string, isError?: boolean) {
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
