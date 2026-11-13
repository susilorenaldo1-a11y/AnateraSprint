import { useMemo, useRef, useState } from 'react'
import { CalendarPlus, Check, ChevronRight, GripVertical, Lock } from 'lucide-react'
import type { Project, Sprint, Task, TeamMember } from '../../types'
import { ProjectDot } from '../ui'
import {
  formatMonthYear,
  formatRange,
  formatShortDate,
  getMonthMatrix,
  isSameMonth,
  todayKey,
} from '../../lib/date'
import { cn } from '../../lib/utils'
import { useI18n } from '../../i18n/I18nProvider'

export function MonthCalendar({
  monthDate,
  sprints,
  projects,
  tasks,
  members,
  onOpenTask,
  onQuickAdd,
  onReschedule,
}: {
  monthDate: Date
  sprints: Sprint[]
  projects: Project[]
  tasks: Task[]
  members: TeamMember[]
  onOpenTask: (taskId: string) => void
  onQuickAdd: (dateKey: string) => void
  onReschedule: (taskId: string, dateKey: string, mode: 'shift' | 'due') => void
}) {
  const days = useMemo(() => getMonthMatrix(monthDate), [monthDate])
  const { t, language } = useI18n()
  const today = todayKey()
  const [draggingTask, setDraggingTask] = useState<string | null>(null)
  const [overDate, setOverDate] = useState<string | null>(null)
  const lastDrop = useRef(0)

  const monthSprints = useMemo(() => {
    const monthStart = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
    const monthEnd = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return sprints.filter(
      (sprint) =>
        sprint.status !== 'completed' &&
        sprint.startDate <= monthEnd &&
        sprint.endDate >= monthStart,
    )
  }, [sprints, monthDate])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    tasks.forEach((task) => {
      const list = map.get(task.dueDate) ?? []
      list.push(task)
      map.set(task.dueDate, list)
    })
    map.forEach((list) => {
      list.sort((a, b) => {
        const rank = { Urgent: 0, High: 1, Normal: 2, Low: 3 }
        return rank[a.priority] - rank[b.priority]
      })
    })
    return map
  }, [tasks])

  const deadlineCount = tasks.filter((task) => isSameMonth(new Date(`${task.dueDate}T12:00:00`), monthDate)).length

  function handleDrop(event: React.DragEvent, dateKey: string) {
    event.preventDefault()
    const taskId =
      event.dataTransfer.getData('application/x-anatera-task') ||
      event.dataTransfer.getData('text/plain')
    if (!taskId) return
    lastDrop.current = Date.now()
    onReschedule(taskId, dateKey, 'due')
    setDraggingTask(null)
    setOverDate(null)
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold text-ink">{t('Monthly delivery calendar')}</h2>
            <span className="rounded-full border border-line bg-[#fafafa] px-1.5 py-0.5 font-mono text-[8.5px] text-muted">
              {deadlineCount} {language === 'id' ? 'tenggat' : `deadline${deadlineCount === 1 ? '' : 's'}`}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-subtle">
            {t('Sprint start/end banners and every task deadline. Drag a deadline to reschedule it.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[9px] text-subtle">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[3px] w-5 rounded-full bg-[#6E56F0]" /> {t('Sprint in flight')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GripVertical size={10} className="text-[#6d28d9]" /> {t('Drag deadline')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarPlus size={10} /> {t('Click day to add')}
          </span>
        </div>
      </div>

      {monthSprints.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-[#fcfcfd] px-4 py-2">
          <span className="text-[8.5px] font-semibold uppercase tracking-[0.1em] text-subtle">{t('Sprint windows')}</span>
          {monthSprints.map((sprint) => {
            const project = projects.find((item) => item.id === sprint.projectId)
            return (
              <span
                key={sprint.id}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-1 text-[8.5px] text-muted"
                title={`${project?.name} · ${formatRange(sprint.startDate, sprint.endDate)}`}
              >
                <ProjectDot color={project?.color ?? '#111827'} size={5} />
                <span className="font-medium text-ink">{project?.code}</span>
                <span>{sprint.name}</span>
                <span className="text-subtle">{formatRange(sprint.startDate, sprint.endDate)}</span>
              </span>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-7 border-b border-line bg-[#fafafa]">
        {(language === 'id'
          ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
          : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        ).map((day, index) => (
          <div
            key={day}
            className={cn(
              'border-r border-line px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-subtle last:border-r-0',
              index >= 5 && 'text-[#b7b8be]',
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((date) => {
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          const dayTasks = tasksByDate.get(dateKey) ?? []
          const visibleTasks = dayTasks.slice(0, 3)
          const hiddenCount = dayTasks.length - visibleTasks.length
          const inMonth = isSameMonth(date, monthDate)
          const isToday = dateKey === today
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          const startingSprints = monthSprints.filter((sprint) => sprint.startDate === dateKey)
          const endingSprints = monthSprints.filter((sprint) => sprint.endDate === dateKey)
          const coveringSprints = monthSprints.filter(
            (sprint) => sprint.startDate <= dateKey && sprint.endDate >= dateKey,
          )

          return (
            <div
              key={dateKey}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (Date.now() - lastDrop.current < 250) return
                onQuickAdd(dateKey)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onQuickAdd(dateKey)
                }
              }}
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
              className={cn(
                'group relative min-h-[118px] border-b border-r border-line p-1.5 text-left transition-colors last:border-r-0 lg:min-h-[128px]',
                !inMonth && 'bg-[#fcfcfd]',
                inMonth && isWeekend && 'bg-[#fdfdfd]',
                overDate === dateKey && draggingTask && 'bg-[#f1edff] ring-1 ring-inset ring-[#c9c0ff]',
                inMonth && 'hover:bg-[#fbfbfd]',
              )}
              title={`${formatShortDate(dateKey)} — ${t('Click day to add')}`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col">
                {coveringSprints.slice(0, 4).map((sprint) => {
                  const project = projects.find((item) => item.id === sprint.projectId)
                  return (
                    <span
                      key={sprint.id}
                      className="h-[2px]"
                      style={{ backgroundColor: project?.color ?? '#111827', opacity: sprint.status === 'active' ? 0.55 : 0.25 }}
                    />
                  )
                })}
              </div>

              <div className="flex items-start justify-between gap-1">
                <span
                  className={cn(
                    'flex h-[21px] min-w-[21px] items-center justify-center rounded-full px-1 text-[10px] font-medium',
                    isToday ? 'bg-ink text-white' : inMonth ? 'text-ink' : 'text-[#c1c2c8]',
                  )}
                >
                  {date.getDate()}
                </span>
                <span className="flex flex-col items-end gap-0.5">
                  {startingSprints.slice(0, 1).map((sprint) => {
                    const project = projects.find((item) => item.id === sprint.projectId)
                    return (
                      <span
                        key={sprint.id}
                        className="month-sprint-chip inline-flex items-center gap-1 rounded px-1 py-0.5 text-[7.5px] font-medium"
                        style={{ backgroundColor: `${project?.color ?? '#111827'}12`, color: project?.color ?? '#111827' }}
                        title={`${sprint.name} starts · ${project?.name}`}
                      >
                        <span className="h-1 w-1 rounded-full bg-current" />
                        {project?.code} S{String(sprint.number).padStart(2, '0')} {t('starts')}
                      </span>
                    )
                  })}
                  {endingSprints.slice(0, 1).map((sprint) => {
                    const project = projects.find((item) => item.id === sprint.projectId)
                    return (
                      <span
                        key={sprint.id}
                        className="inline-flex items-center gap-1 rounded border border-line bg-white px-1 py-0.5 text-[7.5px] font-medium text-muted"
                        title={`${sprint.name} ends · demo / handover`}
                      >
                        <Check size={7} className="text-[#047857]" />
                        {project?.code} S{String(sprint.number).padStart(2, '0')} {t('ends')}
                      </span>
                    )
                  })}
                </span>
              </div>

              <div className="mt-1 space-y-1">
                {visibleTasks.map((task) => {
                  const project = projects.find((item) => item.id === task.projectId)
                  const assignee = members.find((member) => member.id === task.assigneeId)
                  const isDone = task.status === 'done'
                  const isOverdue = !isDone && task.dueDate < today
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(event) => {
                        event.stopPropagation()
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('application/x-anatera-task', task.id)
                        event.dataTransfer.setData('application/x-anatera-mode', 'due')
                        event.dataTransfer.setData('text/plain', task.id)
                        setDraggingTask(task.id)
                      }}
                      onDragEnd={() => {
                        setDraggingTask(null)
                        setOverDate(null)
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (Date.now() - lastDrop.current < 250) return
                        onOpenTask(task.id)
                      }}
                      className={cn(
                        'flex cursor-grab items-center gap-1 rounded-[5px] border-l-2 px-1.5 py-[4px] transition-colors hover:brightness-[0.98] active:cursor-grabbing',
                        isDone && 'opacity-55',
                        draggingTask === task.id && 'opacity-35',
                      )}
                      style={{
                        backgroundColor: `${project?.color ?? '#111827'}0d`,
                        borderLeftColor: project?.color ?? '#111827',
                      }}
                      title={`${task.key} · ${task.title} · ${assignee?.name ?? 'Unassigned'}`}
                    >
                      <span className={cn('truncate text-[8.5px] font-medium leading-tight', isDone ? 'text-subtle line-through' : 'text-[#374151]')}>
                        {task.title}
                      </span>
                      {task.blocked && <Lock size={7} className="ml-auto shrink-0 text-[#be123c]" />}
                      {isOverdue && !task.blocked && <span className="ml-auto h-1 w-1 shrink-0 rounded-full bg-[#e11d48]" />}
                    </div>
                  )
                })}
                {hiddenCount > 0 && (
                  <span
                    className="block px-1 text-[7.5px] font-medium text-subtle"
                    title={dayTasks.slice(3).map((task) => task.title).join(' · ')}
                  >
                    +{hiddenCount} {language === 'id' ? 'tenggat lainnya' : `more deadline${hiddenCount === 1 ? '' : 's'}`}
                  </span>
                )}
              </div>

              <span className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-md border border-line bg-white text-subtle opacity-0 shadow-card transition-opacity group-hover:opacity-100">
                <CalendarPlus size={10} />
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-2 border-t border-line bg-[#fcfcfd] px-4 py-2.5 text-[9px] text-subtle sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-1.5">
          <ProjectDot color="#6E56F0" size={5} />
          {formatMonthYear(monthDate)} · {monthSprints.length} {t('Sprint windows').toLowerCase()} ·{' '}
          {deadlineCount} {language === 'id' ? 'tenggat' : 'deadlines'}
        </span>
        <span className="flex items-center gap-1.5">
          {t('Drag a deadline to another day to sync its due date with the Kanban board')}
          <ChevronRight size={9} />
        </span>
      </div>
    </div>
  )
}
