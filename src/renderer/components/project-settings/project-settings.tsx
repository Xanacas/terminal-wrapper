import { useState, useEffect, useCallback } from 'react'
import { useUIStore } from '~/stores/ui-store'
import { useAppStore } from '~/stores/app-store'
import { useProjects } from '~/hooks/use-projects'
import { api } from '~/lib/ipc'
import { defaultUrlRoutingConfig } from '~/lib/url-routing'
import type { UrlRoutingConfig } from '~/lib/url-routing'
import { UrlRoutingSettings } from './url-routing-settings'

export function ProjectSettings() {
  const projectId = useUIStore((s) => s.projectSettingsId)
  const close = useUIStore((s) => s.closeProjectSettings)
  const projects = useAppStore((s) => s.projects)
  const { updateProject, addThread } = useProjects()

  const project = projects.find((p) => p.id === projectId)

  const [name, setName] = useState('')
  const [cwd, setCwd] = useState('')
  const [url, setUrl] = useState('')
  const [urlRouting, setUrlRouting] = useState<UrlRoutingConfig>(defaultUrlRoutingConfig)
  const [claudeCwd, setClaudeCwd] = useState('')
  const [claudeModel, setClaudeModel] = useState('sonnet')
  const [claudePermMode, setClaudePermMode] = useState('default')
  const [claudeEffort, setClaudeEffort] = useState('high')
  const [dockerContainer, setDockerContainer] = useState('')
  const [dockerUser, setDockerUser] = useState('')
  const [dockerWorkdir, setDockerWorkdir] = useState('')

  useEffect(() => {
    if (project) {
      setName(project.name)
      setCwd(project.defaultCwd)
      setUrl(project.defaultUrl)
      setUrlRouting(project.urlRouting ?? defaultUrlRoutingConfig)
      setClaudeCwd(project.claudeConfig?.cwd ?? '')
      setClaudeModel(project.claudeConfig?.model ?? 'sonnet')
      setClaudePermMode(project.claudeConfig?.permissionMode ?? 'default')
      setClaudeEffort(project.claudeConfig?.effort ?? 'high')
      setDockerContainer(project.claudeConfig?.docker?.container ?? '')
      setDockerUser(project.claudeConfig?.docker?.user ?? '')
      setDockerWorkdir(project.claudeConfig?.docker?.workdir ?? '')
    }
  }, [project])

  const handleBrowse = useCallback(async () => {
    const folder = await api.openFolderDialog()
    if (folder) setCwd(folder)
  }, [])

  const handleBrowseClaudeCwd = useCallback(async () => {
    const folder = await api.openFolderDialog()
    if (folder) setClaudeCwd(folder)
  }, [])

  // When closing settings on a project with no threads (newly created),
  // create an initial empty thread so the user gets the panel chooser.
  const ensureThread = useCallback(() => {
    if (!projectId || !project) return
    if (project.threads.length === 0) {
      addThread(projectId, 'Thread 1')
    }
  }, [projectId, project, addThread])

  const handleCancel = useCallback(() => {
    ensureThread()
    close()
  }, [ensureThread, close])

  const handleSave = useCallback(() => {
    if (!projectId) return
    updateProject(projectId, {
      name: name.trim() || 'Untitled',
      defaultCwd: cwd.trim() || '~',
      defaultUrl: url.trim() || 'https://google.com',
      urlRouting,
      claudeConfig: {
        cwd: claudeCwd || undefined,
        model: claudeModel,
        permissionMode: claudePermMode,
        effort: claudeEffort,
        docker: dockerContainer ? {
          container: dockerContainer,
          user: dockerUser || undefined,
          workdir: dockerWorkdir || undefined,
        } : undefined,
      }
    })
    ensureThread()
    close()
  }, [projectId, name, cwd, url, urlRouting, claudeCwd, claudeModel, claudePermMode, claudeEffort, dockerContainer, dockerUser, dockerWorkdir, updateProject, ensureThread, close])

  const isNewProject = project?.threads.length === 0

  if (!projectId || !project) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleCancel}>
      <div
        className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl border border-white/[0.04] bg-surface shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-[15px] font-semibold text-text tracking-tight">{isNewProject ? 'Add New Project' : 'Project Settings'}</h2>
          <button
            onClick={handleCancel}
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
          {/* Project name */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Project Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
              spellCheck={false}
            />
          </div>

          {/* Default CWD */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Default Working Directory</label>
            <div className="flex gap-2">
              <input
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
                spellCheck={false}
                placeholder="C:\Users\..."
              />
              <button
                onClick={handleBrowse}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-text-muted transition-all duration-150 hover:border-border-bright hover:text-text-secondary hover:bg-bg-hover"
              >
                Browse
              </button>
            </div>
            <p className="text-[10.5px] text-text-dim">Used as the starting directory for new terminal panels</p>
          </div>

          {/* Default URL */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Default URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
              spellCheck={false}
              placeholder="https://..."
            />
            <p className="text-[10.5px] text-text-dim">Used as the starting URL for new browser panels</p>
          </div>

          {/* URL Routing */}
          <UrlRoutingSettings config={urlRouting} onChange={setUrlRouting} />

          {/* Claude Defaults */}
          <div className="mt-2 border-t border-white/[0.06] pt-4">
            <h3 className="mb-3 text-[12px] font-semibold text-text-secondary">Claude Defaults</h3>

            {/* Claude CWD */}
            <div className="flex flex-col gap-2 mb-4">
              <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Claude Working Directory</label>
              <div className="flex gap-2">
                <input
                  value={claudeCwd}
                  onChange={(e) => setClaudeCwd(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
                  spellCheck={false}
                  placeholder="Same as default CWD"
                />
                <button
                  onClick={handleBrowseClaudeCwd}
                  className="shrink-0 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-text-muted transition-all duration-150 hover:border-border-bright hover:text-text-secondary hover:bg-bg-hover"
                >
                  Browse
                </button>
              </div>
              <p className="text-[10.5px] text-text-dim">Separate CWD for Claude panels (leave empty to use project default)</p>
            </div>

            {/* Claude Model */}
            <div className="flex flex-col gap-2 mb-4">
              <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Default Model</label>
              <select
                value={claudeModel}
                onChange={(e) => setClaudeModel(e.target.value)}
                className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
              >
                <option value="sonnet">Sonnet</option>
                <option value="opus">Opus</option>
                <option value="haiku">Haiku</option>
              </select>
            </div>

            {/* Claude Permission Mode */}
            <div className="flex flex-col gap-2 mb-4">
              <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Default Permission Mode</label>
              <select
                value={claudePermMode}
                onChange={(e) => setClaudePermMode(e.target.value)}
                className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
              >
                <option value="default">Default</option>
                <option value="acceptEdits">Accept Edits</option>
                <option value="plan">Plan (Read-only)</option>
                <option value="bypassPermissions">Bypass Permissions</option>
              </select>
            </div>

            {/* Claude Effort Level */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Default Effort Level</label>
              <div className="flex items-center gap-1 overflow-hidden rounded-lg border border-border bg-bg-tertiary">
                {[
                  { id: 'low', label: 'Low' },
                  { id: 'medium', label: 'Medium' },
                  { id: 'high', label: 'High' },
                  { id: 'max', label: 'Max' },
                ].map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setClaudeEffort(e.id)}
                    className={`flex-1 py-2 text-[11px] font-medium transition-all duration-150 ${
                      e.id === claudeEffort
                        ? 'bg-accent/20 text-accent'
                        : 'text-text-dim hover:text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Docker Target */}
            <div className="mt-3 flex flex-col gap-2">
              <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Docker Container</label>
              <input
                value={dockerContainer}
                onChange={(e) => setDockerContainer(e.target.value)}
                className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
                spellCheck={false}
                placeholder="e.g. my-app-container-1"
              />
              <p className="text-[10.5px] text-text-dim">Run Claude Code inside a Docker container via <code className="text-text-muted">docker exec</code>. Leave empty for local.</p>
            </div>
            {dockerContainer && (
              <>
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-2">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">User</label>
                    <input
                      value={dockerUser}
                      onChange={(e) => setDockerUser(e.target.value)}
                      className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
                      spellCheck={false}
                      placeholder="e.g. node"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-text-dim">Workdir</label>
                    <input
                      value={dockerWorkdir}
                      onChange={(e) => setDockerWorkdir(e.target.value)}
                      className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-[12.5px] text-text outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
                      spellCheck={false}
                      placeholder="/workspace"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mx-5 border-t border-white/[0.06]" />
        <div className="flex justify-end gap-2.5 px-6 py-4">
          <button
            onClick={handleCancel}
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
