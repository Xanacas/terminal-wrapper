# Claude Agent SDK — Complete API Reference

**Package:** `@anthropic-ai/claude-agent-sdk` (v0.2.77)

---

## Core Functions

| | Function | Description |
|---|---|---|
| [ ] | `query({ prompt, options? })` | Primary function to interact with Claude Code. Returns an async generator (`Query`) that streams `SDKMessage` events. Accepts a string prompt or `AsyncIterable<SDKUserMessage>` for streaming input mode. |
| [ ] | `tool(name, description, inputSchema, handler, extras?)` | Creates a type-safe MCP tool definition (`SdkMcpToolDefinition<Schema>`) for use with SDK MCP servers. Accepts Zod 3/4 schemas for input validation. |
| [ ] | `createSdkMcpServer({ name, version?, tools? })` | Creates an in-process MCP server instance. Returns a `McpSdkServerConfigWithInstance` that can be passed directly to `options.mcpServers`. |
| [ ] | `listSessions(options?: ListSessionsOptions)` | Discovers and lists past sessions with light metadata (`SDKSessionInfo[]`). Filter by `dir`, `limit`, or `includeWorktrees`. Sorted by `lastModified` descending. |
| [ ] | `getSessionMessages(sessionId, options?)` | Reads user and assistant messages (`SessionMessage[]`) from a past session transcript. Supports `dir`, `limit`, and `offset`. |
| [ ] | `getSessionInfo(sessionId, options?)` | Returns metadata (`SDKSessionInfo \| undefined`) for a specific session by ID. |
| [ ] | `forkSession(sessionId, options?)` | Forks an existing session into a new one, returning a `ForkSessionResult`. |
| [ ] | `renameSession(sessionId, title, options?)` | Renames an existing session by setting a custom title. |
| [ ] | `tagSession(sessionId, tag, options?)` | Tags an existing session with a string label, or removes the tag by passing `null`. |

---

## V2 Preview API (Unstable)

| | Function | Description |
|---|---|---|
| [ ] | `unstable_v2_createSession(options: SDKSessionOptions)` | Creates a new multi-turn `SDKSession` using the simplified V2 interface. Supports `send()`/`stream()` patterns and `await using` for auto-cleanup. |
| [ ] | `unstable_v2_resumeSession(sessionId, options)` | Resumes an existing session by ID using the V2 interface. Useful for long-running workflows or persisting conversations across restarts. |
| [ ] | `unstable_v2_prompt(prompt, options)` | One-shot convenience function for single-turn queries. Sends a prompt and returns the final `SDKResultMessage` directly. |

---

## Query Interface (returned by `query()`)

| | Method | Description |
|---|---|---|
| [ ] | `[AsyncGenerator]` — `for await (const msg of query)` | Iterate over streamed `SDKMessage` events. The `Query` extends `AsyncGenerator<SDKMessage, void>`. |
| [ ] | `query.interrupt()` | Interrupts the currently running query. Only available in streaming input mode. |
| [ ] | `query.rewindFiles(userMessageId, options?)` | Restores files to their state at the specified user message. Requires `enableFileCheckpointing: true`. Returns `RewindFilesResult`. |
| [ ] | `query.setPermissionMode(mode)` | Changes the permission mode at runtime. Only available in streaming input mode. |
| [ ] | `query.setModel(model?)` | Changes the model at runtime. Only available in streaming input mode. |
| [ ] | `query.setMaxThinkingTokens(maxThinkingTokens)` | **(Deprecated)** Use `thinking` option instead. Changes max thinking tokens. |
| [ ] | `query.applyFlagSettings(settings)` | Applies runtime settings changes using the `Settings` interface. |
| [ ] | `query.initializationResult()` | Returns `SDKControlInitializeResponse` with commands, agents, models, account info, and output style config. |
| [ ] | `query.supportedCommands()` | Returns available slash commands as `SlashCommand[]`. |
| [ ] | `query.supportedModels()` | Returns available models as `ModelInfo[]` with display names and capability flags. |
| [ ] | `query.supportedAgents()` | Returns available subagents as `AgentInfo[]`. |
| [ ] | `query.mcpServerStatus()` | Returns status of all connected MCP servers as `McpServerStatus[]`. |
| [ ] | `query.accountInfo()` | Returns `AccountInfo` for the authenticated user (email, org, subscription). |
| [ ] | `query.reconnectMcpServer(serverName)` | Reconnects an MCP server by name. |
| [ ] | `query.toggleMcpServer(serverName, enabled)` | Enables or disables an MCP server by name. |
| [ ] | `query.setMcpServers(servers)` | Dynamically replaces the set of MCP servers. Returns `McpSetServersResult` with added/removed/errors. |
| [ ] | `query.streamInput(stream)` | Streams additional `SDKUserMessage` events into the query for multi-turn conversations. |
| [ ] | `query.stopTask(taskId)` | Stops a running background task by ID. |
| [ ] | `query.close()` | Closes the query and terminates the underlying Claude Code process. |

---

## SDKSession Interface (V2 Preview)

| | Member | Description |
|---|---|---|
| [ ] | `session.sessionId` | Readonly string — the unique session identifier. |
| [ ] | `session.send(message)` | Sends a user message (string or `SDKUserMessage`) to the session. |
| [ ] | `session.stream()` | Returns an `AsyncGenerator<SDKMessage, void>` to iterate over response events. |
| [ ] | `session.close()` | Closes the session and terminates the underlying process. |
| [ ] | `session[Symbol.asyncDispose]()` | Supports `await using` for automatic cleanup (TypeScript 5.2+). |

---

## Configuration Types

### `Options` (full query config)

| | Property | Description |
|---|---|---|
| [ ] | `options.abortController` | `AbortController` for cancelling operations. |
| [ ] | `options.additionalDirectories` | `string[]` — additional directories Claude can access beyond `cwd`. |
| [ ] | `options.agent` | `string` — agent name for the main thread. |
| [ ] | `options.agents` | `Record<string, AgentDefinition>` — programmatically defined subagents. |
| [ ] | `options.allowDangerouslySkipPermissions` | `boolean` — enable bypassing all permission checks. |
| [ ] | `options.allowedTools` | `string[]` — tools to auto-approve without prompting the user. |
| [ ] | `options.betas` | `SdkBeta[]` — enable beta features (e.g., `"context-1m-2025-08-07"`). |
| [ ] | `options.canUseTool` | `CanUseTool` — custom permission callback for tool usage decisions. |
| [ ] | `options.continue` | `boolean` — continue the most recent conversation in the project. |
| [ ] | `options.cwd` | `string` — working directory (defaults to `process.cwd()`). |
| [ ] | `options.debug` | `boolean` — enable debug mode. |
| [ ] | `options.debugFile` | `string` — write debug logs to a file path. |
| [ ] | `options.disallowedTools` | `string[]` — tools to always deny. |
| [ ] | `options.effort` | `'low' \| 'medium' \| 'high' \| 'max'` — controls how much effort Claude puts into responses. |
| [ ] | `options.enableFileCheckpointing` | `boolean` — enable file change tracking for `rewindFiles()`. |
| [ ] | `options.env` | `Record<string, string \| undefined>` — environment variables (defaults to `process.env`). |
| [ ] | `options.executable` | `'bun' \| 'deno' \| 'node'` — JavaScript runtime to use. |
| [ ] | `options.executableArgs` | `string[]` — arguments to pass to the runtime executable. |
| [ ] | `options.extraArgs` | `Record<string, string \| null>` — additional CLI arguments. |
| [ ] | `options.fallbackModel` | `string` — model to use if the primary model fails. |
| [ ] | `options.forkSession` | `boolean` — fork to a new session ID when resuming. |
| [ ] | `options.hooks` | `Partial<Record<HookEvent, HookCallbackMatcher[]>>` — hook callbacks keyed by event name. |
| [ ] | `options.includePartialMessages` | `boolean` — include `SDKPartialAssistantMessage` streaming events. |
| [ ] | `options.maxBudgetUsd` | `number` — maximum budget in USD for the query. |
| [ ] | `options.maxThinkingTokens` | `number` — **(deprecated)** use `thinking` instead. |
| [ ] | `options.maxTurns` | `number` — maximum agentic turns before stopping. |
| [ ] | `options.mcpServers` | `Record<string, McpServerConfig>` — MCP server configurations. |
| [ ] | `options.model` | `string` — Claude model to use. |
| [ ] | `options.outputFormat` | `{ type: 'json_schema', schema: JSONSchema }` — structured output format. |
| [ ] | `options.pathToClaudeCodeExecutable` | `string` — custom path to the Claude Code binary. |
| [ ] | `options.permissionMode` | `PermissionMode` — permission handling mode. |
| [ ] | `options.permissionPromptToolName` | `string` — MCP tool name for permission prompts. |
| [ ] | `options.persistSession` | `boolean` — when false, disables session persistence to disk. |
| [ ] | `options.plugins` | `SdkPluginConfig[]` — load custom plugins from local paths. |
| [ ] | `options.promptSuggestions` | `boolean` — enable `SDKPromptSuggestionMessage` after each turn. |
| [ ] | `options.resume` | `string` — session ID to resume. |
| [ ] | `options.resumeSessionAt` | `string` — resume session at a specific message UUID. |
| [ ] | `options.sandbox` | `SandboxSettings` — configure sandbox behavior. |
| [ ] | `options.sessionId` | `string` — use a specific UUID for the session. |
| [ ] | `options.settingSources` | `SettingSource[]` — which filesystem settings to load (`"user"`, `"project"`, `"local"`). |
| [ ] | `options.spawnClaudeCodeProcess` | `(options: SpawnOptions) => SpawnedProcess` — custom function to spawn the Claude Code process. |
| [ ] | `options.stderr` | `(data: string) => void` — callback for stderr output. |
| [ ] | `options.strictMcpConfig` | `boolean` — enforce strict MCP validation. |
| [ ] | `options.systemPrompt` | `string \| { type: 'preset'; preset: 'claude_code'; append?: string }` — system prompt override. |
| [ ] | `options.thinking` | `ThinkingConfig` — controls Claude's thinking/reasoning behavior. |
| [ ] | `options.toolConfig` | `ToolConfig` — per-tool configuration (e.g., `askUserQuestion.previewFormat`). |
| [ ] | `options.tools` | `string[] \| { type: 'preset'; preset: 'claude_code' }` — tool configuration. |

### `ThinkingConfig`

| | Variant | Description |
|---|---|---|
| [ ] | `{ type: "adaptive" }` | Lets Claude determine when/how much to reason (Opus 4.6+ default). |
| [ ] | `{ type: "enabled", budgetTokens?: number }` | Enables thinking with an optional fixed token budget. |
| [ ] | `{ type: "disabled" }` | Disables extended thinking entirely. |

### `AgentDefinition`

| | Property | Description |
|---|---|---|
| [ ] | `agent.description` | Required description of what the agent does. |
| [ ] | `agent.prompt` | Required system prompt for the agent. |
| [ ] | `agent.tools` | `string[]` — tools available to the agent. |
| [ ] | `agent.disallowedTools` | `string[]` — tools denied to the agent. |
| [ ] | `agent.model` | `"sonnet" \| "opus" \| "haiku" \| "inherit"` — model override. |
| [ ] | `agent.mcpServers` | `AgentMcpServerSpec[]` — MCP servers for the agent. |
| [ ] | `agent.skills` | `string[]` — skills available to the agent. |
| [ ] | `agent.maxTurns` | `number` — max agentic turns for the agent. |
| [ ] | `agent.criticalSystemReminder_EXPERIMENTAL` | `string` — experimental system reminder. |

### `SdkPluginConfig`

| | Property | Description |
|---|---|---|
| [ ] | `{ type: "local", path: string }` | Load a custom plugin from a local file path (absolute or relative to project). |

### `ToolConfig`

| | Property | Description |
|---|---|---|
| [ ] | `toolConfig.askUserQuestion.previewFormat` | `"markdown" \| "html"` — controls preview format for AskUserQuestion options. |

---

## Permission Types

| | Type | Description |
|---|---|---|
| [ ] | `PermissionMode` | `"default" \| "acceptEdits" \| "bypassPermissions" \| "plan" \| "dontAsk"` — controls permission behavior: standard, auto-accept edits, bypass all, planning only, or deny if not pre-approved. |
| [ ] | `CanUseTool(toolName, input, options)` | Custom permission callback. Receives tool name, input, and context (`signal`, `suggestions`, `blockedPath`, `decisionReason`, `toolUseID`, `agentID`). Must return `PermissionResult`. |
| [ ] | `PermissionResult` | `{ behavior: "allow", updatedInput?, updatedPermissions? } \| { behavior: "deny", message, interrupt? }` — result of a permission check. |
| [ ] | `PermissionUpdate` | Union type for permission mutations: `addRules`, `replaceRules`, `removeRules`, `setMode`, `addDirectories`, `removeDirectories`. Each has a `destination`. |
| [ ] | `PermissionBehavior` | `"allow" \| "deny" \| "ask"` — the behavior to apply to a permission rule. |
| [ ] | `PermissionUpdateDestination` | `"userSettings" \| "projectSettings" \| "localSettings" \| "session" \| "cliArg"` — where to persist a permission update. |
| [ ] | `PermissionRuleValue` | `{ toolName: string, ruleContent?: string }` — a permission rule with optional content pattern. |
| [ ] | `SDKPermissionDenial` | `{ tool_name, tool_use_id, tool_input }` — info about a denied tool use, included in result messages. |

---

## MCP Server Config Types

| | Type | Description |
|---|---|---|
| [ ] | `McpServerConfig` | Union of all MCP server config types: `McpStdioServerConfig \| McpSSEServerConfig \| McpHttpServerConfig \| McpSdkServerConfigWithInstance`. |
| [ ] | `McpStdioServerConfig` | `{ type?: "stdio", command, args?, env? }` — MCP server communicating over stdio. |
| [ ] | `McpSSEServerConfig` | `{ type: "sse", url, headers? }` — MCP server communicating over Server-Sent Events. |
| [ ] | `McpHttpServerConfig` | `{ type: "http", url, headers? }` — MCP server communicating over HTTP. |
| [ ] | `McpSdkServerConfigWithInstance` | `{ type: "sdk", name, instance: McpServer }` — in-process SDK MCP server from `createSdkMcpServer()`. |
| [ ] | `McpClaudeAIProxyServerConfig` | `{ type: "claudeai-proxy", url, id }` — MCP server proxied through Claude.ai. |
| [ ] | `McpServerStatus` | Status of a connected MCP server: `name`, `status` (`"connected" \| "failed" \| "needs-auth" \| "pending" \| "disabled"`), `serverInfo?`, `error?`, `config?`, `scope?`, `tools?`. |
| [ ] | `McpServerStatusConfig` | Union of all MCP transport config types as reported by `mcpServerStatus()`. |
| [ ] | `McpSetServersResult` | `{ added: string[], removed: string[], errors: Record<string, string> }` — result of `setMcpServers()`. |
| [ ] | `AgentMcpServerSpec` | `string \| Record<string, McpServerConfigForProcessTransport>` — specifies MCP servers for a subagent (name reference or inline config). |
| [ ] | `SdkMcpToolDefinition<Schema>` | Type-safe MCP tool definition created by the `tool()` function, with Zod schema for input validation. |

---

## Message Types

### `SDKMessage` (union of all message types)

| | Type | Description |
|---|---|---|
| [ ] | `SDKAssistantMessage` | `{ type: "assistant", uuid, session_id, message: BetaMessage, parent_tool_use_id, error? }` — Claude's response. The `message` field is an Anthropic `BetaMessage` with `content`, `model`, `stop_reason`, `usage`. |
| [ ] | `SDKUserMessage` | `{ type: "user", uuid?, session_id, message: MessageParam, parent_tool_use_id, isSynthetic?, tool_use_result? }` — user input message. |
| [ ] | `SDKUserMessageReplay` | Same as `SDKUserMessage` but with required `uuid` and `isReplay: true`. Used when resuming sessions. |
| [ ] | `SDKResultMessage` | Final result message. `subtype: "success"` includes `result`, `total_cost_usd`, `usage`, `modelUsage`, `structured_output?`. Error subtypes (`"error_max_turns"`, `"error_during_execution"`, `"error_max_budget_usd"`, `"error_max_structured_output_retries"`) include `errors[]`. |
| [ ] | `SDKSystemMessage` | `{ type: "system", subtype: "init", ... }` — initialization message with `tools[]`, `model`, `permissionMode`, `mcp_servers[]`, `claude_code_version`, `apiKeySource`, etc. |
| [ ] | `SDKPartialAssistantMessage` | `{ type: "stream_event", event: BetaRawMessageStreamEvent, ... }` — streaming partial message. Only emitted when `includePartialMessages: true`. |
| [ ] | `SDKCompactBoundaryMessage` | `{ type: "system", subtype: "compact_boundary", compact_metadata: { trigger, pre_tokens } }` — marks where conversation compaction occurred. |
| [ ] | `SDKStatusMessage` | `{ type: "system", subtype: "status", status: "compacting" \| null, permissionMode? }` — status update (e.g., compacting). |
| [ ] | `SDKAuthStatusMessage` | `{ type: "auth_status", isAuthenticating, output[], error? }` — emitted during authentication flows. |
| [ ] | `SDKAPIRetryMessage` | Notification that an API call is being retried due to transient errors. |
| [ ] | `SDKLocalCommandOutputMessage` | Output from local slash commands. |
| [ ] | `SDKToolProgressMessage` | `{ type: "tool_progress", tool_use_id, tool_name, elapsed_time_seconds, task_id? }` — periodic progress while a tool executes. |
| [ ] | `SDKToolUseSummaryMessage` | `{ type: "tool_use_summary", summary, preceding_tool_use_ids[] }` — summary of tool usage in the conversation. |
| [ ] | `SDKFilesPersistedEvent` | `{ type: "system", subtype: "files_persisted", files[], failed[] }` — emitted when file checkpoints are saved. |
| [ ] | `SDKRateLimitEvent` | `{ type: "rate_limit_event", rate_limit_info: { status, resetsAt?, utilization? } }` — rate limit notification. |
| [ ] | `SDKPromptSuggestionMessage` | `{ type: "prompt_suggestion", suggestion }` — predicted next user prompt (requires `promptSuggestions: true`). |
| [ ] | `SDKElicitationCompleteMessage` | Emitted when an MCP elicitation (user input request from MCP server) completes. |

### Background Task Messages

| | Type | Description |
|---|---|---|
| [ ] | `SDKTaskStartedMessage` | `{ subtype: "task_started", task_id, description, task_type? }` — emitted when a background task begins. |
| [ ] | `SDKTaskProgressMessage` | `{ subtype: "task_progress", task_id, description, usage, last_tool_name? }` — periodic progress with usage stats. |
| [ ] | `SDKTaskNotificationMessage` | `{ subtype: "task_notification", task_id, status: "completed" \| "failed" \| "stopped", output_file, summary, usage? }` — emitted when a background task finishes. |

### Hook Messages

| | Type | Description |
|---|---|---|
| [ ] | `SDKHookStartedMessage` | `{ subtype: "hook_started", hook_id, hook_name, hook_event }` — emitted when a hook begins executing. |
| [ ] | `SDKHookProgressMessage` | `{ subtype: "hook_progress", hook_id, hook_name, hook_event, stdout, stderr, output }` — hook execution progress. |
| [ ] | `SDKHookResponseMessage` | `{ subtype: "hook_response", hook_id, hook_name, hook_event, output, exit_code?, outcome }` — hook finished with outcome (`"success" \| "error" \| "cancelled"`). |

---

## Hook System

### `HookEvent` (all hook event names)

| | Event | Description |
|---|---|---|
| [ ] | `"PreToolUse"` | Fires before a tool is used. Allows inspecting/modifying tool input or blocking execution. |
| [ ] | `"PostToolUse"` | Fires after a tool completes successfully. Includes the tool response. |
| [ ] | `"PostToolUseFailure"` | Fires after a tool fails. Includes the error message. |
| [ ] | `"UserPromptSubmit"` | Fires when a user prompt is submitted. Allows modifying or enriching the prompt. |
| [ ] | `"SessionStart"` | Fires when a session starts. Includes trigger source (`"startup" \| "resume" \| "clear" \| "compact"`). |
| [ ] | `"SessionEnd"` | Fires when a session ends. Includes the `ExitReason`. |
| [ ] | `"Stop"` | Fires when the agent stops. Includes last assistant message. |
| [ ] | `"Notification"` | Fires on notification events. Includes message, title, and type. |
| [ ] | `"PermissionRequest"` | Fires when a permission is requested. Includes suggested permission updates. |
| [ ] | `"Setup"` | Fires during setup/initialization. Trigger is `"init" \| "maintenance"`. |
| [ ] | `"TeammateIdle"` | Fires when a teammate becomes idle. Includes teammate and team names. |
| [ ] | `"TaskCompleted"` | Fires when a task completes. Includes task ID, subject, and optional teammate/team. |
| [ ] | `"SubagentStart"` | Fires when a subagent starts. Includes agent ID and type. |
| [ ] | `"SubagentStop"` | Fires when a subagent stops. Includes agent transcript path and last message. |
| [ ] | `"PreCompact"` | Fires before conversation compaction. Includes trigger and custom instructions. |
| [ ] | `"PostCompact"` | Fires after conversation compaction. |
| [ ] | `"ConfigChange"` | Fires when configuration changes. Includes source and optional file path. |
| [ ] | `"WorktreeCreate"` | Fires when a git worktree is created. Includes worktree name. |
| [ ] | `"WorktreeRemove"` | Fires when a git worktree is removed. Includes worktree path. |
| [ ] | `"InstructionsLoaded"` | Fires when instructions (CLAUDE.md etc.) are loaded. |
| [ ] | `"Elicitation"` | Fires on MCP elicitation requests. |
| [ ] | `"ElicitationResult"` | Fires when an MCP elicitation completes. |

### Hook Configuration

| | Type | Description |
|---|---|---|
| [ ] | `HookCallbackMatcher` | `{ matcher?: string, hooks: HookCallback[], timeout?: number }` — hook config with optional matcher to filter which events trigger. Timeout in seconds. |
| [ ] | `HookCallback(input, toolUseID, options)` | Callback function receiving `HookInput`, optional tool use ID, and `{ signal: AbortSignal }`. Must return `HookJSONOutput`. |
| [ ] | `HookInput` | Union of all hook input types, discriminated on `hook_event_name`. |
| [ ] | `BaseHookInput` | `{ session_id, transcript_path, cwd, permission_mode?, agent_id?, agent_type? }` — base fields all hook inputs extend. |

### Hook Input Types

| | Type | Description |
|---|---|---|
| [ ] | `PreToolUseHookInput` | Extends `BaseHookInput` with `tool_name`, `tool_input`, `tool_use_id`. Fires before a tool runs. |
| [ ] | `PostToolUseHookInput` | Extends `BaseHookInput` with `tool_name`, `tool_input`, `tool_response`, `tool_use_id`. Fires after a tool succeeds. |
| [ ] | `PostToolUseFailureHookInput` | Extends `BaseHookInput` with `tool_name`, `tool_input`, `tool_use_id`, `error`, `is_interrupt?`. Fires after a tool fails. |
| [ ] | `NotificationHookInput` | Extends `BaseHookInput` with `message`, `title?`, `notification_type`. |
| [ ] | `UserPromptSubmitHookInput` | Extends `BaseHookInput` with `prompt`. |
| [ ] | `SessionStartHookInput` | Extends `BaseHookInput` with `source`, `agent_type?`, `model?`. |
| [ ] | `SessionEndHookInput` | Extends `BaseHookInput` with `reason: ExitReason`. |
| [ ] | `StopHookInput` | Extends `BaseHookInput` with `stop_hook_active`, `last_assistant_message?`. |
| [ ] | `SubagentStartHookInput` | Extends `BaseHookInput` with `agent_id`, `agent_type`. |
| [ ] | `SubagentStopHookInput` | Extends `BaseHookInput` with `stop_hook_active`, `agent_id`, `agent_transcript_path`, `agent_type`, `last_assistant_message?`. |
| [ ] | `PreCompactHookInput` | Extends `BaseHookInput` with `trigger: "manual" \| "auto"`, `custom_instructions`. |
| [ ] | `PostCompactHookInput` | Extends `BaseHookInput`. Fires after conversation compaction. |
| [ ] | `PermissionRequestHookInput` | Extends `BaseHookInput` with `tool_name`, `tool_input`, `permission_suggestions?`. |
| [ ] | `SetupHookInput` | Extends `BaseHookInput` with `trigger: "init" \| "maintenance"`. |
| [ ] | `TeammateIdleHookInput` | Extends `BaseHookInput` with `teammate_name`, `team_name`. |
| [ ] | `TaskCompletedHookInput` | Extends `BaseHookInput` with `task_id`, `task_subject`, `task_description?`, `teammate_name?`, `team_name?`. |
| [ ] | `ConfigChangeHookInput` | Extends `BaseHookInput` with `source`, `file_path?`. |
| [ ] | `WorktreeCreateHookInput` | Extends `BaseHookInput` with `name`. |
| [ ] | `WorktreeRemoveHookInput` | Extends `BaseHookInput` with `worktree_path`. |
| [ ] | `InstructionsLoadedHookInput` | Extends `BaseHookInput`. Fires when CLAUDE.md / instructions are loaded. |
| [ ] | `ElicitationHookInput` | Extends `BaseHookInput`. Fires on MCP elicitation requests. |
| [ ] | `ElicitationResultHookInput` | Extends `BaseHookInput`. Fires when MCP elicitation completes. |

### Hook Output Types

| | Type | Description |
|---|---|---|
| [ ] | `HookJSONOutput` | `AsyncHookJSONOutput \| SyncHookJSONOutput` — union return type from hook callbacks. |
| [ ] | `AsyncHookJSONOutput` | `{ async: true, asyncTimeout?: number }` — returned when a hook will complete asynchronously. |
| [ ] | `SyncHookJSONOutput` | `{ continue?, suppressOutput?, stopReason?, decision?, systemMessage?, reason?, hookSpecificOutput? }` — synchronous result with control flow options and event-specific output. |
| [ ] | `PreToolUseHookSpecificOutput` | `{ permissionDecision?, permissionDecisionReason?, updatedInput?, additionalContext? }` — pre-tool hook output for modifying/blocking tool execution. |
| [ ] | `PostToolUseHookSpecificOutput` | `{ additionalContext?, updatedMCPToolOutput? }` — post-tool hook output for adding context or modifying MCP output. |
| [ ] | `PermissionRequestHookSpecificOutput` | `{ decision: { behavior: "allow", updatedInput?, updatedPermissions? } \| { behavior: "deny", message?, interrupt? } }` — permission hook output. |
| [ ] | `UserPromptSubmitHookSpecificOutput` | `{ additionalContext? }` — prompt submit hook output for adding context. |

---

## Elicitation Types (MCP User Input)

| | Type | Description |
|---|---|---|
| [ ] | `ElicitationRequest` | Request from an MCP server for user input (e.g., login credentials, preferences). |
| [ ] | `ElicitationResult` | The user's response to an elicitation request. |
| [ ] | `PromptRequest` | Prompt displayed to the user for input. |
| [ ] | `PromptRequestOption` | Individual option in a prompt request. |
| [ ] | `PromptResponse` | User's response to a prompt. |

---

## Session Types

| | Type | Description |
|---|---|---|
| [ ] | `SDKSessionInfo` | `{ sessionId, summary, lastModified, fileSize, customTitle?, firstPrompt?, gitBranch?, cwd? }` — light metadata about a past session. |
| [ ] | `SessionMessage` | `{ type: "user" \| "assistant", uuid, session_id, message, parent_tool_use_id }` — message from a past session transcript. |
| [ ] | `ListSessionsOptions` | `{ dir?, limit?, includeWorktrees? }` — options for `listSessions()`. |
| [ ] | `GetSessionMessagesOptions` | `{ dir?, limit?, offset? }` — options for `getSessionMessages()`. |
| [ ] | `GetSessionInfoOptions` | `{ dir? }` — options for `getSessionInfo()`. |
| [ ] | `ForkSessionOptions` | Options for `forkSession()`. |
| [ ] | `ForkSessionResult` | Result of `forkSession()`. |
| [ ] | `SessionMutationOptions` | `{ dir? }` — options for `renameSession()` and `tagSession()`. |

---

## Tool Input Schemas (`sdk-tools`)

| | Type (Tool Name) | Description |
|---|---|---|
| [ ] | `AgentInput` (`Agent`) | `{ description, prompt, subagent_type, model?, resume?, run_in_background?, max_turns?, name?, team_name?, mode?, isolation? }` — launches a subagent. |
| [ ] | `AskUserQuestionInput` (`AskUserQuestion`) | `{ questions: [{ question, header, options: [{ label, description, preview? }], multiSelect }] }` — asks the user clarifying questions. |
| [ ] | `BashInput` (`Bash`) | `{ command, timeout?, description?, run_in_background?, dangerouslyDisableSandbox? }` — executes a bash command. |
| [ ] | `TaskOutputInput` (`TaskOutput`) | `{ task_id, block, timeout }` — retrieves output from a background task. |
| [ ] | `FileEditInput` (`Edit`) | `{ file_path, old_string, new_string, replace_all? }` — performs exact string replacement in a file. |
| [ ] | `FileReadInput` (`Read`) | `{ file_path, offset?, limit?, pages? }` — reads a file (text, image, PDF, notebook). |
| [ ] | `FileWriteInput` (`Write`) | `{ file_path, content }` — writes/overwrites a file. |
| [ ] | `GlobInput` (`Glob`) | `{ pattern, path? }` — finds files matching a glob pattern. |
| [ ] | `GrepInput` (`Grep`) | `{ pattern, path?, glob?, type?, output_mode?, -i?, -n?, -B?, -A?, -C?, context?, head_limit?, offset?, multiline? }` — searches file contents with ripgrep. |
| [ ] | `TaskStopInput` (`TaskStop`) | `{ task_id?, shell_id? }` — stops a running background task. |
| [ ] | `NotebookEditInput` (`NotebookEdit`) | `{ notebook_path, cell_id?, new_source, cell_type?, edit_mode? }` — edits Jupyter notebook cells. |
| [ ] | `WebFetchInput` (`WebFetch`) | `{ url, prompt }` — fetches URL content, processed with AI. |
| [ ] | `WebSearchInput` (`WebSearch`) | `{ query, allowed_domains?, blocked_domains? }` — searches the web. |
| [ ] | `TodoWriteInput` (`TodoWrite`) | `{ todos: [{ content, status, activeForm }] }` — manages a structured task list. |
| [ ] | `ExitPlanModeInput` (`ExitPlanMode`) | `{ allowedPrompts? }` — exits planning mode with optional permission prompts. |
| [ ] | `ListMcpResourcesInput` (`ListMcpResources`) | `{ server? }` — lists MCP resources from servers. |
| [ ] | `ReadMcpResourceInput` (`ReadMcpResource`) | `{ server, uri }` — reads a specific MCP resource. |
| [ ] | `SubscribeMcpResourceInput` (`SubscribeMcpResource`) | Subscribe to changes on an MCP resource. |
| [ ] | `UnsubscribeMcpResourceInput` (`UnsubscribeMcpResource`) | Unsubscribe from an MCP resource. |
| [ ] | `SubscribePollingInput` (`SubscribePolling`) | Subscribe to polling-based MCP resource updates. |
| [ ] | `UnsubscribePollingInput` (`UnsubscribePolling`) | Unsubscribe from polling-based MCP resource updates. |
| [ ] | `ConfigInput` (`Config`) | `{ setting, value? }` — gets or sets a configuration value. |
| [ ] | `EnterWorktreeInput` (`EnterWorktree`) | `{ name? }` — creates/enters a temporary git worktree. |
| [ ] | `ExitWorktreeInput` (`ExitWorktree`) | Exits the current git worktree. |
| [ ] | `McpInput` (`Mcp`) | Calls an MCP tool on a connected server. |

---

## Tool Output Schemas (`sdk-tools`)

| | Type | Description |
|---|---|---|
| [ ] | `AgentOutput` | Discriminated on `status`: `"completed"` (with `content`, `usage`, `totalTokens`), `"async_launched"` (with `agentId`, `outputFile`), or `"sub_agent_entered"`. |
| [ ] | `AskUserQuestionOutput` | `{ questions, answers: Record<string, string> }` — questions asked and user's answers. |
| [ ] | `BashOutput` | `{ stdout, stderr, interrupted, rawOutputPath?, isImage?, backgroundTaskId?, structuredContent?, persistedOutputPath? }` — command output. |
| [ ] | `FileEditOutput` | `{ filePath, oldString, newString, originalFile, structuredPatch[], userModified, replaceAll, gitDiff? }` — structured diff of the edit. |
| [ ] | `FileReadOutput` | Discriminated on `type`: `"text"` (content + lines), `"image"` (base64 + dimensions), `"notebook"` (cells), `"pdf"` (base64), or `"parts"`. |
| [ ] | `FileWriteOutput` | `{ type: "create" \| "update", filePath, content, structuredPatch[], originalFile, gitDiff? }` — write result with diff. |
| [ ] | `GlobOutput` | `{ durationMs, numFiles, filenames[], truncated }` — matching file paths sorted by mtime. |
| [ ] | `GrepOutput` | `{ mode?, numFiles, filenames[], content?, numLines?, numMatches?, appliedLimit?, appliedOffset? }` — search results. |
| [ ] | `TaskStopOutput` | `{ message, task_id, task_type, command? }` — confirmation of stopped task. |
| [ ] | `NotebookEditOutput` | `{ new_source, cell_id?, cell_type, language, edit_mode, error?, notebook_path, original_file, updated_file }`. |
| [ ] | `WebFetchOutput` | `{ bytes, code, codeText, result, durationMs, url }` — fetched content with HTTP status. |
| [ ] | `WebSearchOutput` | `{ query, results[], durationSeconds }` — web search results. |
| [ ] | `TodoWriteOutput` | `{ oldTodos[], newTodos[] }` — previous and updated task lists. |
| [ ] | `ExitPlanModeOutput` | `{ plan, isAgent, filePath?, hasTaskTool?, awaitingLeaderApproval?, requestId? }` — plan state after exit. |
| [ ] | `ListMcpResourcesOutput` | `Array<{ uri, name, mimeType?, description?, server }>` — available MCP resources. |
| [ ] | `ReadMcpResourceOutput` | `{ contents: [{ uri, mimeType?, text? }] }` — MCP resource contents. |
| [ ] | `ConfigOutput` | `{ success, operation?, setting?, value?, previousValue?, newValue?, error? }` — config get/set result. |
| [ ] | `EnterWorktreeOutput` | `{ worktreePath, worktreeBranch?, message }` — created worktree info. |
| [ ] | `ExitWorktreeOutput` | Result of exiting a git worktree. |
| [ ] | `McpOutput` | Result of calling an MCP tool. |
| [ ] | `SubscribeMcpResourceOutput` | Confirmation of MCP resource subscription. |
| [ ] | `UnsubscribeMcpResourceOutput` | Confirmation of MCP resource unsubscription. |
| [ ] | `SubscribePollingOutput` | Confirmation of polling subscription. |
| [ ] | `UnsubscribePollingOutput` | Confirmation of polling unsubscription. |

---

## Sandbox Types

| | Type | Description |
|---|---|---|
| [ ] | `SandboxSettings` | `{ enabled?, autoAllowBashIfSandboxed?, excludedCommands?, allowUnsandboxedCommands?, network?, filesystem?, ignoreViolations?, enableWeakerNestedSandbox?, ripgrep? }` — top-level sandbox config. |
| [ ] | `SandboxNetworkConfig` | `{ allowedDomains?, allowManagedDomainsOnly?, allowLocalBinding?, allowUnixSockets?, allowAllUnixSockets?, httpProxyPort?, socksProxyPort? }` — network restrictions. |
| [ ] | `SandboxFilesystemConfig` | `{ allowWrite?, denyWrite?, denyRead? }` — filesystem path restrictions for read/write. |

---

## Info & Metadata Types

| | Type | Description |
|---|---|---|
| [ ] | `SDKControlInitializeResponse` | `{ commands, agents, output_style, available_output_styles, models, account }` — session init data from `initializationResult()`. |
| [ ] | `SlashCommand` | `{ name, description, argumentHint }` — available slash command info. |
| [ ] | `ModelInfo` | `{ value, displayName, description, supportsEffort?, supportedEffortLevels?, supportsAdaptiveThinking?, supportsFastMode? }` — model capabilities. |
| [ ] | `AgentInfo` | `{ name, description, model? }` — available subagent info. |
| [ ] | `AccountInfo` | `{ email?, organization?, subscriptionType?, tokenSource?, apiKeySource? }` — authenticated user account info. |
| [ ] | `ModelUsage` | `{ inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens, webSearchRequests, costUSD, contextWindow, maxOutputTokens }` — per-model usage stats. |
| [ ] | `NonNullableUsage` | Version of Anthropic SDK `Usage` with all nullable fields made non-nullable. |
| [ ] | `RewindFilesResult` | `{ canRewind, error?, filesChanged?, insertions?, deletions? }` — result of `rewindFiles()`. |

---

## Process & Transport Types

| | Type | Description |
|---|---|---|
| [ ] | `SpawnedProcess` | Interface for custom process spawning: `stdin`, `stdout`, `killed`, `exitCode`, `kill()`, `on()`/`once()`/`off()`. Node.js `ChildProcess` satisfies this. |
| [ ] | `SpawnOptions` | `{ command, args, cwd?, env, signal }` — options passed to `spawnClaudeCodeProcess`. |
| [ ] | `Transport` | Internal communication layer: `write()`, `close()`, `isReady()`, `readMessages()`, `endInput()`. Used for stdio/WebSocket transports. |

---

## Enums & Literal Types

| | Type | Description |
|---|---|---|
| [ ] | `ExitReason` | `"clear" \| "logout" \| "prompt_input_exit" \| "other" \| "bypass_permissions_disabled"` — why a session ended. |
| [ ] | `EXIT_REASONS` | Readonly array constant of all `ExitReason` values. |
| [ ] | `HOOK_EVENTS` | Readonly array constant of all `HookEvent` names. |
| [ ] | `ApiKeySource` | `"user" \| "project" \| "org" \| "temporary" \| "oauth"` — where the API key was sourced. |
| [ ] | `SettingSource` | `"user" \| "project" \| "local"` — filesystem settings source. |
| [ ] | `ConfigScope` | `"local" \| "user" \| "project"` — scope for config operations. |
| [ ] | `FastModeState` | `"off" \| "cooldown" \| "on"` — fast mode status. |
| [ ] | `SDKStatus` | `"compacting" \| null` — SDK status indicator. |
| [ ] | `SdkBeta` | `"context-1m-2025-08-07"` — available beta features. |
| [ ] | `OutputFormat` | `JsonSchemaOutputFormat \| BaseOutputFormat` — structured output configuration. |
| [ ] | `JsonSchemaOutputFormat` | `{ type: "json_schema", schema: JSONSchema }` — JSON schema output format. |

---

## Classes

| | Class | Description |
|---|---|---|
| [ ] | `AbortError extends Error` | Custom error class thrown when a query is aborted via `AbortController`. |

---

## Browser SDK (`/browser`)

| | Export | Description |
|---|---|---|
| [ ] | `query(options: BrowserQueryOptions)` | Browser-specific version of `query()` that communicates over WebSocket instead of stdio. |
| [ ] | `OAuthCredential` | OAuth token credential for browser authentication. |
| [ ] | `AuthMessage` | Authentication message type for browser auth flows. |
| [ ] | `WebSocketOptions` | WebSocket connection configuration for the browser SDK. |
| [ ] | `BrowserQueryOptions` | Full configuration for the browser `query()` function including WebSocket and auth options. |

---

## Embed Module (`/embed`)

| | Export | Description |
|---|---|---|
| [ ] | `default` (cliPath) | Default export providing the filesystem path to the Claude Code CLI executable. Used to embed Claude Code in other applications. |

---

*Generated from `@anthropic-ai/claude-agent-sdk@0.2.77` source types and https://platform.claude.com/docs/en/agent-sdk/typescript*
