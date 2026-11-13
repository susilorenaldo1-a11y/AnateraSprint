import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Columns3,
  Filter,
  Flag,
  FolderKanban,
  Plus,
  RotateCcw,
  Search,
  UserRound,
  X,
} from 'lucide-react'
import type { AppOutletContext } from '../App'
import type { PaceState, Priority, TaskStatus } from '../types'
import { PRIORITIES, TASK_STATUSES } from '../types'
import { useWorkspace } from '../store/WorkspaceStore'
import { KanbanColumn } from '../components/board/KanbanColumn'
import { TaskCard } from '../components/board/TaskCard'
import { PaceBadge, ProgressBar, ProjectDot } from '../components/ui'
import { getFocusSprint, getScopedSprints, getScopedTasks, sortTasksForBoard } from '../lib/scope'
import { getSprintMetrics } from '../lib/progress'
import { daysBetween, formatRange, todayKey } from '../lib/date'
import { cn } from '../lib/utils'
import { arrayMove } from '@dnd-kit/sortable'
import { useI18n } from '../i18n/I18nProvider'

const laneLabels = Object.fromEntries(TASK_STATUSES.map((lane) => [lane.id, lane.label])) as Record<TaskStatus, string>

function FilterSelect({
  icon,
  value,
  onChange,
  children,
  active,
  label,
}: {
  icon: ReactNode
  value: string
  onChange: (value: string) => void
  children: ReactNode
  active?: boolean
  label: string
}) {
  return (
    <label
      className={cn(
        'kanban-filter relative flex h-8 min-w-0 items-center gap-1.5 rounded-lg border bg-surface pl-2.5 pr-6 transition-colors',
        active ? 'border-[#d8d2ff]' : 'border-line hover:border-line-strong',
      )}
      style={active ? { backgroundColor: 'var(--accent-soft)' } : undefined}
      aria-label={label}
    >
      <span className={cn('shrink-0', active ? 'text-[#6d28d9]' : 'text-subtle')}>{icon}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="kanban-filter-select max-w-[148px] cursor-pointer appearance-none truncate border-0 bg-transparent py-0 text-[10.5px] font-medium text-ink outline-none"
      >
        {children}
      </select>
      <ChevronDown size={11} className="pointer-events-none absolute right-2 text-subtle" />
    </label>
  )
}

export function Board() {
  const { data, projectFilter, sprintFilter, setProjectFilter, setSprintFilter, reorderTasks, notify } = useWorkspace()
  const { openTask, openNewTask, openNewSprint, openNewProject } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const { t, language } = useI18n()

  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [search, setSearch] = useState('')
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const lastDragEnd = useRef(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const boardTasksBase = useMemo(
    () => getScopedTasks(data, projectFilter, sprintFilter),
    [data, projectFilter, sprintFilter],
  )
  const boardTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return boardTasksBase.filter((task) => {
      if (assigneeFilter === 'unassigned' && task.assigneeId) return false
      if (assigneeFilter !== 'all' && assigneeFilter !== 'unassigned' && task.assigneeId !== assigneeFilter) return false
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
      if (query) {
        const project = data.projects.find((item) => item.id === task.projectId)
        const searchable = `${task.key} ${task.title} ${task.description} ${project?.name ?? ''} ${project?.code ?? ''}`
        if (!searchable.toLowerCase().includes(query)) return false
      }
      return true
    })
  }, [boardTasksBase, assigneeFilter, priorityFilter, search, data.projects])

  const scopedSprints = getScopedSprints(data, projectFilter, sprintFilter)
  const focusSprint = getFocusSprint(data, projectFilter, sprintFilter)
  const focusProject = data.projects.find((project) => project.id === focusSprint?.projectId)
  const focusMetrics = getSprintMetrics(focusSprint, data.tasks)
  const activeScopedSprints = scopedSprints.filter((sprint) => sprint.status === 'active')
  const plannedScopedSprints = scopedSprints.filter((sprint) => sprint.status === 'planning')
  const liveMetrics = activeScopedSprints.map((sprint) => getSprintMetrics(sprint, data.tasks))
  const totalTasks = boardTasksBase.length
  const doneTasks = boardTasksBase.filter((task) => task.status === 'done').length
  const completionPct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100)
  const totalPoints = boardTasksBase.reduce((sum, task) => sum + task.storyPoints, 0)
  const donePoints = boardTasksBase
    .filter((task) => task.status === 'done')
    .reduce((sum, task) => sum + task.storyPoints, 0)
  const summaryPace: PaceState =
    boardTasksBase.length === 0
      ? 'Upcoming'
      : focusSprint?.status === 'completed'
        ? 'Complete'
        : activeScopedSprints.length === 0
          ? 'Upcoming'
          : liveMetrics.some((metric) => metric.pace === 'At Risk')
            ? 'At Risk'
            : liveMetrics.every((metric) => metric.pace === 'Ahead of Schedule')
              ? 'Ahead of Schedule'
              : liveMetrics.some((metric) => metric.pace === 'Complete')
                ? 'Complete'
                : 'On Track'
  const windowStart = scopedSprints.reduce(
    (min, sprint) => (sprint.startDate < min ? sprint.startDate : min),
    scopedSprints[0]?.startDate ?? todayKey(),
  )
  const windowEnd = scopedSprints.reduce(
    (max, sprint) => (sprint.endDate > max ? sprint.endDate : max),
    scopedSprints[0]?.endDate ?? todayKey(),
  )
  const allProjectsView = projectFilter === 'all'
  const dayCopy =
    allProjectsView
      ? `${activeScopedSprints.length} ${t('live')}`
      : focusSprint?.status === 'active'
        ? t('Day {day} of {total}', {
            day: Math.max(1, focusMetrics.currentDay),
            total: focusMetrics.totalDays,
          })
        : focusSprint?.status === 'planning'
          ? t('Starts {date}', {
              date: new Date(`${focusSprint.startDate}T12:00:00`).toLocaleDateString(
                language === 'id' ? 'id-ID' : 'en-US',
                { month: 'short', day: 'numeric' },
              ),
            })
          : focusSprint?.status === 'completed'
            ? t('Completed')
            : t('No live sprint')
  const subCopy =
    allProjectsView
      ? `${plannedScopedSprints.length} ${t('in planning')}`
      : focusSprint?.status === 'active'
        ? t('{count} days to handover', { count: focusMetrics.daysRemaining })
        : focusSprint?.status === 'planning'
          ? t('{count} days to kickoff', {
              count: Math.max(0, daysBetween(todayKey(), focusSprint.startDate)),
            })
          : focusSprint?.status === 'completed'
            ? t('Archived sprint view')
            : t('Start a sprint to plan work')

  const projectSprintOptions = useMemo(() => {
    const list =
      projectFilter === 'all'
        ? data.sprints
        : data.sprints.filter((sprint) => sprint.projectId === projectFilter)
    return [...list].sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [data.sprints, projectFilter])

  const activeDragTask = activeTaskId ? data.tasks.find((task) => task.id === activeTaskId) : undefined
  const activeDragProject = data.projects.find((project) => project.id === activeDragTask?.projectId)

  const filtersActive = assigneeFilter !== 'all' || priorityFilter !== 'all' || search.trim() !== ''

  function clearFilters() {
    setAssigneeFilter('all')
    setPriorityFilter('all')
    setSearch('')
    setProjectFilter('all')
    setSprintFilter('active')
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTaskId(null)
    lastDragEnd.current = Date.now()
    if (!over) return

    const task = data.tasks.find((item) => item.id === active.id)
    if (!task) return
    const overId = String(over.id)
    const overTask = data.tasks.find((item) => item.id === overId)
    const targetStatus = overId.startsWith('column-')
      ? (overId.replace('column-', '') as TaskStatus)
      : overTask?.status

    if (!targetStatus) return

    const targetLane = sortTasksForBoard(
      boardTasksBase.filter((item) => item.status === targetStatus && item.id !== task.id),
    )
    const overIndex = overTask ? targetLane.findIndex((item) => item.id === overTask.id) : targetLane.length
    const insertionIndex = overIndex >= 0 ? overIndex : targetLane.length

    if (targetStatus === task.status) {
      if (overId === task.id) return
      const sameLane = sortTasksForBoard(boardTasksBase.filter((item) => item.status === task.status))
      const oldIndex = sameLane.findIndex((item) => item.id === task.id)
      const newIndex = overTask ? sameLane.findIndex((item) => item.id === overTask.id) : sameLane.length - 1
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return
      const reordered = arrayMove(sameLane, oldIndex, newIndex)
      reorderTasks(reordered.map((item, index) => ({ id: item.id, status: item.status, order: index + 1 })))
      return
    }

    const nextLane = [
      ...targetLane.slice(0, insertionIndex),
      { ...task, status: targetStatus },
      ...targetLane.slice(insertionIndex),
    ]
    reorderTasks(nextLane.map((item, index) => ({ id: item.id, status: targetStatus, order: index + 1 })))
    notify(
      language === 'id'
        ? `${task.key} dipindahkan ke ${t(laneLabels[targetStatus])}.`
        : `${task.key} moved to ${laneLabels[targetStatus]}.`,
      'success',
    )
  }

  function handleCardOpen(taskId: string) {
    if (Date.now() - lastDragEnd.current < 180) return
    openTask(taskId)
  }

  const visibleLaneTasks = (status: TaskStatus) => boardTasks.filter((task) => task.status === status)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow">{t('Sprint execution')}</span>
            <span className="h-3 w-px bg-line-strong" />
            <span className="text-[10px] font-medium text-muted">
              {projectFilter === 'all' ? t('Cross-project board') : focusProject?.name}
            </span>
          </div>
          <h1 className="mt-1.5 flex items-center gap-2.5 text-[27px] font-semibold leading-tight tracking-[-0.035em] text-ink">
            {t('Kanban Board')}
            <span className="hidden rounded-full border border-line bg-white px-2 py-1 font-mono text-[9px] font-medium tracking-normal text-muted sm:inline-flex">
              {t('{count} cards', { count: boardTasks.length })}
            </span>
          </h1>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
            {t('Drag deliverables across the delivery flow. Every move syncs to the project and calendar.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/calendar')}>
            <CalendarDays size={13} /> {t('Sprint calendar')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => openNewTask()}>
            <Plus size={13} /> {t('New task')}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-3 lg:w-[275px] lg:shrink-0">
            {!allProjectsView && focusProject ? (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] font-mono text-[9px] font-semibold text-white"
                style={{ backgroundColor: focusProject.color }}
              >
                {focusProject.code}
              </span>
            ) : (
              <span className="grid h-9 w-9 shrink-0 grid-cols-2 gap-0.5 rounded-[10px] border border-line bg-[#fafafa] p-2">
                {data.projects.slice(0, 4).map((project) => (
                  <span key={project.id} className="rounded-[2px]" style={{ backgroundColor: project.color }} />
                ))}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[12px] font-semibold text-ink">
                  {allProjectsView ? t('Cross-project board') : focusSprint?.name ?? t('No sprint')}
                </p>
                <PaceBadge pace={summaryPace} compact />
              </div>
              <p className="mt-0.5 truncate text-[9.5px] text-subtle">
                {allProjectsView
                  ? `${t('{count} current sprints', { count: scopedSprints.length })} · ${formatRange(windowStart, windowEnd)}`
                  : focusSprint
                    ? formatRange(focusSprint.startDate, focusSprint.endDate)
                    : t('Create a sprint to begin')}
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[9.5px] text-muted">
                <Columns3 size={11} className="text-subtle" />
                <span>{t('Delivery progress')}</span>
                <span className="text-subtle">·</span>
                <span className="font-mono text-[9px] text-subtle">
                  {doneTasks}/{totalTasks} {t('tasks')} · {donePoints}/{totalPoints} {t('pts')}
                </span>
              </div>
              <span className="font-mono text-[10px] font-medium text-ink">{completionPct}%</span>
            </div>
            <ProgressBar value={completionPct} height={5} color={summaryPace === 'At Risk' ? '#D97706' : '#111827'} className="mt-1.5" />
          </div>

          <div className="flex shrink-0 items-center gap-2 border-line lg:border-l lg:pl-4">
            <div className="rounded-lg border border-line bg-[#fcfcfd] px-2.5 py-1.5 text-right">
              <p className="font-mono text-[11px] font-semibold leading-none text-ink">{dayCopy}</p>
              <p className="mt-0.5 text-[8px] text-subtle">{subCopy}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {activeScopedSprints.slice(0, 4).map((sprint) => {
                const project = data.projects.find((item) => item.id === sprint.projectId)
                return <ProjectDot key={sprint.id} color={project?.color ?? '#111827'} size={7} />
              })}
            </div>
          </div>
        </div>
        <div className="h-[2px] w-full bg-[#f3f4f6]">
          <div
            className="h-full bg-ink transition-[width] duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden items-center gap-1.5 pr-1 text-[9.5px] font-medium uppercase tracking-[0.11em] text-subtle sm:flex">
          <Filter size={11} /> {t('Filter')}
        </span>
        <FilterSelect
          label="Filter by project"
          icon={<FolderKanban size={12} />}
          value={projectFilter}
          onChange={(value) => setProjectFilter(value)}
          active={projectFilter !== 'all'}
        >
          <option value="all">{t('All projects')}</option>
          {data.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.code} · {project.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Filter by sprint"
          icon={<CalendarDays size={12} />}
          value={sprintFilter}
          onChange={(value) => setSprintFilter(value)}
          active={sprintFilter !== 'active'}
        >
          <option value="active">{t('Current sprints')}</option>
          <option value="all">{t('All sprints')}</option>
          {projectSprintOptions.map((sprint) => {
            const project = data.projects.find((item) => item.id === sprint.projectId)
            return (
              <option key={sprint.id} value={sprint.id}>
                {projectFilter === 'all' ? `${project?.code} · ` : ''}
                {sprint.name}
              </option>
            )
          })}
        </FilterSelect>
        <FilterSelect
          label="Filter by assignee"
          icon={<UserRound size={12} />}
          value={assigneeFilter}
          onChange={setAssigneeFilter}
          active={assigneeFilter !== 'all'}
        >
          <option value="all">{t('All assignees')}</option>
          <option value="unassigned">{t('Unassigned')}</option>
          {data.members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Filter by priority"
          icon={<Flag size={12} />}
          value={priorityFilter}
          onChange={(value) => setPriorityFilter(value as 'all' | Priority)}
          active={priorityFilter !== 'all'}
        >
          <option value="all">{t('All priorities')}</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {t(priority)}
            </option>
          ))}
        </FilterSelect>
        <div className="relative flex h-8 min-w-[150px] flex-1 items-center rounded-lg border border-line bg-surface pl-8 pr-7 transition-colors focus-within:border-[#d8d2ff] sm:max-w-[210px]">
          <Search size={12} className="pointer-events-none absolute left-2.5 text-subtle" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('Search tasks…')}
            className="w-full border-0 bg-transparent py-0 text-[10.5px] text-ink outline-none placeholder:text-subtle"
            aria-label={t('Search tasks…')}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 text-subtle hover:text-ink"
              aria-label="Clear search"
            >
              <X size={11} />
            </button>
          )}
        </div>
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] font-medium text-muted transition-colors hover:bg-white hover:text-ink"
          >
            <RotateCcw size={10} /> {t('Clear')}
          </button>
        )}
          <span className="ml-auto hidden items-center gap-1 font-mono text-[9px] text-subtle md:flex">
            <span className="h-1 w-1 rounded-full bg-emerald-500" />
            {t('Autosaved locally')}
          </span>
      </div>

      {boardTasksBase.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-[#fafafa] text-muted">
            <Columns3 size={20} />
          </span>
          <h2 className="text-[15px] font-semibold text-ink">{t('No tasks in this sprint view')}</h2>
          <p className="mt-1 max-w-[360px] text-[11.5px] leading-relaxed text-muted">
            {data.projects.length === 0
              ? t('Create a sprint for this project first.')
              : t('Create a deliverable or switch to another sprint to see its board.')}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => openNewProject()}>
              <FolderKanban size={13} /> {t('New project')}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => openNewTask()}>
              <Plus size={13} /> {t('Create task')}
            </button>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setActiveTaskId(null)
            lastDragEnd.current = Date.now()
          }}
        >
          <div className="h-[calc(100vh-338px)] min-h-[510px] overflow-x-auto overflow-y-hidden pb-2">
            <div
              className="grid h-full gap-2"
              style={{ gridTemplateColumns: 'repeat(5, minmax(205px, 1fr))', minWidth: '1045px' }}
            >
              {TASK_STATUSES.map((lane) => (
                <KanbanColumn
                  key={lane.id}
                  status={lane.id}
                  label={lane.label}
                  tasks={visibleLaneTasks(lane.id)}
                  projects={data.projects}
                  members={data.members}
                  onOpen={handleCardOpen}
                  onAdd={(status) => openNewTask({ status, projectId: focusProject?.id, sprintId: focusSprint?.id })}
                  projectFilter={projectFilter}
                />
              ))}
            </div>
          </div>

          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
            {activeDragTask && activeDragProject ? (
              <div className="w-[272px] cursor-grabbing">
                <TaskCard
                  task={activeDragTask}
                  project={activeDragProject}
                  assignee={data.members.find((member) => member.id === activeDragTask.assigneeId)}
                  overlay
                  projectFilter={projectFilter}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {boardTasksBase.length > 0 && (
        <div className="flex flex-col items-start justify-between gap-2 pb-1 text-[9px] text-subtle sm:flex-row sm:items-center">
          <span className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-line bg-white px-1 py-0.5 font-mono text-[8px]">Drag</kbd> {t('reorder or change status')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-line bg-white px-1 py-0.5 font-mono text-[8px]">Click</kbd> {t('open task drawer')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-line bg-white px-1 py-0.5 font-mono text-[8px]">C</kbd> {t('New task').toLowerCase()}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={10} className="text-[#059669]" />
            {t('Board, drawer and calendar share one live task store')}
          </span>
        </div>
      )}
    </div>
  )
}
