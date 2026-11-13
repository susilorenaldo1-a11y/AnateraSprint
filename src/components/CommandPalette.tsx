import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive,
  CalendarDays,
  Columns3,
  CornerDownLeft,
  Database,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../store/WorkspaceStore'
import { cn } from '../lib/utils'
import { dueLabel, formatShortDate, todayKey } from '../lib/date'
import { getActiveSprints } from '../lib/progress'
import { useI18n } from '../i18n/I18nProvider'

interface CommandItem {
  id: string
  group: 'Navigate' | 'Create' | 'Tasks'
  label: string
  description?: string
  icon: ReactNode
  shortcut?: string
  action: () => void
}

export function CommandPalette({
  open,
  onClose,
  onOpenTask,
  onNewTask,
  onNewProject,
  onNewSprint,
  onOpenData,
}: {
  open: boolean
  onClose: () => void
  onOpenTask: (taskId: string) => void
  onNewTask: () => void
  onNewProject: () => void
  onNewSprint: () => void
  onOpenData: () => void
}) {
  const { data } = useWorkspace()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
    window.setTimeout(() => inputRef.current?.focus(), 40)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const activeSprintIds = useMemo(
    () => new Set(getActiveSprints(data.projects, data.sprints).map((sprint) => sprint.id)),
    [data.projects, data.sprints],
  )

  const taskResults = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const tasks = data.tasks.filter((task) => {
      if (!normalized) return activeSprintIds.has(task.sprintId) && task.status !== 'done'
      const project = data.projects.find((item) => item.id === task.projectId)
      return [task.key, task.title, project?.name, project?.code, project?.client]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    })
    return tasks
      .sort((a, b) => {
        const aDone = a.status === 'done' ? 1 : 0
        const bDone = b.status === 'done' ? 1 : 0
        if (aDone !== bDone) return aDone - bDone
        if (!normalized) return a.dueDate.localeCompare(b.dueDate)
        return a.key.localeCompare(b.key)
      })
      .slice(0, 8)
  }, [query, data.tasks, data.projects, activeSprintIds])

  const items = useMemo<CommandItem[]>(() => {
    const normalized = query.trim().toLowerCase()
    const navItemsBase: CommandItem[] = [
      {
        id: 'nav-overview',
        group: 'Navigate',
        label: t('Projects Overview'),
        description: t('Sprint pulse and project health'),
        icon: <LayoutDashboard size={15} />,
        action: () => navigate('/'),
      },
      {
        id: 'nav-board',
        group: 'Navigate',
        label: t('Kanban Board'),
        description: t('Drag tasks across delivery lanes'),
        icon: <Columns3 size={15} />,
        action: () => navigate('/board'),
      },
      {
        id: 'nav-calendar',
        group: 'Navigate',
        label: t('Sprint Calendar'),
        description: t('14-day timeline and monthly view'),
        icon: <CalendarDays size={15} />,
        action: () => navigate('/calendar'),
      },
      {
        id: 'nav-archive',
        group: 'Navigate',
        label: t('Sprint Archive'),
        description: t('Completed sprint record and velocity'),
        icon: <Archive size={15} />,
        action: () => navigate('/archive'),
      },
    ]
    const navItems = navItemsBase.filter((item) => !normalized || item.label.toLowerCase().includes(normalized))

    const createItemsBase: CommandItem[] = [
      {
        id: 'action-task',
        group: 'Create',
        label: t('New task'),
        description: t('Add a deliverable to a sprint'),
        icon: <Plus size={15} />,
        shortcut: 'C',
        action: onNewTask,
      },
      {
        id: 'action-project',
        group: 'Create',
        label: t('New project'),
        description: t('Set up a client or internal project'),
        icon: <FolderKanban size={15} />,
        action: onNewProject,
      },
      {
        id: 'action-sprint',
        group: 'Create',
        label: t('Start a 2-week sprint'),
        description: t('Create the next 14-day window'),
        icon: <CalendarDays size={15} />,
        action: onNewSprint,
      },
      {
        id: 'action-data',
        group: 'Create',
        label: t('Workspace data & backup'),
        description: t('Export, import or load demo sprints'),
        icon: <Database size={15} />,
        action: onOpenData,
      },
    ]
    const createItems = createItemsBase.filter(
      (item) =>
        !normalized ||
        item.label.toLowerCase().includes(normalized) ||
        item.description?.toLowerCase().includes(normalized),
    )

    const taskItems: CommandItem[] = taskResults.map((task) => {
      const project = data.projects.find((item) => item.id === task.projectId)
      const due = dueLabel(task.dueDate)
      return {
        id: `task-${task.id}`,
        group: 'Tasks',
        label: task.title,
        description: `${task.key} · ${project?.name ?? ''} · ${
          task.status === 'done' ? 'Completed' : due.label
        }`,
        icon: <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project?.color ?? '#111827' }} />,
        action: () => onOpenTask(task.id),
      }
    })

    return [...navItems, ...createItems, ...taskItems]
  }, [
    query,
    taskResults,
    data.projects,
    navigate,
    onNewTask,
    onNewProject,
    onNewSprint,
    onOpenData,
    onOpenTask,
  ])

  useEffect(() => {
    setIndex(0)
  }, [query])

  function run(item: CommandItem | undefined) {
    if (!item) return
    item.action()
    onClose()
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIndex((current) => (items.length === 0 ? 0 : (current + 1) % items.length))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIndex((current) => (items.length === 0 ? 0 : (current - 1 + items.length) % items.length))
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      run(items[index])
    }
    if (event.key === 'Escape') onClose()
  }

  const groups: CommandItem['group'][] = ['Navigate', 'Create', 'Tasks']

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 pt-[12vh] sm:pt-[16vh]"
          onKeyDown={onKeyDown}
        >
          <button
            type="button"
            className="fixed inset-0 cursor-default bg-[#111827]/35 backdrop-blur-[4px]"
            onClick={onClose}
            aria-label="Close command palette"
            tabIndex={-1}
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.99 }}
            transition={{ duration: 0.19, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[600px] overflow-hidden rounded-[16px] border border-white/60 bg-white shadow-[0_36px_100px_-28px_rgba(17,24,39,0.55)]"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={17} className="shrink-0 text-subtle" />
              <input
                ref={inputRef}
                className="h-[56px] flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-subtle"
                placeholder={t('Search tasks, jump to a view, or create…')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd className="rounded border border-line bg-[#fafafa] px-1.5 py-1 font-mono text-[9px] text-subtle">ESC</kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {items.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Sparkles size={18} className="mx-auto mb-3 text-subtle" />
                  <p className="text-[13px] font-medium text-ink">{t('No results')}</p>
                  <p className="mt-1 text-[11px] text-subtle">{t('Try a task key, project name or action.')}</p>
                </div>
              ) : (
                groups.map((group) => {
                  const groupItems = items.filter((item) => item.group === group)
                  if (groupItems.length === 0) return null
                  return (
                    <div key={group} className="mb-1 last:mb-0">
                      <p className="px-2.5 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-subtle">
                        {t(group)}
                      </p>
                      {groupItems.map((item) => {
                        const itemIndex = items.findIndex((entry) => entry.id === item.id)
                        const selected = itemIndex === index
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onMouseEnter={() => setIndex(itemIndex)}
                            onClick={() => run(item)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                              selected ? 'bg-[#f4f2ff]' : 'hover:bg-[#f7f7f9]',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border',
                                selected ? 'border-[#e3dcff] bg-white text-[#5b21b6]' : 'border-line bg-white text-muted',
                              )}
                            >
                              {item.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12.5px] font-medium text-ink">{item.label}</span>
                              {item.description && (
                                <span className="mt-0.5 block truncate text-[10.5px] text-subtle">{item.description}</span>
                              )}
                            </span>
                            {item.shortcut ? (
                              <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[9px] text-subtle">
                                {item.shortcut}
                              </kbd>
                            ) : selected ? (
                              <CornerDownLeft size={12} className="text-[#8b7bff]" />
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-line bg-[#fcfcfd] px-4 py-2.5 text-[9.5px] text-subtle">
              <span className="flex items-center gap-1"><kbd className="font-mono">↑↓</kbd> {t('navigate')}</span>
              <span className="flex items-center gap-1"><kbd className="font-mono">↵</kbd> {t('open')}</span>
              <span className="flex items-center gap-1"><kbd className="font-mono">esc</kbd> {t('close')}</span>
              <span className="ml-auto flex items-center gap-1 text-[#6d28d9]">
                <Sparkles size={9} /> Anatera command
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
