import type { Project, ProjectFilter, Sprint, SprintFilter, Task, WorkspaceData } from '../types'
import { todayKey } from './date'
import { getProjectCurrentSprint } from './progress'

export function getScopedProjects(data: WorkspaceData, projectFilter: ProjectFilter): Project[] {
  if (projectFilter === 'all') return data.projects
  return data.projects.filter((project) => project.id === projectFilter)
}

export function getScopedSprints(
  data: WorkspaceData,
  projectFilter: ProjectFilter,
  sprintFilter: SprintFilter,
): Sprint[] {
  const projects = getScopedProjects(data, projectFilter)
  const projectIds = new Set(projects.map((project) => project.id))
  if (sprintFilter === 'all') {
    return data.sprints.filter((sprint) => projectIds.has(sprint.projectId))
  }
  if (sprintFilter === 'active') {
    return projects
      .map((project) => getProjectCurrentSprint(project.id, data.sprints))
      .filter((sprint): sprint is Sprint => Boolean(sprint))
  }
  return data.sprints.filter((sprint) => sprint.id === sprintFilter)
}

export function getScopeSprintIds(
  data: WorkspaceData,
  projectFilter: ProjectFilter,
  sprintFilter: SprintFilter,
): Set<string> {
  return new Set(getScopedSprints(data, projectFilter, sprintFilter).map((sprint) => sprint.id))
}

export function getScopedTasks(
  data: WorkspaceData,
  projectFilter: ProjectFilter,
  sprintFilter: SprintFilter,
): Task[] {
  const sprintIds = getScopeSprintIds(data, projectFilter, sprintFilter)
  return data.tasks.filter((task) => sprintIds.has(task.sprintId))
}

export function getFocusSprint(
  data: WorkspaceData,
  projectFilter: ProjectFilter,
  sprintFilter: SprintFilter,
  referenceDate = todayKey(),
): Sprint | undefined {
  if (sprintFilter !== 'active' && sprintFilter !== 'all') {
    return data.sprints.find((sprint) => sprint.id === sprintFilter)
  }

  const projects = getScopedProjects(data, projectFilter)
  const candidates = projects
    .map((project) => getProjectCurrentSprint(project.id, data.sprints))
    .filter((sprint): sprint is Sprint => Boolean(sprint))

  return (
    candidates.find(
      (sprint) => sprint.status === 'active' && sprint.startDate <= referenceDate && sprint.endDate >= referenceDate,
    ) ??
    candidates.find((sprint) => sprint.status === 'active') ??
    candidates[0]
  )
}

export function sortTasksForBoard(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.dueDate.localeCompare(b.dueDate)
  })
}
