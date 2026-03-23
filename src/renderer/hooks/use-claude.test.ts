import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock modules that depend on browser globals
vi.mock('~/lib/ipc', () => ({
  api: {},
}))

vi.mock('react', () => ({
  useEffect: vi.fn(),
  useCallback: vi.fn((fn: unknown) => fn),
  useRef: vi.fn((val: unknown) => ({ current: val })),
}))

vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' })

import { mapHistoryToMessages, getPersistedSessionId } from './use-claude'

describe('mapHistoryToMessages', () => {
  it('maps user message with string content', () => {
    const history = [
      {
        type: 'user',
        uuid: 'msg-1',
        message: { role: 'user', content: 'Hello Claude' },
      },
    ]

    const result = mapHistoryToMessages(history)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'msg-1',
      type: 'user',
      content: 'Hello Claude',
    })
  })

  it('maps assistant message with string content', () => {
    const history = [
      {
        type: 'assistant',
        uuid: 'msg-2',
        message: { role: 'assistant', content: 'Hello! How can I help?' },
      },
    ]

    const result = mapHistoryToMessages(history)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'msg-2',
      type: 'assistant',
      content: 'Hello! How can I help?',
    })
  })

  it('maps message with array content blocks (text only)', () => {
    const history = [
      {
        type: 'assistant',
        uuid: 'msg-3',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'First part' },
            { type: 'text', text: 'Second part' },
          ],
        },
      },
    ]

    const result = mapHistoryToMessages(history)

    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('First part\nSecond part')
  })

  it('filters non-text blocks from array content', () => {
    const history = [
      {
        type: 'assistant',
        uuid: 'msg-4',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Some text' },
            { type: 'tool_use', id: 'tool-1', name: 'Read', input: {} },
            { type: 'text', text: 'More text' },
          ],
        },
      },
    ]

    const result = mapHistoryToMessages(history)

    expect(result[0].content).toBe('Some text\nMore text')
  })

  it('handles message with no content', () => {
    const history = [
      {
        type: 'user',
        uuid: 'msg-5',
        message: { role: 'user' },
      },
    ]

    const result = mapHistoryToMessages(history)

    expect(result[0].content).toBe('')
  })

  it('handles message with no message field', () => {
    const history = [
      {
        type: 'result',
        uuid: 'msg-6',
      },
    ]

    const result = mapHistoryToMessages(history)

    expect(result[0].content).toBe('')
    expect(result[0].type).toBe('result')
  })

  it('falls back to crypto.randomUUID when uuid is missing', () => {
    const history = [
      {
        type: 'user',
        message: { role: 'user', content: 'No uuid' },
      },
    ]

    const result = mapHistoryToMessages(history)

    expect(result[0].id).toBe('test-uuid')
  })

  it('maps multiple messages preserving order', () => {
    const history = [
      {
        type: 'user',
        uuid: 'u1',
        message: { role: 'user', content: 'Question' },
      },
      {
        type: 'assistant',
        uuid: 'a1',
        message: { role: 'assistant', content: 'Answer' },
      },
      {
        type: 'user',
        uuid: 'u2',
        message: { role: 'user', content: 'Follow-up' },
      },
    ]

    const result = mapHistoryToMessages(history)

    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ id: 'u1', type: 'user', content: 'Question' })
    expect(result[1]).toMatchObject({ id: 'a1', type: 'assistant', content: 'Answer' })
    expect(result[2]).toMatchObject({ id: 'u2', type: 'user', content: 'Follow-up' })
  })

  it('handles empty history', () => {
    expect(mapHistoryToMessages([])).toEqual([])
  })

  it('sets ts on every message', () => {
    const before = Date.now()
    const result = mapHistoryToMessages([
      { type: 'user', uuid: 'x', message: { content: 'hi' } },
    ])
    const after = Date.now()

    expect(result[0].ts).toBeGreaterThanOrEqual(before)
    expect(result[0].ts).toBeLessThanOrEqual(after)
  })
})

describe('getPersistedSessionId', () => {
  beforeEach(async () => {
    const { useAppStore } = await import('~/stores/app-store')
    useAppStore.setState({
      projects: [
        {
          id: 'proj-1',
          name: 'Test Project',
          defaultCwd: '/tmp',
          defaultUrl: 'https://localhost',
          defaultShellId: 'bash',
          collapsed: false,
          activeThreadId: 'thread-1',
          threads: [
            {
              id: 'thread-1',
              name: 'Thread 1',
              activeTabId: 'tab-1',
              tabs: [
                {
                  id: 'tab-1',
                  name: 'Tab 1',
                  panel: {
                    id: 'panel-1',
                    kind: 'leaf' as const,
                    panelType: 'claude' as const,
                    claudeSessionId: 'sdk-session-abc',
                  },
                },
                {
                  id: 'tab-2',
                  name: 'Tab 2',
                  panel: {
                    id: 'split-1',
                    kind: 'split' as const,
                    direction: 'horizontal' as const,
                    ratio: 0.5,
                    first: {
                      id: 'panel-2',
                      kind: 'leaf' as const,
                      panelType: 'terminal' as const,
                    },
                    second: {
                      id: 'panel-3',
                      kind: 'leaf' as const,
                      panelType: 'claude' as const,
                      claudeSessionId: 'sdk-session-xyz',
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
      activeProjectId: 'proj-1',
    })
  })

  it('finds session ID for a top-level claude panel', () => {
    expect(getPersistedSessionId('panel-1')).toBe('sdk-session-abc')
  })

  it('finds session ID for a claude panel inside a split', () => {
    expect(getPersistedSessionId('panel-3')).toBe('sdk-session-xyz')
  })

  it('returns null for a panel without claudeSessionId', () => {
    expect(getPersistedSessionId('panel-2')).toBeNull()
  })

  it('returns null for a non-existent panel', () => {
    expect(getPersistedSessionId('non-existent')).toBeNull()
  })

  it('returns null when projects are empty', async () => {
    const { useAppStore } = await import('~/stores/app-store')
    useAppStore.setState({ projects: [] })
    expect(getPersistedSessionId('panel-1')).toBeNull()
  })
})
