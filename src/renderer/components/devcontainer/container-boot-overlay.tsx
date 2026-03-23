import { useEffect, useRef } from 'react'
import { useDevContainerStore } from '~/stores/devcontainer-store'
import { api } from '~/lib/ipc'

interface ContainerBootOverlayProps {
  containerName: string
  branchName: string
  onCancel: () => void
}

export function ContainerBootOverlay({ containerName, branchName, onCancel }: ContainerBootOverlayProps) {
  const container = useDevContainerStore((s) => s.containers.get(containerName))
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [container?.logs.length])

  const status = container?.status ?? 'starting'
  const logs = container?.logs ?? []

  if (status === 'running') return null

  // Compact banner for stopped/paused — non-blocking, sits at top
  if (status === 'stopped' || status === 'paused') {
    return <ContainerStoppedBanner containerName={containerName} branchName={branchName} status={status} />
  }

  // Full overlay for starting/destroying/error
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg/90 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col items-center gap-4 px-6">
        {/* Spinner */}
        {(status === 'starting' || status === 'destroying') && (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
        )}

        {status === 'error' && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="var(--color-error, #ef4444)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}

        <div className="text-center">
          <p className="text-[13px] font-medium text-text">
            {status === 'starting' && 'Starting dev container...'}
            {status === 'destroying' && 'Destroying container...'}
            {status === 'error' && 'Container failed to start'}
          </p>
          <p className="mt-1 text-[11px] text-text-dim">
            {containerName} &middot; {branchName}
          </p>
        </div>

        {/* Log output */}
        {logs.length > 0 && (
          <div className="mt-2 h-[200px] w-full overflow-y-auto rounded-lg border border-border bg-bg-tertiary p-3 font-mono text-[10px] leading-relaxed text-text-muted">
            {logs.map((line, i) => (
              <div key={i} className={line.startsWith('[stderr]') ? 'text-orange-400/70' : ''}>
                {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {status === 'error' && (
            <button
              onClick={() => {
                const store = useDevContainerStore.getState()
                store.setStatus(containerName, 'starting')
                api.startDevContainer(containerName).then((result) => {
                  if (result.ok) store.setStatus(containerName, 'running')
                  else store.setStatus(containerName, 'error', result.error)
                })
              }}
              className="rounded-lg bg-accent/15 px-4 py-1.5 text-[11px] font-medium text-accent transition-all duration-150 hover:bg-accent/25"
            >
              Retry
            </button>
          )}
          {(status === 'starting' || status === 'error') && (
            <button
              onClick={onCancel}
              className="rounded-lg border border-border px-4 py-1.5 text-[11px] font-medium text-text-muted transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary hover:border-border-bright"
            >
              {status === 'starting' ? 'Cancel' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ContainerStoppedBanner({
  containerName,
  branchName,
  status,
}: {
  containerName: string
  branchName: string
  status: 'stopped' | 'paused'
}) {
  const handleStart = () => {
    const store = useDevContainerStore.getState()
    if (status === 'paused') {
      store.setStatus(containerName, 'running')
      api.unpauseDevContainer(containerName).then((result) => {
        if (!result.ok) store.setStatus(containerName, 'error', result.error)
      })
    } else {
      store.setStatus(containerName, 'starting')
      api.startDevContainer(containerName).then((result) => {
        if (result.ok) store.setStatus(containerName, 'running')
        else store.setStatus(containerName, 'error', result.error)
      })
    }
  }

  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 border-b border-border bg-bg-secondary/90 px-4 py-2 backdrop-blur-sm">
      <span className={`h-2 w-2 shrink-0 rounded-full ${status === 'paused' ? 'bg-amber-400' : 'bg-neutral-500'}`} />
      <span className="text-[12px] text-text-muted">
        Container {status === 'paused' ? 'paused' : 'stopped'}
        <span className="ml-1.5 text-text-dim">{containerName} &middot; {branchName}</span>
      </span>
      <button
        onClick={handleStart}
        className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1 text-[11px] font-medium text-accent transition-all duration-150 hover:bg-accent/25"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M4 2l10 6-10 6V2z" fill="currentColor" />
        </svg>
        {status === 'paused' ? 'Resume' : 'Start'}
      </button>
    </div>
  )
}
