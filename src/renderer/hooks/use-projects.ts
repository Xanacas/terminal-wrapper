import { useCallback } from 'react'
import { useAppStore } from '~/stores/app-store'
import type { Project, Thread, TodoItem } from '~/stores/app-store'
import { destroyTerminal } from '~/hooks/use-terminal'
import {
  generateId,
  createLeafPanel,
  createTab,
  collectLeafPanels,
  splitPanel,
  removePanel,
  updateLeafInTree,
  updateSplitRatio,
  deepCloneTab
} from '~/lib/panel-utils'
import type { PanelType, LeafPanel } from '~/lib/panel-utils'
import { api } from '~/lib/ipc'
import { useClaudeStore } from '~/stores/claude-store'
import { useUIStore } from '~/stores/ui-store'

function destroyClaudePanel(panelId: string) {
  api.destroyClaude(panelId)
  useClaudeStore.getState().removePanel(panelId)
}

function killAllPanelsInThread(thread: Thread) {
  for (const tab of thread.tabs) {
    for (const leaf of collectLeafPanels(tab.panel)) {
      if (leaf.panelType === 'terminal') {
        destroyTerminal(leaf.id)
        api.killTerminal(leaf.id)
      }
      if (leaf.panelType === 'browser') api.destroyBrowser(leaf.id)
      if (leaf.panelType === 'claude') destroyClaudePanel(leaf.id)
    }
  }
}

export function useProjects() {
  const projects = useAppStore((s) => s.projects)
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const storeAddProject = useAppStore((s) => s.addProject)
  const storeRemoveProject = useAppStore((s) => s.removeProject)
  const storeUpdateProject = useAppStore((s) => s.updateProject)
  const storeSetActiveProject = useAppStore((s) => s.setActiveProject)

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  )

  // ---- Project (folder) operations ----

  const createProject = useCallback(async () => {
    const shells = await api.listShells()
    const defaultShell = shells[0]
    const cwd = await api.getHomeDir()
    const shellId = defaultShell?.id ?? ''

    const projectId = generateId()

    await storeAddProject({
      id: projectId,
      name: `Project ${projects.length + 1}`,
      defaultCwd: cwd,
      defaultUrl: 'https://google.com',
      defaultShellId: shellId,
      threads: [],
      activeThreadId: '',
      collapsed: false
    })

    // Open settings immediately so the user can configure the project
    useUIStore.getState().openProjectSettings(projectId)

    return projectId
  }, [projects.length, storeAddProject])

  const deleteProject = useCallback(
    async (id: string) => {
      const project = getProject(id)
      if (project) {
        for (const thread of project.threads) {
          killAllPanelsInThread(thread)
        }
      }
      await storeRemoveProject(id)
    },
    [getProject, storeRemoveProject]
  )

  const switchProject = useCallback(
    async (id: string) => {
      api.hideAllBrowsers()
      await storeSetActiveProject(id)
    },
    [storeSetActiveProject]
  )

  const updateProject = useCallback(
    async (id: string, updates: Partial<Project>) => {
      await storeUpdateProject(id, updates)
    },
    [storeUpdateProject]
  )

  const duplicateProject = useCallback(
    async (id: string) => {
      const source = getProject(id)
      if (!source) return

      const newThreads = source.threads.map((t) => ({
        ...t,
        id: generateId(),
        tabs: t.tabs.map((tab) => deepCloneTab(tab)),
        activeTabId: ''
      }))
      // Fix activeTabIds
      for (const thread of newThreads) {
        thread.activeTabId = thread.tabs[0]?.id ?? ''
      }

      const newId = generateId()
      await storeAddProject({
        ...source,
        id: newId,
        name: `${source.name} (copy)`,
        threads: newThreads,
        activeThreadId: newThreads[0]?.id ?? ''
      })
      return newId
    },
    [getProject, storeAddProject]
  )

  const toggleProjectCollapsed = useCallback(
    async (id: string) => {
      const project = getProject(id)
      if (!project) return
      await storeUpdateProject(id, { collapsed: !project.collapsed })
    },
    [getProject, storeUpdateProject]
  )

  // ---- Thread operations ----

  const addThread = useCallback(
    async (projectId: string, name?: string) => {
      const project = getProject(projectId)
      if (!project) return

      const panel = createLeafPanel('empty')
      const tab = createTab('New Tab', panel)
      const threadId = generateId()
      const thread: Thread = {
        id: threadId,
        name: name ?? `Thread ${project.threads.length + 1}`,
        tabs: [tab],
        activeTabId: tab.id
      }

      useUIStore.getState().recordThreadFocus(projectId, threadId)
      await storeUpdateProject(projectId, {
        threads: [...project.threads, thread],
        activeThreadId: threadId
      })
      // Also make this project active
      await storeSetActiveProject(projectId)
      return threadId
    },
    [getProject, storeUpdateProject, storeSetActiveProject]
  )

  const deleteThread = useCallback(
    async (projectId: string, threadId: string) => {
      const project = getProject(projectId)
      if (!project) return

      const thread = project.threads.find((t) => t.id === threadId)
      if (thread) killAllPanelsInThread(thread)

      const remaining = project.threads.filter((t) => t.id !== threadId)
      if (remaining.length === 0) {
        // Create a fresh default thread instead of deleting the project
        const panel = createLeafPanel('empty')
        const tab = createTab('New Tab', panel)
        const newThreadId = generateId()
        const newThread: Thread = {
          id: newThreadId,
          name: 'Thread 1',
          tabs: [tab],
          activeTabId: tab.id
        }
        await storeUpdateProject(projectId, { threads: [newThread], activeThreadId: newThreadId })
        return
      }

      const activeThreadId =
        project.activeThreadId === threadId
          ? (remaining[0]?.id ?? '')
          : project.activeThreadId

      await storeUpdateProject(projectId, { threads: remaining, activeThreadId })
    },
    [getProject, storeUpdateProject, storeRemoveProject]
  )

  const switchThread = useCallback(
    async (projectId: string, threadId: string) => {
      api.hideAllBrowsers()
      useUIStore.getState().recordThreadFocus(projectId, threadId)
      await storeSetActiveProject(projectId)
      await storeUpdateProject(projectId, { activeThreadId: threadId })
    },
    [storeSetActiveProject, storeUpdateProject]
  )

  const renameThread = useCallback(
    async (projectId: string, threadId: string, name: string) => {
      const project = getProject(projectId)
      if (!project) return
      const threads = project.threads.map((t) =>
        t.id === threadId ? { ...t, name } : t
      )
      await storeUpdateProject(projectId, { threads })
    },
    [getProject, storeUpdateProject]
  )

  const duplicateThread = useCallback(
    async (projectId: string, threadId: string) => {
      const project = getProject(projectId)
      if (!project) return
      const srcThread = project.threads.find((t) => t.id === threadId)
      if (!srcThread) return

      const newThread: Thread = {
        id: generateId(),
        name: `${srcThread.name} (copy)`,
        tabs: srcThread.tabs.map((t) => deepCloneTab(t)),
        activeTabId: ''
      }
      newThread.activeTabId = newThread.tabs[0]?.id ?? ''

      await storeUpdateProject(projectId, {
        threads: [...project.threads, newThread],
        activeThreadId: newThread.id
      })
      return newThread.id
    },
    [getProject, storeUpdateProject]
  )

  // ---- Tab operations (within active thread) ----

  const updateThreadTabs = useCallback(
    async (projectId: string, threadId: string, updater: (thread: Thread) => Partial<Thread>) => {
      const project = getProject(projectId)
      if (!project) return
      const thread = project.threads.find((t) => t.id === threadId)
      if (!thread) return
      const updates = updater(thread)
      const threads = project.threads.map((t) =>
        t.id === threadId ? { ...t, ...updates } : t
      )
      await storeUpdateProject(projectId, { threads })
    },
    [getProject, storeUpdateProject]
  )

  const addTab = useCallback(
    async (projectId: string, panelType: PanelType, name?: string) => {
      const project = getProject(projectId)
      if (!project) return
      const thread = project.threads.find((t) => t.id === project.activeThreadId)
      if (!thread) return

      const panel = createLeafPanel(panelType, {
        shellId: project.defaultShellId,
        url: project.defaultUrl
      })
      const defaultNames: Record<string, string> = { terminal: 'Terminal', browser: 'Browser', claude: 'Claude', todo: 'Todo' }
      const tabName = name ?? (defaultNames[panelType] ?? 'Terminal')
      const tab = createTab(tabName, panel)

      await updateThreadTabs(projectId, thread.id, (t) => ({
        tabs: [...t.tabs, tab],
        activeTabId: tab.id
      }))
      return tab.id
    },
    [getProject, updateThreadTabs]
  )

  const closeTab = useCallback(
    async (projectId: string, tabId: string) => {
      const project = getProject(projectId)
      if (!project) return
      const thread = project.threads.find((t) => t.id === project.activeThreadId)
      if (!thread) return

      const tab = thread.tabs.find((t) => t.id === tabId)
      if (tab) {
        for (const leaf of collectLeafPanels(tab.panel)) {
          if (leaf.panelType === 'terminal') {
            destroyTerminal(leaf.id)
            api.killTerminal(leaf.id)
          }
          if (leaf.panelType === 'browser') api.destroyBrowser(leaf.id)
          if (leaf.panelType === 'claude') destroyClaudePanel(leaf.id)
        }
      }

      const remaining = thread.tabs.filter((t) => t.id !== tabId)
      if (remaining.length === 0) {
        await deleteThread(projectId, thread.id)
        return
      }

      const activeTabId =
        thread.activeTabId === tabId ? (remaining[0]?.id ?? '') : thread.activeTabId

      await updateThreadTabs(projectId, thread.id, () => ({
        tabs: remaining,
        activeTabId
      }))
    },
    [getProject, updateThreadTabs, deleteThread]
  )

  const switchTab = useCallback(
    async (projectId: string, tabId: string) => {
      const project = getProject(projectId)
      if (!project) return
      const thread = project.threads.find((t) => t.id === project.activeThreadId)
      if (!thread) return
      api.hideAllBrowsers()
      await updateThreadTabs(projectId, thread.id, () => ({ activeTabId: tabId }))
    },
    [getProject, updateThreadTabs]
  )

  const duplicateTab = useCallback(
    async (projectId: string, tabId: string) => {
      const project = getProject(projectId)
      if (!project) return
      const thread = project.threads.find((t) => t.id === project.activeThreadId)
      if (!thread) return
      const srcTab = thread.tabs.find((t) => t.id === tabId)
      if (!srcTab) return

      const newTab = deepCloneTab(srcTab)
      newTab.name = `${srcTab.name} (copy)`

      await updateThreadTabs(projectId, thread.id, (t) => ({
        tabs: [...t.tabs, newTab],
        activeTabId: newTab.id
      }))
      return newTab.id
    },
    [getProject, updateThreadTabs]
  )

  const renameTab = useCallback(
    async (projectId: string, tabId: string, name: string) => {
      const project = getProject(projectId)
      if (!project) return
      const thread = project.threads.find((t) => t.id === project.activeThreadId)
      if (!thread) return
      await updateThreadTabs(projectId, thread.id, (t) => ({
        tabs: t.tabs.map((tab) => (tab.id === tabId ? { ...tab, name } : tab))
      }))
    },
    [getProject, updateThreadTabs]
  )

  // ---- Panel operations ----

  const splitPanelInTab = useCallback(
    async (
      projectId: string,
      tabId: string,
      panelId: string,
      direction: 'horizontal' | 'vertical',
      newPanelType?: PanelType
    ) => {
      const project = getProject(projectId)
      if (!project) return
      const thread = project.threads.find((t) => t.id === project.activeThreadId)
      if (!thread) return
      const tab = thread.tabs.find((t) => t.id === tabId)
      if (!tab) return

      const newLeaf = createLeafPanel(newPanelType ?? 'empty', {
        shellId: project.defaultShellId,
        url: project.defaultUrl
      })
      const newRoot = splitPanel(tab.panel, panelId, direction, newLeaf)
      await updateThreadTabs(projectId, thread.id, (t) => ({
        tabs: t.tabs.map((tb) => (tb.id === tabId ? { ...tb, panel: newRoot } : tb))
      }))
      return newLeaf.id
    },
    [getProject, updateThreadTabs]
  )

  const removePanelInTab = useCallback(
    async (projectId: string, tabId: string, panelId: string) => {
      const project = getProject(projectId)
      if (!project) return
      const thread = project.threads.find((t) => t.id === project.activeThreadId)
      if (!thread) return
      const tab = thread.tabs.find((t) => t.id === tabId)
      if (!tab) return

      const leaf = collectLeafPanels(tab.panel).find((l) => l.id === panelId)
      if (leaf) {
        if (leaf.panelType === 'terminal') {
          destroyTerminal(leaf.id)
          api.killTerminal(leaf.id)
        }
        if (leaf.panelType === 'browser') api.destroyBrowser(leaf.id)
        if (leaf.panelType === 'claude') destroyClaudePanel(leaf.id)
      }

      const newRoot = removePanel(tab.panel, panelId)
      if (!newRoot) {
        await closeTab(projectId, tabId)
        return
      }
      await updateThreadTabs(projectId, thread.id, (t) => ({
        tabs: t.tabs.map((tb) => (tb.id === tabId ? { ...tb, panel: newRoot } : tb))
      }))
    },
    [getProject, updateThreadTabs, closeTab]
  )

  const setPanelType = useCallback(
    async (
      projectId: string,
      tabId: string,
      panelId: string,
      panelType: PanelType,
      opts?: { shellId?: string; url?: string }
    ) => {
      const project = getProject(projectId)
      if (!project) return
      const thread = project.threads.find((t) => t.id === project.activeThreadId)
      if (!thread) return
      const tab = thread.tabs.find((t) => t.id === tabId)
      if (!tab) return

      const updates: Partial<LeafPanel> = { panelType, ...opts }
      const newRoot = updateLeafInTree(tab.panel, panelId, updates)
      await updateThreadTabs(projectId, thread.id, (t) => ({
        tabs: t.tabs.map((tb) => (tb.id === tabId ? { ...tb, panel: newRoot } : tb))
      }))
    },
    [getProject, updateThreadTabs]
  )

  const setSplitRatio = useCallback(
    async (projectId: string, tabId: string, splitId: string, ratio: number) => {
      const project = getProject(projectId)
      if (!project) return
      const thread = project.threads.find((t) => t.id === project.activeThreadId)
      if (!thread) return
      const tab = thread.tabs.find((t) => t.id === tabId)
      if (!tab) return

      const newRoot = updateSplitRatio(tab.panel, splitId, ratio)
      await updateThreadTabs(projectId, thread.id, (t) => ({
        tabs: t.tabs.map((tb) => (tb.id === tabId ? { ...tb, panel: newRoot } : tb))
      }))
    },
    [getProject, updateThreadTabs]
  )

  // ---- Todo operations ----

  const addTodo = useCallback(
    async (projectId: string, text: string, threadId: string | null) => {
      const project = getProject(projectId)
      if (!project) return
      const todo: TodoItem = {
        id: generateId(),
        text,
        completed: false,
        createdAt: Date.now(),
        threadId,
      }
      await storeUpdateProject(projectId, { todos: [...(project.todos ?? []), todo] })
    },
    [getProject, storeUpdateProject]
  )

  const toggleTodo = useCallback(
    async (projectId: string, todoId: string) => {
      const project = getProject(projectId)
      if (!project) return
      const todos = (project.todos ?? []).map((t) =>
        t.id === todoId ? { ...t, completed: !t.completed } : t
      )
      await storeUpdateProject(projectId, { todos })
    },
    [getProject, storeUpdateProject]
  )

  const deleteTodo = useCallback(
    async (projectId: string, todoId: string) => {
      const project = getProject(projectId)
      if (!project) return
      const todos = (project.todos ?? []).filter((t) => t.id !== todoId)
      await storeUpdateProject(projectId, { todos })
    },
    [getProject, storeUpdateProject]
  )

  const updateTodoText = useCallback(
    async (projectId: string, todoId: string, text: string) => {
      const project = getProject(projectId)
      if (!project) return
      const todos = (project.todos ?? []).map((t) =>
        t.id === todoId ? { ...t, text } : t
      )
      await storeUpdateProject(projectId, { todos })
    },
    [getProject, storeUpdateProject]
  )

  return {
    projects,
    activeProjectId,
    // Project ops
    createProject,
    deleteProject,
    switchProject,
    updateProject,
    duplicateProject,
    toggleProjectCollapsed,
    // Thread ops
    addThread,
    deleteThread,
    switchThread,
    renameThread,
    duplicateThread,
    // Tab ops
    addTab,
    closeTab,
    switchTab,
    duplicateTab,
    renameTab,
    // Panel ops
    splitPanelInTab,
    removePanelInTab,
    setPanelType,
    setSplitRatio,
    // Todo ops
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodoText,
  }
}
