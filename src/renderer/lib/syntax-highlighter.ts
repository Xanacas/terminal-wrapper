import { createHighlighter, type HighlighterGeneric, type BundledLanguage, type BundledTheme } from 'shiki'

let highlighter: HighlighterGeneric<BundledLanguage, BundledTheme> | null = null
let highlighterPromise: Promise<HighlighterGeneric<BundledLanguage, BundledTheme>> | null = null

const PRELOADED_LANGS: BundledLanguage[] = [
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'python',
  'bash',
  'shell',
  'json',
  'html',
  'css',
  'go',
  'rust',
  'yaml',
  'toml',
  'sql',
  'markdown',
  'diff',
  'c',
  'cpp',
  'java',
  'ruby',
  'php',
]

const THEME = 'github-dark' as const

function initHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEME],
      langs: PRELOADED_LANGS,
    }).then((h) => {
      highlighter = h
      return h
    })
  }
  return highlighterPromise
}

// Start loading immediately on import
initHighlighter()

/** Returns the highlighter if already loaded, or null */
export function getHighlighterSync() {
  return highlighter
}

/** Returns a promise that resolves to the highlighter */
export function getHighlighterAsync() {
  return initHighlighter()
}

/** Highlight code, returning HTML string. Returns null if highlighter isn't ready or language unsupported. */
export async function highlightCode(code: string, lang: string) {
  const h = await initHighlighter()
  const loadedLangs = h.getLoadedLanguages()

  if (!loadedLangs.includes(lang as BundledLanguage)) {
    try {
      await h.loadLanguage(lang as BundledLanguage)
    } catch {
      return null
    }
  }

  return h.codeToHtml(code, {
    lang,
    theme: THEME,
    structure: 'inline',
  })
}

/** Synchronously highlight code if highlighter is ready. Returns null otherwise. */
export function highlightCodeSync(code: string, lang: string) {
  if (!highlighter) return null
  const loadedLangs = highlighter.getLoadedLanguages()
  if (!loadedLangs.includes(lang as BundledLanguage)) return null

  return highlighter.codeToHtml(code, {
    lang,
    theme: THEME,
    structure: 'inline',
  })
}

export { THEME }
