# In-Process MCP Tools — Implementation Plan

**Goal:** Use `createSdkMcpServer()` + `tool()` from `@anthropic-ai/claude-agent-sdk` to let Claude control the terminal-wrapper app itself — navigate projects, drive terminals, open browsers, orchestrate multi-agent workflows.

**Integration Point:** `src/main/claude/claude-session-manager.ts` line ~423, inject in-process server into `queryOptions.mcpServers`.

---

## Architecture

### How It Works

```
Claude Session (SDK query)
  ↓ tool call via MCP
In-Process MCP Server (main process)
  ↓ direct function calls
Store / PtyManager / BrowserManager / ClaudeSessionManager
  ↓ state changes + IPC events
Renderer UI updates automatically
```

- The MCP server runs **in the main Electron process** — no child process spawning needed
- Has direct access to: store, pty-manager, browser-manager, claude-session-manager, devcontainer-manager
- Tools are defined with Zod schemas via `tool()` for type-safe inputs
- Results flow back to Claude as regular tool responses

### Key Files to Create/Modify

| File | Action |
|---|---|
| `src/main/claude/app-mcp-server.ts` | **CREATE** — Define all in-process MCP tools |
| `src/main/claude/claude-session-manager.ts` | **MODIFY** — Import and inject app MCP server into queryOptions |
| `src/main/claude/types.ts` | **MODIFY** — Extend `McpServerConfig` to support `{ type: "sdk" }` variant |

### Injection Pattern

```typescript
// app-mcp-server.ts
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'

export function createAppMcpServer(session: ClaudeSession, store: Store) {
  return createSdkMcpServer({
    name: 'terminal-wrapper',
    tools: [
      tool('get_app_state', 'Get current projects, threads, panels', z.object({}), async () => { ... }),
      // ... more tools
    ]
  })
}

// claude-session-manager.ts (line ~423)
const appMcpServer = createAppMcpServer(session, store)
queryOptions.mcpServers = {
  'terminal-wrapper': appMcpServer,
  ...(config.mcpServers || {})
}
```

---

## Tier 1 — Core App Awareness (High Impact, Implement First)

### [ ] `get_app_state`

**Description:** Returns the current app state — projects, threads, panels, active selections.

**Input:** `z.object({ scope?: z.enum(['full', 'active_project', 'active_thread']).default('active_project') })`

**Returns:** Projects with threads, tabs, panels. Active project/thread/tab IDs. Panel types and states.

**User Story:** As a developer asking Claude "what am I working on?", I want Claude to inspect the app state and tell me which project, thread, and panels are open, so that Claude has full context of my workspace without me explaining it.

**User Story:** As a developer switching between tasks, I want Claude to know which threads exist and what's in each one, so it can suggest resuming the right context.

**Implementation:** Read from main store via `store.getState()`, filter/format based on scope.

---

### [ ] `switch_thread`

**Description:** Switch the active thread within the current project, or switch project + thread.

**Input:** `z.object({ threadId: z.string(), projectId: z.string().optional() })`

**Returns:** `{ success: true, thread: { id, name, tabs } }`

**User Story:** As a developer who asked Claude to "check the auth-refactor thread", I want Claude to switch to that thread automatically so I can see the relevant terminals and browser panels without manual navigation.

**User Story:** As a developer running a multi-step workflow, I want Claude to create a thread for each step and switch between them, so each concern is isolated in its own workspace.

**Implementation:** Dispatch `setActiveThread` (and optionally `setActiveProject`) to store.

---

### [ ] `create_thread`

**Description:** Create a new thread (workspace) in a project.

**Input:** `z.object({ name: z.string(), projectId: z.string().optional() })`

**Returns:** `{ success: true, thread: { id, name } }`

**User Story:** As a developer asking Claude to "set up a testing workspace", I want Claude to create a new thread named "testing" with appropriate panels, so I have an isolated workspace for running tests.

**User Story:** As a developer working on multiple features, I want Claude to spin up a new thread per feature branch, so changes and terminals don't interfere with each other.

**Implementation:** Dispatch `addThread` to store with generated ID and name.

---

### [ ] `run_in_terminal`

**Description:** Execute a command in a specific terminal panel, or the currently focused terminal.

**Input:** `z.object({ command: z.string(), panelId: z.string().optional(), waitForOutput: z.boolean().default(false), timeoutMs: z.number().default(5000) })`

**Returns:** `{ success: true, panelId: string }` (or `{ output: string }` if waitForOutput)

**User Story:** As a developer who asked Claude to "start the dev server", I want Claude to run `npm run dev` in my terminal panel directly — not via the Bash tool which creates a separate process — so I can see the output in my actual terminal and it persists after the command.

**User Story:** As a developer doing a full-stack workflow, I want Claude to run `npm run dev` in one terminal, `npm test --watch` in another, and then check the browser — all orchestrated automatically.

**User Story:** As a developer, I want Claude to run a build command in my terminal and wait for the output, so it can check if the build succeeded before proceeding.

**Implementation:** Call `ptyManager.write(panelId, command + '\n')`. If `waitForOutput`, subscribe to terminal data events and collect output until timeout or prompt detection.

---

### [ ] `read_terminal_output`

**Description:** Read recent output from a terminal panel.

**Input:** `z.object({ panelId: z.string(), lines: z.number().default(50) })`

**Returns:** `{ output: string, panelId: string }`

**User Story:** As a developer who asked Claude to check why the build failed, I want Claude to read the terminal output and diagnose the error, without me copy-pasting logs into the chat.

**User Story:** As a developer running a dev server, I want Claude to read the terminal to see if the server started successfully (or if there's an error on a specific port), so it can take corrective action automatically.

**Implementation:** Read from terminal buffer (saved state or xterm serialization via IPC).

---

### [ ] `navigate_browser`

**Description:** Navigate the embedded browser panel to a URL, or get current browser info.

**Input:** `z.object({ url: z.string().optional(), action: z.enum(['navigate', 'reload', 'back', 'forward', 'get_info']).default('navigate'), panelId: z.string().optional() })`

**Returns:** `{ url: string, title: string, panelId: string }`

**User Story:** As a developer who asked Claude to "check if the homepage renders correctly", I want Claude to navigate the embedded browser to `localhost:3000`, so it can verify the result of its code changes visually.

**User Story:** As a developer iterating on a UI fix, I want Claude to reload the browser after each edit, so I see the changes immediately without manually refreshing.

**User Story:** As a developer, I want Claude to open the Storybook URL after starting the Storybook server, so I can see components rendered without finding the URL myself.

**Implementation:** Call existing IPC handlers: `browser:navigate`, `browser:back`, `browser:forward`, `browser:reload`, `browser:get-info`.

---

### [ ] `send_to_other_claude`

**Description:** Send a message to another Claude panel in any thread.

**Input:** `z.object({ panelId: z.string(), message: z.string() })`

**Returns:** `{ success: true, panelId: string }`

**User Story:** As a developer running a complex refactor, I want Claude to delegate "write tests for the changes" to a second Claude panel in a testing thread, so work happens in parallel across isolated workspaces.

**User Story:** As a developer with a "code review" Claude panel, I want the main Claude to send its changes to the reviewer panel for feedback, creating a multi-agent code review loop.

**User Story:** As a developer, I want Claude to ask another Claude panel a quick question (like "what's the API schema?") and use the answer to inform its current task, enabling agent-to-agent knowledge sharing.

**Implementation:** Call `claudeSessionManager.sendMessage(panelId, message)` via IPC.

---

## Tier 2 — Quick Wins (Medium Impact)

### [ ] `create_terminal`

**Description:** Spawn a new terminal panel with a specific shell and working directory.

**Input:** `z.object({ shellId: z.string().optional(), cwd: z.string().optional(), threadId: z.string().optional(), initialCommand: z.string().optional() })`

**Returns:** `{ panelId: string, shellId: string, cwd: string }`

**User Story:** As a developer asking Claude to "set up a dev environment", I want Claude to create separate terminals for the frontend server, backend server, and test watcher, so each process has its own panel.

**User Story:** As a developer, I want Claude to create a terminal with a specific shell (e.g., PowerShell for Windows tasks, bash for Unix), so commands run in the right environment.

**Implementation:** Dispatch `addPanel({ panelType: 'terminal', shellId, initialCommand })` to store, then spawn via pty-manager.

---

### [ ] `create_browser_panel`

**Description:** Create a new embedded browser panel with an initial URL.

**Input:** `z.object({ url: z.string(), threadId: z.string().optional() })`

**Returns:** `{ panelId: string, url: string }`

**User Story:** As a developer who just deployed a preview, I want Claude to open the preview URL in an embedded browser panel, so I can see it immediately without switching to an external browser.

**User Story:** As a developer working on a design, I want Claude to open the Figma or design spec URL alongside the code, so I can compare the implementation to the design.

**Implementation:** Dispatch `addPanel({ panelType: 'browser', url })` to store, then create browser view via IPC.

---

### [ ] `get_quick_commands`

**Description:** List available quick commands and package.json scripts for the project.

**Input:** `z.object({ projectId: z.string().optional() })`

**Returns:** `{ scripts: Record<string, string>, quickCommands: QuickCommand[] }`

**User Story:** As a developer new to a project, I want Claude to discover available npm scripts and custom commands, so it knows how to build, test, lint, and deploy without me explaining the toolchain.

**Implementation:** Read from store (`project.quickCommands`) + call `pkg:scripts` IPC handler.

---

### [ ] `run_quick_command`

**Description:** Execute a saved quick command or package.json script.

**Input:** `z.object({ command: z.string(), panelId: z.string().optional() })`

**Returns:** `{ success: true, panelId: string }`

**User Story:** As a developer, I want Claude to run `npm test` via the quick commands system, so the command executes in the correct context with all project-specific environment variables.

**Implementation:** Resolve command from quick commands or scripts, then write to terminal.

---

### [ ] `update_claude_config`

**Description:** Change Claude panel configuration at runtime (model, effort, permissionMode, cwd).

**Input:** `z.object({ panelId: z.string().optional(), model: z.string().optional(), effort: z.enum(['low','medium','high','max']).optional(), permissionMode: z.string().optional(), cwd: z.string().optional() })`

**Returns:** `{ success: true, config: ClaudePanelConfig }`

**User Story:** As a developer working on a hard bug, I want Claude to automatically switch itself to Opus + max effort when it detects the problem is complex, and switch back to Sonnet for simpler follow-ups.

**User Story:** As a developer, I want Claude to switch to "plan" mode before proposing a large refactor, then switch to "acceptEdits" mode after I approve the plan, without me toggling the dropdown.

**Implementation:** Call `claude:update-config` IPC handler with merged config.

---

### [ ] `list_claude_sessions`

**Description:** List past Claude sessions for the current project or a specific directory.

**Input:** `z.object({ cwd: z.string().optional(), limit: z.number().default(20) })`

**Returns:** `{ sessions: SDKSessionInfo[] }`

**User Story:** As a developer returning to a project, I want Claude to list past sessions and suggest which one to resume based on my current task, so I don't have to browse through session history manually.

**Implementation:** Call `sdk.listSessions({ dir: cwd, limit })`.

---

### [ ] `resume_claude_session`

**Description:** Resume a past Claude session in a new or existing panel.

**Input:** `z.object({ sessionId: z.string(), panelId: z.string().optional() })`

**Returns:** `{ success: true, panelId: string }`

**User Story:** As a developer, I want Claude to resume a previous session where it was debugging a specific issue, so all the prior context and file changes are available without re-explaining.

**Implementation:** Call `claude:resume-session` IPC handler.

---

### [ ] `get_todos`

**Description:** Read the project's todo list.

**Input:** `z.object({ projectId: z.string().optional() })`

**Returns:** `{ todos: TodoItem[] }`

**User Story:** As a developer starting a work session, I want Claude to check my todo list and suggest which item to tackle first based on priority and dependencies.

**Implementation:** Read from store (`project.todos`).

---

### [ ] `update_todo`

**Description:** Add, complete, or modify a todo item.

**Input:** `z.object({ projectId: z.string().optional(), action: z.enum(['add', 'complete', 'update', 'delete']), todoId: z.string().optional(), content: z.string().optional(), status: z.enum(['pending', 'in_progress', 'done']).optional() })`

**Returns:** `{ success: true, todos: TodoItem[] }`

**User Story:** As a developer working through a feature, I want Claude to mark todo items as complete as it finishes each subtask, so my project board stays current without manual updates.

**User Story:** As a developer, I want Claude to add new todos it discovers during implementation (e.g., "TODO: add error handling for edge case X"), so nothing falls through the cracks.

**Implementation:** Dispatch `updateProjectTodos` to store.

---

## Tier 3 — Advanced / Future

### [ ] `spawn_devcontainer`

**Description:** Boot a dev container from a GitHub repo and branch.

**Input:** `z.object({ repo: z.string(), branch: z.string().optional(), threadId: z.string().optional() })`

**Returns:** `{ containerName: string, status: string }`

**User Story:** As a developer reviewing a PR, I want Claude to spin up a devcontainer for the PR branch, run the tests inside it, and report the results — all without me touching Docker.

**User Story:** As a developer, I want Claude to create an isolated container for experimenting with a risky change, so my local environment stays clean.

**Implementation:** Call `devcontainer:spawn` IPC handler.

---

### [ ] `devcontainer_status`

**Description:** Check the status of a running devcontainer.

**Input:** `z.object({ containerName: z.string() })`

**Returns:** `{ status: 'running' | 'stopped' | 'not-found', logs?: string[] }`

**User Story:** As a developer, I want Claude to check if the container is ready before running commands in it, so it doesn't send commands to a container that's still booting.

**Implementation:** Call `devcontainer:status` IPC handler.

---

### [ ] `split_panel`

**Description:** Split a panel horizontally or vertically with a configurable ratio.

**Input:** `z.object({ panelId: z.string(), direction: z.enum(['horizontal', 'vertical']), ratio: z.number().default(0.5), newPanelType: z.enum(['terminal', 'browser', 'claude', 'todo', 'empty']) })`

**Returns:** `{ success: true, newPanelId: string }`

**User Story:** As a developer asking Claude to "set up a coding workspace", I want Claude to arrange the panels — code terminal on the left, browser preview on the right, test terminal on the bottom — so the layout is optimized for the task.

**Implementation:** Dispatch panel tree mutation to store (replace leaf with split node).

---

### [ ] `create_project`

**Description:** Create a new project with default settings.

**Input:** `z.object({ name: z.string(), cwd: z.string(), defaultUrl: z.string().optional() })`

**Returns:** `{ projectId: string, name: string }`

**User Story:** As a developer cloning a new repo, I want Claude to create a project entry for it with the right working directory and a sensible name, so I can start working immediately.

**Implementation:** Dispatch `addProject` to store with generated ID.

---

### [ ] `open_url_external`

**Description:** Open a URL in the system's default browser (outside the app).

**Input:** `z.object({ url: z.string() })`

**Returns:** `{ success: true }`

**User Story:** As a developer, I want Claude to open a GitHub PR, documentation page, or deployed preview URL in my default browser, so I can review it in a full browser environment.

**Implementation:** Call `url:open-external` IPC handler.

---

### [ ] `get_git_branch`

**Description:** Get the current git branch for a directory.

**Input:** `z.object({ cwd: z.string().optional() })`

**Returns:** `{ branch: string }`

**User Story:** As a developer, I want Claude to check which branch I'm on before making changes, so it can warn me if I'm accidentally on `main` instead of a feature branch.

**Implementation:** Call `git:branch` IPC handler.

---

## Killer Workflow Examples

### Full-Stack Dev Loop
```
Claude: run_in_terminal({ command: "npm run dev", panelId: "term-1" })
Claude: navigate_browser({ url: "http://localhost:3000" })
Claude: [edits component file via normal Edit tool]
Claude: navigate_browser({ action: "reload" })
Claude: read_terminal_output({ panelId: "term-1" })  // check for errors
Claude: "The page renders correctly, no console errors."
```

### Multi-Agent Code Review
```
Claude: create_thread({ name: "code-review" })
Claude: [notes the new Claude panel ID]
Claude: send_to_other_claude({ panelId: "review-panel", message: "Review the changes in src/auth/ for security issues" })
Claude: [continues working while reviewer runs in parallel]
```

### Project Bootstrap
```
Claude: create_terminal({ cwd: "/projects", initialCommand: "npx create-next-app@latest my-app" })
Claude: [waits for completion]
Claude: create_browser_panel({ url: "http://localhost:3000" })
Claude: get_quick_commands()  // discovers available scripts
Claude: update_todo({ action: "add", content: "Set up CI/CD pipeline" })
```

### Self-Adapting Workflow
```
Claude: get_app_state()  // sees complex codebase
Claude: update_claude_config({ model: "claude-opus-4-6", effort: "max" })
Claude: [does deep analysis]
Claude: update_claude_config({ model: "claude-sonnet-4-6", effort: "medium" })  // switches back for simple follow-up
```

---

## Implementation Order

1. **Create `src/main/claude/app-mcp-server.ts`** — Define all tools
2. **Modify `claude-session-manager.ts`** — Inject in-process server into every session
3. **Extend `types.ts`** — Support `{ type: "sdk" }` MCP config variant
4. **Add terminal buffer read IPC** — Needed for `read_terminal_output`
5. **Test with Tier 1 tools first** — Validate the architecture works end-to-end
6. **Add Tier 2 tools incrementally** — Each tool is independent, easy to add one at a time

## Open Questions

- [ ] Should the MCP server be shared across all Claude panels, or one instance per session?
- [ ] Should tools require permission prompts, or auto-allow since they operate within the app?
- [ ] Should `send_to_other_claude` be able to receive the response, or fire-and-forget?
- [ ] How to handle terminal output reading — xterm buffer serialization vs. separate output capture?
- [ ] Should `run_in_terminal` block until prompt returns, or always be async?
- [ ] Rate limiting / safety: should some tools (like `create_project`) require confirmation?
