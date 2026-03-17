import { useState, useEffect } from 'react'
import type { ClaudeSessionSummary } from '~/lib/types'

interface ClaudeSessionHistoryProps {
  sessions: ClaudeSessionSummary[]
  loading: boolean
  onResume: (sessionId: string) => void
  onClose: () => void
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ClaudeSessionHistory({ sessions, loading, onResume, onClose }: ClaudeSessionHistoryProps) {
  return (
    <div className="border-b border-border/60 bg-bg-secondary">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-medium text-text-secondary">Session History</span>
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-text-dim transition-colors hover:text-text-secondary"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="max-h-[200px] overflow-y-auto px-2 pb-2">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <span className="text-[11px] text-text-dim">Loading sessions...</span>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex items-center justify-center py-4">
            <span className="text-[11px] text-text-dim">No past sessions found</span>
          </div>
        )}

        {sessions.map((session) => (
          <button
            key={session.sessionId}
            onClick={() => onResume(session.sessionId)}
            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-all duration-150 hover:bg-bg-hover group"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] text-text-secondary group-hover:text-text">
                {session.summary || session.firstPrompt || 'Untitled session'}
              </div>
              <div className="text-[10px] text-text-dim">
                {timeAgo(session.lastModified)}
              </div>
            </div>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0 text-text-dim group-hover:text-accent transition-colors">
              <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}

// Wrapper that handles loading sessions
export function ClaudeSessionHistoryPanel({
  listSessions,
  onResume,
  onClose,
}: {
  listSessions: () => Promise<ClaudeSessionSummary[]>
  onResume: (sessionId: string) => void
  onClose: () => void
}) {
  const [sessions, setSessions] = useState<ClaudeSessionSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    listSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [listSessions])

  return (
    <ClaudeSessionHistory
      sessions={sessions}
      loading={loading}
      onResume={onResume}
      onClose={onClose}
    />
  )
}
