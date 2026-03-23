import type { BackgroundTask } from '~/stores/claude-store'

interface BackgroundTaskCardProps {
  task: BackgroundTask
  onStop?: (taskId: string) => void
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

const statusIndicators = {
  running: {
    icon: (
      <span className="inline-block h-2 w-2 rounded-full bg-info animate-pulse" />
    ),
    color: 'border-info/30',
    label: 'Running',
  },
  completed: {
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-success">
        <path d="M2.5 6.5L4.5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: 'border-success/30',
    label: 'Completed',
  },
  failed: {
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-error">
        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    color: 'border-error/30',
    label: 'Failed',
  },
  stopped: {
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-text-dim">
        <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
    color: 'border-text-dim/20',
    label: 'Stopped',
  },
}

export function BackgroundTaskCard({ task, onStop }: BackgroundTaskCardProps) {
  const indicator = statusIndicators[task.status]
  const isRunning = task.status === 'running'

  return (
    <div className={`rounded-lg border ${indicator.color} bg-bg-secondary/50 px-3.5 py-2.5`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        {indicator.icon}
        <span className="flex-1 text-[12px] font-medium text-text">
          {task.description}
        </span>
        {isRunning && onStop && (
          <button
            onClick={() => onStop(task.taskId)}
            className="rounded px-2 py-0.5 text-[10px] font-medium text-text-dim transition-colors hover:bg-bg-hover hover:text-text"
          >
            Stop
          </button>
        )}
      </div>

      {/* Summary / Progress */}
      {task.summary && (
        <div className="mt-1.5 text-[11px] text-text-secondary">
          {task.summary}
        </div>
      )}

      {/* Stats row */}
      <div className="mt-1.5 flex items-center gap-3 text-[10px] text-text-dim">
        {task.lastToolName && isRunning && (
          <span>{task.lastToolName}</span>
        )}
        {task.usage && (
          <>
            <span>{formatTokens(task.usage.totalTokens)} tokens</span>
            <span>{task.usage.toolUses} tool uses</span>
            <span>{formatDuration(task.usage.durationMs)}</span>
          </>
        )}
        {!task.usage && isRunning && (
          <span>Starting...</span>
        )}
      </div>
    </div>
  )
}
