import { ProjectList } from './project-list'
import { LoggingToggle } from './logging-toggle'
import { useProjects } from '~/hooks/use-projects'
import { useUIStore } from '~/stores/ui-store'

export function Sidebar() {
  const { createProject } = useProjects()

  return (
    <div className="relative flex h-full w-[224px] shrink-0 flex-col bg-bg-secondary" style={{ boxShadow: '1px 0 0 0 var(--color-border)' }}>
      {/* Title bar drag region */}
      <div className="h-[34px] shrink-0 app-drag-region" />

      {/* Header — minimal, just the + button */}
      <div className="flex items-center justify-end px-3 pb-3">
        <button
          onClick={createProject}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-text-dim transition-all duration-150 hover:text-text-secondary"
          style={{ boxShadow: 'none' }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 8px var(--color-accent-glow)'; e.currentTarget.style.background = 'var(--color-bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'transparent' }}
          title="New project (Ctrl+T)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Project list with scroll fade */}
      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-2.5 pb-3">
          <ProjectList />
        </div>
        {/* Bottom gradient fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8" style={{ background: 'linear-gradient(to top, var(--color-bg-secondary), transparent)' }} />
      </div>

      {/* Bottom controls */}
      <div className="flex shrink-0 items-center justify-between" style={{ borderTop: '1px solid var(--color-border)' }}>
        <LoggingToggle />
        <button
          onClick={() => useUIStore.getState().openGlobalSettings()}
          className="mr-2 flex h-6 w-6 items-center justify-center rounded-md text-text-dim transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary"
          title="Global Settings"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
