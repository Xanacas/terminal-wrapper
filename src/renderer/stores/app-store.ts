import { create } from 'zustand'
import { api } from '~/lib/ipc'
import type { Tab } from '~/lib/panel-utils'

export type { Panel, LeafPanel, Tab, PanelType, SplitPanel } from '~/lib/panel-utils'

export interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: number
  threadId: string | null
}

export interface Thread {
  id: string
  name: string
  tabs: Tab[]
  activeTabId: string
}

export interface Project {
  id: string
  name: string
  defaultCwd: string
  defaultUrl: string
  defaultShellId: string
  threads: Thread[]
  activeThreadId: string
  collapsed: boolean
  urlRouting?: {
    patterns: Array<{ pattern: string; type: 'glob' | 'regex'; target: 'browser-panel' | 'external' }>
    defaultTarget: 'browser-panel' | 'external'
  }
  claudeConfig?: {
    cwd?: string
    model?: string
    permissionMode?: string
    effort?: string
    maxBudgetUsd?: number
    systemPrompt?: string
    allowedTools?: string[]
    disallowedTools?: string[]
  }
  todos?: TodoItem[]
}

export interface AppState {
  projects: Project[]
  activeProjectId: string | null
  windowBounds: { x: number; y: number; width: number; height: number } | null
  isMaximized: boolean
}

interface AppStore extends AppState {
  initialized: boolean
  init: () => Promise<void>
  addProject: (project: Project) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  removeProject: (id: string) => Promise<void>
  setActiveProject: (id: string) => Promise<void>
  getActiveProject: () => Project | undefined
  getActiveThread: () => Thread | undefined
  getActiveTab: () => Tab | undefined
}

export const useAppStore = create<AppStore>((set, get) => ({
  projects: [],
  activeProjectId: null,
  windowBounds: null,
  isMaximized: false,
  initialized: false,

  init: async () => {
    const state = (await api.getState()) as AppState
    set({ ...state, initialized: true })

    api.onStateChanged((newState) => {
      const s = newState as AppState
      set({
        projects: s.projects,
        activeProjectId: s.activeProjectId,
        windowBounds: s.windowBounds,
        isMaximized: s.isMaximized
      })
    })
  },

  addProject: async (project) => {
    await api.dispatch('addProject', project as unknown as Record<string, unknown>)
  },

  updateProject: async (id, updates) => {
    await api.dispatch('updateProject', {
      id,
      updates: updates as unknown as Record<string, unknown>
    })
  },

  removeProject: async (id) => {
    await api.dispatch('removeProject', { id })
  },

  setActiveProject: async (id) => {
    await api.dispatch('setActiveProject', { id })
  },

  getActiveProject: () => {
    const { projects, activeProjectId } = get()
    return projects.find((p) => p.id === activeProjectId)
  },

  getActiveThread: () => {
    const project = get().getActiveProject()
    if (!project) return undefined
    return project.threads.find((t) => t.id === project.activeThreadId)
  },

  getActiveTab: () => {
    const thread = get().getActiveThread()
    if (!thread) return undefined
    return thread.tabs.find((t) => t.id === thread.activeTabId)
  }
}))
