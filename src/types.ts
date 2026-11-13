export type ProjectStatus = 'Active' | 'At Risk' | 'Planning' | 'Complete'
export type SprintStatus = 'active' | 'planning' | 'completed'
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done'
export type Priority = 'Urgent' | 'High' | 'Normal' | 'Low'
export type Currency = 'USD' | 'IDR'

export interface ProjectDocument {
  id: string
  name: string
  mimeType: string
  size: number
  dataUrl: string
  uploadedAt: string
}

export interface ClientContact {
  name: string
  role: string
  email: string
  phone: string
  address: string
}

export interface ProjectDetails {
  type: string
  objectives: string
  contractValue: number
  currency: Currency
  startDate: string
  targetEndDate: string
}

export type ProposalStatus = 'draft' | 'submitted' | 'accepted'
export type AgreementStatus = 'pending' | 'uploaded' | 'signed'
export type PaymentMilestoneStatus = 'pending' | 'invoiced' | 'paid'
export type PaymentMilestoneId = 'upfront' | 'completion' | 'retention'

export interface ProposalRecord {
  status: ProposalStatus
  notes: string
  submittedAt?: string
  document?: ProjectDocument
}

export interface AgreementRecord {
  status: AgreementStatus
  notes: string
  signedAt?: string
  document?: ProjectDocument
}

export interface PaymentMilestone {
  id: PaymentMilestoneId
  label: string
  percentage: number
  status: PaymentMilestoneStatus
  dueDate?: string
  paidAt?: string
  note?: string
}

export interface PaymentWorkflow {
  currency: Currency
  contractValue: number
  milestones: PaymentMilestone[]
}

export interface ProjectWorkflow {
  proposal: ProposalRecord
  agreement: AgreementRecord
  payments: PaymentWorkflow
  startedAt?: string
}

export interface TeamMember {
  id: string
  name: string
  initials: string
  role: string
  color: string
  email?: string
}

export interface Project {
  id: string
  name: string
  code: string
  client: string
  leadId: string
  status: ProjectStatus
  color: string
  description: string
  createdAt: string
  clientContact: ClientContact
  projectDetails: ProjectDetails
  workflow: ProjectWorkflow
}

export interface Sprint {
  id: string
  projectId: string
  name: string
  number: number
  startDate: string
  endDate: string
  goal: string
  status: SprintStatus
  createdAt: string
}

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Comment {
  id: string
  authorId: string
  body: string
  createdAt: string
}

export interface Task {
  id: string
  key: string
  projectId: string
  sprintId: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  assigneeId: string | null
  startDate: string
  dueDate: string
  storyPoints: number
  subtasks: Subtask[]
  comments: Comment[]
  blocked: boolean
  blockedReason?: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface WorkspaceData {
  projects: Project[]
  sprints: Sprint[]
  tasks: Task[]
  members: TeamMember[]
}

export interface BackupFile extends WorkspaceData {
  format: 'anatera-sprint-os'
  version: 1
  exportedAt: string
}

export type ProjectFilter = 'all' | string
export type SprintFilter = 'active' | 'all' | string

export interface SprintMetrics {
  total: number
  done: number
  remaining: number
  completionPct: number
  pointsTotal: number
  pointsDone: number
  pointsCompletionPct: number
  blocked: number
  currentDay: number
  totalDays: number
  elapsedPct: number
  daysRemaining: number
  pace: PaceState
}

export type PaceState = 'Ahead of Schedule' | 'On Track' | 'At Risk' | 'Upcoming' | 'Complete'

export const TASK_STATUSES: { id: TaskStatus; label: string; shortLabel: string }[] = [
  { id: 'backlog', label: 'Backlog', shortLabel: 'Backlog' },
  { id: 'todo', label: 'To Do', shortLabel: 'To Do' },
  { id: 'in_progress', label: 'In Progress', shortLabel: 'In Progress' },
  { id: 'in_review', label: 'In Review / QA', shortLabel: 'Review / QA' },
  { id: 'done', label: 'Done', shortLabel: 'Done' },
]

export const PRIORITIES: Priority[] = ['Urgent', 'High', 'Normal', 'Low']

export const PROJECT_STATUSES: ProjectStatus[] = ['Active', 'At Risk', 'Planning', 'Complete']
