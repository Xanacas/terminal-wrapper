import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SerializeAddon } from '@xterm/addon-serialize'
import { api } from '~/lib/ipc'

// ---- Persistent terminal registry ----

interface TerminalEntry {
  terminal: Terminal
  fitAddon: FitAddon
  serializeAddon: SerializeAddon
  cleanups: Array<() => void>
  panelId: string
}

const registry = new Map<string, TerminalEntry>()

export function destroyTerminal(id: string) {
  const entry = registry.get(id)
  if (!entry) return
  for (const fn of entry.cleanups) fn()
  entry.terminal.dispose()
  registry.delete(id)
  api.deleteTerminalBuffer(id)
}

function saveBuffer(id: string) {
  const entry = registry.get(id)
  if (!entry) return
  try {
    const content = entry.serializeAddon.serialize()
    api.saveTerminalBuffer(id, content)
  } catch {
    // terminal may already be disposed
  }
}

export function saveAllBuffers() {
  for (const [id] of registry) {
    saveBuffer(id)
  }
}

api.onSaveAllBuffers(() => {
  saveAllBuffers()
})

// ---- Hook ----

interface UseTerminalOptions {
  projectId: string
  shellId: string
  cwd: string
  initialCommand?: string
  onOpenUrl?: (url: string) => void
}

export function useTerminal({ projectId, shellId, cwd, initialCommand, onOpenUrl }: UseTerminalOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onOpenUrlRef = useRef(onOpenUrl)
  onOpenUrlRef.current = onOpenUrl

  const fit = useCallback(() => {
    registry.get(projectId)?.fitAddon.fit()
  }, [projectId])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let entry = registry.get(projectId)

    if (!entry) {
      const terminal = new Terminal({
        theme: {
          background: '#0c0c0e',
          foreground: '#e0e0e0',
          cursor: '#e0e0e0',
          cursorAccent: '#0a0a0a',
          selectionBackground: '#3b82f640',
          black: '#1e1e1e',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#e0e0e0',
          brightBlack: '#555',
          brightRed: '#f87171',
          brightGreen: '#4ade80',
          brightYellow: '#facc15',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#ffffff'
        },
        fontSize: 13,
        fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace",
        cursorBlink: true,
        cursorStyle: 'bar',
        allowTransparency: true,
        scrollback: 10000
      })

      const fitAddon = new FitAddon()
      const webLinksAddon = new WebLinksAddon((_event, uri) => {
        if (onOpenUrlRef.current) {
          onOpenUrlRef.current(uri)
        } else {
          window.open(uri)
        }
      })
      const serializeAddon = new SerializeAddon()
      terminal.loadAddon(fitAddon)
      terminal.loadAddon(webLinksAddon)
      terminal.loadAddon(serializeAddon)
      terminal.open(container)

      // --- Buffered PTY data strategy for session restore ---
      // 1. Spawn the shell and buffer ALL PTY output
      // 2. After shell init settles (1s after last data), flush:
      //    a. Write restored history first (goes into scrollback)
      //    b. Write separator
      //    c. Write the buffered shell output on top
      // This way the shell's clear-screen sequences act on a blank terminal,
      // then we replay everything in the right order.

      let savedContent: string | null = null
      let ptyBuffer: string[] = []
      let buffering = false
      let flushTimer: ReturnType<typeof setTimeout> | null = null
      let flushed = false

      const flushBufferedOutput = () => {
        if (flushed) return
        flushed = true

        if (savedContent) {
          // Write previous session content
          const historyLines = savedContent.split('\n')
          for (const line of historyLines) {
            terminal.writeln(line)
          }
          terminal.writeln('\x1b[90m--- previous session (scroll up) ---\x1b[0m')

          // Push ALL history into scrollback by filling the viewport with blank lines
          const rows = terminal.rows
          for (let i = 0; i < rows; i++) {
            terminal.writeln('')
          }
        }

        // Write the buffered shell init output, stripping clear sequences
        // The shell's cursor positioning (e.g. \x1b[H) now targets the clean
        // viewport, so the prompt appears at the correct position
        for (const chunk of ptyBuffer) {
          // eslint-disable-next-line no-control-regex
          const cleaned = chunk.replace(/\x1b\[2J|\x1b\[3J|\x1b\[\?1049[hl]/g, '')
          terminal.write(cleaned)
        }
        ptyBuffer = []

        // Inject initial command after shell is ready
        if (initialCommand && !initialCommandInjected) {
          initialCommandInjected = true
          setTimeout(() => {
            api.writeTerminal(projectId, initialCommand + '\n')
          }, 100)
        }
      }

      // Wire input → PTY
      const inputDispose = terminal.onData((data) => {
        api.writeTerminal(projectId, data)
      })

      // Wire PTY output → terminal with buffering for session restore
      let initialCommandInjected = false
      const removeDataListener = api.onTerminalData((id, data) => {
        if (id !== projectId) return

        if (buffering && !flushed) {
          // Accumulate shell init output
          ptyBuffer.push(data)
          // Reset flush timer — wait for output to settle
          if (flushTimer) clearTimeout(flushTimer)
          flushTimer = setTimeout(flushBufferedOutput, 500)
        } else {
          terminal.write(data)
          // Inject initial command on first output when not buffering
          if (initialCommand && !initialCommandInjected && !buffering) {
            initialCommandInjected = true
            setTimeout(() => {
              api.writeTerminal(projectId, initialCommand + '\n')
            }, 100)
          }
        }
      })

      const removeExitListener = api.onTerminalExit((id, exitCode) => {
        if (id === projectId) {
          terminal.writeln(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m`)
        }
      })

      entry = {
        terminal,
        fitAddon,
        serializeAddon,
        cleanups: [
          () => inputDispose.dispose(),
          removeDataListener,
          removeExitListener,
          () => { if (flushTimer) clearTimeout(flushTimer) }
        ],
        panelId: projectId
      }
      registry.set(projectId, entry)

      // Load saved buffer, then spawn PTY
      const currentEntry = entry
      api.loadTerminalBuffer(projectId).then((saved) => {
        requestAnimationFrame(() => {
          currentEntry.fitAddon.fit()

          if (saved) {
            savedContent = saved
            buffering = true
          }

          api.spawnTerminal(
            projectId,
            shellId,
            cwd,
            currentEntry.terminal.cols,
            currentEntry.terminal.rows
          )

          // Safety: flush after 3s max even if shell is still printing
          if (buffering) {
            setTimeout(() => {
              if (!flushed) flushBufferedOutput()
            }, 3000)
          }
        })
      })
    } else {
      // Re-attach existing terminal to new container (e.g. after split)
      const el = entry.terminal.element
      if (el && el.parentElement !== container) {
        container.appendChild(el)
      }
      requestAnimationFrame(() => {
        entry!.fitAddon.fit()
      })
    }

    // ResizeObserver for this mount instance
    const currentEntry = entry
    const observer = new ResizeObserver(() => {
      currentEntry.fitAddon.fit()
      api.resizeTerminal(projectId, currentEntry.terminal.cols, currentEntry.terminal.rows)
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, shellId, cwd])

  const restart = useCallback(() => {
    const entry = registry.get(projectId)
    if (!entry) return
    entry.terminal.clear()
    api.spawnTerminal(projectId, shellId, cwd, entry.terminal.cols, entry.terminal.rows)

    // Re-inject initial command after shell starts
    if (initialCommand) {
      let injected = false
      const removeListener = api.onTerminalData((id, _data) => {
        if (id !== projectId || injected) return
        injected = true
        removeListener()
        setTimeout(() => {
          api.writeTerminal(projectId, initialCommand + '\n')
        }, 100)
      })
    }
  }, [projectId, shellId, cwd, initialCommand])

  return { containerRef, fit, restart }
}
