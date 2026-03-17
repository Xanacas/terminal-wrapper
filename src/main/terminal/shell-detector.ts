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
    execSync(`where ${cmd}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function detectShells(): ShellInfo[] {
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

export function getDefaultShell(shells: ShellInfo[]): ShellInfo {
  return shells[0] ?? { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' }
}
