import { app, shell } from 'electron'
import { existsSync, mkdirSync, appendFileSync, readdirSync, unlinkSync, statSync } from 'fs'
import { join } from 'path'
import * as store from './store'

const LOG_DIR_NAME = 'logs/claude'
const MAX_AGE_DAYS = 5
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24h

// Track current log file date per panelId so we rotate daily
const panelDates = new Map<string, string>()

// Panel context for naming log files
const panelContexts = new Map<string, { projectName: string; threadName: string }>()

function getLogDir(): string {
  return join(app.getPath('userData'), LOG_DIR_NAME)
}

function ensureLogDir(): void {
  const dir = getLogDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'unnamed'
}

function getDateStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getTimeStr(): string {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

function getLogFilePath(panelId: string): string {
  const ctx = panelContexts.get(panelId)
  const projectName = sanitizeName(ctx?.projectName ?? 'Unknown-Project')
  const threadName = sanitizeName(ctx?.threadName ?? 'Unknown-Thread')
  const dateStr = getDateStr()
  return join(getLogDir(), `${projectName}_${threadName}_${dateStr}.log`)
}

function writeFileHeader(filePath: string, panelId: string): void {
  const ctx = panelContexts.get(panelId)
  const header = [
    '================================================================================',
    ' Claude Session Log',
    ` Project: ${ctx?.projectName ?? 'Unknown'} | Thread: ${ctx?.threadName ?? 'Unknown'}`,
    ` Date: ${getDateStr()}`,
    ` Panel: ${panelId}`,
    '================================================================================',
    '',
    '',
  ].join('\n')
  appendFileSync(filePath, header, 'utf-8')
}

function writeLogEntry(panelId: string, type: string, content: string): void {
  ensureLogDir()

  const dateStr = getDateStr()
  const prevDate = panelDates.get(panelId)

  // Daily rotation: if date changed, update tracking
  if (prevDate && prevDate !== dateStr) {
    panelDates.set(panelId, dateStr)
  }

  const filePath = getLogFilePath(panelId)

  // Write header if file is new
  if (!existsSync(filePath)) {
    panelDates.set(panelId, dateStr)
    writeFileHeader(filePath, panelId)
  }

  const time = getTimeStr()
  const entry = `[${time}] [${type}] ${content}\n\n`
  appendFileSync(filePath, entry, 'utf-8')
}

// ---- Public API ----

export function isEnabled(): boolean {
  return store.getState().detailedLogging ?? false
}

export function setEnabled(enabled: boolean): void {
  store.setState({ detailedLogging: enabled })
}

export function registerPanelContext(panelId: string, projectName: string, threadName: string): void {
  panelContexts.set(panelId, { projectName, threadName })
}

export function unregisterPanelContext(panelId: string): void {
  panelContexts.delete(panelId)
  panelDates.delete(panelId)
}

export function logUserMessage(panelId: string, text: string): void {
  if (!isEnabled()) return
  writeLogEntry(panelId, 'USER', text)
}

export function logAssistantText(panelId: string, text: string): void {
  if (!isEnabled()) return
  writeLogEntry(panelId, 'ASSISTANT', text)
}

export function logToolUse(panelId: string, toolName: string, toolUseId: string, input: unknown): void {
  if (!isEnabled()) return
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input, null, 2)
  writeLogEntry(panelId, 'TOOL-USE', `${toolName} (id=${toolUseId})\n  Input: ${inputStr}`)
}

export function logToolResult(panelId: string, toolUseId: string, output: string, isError: boolean): void {
  if (!isEnabled()) return
  const prefix = isError ? '[ERROR] ' : ''
  const truncated = output.length > 2000 ? output.slice(0, 2000) + `\n  ... (${output.length} chars total)` : output
  writeLogEntry(panelId, 'TOOL-RESULT', `${prefix}tool_use_id=${toolUseId}\n  ${truncated}`)
}

export function logPermissionRequest(panelId: string, toolName: string, toolUseId: string, input: unknown): void {
  if (!isEnabled()) return
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input, null, 2)
  writeLogEntry(panelId, 'PERMISSION', `toolName=${toolName}, toolUseId=${toolUseId}\n  Input: ${inputStr}`)
}

export function logPermissionResponse(panelId: string, toolUseId: string, allowed: boolean): void {
  if (!isEnabled()) return
  writeLogEntry(panelId, 'PERMISSION-RESPONSE', `toolUseId=${toolUseId}, allowed=${allowed}`)
}

export function logSessionMeta(panelId: string, meta: { model: string; costUsd: number; inputTokens: number; outputTokens: number }): void {
  if (!isEnabled()) return
  writeLogEntry(panelId, 'SESSION-META', `model=${meta.model}, cost=$${meta.costUsd.toFixed(4)}, tokens=${meta.inputTokens}/${meta.outputTokens}`)
}

export function logSessionEnded(panelId: string, reason: string, error?: string): void {
  if (!isEnabled()) return
  const errStr = error ? `, error=${error}` : ''
  writeLogEntry(panelId, 'SESSION-ENDED', `reason=${reason}${errStr}`)
}

export function logSessionCreated(panelId: string, config: Record<string, unknown>): void {
  if (!isEnabled()) return
  const ctx = panelContexts.get(panelId)
  writeLogEntry(panelId, 'SESSION-CREATED', `project=${ctx?.projectName}, thread=${ctx?.threadName}, model=${config.model}, permissionMode=${config.permissionMode}, cwd=${config.cwd}`)
}

export function logError(panelId: string, error: string): void {
  if (!isEnabled()) return
  writeLogEntry(panelId, 'ERROR', error)
}

export function cleanupOldLogs(): void {
  const dir = getLogDir()
  if (!existsSync(dir)) return

  const now = Date.now()
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000

  try {
    const files = readdirSync(dir)
    for (const file of files) {
      if (!file.endsWith('.log')) continue
      const filePath = join(dir, file)
      try {
        const stat = statSync(filePath)
        if (now - stat.mtimeMs > maxAge) {
          unlinkSync(filePath)
        }
      } catch {
        // ignore individual file errors
      }
    }
  } catch {
    // ignore directory read errors
  }
}

export function openLogFolder(): void {
  const dir = getLogDir()
  ensureLogDir()
  shell.openPath(dir)
}

let cleanupInterval: ReturnType<typeof setInterval> | null = null

export function initLogger(): void {
  cleanupOldLogs()
  cleanupInterval = setInterval(cleanupOldLogs, CLEANUP_INTERVAL_MS)
}

export function disposeLogger(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}
