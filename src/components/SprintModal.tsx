import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarRange, Check, ChevronDown, Sparkles } from 'lucide-react'
import type { SprintStatus } from '../types'
import { useWorkspace } from '../store/WorkspaceStore'
import { daysBetween, formatRange, shiftDateKey, sprintEndFromStart, todayKey } from '../lib/date'
import { Modal, ProjectDot } from './ui'
import { useI18n } from '../i18n/I18nProvider'

export function SprintModal({
  open,
  onClose,
  initialProjectId,
}: {
  open: boolean
  onClose: () => void
  initialProjectId?: string
}) {
  const { data, addSprint, notify } = useWorkspace()
  const { t } = useI18n()
  const [projectId, setProjectId] = useState(initialProjectId ?? data.projects[0]?.id ?? '')
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState(todayKey())
  const [endDate, setEndDate] = useState(sprintEndFromStart(todayKey()))
  const [status, setStatus] = useState<SprintStatus>('planning')
  const [endTouched, setEndTouched] = useState(false)
  const [nameTouched, setNameTouched] = useState(false)
  const [error, setError] = useState('')

  const projectSprints = useMemo(
    () => data.sprints.filter((sprint) => sprint.projectId === projectId),
    [data.sprints, projectId],
  )
  const nextNumber = useMemo(
    () => projectSprints.reduce((max, sprint) => Math.max(max, sprint.number), 0) + 1,
    [projectSprints],
  )
  const autoName = `Sprint ${String(nextNumber).padStart(2, '0')}`
  const duration = daysBetween(startDate, endDate) + 1
  const hasActiveSprint = projectSprints.some((sprint) => sprint.status === 'active')

  function defaultStartFor(project: string): string {
    const sprints = data.sprints.filter((sprint) => sprint.projectId === project)
    const latestEnd = sprints.reduce((max, sprint) => (sprint.endDate > max ? sprint.endDate : max), '')
    if (!latestEnd) return todayKey()
    const next = shiftDateKey(latestEnd, 1)
    return next > todayKey() ? next : todayKey()
  }

  useEffect(() => {
    if (!open) return
    const nextProject = initialProjectId ?? data.projects[0]?.id ?? ''
    const start = defaultStartFor(nextProject)
    setProjectId(nextProject)
    setName('')
    setNameTouched(false)
    setGoal('')
    setStartDate(start)
    setEndDate(sprintEndFromStart(start))
    setEndTouched(false)
    setStatus(
      data.sprints.some(
        (sprint) => sprint.projectId === nextProject && sprint.status === 'active',
      )
        ? 'planning'
        : 'active',
    )
    setError('')
  }, [open, initialProjectId, data.projects, data.sprints])

  function changeProject(nextProjectId: string) {
    setProjectId(nextProjectId)
    const start = defaultStartFor(nextProjectId)
    setStartDate(start)
    setEndDate(sprintEndFromStart(start))
    setEndTouched(false)
    setName('')
    setNameTouched(false)
    setStatus(
      data.sprints.some(
        (sprint) => sprint.projectId === nextProjectId && sprint.status === 'active',
      )
        ? 'planning'
        : 'active',
    )
  }

  function changeStart(next: string) {
    if (!next) return
    setStartDate(next)
    if (!endTouched) setEndDate(sprintEndFromStart(next))
    setError('')
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!projectId) {
      setError(t('Project'))
      return
    }
    if (!startDate || !endDate) {
      setError(t('Start date'))
      return
    }
    if (endDate < startDate) {
      setError(t('The sprint end date needs to be after the start date.'))
      return
    }
    const sprint = addSprint({
      projectId,
      name: nameTouched ? name : autoName,
      startDate,
      endDate,
      goal,
      status,
    })
    notify(`${sprint.name} ${t('Created')} · ${formatRange(startDate, endDate)}.`)
    onClose()
  }

  const project = data.projects.find((item) => item.id === projectId)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('Start a 2-week sprint')}
      description={t('Sprints are fixed to 14-day delivery windows. The end date is set automatically.')}
      width="max-w-[620px]"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('Cancel')}
          </button>
          <button type="submit" form="new-sprint-form" className="btn btn-primary">
            <Sparkles size={13} />
            {t('Create sprint')}
          </button>
        </>
      }
    >
      <form id="new-sprint-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">{t('Project')}</span>
            <span className="relative block">
              {project && (
                <span className="absolute left-3 top-1/2 z-10 h-2 w-2 -translate-y-1/2 rounded-full" style={{ backgroundColor: project.color }} />
              )}
              <select
                className="input appearance-none pl-7 pr-8"
                value={projectId}
                onChange={(event) => changeProject(event.target.value)}
              >
                {data.projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle" />
            </span>
          </label>
          <label className="block">
            <span className="field-label">{t('Sprint name')}</span>
            <input
              className="input"
              value={nameTouched ? name : autoName}
              onChange={(event) => {
                setName(event.target.value)
                setNameTouched(true)
              }}
              placeholder={autoName}
            />
          </label>
        </div>

        <label className="block">
          <span className="field-label">{t('Sprint goal')}</span>
          <textarea
            className="input min-h-[70px] resize-y leading-relaxed"
            placeholder={t('What does a successful 14 days look like?')}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
          />
        </label>

        <div className="rounded-xl border border-line bg-[#fcfcfd] p-3.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">
              <CalendarRange size={13} /> {t('Sprint window')}
            </span>
            <span
              className={`badge ${
                duration === 14 ? 'bg-[#ecfdf5] text-[#047857]' : 'bg-[#fffbeb] text-[#b45309]'
              }`}
            >
              {duration} {t('days')}
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-medium text-muted">{t('Start · Day 1')}</span>
              <input
                type="date"
                className="input bg-white"
                value={startDate}
                onChange={(event) => changeStart(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-medium text-muted">
                {t('End · Day 14 (auto)')}
              </span>
              <input
                type="date"
                className="input bg-white"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value)
                  setEndTouched(true)
                  setError('')
                }}
              />
            </label>
          </div>
          <div className="relative mt-4 h-8 overflow-hidden rounded-md border border-line bg-white">
            <div className="absolute inset-0 grid grid-cols-14" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
              {Array.from({ length: 14 }, (_, index) => (
                <div
                  key={index}
                  className={`border-r border-line/70 last:border-0 ${index === 6 ? 'bg-[#f5f3ff]' : ''}`}
                  title={`Day ${index + 1}`}
                />
              ))}
            </div>
            <div className="relative flex h-full items-center justify-between px-2.5">
              <span className="rounded bg-white/90 px-1 text-[8.5px] font-medium text-muted">Day 1</span>
              <span className="flex items-center gap-1 rounded bg-white/90 px-1 text-[8.5px] font-medium text-[#6d28d9]">
                <span className="h-1 w-1 rounded-full bg-[#6d28d9]" /> Day 7 check-in
              </span>
              <span className="flex items-center gap-1 rounded bg-white/90 px-1 text-[8.5px] font-medium text-ink">
                <Check size={8} /> Day 14 demo
              </span>
            </div>
          </div>
          {!endTouched && (
            <p className="mt-2 text-[10.5px] leading-relaxed text-subtle">
              {t('End date is automatically start date + 13 days. Override it manually if the delivery calendar shifts.')}
            </p>
          )}
          {duration !== 14 && (
            <div className="mt-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-2.5 py-2 text-[10px] leading-relaxed text-[#92400e]">
              {t('This is a non-standard {duration}-day window. You can still create it, but Anatera’s default delivery rhythm is 14 days.', { duration })}
            </div>
          )}
        </div>

        <div>
          <span className="field-label">{t('Sprint state')}</span>
          <div className="grid grid-cols-2 gap-2">
            {(['planning', 'active'] as SprintStatus[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={`flex items-center gap-2 rounded-[10px] border px-3 py-2.5 text-left text-[12px] transition-all ${
                  status === option
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-white text-muted hover:border-line-strong'
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                    status === option ? 'border-white/40 bg-white/15' : 'border-line-strong'
                  }`}
                >
                  {status === option && <Check size={9} />}
                </span>
                <span>
                  <span className="block font-medium">{t(option === 'planning' ? 'Planning' : 'Active')}</span>
                  <span className={`block text-[10px] ${status === option ? 'text-white/55' : 'text-subtle'}`}>
                    {option === 'active' ? t('Visible on live boards') : t('Prepare the backlog')}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {status === 'active' && hasActiveSprint && (
            <p className="mt-1.5 text-[10.5px] text-[#b45309]">
              {t('This project already has an active sprint. Only one sprint should be live at a time.')}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-[#fecdd3] bg-[#fff1f2] px-3 py-2 text-[12px] text-[#be123c]">
            {error}
          </div>
        )}
      </form>
    </Modal>
  )
}

