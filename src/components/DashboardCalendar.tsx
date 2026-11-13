import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Project, Sprint, Task } from '../types'
import { cn } from '../lib/utils'
import {
  addMonths,
  formatMonthYear,
  getMonthMatrix,
  isSameMonth,
  subMonths,
  todayKey,
} from '../lib/date'
import { useI18n } from '../i18n/I18nProvider'

export function DashboardCalendar({
  tasks,
  sprints,
  projects,
}: {
  tasks: Task[]
  sprints: Sprint[]
  projects: Project[]
}) {
  const [monthDate, setMonthDate] = useState(() => new Date())
  const navigate = useNavigate()
  const { t, language } = useI18n()
  const days = useMemo(() => getMonthMatrix(monthDate), [monthDate])
  const today = todayKey()

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    tasks.forEach((task) => {
      const list = map.get(task.dueDate) ?? []
      list.push(task)
      map.set(task.dueDate, list)
    })
    return map
  }, [tasks])

  const deadlineCount = tasks.filter((task) => {
    const date = new Date(`${task.dueDate}T12:00:00`)
    return date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear()
  }).length

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">{t('Delivery calendar')}</h2>
          <p className="mt-0.5 text-[10px] text-subtle">
            {deadlineCount} {language === 'id' ? 'tenggat' : `deadline${deadlineCount === 1 ? '' : 's'}`}{' '}
            {language === 'id' ? 'bulan ini' : 'this month'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-[#f4f4f5] hover:text-ink"
            onClick={() => setMonthDate((date) => subMonths(date, 1))}
            aria-label={t('Previous month')}
          >
            <ChevronLeft size={12} />
          </button>
          <span className="min-w-[96px] text-center text-[10px] font-medium text-ink">{formatMonthYear(monthDate)}</span>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-[#f4f4f5] hover:text-ink"
            onClick={() => setMonthDate((date) => addMonths(date, 1))}
            aria-label={t('Next month')}
          >
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      <div className="px-3 pb-2 pt-2">
        <div className="grid grid-cols-7">
          {(language === 'id'
            ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
            : ['M', 'T', 'W', 'T', 'F', 'S', 'S']
          ).map((day, index) => (
            <span
              key={`${day}-${index}`}
              className="pb-1 text-center text-[8px] font-semibold uppercase tracking-[0.05em] text-subtle"
            >
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((date) => {
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            const dayTasks = tasksByDate.get(dateKey) ?? []
            const inMonth = isSameMonth(date, monthDate)
            const isToday = dateKey === today
            const visibleProjects = Array.from(new Set(dayTasks.map((task) => task.projectId))).slice(0, 3)
            const hasSprintStart = sprints.some((sprint) => sprint.startDate === dateKey)
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => navigate('/calendar')}
                className={cn(
                  'relative flex h-[38px] flex-col items-center justify-center rounded-md transition-colors',
                  inMonth ? 'hover:bg-[#f4f4f5]' : 'opacity-35',
                  isToday && 'bg-ink text-white hover:bg-ink',
                )}
                title={
                  dayTasks.length > 0
                    ? dayTasks.map((task) => task.title).join(' · ')
                    : t('Open sprint calendar')
                }
              >
                <span className={cn('text-[9.5px] font-medium leading-none', isToday ? 'text-white' : 'text-ink')}>
                  {date.getDate()}
                </span>
                <span className="mt-1 flex h-1.5 items-center gap-0.5">
                  {visibleProjects.map((projectId) => {
                    const project = projects.find((item) => item.id === projectId)
                    return (
                      <span
                        key={projectId}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: isToday ? '#fff' : project?.color ?? '#6E56F0' }}
                      />
                    )
                  })}
                  {dayTasks.length > 3 && <span className="text-[6px] text-subtle">+</span>}
                </span>
                {hasSprintStart && !isToday && (
                  <span className="absolute left-1 top-1 h-1 w-1 rounded-full bg-[#6E56F0]" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate('/calendar')}
        className="flex w-full items-center justify-between border-t border-line px-3.5 py-2.5 text-[10px] font-medium text-muted transition-colors hover:bg-[#fcfcfd] hover:text-ink"
      >
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            {projects.slice(0, 4).map((project) => (
              <span key={project.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
            ))}
          </span>
          {t('{count} live sprints', {
            count: sprints.filter((sprint) => sprint.status === 'active').length,
          })}
        </span>
        <span className="inline-flex items-center gap-1">
          {t('Sprints')} <ArrowUpRight size={10} />
        </span>
      </button>
    </section>
  )
}
