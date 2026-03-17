// ---- Claude types ----

export type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions' | 'dontAsk'

export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

export interface McpServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
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
}

export interface ClaudeSessionSummary {
  sessionId: string
  summary: string
  lastModified: number
  firstPrompt?: string
  cwd?: string
  createdAt?: number
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
  ts: number
}

export interface ClaudeStreamEnd {
  type: 'stream-end'
  fullText: string
  ts: number
}

export interface ClaudeToolUseMessage {
  type: 'tool-use'
  toolUseId: string
  toolName: string
  input: unknown
  ts: number
}

export interface ClaudeToolResultMessage {
  type: 'tool-result'
  toolUseId: string
  output: string
  isError: boolean
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
