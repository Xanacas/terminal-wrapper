import { useState } from 'react'
import { toolIcons, getToolSummary, renderOutput } from '~/lib/tool-utils'
import { HighlightedCode } from '~/components/ui/code-block'
import type { BackgroundTask } from '~/stores/claude-store'

function langFromPath(filePath: string) {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
    java: 'java', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
    css: 'css', html: 'html', json: 'json', yaml: 'yaml', yml: 'yaml',
    toml: 'toml', sql: 'sql', sh: 'bash', bash: 'bash',
    md: 'markdown', xml: 'xml', php: 'php', swift: 'swift',
    kt: 'kotlin', scala: 'scala', prisma: 'prisma',
  }
  return ext ? map[ext] : undefined
}

interface ToolUseBlockProps {
  toolName: string
  toolUseId: string
  input?: unknown
  output?: string
  isError?: boolean
  agentTask?: BackgroundTask
}

function getToolLabel(toolName: string) {
  return toolName
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
            <HighlightedCode code={inp.command as string} language="bash" />
          </pre>
        </div>
      )
    case 'Read':
    case 'Write': {
      const fileLang = inp.file_path ? langFromPath(String(inp.file_path)) : undefined
      return (
        <div className="space-y-2">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-dim">File </span>
            <span className="font-mono text-[11px] text-accent">{inp.file_path as string}</span>
          </div>
          {inp.content ? (
            <pre className="max-h-[200px] overflow-auto rounded-md bg-bg-tertiary p-2.5 text-[11px] font-mono leading-[1.6] text-text-secondary">
              <HighlightedCode code={String(inp.content)} language={fileLang} />
            </pre>
          ) : null}
        </div>
      )
    }
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


const AGENT_TOOL_NAMES = new Set(['Agent', 'SendMessage', 'TeamCreate', 'TeamDelete'])

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}m ${remainder}s`
}

function formatTokens(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function summarizeAgentToolInput(input: unknown) {
  const inp = input as Record<string, unknown> | undefined
  if (!inp) return ''
  const name = (inp.name ?? inp.to ?? inp.description) as string | undefined
  const type = inp.subagent_type as string | undefined
  if (name && type) return `${type}: ${name}`
  return name ?? type ?? ''
}

function AgentTaskDetail({ task }: { task: BackgroundTask }) {
  const statusIcon = task.status === 'running'
    ? <span className="inline-block h-2 w-2 rounded-full bg-info animate-pulse" />
    : task.status === 'completed'
      ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-success"><path d="M2.5 6.5L4.5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      : task.status === 'failed'
        ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-error"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        : <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-text-dim"><rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" /></svg>

  return (
    <div className="space-y-2">
      {/* Status + summary header */}
      <div className="flex items-center gap-2">
        {statusIcon}
        <span className="text-[11px] font-medium text-text-secondary capitalize">{task.status}</span>
        {task.usage && (
          <span className="text-[10px] text-text-dim">
            {formatTokens(task.usage.totalTokens)} tokens · {task.usage.toolUses} tools · {formatDuration(task.usage.durationMs)}
          </span>
        )}
      </div>

      {/* Status update history */}
      {task.summaryHistory && task.summaryHistory.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-medium uppercase tracking-wider text-text-dim">
            Status updates ({task.summaryHistory.length})
          </div>
          <div className="max-h-[120px] space-y-0.5 overflow-y-auto">
            {task.summaryHistory.map((entry, i) => (
              <div key={i} className="flex gap-2 text-[11px]">
                <span className="shrink-0 text-text-dim/50">{i + 1}.</span>
                <span className="text-text-secondary">{entry.summary}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current summary (if no history yet) */}
      {task.summary && (!task.summaryHistory || task.summaryHistory.length === 0) && (
        <div className="text-[11px] text-text-secondary">{task.summary}</div>
      )}

      {/* Tool calls */}
      {task.toolCalls && task.toolCalls.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-medium uppercase tracking-wider text-text-dim">
            Tool calls ({task.toolCalls.length})
          </div>
          <div className="max-h-[250px] space-y-0.5 overflow-y-auto">
            {task.toolCalls.map((tc) => {
              const tcSummary = getToolSummary(tc.toolName, tc.input)
              const hasOutput = tc.output !== undefined
              const borderColor = tc.isError ? 'border-error/30' : hasOutput ? 'border-success/30' : 'border-accent/30'
              return (
                <AgentToolCallRow key={tc.toolUseId} toolName={tc.toolName} summary={tcSummary} output={tc.output} isError={tc.isError} borderColor={borderColor} hasOutput={hasOutput} />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function AgentToolCallRow({ toolName, summary, output, isError, borderColor, hasOutput }: {
  toolName: string; summary: string; output?: string; isError?: boolean; borderColor: string; hasOutput: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded border-l-2 ${borderColor} bg-bg-tertiary/50 px-2 py-1`}>
      <button onClick={() => hasOutput && setOpen(!open)} className="flex w-full items-center gap-1.5 text-left">
        <span className="text-[11px] font-medium text-text-secondary">{toolName}</span>
        {summary && <span className="flex-1 truncate text-[10px] text-text-dim">{summary}</span>}
        {hasOutput ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
            className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${isError ? 'text-error' : 'text-success'}`}>
            <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-info animate-pulse" />
        )}
      </button>
      {open && output && (
        <pre className="mt-1 max-h-[100px] overflow-auto whitespace-pre-wrap text-[10px] text-text-dim">
          {output.slice(0, 500)}{output.length > 500 ? '...' : ''}
        </pre>
      )}
    </div>
  )
}

export function ToolUseBlock({ toolName, toolUseId: _toolUseId, input, output, isError, agentTask }: ToolUseBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const isAgentTool = AGENT_TOOL_NAMES.has(toolName)
  const icon = toolIcons[toolName] ?? 'T'
  const summary = isAgentTool ? summarizeAgentToolInput(input) : getToolSummary(toolName, input)

  // Determine left accent bar color
  const accentBarColor = isError
    ? 'bg-danger'
    : agentTask?.status === 'completed' ? 'bg-success'
    : agentTask?.status === 'failed' ? 'bg-danger'
    : agentTask?.status === 'running' ? 'bg-info'
    : output !== undefined ? 'bg-success'
    : 'bg-accent'

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
          {/* Agent status badge */}
          {agentTask && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              agentTask.status === 'running' ? 'bg-info/10 text-info'
              : agentTask.status === 'completed' ? 'bg-success/10 text-success'
              : agentTask.status === 'failed' ? 'bg-danger/10 text-danger'
              : 'bg-text-dim/10 text-text-dim'
            }`}>
              {agentTask.status}
            </span>
          )}
          {!agentTask && isError && (
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
            {/* For agent tools, show agent activity if available */}
            {isAgentTool && agentTask ? (
              <AgentTaskDetail task={agentTask} />
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
