import { useState, useRef, useEffect } from 'react'

interface QuestionOption {
  label: string
  description: string
  preview?: string
}

interface Question {
  question: string
  header: string
  options: QuestionOption[]
  multiSelect?: boolean
}

interface AskUserQuestionPromptProps {
  toolUseId: string
  input: unknown
  onSubmit: (toolUseId: string, answers: Record<string, string>) => void
  onDeny: (toolUseId: string) => void
}

function parseQuestions(input: unknown): Question[] {
  const inp = input as { questions?: Question[] } | undefined
  return inp?.questions ?? []
}

/** Checks if any option in a question has a preview */
function questionHasPreview(q: Question) {
  return q.options.some((o) => o.preview)
}

/** Sandboxed HTML preview rendered in an iframe */
function PreviewPane({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(100)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const wrapped = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #e0e0e0; background: transparent; line-height: 1.5; }
  img { max-width: 100%; }
  pre, code { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }
  pre { background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 6px; overflow-x: auto; }
</style></head><body>${html}</body></html>`

    iframe.srcdoc = wrapped

    const onLoad = () => {
      try {
        const doc = iframe.contentDocument
        if (doc?.body) {
          const h = doc.body.scrollHeight
          if (h > 0) setHeight(Math.min(h + 4, 300))
        }
      } catch {
        // cross-origin — use default height
      }
    }

    iframe.addEventListener('load', onLoad)
    return () => iframe.removeEventListener('load', onLoad)
  }, [html])

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin"
      className="w-full rounded-md border border-border/30 bg-bg-tertiary"
      style={{ height, border: 'none' }}
      title="Option preview"
    />
  )
}

/** Radio or checkbox indicator */
function SelectionIndicator({ selected, multi }: { selected: boolean; multi: boolean }) {
  return (
    <div className={`flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-${multi ? 'sm' : 'full'} border transition-all duration-100 ${
      selected
        ? 'border-accent bg-accent'
        : 'border-text-dim/40 group-hover/opt:border-text-dim/60'
    }`}>
      {selected && (
        multi ? (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <div className="h-[6px] w-[6px] rounded-full bg-white" />
        )
      )}
    </div>
  )
}

export function AskUserQuestionPrompt({ toolUseId, input, onSubmit, onDeny }: AskUserQuestionPromptProps) {
  const questions = parseQuestions(input)
  const [selections, setSelections] = useState<Map<number, Set<string>>>(() => new Map())
  const [freeText, setFreeText] = useState<Map<number, string>>(() => new Map())
  const [otherSelected, setOtherSelected] = useState<Set<number>>(() => new Set())

  const toggleOption = (qIndex: number, label: string, multiSelect: boolean) => {
    setSelections((prev) => {
      const next = new Map(prev)
      const current = new Set(next.get(qIndex) ?? [])

      if (multiSelect) {
        if (current.has(label)) current.delete(label)
        else current.add(label)
      } else {
        current.clear()
        current.add(label)
      }

      if (!multiSelect) {
        setOtherSelected((p) => {
          const n = new Set(p)
          n.delete(qIndex)
          return n
        })
      }

      next.set(qIndex, current)
      return next
    })
  }

  const toggleOther = (qIndex: number, multiSelect: boolean) => {
    if (!multiSelect) {
      setSelections((prev) => {
        const next = new Map(prev)
        next.set(qIndex, new Set())
        return next
      })
    }
    setOtherSelected((prev) => {
      const next = new Set(prev)
      if (next.has(qIndex)) next.delete(qIndex)
      else next.add(qIndex)
      return next
    })
  }

  const handleSubmit = () => {
    const answers: Record<string, string> = {}
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const selected = selections.get(i) ?? new Set()
      const parts = [...selected]

      if (otherSelected.has(i)) {
        const text = freeText.get(i)?.trim()
        if (text) parts.push(text)
      }

      answers[q.question] = parts.join(', ')
    }
    onSubmit(toolUseId, answers)
  }

  const hasAnyAnswer = () => {
    for (let i = 0; i < questions.length; i++) {
      const selected = selections.get(i)
      if (selected && selected.size > 0) return true
      if (otherSelected.has(i) && freeText.get(i)?.trim()) return true
    }
    return false
  }

  if (questions.length === 0) return null

  return (
    <div className="my-2 flex overflow-hidden rounded-lg border border-accent/20 bg-accent/[0.03]">
      {/* Left accent bar */}
      <div className="w-[2.5px] shrink-0 bg-accent" />

      <div className="min-w-0 flex-1 p-3">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-accent">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M5.5 5.5a1.5 1.5 0 0 1 2.83.5c0 1-1.33 1-1.33 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="7" cy="10" r="0.5" fill="currentColor" />
          </svg>
          <span className="text-[12px] font-medium text-text">Claude has a question</span>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, qIndex) => {
            const selected = selections.get(qIndex) ?? new Set()
            const isOther = otherSelected.has(qIndex)
            const hasPreviews = questionHasPreview(q)

            return (
              <div key={qIndex}>
                {/* Question header chip + text */}
                <div className="mb-2 flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                    {q.header}
                  </span>
                  <span className="text-[12px] leading-[1.5] text-text-secondary">
                    {q.question}
                  </span>
                </div>

                {/* Options — grid when previews exist, list otherwise */}
                {hasPreviews ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 pl-0.5">
                      {q.options.map((opt) => {
                        const isSelected = selected.has(opt.label)

                        return (
                          <button
                            key={opt.label}
                            onClick={() => toggleOption(qIndex, opt.label, q.multiSelect ?? false)}
                            className={`group/opt flex flex-col rounded-lg border text-left transition-all duration-100 ${
                              isSelected
                                ? 'border-accent/50 bg-accent/10 ring-1 ring-accent/20'
                                : 'border-border/60 bg-bg-secondary/50 hover:border-border-bright/60 hover:bg-bg-hover/40'
                            }`}
                          >
                            {/* Preview area */}
                            {opt.preview ? (
                              <div className="overflow-hidden rounded-t-[7px]">
                                <PreviewPane html={opt.preview} />
                              </div>
                            ) : (
                              <div className="flex h-[80px] items-center justify-center rounded-t-[7px] bg-bg-tertiary/50">
                                <span className="text-[11px] text-text-dim/30">No preview</span>
                              </div>
                            )}

                            {/* Label + description */}
                            <div className="flex items-start gap-2 border-t border-border/30 px-2.5 py-2">
                              <div className="mt-0.5">
                                <SelectionIndicator selected={isSelected} multi={q.multiSelect ?? false} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={`text-[12px] font-medium ${isSelected ? 'text-accent' : 'text-text-secondary'}`}>
                                  {opt.label}
                                </div>
                                <div className="mt-0.5 text-[11px] leading-[1.4] text-text-dim">
                                  {opt.description}
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* "Other" below the grid */}
                    <div className="mt-2 pl-0.5">
                      <button
                        onClick={() => toggleOther(qIndex, q.multiSelect ?? false)}
                        className={`group/opt flex w-full items-start gap-2.5 rounded-md border px-3 py-2 text-left transition-all duration-100 ${
                          isOther
                            ? 'border-accent/40 bg-accent/10'
                            : 'border-border/60 bg-bg-secondary/50 hover:border-border-bright/60 hover:bg-bg-hover/40'
                        }`}
                      >
                        <div className="mt-0.5">
                          <SelectionIndicator selected={isOther} multi={q.multiSelect ?? false} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-[12px] font-medium ${isOther ? 'text-accent' : 'text-text-secondary'}`}>
                            Other
                          </div>
                          <div className="mt-0.5 text-[11px] leading-[1.4] text-text-dim">
                            Type your own answer
                          </div>
                        </div>
                      </button>
                      {isOther && (
                        <div className="ml-[26px] mt-1.5">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Type your answer..."
                            value={freeText.get(qIndex) ?? ''}
                            onChange={(e) => {
                              setFreeText((prev) => {
                                const next = new Map(prev)
                                next.set(qIndex, e.target.value)
                                return next
                              })
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && hasAnyAnswer()) handleSubmit()
                            }}
                            className="w-full rounded-md border border-border/60 bg-bg-tertiary px-2.5 py-1.5 text-[12px] text-text-secondary outline-none transition-colors focus:border-accent/40"
                          />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Non-preview list layout */
                  <div className="space-y-1.5 pl-0.5">
                    {q.options.map((opt) => {
                      const isSelected = selected.has(opt.label)

                      return (
                        <button
                          key={opt.label}
                          onClick={() => toggleOption(qIndex, opt.label, q.multiSelect ?? false)}
                          className={`group/opt flex w-full items-start gap-2.5 rounded-md border px-3 py-2 text-left transition-all duration-100 ${
                            isSelected
                              ? 'border-accent/40 bg-accent/10'
                              : 'border-border/60 bg-bg-secondary/50 hover:border-border-bright/60 hover:bg-bg-hover/40'
                          }`}
                        >
                          <div className="mt-0.5">
                            <SelectionIndicator selected={isSelected} multi={q.multiSelect ?? false} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`text-[12px] font-medium ${isSelected ? 'text-accent' : 'text-text-secondary'}`}>
                              {opt.label}
                            </div>
                            <div className="mt-0.5 text-[11px] leading-[1.4] text-text-dim">
                              {opt.description}
                            </div>
                          </div>
                        </button>
                      )
                    })}

                    {/* "Other" option */}
                    <button
                      onClick={() => toggleOther(qIndex, q.multiSelect ?? false)}
                      className={`group/opt flex w-full items-start gap-2.5 rounded-md border px-3 py-2 text-left transition-all duration-100 ${
                        isOther
                          ? 'border-accent/40 bg-accent/10'
                          : 'border-border/60 bg-bg-secondary/50 hover:border-border-bright/60 hover:bg-bg-hover/40'
                      }`}
                    >
                      <div className="mt-0.5">
                        <SelectionIndicator selected={isOther} multi={q.multiSelect ?? false} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-[12px] font-medium ${isOther ? 'text-accent' : 'text-text-secondary'}`}>
                          Other
                        </div>
                        <div className="mt-0.5 text-[11px] leading-[1.4] text-text-dim">
                          Type your own answer
                        </div>
                      </div>
                    </button>

                    {isOther && (
                      <div className="ml-[26px]">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Type your answer..."
                          value={freeText.get(qIndex) ?? ''}
                          onChange={(e) => {
                            setFreeText((prev) => {
                              const next = new Map(prev)
                              next.set(qIndex, e.target.value)
                              return next
                            })
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && hasAnyAnswer()) handleSubmit()
                          }}
                          className="w-full rounded-md border border-border/60 bg-bg-tertiary px-2.5 py-1.5 text-[12px] text-text-secondary outline-none transition-colors focus:border-accent/40"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={!hasAnyAnswer()}
            className="rounded-md bg-accent px-3.5 py-1.5 text-[12px] font-medium text-white transition-all duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit
          </button>
          <button
            onClick={() => onDeny(toolUseId)}
            className="rounded-md border border-border-bright/60 bg-transparent px-3.5 py-1.5 text-[12px] font-medium text-text-secondary transition-all duration-150 hover:border-danger/40 hover:text-danger"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}

/** Resolved (already answered) version shown after submission */
export function AskUserQuestionResolved({ input, answers }: { input: unknown; answers?: Record<string, string> }) {
  const questions = parseQuestions(input)
  if (questions.length === 0) return null

  return (
    <div className="my-1 flex overflow-hidden rounded-lg border border-border/70 bg-bg-secondary/80">
      <div className="w-[2px] shrink-0 bg-success" />
      <div className="min-w-0 flex-1 px-3 py-2">
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-success">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 6l1.5 1.5L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[11px] text-text-dim">Question answered</span>
        </div>
        {answers && Object.keys(answers).length > 0 && (
          <div className="mt-1.5 space-y-1">
            {Object.entries(answers).map(([question, answer]) => (
              <div key={question} className="text-[11px] text-text-dim">
                <span className="text-text-secondary">{answer}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
