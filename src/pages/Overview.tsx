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
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'
import type { AppOutletContext } from '../App'
import { useWorkspace } from '../store/WorkspaceStore'
import { TASK_STATUSES, type Project, type TaskStatus } from '../types'
import {
  AvatarStack,
  DropdownItem,
  EmptyState,
  PaceBadge,
  Popover,
  ProjectDot,
  ProjectStatusBadge,
} from '../components/ui'
import { BarRow, Donut, Kpi, MiniBars, Ring, StackedBar, type Segment } from '../components/charts'
import {
  getActiveSprints,
  getProjectCurrentSprint,
  getProjectTeam,
  getSprintMetrics,
  getSprintVelocity,
} from '../lib/progress'
import { daysBetween, todayKey } from '../lib/date'
import { getScopedProjects } from '../lib/scope'
import { workflowProgress } from '../lib/normalizeWorkspace'
import { DashboardCalendar } from '../components/DashboardCalendar'
import { cn } from '../lib/utils'
import { useI18n } from '../i18n/I18nProvider'
import { useSession } from '../auth/SessionProvider'

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: '#9CA3AF',
  todo: '#60A5FA',
  in_progress: '#6E56F0',
  in_review: '#F59E0B',
  done: '#10B981',
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
  const passedDays = sprint?.status === 'active' ? metrics.currentDay : sprint?.status === 'completed' ? 14 : 0
  const blockedTask = sprintTasks.find((task) => task.blocked && task.status !== 'done')
  const dayWord = language === 'id' ? 'Hari' : 'Day'
  // One badge is enough when status and pace say the same thing (or status is just "Active").
  const showStatusBadge =
    !sprint || (project.status !== 'Active' && !(project.status === 'At Risk' && metrics.pace === 'At Risk'))

  const statusSegments: Segment[] = TASK_STATUSES.map((s) => ({
    label: t(s.shortLabel),
    value: sprintTasks.filter((task) => task.status === s.id).length,
    color: STATUS_COLORS[s.id],
  }))

  function openProject(route: string) {
    setProjectFilter(project.id)
    setSprintFilter(sprint?.id ?? 'active')
    navigate(route)
  }

  return (
    <article className="card card-hover group flex flex-col gap-4 p-4">
      {/* Title row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => openProjectWorkspace(project.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] font-mono text-[10px] font-semibold text-white shadow-sm"
          style={{ background: `linear-gradient(140deg, ${project.color}, ${project.color}d9)` }}
          aria-label={`Open ${project.name} project workspace`}
        >
          {project.code}
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => openProjectWorkspace(project.id)}
            className="block max-w-full truncate text-left text-[13.5px] font-semibold tracking-[-0.01em] text-ink hover:underline hover:underline-offset-2"
            title={`${project.client} · ${project.clientContact.name} · ${t('Lead')} ${lead?.name ?? t('Unassigned')}`}
          >
            {project.name}
          </button>
          <div className="mt-1 flex items-center gap-1.5">
            {showStatusBadge && <ProjectStatusBadge status={project.status} />}
            {sprint && <PaceBadge pace={metrics.pace} compact />}
          </div>
        </div>
        <Popover
          ariaLabel={`${project.name} actions`}
          align="right"
          panelClassName="w-[214px]"
          trigger={
            <span className="icon-btn -mr-1 h-8 w-8">
              <MoreHorizontal size={16} />
            </span>
          }
        >
          {(close) => (
            <>
              <DropdownItem icon={<FolderKanban size={13} />} onClick={() => { close(); openProjectWorkspace(project.id) }}>
                {t('Project workspace')}
              </DropdownItem>
              <DropdownItem icon={<Pencil size={13} />} onClick={() => { close(); onEdit() }}>
                {t('Edit project')}
              </DropdownItem>
              <DropdownItem icon={<CalendarRange size={13} />} onClick={() => { close(); onSprint() }}>
                {t('Start next sprint')}
              </DropdownItem>
              <DropdownItem icon={<ArrowUpRight size={13} />} onClick={() => { close(); openProject('/calendar') }}>
                {t('Sprint calendar')}
              </DropdownItem>
            </>
          )}
        </Popover>
      </div>

      {/* Ring + 14-day strip + status bar */}
      <div className="flex items-center gap-4">
        <Ring
          value={metrics.completionPct}
          size={64}
          thickness={5}
          color={project.status === 'At Risk' ? '#D97706' : project.color}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="flex gap-[3px]">
              {Array.from({ length: metrics.totalDays }, (_, index) => {
                const day = index + 1
                const isPast = day <= passedDays
                const isToday = sprint?.status === 'active' && day === metrics.currentDay
                return (
                  <span
                    key={day}
                    className="h-[6px] flex-1 rounded-full"
                    style={{
                      backgroundColor: isToday ? project.color : isPast ? `${project.color}59` : 'var(--line)',
                      boxShadow: isToday ? `0 0 0 2px ${project.color}2a` : undefined,
                    }}
                    title={`${dayWord} ${day}`}
                  />
                )
              })}
            </div>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[9.5px] text-subtle">
              <span>
                {sprint?.status === 'active' ? `${dayWord} ${Math.max(1, metrics.currentDay)}/${metrics.totalDays}` : sprint?.name ?? '—'}
              </span>
              {sprint?.status === 'active' && <span>{metrics.daysRemaining}d</span>}
            </div>
          </div>
          <StackedBar segments={statusSegments} height={7} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-line/80 pt-3">
        <AvatarStack memberIds={team} members={data.members} max={4} size={24} />
        <div className="flex items-center gap-2">
          {flow.completedSteps < 4 && (
            <button
              type="button"
              onClick={() => openProjectWorkspace(project.id)}
              className="flex items-center gap-1 rounded-full px-1.5 py-1 hover:bg-[var(--faint)]"
              title={`${t('Delivery flow')} · ${flow.completedSteps}/4 ${t('complete')}`}
            >
              {[0, 1, 2, 3].map((index) => (
                <span
                  key={index}
                  className="h-[7px] w-[7px] rounded-full"
                  style={{ backgroundColor: index < flow.completedSteps ? '#10B981' : 'var(--line-strong)' }}
                />
              ))}
            </button>
          )}
          {metrics.blocked > 0 ? (
            <button
              type="button"
              onClick={() => blockedTask && openTask(blockedTask.id)}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--danger-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--danger)]"
              title={t('View blocker')}
            >
              <Lock size={10} /> {metrics.blocked}
            </button>
          ) : (
            <span className="inline-flex items-center rounded-full bg-[var(--success-soft)] px-2 py-1 text-[var(--success)]" title={t('No blockers')}>
              <ShieldCheck size={11} />
            </span>
          )}
          <button
            type="button"
            onClick={() => openProject('/board')}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-[var(--faint)] hover:text-ink"
            aria-label={t('Open board')}
            title={t('Open board')}
          >
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </article>
  )
}

export function Overview() {
  const { data, projectFilter, setProjectFilter, setSprintFilter } = useWorkspace()
  const { openTask, openNewProject, openNewSprint, openEditProject } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const { t, language } = useI18n()
  const { user } = useSession()

  const scopedProjects = getScopedProjects(data, projectFilter)
  const scopedSprints = useMemo(
    () => (projectFilter === 'all' ? data.sprints : data.sprints.filter((sprint) => sprint.projectId === projectFilter)),
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
  const projectsWithSprint = scopedProjects.filter((project) => project.status !== 'Complete')
  const dashboardSprints = scopedProjects
    .map((project) => getProjectCurrentSprint(project.id, data.sprints))
    .filter((sprint): sprint is NonNullable<typeof sprint> => Boolean(sprint))
  const dashboardSprintIds = new Set(dashboardSprints.map((sprint) => sprint.id))
  const dashboardTasks = data.tasks.filter((task) => dashboardSprintIds.has(task.sprintId))

  // ---- Chart data -------------------------------------------------
  const statusSegments: Segment[] = TASK_STATUSES.map((s) => ({
    label: t(s.shortLabel),
    value: dashboardTasks.filter((task) => task.status === s.id).length,
    color: STATUS_COLORS[s.id],
  }))
  const totalTasks = dashboardTasks.length
  const doneTasks = dashboardTasks.filter((task) => task.status === 'done').length
  const overallPct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100)

  const projectProgress = projectsWithSprint.slice(0, 6).map((project) => {
    const sprint = getProjectCurrentSprint(project.id, data.sprints)
    return { project, pct: getSprintMetrics(sprint, data.tasks).completionPct }
  })

  const workload = useMemo(() => {
    const points = new Map<string, number>()
    dashboardTasks
      .filter((task) => task.status !== 'done')
      .forEach((task) => {
        const key = task.assigneeId ?? 'none'
        points.set(key, (points.get(key) ?? 0) + task.storyPoints)
      })
    return [...points.entries()]
      .map(([id, pts]) => ({ id, pts, member: data.members.find((member) => member.id === id) }))
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 5)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.tasks, data.members, dashboardSprints.length, projectFilter])
  const workloadMax = Math.max(1, ...workload.map((row) => row.pts))

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

  const handovers = [...activeSprints].sort((a, b) => a.endDate.localeCompare(b.endDate)).slice(0, 5)

  function openProjectBoard(projectId: string) {
    setProjectFilter(projectId)
    setSprintFilter('active')
    navigate('/board')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">{dateLabel}</span>
          <h1 className="mt-1.5 text-[27px] font-semibold leading-[1.15] tracking-[-0.035em] text-ink sm:text-[30px]">
            {greeting}, {user?.name?.split(' ')[0] ?? 'Alex'}
            <span className="font-serif italic text-[#6E56F0]">.</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          icon={<CheckCircle2 size={12} />}
          tint="#10B981"
          label={t('Done')}
          value={
            <>
              {doneTasks}
              <span className="text-[14px] font-medium text-subtle">/{totalTasks}</span>
            </>
          }
          visual={<Ring value={overallPct} size={60} thickness={5} color="#10B981" />}
        />
        <Kpi icon={<Clock3 size={12} />} tint="#3B82F6" label={t('Due today')} value={dueToday.length} />
        <Kpi
          icon={<TriangleAlert size={12} />}
          tint="#E11D48"
          label={t('Overdue')}
          value={overdue.length}
          valueClass={overdue.length > 0 ? 'text-[#be123c]' : undefined}
          visual={
            blocked.length > 0 ? (
              <span className="ml-auto flex w-fit items-center gap-1 rounded-full bg-[var(--danger-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--danger)]">
                <Lock size={11} /> {blocked.length}
              </span>
            ) : undefined
          }
        />
        <Kpi
          icon={<TrendingUp size={12} />}
          tint="#6E56F0"
          label={t('Velocity')}
          value={velocity}
          visual={<MiniBars values={velocityHistory} color="#6E56F0" height={38} />}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-3 lg:grid-cols-3">
        <section className="card p-4">
          <h2 className="text-[12px] font-semibold text-ink">{t('Status')}</h2>
          <div className="mt-3 flex items-center gap-4">
            <Donut
              segments={statusSegments}
              size={116}
              center={
                <>
                  <span className="text-[22px] font-semibold leading-none tracking-[-0.04em] text-ink">{overallPct}%</span>
                </>
              }
            />
            <ul className="min-w-0 flex-1 space-y-1.5">
              {statusSegments.map((segment) => (
                <li key={segment.label} className="flex items-center gap-2 text-[10.5px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="flex-1 truncate text-muted">{segment.label}</span>
                  <span className="font-mono font-medium text-ink">{segment.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="text-[12px] font-semibold text-ink">{t('Projects')}</h2>
          <div className="mt-4 space-y-3">
            {projectProgress.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-subtle">—</p>
            ) : (
              projectProgress.map(({ project, pct }) => (
                <BarRow
                  key={project.id}
                  left={
                    <>
                      <ProjectDot color={project.color} size={7} />
                      <span className="truncate font-mono text-[10px]">{project.code}</span>
                    </>
                  }
                  value={pct}
                  max={100}
                  color={project.status === 'At Risk' ? '#D97706' : project.color}
                  display={`${pct}%`}
                  onClick={() => openProjectBoard(project.id)}
                />
              ))
            )}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="text-[12px] font-semibold text-ink">{t('Workload')}</h2>
          <div className="mt-4 space-y-3">
            {workload.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-subtle">—</p>
            ) : (
              workload.map((row) => (
                <BarRow
                  key={row.id}
                  left={
                    <>
                      <span
                        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[7.5px] font-semibold text-white"
                        style={{ backgroundColor: row.member?.color ?? '#9CA3AF' }}
                      >
                        {row.member?.initials ?? '?'}
                      </span>
                      <span className="truncate">{row.member?.name.split(' ')[0] ?? t('Unassigned')}</span>
                    </>
                  }
                  value={row.pts}
                  max={workloadMax}
                  color={row.member?.color ?? '#9CA3AF'}
                  display={`${row.pts}pt`}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* Project cards */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-ink">{t('Active projects')}</h2>
            <span className="rounded-full bg-[var(--faint)] px-1.5 py-0.5 font-mono text-[9px] text-muted">
              {projectsWithSprint.length}
            </span>
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
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
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

      {/* Attention + calendar + handovers */}
      <div className="grid items-start gap-3 xl:grid-cols-[1.45fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-semibold text-ink">{t('Needs attention')}</h2>
              {attention.length > 0 && (
                <span className="rounded-full bg-[var(--danger-soft)] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[var(--danger)]">
                  {attention.length}
                </span>
              )}
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
              <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
                <CheckCircle2 size={16} />
              </span>
              <p className="text-[12px] font-medium text-ink">{t('Every sprint is clear')}</p>
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
                    className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--faint)]"
                  >
                    <ProjectDot color={project?.color ?? '#111827'} size={7} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-medium text-ink">{task.title}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] text-subtle">{task.key}</span>
                    </span>
                    {task.blocked ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--danger-soft)] px-2 py-0.5 text-[9.5px] font-semibold text-[var(--danger)]">
                        <Lock size={9} />
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 font-mono text-[9.5px] font-semibold text-[var(--warning)]">
                        {isOverdue ? `${Math.abs(daysBetween(todayKey(), task.dueDate))}${language === 'id' ? 'hr' : 'd'}` : t('Due today')}
                      </span>
                    )}
                    {assignee && (
                      <span
                        className="hidden h-5 w-5 shrink-0 items-center justify-center rounded-full text-[7.5px] font-semibold text-white sm:flex"
                        style={{ backgroundColor: assignee.color }}
                      >
                        {assignee.initials}
                      </span>
                    )}
                    <ChevronDown size={11} className="shrink-0 -rotate-90 text-subtle transition-transform group-hover:translate-x-0.5" />
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <div className="space-y-3">
          <DashboardCalendar tasks={dashboardTasks} sprints={dashboardSprints} projects={scopedProjects} />

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-[13px] font-semibold text-ink">{t('Upcoming handovers')}</h2>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-[var(--faint)]"
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
                      className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--faint)]"
                    >
                      <Ring value={metrics.completionPct} size={38} thickness={5} color={project?.color ?? '#6E56F0'} label={<span className="font-mono text-[8.5px] font-semibold text-ink">{metrics.completionPct}</span>} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] font-medium text-ink">{project?.name}</span>
                        <span className="block text-[9.5px] text-subtle">{sprint.name}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-[var(--faint)] px-2 py-1 font-mono text-[10px] font-semibold text-ink">
                        {days}d
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
