import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronRight,
  Command,
  FolderKanban,
  Languages,
  Menu,
  Monitor,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  SunMoon,
  TriangleAlert,
} from 'lucide-react'
import { useWorkspace } from '../store/WorkspaceStore'
import type { Task } from '../types'
import { Avatar, Dot, DropdownItem, PaceBadge, Popover, ProjectDot } from './ui'
import { cn } from '../lib/utils'
import { getActiveSprints, getProjectCurrentSprint, getSprintMetrics } from '../lib/progress'
import { dueLabel, formatRange, formatShortDate, todayKey } from '../lib/date'
import { useI18n } from '../i18n/I18nProvider'
import { useTheme, type ThemeMode } from '../theme/ThemeProvider'
import { useSession } from '../auth/SessionProvider'
import { initials } from '../lib/utils'

const pageNames: Record<string, string> = {
  '/': 'Overview',
  '/board': 'Kanban Board',
  '/calendar': 'Sprint Calendar',
  '/billing': 'Billing',
  '/archive': 'Sprint Archive',
}

export function Topbar({
  onOpenMenu,
  onNewTask,
  onOpenSearch,
  onOpenTask,
  onNewProject,
  onNewSprint,
}: {
  onOpenMenu: () => void
  onNewTask: () => void
  onOpenSearch: () => void
  onOpenTask: (taskId: string) => void
  onNewProject: () => void
  onNewSprint: () => void
}) {
  const {
    data,
    projectFilter,
    sprintFilter,
    setProjectFilter,
    setSprintFilter,
  } = useWorkspace()
  const location = useLocation()
  const navigate = useNavigate()
  const { language, setLanguage, toggleLanguage, t } = useI18n()
  const { theme, setTheme, resolvedTheme, toggleTheme } = useTheme()
  const { user } = useSession()
  const currentUser =
    data.members.find((member) => member.email === user?.email) ??
    (user
      ? {
          id: user.id,
          name: user.name,
          initials: initials(user.name),
          role: 'Delivery Lead',
          color: '#111827',
          email: user.email,
        }
      : undefined)

  const selectedProject = data.projects.find((project) => project.id === projectFilter)
  const activeSprints = getActiveSprints(data.projects, data.sprints)
  const scopedSprints = useMemo(() => {
    const list =
      projectFilter === 'all'
        ? data.sprints
        : data.sprints.filter((sprint) => sprint.projectId === projectFilter)
    return [...list].sort((a, b) => {
      if (a.status !== b.status) {
        const rank = { active: 0, planning: 1, completed: 2 }
        return rank[a.status] - rank[b.status]
      }
      return b.startDate.localeCompare(a.startDate)
    })
  }, [data.sprints, projectFilter])

  const selectedSprint = data.sprints.find((sprint) => sprint.id === sprintFilter)
  const currentSprint = selectedProject
    ? getProjectCurrentSprint(selectedProject.id, data.sprints)
    : activeSprints[0]

  const sprintButtonLabel =
    sprintFilter === 'active'
      ? selectedProject
        ? currentSprint?.name ?? t('No sprint')
        : t('Current sprints')
      : sprintFilter === 'all'
        ? t('All sprints')
        : selectedSprint?.name ?? t('Sprint')

  const pulseTasks = useMemo(() => {
    const activeProjectIds = new Set(
      data.projects
        .filter((project) => project.status === 'Active' || project.status === 'At Risk')
        .map((project) => project.id),
    )
    const activeSprintIds = new Set(
      data.sprints.filter((sprint) => sprint.status === 'active').map((sprint) => sprint.id),
    )
    return data.tasks
      .filter(
        (task) =>
          activeSprintIds.has(task.sprintId) &&
          activeProjectIds.has(task.projectId) &&
          task.status !== 'done' &&
          (task.blocked || task.dueDate <= todayKey()),
      )
      .sort((a, b) => {
        if (a.blocked !== b.blocked) return a.blocked ? -1 : 1
        return a.dueDate.localeCompare(b.dueDate)
      })
      .slice(0, 5)
  }, [data.projects, data.sprints, data.tasks])

  const blockedCount = useMemo(
    () => data.tasks.filter((task) => {
      const sprint = data.sprints.find((item) => item.id === task.sprintId)
      return task.blocked && task.status !== 'done' && sprint?.status === 'active'
    }).length,
    [data.tasks, data.sprints],
  )

  const pageName = t(pageNames[location.pathname] ?? 'Workspace')
  const today = new Date()
  const dateLabel = today.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const themeOptions: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: t('Light'), icon: Sun },
    { id: 'dark', label: t('Dark'), icon: Moon },
    { id: 'system', label: t('System'), icon: Monitor },
  ]

  function taskContext(task: Task) {
    const project = data.projects.find((item) => item.id === task.projectId)
    const sprint = data.sprints.find((item) => item.id === task.sprintId)
    return { project, sprint }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-xl">
      <div className="flex h-[64px] items-center gap-2.5 px-3 sm:px-4 lg:px-6 xl:px-7">
        <button type="button" className="icon-btn lg:hidden" onClick={onOpenMenu} aria-label={t('Search')}>
          <Menu size={18} />
        </button>

        <div className="hidden min-w-0 items-center gap-1.5 text-[11px] xl:flex">
          <span className="text-subtle">{t('Anatera Studio')}</span>
          <ChevronRight size={11} className="text-[#d1d5db]" />
          <span className="font-medium text-ink">{pageName}</span>
        </div>
        <div className="mx-1 hidden h-4 w-px bg-line xl:block" />

        <Popover
          ariaLabel={t('Switch project')}
          trigger={
            <span className="flex h-9 items-center gap-2 rounded-[10px] border border-line bg-white px-2.5 text-[12px] transition-colors hover:bg-[#fafafa]">
              {selectedProject ? (
                <ProjectDot color={selectedProject.color} />
              ) : (
                <span className="grid h-3.5 w-3.5 grid-cols-2 gap-px">
                  {data.projects.slice(0, 4).map((project) => (
                    <span key={project.id} className="rounded-[1px]" style={{ backgroundColor: project.color }} />
                  ))}
                </span>
              )}
              <span className="max-w-[124px] truncate font-medium text-ink sm:max-w-[180px]">
                {selectedProject?.name ?? t('All projects')}
              </span>
              <ChevronDown size={12} className="shrink-0 text-subtle" />
            </span>
          }
          panelClassName="w-[292px] p-1.5"
        >
          {(close) => (
            <>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-subtle">{t('Project')}</span>
                <button
                  type="button"
                  onClick={() => {
                    close()
                    onNewProject()
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-muted hover:bg-[#f4f4f5] hover:text-ink"
                >
                  <Plus size={10} /> {t('New')}
                </button>
              </div>
              <DropdownItem
                selected={projectFilter === 'all'}
                onClick={() => {
                  setProjectFilter('all')
                  close()
                }}
                icon={
                  <span className="grid h-4 w-4 grid-cols-2 gap-px">
                    {data.projects.slice(0, 4).map((project) => (
                      <span key={project.id} className="rounded-[1px]" style={{ backgroundColor: project.color }} />
                    ))}
                  </span>
                }
                description={`${data.projects.length} ${t('Projects').toLowerCase()} · ${t('Active')}`}
              >
                {t('All projects')}
              </DropdownItem>
              <div className="my-1 border-t border-line" />
              <div className="max-h-[300px] overflow-y-auto">
                {data.projects.map((project) => {
                  const sprint = getProjectCurrentSprint(project.id, data.sprints)
                  return (
                    <DropdownItem
                      key={project.id}
                      selected={projectFilter === project.id}
                      onClick={() => {
                        setProjectFilter(project.id)
                        close()
                      }}
                      icon={<ProjectDot color={project.color} size={9} />}
                      description={`${project.code} · ${project.client}${sprint ? ` · ${sprint.name}` : ''}`}
                    >
                      {project.name}
                    </DropdownItem>
                  )
                })}
              </div>
            </>
          )}
        </Popover>

        <Popover
          ariaLabel={t('Switch sprint')}
          trigger={
            <span className="hidden h-9 items-center gap-2 rounded-[10px] border border-line bg-white px-2.5 text-[12px] transition-colors hover:bg-[#fafafa] sm:flex">
              <CalendarRange size={13} className="shrink-0 text-subtle" />
              <span className="max-w-[120px] truncate text-ink">{sprintButtonLabel}</span>
              <ChevronDown size={12} className="shrink-0 text-subtle" />
            </span>
          }
          panelClassName="w-[312px] p-1.5"
        >
          {(close) => (
            <>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-subtle">{t('Sprint')}</span>
                <button
                  type="button"
                  onClick={() => {
                    close()
                    onNewSprint()
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-muted hover:bg-[#f4f4f5] hover:text-ink"
                >
                  <Plus size={10} /> {t('New sprint')}
                </button>
              </div>
              <DropdownItem
                selected={sprintFilter === 'active'}
                onClick={() => {
                  setSprintFilter('active')
                  close()
                }}
                description={selectedProject ? t('The current sprint for this project') : t('Current sprint from every project')}
              >
                {t('Live / current sprints')}
              </DropdownItem>
              <DropdownItem
                selected={sprintFilter === 'all'}
                onClick={() => {
                  setSprintFilter('all')
                  close()
                }}
                description={t('Include planning and archived sprints')}
              >
                {t('All sprints')}
              </DropdownItem>
              <div className="my-1 border-t border-line" />
              <div className="max-h-[300px] overflow-y-auto">
                {scopedSprints.map((sprint) => {
                  const project = data.projects.find((item) => item.id === sprint.projectId)
                  const metrics = getSprintMetrics(sprint, data.tasks)
                  return (
                    <DropdownItem
                      key={sprint.id}
                      selected={sprintFilter === sprint.id}
                      onClick={() => {
                        if (projectFilter === 'all' && project) setProjectFilter(project.id)
                        window.setTimeout(() => setSprintFilter(sprint.id), 0)
                        close()
                      }}
                      icon={<ProjectDot color={project?.color ?? '#111827'} size={8} />}
                      description={`${project?.code ?? ''} · ${formatRange(sprint.startDate, sprint.endDate)}`}
                    >
                      <span className="flex items-center gap-1.5">
                        {sprint.name}
                        {sprint.status === 'active' && <PaceBadge pace={metrics.pace} compact />}
                      </span>
                    </DropdownItem>
                  )
                })}
              </div>
            </>
          )}
        </Popover>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenSearch}
            className="hidden h-9 items-center gap-2 rounded-[10px] border border-transparent px-2 text-[11.5px] text-muted transition-colors hover:border-line hover:bg-[#fafafa] md:flex"
            aria-label={t('Search tasks and navigate')}
          >
            <Search size={14} />
            <span className="hidden lg:inline">{t('Search')}</span>
            <kbd className="hidden items-center gap-0.5 rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[9px] text-subtle lg:flex">
              <Command size={8} />K
            </kbd>
          </button>

          <button
            type="button"
            onClick={toggleLanguage}
            className="hidden h-9 items-center gap-1.5 rounded-[10px] border border-transparent px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted transition-colors hover:border-line hover:bg-[#fafafa] hover:text-ink sm:flex"
            aria-label={t('Language')}
            title={t('Language')}
          >
            <Languages size={13} />
            {language}
          </button>

          <Popover
            ariaLabel={t('Preferences')}
            align="right"
            panelClassName="w-[250px] p-2"
            trigger={
              <span className="icon-btn" title={t('Preferences')}>
                <SunMoon size={16} />
              </span>
            }
          >
            {(close) => (
              <div>
                <p className="px-1.5 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-subtle">
                  {t('Appearance')}
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {themeOptions.map((option) => {
                    const Icon = option.icon
                    const selected = theme === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setTheme(option.id)}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[9px] font-medium transition-colors',
                          selected
                            ? 'border-[#d8d2ff] bg-[#f7f5ff] text-[#5b21b6]'
                            : 'border-line bg-white text-muted hover:bg-[#fafafa]',
                        )}
                      >
                        <Icon size={13} />
                        {option.label}
                        {selected && <span className="h-1 w-1 rounded-full bg-current" />}
                      </button>
                    )
                  })}
                </div>
                <div className="my-2 border-t border-line" />
                <p className="px-1.5 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-subtle">
                  {t('Language')}
                </p>
                <div className="space-y-0.5">
                  {[
                    { code: 'en' as const, label: t('English') },
                    { code: 'id' as const, label: t('Bahasa Indonesia') },
                  ].map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => {
                        setLanguage(option.code)
                        close()
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors',
                        language === option.code ? 'bg-[#f7f5ff] font-medium text-[#5b21b6]' : 'text-ink hover:bg-[#f4f4f5]',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Languages size={12} />
                        {option.label}
                      </span>
                      {language === option.code && <Check size={12} />}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between rounded-lg bg-[#fafafa] px-2.5 py-2">
                  <span className="text-[9px] text-subtle">{resolvedTheme === 'dark' ? t('Dark') : t('Light')}</span>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex items-center gap-1 text-[9px] font-medium text-muted hover:text-ink"
                  >
                    {resolvedTheme === 'dark' ? <Sun size={10} /> : <Moon size={10} />}
                    {t('Appearance')}
                  </button>
                </div>
              </div>
            )}
          </Popover>

          <Popover
            ariaLabel={t('Sprint pulse')}
            align="right"
            panelClassName="w-[330px] p-0"
            trigger={
              <span className="icon-btn relative">
                <Bell size={16} />
                {pulseTasks.length > 0 && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full border border-white bg-[#e11d48]" />
                )}
              </span>
            }
          >
            {(close) => (
              <div>
                <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
                  <div>
                    <p className="text-[12px] font-semibold text-ink">{t('Sprint pulse')}</p>
                    <p className="text-[10px] text-subtle">{dateLabel}</p>
                  </div>
                  <span className={cn('badge', blockedCount > 0 ? 'bg-[#fff1f2] text-[#be123c]' : 'bg-[#ecfdf5] text-[#047857]')}>
                    <TriangleAlert size={10} /> {blockedCount} {t('Blocked').toLowerCase()}
                  </span>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1.5">
                  {pulseTasks.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-[12px] font-medium text-ink">{t('All clear')}</p>
                      <p className="mt-1 text-[10.5px] text-subtle">{t('No blockers or due-today items.')}</p>
                    </div>
                  ) : (
                    pulseTasks.map((task) => {
                      const { project } = taskContext(task)
                      const due = dueLabel(task.dueDate)
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => {
                            close()
                            onOpenTask(task.id)
                          }}
                          className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#f6f6f8]"
                        >
                          <Dot color={project?.color ?? '#111827'} className="mt-1.5" />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] text-subtle">{task.key}</span>
                              {task.blocked && <TriangleAlert size={9} className="text-[#be123c]" />}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] font-medium text-ink">{task.title}</span>
                            <span className={cn('mt-0.5 block text-[9.5px]', due.tone === 'overdue' || due.tone === 'today' ? 'text-[#b45309]' : 'text-subtle')}>
                              {due.label}
                            </span>
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    close()
                    navigate('/calendar')
                  }}
                  className="flex w-full items-center justify-between border-t border-line px-3.5 py-2.5 text-[10.5px] font-medium text-muted transition-colors hover:bg-[#fafafa] hover:text-ink"
                >
                  {t('Open sprint calendar')} <ChevronRight size={11} />
                </button>
              </div>
            )}
          </Popover>

          <div className="mx-0.5 hidden h-4 w-px bg-line sm:block" />

          <button type="button" className="btn btn-primary !h-9 !px-3" onClick={onNewTask}>
            <Plus size={14} strokeWidth={2.4} />
            <span className="hidden sm:inline">{t('New task')}</span>
          </button>
          <div className="ml-0.5 hidden sm:block">
            <Avatar member={currentUser} size={30} />
          </div>
        </div>
      </div>
    </header>
  )
}
