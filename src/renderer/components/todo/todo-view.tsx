import { useState, useRef, useCallback } from 'react'
import { useAppStore } from '~/stores/app-store'
import { useProjects } from '~/hooks/use-projects'

interface TodoViewProps {
  projectId: string
  threadId: string
}

function TodoSection({
  label,
  items,
  onAdd,
  onToggle,
  onDelete,
  onUpdateText,
}: {
  label: string
  items: Array<{ id: string; text: string; completed: boolean }>
  onAdd: (text: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdateText: (id: string, text: string) => void
}) {
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const editRef = useRef<HTMLInputElement>(null)

  const handleAdd = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setInput('')
  }, [input, onAdd])

  const handleEditSubmit = useCallback(
    (id: string) => {
      const value = editRef.current?.value.trim()
      if (value) onUpdateText(id, value)
      setEditingId(null)
    },
    [onUpdateText]
  )

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">{label}</span>
        <span className="text-[10px] text-text-dim/60">{items.length}</span>
      </div>

      <div className="space-y-px">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-bg-secondary"
          >
            <button
              onClick={() => onToggle(item.id)}
              className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded border transition-all ${
                item.completed
                  ? 'border-accent/60 bg-accent/20'
                  : 'border-border-bright/60 hover:border-accent/40'
              }`}
            >
              {item.completed && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2.5 5.5l2 2 3.5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
                </svg>
              )}
            </button>

            {editingId === item.id ? (
              <input
                ref={editRef}
                defaultValue={item.text}
                autoFocus
                onBlur={() => handleEditSubmit(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSubmit(item.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="min-w-0 flex-1 rounded bg-bg-tertiary px-1.5 py-0.5 text-[12.5px] text-text outline-none ring-1 ring-accent/50"
              />
            ) : (
              <span
                onDoubleClick={() => setEditingId(item.id)}
                className={`min-w-0 flex-1 cursor-default truncate text-[12.5px] ${
                  item.completed ? 'text-text-dim line-through' : 'text-text'
                }`}
              >
                {item.text}
              </span>
            )}

            <button
              onClick={() => onDelete(item.id)}
              className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-text-dim opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex items-center gap-2 px-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="Add a todo..."
          className="min-w-0 flex-1 rounded-md bg-bg-tertiary px-2.5 py-1.5 text-[12.5px] text-text placeholder-text-dim/50 outline-none ring-1 ring-border/40 transition-all focus:ring-accent/40"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-md text-text-dim transition-all hover:bg-bg-hover hover:text-text disabled:opacity-30"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1.5v8M1.5 5.5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export function TodoView({ projectId, threadId }: TodoViewProps) {
  const project = useAppStore((s) => s.projects.find((p) => p.id === projectId))
  const { addTodo, toggleTodo, deleteTodo, updateTodoText } = useProjects()

  if (!project) return null

  const allTodos = project.todos ?? []
  const projectTodos = allTodos.filter((t) => t.threadId === null)
  const threadTodos = allTodos.filter((t) => t.threadId === threadId)
  const thread = project.threads.find((t) => t.id === threadId)
  const threadName = thread?.name ?? 'Thread'

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex h-[38px] shrink-0 items-center border-b border-border/60 px-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mr-2 text-text-dim">
          <path d="M9 11l3 3 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[12.5px] font-medium text-text-secondary">Todos</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <TodoSection
          label="Project"
          items={projectTodos}
          onAdd={(text) => addTodo(projectId, text, null)}
          onToggle={(id) => toggleTodo(projectId, id)}
          onDelete={(id) => deleteTodo(projectId, id)}
          onUpdateText={(id, text) => updateTodoText(projectId, id, text)}
        />

        <TodoSection
          label={threadName}
          items={threadTodos}
          onAdd={(text) => addTodo(projectId, text, threadId)}
          onToggle={(id) => toggleTodo(projectId, id)}
          onDelete={(id) => deleteTodo(projectId, id)}
          onUpdateText={(id, text) => updateTodoText(projectId, id, text)}
        />
      </div>
    </div>
  )
}
