import { useState, useEffect, useCallback } from 'react'
import { useUIStore } from '~/stores/ui-store'
import { useAppStore } from '~/stores/app-store'
import { api } from '~/lib/ipc'

export function GlobalSettings() {
  const open = useUIStore((s) => s.globalSettingsOpen)
  const close = useUIStore((s) => s.closeGlobalSettings)
  const current = useAppStore((s) => s.devContainerGlobal)

  const [templatePath, setTemplatePath] = useState('')
  const [devcontainersRoot, setDevcontainersRoot] = useState('')
  const [defaultUser, setDefaultUser] = useState('')
  const [defaultWorkdir, setDefaultWorkdir] = useState('')

  useEffect(() => {
    if (open) {
      setTemplatePath(current?.templatePath ?? 'H:/dev-container-template')
      setDevcontainersRoot(current?.devcontainersRoot ?? 'H:/devcontainers')
      setDefaultUser(current?.defaultUser ?? 'node')
      setDefaultWorkdir(current?.defaultWorkdir ?? '/workspace')
    }
  }, [open, current])

  const handleBrowseTemplate = useCallback(async () => {
    const folder = await api.openFolderDialog()
    if (folder) setTemplatePath(folder)
  }, [])

  const handleBrowseRoot = useCallback(async () => {
    const folder = await api.openFolderDialog()
    if (folder) setDevcontainersRoot(folder)
  }, [])

  const handleSave = useCallback(async () => {
    await api.dispatch('updateDevContainerGlobal', {
      templatePath: templatePath.trim(),
      devcontainersRoot: devcontainersRoot.trim(),
      defaultUser: defaultUser.trim() || 'node',
      defaultWorkdir: defaultWorkdir.trim() || '/workspace',
    })
    close()
  }, [templatePath, devcontainersRoot, defaultUser, defaultWorkdir, close])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={close}>
      <div
        className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl border border-white/[0.04] bg-surface shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-[15px] font-semibold text-text tracking-tight">Global Settings</h2>
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
        <div className="flex flex-col gap-5 px-6 py-5 overflow-y-auto">
          <h3 className="text-[12px] font-semibold text-text-secondary">Dev Container Defaults</h3>

          {/* Template path */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Template Path</label>
            <div className="flex gap-2">
              <input
                value={templatePath}
                onChange={(e) => setTemplatePath(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
                spellCheck={false}
                placeholder="H:/dev-container-template"
              />
              <button
                onClick={handleBrowseTemplate}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-text-muted transition-all duration-150 hover:border-border-bright hover:text-text-secondary hover:bg-bg-hover"
              >
                Browse
              </button>
            </div>
            <p className="text-[10.5px] text-text-dim">Path to the .devcontainer template repository</p>
          </div>

          {/* Devcontainers root */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Devcontainers Root</label>
            <div className="flex gap-2">
              <input
                value={devcontainersRoot}
                onChange={(e) => setDevcontainersRoot(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
                spellCheck={false}
                placeholder="H:/devcontainers"
              />
              <button
                onClick={handleBrowseRoot}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-text-muted transition-all duration-150 hover:border-border-bright hover:text-text-secondary hover:bg-bg-hover"
              >
                Browse
              </button>
            </div>
            <p className="text-[10.5px] text-text-dim">Where scripts, cache, and config are stored</p>
          </div>

          {/* Default user & workdir */}
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Default User</label>
              <input
                value={defaultUser}
                onChange={(e) => setDefaultUser(e.target.value)}
                className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
                spellCheck={false}
                placeholder="node"
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Default Workdir</label>
              <input
                value={defaultWorkdir}
                onChange={(e) => setDefaultWorkdir(e.target.value)}
                className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
                spellCheck={false}
                placeholder="/workspace"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mx-5 border-t border-white/[0.06]" />
        <div className="flex justify-end gap-2.5 px-6 py-4">
          <button
            onClick={close}
            className="rounded-lg border border-border px-4 py-1.5 text-[11px] font-medium text-text-muted transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary hover:border-border-bright"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-accent px-5 py-1.5 text-[11px] font-semibold text-white transition-all duration-150 hover:bg-accent-hover shadow-[0_1px_3px_0_rgba(0,0,0,0.3)]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
