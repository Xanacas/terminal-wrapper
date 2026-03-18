import { existsSync } from 'fs'
import { execSync } from 'child_process'

export interface ShellInfo {
  id: string
  name: string
  path: string
  args?: string[]
}

function commandExists(cmd: string): boolean {
  try {
    const check = process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`
    execSync(check, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function detectUnixShells(): ShellInfo[] {
  const shells: ShellInfo[] = []

  // zsh (default on modern macOS)
  if (existsSync('/bin/zsh')) {
    shells.push({ id: 'zsh', name: 'zsh', path: '/bin/zsh', args: ['--login'] })
  }

  // bash
  if (existsSync('/bin/bash')) {
    shells.push({ id: 'bash', name: 'Bash', path: '/bin/bash', args: ['--login'] })
  }

  // fish (if installed)
  if (commandExists('fish')) {
    shells.push({ id: 'fish', name: 'Fish', path: 'fish', args: ['--login'] })
  }

  // sh (always available)
  if (existsSync('/bin/sh')) {
    shells.push({ id: 'sh', name: 'sh', path: '/bin/sh' })
  }

  // Prefer $SHELL if set — move it to front
  const userShell = process.env.SHELL
  if (userShell) {
    const idx = shells.findIndex((s) => s.path === userShell)
    if (idx > 0) {
      const [preferred] = shells.splice(idx, 1)
      shells.unshift(preferred)
    } else if (idx === -1 && existsSync(userShell)) {
      const name = userShell.split('/').pop() ?? userShell
      shells.unshift({ id: name, name, path: userShell, args: ['--login'] })
    }
  }

  return shells
}

function detectWindowsShells(): ShellInfo[] {
  const shells: ShellInfo[] = []

  // PowerShell 7+ (pwsh)
  if (commandExists('pwsh')) {
    shells.push({ id: 'pwsh', name: 'PowerShell 7', path: 'pwsh.exe' })
  }

  // Windows PowerShell
  if (commandExists('powershell')) {
    shells.push({ id: 'powershell', name: 'Windows PowerShell', path: 'powershell.exe' })
  }

  // Git Bash
  const gitBashPaths = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe'
  ]
  for (const p of gitBashPaths) {
    if (existsSync(p)) {
      shells.push({ id: 'git-bash', name: 'Git Bash', path: p, args: ['--login', '-i'] })
      break
    }
  }

  // WSL
  if (commandExists('wsl')) {
    shells.push({ id: 'wsl', name: 'WSL', path: 'wsl.exe' })
  }

  // cmd.exe (always available)
  shells.push({ id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' })

  return shells
}

export function detectShells(): ShellInfo[] {
  return process.platform === 'win32' ? detectWindowsShells() : detectUnixShells()
}

export function getDefaultShell(shells: ShellInfo[]): ShellInfo {
  const fallbackPath = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'
  const fallbackName = process.platform === 'win32' ? 'Command Prompt' : 'sh'
  return shells[0] ?? { id: fallbackName, name: fallbackName, path: fallbackPath }
}
