import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Archive as ArchiveIcon,
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Gauge,
  PackageCheck,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import type { AppOutletContext } from '../App'
import { useWorkspace } from '../store/WorkspaceStore'
import type { Project, Sprint, Task, TeamMember } from '../types'
import {
  AvatarStack,
  EmptyState,
  ProgressBar,
  ProjectDot,
} from '../components/ui'
import { getProjectTeam, getProjectSprints } from '../lib/progress'
import { daysBetween, formatMonthYear, formatRange, formatShortDate } from '../lib/date'
import { cn } from '../lib/utils'
import { useI18n } from '../i18n/I18nProvider'

function ArchiveSprintCard({
  sprint,
  project,
  tasks,
  members,
  onOpenBoard,
  onNextSprint,
}: {
  sprint: Sprint
  project: Project
  tasks: Task[]
  members: TeamMember[]
  onOpenBoard: () => void
  onNextSprint: () => void
}) {
  const sprintTasks = tasks.filter((task) => task.sprintId === sprint.id)
  const points = sprintTasks.reduce((sum, task) => sum + task.storyPoints, 0)
  const team = getProjectTeam(project.id, sprintTasks, project.leadId)
  const start = new Date(`${sprint.startDate}T12:00:00`)
  const { t } = useI18n()

  return (
    <article className="group flex flex-col rounded-xl border border-line bg-white p-4 transition-all duration-200 hover:border-[#d9dbe2] hover:shadow-[0_8px_24px_-14px_rgba(17,24,39,0.18)]">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-[#fcfcfd]"
          style={{ borderLeft: `3px solid ${project.color}` }}
        >
          <span className="font-mono text-[7px] uppercase leading-none text-subtle">
            {formatMonthYear(start).split(' ')[0]}
          </span>
          <span className="mt-0.5 text-[13px] font-semibold leading-none text-ink">
            {String(sprint.number).padStart(2, '0')}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[8.5px] text-subtle">{sprint.name}</span>
            <span className="badge bg-[#ecfdf5] text-[#047857]">
              <CheckCircle2 size={9} /> {t('Complete')}
            </span>
          </div>
          <h3 className="mt-1 line-clamp-2 text-[12.5px] font-semibold leading-[1.45] text-ink">
            {sprint.goal || t('Sprint delivered')}
          </h3>
          <p className="mt-1 text-[9px] text-subtle">
            {formatRange(sprint.startDate, sprint.endDate)} · {daysBetween(sprint.startDate, sprint.endDate) + 1} {t('days')}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-[2px]">
        {Array.from({ length: 14 }, (_, index) => (
          <span
            key={index}
            className="h-[3px] flex-1 rounded-full"
            style={{ backgroundColor: project.color }}
          />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-[#fcfcfd] py-2">
        <div className="px-2.5">
          <p className="font-mono text-[12px] font-semibold leading-none text-ink">{sprintTasks.length}</p>
          <p className="mt-1 text-[8px] uppercase tracking-[0.08em] text-subtle">{t('Tasks')}</p>
        </div>
        <div className="px-2.5">
          <p className="font-mono text-[12px] font-semibold leading-none text-ink">{points}</p>
          <p className="mt-1 text-[8px] uppercase tracking-[0.08em] text-subtle">{t('pts')}</p>
        </div>
        <div className="px-2.5">
          <p className="flex items-center gap-1 font-mono text-[12px] font-semibold leading-none text-[#047857]">
            100<span className="text-[8px]">%</span>
          </p>
          <p className="mt-1 text-[8px] uppercase tracking-[0.08em] text-subtle">{t('Delivered')}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/80 pt-3">
        <div className="flex items-center gap-2">
          <AvatarStack memberIds={team} members={members} max={3} size={22} />
          <span className="text-[8.5px] text-subtle">{formatShortDate(sprint.endDate)} {t('handover')}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onNextSprint}
            className="hidden rounded-md px-1.5 py-1 text-[9px] font-medium text-subtle transition-colors hover:bg-[#f4f4f5] hover:text-ink sm:inline-flex"
          >
            {t('Next sprint')}
          </button>
          <button
            type="button"
            onClick={onOpenBoard}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-medium text-muted transition-colors hover:bg-[#f4f4f5] hover:text-ink"
          >
            {t('Review')} <ArrowUpRight size={10} />
          </button>
        </div>
      </div>
    </article>
  )
}

export function Archive() {
  const { data, projectFilter, setProjectFilter, setSprintFilter } = useWorkspace()
  const { openNewSprint, openNewProject } = useOutletContext<AppOutletContext>()
  const navigate = useNavigate()
  const { t, language } = useI18n()
  const [query, setQuery] = useState('')

  const projectsInScope = data.projects.filter(
    (project) => projectFilter === 'all' || project.id === projectFilter,
  )
  const completedSprints = data.sprints.filter(
    (sprint) => sprint.status === 'completed' && projectsInScope.some((project) => project.id === sprint.projectId),
  )
  const archivedTaskIds = new Set(
    data.tasks.filter((task) => completedSprints.some((sprint) => sprint.id === task.sprintId)).map((task) => task.id),
  )
  const archivedTasks = data.tasks.filter((task) => archivedTaskIds.has(task.id))
  const pointsShipped = archivedTasks.reduce((sum, task) => sum + task.storyPoints, 0)
  const avgVelocity =
    completedSprints.length === 0 ? 0 : Math.round((pointsShipped / completedSprints.length) * 10) / 10
  const projectGroups = projectsInScope
    .map((project) => ({
      project,
      sprints: getProjectSprints(project.id, data.sprints).filter((sprint) => sprint.status === 'completed'),
    }))
    .filter((group) => group.sprints.length > 0)

  const normalizedQuery = query.trim().toLowerCase()
  const filteredGroups = useMemo(
    () =>
      projectGroups
        .map((group) => ({
          ...group,
          sprints: group.sprints.filter((sprint) => {
            if (!normalizedQuery) return true
            return `${group.project.name} ${group.project.client} ${sprint.name} ${sprint.goal}`
              .toLowerCase()
              .includes(normalizedQuery)
          }),
        }))
        .filter((group) => group.sprints.length > 0),
    [projectGroups, normalizedQuery],
  )
  const visibleSprintCount = filteredGroups.reduce((sum, group) => sum + group.sprints.length, 0)

  function openArchivedSprint(sprint: Sprint) {
    setProjectFilter(sprint.projectId)
    setSprintFilter(sprint.id)
    navigate('/board')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow">{t('Delivery history')}</span>
            <span className="h-3 w-px bg-line-strong" />
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted">
              <ArchiveIcon size={10} /> {t('Every 14-day cycle, preserved')}
            </span>
          </div>
          <h1 className="mt-1.5 text-[27px] font-semibold leading-tight tracking-[-0.035em] text-ink">{t('Sprint Archive')}</h1>
          <p className="mt-1 max-w-[620px] text-[11.5px] leading-relaxed text-muted">
            {t('Review completed sprints, delivery outcomes and velocity across the Anatera project portfolio.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-secondary" onClick={openNewProject}>
            <Plus size={13} /> {t('New project')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => openNewSprint(projectFilter !== 'all' ? projectFilter : undefined)}>
            <CalendarRange size={13} /> {t('Start next sprint')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#f4f4f5] text-muted">
                <ArchiveIcon size={12} />
              </span>
              {t('Sprints archived')}
            </span>
            <span className="font-mono text-[8.5px] text-subtle">{projectsInScope.length} {t('Projects').toLowerCase()}</span>
          </div>
          <p className="mt-2.5 text-[27px] font-semibold leading-none tracking-[-0.045em] text-ink">
            {completedSprints.length}
          </p>
          <p className="mt-2.5 text-[9.5px] text-subtle">{t('Completed 14-day windows')}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#eff6ff] text-[#1d4ed8]">
                <PackageCheck size={12} />
              </span>
              {t('Story points shipped')}
            </span>
            <span className="font-mono text-[8.5px] text-subtle">{archivedTasks.length} {t('tasks')}</span>
          </div>
          <p className="mt-2.5 text-[27px] font-semibold leading-none tracking-[-0.045em] text-ink">{pointsShipped}</p>
          <p className="mt-2.5 text-[9.5px] text-subtle">{t('Delivered across the archive')}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ecfdf5] text-[#047857]">
                <Gauge size={12} />
              </span>
              {t('Avg velocity')}
            </span>
            <span className="text-[8.5px] font-medium text-[#047857]">{t('Stable')}</span>
          </div>
          <div className="mt-2.5 flex items-end gap-1.5">
            <p className="text-[27px] font-semibold leading-none tracking-[-0.045em] text-ink">{avgVelocity}</p>
            <span className="pb-0.5 text-[9.5px] text-subtle">{t('pts / sprint')}</span>
          </div>
          <p className="mt-2.5 text-[9.5px] text-subtle">{t('Across completed sprints')}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#f5f3ff] text-[#6d28d9]">
                <CheckCircle2 size={12} />
              </span>
              {t('Delivery completion')}
            </span>
            <span className="font-mono text-[8.5px] text-subtle">{t('All time')}</span>
          </div>
          <p className="mt-2.5 text-[27px] font-semibold leading-none tracking-[-0.045em] text-ink">100%</p>
          <div className="mt-2.5 flex items-center gap-2">
            <ProgressBar value={100} height={3} color="#059669" />
            <span className="shrink-0 text-[8.5px] text-[#047857]">{archivedTasks.length} {t('shipped')}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-line bg-white px-3 py-2.5 shadow-card sm:flex-row sm:items-center">
        <div className="relative flex h-8 flex-1 items-center rounded-lg border border-line bg-[#fafafa] pl-8 pr-7 focus-within:border-[#d8d2ff] focus-within:bg-white">
          <Search size={12} className="pointer-events-none absolute left-2.5 text-subtle" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('Search archived sprints, goals or clients…')}
            className="w-full border-0 bg-transparent py-0 text-[10.5px] text-ink outline-none placeholder:text-subtle"
            aria-label={t('Search archived sprints, goals or clients…')}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2 text-subtle hover:text-ink" aria-label="Clear archive search">
              <X size={11} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 sm:pl-2">
          <span className="font-mono text-[9px] text-subtle">
            {visibleSprintCount} {t('Sprints').toLowerCase()}
          </span>
          <span className="h-3 w-px bg-line" />
          <span className="text-[9px] text-subtle">{formatMonthYear(new Date())} · {t('latest first')}</span>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <EmptyState
          icon={<ArchiveIcon size={18} />}
          title={completedSprints.length === 0 ? t('No completed sprints yet') : t('No archive matches')}
          description={
            completedSprints.length === 0
              ? t('When a sprint closes, its goal, tasks and delivery outcomes will be preserved here.')
              : `${t('No archive matches')} — “${query}”.`
          }
          action={
            completedSprints.length === 0 ? (
              <button type="button" className="btn btn-primary" onClick={() => openNewSprint()}>
                <CalendarRange size={13} /> {t('Start sprint')}
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => setQuery('')}>
                {t('Clear search')}
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(({ project, sprints }) => {
            const groupTasks = data.tasks.filter(
              (task) => sprints.some((sprint) => sprint.id === task.sprintId),
            )
            const groupPoints = groupTasks.reduce((sum, task) => sum + task.storyPoints, 0)
            const lead = data.members.find((member) => member.id === project.leadId)
            return (
              <section key={project.id} className="card overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] font-mono text-[9px] font-semibold text-white"
                    style={{ backgroundColor: project.color }}
                  >
                    {project.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[13px] font-semibold text-ink">{project.name}</h2>
                      <span className="rounded-full border border-line bg-[#fafafa] px-1.5 py-0.5 text-[8px] text-muted">
                        {project.client}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[9.5px] text-subtle">
                      {t('Lead')} {lead?.name ?? t('Unassigned')} · {sprints.length} {t('Sprints').toLowerCase()} · {groupPoints} {t('pts')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AvatarStack
                      memberIds={getProjectTeam(project.id, groupTasks, project.leadId)}
                      members={data.members}
                      max={4}
                      size={24}
                    />
                    <button
                      type="button"
                      onClick={() => openNewSprint(project.id)}
                      className="btn btn-secondary !px-2.5 !py-1.5 !text-[10px]"
                    >
                      <Plus size={11} /> {t('Next sprint')}
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 bg-[#fbfbfc] p-3 md:grid-cols-2">
                  {sprints.map((sprint) => (
                    <ArchiveSprintCard
                      key={sprint.id}
                      sprint={sprint}
                      project={project}
                      tasks={groupTasks}
                      members={data.members}
                      onOpenBoard={() => openArchivedSprint(sprint)}
                      onNextSprint={() => openNewSprint(project.id)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-line bg-[#fcfcfd] px-3.5 py-3 text-[10px] leading-relaxed text-subtle">
        <Sparkles size={12} className="mt-0.5 shrink-0 text-[#8b7bff]" />
        <p>
          <span className="font-medium text-muted">{t('Archive principle.')}</span>{' '}
          {t('Each sprint opens with a goal and closes with a demo. The record stays intact so velocity and delivery patterns are always visible.')}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-3 text-[9px] text-subtle">
        <span className="flex items-center gap-1.5">
          <ProjectDot color="#111827" size={5} /> {projectGroups.length} {t('Projects').toLowerCase()}
        </span>
        <button
          type="button"
          className="flex items-center gap-1 font-medium text-muted hover:text-ink"
          onClick={() => navigate('/')}
        >
          {t('Back to overview')} <ChevronRight size={9} />
        </button>
      </div>
    </div>
  )
}
