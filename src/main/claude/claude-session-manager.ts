import type { WebContents } from 'electron'
import type { ClaudeSessionConfig, ClaudeSessionSummary } from './types'

// SDK query type — we use generic types since the SDK is loaded dynamically
type SDKQuery = AsyncGenerator<Record<string, unknown>, void> & {
  interrupt(): Promise<void>
  streamInput(stream: AsyncIterable<Record<string, unknown>>): Promise<void>
}

interface PermissionResolver {
  resolve: (
    result:
      | { behavior: 'allow'; updatedInput?: Record<string, unknown> }
      | { behavior: 'deny'; message: string }
  ) => void
}

interface ClaudeSession {
  panelId: string
  config: ClaudeSessionConfig
  activeQuery: SDKQuery | null
  abortController: AbortController | null // eslint-disable-line no-undef
  sdkSessionId?: string
  costUsd: number
  inputTokens: number
  outputTokens: number
  pendingPermissions: Map<string, PermissionResolver>
}

const sessions = new Map<string, ClaudeSession>()
let webContents: WebContents | null = null

export function setWebContents(wc: WebContents) {
  webContents = wc
}

function send(channel: string, ...args: unknown[]) {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send(channel, ...args)
  }
}

export async function createSession(
  panelId: string,
  config: Partial<ClaudeSessionConfig> & { cwd: string }
) {
  if (sessions.has(panelId)) {
    destroySession(panelId)
  }

  const session: ClaudeSession = {
    panelId,
    config: {
      cwd: config.cwd,
      model: config.model ?? 'sonnet',
      permissionMode: config.permissionMode ?? 'default',
      effort: config.effort ?? 'high',
      maxTurns: config.maxTurns,
      maxBudgetUsd: config.maxBudgetUsd,
      systemPrompt: config.systemPrompt,
      appendSystemPrompt: config.appendSystemPrompt,
      allowedTools: config.allowedTools ?? [],
      disallowedTools: config.disallowedTools ?? [],
      mcpServers: config.mcpServers,
      additionalDirectories: config.additionalDirectories ?? [],
    },
    activeQuery: null,
    abortController: null,
    sdkSessionId: undefined,
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    pendingPermissions: new Map(),
  }

  sessions.set(panelId, session)
  return { sessionId: panelId }
}

function buildUserMessage(
  text: string,
  images?: Array<{ base64: string; mediaType: string }>,
  sessionId?: string
): Record<string, unknown> {
  const content: Array<Record<string, unknown>> = []

  if (images && images.length > 0) {
    for (const img of images) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mediaType,
          data: img.base64,
        },
      })
    }
  }

  content.push({ type: 'text', text })

  return {
    type: 'user',
    message: { role: 'user', content },
    parent_tool_use_id: null,
    session_id: sessionId,
  }
}

async function* singleMessageIterable(msg: Record<string, unknown>) {
  yield msg
}

export async function sendMessage(
  panelId: string,
  text: string,
  images?: Array<{ base64: string; mediaType: string }>
) {
  const session = sessions.get(panelId)
  if (!session) throw new Error(`No session for panel ${panelId}`)

  // If a query is already running, stream the new message into it
  if (session.activeQuery) {
    const userMsg = buildUserMessage(text, images, session.sdkSessionId)
    try {
      await session.activeQuery.streamInput(singleMessageIterable(userMsg))
    } catch {
      // streamInput not supported or failed — interrupt and start new query
      try { await session.activeQuery.interrupt() } catch { /* ignore */ }
      session.activeQuery = null
      return startNewQuery(panelId, session, text, images)
    }
    return
  }

  return startNewQuery(panelId, session, text, images)
}

async function startNewQuery(
  panelId: string,
  session: ClaudeSession,
  text: string,
  images?: Array<{ base64: string; mediaType: string }>
) {
  const sdk = await import('@anthropic-ai/claude-agent-sdk')
  const config = session.config
  const abortController = new AbortController() // eslint-disable-line no-undef
  session.abortController = abortController

  const canUseTool = async (
    toolName: string,
    input: Record<string, unknown>,
    options: {
      signal: AbortSignal // eslint-disable-line no-undef
      title?: string
      toolUseID: string
      suggestions?: unknown[]
      decisionReason?: string
    }
  ) => {
    return new Promise<
      | { behavior: 'allow'; updatedInput?: Record<string, unknown> }
      | { behavior: 'deny'; message: string }
    >((resolve) => {
      session.pendingPermissions.set(options.toolUseID, { resolve })

      send('claude:permission-request', panelId, {
        type: 'permission-request',
        toolUseId: options.toolUseID,
        toolName,
        input,
        title: options.title,
        ts: Date.now(),
      })

      options.signal.addEventListener(
        'abort',
        () => {
          session.pendingPermissions.delete(options.toolUseID)
          resolve({ behavior: 'deny', message: 'Aborted' })
        },
        { once: true }
      )
    })
  }

  const queryOptions: Record<string, unknown> = {
    abortController,
    model: config.model,
    permissionMode: config.permissionMode,
    effort: config.effort,
    cwd: config.cwd,
    includePartialMessages: true,
    canUseTool,
  }

  if (config.maxTurns) queryOptions.maxTurns = config.maxTurns
  if (config.maxBudgetUsd) queryOptions.maxBudgetUsd = config.maxBudgetUsd
  if (config.allowedTools.length > 0) queryOptions.allowedTools = config.allowedTools
  if (config.disallowedTools.length > 0) queryOptions.disallowedTools = config.disallowedTools
  if (config.mcpServers) queryOptions.mcpServers = config.mcpServers
  if (config.additionalDirectories.length > 0)
    queryOptions.additionalDirectories = config.additionalDirectories
  if (session.sdkSessionId) queryOptions.resume = session.sdkSessionId

  // Build prompt — use AsyncIterable if images are present, otherwise plain string
  let prompt: unknown
  if (images && images.length > 0) {
    const userMsg = buildUserMessage(text, images, session.sdkSessionId)
    prompt = singleMessageIterable(userMsg)
  } else {
    prompt = text
  }

  const queryInstance = sdk.query({
    prompt: prompt as string,
    options: queryOptions,
  }) as unknown as SDKQuery

  session.activeQuery = queryInstance

  processQuery(panelId, session).catch((err) => {
    console.error(`[claude:${panelId}] processQuery error:`, err)
  })
}

async function processQuery(panelId: string, session: ClaudeSession) {
  let sentTextLength = 0
  const sentToolUseIds = new Set<string>()

  try {
    for await (const message of session.activeQuery!) {
      const msg = message as Record<string, unknown>

      if (msg.type === 'assistant') {
        const betaMsg = msg.message as Record<string, unknown> | undefined
        const content = betaMsg?.content as Array<Record<string, unknown>> | undefined
        if (!content) continue

        let textSoFar = ''
        for (const block of content) {
          if (block.type === 'text') {
            textSoFar += block.text as string
          } else if (block.type === 'tool_use') {
            const toolId = block.id as string
            if (!sentToolUseIds.has(toolId)) {
              sentToolUseIds.add(toolId)

              // Flush any unsent text delta before tool-use
              if (textSoFar.length > sentTextLength) {
                send('claude:message', panelId, {
                  type: 'stream-delta',
                  text: textSoFar.slice(sentTextLength),
                  ts: Date.now(),
                })
                sentTextLength = textSoFar.length
              }

              send('claude:message', panelId, {
                type: 'tool-use',
                toolUseId: toolId,
                toolName: block.name as string,
                input: block.input,
                ts: Date.now(),
              })
            }
          }
        }

        // Send text delta for new text
        if (textSoFar.length > sentTextLength) {
          send('claude:message', panelId, {
            type: 'stream-delta',
            text: textSoFar.slice(sentTextLength),
            ts: Date.now(),
          })
          sentTextLength = textSoFar.length
        }
      } else if (msg.type === 'user') {
        // Reset text tracking for new assistant turn
        sentTextLength = 0
        sentToolUseIds.clear()

        // Process tool results from the user message
        const userMsg = msg.message as Record<string, unknown> | undefined
        const content = userMsg?.content
        if (Array.isArray(content)) {
          for (const block of content as Array<Record<string, unknown>>) {
            if (block.type === 'tool_result') {
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

              send('claude:message', panelId, {
                type: 'tool-result',
                toolUseId: (block.tool_use_id ?? '') as string,
                output,
                isError: block.is_error === true,
                ts: Date.now(),
              })
            }
          }
        }
      } else if (msg.type === 'result') {
        const sessionId = msg.session_id as string
        if (sessionId) session.sdkSessionId = sessionId

        session.costUsd = (msg.total_cost_usd ?? 0) as number
        const usage = msg.usage as Record<string, unknown> | undefined
        session.inputTokens = (usage?.input_tokens ?? 0) as number
        session.outputTokens = (usage?.output_tokens ?? 0) as number

        send('claude:message', panelId, {
          type: 'session-meta',
          sessionId: session.sdkSessionId ?? panelId,
          model: session.config.model,
          permissionMode: session.config.permissionMode,
          costUsd: session.costUsd,
          inputTokens: session.inputTokens,
          outputTokens: session.outputTokens,
          ts: Date.now(),
        })
      }
    }

    // Query completed normally
    send('claude:session-ended', panelId, {
      type: 'session-ended',
      reason: 'completed',
      costUsd: session.costUsd,
      inputTokens: session.inputTokens,
      outputTokens: session.outputTokens,
      ts: Date.now(),
    })
  } catch (err) {
    const isAbort =
      err instanceof Error &&
      (err.name === 'AbortError' || session.abortController?.signal.aborted)

    send('claude:session-ended', panelId, {
      type: 'session-ended',
      reason: isAbort ? 'interrupted' : 'error',
      error: isAbort ? undefined : err instanceof Error ? err.message : String(err),
      costUsd: session.costUsd,
      inputTokens: session.inputTokens,
      outputTokens: session.outputTokens,
      ts: Date.now(),
    })
  } finally {
    session.activeQuery = null
    session.abortController = null
  }
}

export function interruptSession(panelId: string) {
  const session = sessions.get(panelId)
  if (!session) return

  if (session.activeQuery) {
    session.activeQuery.interrupt().catch(() => {})
  }
  if (session.abortController) {
    session.abortController.abort()
  }
}

export function respondToPermission(panelId: string, toolUseId: string, allowed: boolean) {
  const session = sessions.get(panelId)
  if (!session) return

  const pending = session.pendingPermissions.get(toolUseId)
  if (!pending) return

  session.pendingPermissions.delete(toolUseId)

  if (allowed) {
    pending.resolve({ behavior: 'allow' })
  } else {
    pending.resolve({ behavior: 'deny', message: 'User denied permission' })
  }
}

export function updateConfig(panelId: string, updates: Partial<ClaudeSessionConfig>) {
  const session = sessions.get(panelId)
  if (!session) return
  session.config = { ...session.config, ...updates }
}

export async function listPastSessions(cwd: string): Promise<ClaudeSessionSummary[]> {
  const sdk = await import('@anthropic-ai/claude-agent-sdk')
  const results = await sdk.listSessions({ dir: cwd })
  return results.map((s) => ({
    sessionId: s.sessionId,
    summary: s.summary,
    lastModified: s.lastModified,
    firstPrompt: s.firstPrompt,
    cwd: s.cwd,
    createdAt: s.createdAt,
  }))
}

export async function getSessionHistory(sessionId: string) {
  const sdk = await import('@anthropic-ai/claude-agent-sdk')
  return sdk.getSessionMessages(sessionId)
}

export function resumeSession(panelId: string, sessionId: string) {
  const session = sessions.get(panelId)
  if (!session) return
  session.sdkSessionId = sessionId
}

export function destroySession(panelId: string) {
  const session = sessions.get(panelId)
  if (!session) return

  if (session.activeQuery) {
    session.activeQuery.interrupt().catch(() => {})
  }
  if (session.abortController) {
    session.abortController.abort()
  }

  // Reject all pending permissions
  for (const [, pending] of session.pendingPermissions) {
    pending.resolve({ behavior: 'deny', message: 'Session destroyed' })
  }
  session.pendingPermissions.clear()

  sessions.delete(panelId)
}

export function destroyAll() {
  const ids = [...sessions.keys()]
  for (const panelId of ids) {
    destroySession(panelId)
  }
}
