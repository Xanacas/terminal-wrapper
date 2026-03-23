import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdtempSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const testDir = mkdtempSync(join(tmpdir(), 'store-test-'))

// Mock electron before importing the module
vi.mock('electron', () => ({
  app: {
    getPath: () => testDir,
  },
}))

import { loadState, getState, setState, setClaudeSessionIdForPanel, flushState } from './store'

beforeEach(() => {
  // Reset state to defaults
  loadState()
})

describe('setClaudeSessionIdForPanel', () => {
  it('updates claudeSessionId on a leaf panel', () => {
    setState({
      projects: [
        {
          id: 'proj-1',
          name: 'Test',
          defaultCwd: '/tmp',
          defaultUrl: '',
          defaultShellId: 'bash',
          threads: [
            {
              id: 'thread-1',
              name: 'Thread 1',
              tabs: [
                {
                  id: 'tab-1',
                  name: 'Tab 1',
                  panel: {
                    id: 'panel-1',
                    kind: 'leaf',
                    panelType: 'claude',
                  },
                },
              ],
              activeTabId: 'tab-1',
            },
          ],
          activeThreadId: 'thread-1',
          collapsed: false,
        },
      ],
    })

    setClaudeSessionIdForPanel('panel-1', 'sdk-session-abc')

    const state = getState()
    const panel = state.projects[0].threads[0].tabs[0].panel
    expect(panel.kind).toBe('leaf')
    if (panel.kind === 'leaf') {
      expect(panel.claudeSessionId).toBe('sdk-session-abc')
    }
  })

  it('updates claudeSessionId inside a split panel', () => {
    setState({
      projects: [
        {
          id: 'proj-1',
          name: 'Test',
          defaultCwd: '/tmp',
          defaultUrl: '',
          defaultShellId: 'bash',
          threads: [
            {
              id: 'thread-1',
              name: 'Thread 1',
              tabs: [
                {
                  id: 'tab-1',
                  name: 'Tab 1',
                  panel: {
                    id: 'split-1',
                    kind: 'split',
                    direction: 'horizontal',
                    ratio: 0.5,
                    first: {
                      id: 'panel-term',
                      kind: 'leaf',
                      panelType: 'terminal',
                    },
                    second: {
                      id: 'panel-claude',
                      kind: 'leaf',
                      panelType: 'claude',
                    },
                  },
                },
              ],
              activeTabId: 'tab-1',
            },
          ],
          activeThreadId: 'thread-1',
          collapsed: false,
        },
      ],
    })

    setClaudeSessionIdForPanel('panel-claude', 'sdk-session-xyz')

    const state = getState()
    const rootPanel = state.projects[0].threads[0].tabs[0].panel
    expect(rootPanel.kind).toBe('split')
    if (rootPanel.kind === 'split') {
      const secondPanel = rootPanel.second
      expect(secondPanel.kind).toBe('leaf')
      if (secondPanel.kind === 'leaf') {
        expect(secondPanel.claudeSessionId).toBe('sdk-session-xyz')
      }
      // Verify the other panel was NOT modified
      const firstPanel = rootPanel.first
      if (firstPanel.kind === 'leaf') {
        expect(firstPanel.claudeSessionId).toBeUndefined()
      }
    }
  })

  it('does not mutate unrelated panels', () => {
    setState({
      projects: [
        {
          id: 'proj-1',
          name: 'Test',
          defaultCwd: '/tmp',
          defaultUrl: '',
          defaultShellId: 'bash',
          threads: [
            {
              id: 'thread-1',
              name: 'Thread 1',
              tabs: [
                {
                  id: 'tab-1',
                  name: 'Tab 1',
                  panel: {
                    id: 'panel-a',
                    kind: 'leaf',
                    panelType: 'claude',
                    claudeSessionId: 'existing-session',
                  },
                },
                {
                  id: 'tab-2',
                  name: 'Tab 2',
                  panel: {
                    id: 'panel-b',
                    kind: 'leaf',
                    panelType: 'claude',
                  },
                },
              ],
              activeTabId: 'tab-1',
            },
          ],
          activeThreadId: 'thread-1',
          collapsed: false,
        },
      ],
    })

    setClaudeSessionIdForPanel('panel-b', 'new-session')

    const state = getState()
    const panelA = state.projects[0].threads[0].tabs[0].panel
    const panelB = state.projects[0].threads[0].tabs[1].panel

    if (panelA.kind === 'leaf') {
      expect(panelA.claudeSessionId).toBe('existing-session')
    }
    if (panelB.kind === 'leaf') {
      expect(panelB.claudeSessionId).toBe('new-session')
    }
  })

  it('handles non-existent panelId gracefully (no crash)', () => {
    setState({
      projects: [
        {
          id: 'proj-1',
          name: 'Test',
          defaultCwd: '/tmp',
          defaultUrl: '',
          defaultShellId: 'bash',
          threads: [
            {
              id: 'thread-1',
              name: 'Thread 1',
              tabs: [
                {
                  id: 'tab-1',
                  name: 'Tab 1',
                  panel: { id: 'panel-1', kind: 'leaf', panelType: 'claude' },
                },
              ],
              activeTabId: 'tab-1',
            },
          ],
          activeThreadId: 'thread-1',
          collapsed: false,
        },
      ],
    })

    // Should not throw
    setClaudeSessionIdForPanel('non-existent', 'session-id')

    // Panel-1 should be unchanged
    const panel = getState().projects[0].threads[0].tabs[0].panel
    if (panel.kind === 'leaf') {
      expect(panel.claudeSessionId).toBeUndefined()
    }
  })
})

describe('flushState', () => {
  it('writes state to disk synchronously', () => {
    setState({
      projects: [
        {
          id: 'proj-flush',
          name: 'Flush Test',
          defaultCwd: '/tmp',
          defaultUrl: '',
          defaultShellId: 'bash',
          threads: [],
          activeThreadId: '',
          collapsed: false,
        },
      ],
    })

    flushState()

    const configPath = join(testDir, 'config.json')
    expect(existsSync(configPath)).toBe(true)

    const written = JSON.parse(readFileSync(configPath, 'utf-8'))
    expect(written.projects).toHaveLength(1)
    expect(written.projects[0].id).toBe('proj-flush')
  })
})
