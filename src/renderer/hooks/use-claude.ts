import { useEffect, useCallback, useRef } from 'react'
import { api } from '~/lib/ipc'
import { subscribeClaudePanel } from '~/lib/claude-ipc'
import { useClaudeStore } from '~/stores/claude-store'
import { useAppStore } from '~/stores/app-store'
import { updateLeafInTree, collectLeafPanels } from '~/lib/panel-utils'
import type { ClaudePanelConfig, ClaudeMessage, PermissionMode } from '~/stores/claude-store'

const TEAMMATE_TASK_TYPES = new Set(['in_process_teammate', 'external_teammate', 'tmux_teammate'])
function isTeammateTask(taskType?: string, hasAgentMeta?: boolean) {
  // If we have correlated agent metadata from an Agent/SendMessage tool call, it's a teammate
  if (hasAgentMeta) return true
  if (taskType) {
    if (TEAMMATE_TASK_TYPES.has(taskType)
      || taskType.includes('teammate')
      || taskType.includes('subagent')
      || taskType.includes('agent')) return true
  }
  return false
}

// Parse agent name from summary like: Agent "TypeScript type check" completed
function parseAgentNameFromSummary(summary?: string) {
  if (!summary) return undefined
  const match = summary.match(/^Agent "(.+?)"/)
  return match?.[1]
}

// SDK-internal XML tags that should be stripped from displayed text during session restore
const SDK_INTERNAL_XML_RE = /<(?:task-notification|task-started|task-progress|teammate-message|teammate-idle|shutdown-approved|teammate-terminated)\b[^]*?<\/(?:task-notification|task-started|task-progress|teammate-message|teammate-idle|shutdown-approved|teammate-terminated)>/g
const SDK_TRANSCRIPT_RE = /Full transcript available at: \S+/g

function stripSdkInternalXml(text: string) {
  return text
    .replace(SDK_INTERNAL_XML_RE, '')
    .replace(SDK_TRANSCRIPT_RE, '')
    .trim()
}

export function mapHistoryToMessages(history: unknown[]): ClaudeMessage[] {
  const result: ClaudeMessage[] = []

  for (const m of history as Array<Record<string, unknown>>) {
    const msgType = m.type as string
    // Skip system/result messages during restore — they're not user-visible
    if (msgType === 'system' || msgType === 'result') continue

    const sdkUuid = (m.uuid as string) || undefined
    const content = m.message as Record<string, unknown> | undefined
    const contentBlocks = content?.content

    if (typeof contentBlocks === 'string') {
      const text = stripSdkInternalXml(contentBlocks)
      if (text) {
        result.push({ id: sdkUuid ?? globalThis.crypto.randomUUID(), type: msgType as 'user' | 'assistant', content: text, sdkUuid, ts: Date.now() })
      }
      continue
    }

    if (!Array.isArray(contentBlocks)) continue

    // Process each content block — text, tool_use, tool_result
    let textParts: string[] = []

    const flushText = () => {
      const joined = stripSdkInternalXml(textParts.join('\n'))
      if (joined) {
        result.push({ id: sdkUuid ?? globalThis.crypto.randomUUID(), type: msgType as 'user' | 'assistant', content: joined, sdkUuid, ts: Date.now() })
      }
      textParts = []
    }

    for (const block of contentBlocks as Array<Record<string, unknown>>) {
      if (block.type === 'text') {
        textParts.push(block.text as string)
      } else if (block.type === 'tool_use') {
        flushText()
        result.push({
          id: (block.id as string) ?? globalThis.crypto.randomUUID(),
          type: 'tool-use',
          content: '',
          toolUseId: block.id as string,
          toolName: block.name as string,
          toolInput: block.input,
          sdkUuid,
          ts: Date.now(),
        })
      } else if (block.type === 'tool_result') {
        flushText()
        let output: string
        const blockContent = block.content
        if (typeof blockContent === 'string') {
          output = blockContent
        } else if (Array.isArray(blockContent)) {
          output = (blockContent as Array<Record<string, unknown>>)
            .map((c) => (c.type === 'text' ? (c.text as string) : JSON.stringify(c)))
            .join('\n')
        } else {
          output = blockContent ? JSON.stringify(blockContent) : ''
        }
        result.push({
          id: globalThis.crypto.randomUUID(),
          type: 'tool-result',
          content: '',
          toolUseId: (block.tool_use_id ?? '') as string,
          toolOutput: output,
          isError: block.is_error === true,
          sdkUuid,
          ts: Date.now(),
        })
      }
    }

    flushText()
  }

  return result
}

export type ForkDestination = 'tab' | 'split-right' | 'split-down' | 'new-thread'

export function getForkDestinations(hasDevContainer: boolean): ForkDestination[] {
  const dests: ForkDestination[] = ['tab', 'split-right', 'split-down']
  if (!hasDevContainer) dests.push('new-thread')
  return dests
}

function persistClaudeSessionId(panelId: string, sessionId: string) {
  const appState = useAppStore.getState()
  for (const project of appState.projects) {
    for (const thread of project.threads) {
      for (const tab of thread.tabs) {
        const found = collectLeafPanels(tab.panel).find((l) => l.id === panelId)
        if (found) {
          const newRoot = updateLeafInTree(tab.panel, panelId, { claudeSessionId: sessionId || undefined })
          const newTabs = thread.tabs.map((t) => (t.id === tab.id ? { ...t, panel: newRoot } : t))
          const newThreads = project.threads.map((t) => (t.id === thread.id ? { ...t, tabs: newTabs } : t))
          appState.updateProject(project.id, { threads: newThreads })
          return
        }
      }
    }
  }
}

export function getPersistedSessionId(panelId: string): string | null {
  const appState = useAppStore.getState()
  for (const project of appState.projects) {
    for (const thread of project.threads) {
      for (const tab of thread.tabs) {
        const leaf = collectLeafPanels(tab.panel).find((l) => l.id === panelId)
        if (leaf?.claudeSessionId) return leaf.claudeSessionId
      }
    }
  }
  return null
}

const restoreInFlight = new Set<string>()

async function restoreSession(panelId: string) {
  if (restoreInFlight.has(panelId)) return
  restoreInFlight.add(panelId)

  try {
    const store = useClaudeStore.getState()

    // PATH 1: Hot reload — main process may still have the session
    try {
      const mainState = await api.getClaudeSessionState(panelId)
      if (mainState?.sdkSessionId) {
        store.setRestoreStatus(panelId, 'restoring')
        const history = await api.getClaudeSessionHistory(mainState.sdkSessionId)
        const messages = mapHistoryToMessages(history)
        store.loadSessionHistory(panelId, messages, mainState.sdkSessionId)
        store.setSessionMeta(panelId, {
          sessionId: mainState.sdkSessionId,
          model: mainState.model,
          permissionMode: mainState.permissionMode as PermissionMode,
          costUsd: mainState.costUsd,
          inputTokens: mainState.inputTokens,
          outputTokens: mainState.outputTokens,
        })
        store.setStatus(panelId, mainState.isActive ? 'running' : 'done')
        store.setRestoreStatus(panelId, 'restored')
        return
      }
    } catch {
      // Fall through to path 2
    }

    // PATH 2: Full restart — read claudeSessionId from persisted panel
    const persistedId = getPersistedSessionId(panelId)
    if (!persistedId) {
      store.setRestoreStatus(panelId, 'none')
      return
    }

    store.setRestoreStatus(panelId, 'restoring')
    try {
      const history = await api.getClaudeSessionHistory(persistedId)
      const messages = mapHistoryToMessages(history)
      store.loadSessionHistory(panelId, messages, persistedId)
      // Create backend session + set resume ID
      const panelConfig = store.getPanel(panelId).config
      const project = useAppStore.getState().getActiveProject()
      const thread = project?.threads.find((t) => t.id === project.activeThreadId)
      await api.createClaudeSession(panelId, {
        ...(panelConfig as unknown as Record<string, unknown>),
        projectName: project?.name ?? 'Unknown',
        threadName: thread?.name ?? 'Unknown',
      })
      await api.resumeClaudeSession(panelId, persistedId)
      store.setStatus(panelId, 'done')
      store.setRestoreStatus(panelId, 'restored')
    } catch (err) {
      store.setRestoreStatus(panelId, 'error', err instanceof Error ? err.message : 'Failed to restore session')
    }
  } finally {
    restoreInFlight.delete(panelId)
  }
}

export function useClaude(panelId: string, cwd: string) {
  const panel = useClaudeStore((s) => s.panels.get(panelId))
  const projectClaudeConfig = useAppStore((s) => {
    const p = s.projects.find((proj) => proj.id === s.activeProjectId)
    return p?.claudeConfig
  })
  const activeThreadDevContainer = useAppStore((s) => {
    const p = s.projects.find((proj) => proj.id === s.activeProjectId)
    const thread = p?.threads.find((t) => t.id === p.activeThreadId)
    return thread?.devContainer
  })
  const devContainerGlobal = useAppStore((s) => s.devContainerGlobal)

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
    restoreStatus: 'none' as const,
    restoreError: undefined as string | undefined,
    initResult: null as import('../../main/claude/types').InitializationResult | null,
    backgroundTasks: new Map() as Map<string, import('~/stores/claude-store').BackgroundTask>,
  }

  // Track whether we're accumulating stream deltas
  const hasStreamDeltasRef = useRef(false)

  useEffect(() => {
    if (!state.initialized) {
      const store = useClaudeStore.getState()
      store.initPanel(panelId)
      // Load cached init result for instant availability
      api.getCachedClaudeInitResult(cwd).then((cached) => {
        if (cached) {
          useClaudeStore.getState().setInitResult(panelId, cached as import('../../main/claude/types').InitializationResult)
        }
      })
      // Apply project-level Claude defaults
      const defaults: Partial<ClaudePanelConfig> = {}
      if (!state.config.cwd && cwd) defaults.cwd = cwd
      if (projectClaudeConfig?.model) defaults.model = projectClaudeConfig.model as ClaudePanelConfig['model']
      if (projectClaudeConfig?.permissionMode) defaults.permissionMode = projectClaudeConfig.permissionMode as PermissionMode
      if (projectClaudeConfig?.effort) defaults.effort = projectClaudeConfig.effort as ClaudePanelConfig['effort']
      // Thread-level devContainer overrides project-level Docker config
      if (activeThreadDevContainer) {
        defaults.docker = {
          container: `${activeThreadDevContainer.containerName}-app-1`,
          user: devContainerGlobal?.defaultUser ?? 'node',
          workdir: devContainerGlobal?.defaultWorkdir ?? '/workspace',
        }
      } else if (projectClaudeConfig?.docker) {
        defaults.docker = projectClaudeConfig.docker
      }
      if (Object.keys(defaults).length > 0) store.updateConfig(panelId, defaults)

      // Restore previous session if available
      restoreSession(panelId)
    }
  }, [panelId, state.initialized, state.config.cwd, cwd, projectClaudeConfig, activeThreadDevContainer, devContainerGlobal])

  // Clean up panel state on unmount
  useEffect(() => {
    return () => {
      useClaudeStore.getState().removePanel(panelId)
    }
  }, [panelId])

  useEffect(() => {
    hasStreamDeltasRef.current = false

    const actions = () => useClaudeStore.getState()

    return subscribeClaudePanel(panelId, {
      onMessage: (_id, msg) => {
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
            a.endStream(panelId, m.fullText as string, m.sdkUuid as string | undefined)
            a.setStreaming(panelId, false)
            hasStreamDeltasRef.current = false
            break
          case 'tool-use': {
            if (hasStreamDeltasRef.current) {
              a.endStream(panelId, '')
              hasStreamDeltasRef.current = false
            }
            const toolName = m.toolName as string
            const toolUseId = m.toolUseId as string
            a.addMessage(panelId, {
              id: globalThis.crypto.randomUUID(),
              type: 'tool-use',
              content: '',
              toolUseId,
              toolName,
              toolInput: m.input,
              sdkUuid: m.sdkUuid as string | undefined,
              ts: m.ts as number,
            })
            // If this tool belongs to an agent, add it to the agent's tool calls
            // tool-agent-link may not have arrived yet, so also store as pending
            const toolCallEntry = { toolUseId, toolName, input: m.input, ts: m.ts as number }
            const ownerTaskId = a.getPanel(panelId).toolUseToTaskId.get(toolUseId)
            if (ownerTaskId) {
              a.addToolCallToTask(panelId, ownerTaskId, toolCallEntry)
            } else {
              // Store as pending — will be linked when tool-agent-link arrives
              const panel = a.getPanel(panelId)
              const pendingToolCalls = new Map(panel.pendingToolCalls)
              pendingToolCalls.set(toolUseId, toolCallEntry)
              // Direct state update for pending (no dedicated action needed, use updatePanel pattern)
              useClaudeStore.setState((s) => {
                const panels = new Map(s.panels)
                const p = panels.get(panelId)
                if (p) panels.set(panelId, { ...p, pendingToolCalls })
                return { panels }
              })
            }
            if (toolName === 'AskUserQuestion') {
              a.setStatus(panelId, 'action-needed')
            } else {
              const panelForTool = a.getPanel(panelId)
              a.setStatus(panelId, panelForTool.config.permissionMode === 'plan' ? 'planning' : 'running')
            }
            break
          }
          case 'tool-result': {
            const resultToolUseId = m.toolUseId as string
            a.addMessage(panelId, {
              id: globalThis.crypto.randomUUID(),
              type: 'tool-result',
              content: '',
              toolUseId: resultToolUseId,
              toolOutput: m.output as string,
              isError: m.isError as boolean,
              sdkUuid: m.sdkUuid as string | undefined,
              ts: m.ts as number,
            })
            // Add result to the agent's tool call if it belongs to one
            const resultOwnerTaskId = a.getPanel(panelId).toolUseToTaskId.get(resultToolUseId)
            if (resultOwnerTaskId) {
              a.addToolResultToTask(panelId, resultOwnerTaskId, resultToolUseId, m.output as string, m.isError as boolean)
            } else {
              // Update pending tool call with result data so retroactive linking includes it
              const pendingTc = a.getPanel(panelId).pendingToolCalls.get(resultToolUseId)
              if (pendingTc) {
                useClaudeStore.setState((s) => {
                  const panels = new Map(s.panels)
                  const p = panels.get(panelId)
                  if (p) {
                    const pending = new Map(p.pendingToolCalls)
                    pending.set(resultToolUseId, { ...pendingTc, output: m.output as string, isError: m.isError as boolean })
                    panels.set(panelId, { ...p, pendingToolCalls: pending })
                  }
                  return { panels }
                })
              }
            }
            break
          }
          case 'tool-agent-link':
            a.linkToolToTask(panelId, m.toolUseId as string, m.taskId as string)
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
            persistClaudeSessionId(panelId, m.sessionId as string)
            break
          case 'init-result':
            a.setInitResult(panelId, m.data as import('../../main/claude/types').InitializationResult)
            break
          case 'task-event': {
            const subtype = m.subtype as string
            if (subtype === 'task-started') {
              const taskType = m.taskType as string | undefined
              const agentName = m.agentName as string | undefined
              const agentType = m.agentType as string | undefined
              const teamName = m.teamName as string | undefined
              const hasAgentMeta = !!(agentName || agentType || teamName)
              console.log('[agent-teams] task-started:', { taskId: m.taskId, taskType, agentName, agentType, teamName, hasAgentMeta, toolUseId: m.toolUseId })
              a.startTask(panelId, {
                taskId: m.taskId as string,
                description: m.description as string,
                taskType,
                prompt: m.prompt as string | undefined,
                toolUseId: m.toolUseId as string | undefined,
                ts: m.ts as number,
                agentName,
                agentType,
                teamName,
                isTeammate: isTeammateTask(taskType, hasAgentMeta),
              })
            } else if (subtype === 'task-progress') {
              const progressSummary = m.summary as string | undefined
              // Check if we can retroactively detect this as a teammate from summary
              const existingTask = a.getPanel(panelId).backgroundTasks.get(m.taskId as string)
              if (existingTask && !existingTask.isTeammate) {
                const parsedName = parseAgentNameFromSummary(progressSummary)
                if (parsedName) {
                  a.markTaskAsTeammate(panelId, m.taskId as string, parsedName)
                }
              }
              a.updateTaskProgress(panelId, m.taskId as string, {
                description: m.description as string,
                summary: progressSummary,
                lastToolName: m.lastToolName as string | undefined,
                usage: m.usage as { totalTokens: number; toolUses: number; durationMs: number } | undefined,
              })
            } else if (subtype === 'task-notification') {
              const summary = m.summary as string
              // If task wasn't detected as teammate on start, check the summary
              const existing = a.getPanel(panelId).backgroundTasks.get(m.taskId as string)
              if (existing && !existing.isTeammate) {
                const parsedName = parseAgentNameFromSummary(summary)
                if (parsedName) {
                  a.markTaskAsTeammate(panelId, m.taskId as string, parsedName)
                }
              }
              a.completeTask(panelId, m.taskId as string, {
                status: m.status as 'completed' | 'failed' | 'stopped',
                summary,
                outputFile: m.outputFile as string | undefined,
                usage: m.usage as { totalTokens: number; toolUses: number; durationMs: number } | undefined,
              })
              if (document.hidden) {
                new Notification('Task finished', { body: summary })
              }
            }
            break
          }
        }
      },

      onPermission: (_id, msg) => {
        const m = msg as Record<string, unknown>
        const a = actions()
        a.addPermissionRequest(panelId, {
          toolUseId: m.toolUseId as string,
          toolName: m.toolName as string,
          input: m.input,
          title: m.title as string | undefined,
        })
        a.setStatus(panelId, 'action-needed')
      },

      onEnded: (_id, msg) => {
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

        const panelForTasks = a.getPanel(panelId)
        for (const [taskId, task] of panelForTasks.backgroundTasks) {
          if (task.status === 'running') {
            a.completeTask(panelId, taskId, { status: 'stopped', summary: 'Session ended' })
          }
        }

        const panel = a.getPanel(panelId)
        if (m.reason === 'completed' && panel.config.permissionMode === 'plan') {
          a.setStatus(panelId, 'planned')
        } else {
          a.setStatus(panelId, 'done')
        }
      },

      onError: (_id, msg) => {
        actions().addMessage(panelId, {
          id: globalThis.crypto.randomUUID(),
          type: 'system',
          content: `Error: ${(msg as Record<string, unknown>).error}`,
          ts: (msg as Record<string, unknown>).ts as number,
        })
      },
    })
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

    try {
      if (!s.sessionId) {
        const project = useAppStore.getState().getActiveProject()
        const thread = project?.threads.find((t) => t.id === project.activeThreadId)
        const sessionConfig = {
          ...(s.config as unknown as Record<string, unknown>),
          projectName: project?.name ?? 'Unknown',
          threadName: thread?.name ?? 'Unknown',
        }
        await api.createClaudeSession(panelId, sessionConfig)
      }

      await api.sendClaudeMessage(panelId, text, images)
    } catch (err) {
      a.setStreaming(panelId, false)
      a.setStatus(panelId, 'done')
      a.addMessage(panelId, {
        id: globalThis.crypto.randomUUID(),
        type: 'system',
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        ts: Date.now(),
      })
    }
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

  const approveWithAnswers = useCallback((toolUseId: string, answers: Record<string, string>) => {
    api.respondClaudePermission(panelId, toolUseId, true, { answers })
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
    persistClaudeSessionId(panelId, '')
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
    try {
      const s = stateRef.current
      const history = await api.getClaudeSessionHistory(sessionId)
      const messages = mapHistoryToMessages(history)
      useClaudeStore.getState().loadSessionHistory(panelId, messages, sessionId)
      // Create a backend session first, then set the resume ID on it
      await api.createClaudeSession(panelId, s.config as unknown as Record<string, unknown>)
      await api.resumeClaudeSession(panelId, sessionId)
    } catch (err) {
      const a = useClaudeStore.getState()
      a.setStatus(panelId, 'done')
      a.addMessage(panelId, {
        id: globalThis.crypto.randomUUID(),
        type: 'system',
        content: `Failed to resume session: ${err instanceof Error ? err.message : String(err)}`,
        ts: Date.now(),
      })
    }
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
    persistClaudeSessionId(panelId, '')
  }, [panelId])

  const stopTask = useCallback((taskId: string) => {
    api.stopClaudeTask(panelId, taskId)
  }, [panelId])

  return {
    ...state,
    restoreStatus: state.restoreStatus,
    restoreError: state.restoreError,
    sendMessage,
    interrupt,
    approvePermission,
    approveWithAnswers,
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
    stopTask,
  }
}
