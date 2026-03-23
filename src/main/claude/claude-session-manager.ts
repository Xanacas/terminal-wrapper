import { spawn } from 'child_process'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs'
import { app, type WebContents } from 'electron'
import type { ClaudeSessionConfig, ClaudeSessionSummary, DockerTarget, InitializationResult, TeamToolMeta } from './types'
import { isTeamTool, extractTeamToolMeta } from './types'
import * as logger from '../logger'

// ---- InitResult cache (per cwd + docker) ----

function getCacheKey(cwd: string, docker?: { container: string }): string {
  const key = docker ? `${cwd}::docker:${docker.container}` : cwd
  // Simple hash to create a safe filename
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0
  }
  return `claude-init-${Math.abs(hash).toString(36)}.json`
}

function getInitCacheDir(): string {
  return join(app.getPath('userData'), 'claude-init-cache')
}

function saveInitResultCache(data: InitializationResult, cwd: string, docker?: { container: string }): void {
  try {
    const dir = getInitCacheDir()
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, getCacheKey(cwd, docker)), JSON.stringify(data), 'utf-8')
  } catch { /* best-effort */ }
}

export function getCachedInitResult(cwd?: string, docker?: { container: string }): InitializationResult | null {
  try {
    if (cwd) {
      const raw = readFileSync(join(getInitCacheDir(), getCacheKey(cwd, docker)), 'utf-8')
      return JSON.parse(raw) as InitializationResult
    }
    // Fallback: return any cached file (for panels without a cwd yet)
    const dir = getInitCacheDir()
    const files = readdirSync(dir).filter((f) => f.startsWith('claude-init-') && f.endsWith('.json'))
    if (files.length === 0) return null
    // Return most recently modified
    const sorted = files.map((f) => ({ f, mtime: statSync(join(dir, f)).mtimeMs })).sort((a, b) => b.mtime - a.mtime)
    const raw = readFileSync(join(dir, sorted[0].f), 'utf-8')
    return JSON.parse(raw) as InitializationResult
  } catch {
    return null
  }
}

// ---- Process spawning ----

interface SpawnOpts {
  command: string
  args: string[]
  cwd: string
  env: Record<string, string | undefined>
  signal: AbortSignal // eslint-disable-line no-undef
}

interface SpawnResult {
  stdin: NodeJS.WritableStream // eslint-disable-line no-undef
  stdout: NodeJS.ReadableStream // eslint-disable-line no-undef
  readonly killed: boolean
  readonly exitCode: number | null
  kill: (signal?: string) => boolean
  on: (...args: unknown[]) => unknown
  once: (...args: unknown[]) => unknown
  off: (...args: unknown[]) => unknown
}

function wrapChild(child: ReturnType<typeof spawn>): SpawnResult {
  child.stderr?.on('data', (data: Buffer) => {
    console.error(`[claude-sdk:stderr] ${data.toString()}`)
  })
  return {
    stdin: child.stdin!,
    stdout: child.stdout!,
    get killed() { return child.killed },
    get exitCode() { return child.exitCode },
    kill: child.kill.bind(child),
    on: child.on.bind(child),
    once: child.once.bind(child),
    off: child.off.bind(child),
  }
}

/**
 * Spawns Claude Code inside a Docker container.
 * The SDK passes args like: ["/path/to/cli.js", "--output-format", "stream-json", ...]
 * We strip the cli.js path and forward everything else to `claude` inside the container.
 */
function spawnDocker(docker: DockerTarget, opts: SpawnOpts): SpawnResult {
  // Drop any leading non-flag args (node path, cli.js path) — keep only flags and their values
  const firstFlagIdx = opts.args.findIndex((a) => a.startsWith('-'))
  const cliArgs = firstFlagIdx >= 0 ? opts.args.slice(firstFlagIdx) : []

  // Shell-escape each arg for safe embedding inside bash -c
  const escaped = cliArgs.map((a) => `'${a.replace(/'/g, "'\\''")}'`)

  const workdir = docker.workdir ?? '/workspace'
  const claudeCmd = `cd '${workdir}' && claude ${escaped.join(' ')}`

  const dockerArgs = [
    'exec', '-i',
    ...(docker.user ? ['-u', docker.user] : []),
    docker.container,
    'bash', '-c', claudeCmd,
  ]

  console.log(`[claude:docker] Spawning: docker ${dockerArgs.join(' ')}`)

  const child = spawn('docker', dockerArgs, {
    stdio: ['pipe', 'pipe', 'pipe'],
    signal: opts.signal,
    windowsHide: true,
  })

  return wrapChild(child)
}

/**
 * Spawns Claude Code locally.
 * In packaged builds: uses Electron's binary with ELECTRON_RUN_AS_NODE=1 and the unpacked cli.js.
 * In dev: returns undefined to let the SDK handle spawning itself.
 */
function spawnLocal(opts: SpawnOpts): SpawnResult {
  const asarUnpacked = join(
    app.getAppPath().replace('app.asar', 'app.asar.unpacked'),
    'node_modules',
    '@anthropic-ai',
    'claude-agent-sdk',
    'cli.js'
  )

  const fixedArgs = opts.args.map((arg) =>
    arg.includes('claude-agent-sdk') && arg.endsWith('cli.js') ? asarUnpacked : arg
  )

  const child = spawn(process.execPath, fixedArgs, {
    cwd: opts.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    signal: opts.signal,
    env: { ...opts.env, ELECTRON_RUN_AS_NODE: '1' },
    windowsHide: true,
  })

  return wrapChild(child)
}

function getSpawnClaudeCodeProcess(docker?: DockerTarget) {
  if (docker) {
    return (opts: SpawnOpts) => spawnDocker(docker, opts)
  }
  if (app.isPackaged) {
    return (opts: SpawnOpts) => spawnLocal(opts)
  }
  return undefined
}

// Cache the SDK module to avoid repeated dynamic imports
let _sdkModule: typeof import('@anthropic-ai/claude-agent-sdk') | null = null
async function getSDK() {
  if (!_sdkModule) _sdkModule = await import('@anthropic-ai/claude-agent-sdk')
  return _sdkModule
}

// Visible for testing — allows injecting a mock SDK module
export function _testResetSDKCache() { _sdkModule = null }
export function _testSetSDK(sdk: typeof import('@anthropic-ai/claude-agent-sdk')) { _sdkModule = sdk as Awaited<typeof _sdkModule> }

// SDK query type — we use generic types since the SDK is loaded dynamically
type SDKQuery = AsyncGenerator<Record<string, unknown>, void> & {
  interrupt(): Promise<void>
  streamInput(stream: AsyncIterable<Record<string, unknown>>): Promise<void>
  stopTask(taskId: string): Promise<void>
  initializationResult(): Promise<Record<string, unknown> | undefined>
  setPermissionMode(mode: string): void
  setModel(model?: string): void
  rewindFiles?(userMessageId: string, options?: { dryRun?: boolean }): Promise<{
    canRewind: boolean
    error?: string
    filesChanged?: string[]
    insertions?: number
    deletions?: number
  }>
}

export async function fetchInitializationResult(query: SDKQuery, cacheContext?: { cwd: string; docker?: { container: string } }): Promise<InitializationResult | null> {
  try {
    const data = await query.initializationResult()
    if (!data) {
      debugLog('[claude] initializationResult() returned falsy')
      return null
    }
    const result = data as unknown as InitializationResult
    debugLog('[claude] initializationResult parsed. models:', result.models?.length, 'commands:', result.commands?.length)
    if (cacheContext) {
      saveInitResultCache(result, cacheContext.cwd, cacheContext.docker)
    }
    return result
  } catch (err) {
    debugLog('[claude] initializationResult() failed:', String(err))
    return null
  }
}

interface PermissionResolver {
  resolve: (
    result:
      | { behavior: 'allow'; updatedInput: Record<string, unknown> }
      | { behavior: 'deny'; message: string }
  ) => void
  input: Record<string, unknown>
}

interface WarmQuery {
  query: SDKQuery
  abortController: AbortController // eslint-disable-line no-undef
  drainPromise: Promise<void>
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
  teamToolMeta: Map<string, TeamToolMeta>
  warmQuery?: WarmQuery
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
  config: Partial<ClaudeSessionConfig> & { cwd: string; projectName?: string; threadName?: string }
) {
  if (sessions.has(panelId)) {
    destroySession(panelId)
  }

  if (config.projectName || config.threadName) {
    logger.registerPanelContext(panelId, config.projectName ?? 'Unknown', config.threadName ?? 'Unknown')
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
      docker: config.docker,
    },
    activeQuery: null,
    abortController: null,
    sdkSessionId: undefined,
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    pendingPermissions: new Map(),
    teamToolMeta: new Map(),
  }

  sessions.set(panelId, session)
  logger.logSessionCreated(panelId, { model: session.config.model, permissionMode: session.config.permissionMode, cwd: session.config.cwd })

  // Start warm prefetch to get init data (models, commands, skills) before first message
  if (session.config.cwd) {
    prefetchInitData(panelId, session).catch((err) => {
      debugLog(`[claude:${panelId}] prefetch failed:`, String(err))
    })
  }

  return { sessionId: panelId }
}

async function prefetchInitData(panelId: string, session: ClaudeSession) {
  const sdk = await getSDK()
  const config = session.config

  // Empty async iterable — process starts but no message is sent
  // eslint-disable-next-line require-yield
  async function* emptyStream(): AsyncGenerator<Record<string, unknown>, void> {
    await new Promise(() => {}) // Block forever until abort
  }

  const abortController = new AbortController() // eslint-disable-line no-undef

  const queryInstance = sdk.query({
    prompt: emptyStream() as unknown as string,
    options: {
      abortController,
      cwd: config.cwd,
      model: config.model,
      settingSources: ['user', 'project', 'local'],
      spawnClaudeCodeProcess: getSpawnClaudeCodeProcess(config.docker),
    },
  }) as unknown as SDKQuery

  // Must drain the generator to start the process
  const drainPromise = (async () => {
    try {
      for await (const _ of queryInstance) { void _ } // drain
    } catch { /* expected when aborted */ }
  })()

  session.warmQuery = { query: queryInstance, abortController, drainPromise }

  debugLog(`[claude:${panelId}] Prefetch started for cwd=${config.cwd}`)

  const initData = await fetchInitializationResult(queryInstance, {
    cwd: config.cwd,
    docker: config.docker,
  })

  if (initData) {
    debugLog(`[claude:${panelId}] Prefetch got ${initData.models?.length} models, ${initData.commands?.length} commands`)
    send('claude:message', panelId, {
      type: 'init-result',
      data: initData,
      ts: Date.now(),
    })
  }

  // Close the warm query — it served its purpose (init data fetched and cached)
  try {
    abortController.abort()
    await drainPromise
  } catch { /* ignore */ }
  session.warmQuery = undefined
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

  logger.logUserMessage(panelId, text)

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

function debugLog(...args: unknown[]) {
  const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
  console.log(msg)
}

async function startNewQuery(
  panelId: string,
  session: ClaudeSession,
  text: string,
  images?: Array<{ base64: string; mediaType: string }>
) {
  debugLog(`[claude:${panelId}] >>> startNewQuery called`)
  const sdk = await getSDK()
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
      const inputClone = JSON.parse(JSON.stringify(input)) as Record<string, unknown>
      session.pendingPermissions.set(options.toolUseID, { resolve, input: inputClone })

      send('claude:permission-request', panelId, {
        type: 'permission-request',
        toolUseId: options.toolUseID,
        toolName,
        input,
        title: options.title,
        ts: Date.now(),
      })

      logger.logPermissionRequest(panelId, toolName, options.toolUseID, input)

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
    enableFileCheckpointing: true,
    settingSources: ['user', 'project', 'local'],
    canUseTool,
    spawnClaudeCodeProcess: getSpawnClaudeCodeProcess(config.docker),
    toolConfig: {
      askUserQuestion: { previewFormat: 'html' },
    },
    agentProgressSummaries: true,
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
  debugLog(`[claude:${panelId}] >>> query created, calling processQuery. Has initializationResult:`, typeof queryInstance.initializationResult)

  processQuery(panelId, session).catch((err) => {
    console.error(`[claude:${panelId}] processQuery error:`, err)
  })
}

async function processQuery(panelId: string, session: ClaudeSession) {
  let sentTextLength = 0
  const sentToolUseIds = new Set<string>()
  let accumulatedAssistantText = ''
  let currentAssistantUuid: string | undefined
  // Maps tool_use_id → task_id for correlating tool calls with agents
  const toolUseToTaskId = new Map<string, string>()
  let initResultFetched = false

  const tryFetchInitResult = () => {
    if (initResultFetched || !session.activeQuery) return
    initResultFetched = true
    debugLog(`[claude:${panelId}] Calling initializationResult()...`)
    fetchInitializationResult(session.activeQuery, { cwd: session.config.cwd, docker: session.config.docker }).then((initData) => {
      debugLog(`[claude:${panelId}] initializationResult() returned:`, initData ? `${initData.models?.length ?? 0} models, ${initData.commands?.length ?? 0} commands` : 'null')
      if (initData) {
        debugLog(`[claude:${panelId}] About to send init-result IPC`)
        send('claude:message', panelId, {
          type: 'init-result',
          data: initData,
          ts: Date.now(),
        })
        debugLog(`[claude:${panelId}] init-result IPC sent`)
      }
    }).catch((err) => {
      debugLog(`[claude:${panelId}] initResult .then() error:`, String(err))
    })
  }

  // Try immediately (may resolve after SDK process initializes)
  tryFetchInitResult()

  try {
    for await (const message of session.activeQuery!) {
      const msg = message as Record<string, unknown>

      // Retry after first message if initial call hasn't resolved yet
      if (!initResultFetched) tryFetchInitResult()

      if (msg.type === 'assistant') {
        currentAssistantUuid = (msg.uuid as string) || undefined
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
                  sdkUuid: currentAssistantUuid,
                  ts: Date.now(),
                })
                sentTextLength = textSoFar.length
              }

              send('claude:message', panelId, {
                type: 'tool-use',
                toolUseId: toolId,
                toolName: block.name as string,
                input: block.input,
                sdkUuid: currentAssistantUuid,
                ts: Date.now(),
              })

              logger.logToolUse(panelId, block.name as string, toolId, block.input)

              // Track team metadata from team-related tool calls
              const toolName = block.name as string
              if (isTeamTool(toolName)) {
                const meta = extractTeamToolMeta(toolName, block.input as Record<string, unknown>)
                if (meta) {
                  session.teamToolMeta.set(toolId, meta)
                  debugLog(`[claude:${panelId}] Stored team meta for toolUseId=${toolId}: ${JSON.stringify(meta)}`)
                }
              }
            }
          }
        }

        // Send text delta for new text
        if (textSoFar.length > sentTextLength) {
          send('claude:message', panelId, {
            type: 'stream-delta',
            text: textSoFar.slice(sentTextLength),
            sdkUuid: currentAssistantUuid,
            ts: Date.now(),
          })
          sentTextLength = textSoFar.length
        }
        accumulatedAssistantText = textSoFar
      } else if (msg.type === 'user') {
        // Log the full assistant text from previous turn
        if (accumulatedAssistantText) {
          // Send stream-end with the assistant's sdkUuid
          send('claude:message', panelId, {
            type: 'stream-end',
            fullText: accumulatedAssistantText,
            sdkUuid: currentAssistantUuid,
            ts: Date.now(),
          })
          logger.logAssistantText(panelId, accumulatedAssistantText)
          accumulatedAssistantText = ''
        }
        // Reset text tracking for new assistant turn
        sentTextLength = 0
        sentToolUseIds.clear()

        const userUuid = (msg.uuid as string) || undefined

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
                sdkUuid: userUuid,
                ts: Date.now(),
              })

              logger.logToolResult(panelId, (block.tool_use_id ?? '') as string, output, block.is_error === true)
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

        logger.logSessionMeta(panelId, { model: session.config.model, costUsd: session.costUsd, inputTokens: session.inputTokens, outputTokens: session.outputTokens })
      } else if (msg.type === 'system') {
        const subtype = msg.subtype as string
        if (subtype === 'local_command_output') {
          const content = msg.content as string
          if (content) {
            send('claude:message', panelId, {
              type: 'text',
              role: 'assistant',
              content,
              ts: Date.now(),
            })
          }
        } else if (subtype === 'task_started' || subtype === 'task_progress' || subtype === 'task_notification') {
          const rawUsage = msg.usage as { total_tokens: number; tool_uses: number; duration_ms: number } | undefined
          const toolUseId = msg.tool_use_id as string | undefined

          // Correlate task events with team metadata from the originating tool call
          const teamMeta = toolUseId ? session.teamToolMeta.get(toolUseId) : undefined
          debugLog(`[claude:${panelId}] ${subtype}: taskId=${msg.task_id}, taskType=${msg.task_type}, toolUseId=${toolUseId}, teamMeta=${JSON.stringify(teamMeta)}, storedMetaKeys=[${[...session.teamToolMeta.keys()].join(',')}]`)

          send('claude:message', panelId, {
            type: 'task-event',
            subtype: subtype === 'task_started' ? 'task-started'
                   : subtype === 'task_progress' ? 'task-progress'
                   : 'task-notification',
            taskId: msg.task_id as string,
            toolUseId,
            description: msg.description as string,
            taskType: msg.task_type as string | undefined,
            prompt: msg.prompt as string | undefined,
            status: msg.status as string | undefined,
            summary: msg.summary as string | undefined,
            outputFile: msg.output_file as string | undefined,
            lastToolName: msg.last_tool_name as string | undefined,
            usage: rawUsage ? {
              totalTokens: rawUsage.total_tokens,
              toolUses: rawUsage.tool_uses,
              durationMs: rawUsage.duration_ms,
            } : undefined,
            ts: Date.now(),
            // Agent teams metadata
            agentName: teamMeta?.agentName,
            agentType: teamMeta?.agentType,
            teamName: teamMeta?.teamName,
          })
        }
      } else if (msg.type === 'tool_progress') {
        // Track which tool calls belong to which task/agent
        const tpToolUseId = msg.tool_use_id as string
        const tpTaskId = msg.task_id as string | undefined
        if (tpToolUseId && tpTaskId) {
          toolUseToTaskId.set(tpToolUseId, tpTaskId)
          send('claude:message', panelId, {
            type: 'tool-agent-link',
            toolUseId: tpToolUseId,
            toolName: msg.tool_name as string,
            taskId: tpTaskId,
            ts: Date.now(),
          })
        }
      }
    }

    // Log any remaining assistant text
    if (accumulatedAssistantText) {
      logger.logAssistantText(panelId, accumulatedAssistantText)
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

    logger.logSessionEnded(panelId, 'completed')
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

    logger.logSessionEnded(panelId, isAbort ? 'interrupted' : 'error', isAbort ? undefined : err instanceof Error ? err.message : String(err))
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

export function respondToPermission(panelId: string, toolUseId: string, allowed: boolean, updatedInput?: Record<string, unknown>) {
  const session = sessions.get(panelId)
  if (!session) return

  const pending = session.pendingPermissions.get(toolUseId)
  if (!pending) return

  logger.logPermissionResponse(panelId, toolUseId, allowed)

  session.pendingPermissions.delete(toolUseId)

  if (allowed) {
    // Merge any updated fields (e.g. answers from AskUserQuestion) into the input
    const mergedInput = updatedInput ? { ...pending.input, ...updatedInput } : pending.input
    pending.resolve({ behavior: 'allow', updatedInput: mergedInput })
  } else {
    pending.resolve({ behavior: 'deny', message: 'User denied permission' })
  }
}

export function updateConfig(panelId: string, updates: Partial<ClaudeSessionConfig>) {
  const session = sessions.get(panelId)
  if (!session) return
  session.config = { ...session.config, ...updates }

  // Apply runtime changes to the active query
  if (session.activeQuery) {
    try {
      if (updates.permissionMode) {
        session.activeQuery.setPermissionMode(updates.permissionMode)
        debugLog(`[claude:${panelId}] setPermissionMode(${updates.permissionMode}) on active query`)
      }
      if (updates.model !== undefined) {
        session.activeQuery.setModel(updates.model)
        debugLog(`[claude:${panelId}] setModel(${updates.model}) on active query`)
      }
    } catch (err) {
      debugLog(`[claude:${panelId}] Failed to apply runtime config:`, String(err))
    }
  }
}

export async function listPastSessions(cwd: string): Promise<ClaudeSessionSummary[]> {
  const sdk = await getSDK()
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
  const sdk = await getSDK()
  return sdk.getSessionMessages(sessionId)
}

export function resumeSession(panelId: string, sessionId: string) {
  const session = sessions.get(panelId)
  if (!session) return
  session.sdkSessionId = sessionId
}

export function destroySession(panelId: string) {
  logger.unregisterPanelContext(panelId)
  const session = sessions.get(panelId)
  if (!session) return

  // Abort warm/prefetch query if still in-flight
  if (session.warmQuery) {
    session.warmQuery.abortController.abort()
    session.warmQuery = undefined
  }

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

export function getSessionState(panelId: string) {
  const session = sessions.get(panelId)
  if (!session) return null
  return {
    sdkSessionId: session.sdkSessionId ?? null,
    costUsd: session.costUsd,
    inputTokens: session.inputTokens,
    outputTokens: session.outputTokens,
    model: session.config.model,
    permissionMode: session.config.permissionMode,
    isActive: session.activeQuery !== null,
  }
}

export function getAllSessionIds() {
  const result: Array<{ panelId: string; sdkSessionId: string }> = []
  for (const [panelId, session] of sessions) {
    if (session.sdkSessionId) result.push({ panelId, sdkSessionId: session.sdkSessionId })
  }
  return result
}

export function destroyAll() {
  const ids = [...sessions.keys()]
  for (const panelId of ids) {
    destroySession(panelId)
  }
}

export async function stopBackgroundTask(panelId: string, taskId: string): Promise<boolean> {
  const session = sessions.get(panelId)
  if (!session?.activeQuery) return false
  try {
    await (session.activeQuery as SDKQuery).stopTask(taskId)
    return true
  } catch {
    return false
  }
}

export async function forkSessionFromPanel(
  panelId: string,
  options?: { upToMessageId?: string; title?: string }
): Promise<{ sessionId: string }> {
  const session = sessions.get(panelId)
  if (!session) throw new Error(`No session for panel ${panelId}`)
  if (!session.sdkSessionId) throw new Error(`Session ${panelId} has no SDK session ID`)

  const sdk = await getSDK()
  const result = await sdk.forkSession(session.sdkSessionId, {
    dir: session.config.cwd,
    upToMessageId: options?.upToMessageId,
    title: options?.title,
  })
  return { sessionId: result.sessionId }
}

export async function rewindFilesInSession(
  panelId: string,
  userMessageId: string,
  options?: { dryRun?: boolean }
) {
  const session = sessions.get(panelId)
  if (!session) throw new Error(`No session for panel ${panelId}`)
  if (!session.activeQuery) throw new Error(`No active query for panel ${panelId}`)

  const q = session.activeQuery as SDKQuery
  if (typeof q.rewindFiles !== 'function')
    throw new Error('rewindFiles not available (checkpointing may not be enabled)')

  return q.rewindFiles(userMessageId, options)
}

export const _testGetSession = (id: string) => sessions.get(id)
