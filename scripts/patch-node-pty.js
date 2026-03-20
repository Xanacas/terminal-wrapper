/**
 * Patches node-pty's conpty_console_list_agent.js to handle AttachConsole
 * failures gracefully. Without this patch, the agent crashes with
 * "AttachConsole failed" when running inside Electron on Windows.
 */

import { readFileSync, writeFileSync, existsSync, chmodSync, readdirSync } from 'fs'
import { join } from 'path'

// Fix spawn-helper execute permissions on macOS/Linux.
// node-pty prebuilds ship without +x, causing posix_spawnp to fail.
const prebuildsDir = join(import.meta.dirname, '..', 'node_modules', 'node-pty', 'prebuilds')
if (existsSync(prebuildsDir)) {
  for (const dir of readdirSync(prebuildsDir)) {
    const helper = join(prebuildsDir, dir, 'spawn-helper')
    if (existsSync(helper)) {
      chmodSync(helper, 0o755)
    }
  }
  console.log('Fixed node-pty spawn-helper permissions')
}

const agentPath = join(
  import.meta.dirname,
  '..',
  'node_modules',
  'node-pty',
  'lib',
  'conpty_console_list_agent.js'
)

if (!existsSync(agentPath)) {
  console.log('node-pty agent not found, skipping patch')
  process.exit(0)
}

const content = readFileSync(agentPath, 'utf-8')

if (content.includes('try {')) {
  console.log('node-pty agent already patched')
  process.exit(0)
}

const patched = content.replace(
  'var consoleProcessList = getConsoleProcessList(shellPid);\nprocess.send({ consoleProcessList: consoleProcessList });',
  `try {
  var consoleProcessList = getConsoleProcessList(shellPid);
  process.send({ consoleProcessList: consoleProcessList });
} catch (_e) {
  process.send({ consoleProcessList: [shellPid] });
}`
)

if (patched === content) {
  // Try alternate line ending
  const patched2 = content.replace(
    'var consoleProcessList = getConsoleProcessList(shellPid);\r\nprocess.send({ consoleProcessList: consoleProcessList });',
    `try {\r\n  var consoleProcessList = getConsoleProcessList(shellPid);\r\n  process.send({ consoleProcessList: consoleProcessList });\r\n} catch (_e) {\r\n  process.send({ consoleProcessList: [shellPid] });\r\n}`
  )
  if (patched2 !== content) {
    writeFileSync(agentPath, patched2, 'utf-8')
    console.log('Patched node-pty conpty_console_list_agent.js (CRLF)')
    process.exit(0)
  }
  console.warn('Could not match node-pty agent pattern — skipping patch')
  process.exit(0)
}

writeFileSync(agentPath, patched, 'utf-8')
console.log('Patched node-pty conpty_console_list_agent.js')
