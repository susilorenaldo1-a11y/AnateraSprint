import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDot,
  Flag,
  ListChecks,
  Lock,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import type { Priority, TaskStatus } from '../types'
import { PRIORITIES, TASK_STATUSES } from '../types'
import { useWorkspace } from '../store/WorkspaceStore'
import { Avatar, ProgressBar, ProjectDot } from './ui'
import { cn } from '../lib/utils'
import {
  daysBetween,
  dueLabel,
  formatRange,
  formatRelativeTime,
  formatShortDate,
  todayKey,
} from '../lib/date'
import { useI18n } from '../i18n/I18nProvider'
import { useSession } from '../auth/SessionProvider'

export function TaskDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const {
    data,
    updateTask,
    deleteTask,
    addComment,
    addSubtask,
    toggleSubtask,
    removeSubtask,
    notify,
  } = useWorkspace()
  const { t, language } = useI18n()
  const { user } = useSession()
  const task = data.tasks.find((item) => item.id === taskId)
  const project = data.projects.find((item) => item.id === task?.projectId)
  const sprint = data.sprints.find((item) => item.id === task?.sprintId)
  const assignee = data.members.find((member) => member.id === task?.assigneeId)
  const [newSubtask, setNewSubtask] = useState('')
  const [comment, setComment] = useState('')
  const [deleteArmed, setDeleteArmed] = useState(false)

  useEffect(() => {
    setNewSubtask('')
    setComment('')
    setDeleteArmed(false)
  }, [taskId])

  useEffect(() => {
    if (!taskId) return
    if (!task) {
      onClose()
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [taskId, task, onClose])

  if (!task || !project) return null

  const activeTask: NonNullable<typeof task> = task
  const checklistDone = activeTask.subtasks.filter((subtask) => subtask.done).length
  const checklistPct = activeTask.subtasks.length === 0 ? 0 : Math.round((checklistDone / activeTask.subtasks.length) * 100)
  const due = dueLabel(activeTask.dueDate)
  const isTaskDone = activeTask.status === 'done'
  const daysToDue = daysBetween(todayKey(), activeTask.dueDate)
  const sprintDay = sprint ? Math.min(14, Math.max(0, daysBetween(sprint.startDate, activeTask.dueDate) + 1)) : null

  function changeStatus(status: TaskStatus) {
    const laneTasks = data.tasks.filter(
      (item) => item.sprintId === activeTask.sprintId && item.status === status && item.id !== activeTask.id,
    )
    const nextOrder = laneTasks.reduce((max, item) => Math.max(max, item.order), 0) + 1
    updateTask(activeTask.id, { status, order: nextOrder })
  }

  function submitSubtask(event: FormEvent) {
    event.preventDefault()
    if (!newSubtask.trim()) return
    addSubtask(activeTask.id, newSubtask)
    setNewSubtask('')
  }

  function submitComment(event: FormEvent) {
    event.preventDefault()
    if (!comment.trim()) return
    const authorId =
      data.members.find((member) => member.email === user?.email)?.id ??
      data.members.find((member) => member.id === 'alex')?.id ??
      'alex'
    addComment(activeTask.id, authorId, comment)
    setComment('')
    notify(t('Comment added to the task activity.'), 'success')
  }

  function confirmDelete() {
    deleteTask(activeTask.id)
    notify(`${activeTask.key} ${language === 'id' ? 'dihapus.' : 'deleted.'}`, 'info')
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      {taskId && (
        <motion.div
          className="fixed inset-0 z-[90]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-[#111827]/30 backdrop-blur-[2px]"
            onClick={onClose}
            aria-label="Close task details"
            tabIndex={-1}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`${task.key}: ${task.title}`}
            className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-white shadow-[var(--shadow-drawer)] sm:w-[520px]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-line px-5">
              <div className="flex min-w-0 items-center gap-2 text-[11px]">
                <ProjectDot color={project.color} size={7} />
                <span className="truncate font-medium text-ink">{project.code}</span>
                <span className="text-subtle">/</span>
                <span className="truncate text-muted">{sprint?.name ?? 'No sprint'}</span>
                <span className="hidden text-subtle sm:inline">/</span>
                <span className="hidden font-mono text-[10px] text-subtle sm:inline">{task.key}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1 text-[9.5px] text-subtle sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {t('Saved to workspace database')}
                </span>
                <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Close')}>
                  <X size={17} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              <div className="px-5 pb-8 pt-5 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-line bg-[#fafafa] px-1.5 py-1 font-mono text-[9.5px] font-medium text-muted">
                    {task.key}
                  </span>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: `${project.color}12`,
                      color: project.color,
                    }}
                  >
                    <ProjectDot color={project.color} size={6} />
                    {project.name}
                  </span>
                  {activeTask.blocked && !isTaskDone && (
                    <span className="badge bg-[#fff1f2] text-[#be123c]">
                      <Lock size={9} /> {t('Blocked')}
                    </span>
                  )}
                </div>

                <input
                  className="mt-3 w-full border-0 bg-transparent p-0 text-[21px] font-semibold leading-[1.3] tracking-[-0.025em] text-ink outline-none placeholder:text-subtle"
                  value={task.title}
                  onChange={(event) => updateTask(task.id, { title: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                  placeholder="Task title"
                  aria-label="Task title"
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={task.status}
                    onChange={(event) => changeStatus(event.target.value as TaskStatus)}
                    className={cn(
                      'cursor-pointer rounded-full border px-2.5 py-1.5 text-[10.5px] font-semibold outline-none transition-colors',
                      task.status === 'done'
                        ? 'border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]'
                        : task.status === 'in_progress'
                          ? 'border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]'
                          : 'border-line bg-[#fafafa] text-muted',
                    )}
                    aria-label="Task status"
                  >
                    {TASK_STATUSES.map((lane) => (
                      <option key={lane.id} value={lane.id}>
                        {t(lane.label)}
                      </option>
                    ))}
                  </select>
                  {sprint && (
                    <span className="rounded-full border border-line bg-white px-2.5 py-1.5 text-[10.5px] text-muted">
                      {sprint.name}
                      {sprintDay ? ` · ${language === 'id' ? 'Hari' : 'Day'} ${sprintDay}` : ''}
                    </span>
                  )}
                  <span
                    className={cn(
                      'flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10.5px] font-medium',
                      isTaskDone
                        ? 'border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]'
                        : due.tone === 'overdue'
                          ? 'border-[#fecdd3] bg-[#fff1f2] text-[#be123c]'
                          : due.tone === 'today' || due.tone === 'soon'
                            ? 'border-[#fde68a] bg-[#fffbeb] text-[#b45309]'
                            : 'border-line bg-white text-muted',
                    )}
                  >
                    <CalendarDays size={10} />
                    {isTaskDone ? `${t('Done')} · ${formatShortDate(activeTask.dueDate)}` : due.label}
                  </span>
                </div>

                {(task.blocked || due.tone === 'overdue') && !isTaskDone && (
                  <div
                    className={cn(
                      'mt-4 flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed',
                      task.blocked
                        ? 'border-[#fecdd3] bg-[#fff1f2] text-[#9f1239]'
                        : 'border-[#fde68a] bg-[#fffbeb] text-[#92400e]',
                    )}
                  >
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold">
                        {task.blocked ? t('This task is blocked.') : t('This task is {count} days overdue.', { count: Math.abs(daysToDue) })}
                      </span>
                      {task.blocked && task.blockedReason && <span className="ml-1">{task.blockedReason}</span>}
                    </div>
                  </div>
                )}

                <section className="mt-6">
                  <p className="eyebrow mb-2">{t('Description')}</p>
                  <textarea
                    value={task.description}
                    onChange={(event) => updateTask(task.id, { description: event.target.value })}
                    placeholder={t('Add context, acceptance criteria or links. Autosaved locally.')}
                    className="min-h-[110px] w-full resize-y rounded-xl border border-transparent bg-[#fafafa] px-3.5 py-3 text-[12.5px] leading-[1.7] text-[#374151] outline-none transition-colors placeholder:text-subtle hover:border-line focus:border-[#d8d2ff] focus:bg-white focus:ring-[3px] focus:ring-[#6e56f0]/10"
                  />
                </section>

                <section className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-line bg-[#fcfcfd] p-3.5">
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-subtle">
                      <UserRound size={10} /> {t('Assignee')}
                    </span>
                    <span className="relative block">
                      <select
                        className="w-full cursor-pointer appearance-none border-0 bg-transparent py-1 pr-5 text-[11.5px] font-medium text-ink outline-none"
                        value={task.assigneeId ?? ''}
                        onChange={(event) => updateTask(task.id, { assigneeId: event.target.value || null })}
                      >
                        <option value="">{t('Unassigned')}</option>
                        {data.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={11} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-subtle" />
                    </span>
                  </label>

                  <label className="block border-l border-line pl-3.5">
                    <span className="mb-1 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-subtle">
                      <Flag size={10} /> {t('Priority')}
                    </span>
                    <span className="relative block">
                      <select
                        className="w-full cursor-pointer appearance-none border-0 bg-transparent py-1 pr-5 text-[11.5px] font-medium text-ink outline-none"
                        value={task.priority}
                        onChange={(event) => updateTask(task.id, { priority: event.target.value as Priority })}
                      >
                        {PRIORITIES.map((priority) => (
                          <option key={priority} value={priority}>
                            {t(priority)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={11} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-subtle" />
                    </span>
                  </label>

                  <label className="block border-t border-line pt-3">
                    <span className="mb-1 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-subtle">
                      <CalendarDays size={10} /> {t('Start date')}
                    </span>
                    <input
                      type="date"
                      className="w-full cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-medium text-ink outline-none"
                      value={task.startDate}
                      onChange={(event) => {
                        const startDate = event.target.value
                        if (!startDate) return
                        const patch: { startDate: string; dueDate?: string } = { startDate }
                        if (task.dueDate < startDate) patch.dueDate = startDate
                        updateTask(task.id, patch)
                      }}
                    />
                  </label>

                  <label className="block border-l border-t border-line pl-3.5 pt-3">
                    <span className="mb-1 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-subtle">
                      <CalendarDays size={10} /> {t('Due date')}
                    </span>
                    <input
                      type="date"
                      className="w-full cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-medium text-ink outline-none"
                      value={task.dueDate}
                      min={task.startDate}
                      onChange={(event) => {
                        if (event.target.value) updateTask(task.id, { dueDate: event.target.value })
                      }}
                    />
                  </label>
                </section>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="flex items-center justify-between rounded-xl border border-line bg-white px-3.5 py-2.5">
                    <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
                      <CircleDot size={12} /> {t('Story points')}
                    </span>
                    <select
                      value={task.storyPoints}
                      onChange={(event) => updateTask(task.id, { storyPoints: Number(event.target.value) })}
                      className="cursor-pointer border-0 bg-transparent text-right text-[12px] font-semibold text-ink outline-none"
                    >
                      {[1, 2, 3, 5, 8, 13].map((points) => (
                        <option key={points} value={points}>
                          {points} {t('pts')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={cn('flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 transition-colors', task.blocked ? 'border-[#fecdd3] bg-[#fff1f2]' : 'border-line bg-white')}>
                    <span className={cn('flex items-center gap-1.5 text-[10.5px] font-medium', task.blocked ? 'text-[#be123c]' : 'text-muted')}>
                      <Lock size={11} /> {t('Blocked')}
                    </span>
                    <span
                      className={cn(
                        'relative h-4 w-7 rounded-full transition-colors',
                        task.blocked ? 'bg-[#e11d48]' : 'bg-[#e5e7eb]',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={task.blocked}
                        onChange={(event) =>
                          updateTask(task.id, {
                            blocked: event.target.checked,
                            blockedReason: event.target.checked ? task.blockedReason ?? '' : '',
                          })
                        }
                      />
                      <span
                        className={cn(
                          'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
                          task.blocked ? 'translate-x-3.5' : 'translate-x-0.5',
                        )}
                      />
                    </span>
                  </label>
                </div>

                {task.blocked && (
                  <div className="mt-2 rounded-xl border border-line bg-[#fffafa] p-3">
                    <label className="field-label !text-[9px] text-[#9f1239]" htmlFor="blocked-reason">
                      {t('What is blocking this task?')}
                    </label>
                    <input
                      id="blocked-reason"
                      className="input !py-2 !text-[11.5px]"
                      placeholder={language === 'id' ? 'mis. Menunggu kredensial API produksi' : 'e.g. Waiting on production API credentials'}
                      value={task.blockedReason ?? ''}
                      onChange={(event) => updateTask(task.id, { blockedReason: event.target.value })}
                    />
                  </div>
                )}

                <section className="mt-6">
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="eyebrow flex items-center gap-1.5">
                      <ListChecks size={12} /> {t('Checklist')}
                    </p>
                    <span className="font-mono text-[10px] text-subtle">
                      {checklistDone}/{task.subtasks.length}
                    </span>
                  </div>
                  {task.subtasks.length > 0 && (
                    <div className="mb-2 flex items-center gap-2">
                      <ProgressBar value={checklistPct} height={4} color={checklistPct === 100 ? '#059669' : project.color} />
                      <span className="w-7 text-right font-mono text-[9px] text-subtle">{checklistPct}%</span>
                    </div>
                  )}
                  <div className="overflow-hidden rounded-xl border border-line">
                    {task.subtasks.length === 0 ? (
                      <p className="bg-[#fcfcfd] px-3.5 py-3 text-[11px] text-subtle">{t('No checklist items yet.')}</p>
                    ) : (
                      task.subtasks.map((subtask, index) => (
                        <div
                          key={subtask.id}
                          className={cn(
                            'group flex items-center gap-2.5 bg-white px-3 py-2.5 transition-colors hover:bg-[#fcfcfd]',
                            index !== task.subtasks.length - 1 && 'border-b border-line/80',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSubtask(task.id, subtask.id)}
                            className={cn(
                              'flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px] border transition-all',
                              subtask.done
                                ? 'border-[#059669] bg-[#059669] text-white'
                                : 'border-[#d1d5db] bg-white text-transparent hover:border-[#9ca3af]',
                            )}
                            aria-label={subtask.done ? 'Mark incomplete' : 'Mark complete'}
                          >
                            <Check size={9} strokeWidth={3} />
                          </button>
                          <span
                            className={cn(
                              'min-w-0 flex-1 text-[11.5px] leading-snug',
                              subtask.done ? 'text-subtle line-through decoration-[#d1d5db]' : 'text-[#374151]',
                            )}
                          >
                            {subtask.title}
                          </span>
                          <button
                            type="button"
                            className="rounded p-1 text-[#d4d4d8] opacity-0 transition-all hover:bg-[#fff1f2] hover:text-[#be123c] group-hover:opacity-100"
                            onClick={() => removeSubtask(task.id, subtask.id)}
                            aria-label="Remove checklist item"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))
                    )}
                    <form onSubmit={submitSubtask} className="flex items-center gap-2 border-t border-line bg-[#fcfcfd] px-3 py-2">
                      <Plus size={12} className="text-subtle" />
                      <input
                        value={newSubtask}
                        onChange={(event) => setNewSubtask(event.target.value)}
                        placeholder={t('Add a checklist item…')}
                        className="min-w-0 flex-1 border-0 bg-transparent py-0.5 text-[11.5px] text-ink outline-none placeholder:text-subtle"
                      />
                      {newSubtask && (
                        <button type="submit" className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#5b21b6] hover:bg-white">
                          {t('Add')}
                        </button>
                      )}
                    </form>
                  </div>
                </section>

                <section className="mt-6">
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="eyebrow flex items-center gap-1.5">
                      <MessageSquare size={12} /> {t('Activity')}
                    </p>
                    <span className="text-[10px] text-subtle">
                      {task.comments.length} {t('Comments').toLowerCase()}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {task.comments.length === 0 && (
                      <p className="rounded-xl border border-dashed border-line bg-[#fcfcfd] px-3.5 py-4 text-center text-[11px] text-subtle">
                        {t('No activity yet. Add the first update.')}
                      </p>
                    )}
                    {task.comments.map((entry) => {
                      const member = data.members.find((item) => item.id === entry.authorId)
                      return (
                        <div key={entry.id} className="flex gap-2.5">
                          <Avatar member={member} size={26} />
                          <div className="min-w-0 flex-1 rounded-xl rounded-tl-[4px] border border-line bg-[#fcfcfd] px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10.5px] font-semibold text-ink">{member?.name ?? 'Team member'}</span>
                              <span className="shrink-0 text-[9px] text-subtle">{formatRelativeTime(entry.createdAt)}</span>
                            </div>
                            <p className="mt-1 text-[11.5px] leading-relaxed text-[#4b5563]">{entry.body}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <form onSubmit={submitComment} className="mt-3 rounded-xl border border-line bg-white p-2 shadow-card focus-within:border-[#d8d2ff] focus-within:ring-[3px] focus-within:ring-[#6e56f0]/10">
                    <div className="flex gap-2.5">
                      <Avatar member={data.members.find((member) => member.email === user?.email) ?? data.members.find((member) => member.id === 'alex')} size={25} />
                      <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        placeholder={t('Leave an update for the team…')}
                        rows={2}
                        className="min-w-0 flex-1 resize-none border-0 bg-transparent pt-0.5 text-[11.5px] leading-relaxed text-ink outline-none placeholder:text-subtle"
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between border-t border-line/70 pt-1.5">
                      <span className="pl-9 text-[9px] text-subtle">
                        {t('Commenting as Alex Morgan').replace('Alex Morgan', user?.name ?? 'Alex Morgan')}
                      </span>
                      <button
                        type="submit"
                        disabled={!comment.trim()}
                        className="inline-flex items-center gap-1 rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white transition-opacity hover:bg-[#1f2937] disabled:opacity-30"
                      >
                        {t('Send')} <Send size={9} />
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-[#fcfcfd] px-5 py-3">
              <span className="truncate text-[9.5px] text-subtle">
                {t('Updated')} {formatRelativeTime(task.updatedAt)} · {formatRange(task.startDate, task.dueDate)}
              </span>
              {!deleteArmed ? (
                <button
                  type="button"
                  onClick={() => setDeleteArmed(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-[10.5px] font-medium text-subtle transition-colors hover:bg-[#fff1f2] hover:text-[#be123c]"
                >
                  <Trash2 size={11} /> {t('Delete')}
                </button>
              ) : (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDeleteArmed(false)}
                    className="rounded-md px-2 py-1.5 text-[10.5px] text-muted hover:bg-white"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    className="rounded-md bg-[#be123c] px-2.5 py-1.5 text-[10.5px] font-semibold text-white hover:bg-[#9f1239]"
                  >
                    {t('Delete task')}
                  </button>
                </div>
              )}
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
