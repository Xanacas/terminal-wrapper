import { useState, useEffect, useCallback, useMemo } from 'react'
import { useUIStore } from '~/stores/ui-store'
import { useAppStore } from '~/stores/app-store'
import { useDevContainerStore } from '~/stores/devcontainer-store'
import { useProjects } from '~/hooks/use-projects'
import { api } from '~/lib/ipc'

type Step = 'choose' | 'configure'

export function NewThreadModal() {
  const projectId = useUIStore((s) => s.newThreadModalProjectId)
  const close = useUIStore((s) => s.closeNewThreadModal)
  const project = useAppStore((s) => s.projects.find((p) => p.id === projectId))
  const { createLocalThread, addThreadWithContainer } = useProjects()

  const [step, setStep] = useState<Step>('choose')
  const [branches, setBranches] = useState<string[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [branchInput, setBranchInput] = useState('')
  const [threadName, setThreadName] = useState('')
  const [creating, setCreating] = useState(false)

  const repo = project?.devContainerConfig?.githubRepo ?? ''

  // Reset state when modal opens
  useEffect(() => {
    if (projectId) {
      setStep('choose')
      setBranchInput('')
      setThreadName('')
      setBranches([])
      setCreating(false)
    }
  }, [projectId])

  // Fetch branches when entering configure step
  useEffect(() => {
    if (step !== 'configure' || !repo) return
    setLoadingBranches(true)
    api.listRemoteBranches(repo).then((result) => {
      setBranches(result)
      setLoadingBranches(false)
    })
  }, [step, repo])

  const filteredBranches = useMemo(() => {
    if (!branchInput) return branches
    const lower = branchInput.toLowerCase()
    return branches.filter((b) => b.toLowerCase().includes(lower))
  }, [branches, branchInput])

  const suggestedBranchName = useMemo(() => {
    if (!threadName) return ''
    return threadName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }, [threadName])

  const handleSelectBranch = useCallback((branch: string) => {
    setBranchInput(branch)
    if (!threadName) {
      // Suggest thread name from branch (e.g. feat/auth-bug -> feat/auth-bug)
      setThreadName(branch)
    }
  }, [threadName])

  const handleLocal = useCallback(async () => {
    if (!projectId) return
    await createLocalThread(projectId)
    close()
  }, [projectId, createLocalThread, close])

  const handleCreateContainer = useCallback(async () => {
    const finalBranch = branchInput || suggestedBranchName
    if (!projectId || !repo || !finalBranch || creating) return
    setCreating(true)

    const repoShort = repo.split('/').pop() ?? repo
    const branchSlug = finalBranch.replace(/\//g, '-')
    const timestamp = new Date().toTimeString().slice(0, 8).replace(/:/g, '')
    const containerName = `${repoShort}-${branchSlug}-${timestamp}`
    const name = threadName || finalBranch

    // Create the thread immediately with devContainer metadata
    await addThreadWithContainer(projectId, name, {
      containerName,
      branchName: finalBranch,
    })

    // Set container status to starting
    useDevContainerStore.getState().setStatus(containerName, 'starting')

    // Fire off container spawn in background (non-blocking)
    api.spawnDevContainer(repo, finalBranch, containerName, project?.devContainerConfig?.projectType)

    close()
  }, [projectId, repo, branchInput, suggestedBranchName, threadName, creating, project, addThreadWithContainer, close])

  if (!projectId || !project) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={close}>
      <div
        className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl border border-white/[0.04] bg-surface shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-[15px] font-semibold text-text tracking-tight">
            {step === 'choose' ? 'New Thread' : 'Dev Container Thread'}
          </h2>
          <button
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-dim transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="mx-5 border-t border-white/[0.06]" />

        {/* Body */}
        <div className="flex flex-col gap-4 px-6 py-5">
          {step === 'choose' && (
            <>
              <p className="text-[12px] text-text-muted">Choose how to create a new thread for <span className="text-text-secondary font-medium">{project.name}</span></p>
              <div className="flex gap-3">
                <button
                  onClick={handleLocal}
                  className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border bg-bg-tertiary px-4 py-5 transition-all duration-150 hover:border-border-bright hover:bg-bg-hover"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
                    <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="text-[12px] font-medium text-text-secondary">Local</span>
                  <span className="text-[10.5px] text-text-dim">Use local filesystem</span>
                </button>
                <button
                  onClick={() => setStep('configure')}
                  className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border bg-bg-tertiary px-4 py-5 transition-all duration-150 hover:border-accent/40 hover:bg-accent/5"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent">
                    <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="7" cy="12" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                    <circle cx="17" cy="12" r="1.5" fill="currentColor" />
                  </svg>
                  <span className="text-[12px] font-medium text-accent">Dev Container</span>
                  <span className="text-[10.5px] text-text-dim">Isolated Docker environment</span>
                </button>
              </div>
            </>
          )}

          {step === 'configure' && (
            <>
              {/* Thread name */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Thread Name</label>
                <input
                  value={threadName}
                  onChange={(e) => setThreadName(e.target.value)}
                  className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
                  spellCheck={false}
                  placeholder="e.g. Fix auth bug"
                  autoFocus
                />
              </div>

              {/* Branch */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Branch</label>
                <input
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
                  spellCheck={false}
                  placeholder={suggestedBranchName || 'Type or select a branch...'}
                />
                {loadingBranches && (
                  <p className="text-[10.5px] text-text-dim">Loading branches...</p>
                )}
                {!loadingBranches && filteredBranches.length > 0 && (
                  <div className="max-h-[140px] overflow-y-auto rounded-lg border border-border bg-bg-tertiary">
                    {filteredBranches.slice(0, 20).map((branch) => (
                      <button
                        key={branch}
                        onClick={() => handleSelectBranch(branch)}
                        className={`w-full px-3 py-1.5 text-left text-[12px] transition-colors duration-100 hover:bg-bg-hover ${
                          branch === branchInput ? 'text-accent bg-accent/5' : 'text-text-muted'
                        }`}
                      >
                        {branch}
                      </button>
                    ))}
                  </div>
                )}
                {!loadingBranches && !branchInput && suggestedBranchName && (
                  <p className="text-[10.5px] text-text-dim">
                    Will create new branch: <span className="text-text-muted font-mono">{suggestedBranchName}</span>
                  </p>
                )}
              </div>

              {/* Info */}
              <div className="rounded-lg border border-border/50 bg-bg-secondary px-3 py-2.5">
                <p className="text-[10.5px] text-text-dim leading-relaxed">
                  <span className="font-medium text-text-muted">Repo:</span> {repo}<br />
                  <span className="font-medium text-text-muted">Branch:</span> {branchInput || suggestedBranchName || '—'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {step === 'configure' && (
          <>
            <div className="mx-5 border-t border-white/[0.06]" />
            <div className="flex justify-between gap-2.5 px-6 py-4">
              <button
                onClick={() => setStep('choose')}
                className="rounded-lg border border-border px-4 py-1.5 text-[11px] font-medium text-text-muted transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary hover:border-border-bright"
              >
                Back
              </button>
              <div className="flex gap-2.5">
                <button
                  onClick={close}
                  className="rounded-lg border border-border px-4 py-1.5 text-[11px] font-medium text-text-muted transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary hover:border-border-bright"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateContainer}
                  disabled={!branchInput && !suggestedBranchName || creating}
                  className="rounded-lg bg-accent px-5 py-1.5 text-[11px] font-semibold text-white transition-all duration-150 hover:bg-accent-hover shadow-[0_1px_3px_0_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Thread'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
