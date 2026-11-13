import { useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FolderKanban,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Zap,
} from 'lucide-react'
import type { AppOutletContext } from '../App'
import { useWorkspace } from '../store/WorkspaceStore'
import type { Project } from '../types'
import {
  AvatarStack,
  DropdownItem,
  EmptyState,
  PaceBadge,
  Popover,
  ProgressBar,
  ProjectDot,
  ProjectStatusBadge,
} from '../components/ui'
import {
  getActiveSprints,
  getProjectCurrentSprint,
  getProjectTeam,
  getSprintMetrics,
  getSprintVelocity,
} from '../lib/progress'
import { daysBetween, formatRange, formatShortDate, todayKey } from '../lib/date'
import { getScopedProjects } from '../lib/scope'
import { workflowProgress } from '../lib/normalizeWorkspace'
import { DashboardCalendar } from '../components/DashboardCalendar'
import { cn } from '../lib/utils'
import { useI18n } from '../i18n/I18nProvider'
import { useSession } from '../auth/SessionProvider'

function Sparkline({ values, color = '#6E56F0' }: { values: number[]; color?: string }) {
  if (values.length < 2) {
    return <div className="h-8 w-full rounded bg-[#f7f7f8]" />
  }
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const y = 30 - ((value - min) / range) * 24
      return `${x},${y}`
    })
    .join(' ')
  const areaPoints = `0,32 ${points} 100,32`
  return (
    <svg viewBox="0 0 100 34" preserveAspectRatio="none" className="h-8 w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkline-fill)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx="100"
        cy={30 - ((values[values.length - 1] - min) / range) * 24}
        r="2.3"
        fill={color}
        stroke="white"
        strokeWidth="1.2"
      />
    </svg>
  )
}

function ProjectCard({
  project,
  onEdit,
  onSprint,
}: {
  project: Project
  onEdit: () => void
  onSprint: () => void
}) {
  const { data, setProjectFilter, setSprintFilter } = useWorkspace()
  const { t, language } = useI18n()
  const navigate = useNavigate()
  const { openTask, openProjectWorkspace } = useOutletContext<AppOutletContext>()
  const sprint = getProjectCurrentSprint(project.id, data.sprints)
  const metrics = getSprintMetrics(sprint, data.tasks)
  const flow = workflowProgress(project)
  const sprintTasks = sprint ? data.tasks.filter((task) => task.sprintId === sprint.id) : []
  const team = getProjectTeam(project.id, sprintTasks, project.leadId)
  const lead = data.members.find((member) => member.id === project.leadId)
  const daysToStart = sprint ? daysBetween(todayKey(), sprint.startDate) : 0
  const passedDays = sprint?.status === 'active' ? metrics.currentDay : sprint?.status === 'completed' ? 14 : 0

  function openProject(route: string) {
    setProjectFilter(project.id)
    setSprintFilter(sprint?.id ?? 'active')
    navigate(route)
  }

  return (
    <article className="card card-hover group flex flex-col overflow-hidden p-4 sm:p-[18px]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => openProjectWorkspace(project.id)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] font-mono text-[10px] font-semibold tracking-[0.02em] text-white shadow-sm transition-transform group-hover:scale-[1.03]"
          style={{ background: `linear-gradient(140deg, ${project.color}, ${project.color}d9)` }}
          aria-label={`Open ${project.name} project workspace`}
        >
          {project.code}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openProjectWorkspace(project.id)}
              className="truncate text-left text-[13.5px] font-semibold tracking-[-0.01em] text-ink hover:underline hover:decoration-line-strong hover:underline-offset-2"
            >
              {project.name}
            </button>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p
            className="mt-0.5 truncate text-[10.5px] text-subtle"
            title={`${project.client} · ${project.clientContact.name} · Lead ${lead?.name ?? 'Unassigned'}`}
          >
            {project.client} · {project.clientContact.name} · {t('Lead')} {lead?.name ?? t('Unassigned')}
          </p>
        </div>
        <Popover
          ariaLabel={`${project.name} actions`}
          align="right"
          panelClassName="w-[214px]"
          trigger={
            <span className="icon-btn -mr-1 -mt-1 h-8 w-8">
              <MoreHorizontal size={16} />
            </span>
          }
        >
          {(close) => (
            <>
              <DropdownItem
                icon={<FolderKanban size={13} />}
                onClick={() => {
                  close()
                  openProjectWorkspace(project.id)
                }}
              >
                {t('Project workspace')}
              </DropdownItem>
              <DropdownItem
                icon={<Pencil size={13} />}
                onClick={() => {
                  close()
                  onEdit()
                }}
              >
                {t('Edit project')}
              </DropdownItem>
              <DropdownItem
                icon={<CalendarRange size={13} />}
                onClick={() => {
                  close()
                  onSprint()
                }}
              >
                {t('Start next sprint')}
              </DropdownItem>
              <DropdownItem
                icon={<ArrowUpRight size={13} />}
                onClick={() => {
                  close()
                  openProject('/calendar')
                }}
              >
                {t('Sprint calendar')}
              </DropdownItem>
            </>
          )}
        </Popover>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line/80 bg-[#fcfcfd] px-2.5 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-semibold text-ink">{sprint?.name ?? 'No sprint yet'}</span>
            {sprint && <span className="text-[9px] text-subtle">· {formatRange(sprint.startDate, sprint.endDate)}</span>}
          </div>
          <p className="mt-0.5 truncate text-[9.5px] text-subtle">
            {sprint?.status === 'active'
              ? `${t('Day {day} of {total}', { day: Math.max(1, metrics.currentDay), total: metrics.totalDays })} · ${
                  language === 'id' ? `${metrics.daysRemaining} hari tersisa` : `${metrics.daysRemaining} days left`
                }`
              : sprint?.status === 'planning'
                ? `${t('Starts {date}', { date: formatShortDate(sprint.startDate) })} · ${
                    language === 'id' ? `${Math.max(0, daysToStart)} hari lagi` : `${Math.max(0, daysToStart)} days`
                  }`
                : sprint?.status === 'completed'
                  ? t('Sprint completed')
                  : t('Create a sprint to begin')}
          </p>
        </div>
        {sprint && <PaceBadge pace={metrics.pace} compact />}
      </div>

      <div className="mt-3">
        <div className="flex gap-[3px]">
          {Array.from({ length: metrics.totalDays }, (_, index) => {
            const day = index + 1
            const isPast = day <= passedDays
            const isToday = sprint?.status === 'active' && day === metrics.currentDay
            return (
              <span
                key={day}
                className="h-[5px] flex-1 rounded-full transition-colors"
                style={{
                  backgroundColor: isToday
                    ? project.color
                    : isPast
                      ? `${project.color}52`
                      : 'var(--line)',
                  boxShadow: isToday ? `0 0 0 2px ${project.color}1c` : undefined,
                }}
                title={`Day ${day}`}
              />
            )
          })}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[9px] text-subtle">
          <span>{language === 'id' ? `Hari 1 · ${formatShortDate(sprint?.startDate ?? todayKey())}` : `Day 1 · ${formatShortDate(sprint?.startDate ?? todayKey())}`}</span>
          <span>{language === 'id' ? `Hari ${metrics.totalDays}` : `Day ${metrics.totalDays}`} · {formatShortDate(sprint?.endDate ?? todayKey())}</span>
        </div>
      </div>

      {flow.completedSteps < 4 && (
        <button
          type="button"
          onClick={() => openProjectWorkspace(project.id)}
          className="mt-2 flex w-full items-center gap-2 rounded-lg border border-[#e8e4ff] bg-[#faf8ff] px-2.5 py-2 text-left transition-colors hover:border-[#d8d2ff] hover:bg-[#f7f5ff]"
        >
          <span className="flex items-center gap-1">
            {['Proposal', 'Agreement', 'Payment', 'Start'].map((step, index) => (
              <span
                key={step}
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-semibold',
                  index < flow.completedSteps
                    ? 'bg-[#ecfdf5] text-[#047857]'
                    : 'border border-line bg-white text-subtle',
                )}
                title={step}
              >
                {index < flow.completedSteps ? '✓' : index + 1}
              </span>
            ))}
          </span>
          <span className="min-w-0 flex-1 truncate text-[9.5px] font-medium text-[#5b21b6]">
            {t('Delivery flow')} · {flow.completedSteps}/4 {t('complete')}
          </span>
          <span className="shrink-0 text-[9px] font-medium text-[#6d28d9]">{t('Continue setup')}</span>
          <ArrowRight size={10} className="shrink-0 text-[#6d28d9]" />
        </button>
      )}

      <div className="mt-3.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-medium text-muted">{t('Task completion')}</span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-semibold tracking-[-0.02em] text-ink">{metrics.completionPct}%</span>
            <span className="text-[9px] text-subtle">
              {metrics.done}/{metrics.total} {t('tasks')}
            </span>
          </span>
        </div>
        <ProgressBar
          value={metrics.completionPct}
          color={project.status === 'At Risk' ? '#D97706' : project.color}
          height={6}
          className="mt-1.5"
        />
        <div className="mt-1.5 flex items-center justify-between text-[9.5px] text-subtle">
          <span>
            {metrics.pointsDone}/{metrics.pointsTotal} {t('story points')}
          </span>
          <span className="flex items-center gap-1">
            {metrics.blocked > 0 ? (
              <span className="inline-flex items-center gap-1 font-medium text-[#be123c]">
                <Lock size={9} /> {metrics.blocked} {language === 'id' ? 'hambatan' : `blocker${metrics.blocked === 1 ? '' : 's'}`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[#047857]">
                <ShieldCheck size={9} /> {t('No blockers')}
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-line/80 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <AvatarStack memberIds={team} members={data.members} max={4} size={24} />
          <span className="hidden text-[9px] text-subtle sm:inline">{t('team')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {sprintTasks.some((task) => task.blocked && task.status !== 'done') && (
            <button
              type="button"
              onClick={() => {
                const blocked = sprintTasks.find((task) => task.blocked && task.status !== 'done')
                if (blocked) openTask(blocked.id)
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-[#fff1f2] text-[#be123c] transition-colors hover:bg-[#ffe4e6]"
              title="View blocker"
            >
              <TriangleAlert size={10} />
            </button>
          )}
          <button
            type="button"
            onClick={() => openProject('/board')}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-muted transition-colors hover:bg-[#f4f4f5] hover:text-ink"
          >
            {t('Open board')} <ArrowRight size={10} />
          </button>
        </div>
      </div>
    </article>
  )
}

export function Overview() {
  const { data, projectFilter, setProjectFilter, setSprintFilter } = useWorkspace()
  const { openTask, openNewProject, openNewSprint, openEditProject, openNewTask } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const { t, language } = useI18n()
  const { user } = useSession()

  const scopedProjects = getScopedProjects(data, projectFilter)
  const scopedSprints = useMemo(
    () =>
      projectFilter === 'all'
        ? data.sprints
        : data.sprints.filter((sprint) => sprint.projectId === projectFilter),
    [data.sprints, projectFilter],
  )
  const activeSprints = useMemo(() => {
    if (projectFilter === 'all') return getActiveSprints(data.projects, data.sprints)
    return scopedSprints.filter((sprint) => sprint.status === 'active')
  }, [data.projects, data.sprints, projectFilter, scopedSprints])
  const activeSprintIds = useMemo(() => new Set(activeSprints.map((sprint) => sprint.id)), [activeSprints])
  const activeTasks = useMemo(
    () => data.tasks.filter((task) => activeSprintIds.has(task.sprintId)),
    [data.tasks, activeSprintIds],
  )
  const dueToday = activeTasks.filter((task) => task.status !== 'done' && task.dueDate === todayKey())
  const overdue = activeTasks.filter((task) => task.status !== 'done' && task.dueDate < todayKey())
  const blocked = activeTasks.filter((task) => task.status !== 'done' && task.blocked)
  const velocity = getSprintVelocity(scopedSprints, data.tasks)
  const completedSprints = scopedSprints
    .filter((sprint) => sprint.status === 'completed')
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
  const velocityHistory = completedSprints.slice(-5).map((sprint) =>
    data.tasks
      .filter((task) => task.sprintId === sprint.id && task.status === 'done')
      .reduce((sum, task) => sum + task.storyPoints, 0),
  )
  const nextHandover = [...activeSprints].sort((a, b) => a.endDate.localeCompare(b.endDate))[0]
  const nextHandoverProject = data.projects.find((project) => project.id === nextHandover?.projectId)
  const projectsWithSprint = scopedProjects.filter((project) => project.status !== 'Complete')
  const activeProjects = scopedProjects.filter(
    (project) => project.status === 'Active' || project.status === 'At Risk',
  )
  const planningCount = scopedSprints.filter((sprint) => sprint.status === 'planning').length
  const dashboardSprints = scopedProjects
    .map((project) => getProjectCurrentSprint(project.id, data.sprints))
    .filter((sprint): sprint is NonNullable<typeof sprint> => Boolean(sprint))
  const dashboardSprintIds = new Set(dashboardSprints.map((sprint) => sprint.id))
  const dashboardTasks = data.tasks.filter((task) => dashboardSprintIds.has(task.sprintId))
  const greeting =
    new Date().getHours() < 12 ? t('Good morning') : new Date().getHours() < 18 ? t('Good afternoon') : t('Good evening')
  const dateLabel = new Date().toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const attention = [...activeTasks]
    .filter((task) => task.status !== 'done' && (task.blocked || task.dueDate <= todayKey()))
    .sort((a, b) => {
      if (a.blocked !== b.blocked) return a.blocked ? -1 : 1
      return a.dueDate.localeCompare(b.dueDate)
    })
    .slice(0, 5)

  const handovers = [...activeSprints]
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
    .slice(0, 5)

  function openProjectBoard(projectId: string) {
    setProjectFilter(projectId)
    setSprintFilter('active')
    navigate('/board')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow">{dateLabel}</span>
            <span className="h-3 w-px bg-line-strong" />
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#5b21b6]">
              <Sparkles size={10} /> {t('14-day delivery cadence')}
            </span>
          </div>
          <h1 className="mt-2 text-[27px] font-semibold leading-[1.15] tracking-[-0.035em] text-ink sm:text-[30px]">
            {greeting}, {user?.name?.split(' ')[0] ?? 'Alex'}<span className="font-serif italic text-[#6E56F0]">.</span>
          </h1>
          <p className="mt-1.5 max-w-[660px] text-[12px] leading-relaxed text-muted">
            {projectFilter === 'all'
              ? language === 'id'
                ? `${activeProjects.length} proyek aktif · ${activeSprints.length} sprint live${
                    planningCount > 0 ? ` · ${planningCount} dalam perencanaan` : ''
                  }${
                    nextHandover && nextHandoverProject
                      ? `. ${nextHandoverProject.name} handover dalam ${Math.max(0, daysBetween(todayKey(), nextHandover.endDate))} hari.`
                      : '.'
                  }`
                : `${activeProjects.length} active project${activeProjects.length === 1 ? '' : 's'} · ${activeSprints.length} live sprint${activeSprints.length === 1 ? '' : 's'}${
                    planningCount > 0 ? ` · ${planningCount} in planning` : ''
                  }${
                    nextHandover && nextHandoverProject
                      ? `. ${nextHandoverProject.name} hands over in ${Math.max(0, daysBetween(todayKey(), nextHandover.endDate))} days.`
                      : '.'
                  }`
              : `${scopedProjects[0]?.name ?? 'Project'} · ${scopedProjects[0]?.client ?? ''}. ${
                  language === 'id' ? 'Jaga ritme jendela 14 hari.' : 'Keep the 14-day window moving.'
                }`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-[10px] border border-line bg-white px-2.5 py-2 text-[10.5px] text-muted shadow-card lg:flex">
            <CalendarRange size={12} className="text-subtle" />
            <span className="font-medium text-ink">{t('2-week sprints')}</span>
            <span className="text-subtle">·</span>
            <span>{t('Day 1–14')}</span>
          </div>
          <button type="button" className="btn btn-secondary" onClick={openNewProject}>
            <Plus size={13} /> {t('New project')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setProjectFilter('all')
              setSprintFilter('active')
              navigate('/board')
            }}
          >
            {t('Open board')} <ArrowUpRight size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#f4f1ff] text-[#6d28d9]">
                <FolderKanban size={12} />
              </span>
              {t('Active projects')}
            </span>
            <span className="text-[9px] font-medium text-[#047857]">
              {t('{count} live sprints', { count: activeSprints.length })}
            </span>
          </div>
          <div className="mt-2.5 flex items-end gap-2">
            <span className="text-[27px] font-semibold leading-none tracking-[-0.045em] text-ink">
              {activeProjects.length}
            </span>
            <span className="pb-0.5 text-[10px] text-subtle">
              {language === 'id' ? 'dari' : 'of'} {scopedProjects.length} {t('Projects').toLowerCase()}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-1">
              {activeProjects.slice(0, 4).map((project) => (
                <ProjectDot key={project.id} color={project.color} size={7} />
              ))}
            </div>
            <span className="text-[9.5px] text-subtle">
              {nextHandover
                ? `${t('Next handover')} ${formatShortDate(nextHandover.endDate)}`
                : t('No active handover')}
            </span>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#eff6ff] text-[#1d4ed8]">
                <Clock3 size={12} />
              </span>
              {t('Due today')}
            </span>
            {dueToday.some((task) => task.priority === 'Urgent') && (
              <span className="text-[9px] font-medium text-[#b45309]">
                {dueToday.filter((task) => task.priority === 'Urgent').length} {t('Urgent').toLowerCase()}
              </span>
            )}
          </div>
          <div className="mt-2.5 flex items-end gap-2">
            <span className="text-[27px] font-semibold leading-none tracking-[-0.045em] text-ink">{dueToday.length}</span>
            <span className="pb-0.5 text-[10px] text-subtle">{t('deliverables')}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-1">
              {dueToday
                .filter((task) => task.assigneeId)
                .slice(0, 3)
                .map((task) => {
                  const member = data.members.find((item) => item.id === task.assigneeId)
                  return member ? (
                    <span
                      key={task.id}
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-white text-[7px] font-semibold text-white"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.initials}
                    </span>
                  ) : null
                })}
            </div>
            <span className="text-[9.5px] text-subtle">
              {dueToday.length === 0 ? t('All clear') : t('View board')}
            </span>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#fff1f2] text-[#be123c]">
                <TriangleAlert size={12} />
              </span>
              {t('Overdue')}
            </span>
            {blocked.length > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-medium text-[#be123c]">
                <Lock size={8} /> {blocked.length} {t('Blocked').toLowerCase()}
              </span>
            )}
          </div>
          <div className="mt-2.5 flex items-end gap-2">
            <span className={cn('text-[27px] font-semibold leading-none tracking-[-0.045em]', overdue.length > 0 ? 'text-[#be123c]' : 'text-ink')}>
              {overdue.length}
            </span>
            <span className="pb-0.5 text-[10px] text-subtle">{t('Overdue').toLowerCase()}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {overdue.length > 0 ? (
              <button
                type="button"
                onClick={() => openTask(overdue[0].id)}
                className="truncate text-left text-[9.5px] text-[#be123c] hover:underline"
              >
                {overdue[0].key} · {overdue[0].title}
              </button>
            ) : (
              <span className="text-[9.5px] text-[#047857]">{t('All clear')}</span>
            )}
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ecfdf5] text-[#047857]">
                <TrendingUp size={12} />
              </span>
              {t('Sprint velocity')}
            </span>
            <span className="text-[9px] font-medium text-subtle">{t('avg pts / sprint')}</span>
          </div>
          <div className="mt-2.5 flex items-end gap-2">
            <span className="text-[27px] font-semibold leading-none tracking-[-0.045em] text-ink">{velocity}</span>
            <span className="pb-0.5 text-[10px] text-subtle">{t('story points')}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Sparkline values={velocityHistory} />
            </div>
            <span className="shrink-0 text-[9px] text-subtle">
              {completedSprints.length} {t('Sprints').toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-ink">{t('Active projects')}</h2>
              <span className="rounded-full bg-[#f1f2f4] px-1.5 py-0.5 font-mono text-[9px] text-muted">
                {projectsWithSprint.length}
              </span>
            </div>
            <p className="mt-0.5 text-[10.5px] text-subtle">
              {t('Live delivery health across every 2-week sprint.')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {projectFilter !== 'all' && (
              <button type="button" onClick={() => setProjectFilter('all')} className="text-[10.5px] font-medium text-muted hover:text-ink">
                {t('Show all projects')}
              </button>
            )}
            <button type="button" className="btn btn-secondary !py-1.5 !text-[11px]" onClick={() => openNewSprint()}>
              <CalendarRange size={11} /> {t('Start sprint')}
            </button>
          </div>
        </div>

        {projectsWithSprint.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={18} />}
            title={t('No tasks in this sprint view')}
            description={t('Create a deliverable or switch to another sprint to see its board.')}
            action={
              <button type="button" className="btn btn-primary" onClick={openNewProject}>
                <Plus size={13} /> {t('New project')}
              </button>
            }
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {projectsWithSprint.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={() => openEditProject(project)}
                onSprint={() => openNewSprint(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[1.45fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-semibold text-ink">{t('Needs attention')}</h2>
                {attention.length > 0 && (
                  <span className="rounded-full bg-[#fff1f2] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[#be123c]">
                    {attention.length}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-subtle">
                {t('Blocked, overdue or due today across live sprints.')}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost !px-2 !py-1.5 !text-[10.5px]"
              onClick={() => {
                setProjectFilter('all')
                setSprintFilter('active')
                navigate('/board')
              }}
            >
              {t('View board')} <ArrowRight size={11} />
            </button>
          </div>
          {attention.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#ecfdf5] text-[#047857]">
                <CheckCircle2 size={16} />
              </span>
              <p className="text-[12px] font-medium text-ink">{t('Every sprint is clear')}</p>
              <p className="mt-1 text-[10.5px] text-subtle">{t('No blockers, overdue work or due-today items.')}</p>
            </div>
          ) : (
            <div className="divide-y divide-line/80">
              {attention.map((task) => {
                const project = data.projects.find((item) => item.id === task.projectId)
                const assignee = data.members.find((member) => member.id === task.assigneeId)
                const isOverdue = task.dueDate < todayKey()
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => openTask(task.id)}
                    className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#fcfcfd]"
                  >
                    <ProjectDot color={project?.color ?? '#111827'} size={7} />
                    <span className="w-[62px] shrink-0 font-mono text-[9px] text-subtle">{task.key}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-medium text-ink group-hover:text-[#5b21b6]">
                        {task.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[9.5px] text-subtle">
                        {project?.code}
                        {task.blocked && (
                          <span className="inline-flex items-center gap-0.5 text-[#be123c]">
                            <Lock size={8} /> {task.blockedReason || 'Blocked'}
                          </span>
                        )}
                        {!task.blocked && isOverdue && (
                          <span className="text-[#b45309]">
                            {Math.abs(daysBetween(todayKey(), task.dueDate))}
                            {language === 'id' ? 'hr' : 'd'} {t('Overdue').toLowerCase()}
                          </span>
                        )}
                        {!task.blocked && !isOverdue && <span className="text-[#b45309]">{t('Due today')}</span>}
                      </span>
                    </span>
                    {assignee && (
                      <span
                        className="hidden h-5 w-5 shrink-0 items-center justify-center rounded-full text-[7.5px] font-semibold text-white sm:flex"
                        style={{ backgroundColor: assignee.color }}
                      >
                        {assignee.initials}
                      </span>
                    )}
                    <ChevronDown size={11} className="shrink-0 -rotate-90 text-[#d1d5db] transition-transform group-hover:translate-x-0.5 group-hover:text-muted" />
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <div className="space-y-3">
          <DashboardCalendar
            tasks={dashboardTasks}
            sprints={dashboardSprints}
            projects={scopedProjects}
          />

          <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="text-[13px] font-semibold text-ink">{t('Upcoming handovers')}</h2>
              <p className="mt-0.5 text-[10px] text-subtle">{t('Sprint closes and demos on the calendar.')}</p>
            </div>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-[#f4f4f5]"
              onClick={() => navigate('/calendar')}
              aria-label="Open calendar"
            >
              <CalendarRange size={13} />
            </button>
          </div>
          <div className="divide-y divide-line/80">
            {handovers.length === 0 ? (
              <p className="px-4 py-8 text-center text-[11px] text-subtle">{t('No active sprint handovers.')}</p>
            ) : (
              handovers.map((sprint) => {
                const project = data.projects.find((item) => item.id === sprint.projectId)
                const metrics = getSprintMetrics(sprint, data.tasks)
                const days = Math.max(0, daysBetween(todayKey(), sprint.endDate))
                return (
                  <button
                    key={sprint.id}
                    type="button"
                    onClick={() => openProjectBoard(sprint.projectId)}
                    className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fcfcfd]"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-[#fcfcfd]"
                      style={{ borderLeft: `3px solid ${project?.color ?? '#111827'}` }}
                    >
                      <span className="font-mono text-[8px] uppercase leading-none text-subtle">
                        {new Date(`${sprint.endDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="mt-0.5 text-[14px] font-semibold leading-none text-ink">
                        {new Date(`${sprint.endDate}T12:00:00`).getDate()}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[11px] font-medium text-ink">{project?.name}</span>
                        <span className="text-[9px] text-subtle">{sprint.name}</span>
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f0f1f3]">
                          <span
                            className="block h-full rounded-full transition-[width]"
                            style={{ width: `${metrics.completionPct}%`, backgroundColor: project?.color }}
                          />
                        </span>
                        <span className="w-8 shrink-0 text-right font-mono text-[8.5px] text-subtle">
                          {metrics.completionPct}%
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-[10px] font-medium text-ink">{days}d</span>
                      <span className="block text-[8.5px] text-subtle">{t('to demo')}</span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setProjectFilter('all')
              setSprintFilter('active')
              navigate('/calendar')
            }}
            className="flex w-full items-center justify-center gap-1.5 border-t border-line py-2.5 text-[10px] font-medium text-muted transition-colors hover:bg-[#fcfcfd] hover:text-ink"
          >
            {t('Open sprint calendar')} <ArrowUpRight size={10} />
          </button>
        </section>
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-2 border-t border-line pt-4 text-[9.5px] text-subtle sm:flex-row sm:items-center">
        <span className="flex items-center gap-1.5">
          <Sparkles size={10} className="text-[#8b7bff]" /> Anatera Sprint OS · {t('built for 14-day delivery')}
        </span>
        <span className="font-mono">Day 1 → Day 14 · every sprint, one source of truth</span>
      </div>
    </div>
  )
}
