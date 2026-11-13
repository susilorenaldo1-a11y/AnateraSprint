import { CSS } from '@dnd-kit/utilities'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { Circle, CircleCheck, CircleDashed, Eye, LoaderCircle, Plus } from 'lucide-react'
import type { Project, Task, TaskStatus, TeamMember } from '../../types'
import { sortTasksForBoard } from '../../lib/scope'
import { cn } from '../../lib/utils'
import { useI18n } from '../../i18n/I18nProvider'
import { TaskCard } from './TaskCard'

const laneConfig: Record<
  TaskStatus,
  { color: string; soft: string; icon: typeof Circle; description: string }
> = {
  backlog: { color: '#9CA3AF', soft: '#f4f4f5', icon: CircleDashed, description: 'Ideas & future work' },
  todo: { color: '#3B82F6', soft: '#eff6ff', icon: Circle, description: 'Committed to this sprint' },
  in_progress: { color: '#D97706', soft: '#fffbeb', icon: LoaderCircle, description: 'Actively being built' },
  in_review: { color: '#8B5CF6', soft: '#f5f3ff', icon: Eye, description: 'QA & client review' },
  done: { color: '#059669', soft: '#ecfdf5', icon: CircleCheck, description: 'Shipped & accepted' },
}

function SortableTask({
  task,
  project,
  assignee,
  onOpen,
  projectFilter,
}: {
  task: Task
  project: Project
  assignee?: TeamMember | null
  onOpen: (id: string) => void
  projectFilter: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', status: task.status, taskId: task.id },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: 'none',
      }}
      {...attributes}
      {...listeners}
      className={cn('outline-none', isDragging && 'z-20')}
    >
      <TaskCard
        task={task}
        project={project}
        assignee={assignee}
        projectFilter={projectFilter}
        onClick={() => onOpen(task.id)}
        dragging={isDragging}
      />
    </div>
  )
}

export function KanbanColumn({
  status,
  label,
  tasks,
  projects,
  members,
  onOpen,
  onAdd,
  projectFilter,
}: {
  status: TaskStatus
  label: string
  tasks: Task[]
  projects: Project[]
  members: TeamMember[]
  onOpen: (id: string) => void
  onAdd: (status: TaskStatus) => void
  projectFilter: string
}) {
  const config = laneConfig[status]
  const Icon = config.icon
  const { t, language } = useI18n()
  const sorted = sortTasksForBoard(tasks)
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}`, data: { type: 'column', status } })
  const totalPoints = sorted.reduce((sum, task) => sum + task.storyPoints, 0)

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex h-full min-h-[420px] w-full min-w-[205px] flex-col overflow-hidden rounded-xl border transition-colors duration-150',
        isOver ? 'border-[#c9c0ff] bg-[#f7f5ff]' : 'border-line bg-[#f7f7f8]',
      )}
      aria-label={t(label)}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 pb-2 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: config.soft, color: config.color }}
          >
            <Icon size={13} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-[11.5px] font-semibold tracking-[-0.005em] text-ink">{t(label)}</h2>
              <span className="rounded-full border border-line bg-white px-1.5 py-0.5 font-mono text-[9px] leading-none text-muted">
                {sorted.length}
              </span>
            </div>
            <p className="mt-0.5 hidden truncate text-[8.5px] text-subtle xl:block">{t(config.description)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onAdd(status)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-white hover:text-ink hover:shadow-card"
          aria-label={`${t('Add task')} · ${t(label)}`}
          title={`${t('Add task')} · ${t(label)}`}
        >
          <Plus size={14} />
        </button>
      </header>

      <div className="flex items-center justify-between px-3 pb-2">
        <span className="inline-flex items-center gap-1 text-[8.5px] text-subtle">
          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: config.color }} />
          {sorted.length === 0
            ? t('No tasks')
            : language === 'id'
              ? `${sorted.length} deliverable`
              : `${sorted.length} deliverable${sorted.length === 1 ? '' : 's'}`}
        </span>
        <span className="font-mono text-[8.5px] text-subtle">{totalPoints} {t('pts')}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-1">
        <SortableContext items={sorted.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sorted.map((task) => {
              const project = projects.find((item) => item.id === task.projectId)
              if (!project) return null
              return (
                <SortableTask
                  key={task.id}
                  task={task}
                  project={project}
                  assignee={members.find((member) => member.id === task.assigneeId)}
                  onOpen={onOpen}
                  projectFilter={projectFilter}
                />
              )
            })}
          </div>
        </SortableContext>

        {sorted.length === 0 && (
          <button
            type="button"
            onClick={() => onAdd(status)}
            className={cn(
              'flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 text-center transition-colors',
              isOver ? 'border-[#b9adff] bg-[#f0edff] text-[#5b21b6]' : 'border-[#dedfe3] text-subtle hover:border-line-strong hover:bg-white/70',
            )}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white">
              <Plus size={13} />
            </span>
            <span className="text-[10px] font-medium">{isOver ? t('Drop it here') : t('Drop a task here')}</span>
            <span className="text-[8.5px] text-subtle">{t('or click to create one')}</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onAdd(status)}
        className="mx-2 mb-2 mt-1 flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-[9.5px] font-medium text-subtle transition-colors hover:bg-white hover:text-ink hover:shadow-card"
      >
        <Plus size={11} /> {t('Add task')}
      </button>
    </section>
  )
}

