import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import type { AppOutletContext } from '../App'
import { useWorkspace } from '../store/WorkspaceStore'
import { SprintTimeline } from '../components/calendar/SprintTimeline'
import { MonthCalendar } from '../components/calendar/MonthCalendar'
import { PaceBadge, ProgressBar, ProjectDot } from '../components/ui'
import { getFocusSprint, getScopedSprints, getScopedTasks } from '../lib/scope'
import { getSprintMetrics } from '../lib/progress'
import {
  addMonths,
  formatMonthYear,
  formatRange,
  formatShortDate,
  shiftDateKey,
  subMonths,
  todayKey,
} from '../lib/date'
import { cn } from '../lib/utils'
import { useI18n } from '../i18n/I18nProvider'

type CalendarMode = 'sprint' | 'month'

export function Calendar() {
  const {
    data,
    projectFilter,
    sprintFilter,
    setProjectFilter,
    setSprintFilter,
    updateTask,
    notify,
  } = useWorkspace()
  const { openTask, openNewTask, openNewSprint } = useOutletContext<AppOutletContext>()
  const { t, language } = useI18n()
  const [mode, setMode] = useState<CalendarMode>('sprint')
  const [monthDate, setMonthDate] = useState(() => new Date())

  const focusSprint = getFocusSprint(data, projectFilter, sprintFilter)
  const focusProject = data.projects.find((project) => project.id === focusSprint?.projectId)
  const focusMetrics = getSprintMetrics(focusSprint, data.tasks)
  const scopedSprints = getScopedSprints(data, projectFilter, sprintFilter)
  const scopedTasks = getScopedTasks(data, projectFilter, sprintFilter)
  const today = todayKey()

  const projectSprints = useMemo(
    () =>
      (focusProject ? data.sprints.filter((sprint) => sprint.projectId === focusProject.id) : []).sort(
        (a, b) => a.number - b.number,
      ),
    [data.sprints, focusProject],
  )
  const focusSprintIndex = projectSprints.findIndex((sprint) => sprint.id === focusSprint?.id)
  const previousSprint = focusSprintIndex > 0 ? projectSprints[focusSprintIndex - 1] : undefined
  const nextSprint =
    focusSprintIndex >= 0 && focusSprintIndex < projectSprints.length - 1
      ? projectSprints[focusSprintIndex + 1]
      : undefined

  const scopedProjectIds = useMemo(
    () => Array.from(new Set(scopedSprints.map((sprint) => sprint.projectId))),
    [scopedSprints],
  )
  const scopedProjectList = scopedProjectIds
    .map((id) => data.projects.find((project) => project.id === id))
    .filter((project): project is NonNullable<typeof project> => Boolean(project))

  const monthDeadlineCount = scopedTasks.filter((task) => {
    const date = new Date(`${task.dueDate}T12:00:00`)
    return date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear()
  }).length

  function goToSprint(projectId: string, sprintId: string) {
    setProjectFilter(projectId)
    setSprintFilter(sprintId)
  }

  function resetToToday() {
    setMonthDate(new Date())
    setProjectFilter('all')
    setSprintFilter('active')
  }

  function rescheduleTask(taskId: string, dateKey: string, dragMode: 'shift' | 'due') {
    const task = data.tasks.find((item) => item.id === taskId)
    if (!task) return
    if (dragMode === 'shift') {
      const delta = Math.round(
        (new Date(`${dateKey}T12:00:00`).getTime() - new Date(`${task.dueDate}T12:00:00`).getTime()) / 86400000,
      )
      if (delta === 0) return
      const startDate = shiftDateKey(task.startDate, delta)
      const dueDate = shiftDateKey(task.dueDate, delta)
      updateTask(taskId, { startDate, dueDate })
      notify(`${task.key} rescheduled · ${formatShortDate(startDate)} → ${formatShortDate(dueDate)}.`)
    } else {
      const startDate = task.startDate > dateKey ? dateKey : task.startDate
      updateTask(taskId, { dueDate: dateKey, startDate })
      notify(`${task.key} due date moved to ${formatShortDate(dateKey)}.`)
    }
  }

  function quickAdd(dateKey: string) {
    const projectPool =
      projectFilter === 'all'
        ? data.sprints
        : data.sprints.filter((sprint) => sprint.projectId === projectFilter)
    const containing = projectPool
      .filter(
        (sprint) =>
          sprint.status !== 'completed' &&
          sprint.startDate <= dateKey &&
          sprint.endDate >= dateKey,
      )
      .sort((a, b) => {
        if (a.status === b.status) return a.startDate.localeCompare(b.startDate)
        return a.status === 'active' ? -1 : 1
      })[0]
    const sprint = containing ?? focusSprint
    openNewTask({
      projectId: sprint?.projectId ?? focusProject?.id,
      sprintId: sprint?.id ?? focusSprint?.id,
      dueDate: dateKey,
      startDate: dateKey < (sprint?.startDate ?? dateKey) ? sprint?.startDate ?? dateKey : dateKey,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow">{t('Delivery calendar')}</span>
            <span className="h-3 w-px bg-line-strong" />
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#047857]">
              <RefreshCw size={9} /> {t('Two-way task sync')}
            </span>
          </div>
          <h1 className="mt-1.5 text-[27px] font-semibold leading-tight tracking-[-0.035em] text-ink">
            {t('Sprint Calendar')}
          </h1>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
            {t('The 14-day delivery window, milestones and deadlines — always in sync with the Kanban board.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-[10px] border border-line bg-white p-0.5 shadow-card" role="tablist" aria-label={t('Sprint Calendar')}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'sprint'}
              onClick={() => setMode('sprint')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium transition-all',
                mode === 'sprint' ? 'bg-ink text-white shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              <CalendarRange size={12} /> {t('Sprint timeline')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'month'}
              onClick={() => setMode('month')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium transition-all',
                mode === 'month' ? 'bg-ink text-white shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              <CalendarDays size={12} /> {t('Month')}
            </button>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => openNewTask()}>
            <Plus size={13} /> {t('New task')}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 px-3.5 py-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (mode === 'sprint' && previousSprint) goToSprint(previousSprint.projectId, previousSprint.id)
                else if (mode === 'month') setMonthDate((date) => subMonths(date, 1))
              }}
              disabled={mode === 'sprint' && !previousSprint}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-white text-muted transition-colors hover:bg-[#fafafa] hover:text-ink disabled:opacity-30"
              aria-label={mode === 'sprint' ? 'Previous sprint' : 'Previous month'}
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (mode === 'sprint' && nextSprint) goToSprint(nextSprint.projectId, nextSprint.id)
                else if (mode === 'month') setMonthDate((date) => addMonths(date, 1))
              }}
              disabled={mode === 'sprint' && !nextSprint}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-white text-muted transition-colors hover:bg-[#fafafa] hover:text-ink disabled:opacity-30"
              aria-label={mode === 'sprint' ? 'Next sprint' : 'Next month'}
            >
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {mode === 'sprint' && focusProject ? (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] font-mono text-[9px] font-semibold text-white"
                style={{ backgroundColor: focusProject.color }}
              >
                {focusProject.code}
              </span>
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-[#fafafa] text-muted">
                <CalendarDays size={16} />
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[13px] font-semibold tracking-[-0.01em] text-ink">
                  {mode === 'sprint'
                    ? focusSprint
                      ? `${focusSprint.name} · ${focusProject?.name ?? ''}`
                      : t('No sprint selected')
                    : formatMonthYear(monthDate)}
                </h2>
                {mode === 'sprint' && focusSprint && <PaceBadge pace={focusMetrics.pace} compact />}
              </div>
              <p className="mt-0.5 truncate text-[9.5px] text-subtle">
                {mode === 'sprint'
                  ? focusSprint
                    ? `${formatRange(focusSprint.startDate, focusSprint.endDate)} · ${focusMetrics.done}/${focusMetrics.total} ${t('tasks')} ${t('Done').toLowerCase()}`
                    : t('Start a 14-day sprint to map the delivery window')
                  : `${t('{count} live sprints', {
                      count: scopedSprints.filter((sprint) => sprint.status === 'active').length,
                    })} · ${monthDeadlineCount} ${language === 'id' ? 'tenggat bulan ini' : 'deadlines this month'}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-1.5 pl-1 sm:flex">
              {scopedProjectList.slice(0, 5).map((project) => (
                <span key={project.id} title={project.name}>
                  <ProjectDot color={project.color} size={7} />
                </span>
              ))}
              <span className="text-[9px] text-subtle">
                {projectFilter === 'all' ? t('All projects') : focusProject?.code}
              </span>
            </div>
            <span className="hidden h-4 w-px bg-line sm:block" />
            <button
              type="button"
              onClick={resetToToday}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-white px-2 text-[9.5px] font-medium text-muted transition-colors hover:bg-[#fafafa] hover:text-ink"
            >
              <Clock3 size={10} /> {t('Today')}
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#f4f4f5] px-2 py-1.5 text-[8.5px] font-medium text-muted">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              {t('Synced to board')}
            </span>
          </div>
        </div>

        {mode === 'sprint' && focusSprint && (
          <div className="flex flex-col gap-3 border-t border-line bg-[#fcfcfd] px-3.5 py-2.5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Sparkles size={11} className="shrink-0 text-[#8b7bff]" />
              <p className="truncate text-[10px] text-muted">
                <span className="font-medium text-ink">{t('Sprint goal')}: </span>
                {focusSprint.goal || t('Set a goal for this sprint.')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[8.5px] text-subtle">{t('Task progress')}</span>
                <div className="w-[130px]">
                  <ProgressBar
                    value={focusMetrics.completionPct}
                    height={4}
                    color={focusSprint.status === 'active' ? focusProject?.color : '#d4d4d8'}
                  />
                </div>
                <span className="font-mono text-[8.5px] text-muted">{focusMetrics.completionPct}%</span>
              </div>
              <span className="hidden h-3 w-px bg-line sm:block" />
              <span className="hidden items-center gap-1 text-[8.5px] text-subtle sm:flex">
                <Check size={9} className="text-[#047857]" /> {t('D7 check-in')}
                <span className="mx-0.5">·</span>
                <CalendarRange size={9} className="text-[#6d28d9]" /> {t('D14 demo')}
              </span>
            </div>
          </div>
        )}
      </div>

      {mode === 'sprint' ? (
        focusSprint ? (
          <SprintTimeline
            sprint={focusSprint}
            projects={data.projects}
            members={data.members}
            tasks={scopedTasks}
            projectFilter={projectFilter}
            onOpenTask={openTask}
            onQuickAdd={quickAdd}
            onReschedule={rescheduleTask}
            onNewSprint={() => openNewSprint(focusSprint.projectId)}
          />
        ) : (
          <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-[#fafafa] text-muted">
              <CalendarRange size={20} />
            </span>
            <h2 className="text-[15px] font-semibold text-ink">{t('No sprint selected')}</h2>
            <p className="mt-1 max-w-[380px] text-[11.5px] leading-relaxed text-muted">
              {t('Start a 14-day sprint to map the delivery window')} — {focusProject?.name ?? ''}.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setMode('month')}>
                {t('Month')} <ArrowRight size={12} />
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openNewSprint(focusProject?.id)}
              >
                <Plus size={13} /> {t('Start sprint')}
              </button>
            </div>
          </div>
        )
      ) : (
        <MonthCalendar
          monthDate={monthDate}
          sprints={scopedSprints}
          projects={data.projects}
          tasks={scopedTasks}
          members={data.members}
          onOpenTask={openTask}
          onQuickAdd={quickAdd}
          onReschedule={rescheduleTask}
        />
      )}

      <div className="flex flex-col items-start justify-between gap-2 border-t border-line pt-3 text-[9px] text-subtle sm:flex-row sm:items-center">
        <span className="flex items-center gap-1.5">
          <RefreshCw size={9} />
          {t('Due-date changes write straight to the shared task store — board, drawer and calendar stay aligned.')}
        </span>
        <span className="flex items-center gap-1.5 font-mono">
          {today} · 14-day cadence
        </span>
      </div>
    </div>
  )
}
