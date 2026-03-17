interface ShellInfo {
  id: string
  name: string
  path: string
}

interface ShellPickerProps {
  shells: ShellInfo[]
  selectedShellId: string
  onChange: (shellId: string) => void
}

export function ShellPicker({ shells, selectedShellId, onChange }: ShellPickerProps) {
  return (
    <select
      value={selectedShellId}
      onChange={(e) => onChange(e.target.value)}
      className="h-[26px] appearance-none rounded-md border border-border/60 bg-bg-tertiary/80 px-2.5 pr-6 text-[11px] font-medium text-text-muted outline-none transition-all duration-150 hover:border-border-bright hover:text-text-secondary focus:border-accent/60 focus:shadow-[0_0_0_1px_rgba(129,140,248,0.15)]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%236b6b80' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 7px center'
      }}
    >
      {shells.map((shell) => (
        <option key={shell.id} value={shell.id}>{shell.name}</option>
      ))}
    </select>
  )
}
