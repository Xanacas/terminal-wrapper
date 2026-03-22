import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { api } from '~/lib/ipc'

interface CommandPopoverTerminalProps {
  panelId: string
  shellId: string
  cwd: string
  command: string
  onExit: (exitCode: number) => void
}

export function CommandPopoverTerminal({
  panelId,
  shellId,
  cwd,
  command,
  onExit,
}: CommandPopoverTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit
  const spawnedRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

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
        brightWhite: '#ffffff',
      },
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace",
      cursorBlink: true,
      cursorStyle: 'bar',
      allowTransparency: true,
      scrollback: 5000,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(container)
    termRef.current = terminal
    fitRef.current = fitAddon

    // Wire input
    const inputDispose = terminal.onData((data) => {
      api.writeTerminal(panelId, data)
    })

    // Wire output
    let commandInjected = false
    const removeDataListener = api.onTerminalData((id, data) => {
      if (id !== panelId) return
      terminal.write(data)

      // Inject command after first output (shell ready)
      if (!commandInjected) {
        commandInjected = true
        setTimeout(() => {
          api.writeTerminal(panelId, command + '\n')
        }, 100)
      }
    })

    const removeExitListener = api.onTerminalExit((id, exitCode) => {
      if (id === panelId) {
        terminal.writeln(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m`)
        onExitRef.current(exitCode)
      }
    })

    // Spawn
    requestAnimationFrame(() => {
      fitAddon.fit()
      if (!spawnedRef.current) {
        spawnedRef.current = true
        api.spawnTerminal(panelId, shellId, cwd, terminal.cols, terminal.rows)
      }
    })

    const observer = new ResizeObserver(() => {
      fitAddon.fit()
      api.resizeTerminal(panelId, terminal.cols, terminal.rows)
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      inputDispose.dispose()
      removeDataListener()
      removeExitListener()
      terminal.dispose()
      api.killTerminal(panelId)
      api.deleteTerminalBuffer(panelId)
    }
  }, [panelId, shellId, cwd, command])

  return <div ref={containerRef} className="h-full w-full" />
}
