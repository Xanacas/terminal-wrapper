import { spawn, execFile } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'
import type { WebContents } from 'electron'
import * as store from '../store'

const execFileAsync = promisify(execFile)

/** Convert backslashes to forward slashes (for Docker, git, etc.) */
function toForwardSlash(p: string) {
  return p.replace(/\\/g, '/')
}

const isWindows = process.platform === 'win32'

let webContents: WebContents | null = null

export function setWebContents(wc: WebContents) {
  webContents = wc
}

function send(channel: string, ...args: unknown[]) {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send(channel, ...args)
  }
}

function getGlobalConfig() {
  const state = store.getState()
  return {
    templatePath: state.devContainerGlobal?.templatePath ?? 'H:/dev-container-template',
    devcontainersRoot: state.devContainerGlobal?.devcontainersRoot ?? 'H:/devcontainers',
    defaultUser: state.devContainerGlobal?.defaultUser ?? 'node',
    defaultWorkdir: state.devContainerGlobal?.defaultWorkdir ?? '/workspace',
  }
}

function getComposeFile() {
  const config = getGlobalConfig()
  return join(config.templatePath, '.devcontainer', 'docker-compose.yml')
}

function getScriptsDir() {
  return join(getGlobalConfig().devcontainersRoot, 'scripts')
}

// ---- Container lifecycle ----

const runningSpawns = new Map<string, ReturnType<typeof spawn>>()

export async function spawnContainer(
  repo: string,
  branch: string,
  containerName: string,
  projectType?: string
): Promise<{ ok: boolean; error?: string }> {
  const scriptsDir = getScriptsDir()

  const cmd = isWindows
    ? join(scriptsDir, 'devup.cmd')
    : join(scriptsDir, 'devup.sh')

  const spawnArgs = isWindows
    ? ['/c', cmd, repo, '-b', branch, '-n', containerName, '--no-shell']
    : [cmd, repo, '-b', branch, '-n', containerName, '--no-shell']
  if (projectType) spawnArgs.push('-t', projectType)

  return new Promise((resolve) => {
    send('devcontainer:log', containerName, `Starting container for ${repo} branch ${branch}...`)

    const child = spawn(isWindows ? 'cmd.exe' : 'bash', spawnArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    runningSpawns.set(containerName, child)

    child.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean)
      for (const line of lines) {
        send('devcontainer:log', containerName, line)
      }
    })

    child.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean)
      for (const line of lines) {
        send('devcontainer:log', containerName, `[stderr] ${line}`)
      }
    })

    child.on('exit', (code) => {
      runningSpawns.delete(containerName)
      if (code === 0) {
        send('devcontainer:ready', containerName)
        resolve({ ok: true })
      } else {
        const msg = `devup.sh exited with code ${code}`
        send('devcontainer:error', containerName, msg)
        resolve({ ok: false, error: msg })
      }
    })

    child.on('error', (err) => {
      runningSpawns.delete(containerName)
      const msg = `Failed to spawn devup.sh: ${err.message}`
      send('devcontainer:error', containerName, msg)
      resolve({ ok: false, error: msg })
    })
  })
}

export async function destroyContainer(containerName: string): Promise<{ ok: boolean; error?: string }> {
  const cmd = isWindows
    ? join(getScriptsDir(), 'devdown.cmd')
    : join(getScriptsDir(), 'devdown.sh')
  const args = isWindows
    ? ['/c', cmd, containerName]
    : [cmd, containerName]
  try {
    await execFileAsync(isWindows ? 'cmd.exe' : 'bash', args, { windowsHide: true })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function stopContainer(containerName: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync('docker', ['compose', '-p', containerName, '-f', toForwardSlash(getComposeFile()), 'stop'], {
      windowsHide: true,
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function startContainer(containerName: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync('docker', ['compose', '-p', containerName, '-f', toForwardSlash(getComposeFile()), 'start'], {
      windowsHide: true,
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function inspectContainer(
  containerName: string
): Promise<{ status: 'running' | 'stopped' | 'not-found'; error?: string }> {
  const fullName = `${containerName}-app-1`
  try {
    const { stdout } = await execFileAsync(
      'docker',
      ['inspect', '--format', '{{.State.Status}}', fullName],
      { windowsHide: true }
    )
    const raw = stdout.trim()
    if (raw === 'running') return { status: 'running' }
    return { status: 'stopped' }
  } catch {
    return { status: 'not-found' }
  }
}

// ---- Branch listing ----

export async function listRemoteBranches(repo: string): Promise<string[]> {
  const config = getGlobalConfig()
  const mirrorName = repo.replace('/', '--') + '.git'
  const mirrorPath = join(config.devcontainersRoot, 'cache', 'git-mirrors', mirrorName)

  let branches: string[] = []

  if (existsSync(mirrorPath)) {
    // Read from existing mirror (fast)
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['-C', mirrorPath, 'branch', '-r', '--format=%(refname:short)'],
        { windowsHide: true }
      )
      branches = stdout
        .split('\n')
        .map((b) => b.trim().replace(/^origin\//, ''))
        .filter((b) => b && b !== 'HEAD')
    } catch {
      // Fall through to ls-remote
    }

    // Refresh mirror in background (don't await)
    execFileAsync('git', ['-C', mirrorPath, 'fetch', '--all', '--prune', '--quiet'], {
      windowsHide: true,
    }).catch(() => {})
  }

  if (branches.length === 0) {
    // Fallback: ls-remote (slower, works without mirror)
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['ls-remote', '--heads', `https://github.com/${repo}`],
        { windowsHide: true, timeout: 15000 }
      )
      branches = stdout
        .split('\n')
        .map((line) => line.replace(/.*refs\/heads\//, '').trim())
        .filter(Boolean)
    } catch {
      // Return empty if everything fails
    }
  }

  return branches.sort()
}

// ---- Git safety checks ----

export async function checkGitStatus(
  containerName: string
): Promise<{ hasUncommitted: boolean; hasUnpushed: boolean; branch: string }> {
  const config = getGlobalConfig()
  const fullName = `${containerName}-app-1`

  const cmd = [
    `cd '${config.defaultWorkdir}'`,
    'echo "---PORCELAIN---"',
    'git status --porcelain 2>/dev/null',
    'echo "---UNPUSHED---"',
    'git log @{u}.. --oneline 2>/dev/null || echo ""',
    'echo "---BRANCH---"',
    'git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"',
  ].join(' && ')

  try {
    const { stdout } = await execFileAsync(
      'docker',
      ['exec', '-u', config.defaultUser, fullName, 'bash', '-c', cmd],
      { windowsHide: true, timeout: 10000 }
    )

    const porcelainSection = stdout.split('---PORCELAIN---')[1]?.split('---UNPUSHED---')[0]?.trim() ?? ''
    const unpushedSection = stdout.split('---UNPUSHED---')[1]?.split('---BRANCH---')[0]?.trim() ?? ''
    const branchSection = stdout.split('---BRANCH---')[1]?.trim() ?? 'unknown'

    return {
      hasUncommitted: porcelainSection.length > 0,
      hasUnpushed: unpushedSection.length > 0,
      branch: branchSection,
    }
  } catch {
    return { hasUncommitted: false, hasUnpushed: false, branch: 'unknown' }
  }
}

export async function pushContainerBranch(
  containerName: string
): Promise<{ ok: boolean; error?: string }> {
  const config = getGlobalConfig()
  const fullName = `${containerName}-app-1`

  try {
    await execFileAsync(
      'docker',
      ['exec', '-u', config.defaultUser, fullName, 'bash', '-c', `cd '${config.defaultWorkdir}' && git push`],
      { windowsHide: true, timeout: 30000 }
    )
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
