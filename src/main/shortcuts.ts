const isMac = process.platform === 'darwin'

interface ShortcutDef {
  channel: string
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
  key: string
}

const rawShortcuts: Record<string, string> = {
  'CommandOrControl+Shift+P': 'shortcut:command-palette',
  'CommandOrControl+P':       'shortcut:project-switcher',
  'CommandOrControl+T':       'shortcut:new-project',
  'CommandOrControl+W':       'shortcut:close-tab',
  'CommandOrControl+L':       'shortcut:focus-address-bar',
  'CommandOrControl+`':       'shortcut:focus-terminal',
  'CommandOrControl+Shift+D': 'shortcut:split-right',
  'CommandOrControl+Shift+E': 'shortcut:split-down',
  'CommandOrControl+Shift+T': 'shortcut:new-terminal-tab',
  'CommandOrControl+Shift+B': 'shortcut:new-browser-tab',
  'CommandOrControl+Shift+A': 'shortcut:new-claude-tab',
  'CommandOrControl+Tab':       'shortcut:thread-next',
  'CommandOrControl+Shift+Tab': 'shortcut:thread-prev',
  'CommandOrControl+1': 'shortcut:thread-1',
  'CommandOrControl+2': 'shortcut:thread-2',
  'CommandOrControl+3': 'shortcut:thread-3',
  'CommandOrControl+4': 'shortcut:thread-4',
  'CommandOrControl+5': 'shortcut:thread-5',
  'CommandOrControl+6': 'shortcut:thread-6',
  'CommandOrControl+7': 'shortcut:thread-7',
  'CommandOrControl+8': 'shortcut:thread-8',
  'CommandOrControl+9': 'shortcut:thread-9',
  'CommandOrControl+PageUp':   'shortcut:tab-prev',
  'CommandOrControl+PageDown': 'shortcut:tab-next',
  'Alt+1': 'shortcut:panel-1',
  'Alt+2': 'shortcut:panel-2',
  'Alt+3': 'shortcut:panel-3',
  'Alt+4': 'shortcut:panel-4',
  'Alt+5': 'shortcut:panel-5',
  'Alt+6': 'shortcut:panel-6',
  'Alt+7': 'shortcut:panel-7',
  'Alt+8': 'shortcut:panel-8',
  'Alt+9': 'shortcut:panel-9',
}

function parseAccelerator(accel: string, channel: string): ShortcutDef {
  const parts = accel.split('+')
  const key = parts[parts.length - 1].toLowerCase()
  const mods = new Set(parts.slice(0, -1).map(m => m.toLowerCase()))

  const hasCommandOrControl = mods.has('commandorcontrol')

  return {
    channel,
    ctrl: hasCommandOrControl ? !isMac : false,
    meta: hasCommandOrControl ? isMac : false,
    alt: mods.has('alt'),
    shift: mods.has('shift'),
    key,
  }
}

const shortcuts: ShortcutDef[] = Object.entries(rawShortcuts).map(
  ([accel, channel]) => parseAccelerator(accel, channel)
)

export function matchShortcut(input: Electron.Input): string | null {
  if (input.type !== 'keyDown') return null

  const inputKey = input.key.toLowerCase()

  // Normalize PageUp/PageDown
  const normalizedKey = inputKey === 'pageup' ? 'pageup'
    : inputKey === 'pagedown' ? 'pagedown'
    : inputKey

  for (const s of shortcuts) {
    if (s.key !== normalizedKey) continue
    if (s.ctrl !== input.control) continue
    if (s.meta !== input.meta) continue
    if (s.alt !== input.alt) continue
    if (s.shift !== input.shift) continue
    return s.channel
  }

  return null
}
