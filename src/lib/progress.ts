import type { Project, Sprint, SprintMetrics, Task } from '../types'
import { clamp, daysBetween, sprintDay, todayKey } from './date'

export function getSprintMetrics(
  sprint: Sprint | undefined,
  tasks: Task[],
  referenceDate = todayKey(),
): SprintMetrics {
  const sprintTasks = sprint ? tasks.filter((task) => task.sprintId === sprint.id) : []
  const total = sprintTasks.length
  const done = sprintTasks.filter((task) => task.status === 'done').length
  const pointsTotal = sprintTasks.reduce((sum, task) => sum + task.storyPoints, 0)
  const pointsDone = sprintTasks
    .filter((task) => task.status === 'done')
    .reduce((sum, task) => sum + task.storyPoints, 0)
  const completionPct = total === 0 ? 0 : Math.round((done / total) * 100)
  const pointsCompletionPct = pointsTotal === 0 ? 0 : Math.round((pointsDone / pointsTotal) * 100)
  const blocked = sprintTasks.filter((task) => task.blocked && task.status !== 'done').length

  const totalDays = sprint ? daysBetween(sprint.startDate, sprint.endDate) + 1 : 14
  const rawDay = sprint ? sprintDay(sprint.startDate, referenceDate) : 0
  const currentDay = clamp(rawDay, 0, totalDays)
  const daysRemaining = sprint ? Math.max(0, daysBetween(referenceDate, sprint.endDate)) : 0

  let elapsedPct = 0
  if (sprint) {
    if (referenceDate < sprint.startDate) elapsedPct = 0
    else if (referenceDate > sprint.endDate) elapsedPct = 100
    else elapsedPct = Math.round((currentDay / totalDays) * 100)
  }

  let pace: SprintMetrics['pace'] = 'Upcoming'
  if (sprint?.status === 'completed' || (total > 0 && done === total)) {
    pace = 'Complete'
  } else if (sprint && total > 0 && referenceDate >= sprint.startDate) {
    const delta = completionPct - elapsedPct
    if (delta >= 8) pace = 'Ahead of Schedule'
    else if (delta >= -12) pace = 'On Track'
    else pace = 'At Risk'
  }

  return {
    total,
    done,
    remaining: total - done,
    completionPct,
    pointsTotal,
    pointsDone,
    pointsCompletionPct,
    blocked,
    currentDay,
    totalDays,
    elapsedPct,
    daysRemaining,
    pace,
  }
}

export function getProjectSprints(projectId: string, sprints: Sprint[]): Sprint[] {
  return sprints
    .filter((sprint) => sprint.projectId === projectId)
    .sort((a, b) => b.number - a.number)
}

export function getProjectCurrentSprint(projectId: string, sprints: Sprint[]): Sprint | undefined {
  const forProject = sprints.filter((sprint) => sprint.projectId === projectId)
  const active = forProject.filter((sprint) => sprint.status === 'active').sort((a, b) => a.number - b.number)
  if (active.length > 0) return active[0]
  const planning = forProject.filter((sprint) => sprint.status === 'planning').sort((a, b) => a.number - b.number)
  if (planning.length > 0) return planning[0]
  return forProject.sort((a, b) => b.number - a.number)[0]
}

export function getActiveSprints(projects: Project[], sprints: Sprint[]): Sprint[] {
  const activeProjectIds = new Set(
    projects.filter((project) => project.status === 'Active' || project.status === 'At Risk').map((p) => p.id),
  )
  return sprints
    .filter((sprint) => sprint.status === 'active' && activeProjectIds.has(sprint.projectId))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export function getSprintVelocity(sprints: Sprint[], tasks: Task[], limit = 3): number {
  const completed = sprints
    .filter((sprint) => sprint.status === 'completed')
    .sort((a, b) => b.endDate.localeCompare(a.endDate))
    .slice(0, limit)
  if (completed.length === 0) return 0
  const totalPoints = completed.reduce((sum, sprint) => {
    return (
      sum +
      tasks
        .filter((task) => task.sprintId === sprint.id && task.status === 'done')
        .reduce((points, task) => points + task.storyPoints, 0)
    )
  }, 0)
  return Math.round(totalPoints / completed.length)
}

export function getProjectTeam(projectId: string, tasks: Task[], leadId: string): string[] {
  const assignees = tasks
    .filter((task) => task.projectId === projectId && task.assigneeId)
    .map((task) => task.assigneeId as string)
  return Array.from(new Set([leadId, ...assignees]))
}

export function getPaceTone(pace: SprintMetrics['pace']): string {
  switch (pace) {
    case 'Ahead of Schedule':
      return 'emerald'
    case 'On Track':
      return 'blue'
    case 'At Risk':
      return 'rose'
    case 'Complete':
      return 'slate'
    default:
      return 'amber'
  }
}

export function getPaceCopy(metric: SprintMetrics): string {
  if (metric.pace === 'Upcoming') return 'Sprint not started'
  if (metric.pace === 'Complete') return 'Sprint complete'
  if (metric.pace === 'At Risk') return `${metric.elapsedPct - metric.completionPct}% behind pace`
  if (metric.pace === 'Ahead of Schedule') return `${metric.completionPct - metric.elapsedPct}% ahead of pace`
  return 'Delivery is aligned with pace'
}
