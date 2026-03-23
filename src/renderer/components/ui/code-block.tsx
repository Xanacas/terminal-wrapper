import { useState, useEffect } from 'react'
import { highlightCodeSync, getHighlighterAsync } from '~/lib/syntax-highlighter'

export function HighlightedCode({ code, language }: { code: string; language?: string }) {
  const syncResult = language ? highlightCodeSync(code, language) : null
  const [html, setHtml] = useState<string | null>(syncResult)

  useEffect(() => {
    if (html || !language) return

    let cancelled = false
    getHighlighterAsync().then((h) => {
      if (cancelled) return
      const loadedLangs = h.getLoadedLanguages()
      if (!loadedLangs.includes(language as never)) {
        h.loadLanguage(language as never)
          .then(() => {
            if (cancelled) return
            setHtml(h.codeToHtml(code, { lang: language, theme: 'github-dark', structure: 'inline' }))
          })
          .catch(() => {})
        return
      }
      setHtml(h.codeToHtml(code, { lang: language, theme: 'github-dark', structure: 'inline' }))
    })
    return () => {
      cancelled = true
    }
  }, [code, language, html])

  if (html) {
    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }

  return <>{code}</>
}
