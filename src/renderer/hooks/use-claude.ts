import { useEffect, useCallback, useRef } from 'react'
import { api } from '~/lib/ipc'
import { useClaudeStore } from '~/stores/claude-store'
import type { ClaudePanelConfig, PermissionMode } from '~/stores/claude-store'

export function useClaude(panelId: string, cwd: string) {
  const panel = useClaudeStore((s) => s.panels.get(panelId))

  const state = panel ?? {
    messages: [],
    isStreaming: false,
    currentStreamText: '',
    pendingPermissions: [] as Array<{ toolUseId: string; toolName: string; input: unknown; title?: string }>,
    sessionId: null as string | null,
    config: {
      cwd: '',
      model: 'sonnet',
      permissionMode: 'default' as PermissionMode,
      effort: 'high' as const,
      allowedTools: [] as string[],
      disallowedTools: [] as string[],
      additionalDirectories: [] as string[],
    },
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    initialized: false,
    settingsOpen: false,
    historyOpen: false,
  }

  // Track whether we're accumulating stream deltas
  const hasStreamDeltasRef = useRef(false)

  useEffect(() => {
    if (!state.initialized) {
      const store = useClaudeStore.getState()
      store.initPanel(panelId)
      // Set initial CWD from prop if not already set
      if (!state.config.cwd && cwd) {
        store.updateConfig(panelId, { cwd })
      }
    }
  }, [panelId, state.initialized, state.config.cwd, cwd])

  useEffect(() => {
    hasStreamDeltasRef.current = false

    const actions = () => useClaudeStore.getState()

    const removeMsg = api.onClaudeMessage((id, msg) => {
      if (id !== panelId) return
      const m = msg as Record<string, unknown>
      const a = actions()

      switch (m.type) {
        case 'text': {
          if (hasStreamDeltasRef.current) {
            a.endStream(panelId, m.content as string)
            hasStreamDeltasRef.current = false
          } else {
            a.addMessage(panelId, {
              id: globalThis.crypto.randomUUID(),
              type: m.role as 'user' | 'assistant',
              content: m.content as string,
              ts: m.ts as number,
            })
          }
          a.setStreaming(panelId, false)
          // When Claude finishes a text response and it's the user's turn:
          // plan mode → "action needed" (user needs to decide next steps)
          // normal mode → "waiting" (Claude expects user feedback)
          const panelForText = a.getPanel(panelId)
          a.setStatus(panelId, panelForText.config.permissionMode === 'plan' ? 'action-needed' : 'waiting')
          break
        }
        case 'stream-delta': {
          hasStreamDeltasRef.current = true
          a.setStreaming(panelId, true)
          a.appendStreamDelta(panelId, m.text as string)
          const panel = a.getPanel(panelId)
          a.setStatus(panelId, panel.config.permissionMode === 'plan' ? 'planning' : 'running')
          break
        }
        case 'stream-end':
          a.endStream(panelId, m.fullText as string)
          a.setStreaming(panelId, false)
          hasStreamDeltasRef.current = false
          break
        case 'tool-use': {
          if (hasStreamDeltasRef.current) {
            a.endStream(panelId, '')
            hasStreamDeltasRef.current = false
          }
          const toolName = m.toolName as string
          a.addMessage(panelId, {
            id: globalThis.crypto.randomUUID(),
            type: 'tool-use',
            content: '',
            toolUseId: m.toolUseId as string,
            toolName,
            toolInput: m.input,
            ts: m.ts as number,
          })
          // AskUserQuestion means Claude is asking the user something
          if (toolName === 'AskUserQuestion') {
            a.setStatus(panelId, 'action-needed')
          } else {
            const panelForTool = a.getPanel(panelId)
            a.setStatus(panelId, panelForTool.config.permissionMode === 'plan' ? 'planning' : 'running')
          }
          break
        }
        case 'tool-result':
          a.addMessage(panelId, {
            id: globalThis.crypto.randomUUID(),
            type: 'tool-result',
            content: '',
            toolUseId: m.toolUseId as string,
            toolOutput: m.output as string,
            isError: m.isError as boolean,
            ts: m.ts as number,
          })
          break
        case 'session-meta':
          a.setSessionMeta(panelId, {
            sessionId: m.sessionId as string,
            model: m.model as string,
            permissionMode: m.permissionMode as PermissionMode,
            costUsd: m.costUsd as number,
            inputTokens: m.inputTokens as number,
            outputTokens: m.outputTokens as number,
          })
          break
      }
    })

    const removePermission = api.onClaudePermissionRequest((id, msg) => {
      if (id !== panelId) return
      const m = msg as Record<string, unknown>
      const a = actions()
      a.addPermissionRequest(panelId, {
        toolUseId: m.toolUseId as string,
        toolName: m.toolName as string,
        input: m.input,
        title: m.title as string | undefined,
      })
      a.setStatus(panelId, 'action-needed')
    })

    const removeEnded = api.onClaudeSessionEnded((id, msg) => {
      if (id !== panelId) return
      const m = msg as Record<string, unknown>
      const a = actions()

      if (hasStreamDeltasRef.current) {
        a.endStream(panelId, '')
        hasStreamDeltasRef.current = false
      }

      a.setStreaming(panelId, false)
      if (m.reason === 'error' && m.error) {
        a.addMessage(panelId, {
          id: globalThis.crypto.randomUUID(),
          type: 'system',
          content: `Error: ${m.error}`,
          ts: m.ts as number,
        })
      }

      // Determine final status based on mode and reason
      const panel = a.getPanel(panelId)
      if (m.reason === 'completed' && panel.config.permissionMode === 'plan') {
        a.setStatus(panelId, 'planned')
      } else {
        a.setStatus(panelId, 'done')
      }
    })

    const removeError = api.onClaudeError((id, msg) => {
      if (id !== panelId) return
      actions().addMessage(panelId, {
        id: globalThis.crypto.randomUUID(),
        type: 'system',
        content: `Error: ${(msg as Record<string, unknown>).error}`,
        ts: (msg as Record<string, unknown>).ts as number,
      })
    })

    return () => {
      removeMsg()
      removePermission()
      removeEnded()
      removeError()
    }
  }, [panelId])

  const stateRef = useRef(state)
  stateRef.current = state

  const sendMessage = useCallback(async (text: string, images?: Array<{ base64: string; mediaType: string }>) => {
    const a = useClaudeStore.getState()
    const s = stateRef.current

    a.addMessage(panelId, {
      id: globalThis.crypto.randomUUID(),
      type: 'user',
      content: text,
      images,
      ts: Date.now(),
    })
    a.setStreaming(panelId, true)
    a.setStatus(panelId, s.config.permissionMode === 'plan' ? 'planning' : 'running')

    if (!s.sessionId) {
      await api.createClaudeSession(panelId, s.config as unknown as Record<string, unknown>)
    }

    await api.sendClaudeMessage(panelId, text, images)
  }, [panelId])

  const interrupt = useCallback(() => {
    api.interruptClaude(panelId)
    useClaudeStore.getState().setStreaming(panelId, false)
  }, [panelId])

  const approvePermission = useCallback((toolUseId: string) => {
    api.respondClaudePermission(panelId, toolUseId, true)
    const store = useClaudeStore.getState()
    store.resolvePermissionRequest(panelId, toolUseId)
    const panel = store.getPanel(panelId)
    store.setStatus(panelId, panel.config.permissionMode === 'plan' ? 'planning' : 'running')
  }, [panelId])

  const denyPermission = useCallback((toolUseId: string) => {
    api.respondClaudePermission(panelId, toolUseId, false)
    useClaudeStore.getState().resolvePermissionRequest(panelId, toolUseId)
  }, [panelId])

  const alwaysAllowTool = useCallback((toolUseId: string, toolName: string) => {
    api.respondClaudePermission(panelId, toolUseId, true)
    useClaudeStore.getState().resolvePermissionRequest(panelId, toolUseId)
    // Add tool to allowedTools
    const s = stateRef.current
    const tools = [...s.config.allowedTools]
    if (!tools.includes(toolName)) {
      tools.push(toolName)
      useClaudeStore.getState().updateConfig(panelId, { allowedTools: tools })
      api.updateClaudeConfig(panelId, { allowedTools: tools })
    }
  }, [panelId])

  const updateConfig = useCallback((updates: Partial<ClaudePanelConfig>) => {
    useClaudeStore.getState().updateConfig(panelId, updates)
    api.updateClaudeConfig(panelId, updates as Record<string, unknown>)
  }, [panelId])

  const changeCwd = useCallback(async () => {
    const folder = await api.openFolderDialog()
    if (!folder) return
    const s = stateRef.current
    if (s.sessionId) {
      // Session active — ask for confirmation
      useClaudeStore.getState().setPendingCwdChange(panelId, folder)
    } else {
      useClaudeStore.getState().updateConfig(panelId, { cwd: folder })
      api.updateClaudeConfig(panelId, { cwd: folder })
    }
  }, [panelId])

  const confirmCwdChange = useCallback(() => {
    const s = stateRef.current
    const newCwd = s.pendingCwdChange
    if (!newCwd) return
    // Destroy session + clear messages + apply new CWD
    api.destroyClaude(panelId)
    const store = useClaudeStore.getState()
    store.clearSession(panelId)
    store.updateConfig(panelId, { cwd: newCwd })
    api.updateClaudeConfig(panelId, { cwd: newCwd })
  }, [panelId])

  const cancelCwdChange = useCallback(() => {
    useClaudeStore.getState().setPendingCwdChange(panelId, null)
  }, [panelId])

  const listSessions = useCallback(async () => {
    const s = stateRef.current
    if (!s.config.cwd) return []
    return api.listClaudeSessions(s.config.cwd)
  }, [])

  const resumeSession = useCallback(async (sessionId: string) => {
    const history = await api.getClaudeSessionHistory(sessionId)
    // Map SDK session messages to our message format
    const messages = (history as Array<Record<string, unknown>>).map((m) => {
      const msgType = m.type as string
      const content = m.message as Record<string, unknown> | undefined
      let text = ''

      if (content?.content) {
        if (typeof content.content === 'string') {
          text = content.content
        } else if (Array.isArray(content.content)) {
          text = (content.content as Array<Record<string, unknown>>)
            .filter((b) => b.type === 'text')
            .map((b) => b.text as string)
            .join('\n')
        }
      }

      return {
        id: (m.uuid as string) ?? globalThis.crypto.randomUUID(),
        type: msgType as 'user' | 'assistant',
        content: text,
        ts: Date.now(),
      }
    })

    useClaudeStore.getState().loadSessionHistory(panelId, messages)
    await api.resumeClaudeSession(panelId, sessionId)
  }, [panelId])

  const toggleSettings = useCallback(() => {
    const store = useClaudeStore.getState()
    const current = store.getPanel(panelId)
    store.setSettingsOpen(panelId, !current.settingsOpen)
  }, [panelId])

  const toggleHistory = useCallback(() => {
    const store = useClaudeStore.getState()
    const current = store.getPanel(panelId)
    store.setHistoryOpen(panelId, !current.historyOpen)
  }, [panelId])

  const newSession = useCallback(() => {
    api.destroyClaude(panelId)
    useClaudeStore.getState().clearSession(panelId)
  }, [panelId])

  return {
    ...state,
    sendMessage,
    interrupt,
    approvePermission,
    denyPermission,
    alwaysAllowTool,
    updateConfig,
    changeCwd,
    confirmCwdChange,
    cancelCwdChange,
    listSessions,
    resumeSession,
    toggleSettings,
    toggleHistory,
    newSession,
  }
}
