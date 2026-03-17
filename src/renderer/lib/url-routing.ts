export interface UrlPattern {
  pattern: string
  type: 'glob' | 'regex'
  target: 'browser-panel' | 'external'
}

export interface UrlRoutingConfig {
  patterns: UrlPattern[]
  defaultTarget: 'browser-panel' | 'external'
}

export const defaultUrlRoutingConfig: UrlRoutingConfig = {
  patterns: [],
  defaultTarget: 'external',
}

export function matchUrl(url: string, config: UrlRoutingConfig): 'browser-panel' | 'external' {
  for (const rule of config.patterns) {
    if (testPattern(url, rule)) {
      return rule.target
    }
  }
  return config.defaultTarget
}

function testPattern(url: string, rule: UrlPattern) {
  if (rule.type === 'regex') {
    try {
      return new RegExp(rule.pattern).test(url)
    } catch {
      return false
    }
  }
  // Glob matching
  const regexStr = globToRegex(rule.pattern)
  try {
    return new RegExp(regexStr).test(url)
  } catch {
    return false
  }
}

function globToRegex(glob: string) {
  let result = '^'
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        result += '.*'
        i++ // skip next *
      } else {
        result += '[^/]*'
      }
    } else if (c === '?') {
      result += '.'
    } else if ('.+^${}()|[]\\'.includes(c)) {
      result += '\\' + c
    } else {
      result += c
    }
  }
  result += '$'
  return result
}
