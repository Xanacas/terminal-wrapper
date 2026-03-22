import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuickCommandStore } from '~/stores/quick-command-store'
import { CommandPopoverTerminal } from './command-popover-terminal'
import { generateId } from '~/lib/panel-utils'

export function CommandPopover() {
  const popovers = useQuickCommandStore((s) => s.popovers)
  const closePopover = useQuickCommandStore((s) => s.closePopover)
  const setPopoverStatus = useQuickCommandStore((s) => s.setPopoverStatus)
  const openPopover = useQuickCommandStore((s) => s.openPopover)

  if (popovers.length === 0) return null

  return (
    <>
      {popovers.map((popover) => (
        <PopoverOverlay
          key={popover.id}
          popover={popover}
          onClose={() => closePopover(popover.id)}
          onExit={(exitCode) => setPopoverStatus(popover.id, 'exited', exitCode)}
          onRerun={() => {
            closePopover(popover.id)
            openPopover({
              id: generateId(),
              commandId: popover.commandId,
              commandStr: popover.commandStr,
              cwd: popover.cwd,
              shellId: popover.shellId,
              autoDismiss: popover.autoDismiss,
            })
          }}
        />
      ))}
    </>
  )
}

function PopoverOverlay({
  popover,
  onClose,
  onExit,
  onRerun,
}: {
  popover: {
    id: string
    commandStr: string
    cwd: string
    shellId: string
    status: 'running' | 'exited'
    exitCode: number | null
    autoDismiss: boolean
  }
  onClose: () => void
  onExit: (exitCode: number) => void
  onRerun: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const autoDismissedRef = useRef(false)

  const handleExit = useCallback(
    (exitCode: number) => {
      onExit(exitCode)
      if (popover.autoDismiss && exitCode === 0 && !autoDismissedRef.current) {
        autoDismissedRef.current = true
        setTimeout(() => onClose(), 800)
      }
    },
    [onExit, onClose, popover.autoDismiss]
  )

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        if (popover.status === 'exited') {
          onClose()
        } else {
          setConfirmClose(true)
        }
      }
    },
    [popover.status, onClose]
  )

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (popover.status === 'exited') {
          onClose()
        } else {
          setConfirmClose(true)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [popover.status, onClose])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="flex h-[420px] w-[640px] flex-col overflow-hidden rounded-xl border border-border-bright/60 bg-surface shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`h-2 w-2 shrink-0 rounded-full ${
                popover.status === 'running'
                  ? 'animate-pulse bg-green-400'
                  : popover.exitCode === 0
                    ? 'bg-green-400'
                    : 'bg-red-400'
              }`}
            />
            <span className="truncate text-[12px] font-medium text-text-secondary">
              {popover.commandStr}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {popover.status === 'exited' && (
              <>
                <span className="text-[10px] text-text-dim">
                  exit {popover.exitCode}
                </span>
                <button
                  onClick={onRerun}
                  className="rounded-md px-2 py-1 text-[11px] text-text-muted transition-all hover:bg-bg-hover hover:text-text-secondary"
                >
                  Rerun
                </button>
              </>
            )}
            <button
              onClick={() => {
                if (popover.status === 'running') setConfirmClose(true)
                else onClose()
              }}
              className="flex h-5 w-5 items-center justify-center rounded text-text-dim transition-all hover:bg-bg-hover hover:text-text-secondary"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Terminal */}
        <div className="flex-1 overflow-hidden">
          <CommandPopoverTerminal
            panelId={popover.id}
            shellId={popover.shellId}
            cwd={popover.cwd}
            command={popover.commandStr}
            onExit={handleExit}
          />
        </div>
      </div>

      {/* Confirm close dialog */}
      {confirmClose && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="rounded-xl border border-border-bright/60 bg-surface p-5 shadow-2xl">
            <p className="mb-4 text-[13px] text-text-secondary">
              Command is still running. Close anyway?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmClose(false)}
                className="rounded-md px-3 py-1.5 text-[12px] text-text-muted transition-all hover:bg-bg-hover hover:text-text-secondary"
              >
                Cancel
              </button>
              <button
                onClick={onClose}
                className="rounded-md bg-red-500/90 px-3 py-1.5 text-[12px] font-medium text-white transition-all hover:bg-red-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
