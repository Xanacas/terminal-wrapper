import { useTerminal } from '~/hooks/use-terminal'
import { useEffect, useState } from 'react'
import { api } from '~/lib/ipc'

export interface DockerTarget {
  containerName: string
  user: string
  workdir: string
}

interface TerminalViewProps {
  projectId: string
  shellId: string
  cwd: string
  initialCommand?: string
  onOpenUrl?: (url: string) => void
  dockerTarget?: DockerTarget
}

export function TerminalView({ projectId, shellId, cwd, initialCommand, onOpenUrl, dockerTarget }: TerminalViewProps) {
  const { containerRef, restart } = useTerminal({ projectId, shellId, cwd, initialCommand, onOpenUrl, dockerTarget })
  const [exited, setExited] = useState(false)

  useEffect(() => {
    const remove = api.onTerminalExit((id) => {
      if (id === projectId) setExited(true)
    })
    return remove
  }, [projectId])

  useEffect(() => {
    const handler = (e: Event) => {
      const panelId = (e as CustomEvent<{ panelId: string }>).detail.panelId
      if (panelId !== projectId) return
      document
        .querySelector<HTMLElement>(`[data-panel-id="${projectId}"] .xterm-helper-textarea`)
        ?.focus()
    }
    window.addEventListener('panel:focus-request', handler)
    return () => window.removeEventListener('panel:focus-request', handler)
  }, [projectId])

  return (
    <div className="relative flex h-full flex-col" data-panel-id={projectId}>
      <div ref={containerRef} className="flex-1 overflow-hidden" />
      {exited && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 border-t border-border/60 bg-bg-secondary/90 px-4 py-3 backdrop-blur-md">
          <span className="text-[12px] text-text-muted">Process exited</span>
          <button
            onClick={() => {
              setExited(false)
              restart()
            }}
            className="rounded-md bg-accent/90 px-3.5 py-1.5 text-[12px] font-medium text-white shadow-sm shadow-accent/20 transition-all duration-150 hover:bg-accent hover:shadow-md hover:shadow-accent/25"
          >
            Restart
          </button>
        </div>
      )}
    </div>
  )
}
