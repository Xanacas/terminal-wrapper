import type { ClaudeStatus } from '~/stores/claude-store'
import { STATUS_CONFIG } from '~/stores/claude-store'

interface ClaudeStatusBadgeProps {
  status: ClaudeStatus
  compact?: boolean
}

export function ClaudeStatusBadge({ status, compact }: ClaudeStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  if (!config) return null

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-medium ${
        compact ? 'px-[5px] py-px text-[9px]' : 'px-[6px] py-px text-[10px]'
      }`}
      style={{ color: config.color, background: `color-mix(in srgb, ${config.color} 12%, transparent)` }}
    >
      <span
        className="inline-block h-[5px] w-[5px] rounded-full"
        style={{
          background: config.color,
          animation: status === 'running' || status === 'planning' ? 'pulse 2s ease-in-out infinite' : undefined,
        }}
      />
      {config.label}
    </span>
  )
}
