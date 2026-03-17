import * as pty from 'node-pty'
import type { ShellInfo } from './shell-detector'

interface PtyInstance {
  process: pty.IPty
  shellInfo: ShellInfo
}

const instances = new Map<string, PtyInstance>()

export function spawnPty(
  id: string,
  shell: ShellInfo,
  cwd: string,
  cols: number,
  rows: number,
  onData: (data: string) => void,
  onExit: (exitCode: number, signal?: number) => void
): void {
  // Kill existing instance if any
  killPty(id)

  const env = { ...process.env } as Record<string, string>

  const proc = pty.spawn(shell.path, shell.args ?? [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env
  })

  proc.onData((data) => onData(data))
  proc.onExit(({ exitCode, signal }) => {
    instances.delete(id)
    onExit(exitCode, signal)
  })

  instances.set(id, { process: proc, shellInfo: shell })
}

export function writePty(id: string, data: string): void {
  instances.get(id)?.process.write(data)
}

export function resizePty(id: string, cols: number, rows: number): void {
  try {
    instances.get(id)?.process.resize(cols, rows)
  } catch {
    // ignore resize errors on dead pty
  }
}

export function killPty(id: string): void {
  const instance = instances.get(id)
  if (instance) {
    try {
      instance.process.kill()
    } catch {
      // already dead
    }
    instances.delete(id)
  }
}

export function killAll(): void {
  for (const [id] of instances) {
    killPty(id)
  }
}
