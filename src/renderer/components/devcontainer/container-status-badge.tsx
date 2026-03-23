import type { ContainerStatus } from '~/stores/devcontainer-store'

const statusConfig: Record<ContainerStatus, { color: string; label: string; pulse?: boolean }> = {
  starting: { color: 'bg-blue-400', label: 'Starting', pulse: true },
  running: { color: 'bg-emerald-400', label: 'Running' },
  paused: { color: 'bg-amber-400', label: 'Paused' },
  stopped: { color: 'bg-neutral-500', label: 'Stopped' },
  error: { color: 'bg-red-400', label: 'Error' },
  destroying: { color: 'bg-orange-400', label: 'Destroying', pulse: true },
}

export function ContainerStatusBadge({ status, compact }: { status: ContainerStatus; compact?: boolean }) {
  const config = statusConfig[status]

  return (
    <span className="inline-flex items-center gap-1" title={config.label}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      {!compact && (
        <span className="text-[10px] text-text-dim">{config.label}</span>
      )}
    </span>
  )
}
