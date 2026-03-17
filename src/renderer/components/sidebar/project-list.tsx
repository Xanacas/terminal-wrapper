import { useProjects } from '~/hooks/use-projects'
import { useUIStore } from '~/stores/ui-store'
import { ProjectItem } from './project-item'

export function ProjectList() {
  const openProjectSettings = useUIStore((s) => s.openProjectSettings)
  const openProjectOverview = useUIStore((s) => s.openProjectOverview)
  const closeProjectOverview = useUIStore((s) => s.closeProjectOverview)
  const projectOverviewId = useUIStore((s) => s.projectOverviewId)
  const {
    projects,
    activeProjectId,
    switchProject,
    deleteProject,
    updateProject,
    duplicateProject,
    addThread,
    switchThread,
    deleteThread,
    renameThread,
    duplicateThread
  } = useProjects()

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-text-dim">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-[11px] leading-relaxed text-text-dim">
          No projects yet
          <br />
          <span className="text-text-muted">Click + to create one</span>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-px">
      {projects.map((project) => (
        <ProjectItem
          key={project.id}
          project={project}
          isActiveProject={project.id === activeProjectId}
          onSelectProject={() => switchProject(project.id)}
          onDeleteProject={() => deleteProject(project.id)}
          onRenameProject={(name) => updateProject(project.id, { name })}
          onDuplicateProject={() => duplicateProject(project.id)}
          isOverviewOpen={projectOverviewId === project.id}
          onOpenSettings={() => openProjectSettings(project.id)}
          onOpenOverview={() => openProjectOverview(project.id)}
          onAddThread={() => addThread(project.id)}
          onSelectThread={(threadId) => { closeProjectOverview(); switchThread(project.id, threadId) }}
          onDeleteThread={(threadId) => deleteThread(project.id, threadId)}
          onRenameThread={(threadId, name) => renameThread(project.id, threadId, name)}
          onDuplicateThread={(threadId) => duplicateThread(project.id, threadId)}
        />
      ))}
    </div>
  )
}
