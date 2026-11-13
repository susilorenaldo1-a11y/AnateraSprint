import { NavLink } from 'react-router-dom'
import {
  ArrowUpRight,
  Archive,
  Receipt,
  CalendarDays,
  Cloud,
  CloudOff,
  Columns3,
  LayoutDashboard,
  LogOut,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import { useWorkspace } from '../store/WorkspaceStore'
import { Avatar } from './ui'
import { cn, initials } from '../lib/utils'
import { formatShortDate, todayKey, daysBetween } from '../lib/date'
import { useI18n } from '../i18n/I18nProvider'
import { useSession } from '../auth/SessionProvider'

const navItems = [
  { to: '/', label: 'Projects Overview', icon: LayoutDashboard, end: true },
  { to: '/board', label: 'Kanban Board', icon: Columns3 },
  { to: '/calendar', label: 'Sprint Calendar', icon: CalendarDays },
  { to: '/billing', label: 'Billing', icon: Receipt },
  { to: '/archive', label: 'Sprint Archive', icon: Archive },
]

function BrandMark() {
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-[#111827] shadow-[0_2px_8px_rgba(17,24,39,0.22)]">
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" aria-hidden="true">
        <path d="M5 19L10.6 5.4a1.45 1.45 0 0 1 2.68 0L19 19" stroke="white" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 14.1h8.4" stroke="#A99BFF" strokeWidth="2.15" strokeLinecap="round" />
      </svg>
      <span className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-[#8B7BFF]" />
    </span>
  )
}

export function Sidebar({
  mobileOpen,
  onClose,
  onNewTask,
  onOpenData,
}: {
  mobileOpen: boolean
  onClose: () => void
  onNewTask: () => void
  onOpenData: () => void
}) {
  const { data, notify, syncStatus, retrySync } = useWorkspace()
  const { user, logout } = useSession()
  const { t, language } = useI18n()
  const activeSprints = data.sprints.filter((sprint) => sprint.status === 'active')
  const nextHandover = [...activeSprints].sort((a, b) => a.endDate.localeCompare(b.endDate))[0]
  const boardTaskCount = data.tasks.filter((task) => {
    const sprint = data.sprints.find((item) => item.id === task.sprintId)
    return sprint?.status === 'active' && task.status !== 'done'
  }).length
  const archivedCount = data.sprints.filter((sprint) => sprint.status === 'completed').length
  const activeProjectNames = data.projects
    .filter((project) => project.status === 'Active' || project.status === 'At Risk')
    .slice(0, 3)
  const additionalActiveProjects =
    data.projects.filter((project) => project.status === 'Active' || project.status === 'At Risk').length -
    activeProjectNames.length
  const daysToHandover = nextHandover ? daysBetween(todayKey(), nextHandover.endDate) : null
  const currentMember =
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

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-[#111827]/35 backdrop-blur-[2px] transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[70] flex w-[252px] flex-col border-r border-line bg-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Primary navigation"
      >
        <div className="flex h-[68px] shrink-0 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <div className="leading-none">
              <p className="text-[16px] font-semibold tracking-[-0.035em] text-ink">anatera</p>
              <p className="mt-[3px] font-mono text-[8.5px] font-medium uppercase tracking-[0.18em] text-subtle">
                Sprint OS
              </p>
            </div>
          </div>
          <button type="button" className="icon-btn lg:hidden" onClick={onClose} aria-label={t('Close')}>
            <X size={17} />
          </button>
        </div>

        <div className="px-3.5">
          <button
            type="button"
            onClick={() => {
              onNewTask()
              onClose()
            }}
            className="group flex w-full items-center justify-between rounded-[10px] border border-line bg-[#fcfcfd] px-3 py-2.5 text-left transition-all hover:border-line-strong hover:bg-white hover:shadow-card"
          >
            <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-ink text-white transition-transform group-hover:rotate-90">
                <Plus size={12} strokeWidth={2.4} />
              </span>
              {t('New task')}
            </span>
            <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[9px] font-medium text-subtle shadow-sm">
              C
            </kbd>
          </button>
        </div>

        <nav className="mt-5 px-3.5">
          <p className="mb-2 px-3 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-subtle">{t('Workspace')}</p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const badge =
                item.to === '/board' ? boardTaskCount : item.to === '/archive' ? archivedCount : undefined
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) => cn('nav-item group', isActive && 'nav-item-active')}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={16}
                        strokeWidth={isActive ? 2.1 : 1.8}
                        className={cn('shrink-0 transition-colors', isActive ? 'text-white' : 'text-[#8b8f99] group-hover:text-ink')}
                      />
                      <span className="flex-1">{t(item.label)}</span>
                      {badge !== undefined && badge > 0 && (
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0.5 font-mono text-[9px] leading-none',
                            isActive ? 'bg-white/15 text-white/80' : 'bg-[#f0f1f3] text-[#8b8f99]',
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        </nav>

        <div className="mx-3.5 mt-6 border-t border-line" />

        <div className="px-3.5 pt-5">
          <div className="flex items-center justify-between px-1">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-subtle">{t('Live now')}</p>
            <span className="flex items-center gap-1 text-[9px] font-medium text-[#047857]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              {t('On track')}
            </span>
          </div>
          <div className="mt-2 rounded-xl border border-line bg-[#fbfbfc] p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-ink">
                {activeSprints.length}{' '}
                {language === 'id'
                  ? 'sprint berjalan'
                  : `sprint${activeSprints.length === 1 ? '' : 's'} in motion`}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
              {activeProjectNames.map((project) => (
                <span key={project.id} className="inline-flex items-center gap-1 text-[9.5px] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                  {project.code}
                </span>
              ))}
              {additionalActiveProjects > 0 && (
                <span className="text-[9.5px] font-medium text-subtle">+{additionalActiveProjects}</span>
              )}
            </div>
            {nextHandover && (
              <p className="mt-2 border-t border-line/80 pt-2 text-[9.5px] leading-relaxed text-subtle">
                {t('Next handover')}{' '}
                <span className="font-medium text-muted">{formatShortDate(nextHandover.endDate)}</span>
                {daysToHandover !== null && (
                  <>
                    {' '}· {daysToHandover <= 0 ? t('Today') : language === 'id' ? `${daysToHandover} hari lagi` : `${daysToHandover}d left`}
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto px-3.5 pb-3 pt-4">
          <div className="mb-2 flex items-center justify-between rounded-lg border border-line bg-[#fcfcfd] px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              {syncStatus === 'offline' ? (
                <CloudOff size={11} className="text-[#b45309]" />
              ) : (
                <Cloud size={11} className={syncStatus === 'saving' ? 'text-[#6d28d9]' : 'text-[#047857]'} />
              )}
              <span className={cn('text-[9px] font-medium', syncStatus === 'offline' ? 'text-[#b45309]' : 'text-muted')}>
                {syncStatus === 'saving'
                  ? t('Syncing…')
                  : syncStatus === 'offline'
                    ? t('Offline — local changes will sync when reconnected')
                    : t('Saved to workspace database')}
              </span>
            </div>
            {syncStatus === 'offline' && (
              <button type="button" onClick={retrySync} className="text-[9px] font-medium text-[#5b21b6] hover:underline">
                {t('Retry')}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenData}
            className="group flex w-full items-center gap-2.5 rounded-[10px] border border-line bg-white px-2.5 py-2.5 text-left transition-all hover:border-[#d9d0ff] hover:bg-[#faf8ff]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#6d28d9]">
              <Sparkles size={13} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[10.5px] font-semibold text-ink">{t('Load Anatera Demo Sprints')}</span>
              <span className="block truncate text-[9.5px] text-subtle">{t('Backup, import or reset')}</span>
            </span>
            <ArrowUpRight size={12} className="shrink-0 text-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>

          <div className="mt-2.5 flex items-center gap-2.5 rounded-[10px] px-2 py-2">
            <Avatar member={currentMember} size={30} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[11.5px] font-semibold text-ink">{user?.name ?? 'Alex Morgan'}</p>
              <p className="truncate text-[9.5px] text-subtle">{user?.email ?? t('Delivery Lead · Anatera')}</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex h-7 w-7 items-center justify-center rounded-md text-subtle transition-colors hover:bg-[#fff1f2] hover:text-[#be123c]"
              aria-label={t('Sign out')}
              title={t('Sign out')}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
