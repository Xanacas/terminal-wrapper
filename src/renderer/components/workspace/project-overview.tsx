import { useState, useCallback } from 'react'
import type { Project, TodoItem } from '~/stores/app-store'
import { useProjects } from '~/hooks/use-projects'
import { useUIStore } from '~/stores/ui-store'

function TodoSection({
  label,
  items,
  onAdd,
  onToggle,
  onDelete,
}: {
  label: string
  items: TodoItem[]
  onAdd: (text: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [input, setInput] = useState('')

  const handleAdd = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setInput('')
  }, [input, onAdd])

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">{label}</span>
        <span className="text-[10px] text-text-dim/60">{items.length}</span>
      </div>
      <div className="space-y-px">
        {items.map((item) => (
          <div key={item.id} className="group flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-bg-secondary">
            <button
              onClick={() => onToggle(item.id)}
              className={`flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded border transition-all ${
                item.completed ? 'border-accent/60 bg-accent/20' : 'border-border-bright/60 hover:border-accent/40'
              }`}
            >
              {item.completed && (
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <path d="M2.5 5.5l2 2 3.5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
                </svg>
              )}
            </button>
            <span className={`min-w-0 flex-1 truncate text-[12px] ${item.completed ? 'text-text-dim line-through' : 'text-text'}`}>
              {item.text}
            </span>
            <button
              onClick={() => onDelete(item.id)}
              className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded text-text-dim opacity-0 transition-all hover:text-danger group-hover:opacity-100"
            >
              <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-center gap-2 px-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="Add..."
          className="min-w-0 flex-1 rounded bg-bg-tertiary px-2 py-1 text-[12px] text-text placeholder-text-dim/50 outline-none ring-1 ring-border/40 focus:ring-accent/40"
        />
      </div>
    </div>
  )
}

interface ProjectOverviewProps {
  project: Project
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const { addTodo, toggleTodo, deleteTodo, switchThread } = useProjects()
  const closeProjectOverview = useUIStore((s) => s.closeProjectOverview)

  const allTodos = project.todos ?? []
  const projectTodos = allTodos.filter((t) => t.threadId === null)

  // Group thread todos
  const threadGroups = project.threads.map((thread) => ({
    thread,
    todos: allTodos.filter((t) => t.threadId === thread.id),
  }))

  const handleGoToThread = useCallback(
    (threadId: string) => {
      closeProjectOverview()
      switchThread(project.id, threadId)
    },
    [project.id, switchThread, closeProjectOverview]
  )

  const claudeConfig = project.claudeConfig

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[600px] space-y-6 p-6">
          {/* Project Info */}
          <div>
            <h2 className="mb-4 text-[16px] font-semibold text-text">{project.name}</h2>
            <div className="space-y-2 rounded-lg border border-border/60 bg-bg-secondary p-4">
              <InfoRow label="Working Directory" value={project.defaultCwd} />
              <InfoRow label="Default URL" value={project.defaultUrl} />
              <InfoRow label="Shell" value={project.defaultShellId} />
              <InfoRow label="Threads" value={String(project.threads.length)} />
            </div>
          </div>

          {/* Claude Config */}
          {claudeConfig && (
            <div>
              <h3 className="mb-2 text-[13px] font-semibold text-text-secondary">Claude Configuration</h3>
              <div className="space-y-2 rounded-lg border border-border/60 bg-bg-secondary p-4">
                {claudeConfig.model && <InfoRow label="Model" value={claudeConfig.model} />}
                {claudeConfig.permissionMode && <InfoRow label="Permission Mode" value={claudeConfig.permissionMode} />}
                {claudeConfig.effort && <InfoRow label="Effort" value={claudeConfig.effort} />}
                {claudeConfig.cwd && <InfoRow label="CWD Override" value={claudeConfig.cwd} />}
              </div>
            </div>
          )}

          {/* Project Todos */}
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-text-secondary">Todos</h3>
            <div className="rounded-lg border border-border/60 bg-bg-secondary p-4">
              <TodoSection
                label="Project"
                items={projectTodos}
                onAdd={(text) => addTodo(project.id, text, null)}
                onToggle={(id) => toggleTodo(project.id, id)}
                onDelete={(id) => deleteTodo(project.id, id)}
              />

              {threadGroups.map(({ thread, todos }) => (
                <div key={thread.id}>
                  <div className="mb-1.5 mt-3 flex items-center gap-2">
                    <button
                      onClick={() => handleGoToThread(thread.id)}
                      className="text-[11px] font-semibold uppercase tracking-wider text-accent hover:underline"
                    >
                      {thread.name}
                    </button>
                    <span className="text-[10px] text-text-dim/60">{todos.length}</span>
                  </div>
                  {todos.length > 0 ? (
                    <div className="space-y-px">
                      {todos.map((item) => (
                        <div key={item.id} className="group flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-bg-tertiary">
                          <button
                            onClick={() => toggleTodo(project.id, item.id)}
                            className={`flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded border transition-all ${
                              item.completed ? 'border-accent/60 bg-accent/20' : 'border-border-bright/60'
                            }`}
                          >
                            {item.completed && (
                              <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                                <path d="M2.5 5.5l2 2 3.5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
                              </svg>
                            )}
                          </button>
                          <span className={`min-w-0 flex-1 truncate text-[12px] ${item.completed ? 'text-text-dim line-through' : 'text-text'}`}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="px-2 text-[11px] text-text-dim/50">No todos</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="shrink-0 text-[11px] text-text-dim">{label}</span>
      <span className="min-w-0 truncate text-[12px] text-text">{value}</span>
    </div>
  )
}
