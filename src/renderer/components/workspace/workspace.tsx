import { useAppStore } from '~/stores/app-store'
import type { Project, Thread } from '~/stores/app-store'
import { useProjects } from '~/hooks/use-projects'
import { useUIStore } from '~/stores/ui-store'
import { TabBar } from './tab-bar'
import { PanelContainer } from './panel-container'
import { ShellPicker } from './shell-picker'
import { ProjectOverview } from './project-overview'
import { useCallback, useEffect, useState } from 'react'
import { api } from '~/lib/ipc'
import type { ShellInfo } from '~/lib/types'
import type { PanelType } from '~/lib/panel-utils'
import { updateLeafInTree, firstLeafId, collectLeafPanels, createLeafPanel, splitPanel } from '~/lib/panel-utils'
import { matchUrl, defaultUrlRoutingConfig } from '~/lib/url-routing'

function ThreadWorkspace({
  project,
  thread,
  active
}: {
  project: Project
  thread: Thread
  active: boolean
}) {
  const { updateProject, addTab, closeTab, switchTab, renameTab, setSplitRatio, setPanelType, splitPanelInTab } =
    useProjects()
  const setFocusedPanel = useUIStore((s) => s.setFocusedPanel)
  const focusedPanelId = useUIStore((s) => s.focusedPanelId)
  const activeTab = thread.tabs.find((t) => t.id === thread.activeTabId)

  useEffect(() => {
    if (active && activeTab) setFocusedPanel(firstLeafId(activeTab.panel))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, activeTab?.id, setFocusedPanel])

  const handleSplitRatioChange = useCallback(
    (splitId: string, ratio: number) => {
      if (!activeTab) return
      setSplitRatio(project.id, activeTab.id, splitId, ratio)
    },
    [project.id, activeTab, setSplitRatio]
  )

  const handleSetPanelType = useCallback(
    (panelId: string, type: 'terminal' | 'browser' | 'claude' | 'todo') => {
      if (!activeTab) return
      setPanelType(project.id, activeTab.id, panelId, type, {
        shellId: project.defaultShellId,
        url: project.defaultUrl
      })
    },
    [project.id, project.defaultShellId, project.defaultUrl, activeTab, setPanelType]
  )

  const handleUrlChange = useCallback(
    (panelId: string, url: string) => {
      if (!activeTab) return
      const newRoot = updateLeafInTree(activeTab.panel, panelId, { url })
      const threads = project.threads.map((t) => {
        if (t.id !== thread.id) return t
        return { ...t, tabs: t.tabs.map((tb) => (tb.id === activeTab.id ? { ...tb, panel: newRoot } : tb)) }
      })
      updateProject(project.id, { threads })
    },
    [project, thread.id, activeTab, updateProject]
  )

  const handleOpenUrl = useCallback(
    (panelId: string, url: string) => {
      if (!activeTab) return
      const config = project.urlRouting ?? defaultUrlRoutingConfig
      const target = matchUrl(url, config)

      if (target === 'external') {
        api.openExternal(url)
        return
      }

      // target === 'browser-panel': find existing browser leaf or split
      const leaves = collectLeafPanels(activeTab.panel)
      const existingBrowser = leaves.find((l) => l.panelType === 'browser')
      if (existingBrowser) {
        // Navigate existing browser panel to the URL
        const newRoot = updateLeafInTree(activeTab.panel, existingBrowser.id, { url })
        const threads = project.threads.map((t) => {
          if (t.id !== thread.id) return t
          return { ...t, tabs: t.tabs.map((tb) => (tb.id === activeTab.id ? { ...tb, panel: newRoot } : tb)) }
        })
        updateProject(project.id, { threads })
        api.navigateBrowser(existingBrowser.id, url)
      } else {
        // Split the source panel horizontally and create a new browser panel with the URL
        const newLeaf = createLeafPanel('browser', { url })
        const newRoot = splitPanel(activeTab.panel, panelId, 'horizontal', newLeaf)
        const threads = project.threads.map((t) => {
          if (t.id !== thread.id) return t
          return { ...t, tabs: t.tabs.map((tb) => (tb.id === activeTab.id ? { ...tb, panel: newRoot } : tb)) }
        })
        updateProject(project.id, { threads })
      }
    },
    [project, thread.id, activeTab, updateProject]
  )

  return (
    <div className="flex h-full flex-col">
      <TabBar
        tabs={thread.tabs}
        activeTabId={thread.activeTabId}
        onSwitch={(tabId) => switchTab(project.id, tabId)}
        onClose={(tabId) => closeTab(project.id, tabId)}
        onRename={(tabId, name) => renameTab(project.id, tabId, name)}
        onAdd={(type: PanelType, placement) => {
          if (placement === 'new-tab') {
            addTab(project.id, type)
          } else if (activeTab && focusedPanelId) {
            const direction = placement === 'split-right' ? 'horizontal' : 'vertical'
            splitPanelInTab(project.id, activeTab.id, focusedPanelId, direction, type)
          } else {
            addTab(project.id, type)
          }
        }}
      />
      <div className="relative flex-1 overflow-hidden">
        {thread.tabs.map((tab) => {
          const isTabActive = tab.id === thread.activeTabId
          return (
            <div key={tab.id} className={`absolute inset-0 ${isTabActive ? '' : 'invisible'}`}>
              <PanelContainer
                panel={tab.panel}
                projectId={project.id}
                tabId={tab.id}
                threadId={thread.id}
                cwd={project.defaultCwd}
                defaultShellId={project.defaultShellId}
                active={active && isTabActive}
                onSplitRatioChange={handleSplitRatioChange}
                onSetPanelType={handleSetPanelType}
                onUrlChange={handleUrlChange}
                onOpenUrl={handleOpenUrl}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProjectWorkspace({ project, active }: { project: Project; active: boolean }) {
  const { updateProject } = useProjects()
  const [shells, setShells] = useState<ShellInfo[]>([])
  const activeThread = project.threads.find((t) => t.id === project.activeThreadId)
  const projectOverviewId = useUIStore((s) => s.projectOverviewId)
  const showOverview = projectOverviewId === project.id

  useEffect(() => { api.listShells().then(setShells) }, [])

  const handleShellChange = useCallback(
    (shellId: string) => updateProject(project.id, { defaultShellId: shellId }),
    [project.id, updateProject]
  )

  return (
    <div className="flex h-full flex-col">
      {/* Title bar / toolbar — sits in the window drag area */}
      <div className="flex h-[38px] shrink-0 items-center border-b border-border/60 bg-bg app-drag-region">
        <div className="flex min-w-0 flex-1 items-center pl-3.5">
          <span className="truncate text-[12.5px] font-medium text-text-secondary transition-colors duration-150 hover:text-text">
            {project.name}
          </span>
          {showOverview ? (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" className="mx-1 shrink-0 text-text-dim/50">
                <path d="M6.5 4.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              <span className="truncate text-[12.5px] text-accent">Overview</span>
            </>
          ) : activeThread ? (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" className="mx-1 shrink-0 text-text-dim/50">
                <path d="M6.5 4.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              <span className="truncate text-[12.5px] text-text-muted">{activeThread.name}</span>
            </>
          ) : null}
        </div>
        <div className="no-drag flex shrink-0 items-center pr-[140px]">
          <ShellPicker
            shells={shells}
            selectedShellId={project.defaultShellId}
            onChange={handleShellChange}
          />
        </div>
      </div>

      {/* Overview or thread workspace */}
      <div className="relative flex-1 overflow-hidden">
        {showOverview ? (
          <ProjectOverview project={project} />
        ) : (
          project.threads.map((thread) => {
            const isThreadActive = thread.id === project.activeThreadId
            return (
              <div key={thread.id} className={`absolute inset-0 ${isThreadActive ? '' : 'invisible'}`}>
                <ThreadWorkspace project={project} thread={thread} active={active && isThreadActive} />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export function Workspace() {
  const projects = useAppStore((s) => s.projects)
  const activeProjectId = useAppStore((s) => s.activeProjectId)

  if (projects.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="h-[38px] shrink-0 border-b border-border/60 app-drag-region bg-bg" />
        <div className="flex flex-1 items-center justify-center bg-bg">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-br from-bg-tertiary to-bg-secondary shadow-lg shadow-black/20">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/10 to-transparent" />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="relative text-accent/70">
                <path d="M4 8l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <p className="text-[14px] font-medium tracking-tight text-text-secondary">No project selected</p>
              <p className="text-[12.5px] text-text-dim">Create a project to get started</p>
            </div>
            <kbd className="inline-flex items-center gap-1.5 rounded-md border border-border-bright/60 bg-bg-secondary px-3 py-1.5 text-[11px] font-medium tracking-wider text-text-muted shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)]">
              Ctrl + T
            </kbd>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {projects.map((project) => {
        const isActive = project.id === activeProjectId
        return (
          <div key={project.id} className={`absolute inset-0 ${isActive ? '' : 'invisible'}`}>
            <ProjectWorkspace project={project} active={isActive} />
          </div>
        )
      })}
    </div>
  )
}
