import { create } from 'zustand'

type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions' | 'dontAsk'
type EffortLevel = 'low' | 'medium' | 'high' | 'max'

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
}

interface ClaudeMessage {
  id: string
  type: 'user' | 'assistant' | 'tool-use' | 'tool-result' | 'permission-request' | 'system'
  content: string
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
}

interface ClaudeStore {
  panels: Map<string, ClaudePanelState>
  getPanel: (panelId: string) => ClaudePanelState
  initPanel: (panelId: string) => void
  addMessage: (panelId: string, msg: ClaudeMessage) => void
  appendStreamDelta: (panelId: string, text: string) => void
  endStream: (panelId: string, fullText: string) => void
  setStreaming: (panelId: string, streaming: boolean) => void
  addPermissionRequest: (panelId: string, req: { toolUseId: string; toolName: string; input: unknown; title?: string }) => void
  resolvePermissionRequest: (panelId: string, toolUseId: string) => void
  setSessionMeta: (panelId: string, meta: { sessionId: string; model: string; permissionMode: PermissionMode; costUsd: number; inputTokens: number; outputTokens: number }) => void
  updateConfig: (panelId: string, updates: Partial<ClaudePanelConfig>) => void
  setSettingsOpen: (panelId: string, open: boolean) => void
  setHistoryOpen: (panelId: string, open: boolean) => void
  loadSessionHistory: (panelId: string, messages: ClaudeMessage[]) => void
  clearSession: (panelId: string) => void
  setPendingCwdChange: (panelId: string, cwd: string | null) => void
  removePanel: (panelId: string) => void
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

  endStream: (panelId, fullText) => {
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

  loadSessionHistory: (panelId, messages) => {
    updatePanel(set, panelId, () => ({
      messages,
      isStreaming: false,
      currentStreamText: '',
      pendingPermissions: [],
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
      config: { ...state.config },
    }))
  },

  setPendingCwdChange: (panelId, cwd) => {
    updatePanel(set, panelId, () => ({ pendingCwdChange: cwd }))
  },

  removePanel: (panelId) => {
    set((s) => {
      const panels = new Map(s.panels)
      panels.delete(panelId)
      return { panels }
    })
  },
}))

export type { ClaudeMessage, ClaudePanelState, ClaudePanelConfig, PermissionMode, EffortLevel }
