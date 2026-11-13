import { CalendarDays, Check, GripVertical, ListChecks, Lock, MessageCircle } from 'lucide-react'
import type { Project, Task, TeamMember } from '../../types'
import { PriorityBadge, ProjectDot } from '../ui'
import { dueLabel, formatShortDate } from '../../lib/date'
import { cn } from '../../lib/utils'

export function TaskCard({
  task,
  project,
  assignee,
  onClick,
  dragging = false,
  overlay = false,
  projectFilter,
}: {
  task: Task
  project: Project
  assignee?: TeamMember | null
  onClick?: () => void
  dragging?: boolean
  overlay?: boolean
  projectFilter?: string
}) {
  const due = dueLabel(task.dueDate)
  const checklistDone = task.subtasks.filter((subtask) => subtask.done).length
  const isDone = task.status === 'done'
  const showProject = true

  return (
    <div
      onClick={onClick}
      className={cn(
        'group/card relative cursor-grab rounded-[11px] border border-line bg-white p-3 shadow-[0_1px_2px_rgba(17,24,39,0.035)] transition-all duration-150 hover:border-[#d9dbe2] hover:shadow-[0_4px_14px_-6px_rgba(17,24,39,0.14)] active:cursor-grabbing',
        dragging && 'opacity-30',
        overlay && 'rotate-[1.5deg] cursor-grabbing border-[#cbc3ff] shadow-[0_20px_45px_-18px_rgba(17,24,39,0.36)]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="font-mono text-[9px] font-medium tracking-[0.01em] text-subtle">{task.key}</span>
          {showProject && (
            <span
              className="inline-flex max-w-[88px] items-center gap-1 rounded px-1 py-0.5 text-[8.5px] font-medium"
              style={{ backgroundColor: `${project.color}0f`, color: project.color }}
            >
              <ProjectDot color={project.color} size={4} />
              <span className="truncate">{project.code}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <PriorityBadge priority={task.priority} compact />
          <GripVertical
            size={12}
            className="-mr-1 shrink-0 text-[#d4d4d8] opacity-0 transition-opacity group-hover/card:opacity-100"
          />
        </div>
      </div>

      <p
        className={cn(
          'mt-1.5 line-clamp-2 text-[12px] font-medium leading-[1.45] tracking-[-0.005em]',
          isDone ? 'text-[#6b7280]' : 'text-ink',
        )}
      >
        {task.title}
      </p>

      {task.blocked && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-[#fff1f2] px-2 py-1">
          <Lock size={9} className="shrink-0 text-[#be123c]" />
          <span className="truncate text-[9px] font-medium text-[#be123c]">
            {task.blockedReason || 'Blocked'}
          </span>
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {assignee ? (
            <span
              className="flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full text-[7.5px] font-semibold text-white"
              style={{ backgroundColor: assignee.color }}
              title={`${assignee.name} · ${assignee.role}`}
            >
              {assignee.initials}
            </span>
          ) : (
            <span className="flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-[8px] text-subtle">
              —
            </span>
          )}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-1 text-[9px] font-medium',
              isDone
                ? 'bg-[#f4f4f5] text-subtle'
                : due.tone === 'overdue'
                  ? 'bg-[#fff1f2] text-[#be123c]'
                  : due.tone === 'today' || due.tone === 'soon'
                    ? 'bg-[#fffbeb] text-[#b45309]'
                    : 'bg-[#fafafa] text-muted',
            )}
          >
            {isDone ? <Check size={9} /> : <CalendarDays size={9} />}
            {isDone ? formatShortDate(task.dueDate) : due.label}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[9px] text-subtle">
          {task.comments.length > 0 && (
            <span className="inline-flex items-center gap-0.5" title={`${task.comments.length} comments`}>
              <MessageCircle size={9} />
              {task.comments.length}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5',
                checklistDone === task.subtasks.length && 'text-[#047857]',
              )}
              title={`${checklistDone} of ${task.subtasks.length} checklist items complete`}
            >
              <ListChecks size={9} />
              {checklistDone}/{task.subtasks.length}
            </span>
          )}
          <span className="rounded border border-line/80 bg-white px-1 py-0.5 font-mono text-[8px] text-subtle">
            {task.storyPoints}
          </span>
        </div>
      </div>
    </div>
  )
}

