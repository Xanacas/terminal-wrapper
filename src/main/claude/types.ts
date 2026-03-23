// ---- Claude types ----

export type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions' | 'dontAsk'

export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

export interface McpServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
}

export interface DockerTarget {
  container: string
  user?: string
  workdir?: string
}

export interface ClaudeSessionConfig {
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
  mcpServers?: Record<string, McpServerConfig>
  additionalDirectories: string[]
  docker?: DockerTarget
}

export interface ClaudeSessionSummary {
  sessionId: string
  summary: string
  lastModified: number
  firstPrompt?: string
  cwd?: string
  createdAt?: number
}

// ---- SDK initialization types ----

export interface ModelInfo {
  value: string
  displayName: string
  description: string
  supportsEffort?: boolean
  supportedEffortLevels?: EffortLevel[]
  supportsAdaptiveThinking?: boolean
  supportsFastMode?: boolean
  supportsAutoMode?: boolean
}

export interface SlashCommand {
  name: string
  description: string
  argumentHint: string
}

export interface AgentInfo {
  name: string
  description: string
  model?: string
}

export interface AccountInfo {
  email?: string
  organization?: string
  subscriptionType?: string
  tokenSource?: string
  apiKeySource?: string
  apiProvider?: 'firstParty' | 'bedrock' | 'vertex' | 'foundry'
}

export type FastModeState = 'off' | 'cooldown' | 'on'

export interface InitializationResult {
  commands: SlashCommand[]
  agents: AgentInfo[]
  models: ModelInfo[]
  account: AccountInfo
  output_style: string
  available_output_styles: string[]
  fast_mode_state?: FastModeState
}

// ---- IPC message types (main → renderer) ----

export interface ClaudeTextMessage {
  type: 'text'
  role: 'user' | 'assistant'
  content: string
  ts: number
}

export interface ClaudeStreamDelta {
  type: 'stream-delta'
  text: string
  sdkUuid?: string
  ts: number
}

export interface ClaudeStreamEnd {
  type: 'stream-end'
  fullText: string
  sdkUuid?: string
  ts: number
}

export interface ClaudeToolUseMessage {
  type: 'tool-use'
  toolUseId: string
  toolName: string
  input: unknown
  sdkUuid?: string
  ts: number
}

export interface ClaudeToolResultMessage {
  type: 'tool-result'
  toolUseId: string
  output: string
  isError: boolean
  sdkUuid?: string
  ts: number
}

export interface ClaudePermissionRequest {
  type: 'permission-request'
  toolUseId: string
  toolName: string
  input: unknown
  title?: string
  ts: number
}

export interface ClaudeSessionMeta {
  type: 'session-meta'
  sessionId: string
  model: string
  permissionMode: PermissionMode
  costUsd: number
  inputTokens: number
  outputTokens: number
  ts: number
}

export interface ClaudeSessionEnded {
  type: 'session-ended'
  reason: 'completed' | 'error' | 'interrupted'
  error?: string
  costUsd: number
  inputTokens: number
  outputTokens: number
  ts: number
}

export interface ClaudeError {
  type: 'error'
  error: string
  ts: number
}

export interface ClaudeTaskEvent {
  type: 'task-event'
  subtype: 'task-started' | 'task-progress' | 'task-notification'
  taskId: string
  toolUseId?: string
  description: string
  taskType?: string
  prompt?: string
  status?: 'completed' | 'failed' | 'stopped'
  summary?: string
  outputFile?: string
  lastToolName?: string
  usage?: { totalTokens: number; toolUses: number; durationMs: number }
  ts: number
}

export interface ClaudeInitResultMessage {
  type: 'init-result'
  data: InitializationResult
  ts: number
}

export type ClaudeIpcMessage =
  | ClaudeTextMessage
  | ClaudeStreamDelta
  | ClaudeStreamEnd
  | ClaudeToolUseMessage
  | ClaudeToolResultMessage
  | ClaudePermissionRequest
  | ClaudeSessionMeta
  | ClaudeSessionEnded
  | ClaudeError
  | ClaudeTaskEvent
  | ClaudeInitResultMessage
