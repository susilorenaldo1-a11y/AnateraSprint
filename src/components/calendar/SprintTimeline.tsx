import { useMemo, useRef, useState } from 'react'
import {
  CalendarPlus,
  Check,
  Flag,
  GripVertical,
  Lock,
  Milestone,
  Sparkles,
} from 'lucide-react'
import type { Project, Sprint, Task, TeamMember } from '../../types'
import { Avatar, ProjectDot } from '../ui'
import {
  daysBetween,
  dateRangeKeys,
  formatShortDate,
  parseDateKey,
  sprintDay,
  todayKey,
} from '../../lib/date'
import { cn } from '../../lib/utils'
import { useI18n } from '../../i18n/I18nProvider'

export function SprintTimeline({
  sprint,
  projects,
  members,
  tasks,
  projectFilter,
  onOpenTask,
  onQuickAdd,
  onReschedule,
  onNewSprint,
}: {
  sprint: Sprint
  projects: Project[]
  members: TeamMember[]
  tasks: Task[]
  projectFilter: string
  onOpenTask: (taskId: string) => void
  onQuickAdd: (dateKey: string) => void
  onReschedule: (taskId: string, dateKey: string, mode: 'shift' | 'due') => void
  onNewSprint: () => void
}) {
  const days = useMemo(() => dateRangeKeys(sprint.startDate, sprint.endDate), [sprint.startDate, sprint.endDate])
  const dayCount = Math.max(1, days.length)
  const { t, language } = useI18n()
  const minGridWidth = Math.max(760, dayCount * 48)
  const checkInIndex = Math.min(6, dayCount - 1)
  const demoIndex = dayCount - 1
  const today = todayKey()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overDate, setOverDate] = useState<string | null>(null)
  const lastDrop = useRef(0)

  const timelineTasks = useMemo(
    () => tasks.filter((task) => task.startDate <= sprint.endDate && task.dueDate >= sprint.startDate),
    [tasks, sprint.startDate, sprint.endDate],
  )

  const groupedTasks = useMemo(() => {
    return projects
      .map((project) => ({
        project,
        tasks: timelineTasks
          .filter((task) => task.projectId === project.id)
          .sort((a, b) => {
            if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate)
            return a.order - b.order
          }),
      }))
      .filter((group) => group.tasks.length > 0)
  }, [projects, timelineTasks])

  const activeProject = projects.find((project) => project.id === sprint.projectId)
  const currentDay = sprintDay(sprint.startDate, today)
  const isTodayInWindow = currentDay >= 1 && currentDay <= dayCount

  function taskGeometry(task: Task) {
    const rawStart = daysBetween(sprint.startDate, task.startDate)
    const rawEnd = daysBetween(sprint.startDate, task.dueDate)
    const start = Math.max(0, Math.min(dayCount - 1, rawStart))
    const end = Math.max(0, Math.min(dayCount - 1, rawEnd))
    const startsBefore = rawStart < 0
    const endsAfter = rawEnd > dayCount - 1
    return {
      left: `${(start / dayCount) * 100}%`,
      width: `${((end - start + 1) / dayCount) * 100}%`,
      startsBefore,
      endsAfter,
    }
  }

  function handleBarClick(taskId: string) {
    if (Date.now() - lastDrop.current < 200) return
    onOpenTask(taskId)
  }

  function handleDrop(event: React.DragEvent, dateKey: string) {
    event.preventDefault()
    const taskId =
      event.dataTransfer.getData('application/x-anatera-task') ||
      event.dataTransfer.getData('text/plain')
    if (!taskId) return
    lastDrop.current = Date.now()
    onReschedule(taskId, dateKey, 'shift')
    setDraggingId(null)
    setOverDate(null)
  }

  function handleDayClick(dateKey: string) {
    if (Date.now() - lastDrop.current < 250) return
    onQuickAdd(dateKey)
  }

  if (timelineTasks.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[13px] font-semibold text-ink">{t('{count}-day sprint timeline', { count: dayCount })}</h2>
            <p className="mt-0.5 text-[10px] text-subtle">
              {language === 'id' ? `Hari 1 → Hari ${dayCount}` : `Day 1 → Day ${dayCount}`} · {t('Deliverables').toLowerCase()}
            </p>
          </div>
          <span className="rounded-full border border-line bg-[#fafafa] px-2 py-1 font-mono text-[9px] text-muted">
            0 deliverables
          </span>
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-[#fafafa] text-muted">
            <Milestone size={18} />
          </span>
          <h3 className="text-[13.5px] font-semibold text-ink">{t('No work mapped to this sprint window')}</h3>
          <p className="mt-1 max-w-[350px] text-[11px] leading-relaxed text-muted">
            {t('Add a task with dates inside this sprint window, or move a task onto a day to schedule it.')}
          </p>
          <div className="mt-4 flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={onNewSprint}>
              {t('Next sprint')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onQuickAdd(isTodayInWindow ? today : sprint.startDate)}
            >
              <CalendarPlus size={13} /> {t('Add task')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold text-ink">{t('{count}-day sprint timeline', { count: dayCount })}</h2>
            <span className="rounded-full border border-line bg-[#fafafa] px-1.5 py-0.5 font-mono text-[8.5px] text-muted">
              {t('Day {day} of {total}', { day: 1, total: dayCount })}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-subtle">
            {t('Drag a task bar onto any day to shift its dates. Click a day to add a task.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[9px] text-subtle">
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#f5f3ff] text-[#6d28d9]">
              <Flag size={8} />
            </span>
            {t('D7 check-in')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ecfdf5] text-[#047857]">
              <Check size={8} />
            </span>
            {t('D14 demo')}
          </span>
          <span className="hidden items-center gap-1.5 text-[#6d28d9] sm:inline-flex">
            <GripVertical size={10} /> {t('Drag to reschedule')}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1030px]">
          <div className="flex border-b border-line bg-[#fcfcfd]">
            <div className="sticky left-0 z-20 flex w-[252px] min-w-[252px] items-center gap-2 border-r border-line bg-[#fcfcfd] px-3 py-2">
              <span className="eyebrow">{t('Deliverables')}</span>
              <span className="ml-auto font-mono text-[8.5px] text-subtle">{timelineTasks.length}</span>
            </div>
            <div
              className="grid flex-1"
              style={{ minWidth: minGridWidth, gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}
            >
              {days.map((dateKey, index) => {
                const date = parseDateKey(dateKey)
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const isToday = dateKey === today
                return (
                  <div
                    key={dateKey}
                    className={cn(
                      'relative border-r border-line/70 px-1.5 py-2 text-center last:border-r-0',
                      isWeekend && 'bg-[#fafafa]',
                      isToday && 'bg-[#f5f3ff]',
                    )}
                  >
                    {isToday && <span className="absolute inset-x-0 top-0 h-[2px] bg-[#6E56F0]" />}
                    <p className={cn('text-[8px] font-medium uppercase tracking-[0.06em]', isToday ? 'text-[#6d28d9]' : 'text-subtle')}>
                      {date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'short' })}
                    </p>
                    <p className={cn('mt-0.5 text-[13px] font-semibold leading-none', isToday ? 'text-[#5b21b6]' : 'text-ink')}>
                      {date.getDate()}
                    </p>
                    <p className={cn('mt-1 font-mono text-[7px] uppercase', isToday ? 'text-[#7c3aed]' : 'text-[#c1c2c8]')}>
                      {isToday ? (language === 'id' ? 'HARI INI' : 'TODAY') : `${language === 'id' ? 'HARI' : 'DAY'} ${index + 1}`}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex border-b border-line bg-white">
            <div className="sticky left-0 z-20 flex w-[252px] min-w-[252px] items-center gap-1.5 border-r border-line bg-white px-3 py-2">
              <Milestone size={11} className="text-[#8b7bff]" />
              <span className="text-[9.5px] font-medium text-muted">{t('Sprint milestones')}</span>
            </div>
            <div className="relative min-h-[44px] flex-1" style={{ minWidth: minGridWidth }}>
              <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-[#e6e3ff]" />
              <div
                className="absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-[#ddd5ff] bg-white py-1 pl-1 pr-2.5 shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
                style={{ left: `${((checkInIndex + 0.5) / dayCount) * 100}%` }}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#f1edff] text-[#6d28d9]">
                  <Flag size={8} />
                </span>
                <span className="whitespace-nowrap text-[8.5px] font-medium text-[#5b21b6]">{t('Mid-sprint check-in')}</span>
                <span className="font-mono text-[7px] text-subtle">D{checkInIndex + 1}</span>
              </div>
              <div
                className="absolute top-1/2 z-10 flex -translate-x-full -translate-y-1/2 items-center gap-1 rounded-full border border-[#d7f1e4] bg-white py-1 pl-1 pr-2.5 shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
                style={{ left: `${((demoIndex + 0.5) / dayCount) * 100}%` }}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#ecfdf5] text-[#047857]">
                  <Check size={8} />
                </span>
                <span className="whitespace-nowrap text-[8.5px] font-medium text-[#047857]">{t('Sprint demo / handover')}</span>
                <span className="font-mono text-[7px] text-subtle">D{demoIndex + 1}</span>
              </div>
            </div>
          </div>

          {groupedTasks.map(({ project, tasks: projectTasks }) => {
            const groupDone = projectTasks.filter((task) => task.status === 'done').length
            const groupPoints = projectTasks.reduce((sum, task) => sum + task.storyPoints, 0)
            return (
              <div key={project.id}>
                <div className="flex items-center gap-2 border-b border-line bg-[#fafafa] px-3 py-1.5">
                  <ProjectDot color={project.color} size={7} />
                  <span className="font-mono text-[8px] font-medium text-muted">{project.code}</span>
                  <span className="text-[9px] font-medium text-ink">{project.name}</span>
                  <span className="text-[8.5px] text-subtle">
                    · {projectTasks.length} {t('tasks')} · {groupPoints} {t('pts')}
                  </span>
                  <span className="ml-auto flex items-center gap-1 font-mono text-[8px] text-subtle">
                    <span className="h-1 w-1 rounded-full" style={{ backgroundColor: project.color }} />
                    {groupDone}/{projectTasks.length} {t('Done').toLowerCase()}
                  </span>
                </div>

                {projectTasks.map((task) => {
                  const geometry = taskGeometry(task)
                  const assignee = members.find((member) => member.id === task.assigneeId)
                  const isDone = task.status === 'done'
                  const isOverdue = !isDone && task.dueDate < today
                  const endDay = Math.max(1, Math.min(dayCount, daysBetween(sprint.startDate, task.dueDate) + 1))
                  return (
                    <div
                      key={task.id}
                      className="group flex border-b border-line/70 last:border-b-0 hover:bg-[#fcfcfd]"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenTask(task.id)}
                        className="sticky left-0 z-20 flex w-[252px] min-w-[252px] items-center gap-2 border-r border-line bg-white px-3 py-2 text-left transition-colors group-hover:bg-[#fcfcfd]"
                      >
                        <span className="h-7 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1">
                            <span className="truncate text-[10px] font-medium leading-tight text-ink">{task.title}</span>
                            {task.blocked && <Lock size={8} className="shrink-0 text-[#be123c]" />}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[8px] text-subtle">
                            <span className="font-mono">{task.key}</span>
                            <span>·</span>
                            <span>{t('Due')} D{endDay}</span>
                            <span>·</span>
                            <span>{task.storyPoints} {t('pts')}</span>
                          </span>
                        </span>
                        {assignee ? (
                          <Avatar member={assignee} size={20} />
                        ) : (
                          <span className="h-5 w-5 shrink-0 rounded-full border border-dashed border-line-strong" />
                        )}
                      </button>

                      <div
                        className="relative grid flex-1"
                        style={{ minWidth: minGridWidth, gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}
                      >
                        {days.map((dateKey, index) => {
                          const date = parseDateKey(dateKey)
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6
                          const isTodayCol = dateKey === today
                          return (
                            <div
                              key={dateKey}
                              className={cn(
                                'relative h-[50px] border-r border-line/60 last:border-r-0 transition-colors',
                                isWeekend && 'bg-[#fbfbfc]',
                                isTodayCol && 'bg-[#faf8ff]',
                                overDate === dateKey && draggingId && 'bg-[#f0edff]',
                              )}
                              onDragOver={(event) => {
                                event.preventDefault()
                                event.dataTransfer.dropEffect = 'move'
                                if (overDate !== dateKey) setOverDate(dateKey)
                              }}
                              onDragLeave={(event) => {
                                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                                  setOverDate((current) => (current === dateKey ? null : current))
                                }
                              }}
                              onDrop={(event) => handleDrop(event, dateKey)}
                              onClick={() => handleDayClick(dateKey)}
                              title={`Day ${index + 1} · ${formatShortDate(dateKey)} — click to add a task`}
                            />
                          )
                        })}

                        <div
                          className="pointer-events-auto absolute inset-y-0 z-[5] flex items-center"
                          style={{ left: geometry.left, width: geometry.width }}
                        >
                          <div
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = 'move'
                              event.dataTransfer.setData('application/x-anatera-task', task.id)
                              event.dataTransfer.setData('application/x-anatera-mode', 'shift')
                              event.dataTransfer.setData('text/plain', task.id)
                              setDraggingId(task.id)
                            }}
                            onDragEnd={() => {
                              setDraggingId(null)
                              setOverDate(null)
                            }}
                            onClick={(event) => {
                              event.stopPropagation()
                              handleBarClick(task.id)
                            }}
                            className={cn(
                              'pointer-events-auto group/bar relative flex h-[28px] w-full cursor-grab items-center gap-1.5 overflow-hidden rounded-[7px] border px-2 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-opacity active:cursor-grabbing',
                              !isDone && !isOverdue && 'timeline-task-bar',
                              draggingId === task.id && 'opacity-40',
                              isDone
                                ? 'border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]'
                                : isOverdue
                                  ? 'border-[#fecdd3] bg-[#fff1f2] text-[#9f1239]'
                                  : 'border-transparent',
                            )}
                            style={
                              isDone || isOverdue
                                ? undefined
                                : {
                                    backgroundColor: `${project.color}12`,
                                    color: project.color,
                                    borderColor: `${project.color}2b`,
                                  }
                            }
                            title={`${task.key} · ${task.title} · ${formatShortDate(task.startDate)} → ${formatShortDate(task.dueDate)}`}
                          >
                            <span
                              className="absolute inset-y-0 left-0 w-[3px]"
                              style={{ backgroundColor: isDone ? '#059669' : isOverdue ? '#e11d48' : project.color }}
                            />
                            <span className="ml-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-white/65">
                              {isDone ? (
                                <Check size={8} strokeWidth={3} />
                              ) : task.blocked ? (
                                <Lock size={7} />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} />
                              )}
                            </span>
                            <span className="truncate text-[8.5px] font-medium">{task.title}</span>
                            <span className="ml-auto hidden shrink-0 font-mono text-[7.5px] opacity-60 sm:inline">
                              D{endDay}
                            </span>
                            {geometry.startsBefore && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] opacity-50">‹</span>
                            )}
                            {geometry.endsAfter && (
                              <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[10px] opacity-50">›</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-line bg-[#fcfcfd] px-4 py-2.5 text-[9px] text-subtle sm:flex-row sm:items-center sm:justify-between">
          <span>
            {activeProject?.name} · {formatShortDate(sprint.startDate)} → {formatShortDate(sprint.endDate)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded border border-line bg-white px-1 py-0.5 font-mono text-[8px]">Drag</span>
            {t('Drag to reschedule')}
            <span className="mx-1 text-line-strong">·</span>
            <span className="rounded border border-line bg-white px-1 py-0.5 font-mono text-[8px]">Click</span>
            {t('Click day to add')}
          </span>
      </div>
    </div>
  )
}
