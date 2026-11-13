import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, ChevronDown, CircleDot, Flag, UserRound, Zap } from 'lucide-react'
import type { Priority, TaskStatus } from '../types'
import { PRIORITIES, TASK_STATUSES } from '../types'
import { useWorkspace } from '../store/WorkspaceStore'
import { Modal } from './ui'
import { getProjectCurrentSprint } from '../lib/progress'
import { shiftDateKey, todayKey } from '../lib/date'
import { useI18n } from '../i18n/I18nProvider'

export interface TaskComposerPreset {
  projectId?: string
  sprintId?: string
  status?: TaskStatus
  dueDate?: string
  startDate?: string
  title?: string
}

export function TaskComposer({
  open,
  onClose,
  preset,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  preset?: TaskComposerPreset
  onCreated?: (taskId: string) => void
}) {
  const { data, projectFilter, addTask, notify } = useWorkspace()
  const { t, language } = useI18n()

  const defaultProjectId = useMemo(() => {
    if (preset?.projectId) return preset.projectId
    if (projectFilter !== 'all' && data.projects.some((project) => project.id === projectFilter)) {
      return projectFilter
    }
    return data.projects.find((project) => project.status === 'Active')?.id ?? data.projects[0]?.id ?? ''
  }, [preset?.projectId, projectFilter, data.projects])

  const [projectId, setProjectId] = useState(defaultProjectId)
  const [sprintId, setSprintId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<Priority>('Normal')
  const [assigneeId, setAssigneeId] = useState('')
  const [startDate, setStartDate] = useState(todayKey())
  const [dueDate, setDueDate] = useState(shiftDateKey(todayKey(), 2))
  const [storyPoints, setStoryPoints] = useState(3)
  const [error, setError] = useState('')

  const projectSprints = useMemo(
    () =>
      data.sprints
        .filter((sprint) => sprint.projectId === projectId && sprint.status !== 'completed')
        .sort((a, b) => a.number - b.number),
    [data.sprints, projectId],
  )

  useEffect(() => {
    if (!open) return
    const nextProjectId =
      preset?.projectId ??
      (projectFilter !== 'all' && data.projects.some((project) => project.id === projectFilter)
        ? projectFilter
        : data.projects.find((project) => project.status === 'Active')?.id ?? data.projects[0]?.id ?? '')
    const currentSprint =
      (preset?.sprintId && data.sprints.find((sprint) => sprint.id === preset.sprintId)) ||
      getProjectCurrentSprint(nextProjectId, data.sprints)
    setProjectId(nextProjectId)
    setSprintId(currentSprint?.id ?? '')
    setTitle(preset?.title ?? '')
    setDescription('')
    setStatus(preset?.status ?? 'todo')
    setPriority('Normal')
    setAssigneeId('')
    setStartDate(preset?.startDate ?? todayKey())
    setDueDate(preset?.dueDate ?? shiftDateKey(todayKey(), 2))
    setStoryPoints(3)
    setError('')
  }, [open, preset, projectFilter, data.projects, data.sprints])

  function onProjectChange(nextProjectId: string) {
    setProjectId(nextProjectId)
    const sprint = getProjectCurrentSprint(nextProjectId, data.sprints)
    setSprintId(sprint?.id ?? '')
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError(language === 'id' ? 'Beri judul yang jelas untuk tugas ini.' : 'Give the task a clear title.')
      return
    }
    if (!sprintId) {
      setError(language === 'id' ? 'Pilih sprint untuk tugas ini.' : 'Choose a sprint for this task.')
      return
    }
    if (dueDate < startDate) {
      setError(language === 'id' ? 'Tenggat tidak boleh sebelum tanggal mulai.' : 'Due date cannot be before the start date.')
      return
    }
    const task = addTask({
      projectId,
      sprintId,
      title,
      description,
      status,
      priority,
      assigneeId: assigneeId || null,
      startDate,
      dueDate,
      storyPoints,
    })
    notify(
      t('Task {key} created in {status}.', {
        key: task.key,
        status: t(TASK_STATUSES.find((lane) => lane.id === status)?.label ?? 'To Do'),
      }),
    )
    onClose()
    onCreated?.(task.id)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('Create a task')}
      description={t('Add a deliverable to an Anatera 2-week sprint.')}
      width="max-w-[660px]"
      footer={
        <>
          <span className="mr-auto hidden items-center gap-1.5 text-[10.5px] text-subtle sm:flex">
            <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[9px]">âŒ˜</kbd>
            <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[9px]">â†µ</kbd>
            {language === 'id' ? 'untuk membuat' : 'to create'}
          </span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('Cancel')}
          </button>
          <button type="submit" form="new-task-form" className="btn btn-primary" disabled={!projectSprints.length}>
            <Zap size={13} strokeWidth={2.2} />
            {t('Create task')}
          </button>
        </>
      }
    >
      <form id="new-task-form" onSubmit={submit} onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit(event)
      }}>
        <div className="space-y-4">
          <div>
            <label className="field-label" htmlFor="task-title">
              {t('Task title')}
            </label>
            <input
              id="task-title"
              autoFocus
              className="input !py-3 !text-[14px] font-medium"
              placeholder={language === 'id' ? 'mis. Finalisasi model penilaian risiko pemasok' : 'e.g. Finalize supplier risk scoring model'}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setError('')
              }}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="task-description">
              {t('Description')} <span className="font-normal normal-case tracking-normal text-subtle">({language === 'id' ? 'opsional' : 'optional'})</span>
            </label>
            <textarea
              id="task-description"
              className="input min-h-[76px] resize-y leading-relaxed"
              placeholder={t('What does done look like? Add context for the team.')}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">{t('Project')}</span>
              <span className="relative block">
                <span
                  className="absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
                  style={{ backgroundColor: data.projects.find((project) => project.id === projectId)?.color }}
                />
                <select
                  className="input appearance-none pl-7 pr-8"
                  value={projectId}
                  onChange={(event) => onProjectChange(event.target.value)}
                >
                  {data.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle" />
              </span>
            </label>

            <label className="block">
              <span className="field-label">{t('Sprint')}</span>
              <span className="relative block">
                <select
                  className="input appearance-none pr-8"
                  value={sprintId}
                  onChange={(event) => setSprintId(event.target.value)}
                >
                  {projectSprints.length === 0 && <option value="">{t('No live sprint')}</option>}
                  {projectSprints.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name} · {sprint.status === 'active' ? t('Active') : t('Planning')}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle" />
              </span>
              {projectSprints.length === 0 && (
                <span className="mt-1 block text-[10.5px] text-[#b45309]">{t('Create a sprint for this project first.')}</span>
              )}
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">{t('Status')}</span>
              <span className="relative block">
                <CircleDot size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <select
                  className="input appearance-none pl-8 pr-8"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as TaskStatus)}
                >
                  {TASK_STATUSES.map((lane) => (
                    <option key={lane.id} value={lane.id}>
                      {t(lane.label)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle" />
              </span>
            </label>
            <label className="block">
              <span className="field-label">{t('Priority')}</span>
              <span className="relative block">
                <Flag size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <select
                  className="input appearance-none pl-8 pr-8"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Priority)}
                >
                  {PRIORITIES.map((item) => (
                    <option key={item} value={item}>
                      {t(item)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle" />
              </span>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">{t('Assignee')}</span>
              <span className="relative block">
                <UserRound size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <select
                  className="input appearance-none pl-8 pr-8"
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                >
                  <option value="">{t('Unassigned')}</option>
                  {data.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.role}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle" />
              </span>
            </label>
            <label className="block">
              <span className="field-label">{t('Story points')}</span>
              <select
                className="input appearance-none"
                value={storyPoints}
                onChange={(event) => setStoryPoints(Number(event.target.value))}
              >
                {[1, 2, 3, 5, 8, 13].map((points) => (
                  <option key={points} value={points}>
                    {points} {t('pts')}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 rounded-xl border border-line bg-[#fbfbfc] p-3 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">{t('Start date')}</span>
              <span className="relative block">
                <CalendarDays size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <input
                  type="date"
                  className="input appearance-none bg-white pl-8"
                  value={startDate}
                  onChange={(event) => {
                    const next = event.target.value
                    if (!next) return
                    const delta = Math.max(0, Math.round((new Date(dueDate).getTime() - new Date(startDate).getTime()) / 86400000))
                    setStartDate(next)
                    setDueDate(shiftDateKey(next, delta || 2))
                  }}
                />
              </span>
            </label>
            <label className="block">
              <span className="field-label">{t('Due date')}</span>
              <span className="relative block">
                <CalendarDays size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <input
                  type="date"
                  className="input appearance-none bg-white pl-8"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </span>
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-[#fecdd3] bg-[#fff1f2] px-3 py-2 text-[12px] text-[#be123c]">
              {error}
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}

