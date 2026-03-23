import type { AgentInfo } from '../../../main/claude/types'

interface AgentsModalProps {
  agents: AgentInfo[]
  onClose: () => void
}

const MODEL_COLORS: Record<string, string> = {
  opus: 'bg-purple-500/15 text-purple-400',
  sonnet: 'bg-blue-500/15 text-blue-400',
  haiku: 'bg-emerald-500/15 text-emerald-400',
}

function getModelBadgeClass(model?: string) {
  if (!model) return 'bg-text-dim/10 text-text-dim'
  for (const [key, cls] of Object.entries(MODEL_COLORS)) {
    if (model.toLowerCase().includes(key)) return cls
  }
  return 'bg-text-dim/10 text-text-dim'
}

export function AgentsModal({ agents, onClose }: AgentsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl border border-white/[0.04] bg-surface shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-accent">
                <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M3.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="13" cy="4" r="1.5" stroke="currentColor" strokeWidth="1" />
                <path d="M11 9.5c1.1-.3 2.3.2 2.8 1.3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-text tracking-tight">Available Agents</h2>
              <p className="text-[11px] text-text-dim">{agents.length} agent{agents.length !== 1 ? 's' : ''} configured</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-dim transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="mx-5 border-t border-white/[0.06]" />

        {/* Agent list */}
        <div className="flex flex-col gap-2 px-5 py-4 overflow-y-auto">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="group rounded-xl border border-white/[0.04] bg-bg-secondary/50 p-4 transition-all duration-150 hover:border-white/[0.08] hover:bg-bg-secondary"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/8 text-[11px] font-bold text-accent/70">
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[13px] font-medium text-text">{agent.name}</span>
                  </div>
                </div>
                {agent.model && (
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${getModelBadgeClass(agent.model)}`}>
                    {agent.model}
                  </span>
                )}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">
                {agent.description}
              </p>
            </div>
          ))}

          {agents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg width="32" height="32" viewBox="0 0 16 16" fill="none" className="mb-3 text-text-dim/30">
                <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M3.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <p className="text-[12px] text-text-dim">No agents available</p>
              <p className="mt-1 text-[11px] text-text-dim/60">Agents will appear here once a session is active</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
