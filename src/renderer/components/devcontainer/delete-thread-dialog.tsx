import { useState, useEffect, useCallback } from 'react'
import { api } from '~/lib/ipc'

interface DeleteThreadDialogProps {
  containerName: string
  branchName: string
  onConfirm: () => void
  onPushAndConfirm: () => void
  onCancel: () => void
}

export function DeleteThreadDialog({
  containerName,
  branchName,
  onConfirm,
  onPushAndConfirm,
  onCancel,
}: DeleteThreadDialogProps) {
  const [checking, setChecking] = useState(true)
  const [hasUncommitted, setHasUncommitted] = useState(false)
  const [hasUnpushed, setHasUnpushed] = useState(false)
  const [pushing, setPushing] = useState(false)

  useEffect(() => {
    api.checkContainerGitStatus(containerName).then((result) => {
      setHasUncommitted(result.hasUncommitted)
      setHasUnpushed(result.hasUnpushed)
      setChecking(false)
    }).catch(() => {
      setChecking(false)
    })
  }, [containerName])

  const handlePushAndDelete = useCallback(async () => {
    setPushing(true)
    await api.pushContainerBranch(containerName)
    onPushAndConfirm()
  }, [containerName, onPushAndConfirm])

  const hasWarnings = hasUncommitted || hasUnpushed
  const isClean = !checking && !hasWarnings

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-sm flex flex-col rounded-2xl border border-white/[0.04] bg-surface shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5">
          <h2 className="text-[15px] font-semibold text-text tracking-tight">Delete Container Thread</h2>
          <p className="mt-1.5 text-[12px] text-text-muted leading-relaxed">
            This will destroy the container <span className="font-mono text-text-secondary">{containerName}</span> and all its data.
          </p>
        </div>

        <div className="mx-5 border-t border-white/[0.06]" />

        {/* Body */}
        <div className="px-6 py-4">
          {checking && (
            <p className="text-[12px] text-text-dim">Checking git status...</p>
          )}

          {!checking && hasUncommitted && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
              <p className="text-[11.5px] font-medium text-red-400">Uncommitted changes</p>
              <p className="mt-0.5 text-[10.5px] text-red-400/70">
                Branch <span className="font-mono">{branchName}</span> has uncommitted changes that will be permanently lost.
              </p>
            </div>
          )}

          {!checking && hasUnpushed && !hasUncommitted && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
              <p className="text-[11.5px] font-medium text-amber-400">Unpushed commits</p>
              <p className="mt-0.5 text-[10.5px] text-amber-400/70">
                Branch <span className="font-mono">{branchName}</span> has commits that haven't been pushed to the remote.
              </p>
            </div>
          )}

          {isClean && (
            <p className="text-[12px] text-text-dim">
              Branch <span className="font-mono text-text-muted">{branchName}</span> is clean — all changes are pushed.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mx-5 border-t border-white/[0.06]" />
        <div className="flex justify-end gap-2 px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-1.5 text-[11px] font-medium text-text-muted transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary hover:border-border-bright"
          >
            Cancel
          </button>

          {hasUnpushed && !hasUncommitted && (
            <button
              onClick={handlePushAndDelete}
              disabled={pushing}
              className="rounded-lg bg-accent px-4 py-1.5 text-[11px] font-semibold text-white transition-all duration-150 hover:bg-accent-hover shadow-[0_1px_3px_0_rgba(0,0,0,0.3)] disabled:opacity-50"
            >
              {pushing ? 'Pushing...' : 'Push & Delete'}
            </button>
          )}

          <button
            onClick={onConfirm}
            disabled={checking}
            className="rounded-lg bg-red-600 px-4 py-1.5 text-[11px] font-semibold text-white transition-all duration-150 hover:bg-red-500 shadow-[0_1px_3px_0_rgba(0,0,0,0.3)] disabled:opacity-50"
          >
            {hasWarnings ? 'Delete Anyway' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
