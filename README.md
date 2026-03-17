# Terminal Wrapper

A terminal workspace manager for Windows that integrates a terminal emulator, embedded browser, Claude AI assistant, and todo lists — all in a single Electron desktop app. Organize work into projects, threads, and panels with a keyboard-driven interface.

![Electron](https://img.shields.io/badge/Electron-35-47848F?logo=electron) ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

---

## Features

### Projects & Threads

- **Projects** — top-level workspaces with their own name, working directory, default shell, default browser URL, URL routing rules, and Claude AI configuration.
- **Threads** — multiple independent sessions per project (like git branches). Each thread has its own set of tabs and panels. Switch threads without losing any state.
- **Project overview** — click an active project in the sidebar to see a summary: settings, Claude config, and all todos grouped by thread.
- **Project switcher (`Ctrl+P`)** — fuzzy-search all projects and threads. Threads are listed in last-focused order.
- **Command palette (`Ctrl+Shift+P`)** — searchable list of every action with keyboard shortcuts shown.
- **Sidebar** — shows all projects with their threads. Active project/thread is highlighted with a subtle accent bar.

### Tabs & Panels

- **Multiple tabs per thread** — each tab holds an independent panel layout.
- **Split panels** — divide any tab into horizontal or vertical splits, nested to any depth. Drag the divider to resize.
- **Four panel types:** Terminal, Browser, Claude, Todo.
- **Panel chooser** — empty panels show a picker; or use the `+` button in the tab bar (choose type → choose placement).
- **Tab bar** — shows all tabs for the active thread. Double-click to rename.

### Terminal

- **xterm.js** terminal emulation with PTY (real shell, not a fake one).
- Supports any installed shell: cmd.exe, PowerShell, WSL, Git Bash, etc. Select per-project via the shell picker.
- 10 000-line scrollback buffer.
- Clickable URLs — opens in the browser panel or externally, based on URL routing rules.
- **Session persistence** — terminal buffer is saved when the tab closes and restored on reopen, with a visual separator between sessions.
- Multiple terminals can run simultaneously across split panels.

### Browser

- **Embedded browser** built on Electron's `WebContentsView` — sandboxed, context-isolated, full web rendering.
- Address bar with back/forward/reload/DevTools/open-in-Chrome controls.
- **URL routing** — per-project rules (glob or regex) that route URLs to an in-panel browser or to the system browser. Configurable default.
- When terminal URLs are clicked they route through the same rules.

### Claude AI

- Powered by `@anthropic-ai/claude-agent-sdk` with full streaming.
- **Tool use** — Claude can run shell commands, edit files, browse, etc. Each tool call surfaces a permission prompt (allow / deny / always allow).
- **Permission modes** — Default, Accept Edits, Plan, Bypass Permissions, Don't Ask.
- **Effort levels** — Low, Medium, High, Max.
- **Streaming input** — send a new message while Claude is still responding; it's injected into the running stream.
- **Image support** — paste screenshots or drag-and-drop images directly into the chat input.
- **Cost tracking** — live USD cost and token counts (input/output) shown in the toolbar.
- **Session persistence** — resume any previous Claude session from the session history panel.
- **CWD change confirmation** — if you change the working directory while a session is active, a confirmation banner appears before the session is destroyed.
- Per-project Claude config: model, system prompt, allowed/disallowed tools, max turns, max budget, additional context directories.

### Todo Lists

- Per-project todos, optionally scoped to a specific thread.
- Inline add / edit (double-click) / check / delete.
- Visible in the project overview and as a dedicated Todo panel.

### Window & Misc

- **Frameless window** with custom title bar. Drag the top bar to move the window.
- **Native title bar overlay** on Windows (minimize / maximize / close buttons).
- Settings are persisted to disk; window size and position are restored on launch.
- All browser overlays are hidden when a modal (command palette, settings) is open.

---

## Keyboard Shortcuts

### Navigation

| Shortcut | Action |
|---|---|
| `Ctrl+P` | Open project switcher (threads in last-focused order) |
| `Ctrl+Shift+P` | Open command palette |
| `Ctrl+T` | New project |
| `Escape` | Close any open overlay |

### Threads

| Shortcut | Action |
|---|---|
| `Ctrl+Tab` | Next thread (within active project) |
| `Ctrl+Shift+Tab` | Previous thread |
| `Ctrl+1` – `Ctrl+9` | Jump to thread 1–9 by sidebar position |

### Tabs

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+T` | New terminal tab |
| `Ctrl+Shift+B` | New browser tab |
| `Ctrl+Shift+A` | New Claude tab |
| `Ctrl+W` | Close current tab |
| `Ctrl+PageUp` | Previous tab |
| `Ctrl+PageDown` | Next tab |

### Panels

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+D` | Split focused panel right |
| `Ctrl+Shift+E` | Split focused panel down |
| `Alt+1` – `Alt+9` | Focus panel 1–9 (left-to-right, depth-first) |

### Focus

| Shortcut | Action |
|---|---|
| `Ctrl+`` ` | Focus terminal input |
| `Ctrl+L` | Focus browser address bar |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or bun

### Install & run

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Package

```bash
npm run package
```

---

## Project Structure

```
src/
  main/                    # Electron main process
    claude/                # Claude session manager
    browser/               # Browser view manager (WebContentsView)
    terminal/              # PTY manager (node-pty)
    index.ts               # App entry, global shortcuts
    window-manager.ts      # BaseWindow + WebContentsView setup
    store.ts               # Persistent state (electron-store)
    ipc-handlers.ts        # IPC bridge
  preload/                 # Context bridge
  renderer/                # React UI
    components/
      sidebar/             # Project/thread list
      workspace/           # Tab bar, panel layout, split view
      terminal/            # xterm.js integration
      browser/             # Address bar + browser placeholder
      claude/              # Chat UI, tool use, permissions
      todo/                # Todo panel
      command-palette/     # Palette + project switcher
      project-settings/    # Settings modal
    hooks/                 # useProjects, useTerminal, useBrowser, useClaude, useShortcuts
    stores/                # Zustand: app-store, ui-store, claude-store
    lib/                   # panel-utils, url-routing, ipc, types
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 35, Node.js |
| UI | React 18, TypeScript |
| Styling | Tailwind CSS 4 |
| Terminal | xterm.js + node-pty |
| Browser | Electron WebContentsView |
| AI | @anthropic-ai/claude-agent-sdk |
| State | Zustand |
| Persistence | electron-store |
| Build | electron-vite, Vite 6 |
