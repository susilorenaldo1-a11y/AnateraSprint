import type {
  AgreementRecord,
  ClientContact,
  PaymentMilestone,
  Project,
  ProjectDetails,
  ProjectWorkflow,
  ProposalRecord,
  Sprint,
  TeamMember,
  WorkspaceData,
} from '../types'
import { daysBetween, shiftDateKey, todayKey } from './date'

function defaultMilestone(): PaymentMilestone[] {
  return [
    {
      id: 'upfront',
      label: 'Upfront · 50%',
      percentage: 50,
      status: 'pending',
      dueDate: todayKey(),
      note: 'Due before the project kick-off.',
    },
    {
      id: 'completion',
      label: 'After completion · 40%',
      percentage: 40,
      status: 'pending',
      dueDate: shiftDateKey(todayKey(), 45),
      note: 'Due after the final sprint demo and handover.',
    },
    {
      id: 'retention',
      label: '3-month retention · 10%',
      percentage: 10,
      status: 'pending',
      dueDate: shiftDateKey(todayKey(), 135),
      note: 'Due at the end of the three-month retention period.',
    },
  ]
}

function ensureProposal(proposal: Partial<ProposalRecord> | undefined, completed: boolean): ProposalRecord {
  return {
    status: proposal?.status ?? (completed ? 'accepted' : 'draft'),
    notes: proposal?.notes ?? (completed ? 'Proposal recorded for this project.' : ''),
    submittedAt: proposal?.submittedAt,
    document: proposal?.document,
  }
}

function ensureAgreement(agreement: Partial<AgreementRecord> | undefined, completed: boolean): AgreementRecord {
  return {
    status: agreement?.status ?? (completed ? 'signed' : 'pending'),
    notes: agreement?.notes ?? (completed ? 'Agreement recorded for this project.' : ''),
    signedAt: agreement?.signedAt,
    document: agreement?.document,
  }
}

function ensureClientContact(project: Project, lead?: TeamMember): ClientContact {
  return {
    name: project.clientContact?.name ?? lead?.name ?? 'Main contact',
    role: project.clientContact?.role ?? 'Main contact',
    email: project.clientContact?.email ?? lead?.email ?? '',
    phone: project.clientContact?.phone ?? '',
    address: project.clientContact?.address ?? project.client,
  }
}

function ensureProjectDetails(project: Project, sprints: Sprint[]): ProjectDetails {
  const starts = sprints.map((sprint) => sprint.startDate).sort()
  const ends = sprints.map((sprint) => sprint.endDate).sort()
  const workflowValue = Number(project.workflow?.payments?.contractValue ?? 0)
  return {
    type: project.projectDetails?.type ?? 'Product delivery',
    objectives: project.projectDetails?.objectives ?? project.description ?? '',
    contractValue:
      typeof project.projectDetails?.contractValue === 'number'
        ? project.projectDetails.contractValue
        : workflowValue,
    currency: project.projectDetails?.currency ?? project.workflow?.payments?.currency ?? 'USD',
    startDate: project.projectDetails?.startDate ?? starts[0] ?? todayKey(),
    targetEndDate: project.projectDetails?.targetEndDate ?? ends[ends.length - 1] ?? shiftDateKey(todayKey(), 45),
  }
}

function ensureWorkflow(project: Project, details: ProjectDetails): ProjectWorkflow {
  const completed = project.status === 'Active' || project.status === 'At Risk' || project.status === 'Complete'
  const existing = project.workflow
  const existingMilestones = existing?.payments?.milestones
  const milestones =
    existingMilestones && existingMilestones.length === 3
      ? existingMilestones.map((milestone) => {
          const base = defaultMilestone().find((item) => item.id === milestone.id)
          return { ...base, ...milestone }
        })
      : defaultMilestone().map((milestone) => {
          if (completed && milestone.id === 'upfront') {
            return {
              ...milestone,
              status: 'paid' as const,
              dueDate: details.startDate,
              paidAt: project.workflow?.startedAt ?? new Date().toISOString(),
            }
          }
          return {
            ...milestone,
            dueDate:
              milestone.id === 'upfront'
                ? details.startDate
                : milestone.id === 'completion'
                  ? details.targetEndDate
                  : shiftDateKey(details.targetEndDate, 90),
          }
        })

  return {
    proposal: ensureProposal(existing?.proposal, completed),
    agreement: ensureAgreement(existing?.agreement, completed),
    payments: {
      currency: existing?.payments?.currency ?? details.currency,
      contractValue:
        existing?.payments?.contractValue ?? details.contractValue ?? 0,
      milestones,
    },
    startedAt:
      existing?.startedAt ??
      (completed
        ? new Date(`${details.startDate}T10:00:00`).toISOString()
        : undefined),
  }
}

export function createDefaultWorkflow(
  details: Pick<ProjectDetails, 'contractValue' | 'currency' | 'startDate' | 'targetEndDate'>,
): ProjectWorkflow {
  return {
    proposal: { status: 'draft', notes: '' },
    agreement: { status: 'pending', notes: '' },
    payments: {
      currency: details.currency,
      contractValue: details.contractValue,
      milestones: defaultMilestone().map((milestone) => ({
        ...milestone,
        dueDate:
          milestone.id === 'upfront'
            ? details.startDate
            : milestone.id === 'completion'
              ? details.targetEndDate
              : shiftDateKey(details.targetEndDate, 90),
      })),
    },
  }
}

export function normalizeWorkspace(data: WorkspaceData): WorkspaceData {
  const members = Array.isArray(data.members) ? data.members : []
  const sprints = Array.isArray(data.sprints) ? data.sprints : []
  const projects = (Array.isArray(data.projects) ? data.projects : []).map((project) => {
    const projectSprints = sprints.filter((sprint) => sprint.projectId === project.id)
    const lead = members.find((member) => member.id === project.leadId)
    const clientContact = ensureClientContact(project, lead)
    const projectDetails = ensureProjectDetails(project, projectSprints)
    const workflow = ensureWorkflow({ ...project, clientContact, projectDetails }, projectDetails)
    return {
      ...project,
      clientContact,
      projectDetails,
      workflow,
    }
  })

  return {
    ...data,
    projects,
    sprints,
    members,
    tasks: (Array.isArray(data.tasks) ? data.tasks : []).map((task) => ({
      ...task,
      subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
      comments: Array.isArray(task.comments) ? task.comments : [],
      blocked: Boolean(task.blocked),
      order: typeof task.order === 'number' ? task.order : 0,
    })),
  }
}

export function workflowProgress(project: Project): {
  proposalDone: boolean
  agreementDone: boolean
  upfrontPaid: boolean
  started: boolean
  completedSteps: number
  totalSteps: number
  percent: number
} {
  const proposalDone =
    project.workflow.proposal.status === 'submitted' || project.workflow.proposal.status === 'accepted'
  const agreementDone =
    project.workflow.agreement.status === 'uploaded' || project.workflow.agreement.status === 'signed'
  const upfrontPaid = project.workflow.payments.milestones.some(
    (milestone) => milestone.id === 'upfront' && milestone.status === 'paid',
  )
  const started = Boolean(project.workflow.startedAt) || project.status === 'Active' || project.status === 'At Risk'
  const completedSteps = [proposalDone, agreementDone, upfrontPaid, started].filter(Boolean).length
  return {
    proposalDone,
    agreementDone,
    upfrontPaid,
    started,
    completedSteps,
    totalSteps: 4,
    percent: Math.round((completedSteps / 4) * 100),
  }
}

export function paymentAmount(project: Project, milestone: PaymentMilestone): number {
  return Math.round((project.workflow.payments.contractValue * milestone.percentage) / 100)
}

export function formatMoney(amount: number, currency: 'USD' | 'IDR'): string {
  return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function contractDurationLabel(project: Project): string {
  const days = Math.max(1, daysBetween(project.projectDetails.startDate, project.projectDetails.targetEndDate))
  return `${days} days`
}
