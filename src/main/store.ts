import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'

const isWin = process.platform === 'win32'
const defaultCwd = isWin ? 'C:\\' : homedir()
const defaultShellId = isWin ? 'pwsh' : 'zsh'

// ---- Panel tree types (mirrored from renderer) ----

export type PanelType = 'terminal' | 'browser' | 'claude' | 'todo' | 'empty'

export interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: number
  threadId: string | null
}

export interface LeafPanel {
  id: string
  kind: 'leaf'
  panelType: PanelType
  shellId?: string
  url?: string
  claudeSessionId?: string
}

export interface SplitPanel {
  id: string
  kind: 'split'
  direction: 'horizontal' | 'vertical'
  ratio: number
  first: Panel
  second: Panel
}

export type Panel = LeafPanel | SplitPanel

export interface Tab {
  id: string
  name: string
  panel: Panel
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

const defaultState: AppState = {
  projects: [],
  activeProjectId: null,
  windowBounds: null,
  isMaximized: false
}

let state: AppState = { ...defaultState }
let persistTimer: ReturnType<typeof setTimeout> | null = null
const listeners: Array<(state: AppState) => void> = []

function getConfigPath(): string {
  return join(app.getPath('userData'), 'config.json')
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// Migrate old formats to current format
function migrateProjects(raw: unknown[]): Project[] {
  return raw.map((item) => {
    const p = item as Record<string, unknown>

    // Already new format (has threads)
    if (p.threads && Array.isArray(p.threads)) {
      return p as unknown as Project
    }

    // Previous format (has tabs[] directly on project — the "flat" format)
    if (p.tabs && Array.isArray(p.tabs)) {
      const threadId = generateId()
      return {
        id: p.id as string,
        name: p.name as string,
        defaultCwd: (p.cwd as string) ?? (p.defaultCwd as string) ?? defaultCwd,
        defaultUrl: (p.defaultUrl as string) ?? 'https://google.com',
        defaultShellId: (p.defaultShellId as string) ?? (p.shellId as string) ?? defaultShellId,
        threads: [
          {
            id: threadId,
            name: 'Thread 1',
            tabs: p.tabs as Tab[],
            activeTabId: (p.activeTabId as string) ?? ''
          }
        ],
        activeThreadId: threadId,
        collapsed: false
      } as Project
    }

    // Very old format (layout/splitRatio)
    const shellId = (p.shellId as string) ?? defaultShellId
    const url = (p.url as string) ?? 'https://google.com'
    const layout = (p.layout as string) ?? 'terminal'
    const splitRatio = (p.splitRatio as number) ?? 0.5

    let rootPanel: Panel
    if (layout === 'split') {
      rootPanel = {
        id: generateId(),
        kind: 'split',
        direction: 'horizontal',
        ratio: splitRatio,
        first: { id: generateId(), kind: 'leaf', panelType: 'terminal', shellId },
        second: { id: generateId(), kind: 'leaf', panelType: 'browser', url }
      }
    } else if (layout === 'browser') {
      rootPanel = { id: generateId(), kind: 'leaf', panelType: 'browser', url }
    } else {
      rootPanel = { id: generateId(), kind: 'leaf', panelType: 'terminal', shellId }
    }

    const tabId = generateId()
    const threadId = generateId()
    return {
      id: p.id as string,
      name: p.name as string,
      defaultCwd: (p.cwd as string) ?? defaultCwd,
      defaultUrl: url,
      defaultShellId: shellId,
      threads: [
        {
          id: threadId,
          name: 'Thread 1',
          tabs: [{ id: tabId, name: 'Tab 1', panel: rootPanel }],
          activeTabId: tabId
        }
      ],
      activeThreadId: threadId,
      collapsed: false
    } as Project
  })
}

export function loadState(): AppState {
  try {
    const configPath = getConfigPath()
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, 'utf-8')
      const parsed = JSON.parse(raw) as Record<string, unknown>
      state = {
        ...defaultState,
        ...parsed,
        projects: Array.isArray(parsed.projects)
          ? migrateProjects(parsed.projects as unknown[])
          : []
      }
    }
  } catch {
    state = { ...defaultState }
  }
  return state
}

function persistState(): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    try {
      const configPath = getConfigPath()
      const dir = dirname(configPath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(configPath, JSON.stringify(state, null, 2), 'utf-8')
    } catch (e) {
      console.error('Failed to persist state:', e)
    }
  }, 500)
}

export function getState(): AppState {
  return state
}

export function setState(partial: Partial<AppState>): AppState {
  state = { ...state, ...partial }
  persistState()
  notifyListeners()
  return state
}

export function subscribe(fn: (state: AppState) => void): () => void {
  listeners.push(fn)
  return () => {
    const idx = listeners.indexOf(fn)
    if (idx >= 0) listeners.splice(idx, 1)
  }
}

function notifyListeners(): void {
  for (const fn of listeners) {
    fn(state)
  }
}

// ---- Project CRUD ----

export function addProject(project: Project): AppState {
  return setState({
    projects: [...state.projects, project],
    activeProjectId: project.id
  })
}

export function updateProject(id: string, updates: Partial<Project>): AppState {
  return setState({
    projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p))
  })
}

export function removeProject(id: string): AppState {
  const projects = state.projects.filter((p) => p.id !== id)
  const activeProjectId =
    state.activeProjectId === id ? (projects[0]?.id ?? null) : state.activeProjectId
  return setState({ projects, activeProjectId })
}

export function setActiveProject(id: string): AppState {
  return setState({ activeProjectId: id })
}
