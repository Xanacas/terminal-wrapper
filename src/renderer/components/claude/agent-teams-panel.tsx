import { useState } from 'react'
import type { BackgroundTask, AgentTeamsState, AgentToolCall } from '~/stores/claude-store'

interface AgentTeamsPanelProps {
  teamsState: AgentTeamsState
  onStopTask?: (taskId: string) => void
}

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

const AGENT_COLORS: Record<string, string> = {
  red: 'bg-rose-500',
  blue: 'bg-sky-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  purple: 'bg-violet-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  cyan: 'bg-cyan-500',
}

const STATUS_ICONS = {
  running: (
    <span className="inline-block h-2 w-2 rounded-full bg-info animate-pulse" />
  ),
  completed: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-success">
      <path d="M2.5 6.5L4.5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  failed: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-error">
      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  stopped: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-text-dim">
      <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
}

function getAgentDotClass(task: BackgroundTask) {
  // Hash based on agent type/name so same-type agents share a color
  const key = task.agentType ?? task.agentName ?? task.description
  const hash = [...key].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const colorKeys = Object.keys(AGENT_COLORS)
  return AGENT_COLORS[colorKeys[hash % colorKeys.length]]
}

function AgentListItem({
  task,
  selected,
  onSelect,
}: {
  task: BackgroundTask
  selected: boolean
  onSelect: () => void
}) {
  const dotClass = getAgentDotClass(task)
  const displayName = task.agentName ?? task.agentType ?? task.description

  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
        selected ? 'bg-bg-hover' : 'hover:bg-bg-hover/50'
      }`}
    >
      <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
      <span className="flex-1 truncate text-[12px] font-medium text-text">
        {displayName}
      </span>
      {STATUS_ICONS[task.status]}
      {task.lastToolName && task.status === 'running' && (
        <span className="text-[10px] text-text-dim">{task.lastToolName}</span>
      )}
    </button>
  )
}

function summarizeToolInput(toolName: string, input: unknown) {
  if (!input || typeof input !== 'object') return ''
  const obj = input as Record<string, unknown>
  switch (toolName) {
    case 'Bash': return (obj.command as string)?.slice(0, 120) ?? ''
    case 'Read': return obj.file_path as string ?? ''
    case 'Write': return obj.file_path as string ?? ''
    case 'Edit': return obj.file_path as string ?? ''
    case 'Grep': return `/${obj.pattern}/${obj.path ? ` in ${obj.path}` : ''}`
    case 'Glob': return obj.pattern as string ?? ''
    default: return ''
  }
}

function ToolCallRow({ toolCall }: { toolCall: AgentToolCall }) {
  const [expanded, setExpanded] = useState(false)
  const hasResult = toolCall.output !== undefined
  const borderColor = toolCall.isError ? 'border-error/30' : hasResult ? 'border-success/30' : 'border-accent/30'
  const summary = summarizeToolInput(toolCall.toolName, toolCall.input)

  return (
    <div className={`rounded border-l-2 ${borderColor} bg-bg-tertiary/50 px-2 py-1`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 text-left"
      >
        <span className="text-[11px] font-medium text-text-secondary">{toolCall.toolName}</span>
        {summary && (
          <span className="flex-1 truncate text-[10px] text-text-dim">{summary}</span>
        )}
        {hasResult && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
            className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''} ${toolCall.isError ? 'text-error' : 'text-success'}`}>
            <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {!hasResult && (
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-info animate-pulse" />
        )}
      </button>
      {expanded && toolCall.output && (
        <pre className="mt-1 max-h-[100px] overflow-auto whitespace-pre-wrap text-[10px] text-text-dim">
          {toolCall.output.slice(0, 500)}{toolCall.output.length > 500 ? '...' : ''}
        </pre>
      )}
    </div>
  )
}

function AgentDetail({
  task,
  onStop,
}: {
  task: BackgroundTask
  onStop?: (taskId: string) => void
}) {
  const dotClass = getAgentDotClass(task)
  const displayName = task.agentName ?? task.agentType ?? task.description

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className={`inline-block h-3 w-3 shrink-0 rounded-full ${dotClass}`} />
        <span className="flex-1 text-[12px] font-medium text-text">{displayName}</span>
        {STATUS_ICONS[task.status]}
        {task.status === 'running' && onStop && (
          <button
            onClick={() => onStop(task.taskId)}
            className="rounded px-2 py-0.5 text-[10px] font-medium text-text-dim transition-colors hover:bg-bg-hover hover:text-text"
          >
            Stop
          </button>
        )}
      </div>

      {/* Type badge */}
      {task.agentType && (
        <span className="inline-block w-fit rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] text-text-dim">
          {task.agentType}
        </span>
      )}

      {/* Summary */}
      {task.summary && (
        <div className="text-[11px] text-text-secondary">{task.summary}</div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 text-[10px] text-text-dim">
        {task.lastToolName && task.status === 'running' && (
          <span>{task.lastToolName}</span>
        )}
        {task.usage && (
          <>
            <span>{formatTokens(task.usage.totalTokens)} tokens</span>
            <span>{task.usage.toolUses} tool uses</span>
            <span>{formatDuration(task.usage.durationMs)}</span>
          </>
        )}
        {!task.usage && task.status === 'running' && (
          <span>Starting...</span>
        )}
      </div>

      {/* Tool calls timeline */}
      {task.toolCalls && task.toolCalls.length > 0 && (
        <div className="mt-1 flex flex-col gap-1">
          <div className="text-[10px] font-medium uppercase tracking-wider text-text-dim">
            Tool calls
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {task.toolCalls.map((tc) => (
              <ToolCallRow key={tc.toolUseId} toolCall={tc} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AgentTeamsPanel({ teamsState, onStopTask }: AgentTeamsPanelProps) {
  const [expanded, setExpanded] = useState(true)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Flatten all teammates across teams
  const allTeammates: BackgroundTask[] = []
  for (const members of teamsState.teams.values()) {
    allTeammates.push(...members)
  }
  allTeammates.sort((a, b) => a.startedAt - b.startedAt)

  const selectedTask = selectedTaskId
    ? allTeammates.find((t) => t.taskId === selectedTaskId) ?? allTeammates[0]
    : allTeammates[0]

  // Auto-select first task if none selected
  if (!selectedTaskId && allTeammates.length > 0) {
    setSelectedTaskId(allTeammates[0].taskId)
  }

  return (
    <div className="mx-2 mb-1 rounded-lg border border-border-bright/30 bg-bg-secondary/50">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {/* Team icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
          <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="9" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" />
          <path d="M1 11c0-2 2-3 4-3s4 1 4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M9 8c2 0 4 1 4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>

        <span className="text-[11px] font-medium text-text-secondary">
          {teamsState.activeCount > 0
            ? `${teamsState.activeCount} active`
            : `${teamsState.totalCount} agents`}
        </span>

        {/* Status dots */}
        <div className="flex items-center gap-1">
          {allTeammates.map((t) => (
            <span
              key={t.taskId}
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                t.status === 'running'
                  ? 'bg-info animate-pulse'
                  : t.status === 'completed'
                    ? 'bg-success'
                    : t.status === 'failed'
                      ? 'bg-error'
                      : 'bg-text-dim/40'
              }`}
            />
          ))}
        </div>

        <span className="flex-1" />

        {/* Chevron */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`text-text-dim transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="flex border-t border-border-bright/20">
          {/* Left: Agent list */}
          <div className="w-48 shrink-0 border-r border-border-bright/20 p-1.5">
            {allTeammates.map((task) => (
              <AgentListItem
                key={task.taskId}
                task={task}
                selected={selectedTask?.taskId === task.taskId}
                onSelect={() => setSelectedTaskId(task.taskId)}
              />
            ))}
          </div>

          {/* Right: Detail view */}
          <div className="flex-1 p-3">
            {selectedTask ? (
              <AgentDetail task={selectedTask} onStop={onStopTask} />
            ) : (
              <div className="text-[11px] text-text-dim">No agent selected</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
