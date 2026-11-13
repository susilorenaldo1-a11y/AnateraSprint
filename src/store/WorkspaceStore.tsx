import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  BackupFile,
  Comment,
  Priority,
  Project,
  ProjectFilter,
  ProjectStatus,
  Sprint,
  SprintFilter,
  SprintStatus,
  Subtask,
  Task,
  TaskStatus,
  WorkspaceData,
} from '../types'
import { createDemoWorkspace } from '../data/seed'
import { sprintEndFromStart, todayKey } from '../lib/date'
import { normalizeWorkspace, createDefaultWorkflow } from '../lib/normalizeWorkspace'
import { taskNumberFromKey, uid } from '../lib/utils'
import { useI18n } from '../i18n/I18nProvider'
import type { SessionUser } from '../auth/SessionProvider'
import { initials as memberInitials } from '../lib/utils'
const DATA_KEY_PREFIX = 'anatera-sprint-os:data:v2'
const UI_KEY_PREFIX = 'anatera-sprint-os:ui:v2'

export type SyncStatus = 'loading' | 'saved' | 'saving' | 'offline'

function dataKey(userId: string): string {
  return `${DATA_KEY_PREFIX}:${userId}`
}

function uiKey(userId: string): string {
  return `${UI_KEY_PREFIX}:${userId}`
}

interface StoredEnvelope {
  version: 1
  data: WorkspaceData
}

interface StoredUi {
  projectFilter: ProjectFilter
  sprintFilter: SprintFilter
}

interface Toast {
  id: string
  message: string
  tone: 'success' | 'info' | 'error'
}

interface ProjectInput {
  name: string
  code: string
  client: string
  leadId: string
  status: ProjectStatus
  color: string
  description: string
  clientContact: Project['clientContact']
  projectDetails: Project['projectDetails']
}

interface SprintInput {
  projectId: string
  name?: string
  startDate: string
  endDate: string
  goal: string
  status: SprintStatus
}

interface TaskInput {
  projectId: string
  sprintId: string
  title: string
  description?: string
  status?: TaskStatus
  priority?: Priority
  assigneeId?: string | null
  startDate?: string
  dueDate?: string
  storyPoints?: number
  blocked?: boolean
  blockedReason?: string
}

interface WorkspaceContextValue {
  data: WorkspaceData
  projectFilter: ProjectFilter
  sprintFilter: SprintFilter
  toasts: Toast[]
  syncStatus: SyncStatus
  lastSyncedAt: string | null
  retrySync: () => void
  setProjectFilter: (filter: ProjectFilter) => void
  setSprintFilter: (filter: SprintFilter) => void
  addTask: (input: TaskInput) => Task
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  reorderTasks: (updates: { id: string; status: TaskStatus; order: number }[]) => void
  addComment: (taskId: string, authorId: string, body: string) => void
  addSubtask: (taskId: string, title: string) => void
  toggleSubtask: (taskId: string, subtaskId: string) => void
  removeSubtask: (taskId: string, subtaskId: string) => void
  addProject: (input: ProjectInput) => Project
  updateProject: (id: string, patch: Partial<Project>) => void
  addSprint: (input: SprintInput) => Sprint
  updateSprint: (id: string, patch: Partial<Sprint>) => void
  loadDemo: () => void
  resetWorkspace: () => void
  exportBackup: () => void
  importBackup: (text: string) => void
  notify: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

function readStoredData(userId: string): WorkspaceData {
  try {
    const raw = localStorage.getItem(dataKey(userId))
    if (!raw) return createDemoWorkspace()
    const parsed = JSON.parse(raw) as StoredEnvelope
    if (!parsed?.data?.projects || !parsed?.data?.sprints || !parsed?.data?.tasks || !parsed?.data?.members) {
      return createDemoWorkspace()
    }
    return normalizeWorkspace(parsed.data)
  } catch {
    return createDemoWorkspace()
  }
}

function hasStoredData(userId: string): boolean {
  try {
    return Boolean(localStorage.getItem(dataKey(userId)))
  } catch {
    return false
  }
}

function readStoredUi(userId: string): StoredUi {
  try {
    const raw = localStorage.getItem(uiKey(userId))
    if (!raw) return { projectFilter: 'all', sprintFilter: 'active' }
    const parsed = JSON.parse(raw) as StoredUi
    return {
      projectFilter: parsed.projectFilter ?? 'all',
      sprintFilter: parsed.sprintFilter ?? 'active',
    }
  } catch {
    return { projectFilter: 'all', sprintFilter: 'active' }
  }
}

function normalizeImported(raw: unknown): WorkspaceData {
  if (!raw || typeof raw !== 'object') throw new Error('The backup file is empty or invalid.')
  const candidate = raw as Partial<WorkspaceData> & { data?: Partial<WorkspaceData> }
  const payload = candidate.data?.projects ? candidate.data : candidate
  if (
    !Array.isArray(payload.projects) ||
    !Array.isArray(payload.sprints) ||
    !Array.isArray(payload.tasks) ||
    !Array.isArray(payload.members)
  ) {
    throw new Error('Backup is missing projects, sprints, tasks or team members.')
  }
  if (payload.projects.length === 0) throw new Error('Backup does not contain any projects.')

  return normalizeWorkspace({
    projects: payload.projects,
    sprints: payload.sprints,
    tasks: payload.tasks,
    members: payload.members,
  })
}

function withCurrentUser(data: WorkspaceData, user: SessionUser): WorkspaceData {
  if (data.members.some((member) => member.email?.toLowerCase() === user.email.toLowerCase())) {
    return data
  }
  return {
    ...data,
    members: [
      ...data.members,
      {
        id: user.id,
        name: user.name,
        initials: memberInitials(user.name),
        role: 'Workspace owner',
        color: '#0F766E',
        email: user.email,
      },
    ],
  }
}

export function WorkspaceProvider({ children, user }: { children: ReactNode; user: SessionUser }) {
  const userId = user.id
  const { t } = useI18n()
  const [data, setData] = useState<WorkspaceData>(() => withCurrentUser(readStoredData(userId), user))
  const [ui, setUi] = useState<StoredUi>(() => readStoredUi(userId))
  const [toasts, setToasts] = useState<Toast[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const hydratedRef = useRef(false)
  const dirtyRef = useRef(false)
  const skipAutoSaveRef = useRef(false)
  const lastRemoteRef = useRef<string | null>(null)
  const dataRef = useRef(data)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  const saveSnapshot = useCallback(async (snapshot: WorkspaceData): Promise<boolean> => {
    setSyncStatus('saving')
    try {
      const response = await fetch('/api/workspace', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: snapshot }),
      })
      if (!response.ok) throw new Error(`Save failed (${response.status})`)
      const payload = (await response.json()) as { version: number; updatedAt: string }
      dirtyRef.current = false
      lastRemoteRef.current = payload.updatedAt
      setLastSyncedAt(payload.updatedAt)
      setSyncStatus('saved')
      return true
    } catch {
      setSyncStatus('offline')
      return false
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        const response = await fetch('/api/workspace', { credentials: 'same-origin' })
        if (!response.ok) throw new Error('Workspace unavailable')
        const payload = (await response.json()) as {
          data: WorkspaceData | null
          version: number
          updatedAt: string | null
        }
        if (cancelled) return

        if (payload.data) {
          skipAutoSaveRef.current = true
          setData(withCurrentUser(normalizeWorkspace(payload.data), user))
          lastRemoteRef.current = payload.updatedAt
          setLastSyncedAt(payload.updatedAt)
          setSyncStatus('saved')
        } else {
          const initial = withCurrentUser(
            hasStoredData(userId) ? dataRef.current : createDemoWorkspace(),
            user,
          )
          skipAutoSaveRef.current = true
          setData(initial)
          const saved = await saveSnapshot(initial)
          if (saved) setSyncStatus('saved')
        }
      } catch {
        if (!cancelled) setSyncStatus('offline')
      } finally {
        if (!cancelled) {
          hydratedRef.current = true
          setHydrated(true)
        }
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [userId, saveSnapshot, user])

  useEffect(() => {
    try {
      localStorage.setItem(dataKey(userId), JSON.stringify({ version: 1, data } satisfies StoredEnvelope))
    } catch {
      // Storage can be unavailable in private browsing; server sync still works.
    }
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false
      return
    }
    if (!hydratedRef.current) return

    dirtyRef.current = true
    setSyncStatus('saving')
    const timeout = window.setTimeout(() => {
      void saveSnapshot(data)
    }, 700)
    return () => window.clearTimeout(timeout)
  }, [data, userId, saveSnapshot])

  useEffect(() => {
    try {
      localStorage.setItem(uiKey(userId), JSON.stringify(ui))
    } catch {
      // Ignore storage failures for view preferences.
    }
  }, [ui, userId])

  useEffect(() => {
    if (!hydrated) return
    const interval = window.setInterval(async () => {
      if (dirtyRef.current) return
      try {
        const response = await fetch('/api/workspace', { credentials: 'same-origin' })
        if (!response.ok) return
        const payload = (await response.json()) as {
          data: WorkspaceData | null
          version: number
          updatedAt: string | null
        }
        if (
          payload.data &&
          payload.updatedAt &&
          payload.updatedAt !== lastRemoteRef.current
        ) {
          skipAutoSaveRef.current = true
          dirtyRef.current = false
          lastRemoteRef.current = payload.updatedAt
          setData(normalizeWorkspace(payload.data))
          setLastSyncedAt(payload.updatedAt)
          setSyncStatus('saved')
        }
      } catch {
        setSyncStatus((current) => (current === 'saving' ? current : 'offline'))
      }
    }, 5000)
    return () => window.clearInterval(interval)
  }, [hydrated])

  const retrySync = useCallback(() => {
    void saveSnapshot(dataRef.current)
  }, [saveSnapshot])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: Toast['tone'] = 'success') => {
      const id = uid('toast')
      setToasts((current) => [...current.slice(-2), { id, message, tone }])
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
      }, 3600)
    },
    [],
  )

  const setProjectFilter = useCallback((projectFilter: ProjectFilter) => {
    setUi({ projectFilter, sprintFilter: 'active' })
  }, [])

  const setSprintFilter = useCallback((sprintFilter: SprintFilter) => {
    setUi((current) => ({ ...current, sprintFilter }))
  }, [])

  const addTask = useCallback(
    (input: TaskInput): Task => {
      const project = data.projects.find((item) => item.id === input.projectId)
      if (!project) throw new Error('Project not found')
      const numberedKeys = data.tasks
        .filter((task) => task.projectId === input.projectId)
        .map((task) => taskNumberFromKey(task.key))
      const nextNumber = Math.max(100, ...numberedKeys) + 1
      const now = new Date().toISOString()
      const sameLane = data.tasks.filter(
        (task) => task.sprintId === input.sprintId && task.status === (input.status ?? 'backlog'),
      )
      const nextOrder = sameLane.reduce((max, task) => Math.max(max, task.order), 0) + 1
      const task: Task = {
        id: uid('task'),
        key: `${project.code}-${nextNumber}`,
        projectId: input.projectId,
        sprintId: input.sprintId,
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        status: input.status ?? 'backlog',
        priority: input.priority ?? 'Normal',
        assigneeId: input.assigneeId ?? null,
        startDate: input.startDate ?? todayKey(),
        dueDate: input.dueDate ?? todayKey(),
        storyPoints: input.storyPoints ?? 3,
        subtasks: [],
        comments: [],
        blocked: input.blocked ?? false,
        blockedReason: input.blockedReason,
        order: nextOrder,
        createdAt: now,
        updatedAt: now,
      }
      setData((current) => ({ ...current, tasks: [task, ...current.tasks] }))
      return task
    },
    [data.projects, data.tasks],
  )

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task,
      ),
    }))
  }, [])

  const deleteTask = useCallback((id: string) => {
    setData((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }))
  }, [])

  const reorderTasks = useCallback((updates: { id: string; status: TaskStatus; order: number }[]) => {
    const updateMap = new Map(updates.map((update) => [update.id, update]))
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        const update = updateMap.get(task.id)
        return update ? { ...task, status: update.status, order: update.order } : task
      }),
    }))
  }, [])

  const addComment = useCallback((taskId: string, authorId: string, body: string) => {
    const comment: Comment = {
      id: uid('comment'),
      authorId,
      body: body.trim(),
      createdAt: new Date().toISOString(),
    }
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId
          ? { ...task, comments: [...task.comments, comment], updatedAt: new Date().toISOString() }
          : task,
      ),
    }))
  }, [])

  const addSubtask = useCallback((taskId: string, title: string) => {
    const subtask: Subtask = { id: uid('subtask'), title: title.trim(), done: false }
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId ? { ...task, subtasks: [...task.subtasks, subtask] } : task,
      ),
    }))
  }, [])

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((subtask) =>
                subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask,
              ),
            }
          : task,
      ),
    }))
  }, [])

  const removeSubtask = useCallback((taskId: string, subtaskId: string) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId
          ? { ...task, subtasks: task.subtasks.filter((subtask) => subtask.id !== subtaskId) }
          : task,
      ),
    }))
  }, [])

  const addProject = useCallback((input: ProjectInput): Project => {
    const now = new Date().toISOString()
    const project: Project = {
      ...input,
      id: uid('project'),
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      client: input.client.trim(),
      createdAt: now,
      workflow: createDefaultWorkflow(input.projectDetails),
    }
    setData((current) => ({ ...current, projects: [...current.projects, project] }))
    setUi({ projectFilter: project.id, sprintFilter: 'active' })
    return project
  }, [])

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setData((current) => ({
      ...current,
      projects: current.projects.map((project) => (project.id === id ? { ...project, ...patch } : project)),
    }))
  }, [])

  const addSprint = useCallback(
    (input: SprintInput): Sprint => {
      const projectSprints = data.sprints.filter((sprint) => sprint.projectId === input.projectId)
      const number = projectSprints.reduce((max, sprint) => Math.max(max, sprint.number), 0) + 1
      const sprint: Sprint = {
        id: uid('sprint'),
        projectId: input.projectId,
        name: input.name?.trim() || `Sprint ${String(number).padStart(2, '0')}`,
        number,
        startDate: input.startDate,
        endDate: input.endDate || sprintEndFromStart(input.startDate),
        goal: input.goal.trim(),
        status: input.status,
        createdAt: new Date().toISOString(),
      }
      setData((current) => ({ ...current, sprints: [...current.sprints, sprint] }))
      setUi({ projectFilter: input.projectId, sprintFilter: sprint.id })
      return sprint
    },
    [data.sprints],
  )

  const updateSprint = useCallback((id: string, patch: Partial<Sprint>) => {
    setData((current) => ({
      ...current,
      sprints: current.sprints.map((sprint) => (sprint.id === id ? { ...sprint, ...patch } : sprint)),
    }))
  }, [])

  const resetWorkspace = useCallback(() => {
    setData({ projects: [], sprints: [], tasks: [], members: data.members })
    setUi({ projectFilter: 'all', sprintFilter: 'active' })
  }, [data.members])

  const loadDemo = useCallback(() => {
    setData(createDemoWorkspace())
    setUi({ projectFilter: 'all', sprintFilter: 'active' })
    notify('Anatera demo sprints loaded — 4 projects, 3 live sprints.', 'success')
  }, [notify])

  const exportBackup = useCallback(() => {
    const backup: BackupFile = {
      format: 'anatera-sprint-os',
      version: 1,
      exportedAt: new Date().toISOString(),
      ...data,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `anatera-sprint-os-${todayKey()}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    notify('Workspace backup exported as JSON.', 'success')
  }, [data, notify])

  const importBackup = useCallback(
    (text: string) => {
      try {
        const parsed: unknown = JSON.parse(text)
        const normalized = normalizeImported(parsed)
        setData(normalized)
        setUi({
          projectFilter: 'all',
          sprintFilter: 'active',
        })
        notify('Workspace imported successfully.', 'success')
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Could not import that backup.', 'error')
        throw error
      }
    },
    [notify],
  )

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      data,
      projectFilter: ui.projectFilter,
      sprintFilter: ui.sprintFilter,
      toasts,
      syncStatus,
      lastSyncedAt,
      retrySync,
      setProjectFilter,
      setSprintFilter,
      addTask,
      updateTask,
      deleteTask,
      reorderTasks,
      addComment,
      addSubtask,
      toggleSubtask,
      removeSubtask,
      addProject,
      updateProject,
      addSprint,
      updateSprint,
      loadDemo,
      resetWorkspace,
      exportBackup,
      importBackup,
      notify,
      dismissToast,
    }),
    [
      data,
      ui,
      toasts,
      syncStatus,
      lastSyncedAt,
      retrySync,
      setProjectFilter,
      setSprintFilter,
      addTask,
      updateTask,
      deleteTask,
      reorderTasks,
      addComment,
      addSubtask,
      toggleSubtask,
      removeSubtask,
      addProject,
      updateProject,
      addSprint,
      updateSprint,
      loadDemo,
      resetWorkspace,
      exportBackup,
      importBackup,
      notify,
      dismissToast,
    ],
  )

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-[#111827] shadow-[0_12px_30px_-12px_rgba(17,24,39,0.45)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
              <path d="M5 19L10.6 5.4a1.45 1.45 0 0 1 2.68 0L19 19" stroke="white" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7.5 14.1h8.4" stroke="#A99BFF" strokeWidth="2.15" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[12px] font-medium text-ink">{t('Loading workspace…')}</p>
            <p className="mt-1 text-[9.5px] text-subtle">anatera · Sprint OS</p>
          </div>
          <span className="h-1 w-16 overflow-hidden rounded-full bg-[#eceef2]">
            <span className="block h-full w-1/2 animate-pulse rounded-full bg-[#6E56F0]" />
          </span>
        </div>
      </div>
    )
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return context
}
