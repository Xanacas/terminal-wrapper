import { create } from 'zustand'
import type { InitializationResult, ModelInfo, SlashCommand, AgentInfo, AccountInfo, FastModeState, EffortLevel as EffortLevelType } from '../../main/claude/types'

type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions' | 'dontAsk'
type EffortLevel = 'low' | 'medium' | 'high' | 'max'
type ClaudeStatus = 'idle' | 'running' | 'planning' | 'action-needed' | 'waiting' | 'done' | 'planned'

const STATUS_PRIORITY: Record<ClaudeStatus, number> = {
  'action-needed': 0,
  'planned': 1,
  'waiting': 2,
  'done': 3,
  'running': 4,
  'planning': 5,
  'idle': 6,
}

export function getHighestPriorityStatus(statuses: ClaudeStatus[]): ClaudeStatus | null {
  const nonIdle = statuses.filter((s) => s !== 'idle')
  if (nonIdle.length === 0) return null
  return nonIdle.reduce((best, s) => (STATUS_PRIORITY[s] < STATUS_PRIORITY[best] ? s : best))
}

export const STATUS_CONFIG: Record<ClaudeStatus, { label: string; color: string } | null> = {
  'action-needed': { label: 'Action needed', color: 'var(--color-warning)' },
  'planned': { label: 'Planned', color: 'var(--color-accent)' },
  'waiting': { label: 'Waiting', color: 'var(--color-warning)' },
  'done': { label: 'Done', color: 'var(--color-success)' },
  'running': { label: 'Running', color: 'var(--color-info)' },
  'planning': { label: 'Planning', color: 'var(--color-purple)' },
  'idle': null,
}

export interface BackgroundTask {
  taskId: string
  description: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  taskType?: string
  prompt?: string
  summary?: string
  lastToolName?: string
  usage?: { totalTokens: number; toolUses: number; durationMs: number }
  outputFile?: string
  toolUseId?: string
  startedAt: number
  completedAt?: number
}

interface ClaudePanelConfig {
  cwd: string
  model: string
  permissionMode: PermissionMode
  effort: EffortLevel
  maxTurns?: number
  maxBudgetUsd?: number
  systemPrompt?: string
  appendSystemPrompt?: string
  allowedTools: string[]
  disallowedTools: string[]
  additionalDirectories: string[]
  docker?: {
    container: string
    user?: string
    workdir?: string
  }
}

interface ClaudeMessage {
  id: string
  type: 'user' | 'assistant' | 'tool-use' | 'tool-result' | 'permission-request' | 'system'
  content: string
  sdkUuid?: string
  toolUseId?: string
  toolName?: string
  toolInput?: unknown
  toolOutput?: string
  isError?: boolean
  permissionTitle?: string
  images?: Array<{ base64: string; mediaType: string }>
  ts: number
}

interface ClaudePanelState {
  messages: ClaudeMessage[]
  isStreaming: boolean
  currentStreamText: string
  pendingPermissions: Array<{ toolUseId: string; toolName: string; input: unknown; title?: string }>
  sessionId: string | null
  config: ClaudePanelConfig
  costUsd: number
  inputTokens: number
  outputTokens: number
  initialized: boolean
  settingsOpen: boolean
  historyOpen: boolean
  pendingCwdChange: string | null
  status: ClaudeStatus
  restoreStatus: 'none' | 'restoring' | 'restored' | 'error'
  restoreError?: string
  backgroundTasks: Map<string, BackgroundTask>
  initResult: InitializationResult | null
}

const defaultConfig: ClaudePanelConfig = {
  cwd: '',
  model: 'sonnet',
  permissionMode: 'default',
  effort: 'high',
  allowedTools: [],
  disallowedTools: [],
  additionalDirectories: [],
}

const defaultPanelState: ClaudePanelState = {
  messages: [],
  isStreaming: false,
  currentStreamText: '',
  pendingPermissions: [],
  sessionId: null,
  config: { ...defaultConfig },
  costUsd: 0,
  inputTokens: 0,
  outputTokens: 0,
  initialized: false,
  settingsOpen: false,
  historyOpen: false,
  pendingCwdChange: null,
  status: 'idle' as ClaudeStatus,
  restoreStatus: 'none' as const,
  restoreError: undefined,
  backgroundTasks: new Map(),
  initResult: null,
}

interface ClaudeStore {
  panels: Map<string, ClaudePanelState>
  getPanel: (panelId: string) => ClaudePanelState
  initPanel: (panelId: string) => void
  addMessage: (panelId: string, msg: ClaudeMessage) => void
  appendStreamDelta: (panelId: string, text: string) => void
  endStream: (panelId: string, fullText: string, sdkUuid?: string) => void
  setStreaming: (panelId: string, streaming: boolean) => void
  addPermissionRequest: (panelId: string, req: { toolUseId: string; toolName: string; input: unknown; title?: string }) => void
  resolvePermissionRequest: (panelId: string, toolUseId: string) => void
  setSessionMeta: (panelId: string, meta: { sessionId: string; model: string; permissionMode: PermissionMode; costUsd: number; inputTokens: number; outputTokens: number }) => void
  updateConfig: (panelId: string, updates: Partial<ClaudePanelConfig>) => void
  setSettingsOpen: (panelId: string, open: boolean) => void
  setHistoryOpen: (panelId: string, open: boolean) => void
  loadSessionHistory: (panelId: string, messages: ClaudeMessage[], sessionId: string) => void
  clearSession: (panelId: string) => void
  setStatus: (panelId: string, status: ClaudeStatus) => void
  setPendingCwdChange: (panelId: string, cwd: string | null) => void
  setRestoreStatus: (panelId: string, status: 'none' | 'restoring' | 'restored' | 'error', error?: string) => void
  removePanel: (panelId: string) => void
  startTask: (panelId: string, task: { taskId: string; description: string; taskType?: string; prompt?: string; toolUseId?: string; ts: number }) => void
  updateTaskProgress: (panelId: string, taskId: string, update: { description?: string; summary?: string; lastToolName?: string; usage?: BackgroundTask['usage'] }) => void
  completeTask: (panelId: string, taskId: string, result: { status: 'completed' | 'failed' | 'stopped'; summary: string; outputFile?: string; usage?: BackgroundTask['usage'] }) => void
  setInitResult: (panelId: string, data: InitializationResult) => void
}

const updatePanel = (
  set: (updater: (s: ClaudeStore) => Partial<ClaudeStore>) => void,
  panelId: string,
  updater: (state: ClaudePanelState) => Partial<ClaudePanelState>
) => {
  set((s) => {
    const panels = new Map(s.panels)
    const current = panels.get(panelId) ?? { ...defaultPanelState, config: { ...defaultConfig } }
    panels.set(panelId, { ...current, ...updater(current) })
    return { panels }
  })
}

export const useClaudeStore = create<ClaudeStore>((set, get) => ({
  panels: new Map(),

  getPanel: (panelId) => {
    return get().panels.get(panelId) ?? { ...defaultPanelState, config: { ...defaultConfig } }
  },

  initPanel: (panelId) => {
    updatePanel(set, panelId, () => ({ initialized: true }))
  },

  addMessage: (panelId, msg) => {
    updatePanel(set, panelId, (state) => ({
      messages: [...state.messages, msg],
    }))
  },

  appendStreamDelta: (panelId, text) => {
    updatePanel(set, panelId, (state) => ({
      currentStreamText: state.currentStreamText + text,
    }))
  },

  endStream: (panelId, fullText, sdkUuid?) => {
    updatePanel(set, panelId, (state) => {
      const text = fullText || state.currentStreamText
      if (!text) return { currentStreamText: '', isStreaming: false }
      return {
        currentStreamText: '',
        isStreaming: false,
        messages: [
          ...state.messages,
          {
            id: globalThis.crypto.randomUUID(),
            type: 'assistant' as const,
            content: text,
            sdkUuid,
            ts: Date.now(),
          },
        ],
      }
    })
  },

  setStreaming: (panelId, streaming) => {
    updatePanel(set, panelId, () => ({
      isStreaming: streaming,
      ...(streaming ? {} : { currentStreamText: '' }),
    }))
  },

  addPermissionRequest: (panelId, req) => {
    updatePanel(set, panelId, (state) => ({
      pendingPermissions: [...state.pendingPermissions, req],
      messages: [
        ...state.messages,
        {
          id: globalThis.crypto.randomUUID(),
          type: 'permission-request' as const,
          content: '',
          toolUseId: req.toolUseId,
          toolName: req.toolName,
          toolInput: req.input,
          permissionTitle: req.title,
          ts: Date.now(),
        },
      ],
    }))
  },

  resolvePermissionRequest: (panelId, toolUseId) => {
    updatePanel(set, panelId, (state) => ({
      pendingPermissions: state.pendingPermissions.filter((p) => p.toolUseId !== toolUseId),
    }))
  },

  setSessionMeta: (panelId, meta) => {
    updatePanel(set, panelId, (state) => ({
      sessionId: meta.sessionId,
      config: {
        ...state.config,
        model: meta.model,
        permissionMode: meta.permissionMode,
      },
      costUsd: meta.costUsd,
      inputTokens: meta.inputTokens,
      outputTokens: meta.outputTokens,
    }))
  },

  updateConfig: (panelId, updates) => {
    updatePanel(set, panelId, (state) => ({
      config: { ...state.config, ...updates },
    }))
  },

  setSettingsOpen: (panelId, open) => {
    updatePanel(set, panelId, () => ({ settingsOpen: open }))
  },

  setHistoryOpen: (panelId, open) => {
    updatePanel(set, panelId, () => ({ historyOpen: open }))
  },

  loadSessionHistory: (panelId, messages, sessionId) => {
    updatePanel(set, panelId, () => ({
      messages,
      isStreaming: false,
      currentStreamText: '',
      pendingPermissions: [],
      sessionId,
    }))
  },

  clearSession: (panelId) => {
    updatePanel(set, panelId, (state) => ({
      messages: [],
      isStreaming: false,
      currentStreamText: '',
      pendingPermissions: [],
      sessionId: null,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      settingsOpen: false,
      historyOpen: false,
      pendingCwdChange: null,
      status: 'idle' as ClaudeStatus,
      backgroundTasks: new Map(),
      initResult: null,
      config: { ...state.config },
    }))
  },

  setStatus: (panelId, status) => {
    updatePanel(set, panelId, () => ({ status }))
  },

  setPendingCwdChange: (panelId, cwd) => {
    updatePanel(set, panelId, () => ({ pendingCwdChange: cwd }))
  },

  setRestoreStatus: (panelId, status, error) => {
    updatePanel(set, panelId, () => ({ restoreStatus: status, restoreError: error }))
  },

  removePanel: (panelId) => {
    set((s) => {
      const panels = new Map(s.panels)
      panels.delete(panelId)
      return { panels }
    })
  },

  startTask: (panelId, task) => {
    updatePanel(set, panelId, (state) => {
      const backgroundTasks = new Map(state.backgroundTasks)
      backgroundTasks.set(task.taskId, {
        taskId: task.taskId,
        description: task.description,
        status: 'running',
        taskType: task.taskType,
        prompt: task.prompt,
        toolUseId: task.toolUseId,
        startedAt: task.ts,
      })
      return { backgroundTasks }
    })
  },

  updateTaskProgress: (panelId, taskId, update) => {
    updatePanel(set, panelId, (state) => {
      const existing = state.backgroundTasks.get(taskId)
      if (!existing) return {}
      const backgroundTasks = new Map(state.backgroundTasks)
      backgroundTasks.set(taskId, { ...existing, ...update })
      return { backgroundTasks }
    })
  },

  completeTask: (panelId, taskId, result) => {
    updatePanel(set, panelId, (state) => {
      const existing = state.backgroundTasks.get(taskId)
      if (!existing) return {}
      const backgroundTasks = new Map(state.backgroundTasks)
      backgroundTasks.set(taskId, {
        ...existing,
        status: result.status,
        summary: result.summary,
        outputFile: result.outputFile,
        usage: result.usage,
        completedAt: Date.now(),
      })
      return { backgroundTasks }
    })
  },

  setInitResult: (panelId, data) => {
    updatePanel(set, panelId, () => ({ initResult: data }))
  },
}))

// ---- Pure helper functions for initResult data ----

const FALLBACK_MODELS: ModelInfo[] = [
  { value: 'sonnet', displayName: 'Sonnet', description: '' },
  { value: 'opus', displayName: 'Opus', description: '' },
  { value: 'haiku', displayName: 'Haiku', description: '' },
]

const ALL_EFFORT_LEVELS: EffortLevel[] = ['low', 'medium', 'high', 'max']

export function getModelsForPanel(panel: ClaudePanelState): ModelInfo[] {
  return panel.initResult?.models ?? FALLBACK_MODELS
}

export function getEffortLevelsForModel(panel: ClaudePanelState): EffortLevel[] {
  if (!panel.initResult) return ALL_EFFORT_LEVELS
  const model = panel.initResult.models.find((m) => m.value === panel.config.model)
  if (!model || model.supportsEffort === undefined) return ALL_EFFORT_LEVELS
  if (!model.supportsEffort) return []
  return (model.supportedEffortLevels as EffortLevel[] | undefined) ?? ALL_EFFORT_LEVELS
}

export function getSlashCommandsForPanel(panel: ClaudePanelState): SlashCommand[] {
  return panel.initResult?.commands ?? []
}

export function getAccountInfoForPanel(panel: ClaudePanelState): AccountInfo | null {
  return panel.initResult?.account ?? null
}

export function getFastModeStateForPanel(panel: ClaudePanelState): FastModeState | undefined {
  return panel.initResult?.fast_mode_state
}

export function getAgentsForPanel(panel: ClaudePanelState): AgentInfo[] {
  return panel.initResult?.agents ?? []
}

export function getAnyInitResult(): InitializationResult | null {
  const panels = useClaudeStore.getState().panels
  for (const panel of panels.values()) {
    if (panel.initResult) return panel.initResult
  }
  return null
}

export type { ClaudeMessage, ClaudePanelState, ClaudePanelConfig, PermissionMode, EffortLevel, ClaudeStatus, InitializationResult }
