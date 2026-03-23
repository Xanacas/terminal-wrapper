# Claude Agent SDK — Implementation Audit & User Stories

**Package:** `@anthropic-ai/claude-agent-sdk` v0.2.77
**Codebase:** `terminal-wrapper` (Electron app wrapping Claude Code terminal sessions)
**Primary SDK integration:** `src/main/claude/claude-session-manager.ts`

---

## Overall Summary

| Category | ✅ Implemented | ⚠️ Partial | ❌ Not Implemented | Total |
|---|---|---|---|---|
| Core Functions | 3 | 0 | 6 | 9 |
| V2 Preview API | 0 | 0 | 3 | 3 |
| Query Interface | 4 | 0 | 15 | 19 |
| SDKSession (V2) | 0 | 0 | 5 | 5 |
| Options (query config) | 16 | 2 | 29 | 47 |
| ThinkingConfig | 0 | 0 | 3 | 3 |
| AgentDefinition | 0 | 0 | 9 | 9 |
| SdkPluginConfig | 0 | 0 | 1 | 1 |
| ToolConfig | 1 | 0 | 0 | 1 |
| Permission Types | 3 | 1 | 4 | 8 |
| MCP Server Config Types | 2 | 0 | 9 | 11 |
| Message Types | 4 | 0 | 13 | 17 |
| Background Task Messages | 0 | 0 | 3 | 3 |
| Hook Messages | 0 | 0 | 3 | 3 |
| Hook Events | 0 | 0 | 22 | 22 |
| Hook Configuration | 0 | 0 | 4 | 4 |
| Hook Input Types | 0 | 0 | 22 | 22 |
| Hook Output Types | 0 | 0 | 7 | 7 |
| Elicitation Types | 0 | 0 | 5 | 5 |
| Session Types | 4 | 0 | 4 | 8 |
| Tool Input Schemas | 7 | 0 | 18 | 25 |
| Tool Output Schemas | 8 | 0 | 16 | 24 |
| Sandbox Types | 0 | 0 | 3 | 3 |
| Info & Metadata Types | 1 | 0 | 7 | 8 |
| Process & Transport Types | 2 | 0 | 1 | 3 |
| Enums & Literal Types | 2 | 0 | 9 | 11 |
| Classes | 1 | 0 | 0 | 1 |
| Browser SDK | 0 | 0 | 5 | 5 |
| Embed Module | 1 | 0 | 0 | 1 |
| **Total** | **59** | **3** | **225** | **287** |

---

## 1. Core Functions

### 1.1 `query({ prompt, options? })`
**Status:** ✅ IMPLEMENTED
Used at line 342 of `claude-session-manager.ts` via `sdk.query({ prompt, options: queryOptions })`. Supports string prompts and `AsyncIterable<SDKUserMessage>` for image messages.

**User Story:** As a developer, I want to send a prompt to Claude through the app and receive a streamed response, so that I can get AI assistance on my codebase without leaving my IDE-like workflow.

**User Story:** As a developer, I want to attach images to my prompt, so that I can ask Claude about screenshots, diagrams, or mockups.

---

### 1.2 `tool(name, description, inputSchema, handler, extras?)`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to define custom tools (e.g., "run-tests", "deploy-preview") that Claude can invoke through the terminal wrapper, so that Claude can trigger project-specific workflows I've configured.

**User Story:** As a power user, I want to create an MCP tool that lets Claude interact with my app's browser preview panel (e.g., take screenshots, click elements), so that Claude can debug frontend issues visually.

---

### 1.3 `createSdkMcpServer({ name, version?, tools? })`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want the terminal wrapper to expose an in-process MCP server with app-specific tools (e.g., "open-file-in-editor", "switch-thread", "run-terminal-command"), so that Claude can control the app itself as part of its workflow.

**User Story:** As a developer, I want Claude to be able to open a browser preview to a specific URL via a built-in MCP tool, so that I don't have to manually navigate after Claude sets up a dev server.

---

### 1.4 `listSessions(options?: ListSessionsOptions)`
**Status:** ✅ IMPLEMENTED
Used at line 552 via `sdk.listSessions({ dir: cwd })`. Exposed via `claude:list-sessions` IPC handler.

**User Story:** As a developer, I want to browse my past Claude sessions for the current project, so that I can pick up where I left off or review previous conversations.

**User Story:** As a developer, I want sessions filtered by project directory, so that I only see relevant sessions for the project I'm working on.

---

### 1.5 `getSessionMessages(sessionId, options?)`
**Status:** ✅ IMPLEMENTED
Used at line 565 via `sdk.getSessionMessages(sessionId)`. Used for session restore and history.

**User Story:** As a developer, I want to restore my conversation history after restarting the app, so that I don't lose context from a previous Claude session.

**User Story:** As a developer, I want to resume a past session and see the full message history, so that I can continue a conversation seamlessly.

---

### 1.6 `getSessionInfo(sessionId, options?)`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to see detailed metadata (token usage, cost, model used) for any past session, so that I can track my AI usage over time.

**User Story:** As a developer, I want to view session info in the sidebar thread list (e.g., last active time, model used), so that I can quickly identify which session to resume.

---

### 1.7 `forkSession(sessionId, options?)`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to fork a Claude session at a specific point in the conversation, so that I can explore an alternative approach without losing my original thread.

**User Story:** As a developer, I want to branch a session into a new thread in the sidebar, so that I can try a different solution path while keeping the shared context up to that point.

---

### 1.8 `renameSession(sessionId, title, options?)`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to rename a Claude session with a meaningful title, so that I can easily find it later in the session history list.

**User Story:** As a developer, I want the app to auto-generate a session title from the first prompt and persist it via `renameSession`, so that the session history shows descriptive names instead of timestamps.

---

### 1.9 `tagSession(sessionId, tag, options?)`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to tag sessions with labels like "bug-fix", "feature", or "refactor", so that I can filter and organize my session history by work type.

**User Story:** As a developer, I want the app to automatically tag sessions with the project name and thread name, so that sessions are discoverable even outside the terminal wrapper app.

---

## 2. V2 Preview API (Unstable)

### 2.1 `unstable_v2_createSession(options)`
**Status:** ❌ NOT IMPLEMENTED
The app uses the V1 `query()` API with `streamInput()` for multi-turn conversations.

**User Story:** As a developer, I want the app to use the V2 session API for cleaner multi-turn conversations, so that I get more reliable message streaming and session lifecycle management.

**User Story:** As a developer, I want to create long-lived Claude sessions that persist across app restarts using the V2 API, so that the experience feels like a persistent AI pair programmer.

---

### 2.2 `unstable_v2_resumeSession(sessionId, options)`
**Status:** ❌ NOT IMPLEMENTED
Session resume is handled via `query()` with `options.resume`.

**User Story:** As a developer, I want to resume a session using the V2 API, so that multi-turn conversation state is properly restored with the simplified session interface.

---

### 2.3 `unstable_v2_prompt(prompt, options)`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want a quick-ask feature (e.g., Cmd+Shift+P) that sends a one-shot question to Claude and shows the answer in a popup, so that I can get fast answers without creating a full session.

**User Story:** As a developer, I want the app to auto-generate thread names by sending a one-shot prompt summarizing the conversation, so that threads are automatically labeled with meaningful descriptions.

---

## 3. Query Interface (returned by `query()`)

### 3.1 `[AsyncGenerator]` — `for await (const msg of query)`
**Status:** ✅ IMPLEMENTED
Used at line 360: `for await (const message of session.activeQuery!)`.

**User Story:** As a developer, I want to see Claude's response stream in real-time as tokens are generated, so that I can follow the AI's thought process without waiting for the full response.

---

### 3.2 `query.interrupt()`
**Status:** ✅ IMPLEMENTED
Used at lines 249, 517, and 580. Exposed via `claude:interrupt` IPC handler.

**User Story:** As a developer, I want to interrupt Claude mid-response when I realize my prompt was wrong, so that I don't waste time and tokens on an unwanted response.

---

### 3.3 `query.rewindFiles(userMessageId, options?)`
**Status:** ❌ NOT IMPLEMENTED
`enableFileCheckpointing` option is also not set.

**User Story:** As a developer, I want to rewind file changes to a specific point in the conversation, so that I can undo Claude's edits that didn't work out without manually reverting.

**User Story:** As a developer, I want a "rewind to here" button on each message in the conversation, so that I can easily roll back to any point in the session.

---

### 3.4 `query.setPermissionMode(mode)`
**Status:** ❌ NOT IMPLEMENTED
Permission mode is set at query creation time only.

**User Story:** As a developer, I want to switch from "plan" mode to "acceptEdits" mode mid-conversation, so that after reviewing Claude's plan I can let it execute without starting a new session.

**User Story:** As a developer, I want to temporarily elevate permissions to "bypassPermissions" for a batch of operations, then revert back, so that I can avoid clicking "approve" on every file edit during a large refactor.

---

### 3.5 `query.setModel(model?)`
**Status:** ❌ NOT IMPLEMENTED
Model is set at query creation time only.

**User Story:** As a developer, I want to switch models mid-conversation (e.g., from Haiku to Opus) without losing session context, so that I can use a cheaper model for simple tasks and a more capable one for complex reasoning.

---

### 3.6 `query.setMaxThinkingTokens(maxThinkingTokens)` *(deprecated)*
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to adjust thinking token limits on the fly, so that I can get more thorough reasoning for complex problems without restarting the session.

---

### 3.7 `query.applyFlagSettings(settings)`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to change multiple settings at once (model, effort level, allowed tools) on a running session without restarting it, so that I can dynamically adapt Claude's behavior to the current task.

**User Story:** As a developer, I want the project settings panel changes to take effect immediately on the active session, so that I don't need to start a new conversation for settings to apply.

---

### 3.8 `query.initializationResult()`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want the app to dynamically discover available models and show them in the model selector, so that I always see the latest available models without app updates.

**User Story:** As a developer, I want to see my account info (email, organization, subscription tier) in the app settings, so that I know which account is being used.

---

### 3.9 `query.supportedCommands()`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to use slash commands (e.g., `/compact`, `/clear`) in the chat input with autocomplete, so that I can access Claude Code features I'm familiar with from the CLI.

**User Story:** As a developer, I want slash command suggestions to appear as I type `/` in the input box, so that I can discover available commands without memorizing them.

---

### 3.10 `query.supportedModels()`
**Status:** ❌ NOT IMPLEMENTED
Model options are currently hardcoded.

**User Story:** As a developer, I want the model dropdown to be dynamically populated from the SDK, so that new models are automatically available when Anthropic releases them.

**User Story:** As a developer, I want to see model capability flags (e.g., supports extended thinking, supports vision) next to each model option, so that I can make an informed choice.

---

### 3.11 `query.supportedAgents()`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to see and select available subagents in the UI, so that I can delegate specialized tasks to purpose-built agents.

**User Story:** As a developer, I want to create custom agents configured per-project and have them appear in the agent list, so that team-specific workflows are a first-class feature.

---

### 3.12 `query.mcpServerStatus()`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to see the connection status of each MCP server in the settings panel, so that I can diagnose issues when tools are unavailable.

**User Story:** As a developer, I want to see a visual indicator when an MCP server disconnects, so that I know tools may not work and can take action.

---

### 3.13 `query.accountInfo()`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to see my authenticated user info (email, organization) in the app header, so that I know which account's quota is being consumed.

**User Story:** As a team lead, I want to see the subscription tier and usage limits, so that I can monitor my team's AI spending.

---

### 3.14 `query.reconnectMcpServer(serverName)`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want a "reconnect" button next to each MCP server in the settings panel, so that I can recover from transient connection failures without restarting the entire session.

---

### 3.15 `query.toggleMcpServer(serverName, enabled)`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to enable or disable specific MCP servers during a session, so that I can limit which external tools Claude has access to based on the current task.

---

### 3.16 `query.setMcpServers(servers)`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to add or remove MCP servers mid-session (e.g., connecting a database tool when I'm ready for migrations), so that I can gradually grant Claude access to more powerful tools as trust builds.

---

### 3.17 `query.streamInput(stream)`
**Status:** ✅ IMPLEMENTED
Used at line 246. Streams new user messages into a running query via `streamInput(singleMessageIterable(userMsg))`.

**User Story:** As a developer, I want to send follow-up messages while Claude is still processing, so that I can provide additional context or corrections without waiting for the current response to finish.

---

### 3.18 `query.stopTask(taskId)`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to stop a specific background task Claude is running (e.g., a long test suite) without interrupting the entire conversation, so that I can cancel individual operations selectively.

**User Story:** As a developer, I want to see a list of running background tasks with stop buttons, so that I have granular control over Claude's concurrent activities.

---

### 3.19 `query.close()`
**Status:** ❌ NOT IMPLEMENTED
Session cleanup relies on `interrupt()` + `abortController.abort()`.

**User Story:** As a developer, I want the app to cleanly terminate the Claude Code process when I close a thread or the app, so that no orphaned processes consume system resources.

**User Story:** As a developer, I want session cleanup to be reliable, so that closing and reopening the app doesn't leave stale Claude processes running.

---

## 4. SDKSession Interface (V2 Preview)

### 4.1 `session.sessionId`
**Status:** ❌ NOT IMPLEMENTED (V2 API not used)

**User Story:** As a developer, I want each thread in the sidebar to display its associated SDK session ID, so that I can cross-reference with Claude Code CLI sessions for debugging.

---

### 4.2 `session.send(message)`
**Status:** ❌ NOT IMPLEMENTED (V2 API not used)

**User Story:** As a developer, I want a cleaner multi-turn API where I simply call `send()` for each message, so that the code is simpler than managing async iterables.

---

### 4.3 `session.stream()`
**Status:** ❌ NOT IMPLEMENTED (V2 API not used)

**User Story:** As a developer, I want to iterate over response events using the V2 `stream()` API, so that each turn's messages are scoped and don't require tracking state between turns.

---

### 4.4 `session.close()`
**Status:** ❌ NOT IMPLEMENTED (V2 API not used)

**User Story:** As a developer, I want the V2 session to be cleanly closed when I switch threads, so that resources are freed and the process is properly terminated.

---

### 4.5 `session[Symbol.asyncDispose]()`
**Status:** ❌ NOT IMPLEMENTED (V2 API not used)

**User Story:** As a developer, I want automatic session cleanup via `await using`, so that sessions are guaranteed to be disposed of even when errors occur, preventing resource leaks.

---

## 5. Configuration Types — Options

### 5.1 `options.abortController`
**Status:** ✅ IMPLEMENTED
A new `AbortController` is created per query and used for interruption.

**User Story:** As a user, I want to click the "Stop" button to immediately cancel a running query, so that I don't waste tokens on unwanted responses.

---

### 5.2 `options.additionalDirectories`
**Status:** ✅ IMPLEMENTED
Passed to `queryOptions`. UI in settings lets users add/remove directories via folder picker.

**User Story:** As a developer working on a monorepo, I want to grant Claude access to additional directories beyond the project root (e.g., shared libraries), so that Claude can read and edit files across my workspace boundaries.

---

### 5.3 `options.agent`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a power user, I want to assign a named agent identity (e.g., "frontend-specialist") to my Claude session, so that I can run domain-specific agents with tailored behaviors.

---

### 5.4 `options.agents`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a team lead, I want to define multiple subagents (e.g., "code-reviewer", "test-writer", "documenter") within a project, so that Claude can delegate specialized tasks to purpose-built agents during a single session.

---

### 5.5 `options.allowDangerouslySkipPermissions`
**Status:** ❌ NOT IMPLEMENTED
The app uses `permissionMode: 'bypassPermissions'` instead.

**User Story:** As a developer running trusted automation scripts, I want a "danger mode" toggle that skips all permission checks entirely, so that long-running batch operations complete without manual intervention.

---

### 5.6 `options.allowedTools`
**Status:** ✅ IMPLEMENTED
Passed to `queryOptions`. Editable via Settings Modal. "Always Allow" button adds tools at runtime.

**User Story:** As a user, I want to pre-approve specific tools (e.g., Read, Glob, Grep) so that Claude can use them without asking for permission every time, speeding up my workflow.

---

### 5.7 `options.betas`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As an early adopter, I want to opt into beta SDK features (e.g., 1M context) from the project settings, so that I can try cutting-edge features before they're GA.

---

### 5.8 `options.canUseTool`
**Status:** ✅ IMPLEMENTED
Full async permission callback with IPC to renderer, promise-based allow/deny.

**User Story:** As a user, I want Claude to ask for my explicit approval before running shell commands or editing files, so that I maintain control over what actions Claude takes on my system.

---

### 5.9 `options.continue`
**Status:** ❌ NOT IMPLEMENTED
The app uses `resume` with a session ID instead.

**User Story:** As a user who closed the app mid-conversation, I want a "Continue Last Conversation" button that automatically picks up the most recent session, so I can resume work instantly.

---

### 5.10 `options.cwd`
**Status:** ✅ IMPLEMENTED
Configurable at project level, per-panel, and changeable at runtime via CWD button.

**User Story:** As a developer, I want to set the working directory for each Claude session so that file operations and shell commands execute in the correct project root.

---

### 5.11 `options.debug`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer troubleshooting Claude SDK behavior, I want to enable debug mode from the settings to see detailed internal SDK logs, so I can diagnose issues like failed tool calls.

---

### 5.12 `options.debugFile`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer filing a bug report, I want to configure a debug log file path so that all SDK internals are written to a file I can attach to my issue.

---

### 5.13 `options.disallowedTools`
**Status:** ✅ IMPLEMENTED
Stored in config, passed to `queryOptions`. Editable via Settings Modal.

**User Story:** As a cautious user, I want to block specific tools (e.g., Bash) entirely for a session, so that Claude cannot execute shell commands even if I accidentally approve something.

---

### 5.14 `options.effort`
**Status:** ✅ IMPLEMENTED
Segmented control in `ClaudeToolbar`. Also configurable at project level.

**User Story:** As a user, I want to toggle Claude's effort level between low (quick answers) and max (deep analysis), so I can balance response quality against token cost.

---

### 5.15 `options.enableFileCheckpointing`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer making large refactors with Claude, I want file checkpointing enabled so that I can roll back individual file changes if something goes wrong.

---

### 5.16 `options.env`
**Status:** ❌ NOT IMPLEMENTED (at SDK query level)

**User Story:** As a developer, I want to inject custom environment variables (e.g., API keys, feature flags) into Claude's execution environment per-session, so that Claude's tools can access project-specific secrets.

---

### 5.17 `options.executable`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer using Bun or Deno, I want to configure which JavaScript runtime Claude Code uses, so that my project's toolchain is respected when Claude runs scripts.

---

### 5.18 `options.executableArgs`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer who needs custom Node.js flags (e.g., `--max-old-space-size=8192`), I want to pass runtime arguments to the Claude Code process, so that it doesn't crash on memory-intensive operations.

---

### 5.19 `options.extraArgs`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a power user, I want to pass additional CLI arguments to the underlying Claude process, so I can customize behavior without waiting for the GUI to add explicit support.

---

### 5.20 `options.fallbackModel`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user on an unreliable API plan, I want to set a fallback model (e.g., Haiku as fallback for Opus), so that if my primary model is rate-limited, my session continues seamlessly on a cheaper model.

---

### 5.21 `options.forkSession`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user exploring multiple approaches, I want to fork a session into a new branch from a specific point in the conversation, so I can try alternative instructions without losing the original thread.

---

### 5.22 `options.hooks`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer building automation workflows, I want to register hook callbacks (e.g., `onToolStart`, `onToolEnd`) so that the app can trigger side effects like refreshing the browser panel after a file edit.

---

### 5.23 `options.includePartialMessages`
**Status:** ✅ IMPLEMENTED
Set to `true`. Enables streaming text deltas.

**User Story:** As a user, I want to see Claude's response as it's being generated (streaming text), so that I can read along and interrupt early if needed.

---

### 5.24 `options.maxBudgetUsd`
**Status:** ✅ IMPLEMENTED
Editable via Settings Modal. Current cost tracked and displayed in toolbar.

**User Story:** As a cost-conscious user, I want to set a maximum budget per session in USD, so that Claude automatically stops before exceeding my spending limit.

---

### 5.25 `options.maxThinkingTokens` *(deprecated)*
**Status:** ❌ NOT IMPLEMENTED

**User Story:** N/A (deprecated — see `options.thinking`).

---

### 5.26 `options.maxTurns`
**Status:** ✅ IMPLEMENTED
Editable via Settings Modal.

**User Story:** As a user running automated tasks, I want to limit the number of agentic turns Claude can take, so that runaway loops are bounded.

---

### 5.27 `options.mcpServers`
**Status:** ✅ IMPLEMENTED (backend only, no UI)
Passed to `queryOptions`. No UI for configuration — programmatic only.

**User Story:** As a developer integrating external tools, I want to configure MCP servers per project, so that Claude can access custom tool providers like database clients or CI/CD systems.

**User Story:** As a user, I want a visual MCP server configuration panel in project settings, instead of editing config files manually.

---

### 5.28 `options.model`
**Status:** ✅ IMPLEMENTED
Selectable via toolbar dropdown (Sonnet/Opus/Haiku). Configurable as project default.

**User Story:** As a user, I want to switch between Claude models mid-session from the toolbar, so I can use the right model for the task at hand.

---

### 5.29 `options.outputFormat`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer building integrations, I want to request structured JSON output from Claude (via JSON schema), so that I can parse Claude's responses programmatically.

---

### 5.30 `options.pathToClaudeCodeExecutable`
**Status:** ❌ NOT IMPLEMENTED
The app uses `spawnClaudeCodeProcess` instead.

**User Story:** As a developer running a custom build of Claude Code, I want to point the app at my own binary, so I can test pre-release versions or custom forks.

---

### 5.31 `options.permissionMode`
**Status:** ✅ IMPLEMENTED
Full UI support via toolbar dropdown (Default, Accept Edits, Plan, Bypass). `dontAsk` defined but not exposed.

**User Story:** As a user, I want to switch between permission modes so I can match Claude's autonomy level to my trust level for each task.

---

### 5.32 `options.permissionPromptToolName`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer using MCP tools for permission prompts, I want to specify which MCP tool handles permission prompts, so that I can integrate with custom approval workflows.

---

### 5.33 `options.persistSession`
**Status:** ❌ NOT IMPLEMENTED (as explicit SDK option)

**User Story:** As a user, I want my Claude session to be automatically saved to disk so that I can close the app and resume the exact conversation later.

---

### 5.34 `options.plugins`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a power user, I want to load custom SDK plugins from local files, so that I can extend Claude's capabilities with project-specific tools.

---

### 5.35 `options.promptSuggestions`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a new user, I want Claude to suggest follow-up prompts after completing a task, so that I can discover useful next steps (e.g., "Write tests for this?") with a single click.

---

### 5.36 `options.resume`
**Status:** ✅ IMPLEMENTED
Set when `session.sdkSessionId` exists. Session history panel supports browse and resume.

**User Story:** As a user returning to a project, I want to resume a previous Claude conversation, so that Claude has full context of our prior work.

---

### 5.37 `options.resumeSessionAt`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who wants to "rewind" a conversation, I want to resume a session at a specific message (by UUID), so I can branch off from an earlier point.

---

### 5.38 `options.sandbox`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a security-conscious user, I want to run Claude sessions inside a sandboxed environment, so that file system changes and shell commands are isolated from my host system.

---

### 5.39 `options.sessionId`
**Status:** ❌ NOT IMPLEMENTED (as explicit initial UUID)

**User Story:** As a developer integrating with external systems, I want to assign a deterministic session UUID before starting, so that I can correlate Claude sessions with external tracking systems.

---

### 5.40 `options.settingSources`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a team member, I want to control which settings files Claude loads (project-level, user-level), so that I can enforce team-wide permissions while allowing personal customizations.

---

### 5.41 `options.spawnClaudeCodeProcess`
**Status:** ✅ IMPLEMENTED
Supports Docker spawning and local spawning (Electron node with asar-unpacked paths).

**User Story:** As a developer running Claude Code inside Docker containers, I want the app to spawn the Claude process inside my container, so that Claude operates within the container's filesystem and tooling.

---

### 5.42 `options.stderr`
**Status:** ❌ NOT IMPLEMENTED (as SDK callback option)

**User Story:** As a developer debugging issues, I want stderr output from the Claude process displayed in a dedicated error log panel, so that I can see warnings without them being lost in the console.

---

### 5.43 `options.strictMcpConfig`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a team lead enforcing security policies, I want to enable strict MCP validation so that misconfigured or untrusted MCP servers are rejected.

---

### 5.44 `options.systemPrompt`
**Status:** ⚠️ PARTIALLY IMPLEMENTED
Field is stored in config and editable in Settings Modal, but **not passed** to `queryOptions`.

**User Story:** As a user, I want to set a custom system prompt (e.g., "You are a senior React developer. Always use TypeScript."), so that Claude's responses align with my project's conventions.

---

### 5.45 `options.thinking`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user working on complex architectural decisions, I want to enable extended thinking mode with a token budget, so that Claude reasons more deeply before responding.

---

### 5.46 `options.toolConfig`
**Status:** ✅ IMPLEMENTED
Hardcoded as `{ askUserQuestion: { previewFormat: 'html' } }`.

**User Story:** As a developer, I want to configure per-tool settings (like preview format for AskUserQuestion), so that tool interactions render optimally in the GUI.

---

### 5.47 `options.tools`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer building a specialized workflow, I want to restrict which tools Claude has access to (e.g., only Read and Grep for a code review session), so that Claude stays focused on the intended task.

---

## 6. ThinkingConfig

### 6.1 `{ type: "adaptive" }`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user, I want Claude to automatically decide when deep reasoning is needed, so that simple questions get fast answers while complex problems get thorough analysis.

---

### 6.2 `{ type: "enabled", budgetTokens?: number }`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user tackling complex debugging, I want to enable extended thinking with a specific token budget, so that Claude allocates dedicated reasoning capacity for tricky problems.

---

### 6.3 `{ type: "disabled" }`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who wants the fastest possible responses for simple tasks, I want to disable extended thinking entirely, so that Claude responds instantly.

---

## 7. AgentDefinition

### 7.1 `agent.description`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user managing multiple agents, I want each agent to have a description visible in the UI, so I can understand what each agent specializes in.

---

### 7.2 `agent.prompt`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to define a custom system prompt for each subagent, so that a "test-writer" agent generates tests while a "documenter" agent focuses on docs.

---

### 7.3 `agent.tools`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to restrict each subagent to specific tools, so that agents operate within their intended scope.

---

### 7.4 `agent.disallowedTools`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a security-conscious user, I want to explicitly block certain tools per agent (e.g., no Bash for the docs agent), so that subagents cannot exceed their capabilities.

---

### 7.5 `agent.model`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a cost-conscious developer, I want to assign different models to different subagents (e.g., Haiku for searches, Opus for refactoring), so that I optimize cost vs. quality.

---

### 7.6 `agent.mcpServers`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to attach specific MCP servers to specific agents (e.g., database MCP for the "data-migration" agent), so that each agent has exactly the tools it needs.

---

### 7.7 `agent.skills`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want to assign skills to subagents (e.g., "frontend" skill for the UI agent), so that agents leverage specialized knowledge.

---

### 7.8 `agent.maxTurns`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user delegating work to subagents, I want to cap the maximum turns per subagent, so that a subagent doesn't spiral into an infinite loop.

---

### 7.9 `agent.criticalSystemReminder_EXPERIMENTAL`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer building safety-critical workflows, I want to inject a critical system reminder (e.g., "NEVER delete production files"), so that safety constraints are reinforced even when the context is full.

---

## 8. SdkPluginConfig

### 8.1 `{ type: "local", path: string }`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer with custom tooling, I want to load a local SDK plugin, so that Claude can run project-specific tools that aren't part of the standard SDK.

---

## 9. ToolConfig

### 9.1 `toolConfig.askUserQuestion.previewFormat`
**Status:** ✅ IMPLEMENTED
Hardcoded as `'html'` with sandboxed iframe rendering.

**User Story:** As a user interacting with Claude's questions, I want rich HTML previews for question options, so that I can make informed decisions when Claude asks me to choose.

---

## 10. Permission Types

### 10.1 `PermissionMode`
**Status:** ✅ IMPLEMENTED
`'default' | 'acceptEdits' | 'plan' | 'bypassPermissions' | 'dontAsk'` — four modes exposed in UI.

**User Story:** As a user, I want to switch permission modes from the toolbar so I can go from supervised (Default) to autonomous (Bypass) as my trust grows.

**User Story:** As an automation user, I want "Don't Ask" mode that auto-denies all permission requests, so Claude operates in a fully non-interactive read-only mode.

---

### 10.2 `CanUseTool(toolName, input, options)`
**Status:** ✅ IMPLEMENTED
Async callback with IPC to renderer, promise-based allow/deny.

**User Story:** As a user, I want a rich permission prompt that shows exactly what tool is being called and with what input, so I can make an informed allow/deny decision.

---

### 10.3 `PermissionResult`
**Status:** ✅ IMPLEMENTED
Returns `{ behavior: 'allow', updatedInput? }` or `{ behavior: 'deny', message }`.

**User Story:** As a user answering an AskUserQuestion, I want my selected answers to be sent back as updated input, so Claude receives my choices correctly.

---

### 10.4 `PermissionUpdate`
**Status:** ❌ NOT IMPLEMENTED
"Always Allow" adds tools to in-memory array but does not use SDK's `PermissionUpdate`.

**User Story:** As a user, I want my "Always Allow" choices to persist across sessions (saved to project or user settings), so I don't re-approve the same tools every time.

---

### 10.5 `PermissionBehavior`
**Status:** ⚠️ PARTIALLY IMPLEMENTED
Uses `'allow'` and `'deny'`; `'ask'` is implicit via the prompt flow.

**User Story:** As a developer extending the permission system, I want a clear `PermissionBehavior` type so custom rules can programmatically decide whether to auto-allow, auto-deny, or prompt.

---

### 10.6 `PermissionUpdateDestination`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user, I want to choose where permission rules are saved — project-level (shared), user-level (personal), or session-only (temporary) — so my decisions persist at the right scope.

---

### 10.7 `PermissionRuleValue`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a power user, I want to define granular permission rules (e.g., "Allow Bash only for `npm *` or `git *` commands"), so I can auto-approve safe commands while blocking dangerous ones.

---

### 10.8 `SDKPermissionDenial`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user reviewing session activity, I want detailed info about denied tool uses in a session log, so I can audit what Claude tried to do.

---

## 11. MCP Server Config Types

### 11.1 `McpServerConfig`
**Status:** ✅ IMPLEMENTED (partial — stdio only)
Defined in `types.ts` as `{ command, args?, env? }`.

**User Story:** As a developer, I want to configure MCP servers per project so Claude can leverage custom tools.

---

### 11.2 `McpStdioServerConfig`
**Status:** ✅ IMPLEMENTED (unnamed)
Shape matches `{ command, args?, env? }` without the `type?: "stdio"` discriminator.

**User Story:** As a power user, I want to connect Claude to a local MCP server via stdio so I can extend capabilities without network config.

---

### 11.3 `McpSSEServerConfig`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a team lead with a shared tool server, I want to connect Claude to an SSE-based MCP endpoint so my whole team can share centralized tools.

---

### 11.4 `McpHttpServerConfig`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer integrating with a REST API, I want to specify an HTTP MCP endpoint so Claude can call my API's tools with custom auth headers.

---

### 11.5 `McpSdkServerConfigWithInstance`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As an Electron app developer, I want to register an in-process MCP server directly so my app can expose native capabilities (window management, file dialogs, notifications) as MCP tools.

---

### 11.6 `McpClaudeAIProxyServerConfig`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a Claude.ai user, I want sessions in the terminal wrapper to access the same MCP servers I have on Claude.ai, for a consistent experience across platforms.

---

### 11.7 `McpServerStatus`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user with multiple MCP servers, I want real-time status indicators (connected, failed, needs-auth) so I know which tools are available.

---

### 11.8 `McpServerStatusConfig`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer debugging MCP connectivity, I want to inspect the active transport config, so I can verify my config was applied correctly.

---

### 11.9 `McpSetServersResult`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who modified my MCP server list, I want to see which servers were added, removed, or failed, so I can fix errors immediately.

---

### 11.10 `AgentMcpServerSpec`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a power user spawning subagents, I want to specify which MCP tools each subagent has access to for proper isolation.

---

### 11.11 `SdkMcpToolDefinition<Schema>`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As an extension developer, I want type-safe tool definitions with Zod schemas so the compiler catches mismatches before runtime.

---

## 12. Message Types

### 12.1 `SDKAssistantMessage`
**Status:** ✅ IMPLEMENTED
Handles `msg.type === 'assistant'`, extracts content blocks, streams deltas.

**User Story:** As a user, I want to see Claude's responses stream in real-time so I can follow its reasoning as it types.

---

### 12.2 `SDKUserMessage`
**Status:** ✅ IMPLEMENTED
Handles `msg.type === 'user'`, extracts tool results, builds text + image content.

**User Story:** As a user, I want to send text and image prompts so I can describe problems visually alongside written instructions.

---

### 12.3 `SDKUserMessageReplay`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user resuming a previous session, I want the app to process replayed messages so Claude's context is fully restored and tool permissions are re-applied without re-prompting me.

---

### 12.4 `SDKResultMessage`
**Status:** ✅ IMPLEMENTED
Extracts `session_id`, `total_cost_usd`, `usage`, sends `session-meta` to renderer.

**User Story:** As a user, I want to see the total cost and token usage after each Claude interaction so I can monitor my API spending.

---

### 12.5 `SDKSystemMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user opening a new session, I want the app to display which model, tools, and MCP servers were loaded at initialization, so I can verify the session is configured correctly.

---

### 12.6 `SDKPartialAssistantMessage`
**Status:** ✅ IMPLEMENTED
SDK invoked with `includePartialMessages: true`. Streams text deltas and tool use blocks.

**User Story:** As a user watching Claude work, I want to see each word appear as it's generated and each tool invocation show up immediately, so I can interrupt early if Claude is heading wrong.

---

### 12.7 `SDKCompactBoundaryMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user in a long session, I want a visual divider in the chat when Claude compacts its history, so I understand that earlier messages may have been summarized.

---

### 12.8 `SDKStatusMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user waiting during a long operation, I want to see status messages (e.g., "Compacting conversation...") so I know the system is still working.

---

### 12.9 `SDKAuthStatusMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user whose API key has expired, I want the app to display the auth status and prompt me to re-authenticate, rather than showing a cryptic error.

---

### 12.10 `SDKAPIRetryMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user experiencing rate limits, I want to see "API request failed, retrying in 5s (attempt 2/3)" so I know the system is self-healing.

---

### 12.11 `SDKLocalCommandOutputMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who types slash commands in chat, I want the output to render inline in the conversation instead of being silently dropped.

---

### 12.12 `SDKToolProgressMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user watching a long-running tool execute, I want a progress indicator with elapsed time so I can tell whether the tool is still working or stalled.

---

### 12.13 `SDKToolUseSummaryMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user reviewing a completed session, I want a summary of all tools Claude used (e.g., "Read 12 files, edited 3, ran 5 bash commands") to understand the scope of changes.

---

### 12.14 `SDKFilesPersistedEvent`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who wants to undo Claude's edits, I want checkpoint markers when files are persisted so I can roll back with confidence.

---

### 12.15 `SDKRateLimitEvent`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user on a metered plan, I want a prominent warning when I hit a rate limit, including wait time, so I can plan accordingly.

---

### 12.16 `SDKPromptSuggestionMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who just received Claude's response and is unsure what to ask next, I want suggested follow-up prompts (e.g., "Run the tests") so I can continue with a single click.

---

### 12.17 `SDKElicitationCompleteMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user whose MCP server triggered an elicitation, I want confirmation that my response was processed so the conversation resumes smoothly.

---

## 13. Background Task Messages

### 13.1 `SDKTaskStartedMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who kicked off a background task, I want a notification that it has started with its task ID, so I can track it separately.

---

### 13.2 `SDKTaskProgressMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user with a background task running, I want periodic progress updates in a task panel so I can monitor without leaving my current workflow.

---

### 13.3 `SDKTaskNotificationMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user focused on another thread, I want a desktop notification when a background task finishes, so I can review results at my convenience.

---

## 14. Hook Messages

### 14.1 `SDKHookStartedMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a power user who configured custom hooks, I want to see when a hook begins executing, so I understand why Claude might be pausing.

---

### 14.2 `SDKHookProgressMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user whose hook runs a slow external process, I want progress updates so I know it hasn't hung.

---

### 14.3 `SDKHookResponseMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user whose hook blocked a dangerous edit, I want to see the hook's response (e.g., "Blocked: cannot modify production config") so I understand why.

---

## 15. Hook Events

### 15.1 `"PreToolUse"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a team lead, I want a `PreToolUse` hook that prevents Claude from running `rm -rf` in production directories, blocking dangerous operations before they execute.

---

### 15.2 `"PostToolUse"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want a `PostToolUse` hook that auto-formats changed files with Prettier after every edit, so Claude's code always matches our style guide.

---

### 15.3 `"PostToolUseFailure"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As an ops engineer, I want a `PostToolUseFailure` hook that logs failed tool executions to monitoring, so I can track failure patterns.

---

### 15.4 `"UserPromptSubmit"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user, I want a `UserPromptSubmit` hook that appends project context (current git branch, recent commits) to every prompt, so Claude always has fresh context.

---

### 15.5 `"SessionStart"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As an admin, I want a `SessionStart` hook that logs user, model, and permission mode to an audit trail every time a session begins.

---

### 15.6 `"SessionEnd"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer, I want a `SessionEnd` hook that generates a git commit message summarizing what Claude did during the session.

---

### 15.7 `"Stop"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user, I want a `Stop` hook that saves Claude's last response to "session notes" whenever the agent stops, for a persistent record of where we left off.

---

### 15.8 `"Notification"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user running Claude in a background tab, I want `Notification` events to trigger native OS notifications so I see important alerts without checking the Claude panel.

---

### 15.9 `"PermissionRequest"`
**Status:** ❌ NOT IMPLEMENTED (as hook event)

**User Story:** As a security-conscious user, I want a `PermissionRequest` hook that auto-approves read-only ops but requires approval for writes, reducing interruptions while maintaining safety.

---

### 15.10 `"Setup"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a team member, I want a `Setup` hook that validates environment prerequisites (required CLI tools, correct Node version) on session init, so Claude doesn't fail due to missing dependencies.

---

### 15.11 `"TeammateIdle"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user running multiple Claude agents in parallel, I want a `TeammateIdle` hook that notifies me when an agent becomes idle, so I can assign new work or shut it down.

---

### 15.12 `"TaskCompleted"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a project manager, I want a `TaskCompleted` hook that updates our task tracker (e.g., Asana) when Claude finishes a task, keeping the project board current.

---

### 15.13 `"SubagentStart"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user, I want to see when Claude spawns a subagent via a `SubagentStart` hook, displayed as nested activity, so I understand the full scope of work.

---

### 15.14 `"SubagentStop"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user monitoring usage, I want a `SubagentStop` hook that aggregates the subagent's token usage into the parent session's cost display for accurate totals.

---

### 15.15 `"PreCompact"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user in a long session, I want a `PreCompact` hook that saves the full transcript before compaction, so I have an archive for later review.

---

### 15.16 `"PostCompact"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user, I want a `PostCompact` hook that displays what was compacted and what key context Claude retained, so I can re-state important details if lost.

---

### 15.17 `"ConfigChange"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer sharing a project, I want a `ConfigChange` hook that detects when `.claude/settings.json` is updated and prompts me to reload.

---

### 15.18 `"WorktreeCreate"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user, I want a `WorktreeCreate` hook that opens the new worktree's directory in a new terminal tab.

---

### 15.19 `"WorktreeRemove"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user done with a feature branch, I want a `WorktreeRemove` hook that cleans up associated terminal sessions and browser views.

---

### 15.20 `"InstructionsLoaded"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user maintaining custom instructions, I want an `InstructionsLoaded` hook showing which files were loaded and their total token count, so I can optimize for context room.

---

### 15.21 `"Elicitation"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user of MCP servers requiring interactive input, I want `Elicitation` events to render as custom forms (radio buttons, text fields) for structured responses.

---

### 15.22 `"ElicitationResult"`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who responded to an MCP elicitation, I want confirmation of my selection recorded in the chat for an audit trail.

---

## 16. Hook Configuration & Callbacks

### 16.1 `HookCallbackMatcher`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a power user, I want to configure hook matchers with glob patterns (e.g., match only `Bash` tool use) so hooks run selectively without slowing down irrelevant operations.

---

### 16.2 `HookCallback(input, toolUseID, options)`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer extending the app, I want to register TypeScript hook callbacks that receive strongly-typed inputs and return control-flow decisions, so I can build custom guardrails.

---

### 16.3 `HookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook author, I want a unified `HookInput` type that I can switch on by event name, so I can write a single handler dispatching to specialized logic.

---

### 16.4 `BaseHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook author, I want every hook input to include base fields (session ID, CWD, permission mode) so my logging hooks produce consistent records.

---

## 17. Hook Input Types

### 17.1 `PreToolUseHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook that validates tool inputs, I need `tool_name`, `tool_input`, and `tool_use_id` to decide whether to allow, modify, or block the operation.

---

### 17.2 `PostToolUseHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook that tracks file changes, I need `tool_response` after a successful edit to update a diff viewer showing all changes during the session.

---

### 17.3 `PostToolUseFailureHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook that handles tool errors, I need the `error` field to suggest remediation steps (e.g., "npm install" if module-not-found).

---

### 17.4 `NotificationHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook that routes alerts, I need `message`, `title`, and `type` to send critical notifications to Slack and informational ones to the app's tray.

---

### 17.5 `UserPromptSubmitHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook that enriches prompts, I need the raw `prompt` text to prepend project context before Claude sees it.

---

### 17.6 `SessionStartHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook that initializes tooling, I need `source` and `model` to configure model-specific behaviors (e.g., different budgets for Haiku vs Opus).

---

### 17.7 `SessionEndHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook generating reports, I need `reason` to distinguish between completions, interrupts, and errors in analytics.

---

### 17.8 `StopHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook capturing final state, I need `last_assistant_message` to extract action items from Claude's last response.

---

### 17.9 `SubagentStartHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook managing resources, I need `agent_id` and `agent_type` to track concurrent subagents and enforce maximums.

---

### 17.10 `SubagentStopHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook collecting results, I need the `agent_transcript_path` to read and summarize what the subagent accomplished.

---

### 17.11 `PreCompactHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook preserving context, I need `trigger` and `custom_instructions` to inject critical reminders into compaction instructions.

---

### 17.12 `PostCompactHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook validating compaction, I need to fire after completion to check whether essential instructions survived.

---

### 17.13 `PermissionRequestHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook implementing auto-approve, I need `tool_name` and `tool_input` to auto-approve all `Read` operations on non-sensitive paths.

---

### 17.14 `SetupHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook validating environments, I need `trigger` ("init" vs "maintenance") to run expensive checks only on first init.

---

### 17.15 `TeammateIdleHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook coordinating multi-agent work, I need `teammate_name` and `team_name` to reassign work from idle agents.

---

### 17.16 `TaskCompletedHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook that updates project management, I need `task_id` and `task_subject` to mark the corresponding ticket as done.

---

### 17.17 `ConfigChangeHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook maintaining consistency, I need `source` and `file_path` to detect which config changed and whether to reload.

---

### 17.18 `WorktreeCreateHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook setting up dev environments, I need `name` to auto-install dependencies in the new worktree.

---

### 17.19 `WorktreeRemoveHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook cleaning up, I need `worktree_path` to stop running processes and close associated terminals.

---

### 17.20 `InstructionsLoadedHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook validating instructions, I need to know when loaded to check for conflicts between global and project-level instructions.

---

### 17.21 `ElicitationHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook handling MCP elicitations, I need the request details to render custom UI elements (dropdowns, checkboxes).

---

### 17.22 `ElicitationResultHookInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook tracking decisions, I need the completion data to log which option the user selected for compliance auditing.

---

## 18. Hook Output Types

### 18.1 `HookJSONOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook author, I want a union output type so I can return either sync decisions or async deferral, with TypeScript enforcing correctness.

---

### 18.2 `AsyncHookJSONOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook running expensive validations, I want to return `{ async: true, asyncTimeout: 30000 }` so the SDK waits without blocking indefinitely.

---

### 18.3 `SyncHookJSONOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook making instant decisions, I want to return sync control-flow options so Claude continues immediately without async overhead.

---

### 18.4 `PreToolUseHookSpecificOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook sanitizing inputs, I want to return modified `tool_input` (e.g., strip secrets from env vars) before the tool executes.

---

### 18.5 `PostToolUseHookSpecificOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook enriching tool results, I want to append context (e.g., "file last modified 2 hours ago") so Claude has additional useful information.

---

### 18.6 `PermissionRequestHookSpecificOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook implementing granular permissions, I want to return allow/deny with custom messages so users see clear explanations.

---

### 18.7 `UserPromptSubmitHookSpecificOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a hook augmenting prompts, I want to return additional context (e.g., "User's timezone is PST, branch is feat/login") appended without modifying the original text.

---

## 19. Elicitation Types

### 19.1 `ElicitationRequest`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user whose MCP server needs dynamic input, I want the app to render a form when the server sends an elicitation request.

---

### 19.2 `ElicitationResult`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who filled out an elicitation form, I want my response sent back and reflected in the chat history.

---

### 19.3 `PromptRequest`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user whose MCP tool needs confirmation before a dangerous operation, I want a prompt dialog inline in the conversation.

---

### 19.4 `PromptRequestOption`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user presented with a multi-choice MCP prompt, I want clearly labeled options with descriptions.

---

### 19.5 `PromptResponse`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who selected an option, I want the conversation to show my choice and continue seamlessly.

---

## 20. Session Types

### 20.1 `SDKSessionInfo`
**Status:** ✅ IMPLEMENTED (consumed, not typed)
`listSessions()` results mapped to `ClaudeSessionSummary`.

**User Story:** As a user returning to a project, I want to see past sessions with summaries and timestamps to quickly find the right conversation.

---

### 20.2 `SessionMessage`
**Status:** ✅ IMPLEMENTED (consumed, not typed)
`getSessionMessages()` results processed by `mapHistoryToMessages()`.

**User Story:** As a user viewing a past transcript, I want to see the full conversation including tool calls and results.

---

### 20.3 `ListSessionsOptions`
**Status:** ✅ IMPLEMENTED (partial — only `dir` used)

**User Story:** As a user with many projects, I want to list sessions filtered by directory so I only see relevant ones.

---

### 20.4 `GetSessionMessagesOptions`
**Status:** ✅ IMPLEMENTED (partial — no `limit`/`offset`)

**User Story:** As a user with a very long session, I want to paginate through messages so the UI loads quickly.

---

### 20.5 `GetSessionInfoOptions`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user hovering over a session in history, I want to see metadata (model, cost, duration) without loading the full transcript.

---

### 20.6 `ForkSessionOptions`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user wanting to explore alternatives, I want to fork from a specific message to branch the conversation.

---

### 20.7 `ForkSessionResult`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who forked a session, I want the new session opened in a new tab with history up to the fork point.

---

### 20.8 `SessionMutationOptions`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user with non-default project dirs, I want mutations to target the correct directory.

---

## 21. Tool Input Schemas

### 21.1 `AgentInput`
**Status:** ❌ NOT IMPLEMENTED (generic rendering only)

**User Story:** As a user watching Claude orchestrate work, I want to see when a subagent is launched with a clear summary of its task, not raw JSON.

---

### 21.2 `AskUserQuestionInput`
**Status:** ✅ IMPLEMENTED
Dedicated `AskUserQuestionPrompt` component with single/multi-select, free-text, HTML/markdown previews.

**User Story:** As a user being asked a clarifying question, I want nicely formatted options with preview thumbnails for informed choices.

---

### 21.3 `BashInput`
**Status:** ✅ IMPLEMENTED
Renders commands in monospace code blocks with approve/deny prompts.

**User Story:** As a user reviewing a Bash command, I want it syntax-highlighted in a code block with clear approve/deny prompt.

---

### 21.4 `TaskOutputInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who started a background build, I want Claude to fetch and display the task's output to check if the build succeeded.

---

### 21.5 `FileEditInput`
**Status:** ✅ IMPLEMENTED
Renders `file_path`, `old_string` (red), `new_string` (green) in visual diff.

**User Story:** As a user reviewing a file edit, I want old text in red and new text in green (like a diff) to quickly verify the change.

---

### 21.6 `FileReadInput`
**Status:** ✅ IMPLEMENTED
Renders `file_path` in accent color.

**User Story:** As a user watching Claude investigate, I want to see which files are being read with full paths.

---

### 21.7 `FileWriteInput`
**Status:** ✅ IMPLEMENTED
Renders `file_path` and optionally `content` in a scrollable code block.

**User Story:** As a user reviewing a new file, I want to see the file path and preview content before it's written.

---

### 21.8 `GlobInput`
**Status:** ✅ IMPLEMENTED
Renders `pattern` and optional `path`.

**User Story:** As a user tracking Claude's file search, I want to see the glob pattern being used.

---

### 21.9 `GrepInput`
**Status:** ✅ IMPLEMENTED
Renders `pattern` and optional `path`. Results render as file list.

**User Story:** As a user watching code searches, I want to see the regex pattern and search path to verify correctness.

---

### 21.10 `TaskStopInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user cancelling a runaway process, I want confirmation that the resource-consuming task was terminated.

---

### 21.11 `NotebookEditInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a data scientist, I want Claude to edit Jupyter cells in a notebook-aware format so I can review changes to my analysis pipeline.

---

### 21.12 `WebFetchInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user asking Claude to check a URL, I want to see the target URL so I can verify Claude is fetching the right resource.

---

### 21.13 `WebSearchInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user asking Claude to research, I want to see the search query being used so I can refine it.

---

### 21.14 `TodoWriteInput`
**Status:** ❌ NOT IMPLEMENTED (app has custom TodoView, not connected to SDK)

**User Story:** As a user asking Claude to plan, I want TodoWrite tool to sync with my app's todo panel so tasks appear in my project's task list.

---

### 21.15 `ExitPlanModeInput`
**Status:** ❌ NOT IMPLEMENTED (plan mode exists, but not this type)

**User Story:** As a user in plan mode who reviewed Claude's plan, I want to exit plan mode and transition to execution.

---

### 21.16 `ListMcpResourcesInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user with MCP servers exposing data, I want to browse available resources in a sidebar panel.

---

### 21.17 `ReadMcpResourceInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who selected an MCP resource, I want Claude to read and display its contents inline.

---

### 21.18 `SubscribeMcpResourceInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user monitoring a changing resource (e.g., log file via MCP), I want live updates in the chat.

---

### 21.19 `UnsubscribeMcpResourceInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who no longer needs MCP resource updates, I want to unsubscribe to keep the chat clean.

---

### 21.20 `SubscribePollingInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user monitoring a deploy pipeline, I want polling-based status updates so Claude periodically checks progress.

---

### 21.21 `UnsubscribePollingInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user whose deployment finished, I want to stop polling to save API calls and keep the chat clean.

---

### 21.22 `ConfigInput`
**Status:** ❌ NOT IMPLEMENTED (app has own config system)

**User Story:** As a user wanting to check a Claude Code setting mid-session, I want Claude to read/write its own config without session restart.

---

### 21.23 `EnterWorktreeInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user working on multiple features, I want Claude to create/enter a git worktree so changes are isolated without manual branch management.

---

### 21.24 `ExitWorktreeInput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user done with a feature branch worktree, I want Claude to exit and clean up.

---

### 21.25 `McpInput`
**Status:** ❌ NOT IMPLEMENTED (MCP calls render as generic tool-use blocks)

**User Story:** As a user whose session calls a custom MCP tool, I want it clearly labeled as an MCP call (vs. built-in) so I understand which system is invoked.

---

## 22. Tool Output Schemas

### 22.1 `AgentOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who launched a subagent, I want to see whether it completed, is running async, or opened a nested context.

---

### 22.2 `AskUserQuestionOutput`
**Status:** ✅ IMPLEMENTED
`AskUserQuestionResolved` renders answered questions with a green checkmark.

**User Story:** As a user who answered a question, I want a compact resolved state showing my selections.

---

### 22.3 `BashOutput`
**Status:** ✅ IMPLEMENTED
Tool results rendered as plain text.

**User Story:** As a user reviewing command output, I want stdout displayed cleanly with errors visually distinguished.

---

### 22.4 `FileEditOutput`
**Status:** ✅ IMPLEMENTED

**User Story:** As a user who approved an edit, I want the diff summary confirming the change was applied correctly.

---

### 22.5 `FileReadOutput`
**Status:** ✅ IMPLEMENTED

**User Story:** As a user watching Claude read a file, I want to see the contents or summary for large files.

---

### 22.6 `FileWriteOutput`
**Status:** ✅ IMPLEMENTED

**User Story:** As a user who approved a write, I want confirmation with a diff of what was written.

---

### 22.7 `GlobOutput`
**Status:** ✅ IMPLEMENTED (specialized rendering as file list)

**User Story:** As a user searching for files, I want Glob results displayed as a clean file list.

---

### 22.8 `GrepOutput`
**Status:** ✅ IMPLEMENTED (specialized rendering as file list)

**User Story:** As a user searching for code, I want Grep results in a scannable list.

---

### 22.9 `TaskStopOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who stopped a task, I want clear confirmation that it was terminated.

---

### 22.10 `NotebookEditOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a data scientist, I want notebook edit results showing modified cells and content.

---

### 22.11 `WebFetchOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who asked Claude to fetch docs, I want HTTP status and content rendered with proper formatting.

---

### 22.12 `WebSearchOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who asked Claude to research, I want search results with titles, snippets, and clickable links.

---

### 22.13 `TodoWriteOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user whose session updated the task list, I want before/after state of the todo list.

---

### 22.14 `ExitPlanModeOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user transitioning from plan to execution, I want a summary of the finalized plan.

---

### 22.15 `ListMcpResourcesOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user exploring MCP resources, I want them listed with names, descriptions, and types.

---

### 22.16 `ReadMcpResourceOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user reading an MCP resource, I want content displayed with appropriate formatting.

---

### 22.17 `ConfigOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who checked a config value, I want to see the current value and its source.

---

### 22.18 `EnterWorktreeOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who created a worktree, I want to see the path and branch name.

---

### 22.19 `ExitWorktreeOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user exiting a worktree, I want confirmation I'm back in the main directory.

---

### 22.20 `McpOutput`
**Status:** ❌ NOT IMPLEMENTED (renders as generic tool output)

**User Story:** As a user whose MCP tool returned structured data, I want it rendered intelligently (tables, code blocks) rather than raw JSON.

---

### 22.21 `SubscribeMcpResourceOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user subscribing to an MCP resource, I want confirmation showing subscription details.

---

### 22.22 `UnsubscribeMcpResourceOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user unsubscribing, I want confirmation that the subscription was removed.

---

### 22.23 `SubscribePollingOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user setting up polling, I want to see the interval and target confirmed.

---

### 22.24 `UnsubscribePollingOutput`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user stopping polling, I want confirmation that polling has ceased.

---

## 23. Sandbox Types

### 23.1 `SandboxSettings`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As an admin setting up the app for a team, I want to configure sandbox restrictions per project so junior developers cannot execute destructive commands outside the project directory.

---

### 23.2 `SandboxNetworkConfig`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a security-conscious user, I want to restrict Claude's network access to specific domains so Bash commands cannot exfiltrate data.

---

### 23.3 `SandboxFilesystemConfig`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer on a monorepo, I want to restrict Claude's filesystem access to only my team's subdirectory.

---

## 24. Info & Metadata Types

### 24.1 `SDKControlInitializeResponse`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer extending the app, I want access to the full SDK init response so the UI dynamically adapts to the SDK version.

---

### 24.2 `SlashCommand`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user typing in chat, I want a list of available slash commands with descriptions and argument hints.

---

### 24.3 `ModelInfo`
**Status:** ❌ NOT IMPLEMENTED (model options hardcoded)

**User Story:** As a user choosing a model, I want to see capabilities (context window, speed) fetched from the SDK as new models are released.

---

### 24.4 `AgentInfo`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user whose session spawned subagents, I want to see active agents with task descriptions and progress.

---

### 24.5 `AccountInfo`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user, I want to see my account info (name, plan tier, usage limits) in the sidebar so I know which account is active.

---

### 24.6 `ModelUsage`
**Status:** ✅ IMPLEMENTED (partial, custom)
Tracks `costUsd`, `inputTokens`, `outputTokens`. Displayed in toolbar.

**User Story:** As a budget-conscious user, I want real-time cost and token usage in the toolbar.

---

### 24.7 `NonNullableUsage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer processing usage data, I want guaranteed non-null fields so I don't need null checks in analytics.

---

### 24.8 `RewindFilesResult`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user undoing Claude's changes, I want a "rewind" button that reverts files to their pre-tool-execution state.

---

## 25. Process & Transport Types

### 25.1 `SpawnedProcess`
**Status:** ✅ IMPLEMENTED (custom equivalent)
`SpawnResult` with `{ stdin, stdout, killed, exitCode, kill, on, once, off }`. `wrapChild()` wraps Node's `ChildProcess`.

**User Story:** As a developer packaging the Electron app, I want to customize how Claude Code processes are spawned for the bundled .asar environment.

---

### 25.2 `SpawnOptions`
**Status:** ✅ IMPLEMENTED (custom equivalent)
`SpawnOpts` with `{ command, args, cwd, env, signal }`.

**User Story:** As a developer supporting Docker-based sessions, I want to intercept spawn options and redirect into a Docker container.

---

### 25.3 `Transport`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As an Electron app developer, I want to replace the default transport layer so communication flows through Electron's IPC channels.

---

## 26. Enums & Literal Types

### 26.1 `ExitReason`
**Status:** ✅ IMPLEMENTED (inline literals)
Uses `'completed' | 'error' | 'interrupted'` in `ClaudeSessionEnded.reason`.

**User Story:** As a user whose session ended, I want a clear reason (completed, error, interrupted) in the status badge.

---

### 26.2 `EXIT_REASONS`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer building analytics, I want a canonical list of exit reasons so the compiler warns about unhandled cases.

---

### 26.3 `HOOK_EVENTS`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a power user, I want hook events so I can automate quality gates around Claude's tool usage.

---

### 26.4 `ApiKeySource`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user with API keys in multiple places, I want to see which source the current key came from for debugging.

---

### 26.5 `SettingSource`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user wondering why a setting has a certain value, I want to see which file provides it.

---

### 26.6 `ConfigScope`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user setting a preference, I want to choose whether it applies globally, to the project, or only the current thread.

---

### 26.7 `FastModeState`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user who enabled fast mode, I want the current status in the toolbar so I know which model is active.

---

### 26.8 `SDKStatus`
**Status:** ✅ IMPLEMENTED (custom equivalent)
Custom `ClaudeStatus` with priority-based resolution and color-coded badges.

**User Story:** As a user managing multiple panels, I want color-coded status indicators (running=blue, action-needed=amber, done=green) on each thread.

---

### 26.9 `SdkBeta`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As an early adopter, I want to opt into beta features per-session without affecting stable workflows.

---

### 26.10 `OutputFormat`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer building pipelines, I want Claude to return structured JSON responses for reliable automated processing.

---

### 26.11 `JsonSchemaOutputFormat`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer integrating with data pipelines, I want to specify a JSON schema that Claude must conform to for type-safe responses.

---

## 27. Classes

### 27.1 `AbortError extends Error`
**Status:** ✅ IMPLEMENTED (handled, not imported)
Checked via `err.name === 'AbortError'` at line 493.

**User Story:** As a user who clicked interrupt, I want the session to stop cleanly with "interrupted" status, not a scary error.

---

## 28. Browser SDK

### 28.1 `query(options: BrowserQueryOptions)`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer building a web version of the terminal wrapper, I want WebSocket-based query so sessions run entirely in the browser without Electron.

---

### 28.2 `OAuthCredential`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user authenticating via OAuth (Claude.ai), I want my token used for API calls so I don't need a separate API key.

---

### 28.3 `AuthMessage`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a user whose token is expiring, I want a re-authentication prompt so the session continues without data loss.

---

### 28.4 `WebSocketOptions`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer behind a corporate proxy, I want to configure WebSocket options (URL, headers, reconnect) for restricted networks.

---

### 28.5 `BrowserQueryOptions`
**Status:** ❌ NOT IMPLEMENTED

**User Story:** As a developer building a multi-tenant web app, I want browser-specific options (OAuth, tenant IDs) so each user's sessions are isolated.

---

## 29. Embed Module

### 29.1 `default` (cliPath)
**Status:** ✅ IMPLEMENTED (manual equivalent)
The app manually resolves the CLI path to `node_modules/@anthropic-ai/claude-agent-sdk/cli.js` with asar-unpacked handling.

**User Story:** As a developer packaging the Electron app, I want a reliable path to the Claude Code CLI that works in both dev and production builds.

---

*Generated from `@anthropic-ai/claude-agent-sdk@0.2.77` analysis against the `terminal-wrapper` codebase.*
