import { ProjectList } from './project-list'
import { useProjects } from '~/hooks/use-projects'

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
    </div>
  )
}
