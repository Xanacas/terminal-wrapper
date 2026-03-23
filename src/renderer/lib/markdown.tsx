import { Fragment, type ReactNode } from 'react'
import { HighlightedCode } from '~/components/ui/code-block'

interface MarkdownOptions {
  onLinkClick?: (url: string) => void
}

interface Block {
  type: 'code' | 'text'
  content: string
  language?: string
}

function splitBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const codeBlockRegex = /^```(\w*)\n([\s\S]*?)^```$/gm
  let lastIndex = 0

  for (const match of text.matchAll(codeBlockRegex)) {
    const before = text.slice(lastIndex, match.index)
    if (before.trim()) {
      blocks.push({ type: 'text', content: before })
    }
    blocks.push({
      type: 'code',
      content: match[2],
      language: match[1] || undefined,
    })
    lastIndex = match.index! + match[0].length
  }

  const remaining = text.slice(lastIndex)
  if (remaining.trim()) {
    blocks.push({ type: 'text', content: remaining })
  }

  return blocks
}

function renderInline(text: string, options?: MarkdownOptions): ReactNode[] {
  const nodes: ReactNode[] = []
  // Process inline patterns: bold, italic, inline code, links
  const inlineRegex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[([^\]]+)\]\(([^)]+)\))/g
  let lastIndex = 0
  let key = 0

  for (const match of text.matchAll(inlineRegex)) {
    const before = text.slice(lastIndex, match.index)
    if (before) nodes.push(<Fragment key={key++}>{before}</Fragment>)

    if (match[1]) {
      // Inline code
      const code = match[1].slice(1, -1)
      nodes.push(
        <code
          key={key++}
          className="rounded bg-bg-tertiary/80 px-[5px] py-[1.5px] text-[11.5px] font-mono text-accent/80"
        >
          {code}
        </code>
      )
    } else if (match[2]) {
      // Bold
      nodes.push(<strong key={key++} className="font-semibold text-text">{match[2].slice(2, -2)}</strong>)
    } else if (match[3]) {
      // Italic
      nodes.push(<em key={key++} className="text-text-secondary">{match[3].slice(1, -1)}</em>)
    } else if (match[4]) {
      // Link
      const linkText = match[5]
      const url = match[6]
      nodes.push(
        <a
          key={key++}
          className="text-accent no-underline transition-all duration-150 hover:underline hover:decoration-accent/50 cursor-pointer"
          onClick={(e) => {
            e.preventDefault()
            options?.onLinkClick?.(url)
          }}
        >
          {linkText}
        </a>
      )
    }

    lastIndex = match.index! + match[0].length
  }

  const after = text.slice(lastIndex)
  if (after) nodes.push(<Fragment key={key++}>{after}</Fragment>)

  return nodes.length > 0 ? nodes : [<Fragment key={0}>{text}</Fragment>]
}

function renderTextBlock(text: string, options?: MarkdownOptions): ReactNode[] {
  const lines = text.split('\n')
  const elements: ReactNode[] = []
  let key = 0
  let listItems: { ordered: boolean; content: string }[] = []

  const flushList = () => {
    if (listItems.length === 0) return
    const ordered = listItems[0].ordered
    const Tag = ordered ? 'ol' : 'ul'
    elements.push(
      <Tag
        key={key++}
        className={`my-2 space-y-1 pl-5 text-[12.5px] leading-[1.6] text-text ${ordered ? 'list-decimal' : 'list-disc'} marker:text-text-dim`}
      >
        {listItems.map((item, i) => (
          <li key={i} className="pl-0.5">{renderInline(item.content, options)}</li>
        ))}
      </Tag>
    )
    listItems = []
  }

  // Collect table rows for flushing
  let tableRows: string[][] = []
  let tableAlignments: Array<'left' | 'center' | 'right' | null> = []

  const flushTable = () => {
    if (tableRows.length === 0) return
    const headerRow = tableRows[0]
    const bodyRows = tableRows.slice(1)
    elements.push(
      <div key={key++} className="my-2 overflow-x-auto">
        <table className="w-full border-collapse text-[12px] leading-[1.6]">
          <thead>
            <tr className="border-b border-border/40">
              {headerRow.map((cell, ci) => (
                <th
                  key={ci}
                  className="px-2.5 py-1.5 text-left text-[11px] font-semibold text-text-secondary"
                  style={tableAlignments[ci] ? { textAlign: tableAlignments[ci]! } : undefined}
                >
                  {renderInline(cell.trim(), options)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/20">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="px-2.5 py-1.5 text-text"
                    style={tableAlignments[ci] ? { textAlign: tableAlignments[ci]! } : undefined}
                  >
                    {renderInline(cell.trim(), options)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    tableRows = []
    tableAlignments = []
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Table row detection (line starts and ends with |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.slice(1, -1).split('|')
      // Check if this is a separator row (|---|---|)
      if (cells.every((c) => /^\s*:?-+:?\s*$/.test(c))) {
        // Parse alignments
        tableAlignments = cells.map((c) => {
          const t = c.trim()
          if (t.startsWith(':') && t.endsWith(':')) return 'center'
          if (t.endsWith(':')) return 'right'
          if (t.startsWith(':')) return 'left'
          return null
        })
        continue
      }
      tableRows.push(cells)
      continue
    }

    // If we were collecting table rows, flush them
    flushTable()

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
      flushList()
      elements.push(<hr key={key++} className="my-4 border-border/60" />)
      continue
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushList()
      const level = headingMatch[1].length
      const content = headingMatch[2]
      const sizes = {
        1: 'text-[15px] mt-4 mb-2 font-semibold',
        2: 'text-[14px] mt-3.5 mb-1.5 font-semibold',
        3: 'text-[13px] mt-3 mb-1.5 font-medium',
      } as Record<number, string>
      elements.push(
        <div key={key++} className={`${sizes[level] ?? 'text-[13px] mt-3 mb-1.5 font-medium'} text-text`}>
          {renderInline(content, options)}
        </div>
      )
      continue
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList()
      elements.push(
        <div
          key={key++}
          className="my-2 border-l-2 border-accent/30 pl-3 text-[12.5px] leading-[1.6] text-text-secondary italic"
        >
          {renderInline(trimmed.slice(2), options)}
        </div>
      )
      continue
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (ulMatch) {
      if (listItems.length > 0 && listItems[0].ordered) flushList()
      listItems.push({ ordered: false, content: ulMatch[1] })
      continue
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (olMatch) {
      if (listItems.length > 0 && !listItems[0].ordered) flushList()
      listItems.push({ ordered: true, content: olMatch[1] })
      continue
    }

    // Regular line
    flushList()

    if (trimmed === '') {
      elements.push(<div key={key++} className="h-2.5" />)
    } else {
      elements.push(
        <p key={key++} className="text-[12.5px] leading-[1.7] text-text">
          {renderInline(trimmed, options)}
        </p>
      )
    }
  }

  flushTable()
  flushList()
  return elements
}

export function renderMarkdown(text: string, options?: MarkdownOptions): ReactNode {
  const blocks = splitBlocks(text)

  return (
    <div className="space-y-1">
      {blocks.map((block, i) => {
        if (block.type === 'code') {
          return (
            <div key={i} className="my-2.5 overflow-hidden rounded-lg border border-border/40 bg-bg-tertiary">
              {block.language && (
                <div className="flex items-center border-b border-border/30 px-3 py-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-text-dim">
                    {block.language}
                  </span>
                </div>
              )}
              <pre className="overflow-x-auto p-3 text-[12px] font-mono leading-[1.6] text-text-secondary [&_.line]:block">
                <code className={block.language ? `language-${block.language}` : undefined}>
                  <HighlightedCode code={block.content} language={block.language} />
                </code>
              </pre>
            </div>
          )
        }
        return <Fragment key={i}>{renderTextBlock(block.content, options)}</Fragment>
      })}
    </div>
  )
}

export type { MarkdownOptions }
