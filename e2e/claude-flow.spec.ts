import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test'
import { mkdirSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

let app: ElectronApplication
let page: Page
const testUserData = join(tmpdir(), `terminal-wrapper-e2e-${Date.now()}`)

test.beforeAll(async () => {
  mkdirSync(testUserData, { recursive: true })

  app = await electron.launch({
    args: [join(__dirname, '..', 'out', 'main', 'index.js')],
    env: {
      ...process.env,
      TERMINAL_WRAPPER_USER_DATA: testUserData,
    },
  })

  page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
})

test.afterAll(async () => {
  await app?.close()
  try {
    rmSync(testUserData, { recursive: true, force: true })
  } catch {
    // ignore cleanup errors
  }
})

test('create project, thread, Claude panel, send message, get response', async () => {
  // ------ Step 1: Create a project ------
  await expect(page.locator('text=No projects yet')).toBeVisible({ timeout: 15_000 })
  await page.click('button[title="New project (Ctrl+T)"]')

  // Settings modal opens for new projects — dismiss it by saving with defaults
  await expect(page.locator('text=Add New Project')).toBeVisible({ timeout: 5_000 })
  await page.click('button:has-text("Save")')
  await expect(page.locator('text=Add New Project')).toBeHidden({ timeout: 5_000 })

  // ensureThread() auto-creates "Thread 1" when the modal closes
  await expect(page.locator('text=Project 1').first()).toBeVisible({ timeout: 5_000 })

  // ------ Step 2: Navigate to the thread ------
  const threadButton = page.getByRole('button', { name: 'Thread 1' })
  await expect(threadButton).toBeVisible({ timeout: 5_000 })
  await threadButton.click()

  // Tab bar should be visible with the "Add panel" button
  await expect(page.locator('button[title="Add panel"]')).toBeVisible({ timeout: 5_000 })

  // ------ Step 3: Add a Claude panel via the tab bar menu ------
  await page.click('button[title="Add panel"]')

  // Step 1 of menu: select panel type
  await expect(page.locator('text=Panel Type')).toBeVisible({ timeout: 3_000 })
  await page.click('button:has-text("Claude")')

  // Step 2 of menu: select placement
  await expect(page.locator('text=Placement')).toBeVisible({ timeout: 3_000 })
  await page.click('button:has-text("New Tab")')

  // The "Claude" tab should now be active in the tab bar
  await expect(page.locator('span:has-text("Claude")')).toBeVisible({ timeout: 5_000 })

  // ------ Step 4: Handle Claude CWD prompt if it appears ------
  // useClaude hook auto-applies project defaultCwd, but there may be a brief flash
  const cwdButton = page.locator('button:has-text("Use project default")')
  const emptyState = page.locator('text=Send a message to get started')

  await expect(cwdButton.or(emptyState)).toBeVisible({ timeout: 10_000 })

  if (await cwdButton.isVisible()) {
    await cwdButton.click()
  }

  await expect(emptyState).toBeVisible({ timeout: 5_000 })

  // ------ Step 5: Send "hi" to Claude and verify a response ------
  const textarea = page.locator('textarea[placeholder="Send a message..."]')
  await expect(textarea).toBeVisible({ timeout: 5_000 })
  await textarea.fill('hi')
  await textarea.press('Enter')

  // Wait for streaming to start (Interrupt button appears)
  const interruptButton = page.locator('button[title="Interrupt"]')
  await expect(interruptButton).toBeVisible({ timeout: 30_000 })

  // Wait for streaming to finish (Interrupt button disappears)
  await expect(interruptButton).toBeHidden({ timeout: 60_000 })

  // The empty state text should be gone — an assistant message was rendered
  await expect(emptyState).toBeHidden({ timeout: 5_000 })
})
