import type {
  Comment,
  Priority,
  Project,
  ProjectWorkflow,
  Sprint,
  Subtask,
  Task,
  TaskStatus,
  TeamMember,
  WorkspaceData,
} from '../types'
import { shiftDateKey, todayKey } from '../lib/date'

const isoNow = () => new Date().toISOString()
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString()

const members: TeamMember[] = [
  {
    id: 'maya',
    name: 'Maya Chen',
    initials: 'MC',
    role: 'Product Lead',
    color: '#6E56F0',
    email: 'maya@anatera.co',
  },
  {
    id: 'jonah',
    name: 'Jonah Park',
    initials: 'JP',
    role: 'Design Lead',
    color: '#C2415D',
    email: 'jonah@anatera.co',
  },
  {
    id: 'alex',
    name: 'Alex Morgan',
    initials: 'AM',
    role: 'Delivery Lead',
    color: '#111827',
    email: 'alex@anatera.co',
  },
  {
    id: 'priya',
    name: 'Priya Nair',
    initials: 'PN',
    role: 'Engineering Lead',
    color: '#0E9384',
    email: 'priya@anatera.co',
  },
  {
    id: 'sam',
    name: 'Sam Rivera',
    initials: 'SR',
    role: 'Full-stack Engineer',
    color: '#2563EB',
    email: 'sam@anatera.co',
  },
  {
    id: 'noor',
    name: 'Noor Haddad',
    initials: 'NH',
    role: 'AI Engineer',
    color: '#B45309',
    email: 'noor@anatera.co',
  },
  {
    id: 'luca',
    name: 'Luca Bianchi',
    initials: 'LB',
    role: 'QA Engineer',
    color: '#475569',
    email: 'luca@anatera.co',
  },
  {
    id: 'emma',
    name: 'Emma Fischer',
    initials: 'EF',
    role: 'Frontend Engineer',
    color: '#7C3AED',
    email: 'emma@anatera.co',
  },
]

const projectSpecs: Omit<Project, 'createdAt' | 'clientContact' | 'projectDetails' | 'workflow'>[] = [
  {
    id: 'northwind',
    name: 'Northwind AI Copilot',
    code: 'NWC',
    client: 'Northwind Logistics',
    leadId: 'maya',
    status: 'Active',
    color: '#6E56F0',
    description: 'AI copilot for procurement and shipment exceptions across Northwind’s carrier network.',
  },
  {
    id: 'verity',
    name: 'Verity Client Portal',
    code: 'VCP',
    client: 'Verity Health',
    leadId: 'jonah',
    status: 'Active',
    color: '#0E9384',
    description: 'A secure, patient-first portal that gives Verity’s care teams one calm place to coordinate.',
  },
  {
    id: 'gtm',
    name: 'Anatera GTM Engine',
    code: 'GTM',
    client: 'Internal',
    leadId: 'alex',
    status: 'At Risk',
    color: '#D97706',
    description: 'Anatera’s internal growth engine — positioning, pipeline and proof for the 14-day delivery offer.',
  },
  {
    id: 'helio',
    name: 'Helio Onboarding',
    code: 'HEL',
    client: 'Helio Energy',
    leadId: 'priya',
    status: 'Planning',
    color: '#2563EB',
    description: 'A guided onboarding experience for Helio’s commercial energy customers.',
  },
]

function createSprint(
  id: string,
  projectId: string,
  number: number,
  startDate: string,
  endDate: string,
  status: Sprint['status'],
  goal: string,
): Sprint {
  return {
    id,
    projectId,
    name: `Sprint ${String(number).padStart(2, '0')}`,
    number,
    startDate,
    endDate,
    goal,
    status,
    createdAt: isoNow(),
  }
}

export function createDemoWorkspace(anchor = todayKey()): WorkspaceData {
  const date = (offset: number) => shiftDateKey(anchor, offset)
  const isoAt = (offset: number) => new Date(`${date(offset)}T10:00:00`).toISOString()
  const now = isoNow()

  interface ProjectMeta {
    clientContact: Project['clientContact']
    projectType: string
    objectives: string
    contractValue: number
    currency: Project['projectDetails']['currency']
    startOffset: number
    targetOffset: number
    startedOffset?: number
    proposalStatus: Project['workflow']['proposal']['status']
    proposalSubmittedOffset?: number
    proposalNotes: string
    agreementStatus: Project['workflow']['agreement']['status']
    agreementSignedOffset?: number
    agreementNotes: string
    upfrontPaidOffset?: number
  }

  const metaByProject: Record<string, ProjectMeta> = {
    northwind: {
      clientContact: {
        name: 'Daniel Tan',
        role: 'VP Operations',
        email: 'daniel.tan@northwind.co',
        phone: '+65 8123 4490',
        address: '18 Cross Street, #12-01, Singapore 048423',
      },
      projectType: 'AI copilot',
      objectives:
        'Cut exception handling time by 40% and give procurement one explainable view of supplier risk.',
      contractValue: 32000,
      currency: 'USD',
      startOffset: -42,
      targetOffset: 5,
      startedOffset: -40,
      proposalStatus: 'accepted',
      proposalSubmittedOffset: -46,
      proposalNotes: 'Accepted after the discovery workshop. Scope covers risk scoring, exception triage and eval harness.',
      agreementStatus: 'signed',
      agreementSignedOffset: -43,
      agreementNotes: 'Master services agreement signed by Northwind procurement and Anatera.',
      upfrontPaidOffset: -42,
    },
    verity: {
      clientContact: {
        name: 'Dr. Elise Hartono',
        role: 'Chief Digital Officer',
        email: 'e.hartono@verityhealth.id',
        phone: '+62 811 204 778',
        address: 'Jl. Senopati No. 88, Jakarta 12190',
      },
      projectType: 'Client portal',
      objectives:
        'Give care teams one secure place to coordinate patient intake, records and follow-up without losing the human touch.',
      contractValue: 420_000_000,
      currency: 'IDR',
      startOffset: -34,
      targetOffset: 9,
      startedOffset: -32,
      proposalStatus: 'accepted',
      proposalSubmittedOffset: -38,
      proposalNotes: 'Two-phase proposal approved: portal foundation in sprint one, intake and compliance in sprint two.',
      agreementStatus: 'signed',
      agreementSignedOffset: -35,
      agreementNotes: 'Signed agreement includes the HIPAA data-processing addendum.',
      upfrontPaidOffset: -34,
    },
    gtm: {
      clientContact: {
        name: 'Alex Morgan',
        role: 'Delivery Lead',
        email: 'alex@anatera.co',
        phone: '+62 812 9900 441',
        address: 'Anatera Studio, Jl. Kemang Raya, Jakarta',
      },
      projectType: 'Internal growth',
      objectives:
        'Build a repeatable growth engine for Anatera’s 14-day delivery offer with proof-led content and a working lead funnel.',
      contractValue: 240_000_000,
      currency: 'IDR',
      startOffset: -39,
      targetOffset: 2,
      startedOffset: -37,
      proposalStatus: 'accepted',
      proposalSubmittedOffset: -42,
      proposalNotes: 'Internal proposal approved by the Anatera leadership team.',
      agreementStatus: 'signed',
      agreementSignedOffset: -40,
      agreementNotes: 'Internal delivery agreement recorded.',
      upfrontPaidOffset: -39,
    },
    helio: {
      clientContact: {
        name: 'Rani Kusuma',
        role: 'Head of Commercial',
        email: 'rani.kusuma@helioenergy.co.id',
        phone: '+62 813 5500 218',
        address: 'Jl. TB Simatupang No. 21, Jakarta 12430',
      },
      projectType: 'Onboarding product',
      objectives:
        'Turn a complex commercial energy onboarding journey into a guided, measurable experience for Helio customers.',
      contractValue: 18000,
      currency: 'USD',
      startOffset: 7,
      targetOffset: 50,
      proposalStatus: 'submitted',
      proposalSubmittedOffset: -3,
      proposalNotes: 'Proposal submitted with a two-sprint discovery and build plan. Awaiting client review.',
      agreementStatus: 'pending',
      agreementNotes: '',
    },
  }

  const buildWorkflow = (meta: ProjectMeta): ProjectWorkflow => {
    const contractValue = meta.contractValue
    return {
      proposal: {
        status: meta.proposalStatus,
        notes: meta.proposalNotes,
        submittedAt:
          meta.proposalSubmittedOffset !== undefined && meta.proposalStatus !== 'draft'
            ? isoAt(meta.proposalSubmittedOffset)
            : undefined,
      },
      agreement: {
        status: meta.agreementStatus,
        notes: meta.agreementNotes,
        signedAt:
          meta.agreementStatus === 'signed' && meta.agreementSignedOffset !== undefined
            ? isoAt(meta.agreementSignedOffset)
            : undefined,
      },
      payments: {
        currency: meta.currency,
        contractValue,
        milestones: [
          {
            id: 'upfront',
            label: 'Upfront · 50%',
            percentage: 50,
            status: meta.upfrontPaidOffset !== undefined ? 'paid' : 'pending',
            dueDate: date(meta.startedOffset ?? meta.startOffset),
            paidAt: meta.upfrontPaidOffset !== undefined ? isoAt(meta.upfrontPaidOffset) : undefined,
            note: 'Due before the project kick-off.',
          },
          {
            id: 'completion',
            label: 'After completion · 40%',
            percentage: 40,
            status: 'pending',
            dueDate: date(meta.targetOffset),
            note: 'Due after the final sprint demo and handover.',
          },
          {
            id: 'retention',
            label: '3-month retention · 10%',
            percentage: 10,
            status: 'pending',
            dueDate: date(meta.targetOffset + 90),
            note: 'Due at the end of the three-month retention period.',
          },
        ],
      },
      startedAt: meta.startedOffset !== undefined ? isoAt(meta.startedOffset) : undefined,
    }
  }

  const projects: Project[] = projectSpecs.map((project) => {
    const meta = metaByProject[project.id]
    return {
      ...project,
      createdAt: now,
      clientContact: meta.clientContact,
      projectDetails: {
        type: meta.projectType,
        objectives: meta.objectives,
        contractValue: meta.contractValue,
        currency: meta.currency,
        startDate: date(meta.startOffset),
        targetEndDate: date(meta.targetOffset),
      },
      workflow: buildWorkflow(meta),
    }
  })

  const sprints: Sprint[] = [
    createSprint('nwc-s1', 'northwind', 1, date(-36), date(-23), 'completed', 'Prove the procurement exception loop'),
    createSprint('nwc-s2', 'northwind', 2, date(-22), date(-9), 'completed', 'Ship the ops console foundation'),
    createSprint('nwc-s3', 'northwind', 3, date(-8), date(5), 'active', 'A demo-ready copilot for live supplier risk and exception triage'),
    createSprint('nwc-s4', 'northwind', 4, date(6), date(19), 'planning', 'Hardening, evaluation and production pilot'),
    createSprint('vcp-s1', 'verity', 1, date(-32), date(-19), 'completed', 'Validate the patient-first portal direction'),
    createSprint('vcp-s2', 'verity', 2, date(-18), date(-5), 'completed', 'Connect care team workflows end to end'),
    createSprint('vcp-s3', 'verity', 3, date(-4), date(9), 'active', 'A polished patient intake flow with secure care team handoff'),
    createSprint('vcp-s4', 'verity', 4, date(10), date(23), 'planning', 'Pilot readiness and compliance sign-off'),
    createSprint('gtm-s1', 'gtm', 1, date(-39), date(-26), 'completed', 'Sharpen the 14-day offer narrative'),
    createSprint('gtm-s2', 'gtm', 2, date(-25), date(-12), 'completed', 'Launch the first proof-led campaign'),
    createSprint('gtm-s3', 'gtm', 3, date(-11), date(2), 'active', 'A conversion-ready launch surface and working lead engine'),
    createSprint('gtm-s4', 'gtm', 4, date(3), date(16), 'planning', 'Nurture, attribution and partner motion'),
    createSprint('hel-s1', 'helio', 1, date(7), date(20), 'planning', 'Discovery to an approved onboarding blueprint'),
  ]

  const statusOrder: Record<string, number> = {}
  const makeSubtasks = (taskKey: string, items: [string, boolean][]): Subtask[] =>
    items.map(([title, done], index) => ({ id: `${taskKey}-s${index + 1}`, title, done }))
  const makeComment = (taskKey: string, authorId: string, body: string, hours: number): Comment => ({
    id: `${taskKey}-c-${hours}`,
    authorId,
    body,
    createdAt: hoursAgo(hours),
  })

  const tasks: Task[] = []

  const addTask = (input: {
    key: string
    projectId: string
    sprintId: string
    title: string
    description?: string
    status: TaskStatus
    priority?: Priority
    assigneeId?: string | null
    startDate: string
    dueDate: string
    storyPoints?: number
    subtasks?: Subtask[]
    comments?: Comment[]
    blocked?: boolean
    blockedReason?: string
  }) => {
    const orderKey = `${input.sprintId}:${input.status}`
    statusOrder[orderKey] = (statusOrder[orderKey] ?? 0) + 1
    tasks.push({
      id: input.key.toLowerCase(),
      key: input.key,
      projectId: input.projectId,
      sprintId: input.sprintId,
      title: input.title,
      description: input.description ?? '',
      status: input.status,
      priority: input.priority ?? 'Normal',
      assigneeId: input.assigneeId ?? null,
      startDate: input.startDate,
      dueDate: input.dueDate,
      storyPoints: input.storyPoints ?? 3,
      subtasks: input.subtasks ?? [],
      comments: input.comments ?? [],
      blocked: input.blocked ?? false,
      blockedReason: input.blockedReason,
      order: statusOrder[orderKey],
      createdAt: now,
      updatedAt: now,
    })
  }

  // ——— Northwind AI Copilot · Sprint 03 ———
  addTask({
    key: 'NWC-101',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Discovery synthesis + build map',
    description:
      'Synthesised 9 stakeholder interviews into a single delivery map. Locked the demo scope to supplier risk scoring and exception triage.',
    status: 'done',
    priority: 'High',
    assigneeId: 'alex',
    startDate: date(-8),
    dueDate: date(-6),
    storyPoints: 3,
    subtasks: makeSubtasks('NWC-101', [
      ['Interview synthesis', true],
      ['Scope + non-goals', true],
      ['Demo narrative', true],
    ]),
  })
  addTask({
    key: 'NWC-104',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Canonical supplier data model',
    description:
      'One normalized supplier and shipment schema across the three Northwind source systems, with a migration path for legacy carrier ids.',
    status: 'done',
    priority: 'High',
    assigneeId: 'sam',
    startDate: date(-8),
    dueDate: date(-5),
    storyPoints: 5,
    subtasks: makeSubtasks('NWC-104', [
      ['Entity map', true],
      ['Migration draft', true],
      ['Schema review', true],
      ['Seed data', true],
    ]),
  })
  addTask({
    key: 'NWC-106',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Copilot eval harness + golden set',
    description:
      'A repeatable evaluation loop for answer groundedness, citation accuracy and risk-score explanation quality.',
    status: 'done',
    priority: 'High',
    assigneeId: 'noor',
    startDate: date(-7),
    dueDate: date(-4),
    storyPoints: 5,
    subtasks: makeSubtasks('NWC-106', [
      ['Golden question set', true],
      ['Scoring rubric', true],
      ['Automated runner', true],
    ]),
  })
  addTask({
    key: 'NWC-108',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Exception queue wireframes',
    status: 'done',
    description: 'A calm, prioritised queue for ops teams with action-oriented detail on every exception.',
    priority: 'Normal',
    assigneeId: 'jonah',
    startDate: date(-7),
    dueDate: date(-3),
    storyPoints: 3,
    subtasks: makeSubtasks('NWC-108', [
      ['Queue states', true],
      ['Detail panel', true],
      ['Mobile review', true],
    ]),
  })
  addTask({
    key: 'NWC-110',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Design tokens: ops console',
    description: 'Shared spacing, status and data-density tokens for the operations console.',
    status: 'done',
    priority: 'Low',
    assigneeId: 'emma',
    startDate: date(-6),
    dueDate: date(-2),
    storyPoints: 2,
    subtasks: makeSubtasks('NWC-110', [
      ['Token audit', true],
      ['Dark surface pass', true],
    ]),
  })
  addTask({
    key: 'NWC-112',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'API contract + mock server',
    description: 'Contract-first API for shipment exceptions, supplier risk and copilot citations. Mock server is ready for UI integration.',
    status: 'done',
    priority: 'High',
    assigneeId: 'priya',
    startDate: date(-5),
    dueDate: date(-1),
    storyPoints: 3,
    subtasks: makeSubtasks('NWC-112', [
      ['OpenAPI spec', true],
      ['Typed client', true],
      ['Mock fixtures', true],
      ['Contract review', true],
    ]),
  })
  addTask({
    key: 'NWC-114',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Copilot empty + loading states',
    description: 'Meaningful first-run prompts and skeleton states that make the copilot feel fast, even on the 10k SKU sample.',
    status: 'done',
    priority: 'Normal',
    assigneeId: 'emma',
    startDate: date(-4),
    dueDate: date(-2),
    storyPoints: 2,
    subtasks: makeSubtasks('NWC-114', [
      ['Empty state', true],
      ['Streaming state', true],
      ['Error state', true],
    ]),
  })
  addTask({
    key: 'NWC-115',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Sprint 02 handover actions',
    status: 'done',
    description: 'Closed the three carry-over actions from the previous sprint and updated the delivery log.',
    priority: 'Low',
    assigneeId: 'alex',
    startDate: date(-3),
    dueDate: date(0),
    storyPoints: 1,
    subtasks: makeSubtasks('NWC-115', [['Carrier id backfill', true]]),
  })
  addTask({
    key: 'NWC-116',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Procurement copilot: conversational QA',
    description:
      'QA pass over the top 25 procurement questions. Groundedness is holding at 92%; citations are present on every answer.',
    status: 'in_review',
    priority: 'High',
    assigneeId: 'noor',
    startDate: date(-6),
    dueDate: date(1),
    storyPoints: 5,
    subtasks: makeSubtasks('NWC-116', [
      ['Question matrix', true],
      ['Citation checks', true],
      ['Tone review', true],
      ['Final sign-off', true],
    ]),
    comments: [
      makeComment('NWC-116', 'noor', 'Groundedness is at 92% across the golden set. Two citation misses remain on multi-carrier questions.', 6),
      makeComment('NWC-116', 'maya', 'The demo only needs single-carrier and mixed-carrier paths. Let’s review both at stand-up.', 3),
    ],
  })
  addTask({
    key: 'NWC-119',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Latency budget for 10k SKUs',
    description: 'Load test the supplier risk path against the full 10k SKU set and document the caching strategy.',
    status: 'in_review',
    priority: 'High',
    assigneeId: 'priya',
    startDate: date(-2),
    dueDate: date(0),
    storyPoints: 5,
    subtasks: makeSubtasks('NWC-119', [
      ['Load-test 10k path', true],
      ['Capture p95 latency', true],
      ['Review caching plan', false],
    ]),
    blocked: true,
    blockedReason: 'Waiting on production API credentials from Northwind IT.',
    comments: [
      makeComment(
        'NWC-119',
        'priya',
        'Staging is holding p95 at 680ms. Production measurement is blocked until Northwind provisions the read-only key.',
        9,
      ),
    ],
  })
  addTask({
    key: 'NWC-118',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Finalize supplier risk scoring model',
    description:
      'Blend on-time delivery, incident frequency and concentration risk into one explainable score. The explainability panel is the demo centrepiece.',
    status: 'in_progress',
    priority: 'Urgent',
    assigneeId: 'noor',
    startDate: date(-6),
    dueDate: date(0),
    storyPoints: 8,
    subtasks: makeSubtasks('NWC-118', [
      ['Define scoring inputs', true],
      ['Normalize supplier tiers', true],
      ['Wire explainability panel', true],
      ['Add confidence threshold', false],
      ['Validate with ops lead', false],
    ]),
    comments: [
      makeComment(
        'NWC-118',
        'maya',
        'Risk model needs the warehouse-latency assumption spelled out before demo. Can we show the top two drivers on every score?',
        8,
      ),
      makeComment('NWC-118', 'noor', 'Added the fallback path and the two-driver summary. Validating against the 10k SKU sample now.', 2),
    ],
  })
  addTask({
    key: 'NWC-120',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Map carrier API edge cases',
    description: 'Document and handle late-binding shipment events across the top five carrier APIs.',
    status: 'in_progress',
    priority: 'Normal',
    assigneeId: 'sam',
    startDate: date(-4),
    dueDate: date(4),
    storyPoints: 3,
    subtasks: makeSubtasks('NWC-120', [
      ['Carrier A edge cases', true],
      ['Carrier B edge cases', true],
      ['Late-binding rules', false],
    ]),
  })
  addTask({
    key: 'NWC-121',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Wire shipment exception feed to Copilot',
    description: 'Stream normalised exceptions into the copilot context so answers always reflect the live queue.',
    status: 'todo',
    priority: 'High',
    assigneeId: 'sam',
    startDate: date(1),
    dueDate: date(2),
    storyPoints: 5,
    subtasks: makeSubtasks('NWC-121', [
      ['Define webhook schema', true],
      ['Build ingestion adapter', false],
      ['Map exception states', false],
      ['Add replay control', false],
    ]),
  })
  addTask({
    key: 'NWC-123',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Validate SSO / SCIM handshake',
    description: 'Confirm Northwind’s Okta configuration and user provisioning against the pilot tenant.',
    status: 'todo',
    priority: 'Urgent',
    assigneeId: 'priya',
    startDate: date(1),
    dueDate: date(3),
    storyPoints: 3,
    subtasks: makeSubtasks('NWC-123', [
      ['Okta test tenant', false],
      ['SCIM provisioning test', false],
    ]),
  })
  addTask({
    key: 'NWC-125',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Demo script + handover pack',
    description: 'A tight 12-minute demo narrative with a one-page handover pack for the Northwind ops team.',
    status: 'backlog',
    priority: 'Normal',
    assigneeId: 'alex',
    startDate: date(2),
    dueDate: date(5),
    storyPoints: 2,
  })
  addTask({
    key: 'NWC-126',
    projectId: 'northwind',
    sprintId: 'nwc-s3',
    title: 'Instrument sprint demo analytics',
    description: 'Track demo interactions so the team can see which copilot moments land with the client.',
    status: 'backlog',
    priority: 'Low',
    assigneeId: 'emma',
    startDate: date(3),
    dueDate: date(6),
    storyPoints: 1,
  })

  // ——— Verity Client Portal · Sprint 03 ———
  addTask({
    key: 'VCP-201',
    projectId: 'verity',
    sprintId: 'vcp-s3',
    title: 'Kickoff + patient journey map',
    description: 'Mapped the patient and care-team journeys, with the intake handoff highlighted as the critical moment.',
    status: 'done',
    priority: 'High',
    assigneeId: 'jonah',
    startDate: date(-4),
    dueDate: date(-3),
    storyPoints: 3,
    subtasks: makeSubtasks('VCP-201', [
      ['Journey map', true],
      ['Critical moments', true],
      ['Success metrics', true],
    ]),
  })
  addTask({
    key: 'VCP-202',
    projectId: 'verity',
    sprintId: 'vcp-s3',
    title: 'Portal information architecture',
    status: 'done',
    description: 'A three-surface IA: patient intake, care team dashboard and secure document exchange.',
    priority: 'Normal',
    assigneeId: 'jonah',
    startDate: date(-4),
    dueDate: date(-2),
    storyPoints: 3,
    subtasks: makeSubtasks('VCP-202', [
      ['Content inventory', true],
      ['Navigation model', true],
    ]),
  })
  addTask({
    key: 'VCP-203',
    projectId: 'verity',
    sprintId: 'vcp-s3',
    title: 'Care team dashboard QA',
    status: 'done',
    description: 'QA on the priority care-team dashboard across Chrome, Safari and iPad.',
    priority: 'High',
    assigneeId: 'luca',
    startDate: date(-3),
    dueDate: date(-1),
    storyPoints: 3,
    subtasks: makeSubtasks('VCP-203', [
      ['Cross-browser pass', true],
      ['Empty states', true],
      ['iPad layout', true],
    ]),
  })
  addTask({
    key: 'VCP-204',
    projectId: 'verity',
    sprintId: 'vcp-s3',
    title: 'Design system token cleanup',
    status: 'done',
    description: 'Removed legacy colour aliases and introduced semantic status tokens for clinical states.',
    priority: 'Low',
    assigneeId: 'emma',
    startDate: date(-2),
    dueDate: date(0),
    storyPoints: 2,
    subtasks: makeSubtasks('VCP-204', [['Audit', true], ['Migration', true]]),
  })
  addTask({
    key: 'VCP-205',
    projectId: 'verity',
    sprintId: 'vcp-s3',
    title: 'Session audit event taxonomy',
    status: 'done',
    description: 'Agreed the audit event names and retention rules with Verity’s compliance lead.',
    priority: 'High',
    assigneeId: 'maya',
    startDate: date(-2),
    dueDate: date(0),
    storyPoints: 2,
    subtasks: makeSubtasks('VCP-205', [['Event catalogue', true], ['Retention notes', true]]),
  })
  addTask({
    key: 'VCP-206',
    projectId: 'verity',
    sprintId: 'vcp-s3',
    title: 'HIPAA copy review with legal',
    description: 'Legal review of consent, privacy and secure-message copy across the intake flow.',
    status: 'in_review',
    priority: 'Urgent',
    assigneeId: 'jonah',
    startDate: date(-2),
    dueDate: date(1),
    storyPoints: 2,
    subtasks: makeSubtasks('VCP-206', [
      ['Consent copy', true],
      ['Privacy labels', true],
      ['Legal sign-off', false],
    ]),
    comments: [
      makeComment('VCP-206', 'jonah', 'Legal returned two small changes on the consent screen. Updated both and sent back for final sign-off.', 5),
    ],
  })
  addTask({
    key: 'VCP-207',
    projectId: 'verity',
    sprintId: 'vcp-s3',
    title: 'Patient intake flow — final polish',
    description:
      'Tighten spacing, focus states and mobile ergonomics across the five-step intake flow. Include save-and-resume behaviour.',
    status: 'in_progress',
    priority: 'High',
    assigneeId: 'emma',
    startDate: date(-3),
    dueDate: date(2),
    storyPoints: 5,
    subtasks: makeSubtasks('VCP-207', [
      ['Step transitions', true],
      ['Mobile keyboard behaviour', true],
      ['Focus states', true],
      ['Save + resume', false],
      ['Error recovery', false],
      ['Copy polish', false],
    ]),
  })
  addTask({
    key: 'VCP-208',
    projectId: 'verity',
    sprintId: 'vcp-s3',
    title: 'Session timeout + audit logging',
    description: 'Automatic timeout with a graceful re-auth path, plus audit logging for every clinical record view.',
    status: 'in_progress',
    priority: 'Urgent',
    assigneeId: 'priya',
    startDate: date(-2),
    dueDate: date(1),
    storyPoints: 5,
    subtasks: makeSubtasks('VCP-208', [
      ['Idle timer', true],
      ['Re-auth modal', true],
      ['Audit events', true],
      ['Server-side enforcement', true],
      ['Security review', false],
    ]),
  })
  addTask({
    key: 'VCP-209',
    projectId: 'verity',
    sprintId: 'vcp-s3',
    title: 'Accessibility pass — WCAG AA',
    description: 'Full keyboard and screen-reader pass, with a focus on form errors and the document exchange.',
    status: 'todo',
    priority: 'Normal',
    assigneeId: 'luca',
    startDate: date(0),
    dueDate: date(3),
    storyPoints: 3,
    subtasks: makeSubtasks('VCP-209', [
      ['Keyboard audit', false],
      ['Screen reader audit', false],
      ['Contrast check', false],
      ['Remediation list', false],
      ['Re-test', false],
      ['Sign-off', false],
      ['Docs', false],
      ['Regression check', false],
    ]),
  })
  addTask({
    key: 'VCP-210',
    projectId: 'verity',
    sprintId: 'vcp-s3',
    title: 'Appointment reminders integration',
    status: 'todo',
    description: 'Connect the reminders service and expose per-patient communication preferences.',
    priority: 'High',
    assigneeId: 'sam',
    startDate: date(1),
    dueDate: date(4),
    storyPoints: 5,
  })
  addTask({
    key: 'VCP-211',
    projectId: 'verity',
    sprintId: 'vcp-s3',
    title: 'Client handover — admin guide',
    description: 'A concise admin guide for Verity’s operations team, including escalation paths and audit exports.',
    status: 'backlog',
    priority: 'Low',
    assigneeId: 'alex',
    startDate: date(3),
    dueDate: date(8),
    storyPoints: 2,
  })

  // ——— Anatera GTM Engine · Sprint 03 ———
  addTask({
    key: 'GTM-301',
    projectId: 'gtm',
    sprintId: 'gtm-s3',
    title: 'Analytics dashboard instrumentation',
    description: 'Event instrumentation for the new landing page and lead funnel, wired to the internal dashboard.',
    status: 'done',
    priority: 'High',
    assigneeId: 'sam',
    startDate: date(-11),
    dueDate: date(-6),
    storyPoints: 3,
    subtasks: makeSubtasks('GTM-301', [
      ['Event plan', true],
      ['SDK wiring', true],
      ['Dashboard tiles', true],
    ]),
  })
  addTask({
    key: 'GTM-302',
    projectId: 'gtm',
    sprintId: 'gtm-s3',
    title: 'Publish 14-day delivery landing page',
    description:
      'The primary conversion surface for the 14-day offer. Copy is approved; two responsive issues remain before launch.',
    status: 'in_review',
    priority: 'High',
    assigneeId: 'jonah',
    startDate: date(-8),
    dueDate: date(-1),
    storyPoints: 3,
    subtasks: makeSubtasks('GTM-302', [
      ['Hero + proof', true],
      ['Offer breakdown', true],
      ['Responsive layout', true],
      ['CTA tracking', true],
      ['Launch checklist', false],
    ]),
    comments: [
      makeComment('GTM-302', 'jonah', 'Desktop is ready. Mobile proof strip overflows below 390px — fixing this before review.', 4),
    ],
  })
  addTask({
    key: 'GTM-303',
    projectId: 'gtm',
    sprintId: 'gtm-s3',
    title: 'Lead scoring + routing automation',
    description: 'Score inbound enquiries and route qualified leads to the right delivery lead within five minutes.',
    status: 'in_progress',
    priority: 'Urgent',
    assigneeId: 'noor',
    startDate: date(-7),
    dueDate: date(0),
    storyPoints: 5,
    subtasks: makeSubtasks('GTM-303', [
      ['Scoring model', true],
      ['Routing rules', true],
      ['CRM handoff', false],
      ['Alerting', false],
    ]),
    blocked: true,
    blockedReason: 'Legal approval pending on automated lead routing language.',
    comments: [
      makeComment(
        'GTM-303',
        'noor',
        'Rules are built and tested in sandbox. Waiting on legal to approve the automated routing disclaimer before enabling production.',
        12,
      ),
    ],
  })
  addTask({
    key: 'GTM-304',
    projectId: 'gtm',
    sprintId: 'gtm-s3',
    title: 'QA: form submission edge cases',
    status: 'in_progress',
    description: 'Stress the enquiry form with duplicate submissions, timeouts and partial completions.',
    priority: 'Normal',
    assigneeId: 'luca',
    startDate: date(-3),
    dueDate: date(4),
    storyPoints: 2,
    subtasks: makeSubtasks('GTM-304', [
      ['Duplicate submissions', true],
      ['Timeout handling', false],
      ['Partial completion', false],
    ]),
  })
  addTask({
    key: 'GTM-305',
    projectId: 'gtm',
    sprintId: 'gtm-s3',
    title: 'Case study: Northwind teaser',
    description: 'A short, proof-led teaser from the Northwind engagement. Needs a client quote and two outcome metrics.',
    status: 'todo',
    priority: 'Normal',
    assigneeId: 'maya',
    startDate: date(-1),
    dueDate: date(2),
    storyPoints: 2,
    subtasks: makeSubtasks('GTM-305', [
      ['Outcome metrics', false],
      ['Client quote', false],
    ]),
  })
  addTask({
    key: 'GTM-306',
    projectId: 'gtm',
    sprintId: 'gtm-s3',
    title: 'Partner deck refresh',
    status: 'todo',
    description: 'Refresh the partner deck with the new delivery model and two recent build examples.',
    priority: 'High',
    assigneeId: 'alex',
    startDate: date(0),
    dueDate: date(1),
    storyPoints: 2,
  })
  addTask({
    key: 'GTM-307',
    projectId: 'gtm',
    sprintId: 'gtm-s3',
    title: 'Email nurture sequence v1',
    description: 'Three-email sequence for inbound leads who are not yet sprint-ready.',
    status: 'backlog',
    priority: 'Normal',
    assigneeId: 'emma',
    startDate: date(1),
    dueDate: date(3),
    storyPoints: 3,
  })

  // ——— Helio Onboarding · Sprint 01 (planning) ———
  addTask({
    key: 'HEL-401',
    projectId: 'helio',
    sprintId: 'hel-s1',
    title: 'Discovery synthesis + success metrics',
    description: 'Turn the Helio discovery notes into a measurable onboarding blueprint.',
    status: 'backlog',
    priority: 'High',
    assigneeId: 'maya',
    startDate: date(7),
    dueDate: date(9),
    storyPoints: 3,
  })
  addTask({
    key: 'HEL-402',
    projectId: 'helio',
    sprintId: 'hel-s1',
    title: 'Technical architecture spike',
    description: 'Validate the integration approach for Helio’s CRM and metering data.',
    status: 'backlog',
    priority: 'High',
    assigneeId: 'priya',
    startDate: date(7),
    dueDate: date(10),
    storyPoints: 5,
  })
  addTask({
    key: 'HEL-403',
    projectId: 'helio',
    sprintId: 'hel-s1',
    title: 'Onboarding journey wireframes',
    status: 'backlog',
    description: 'Low-fidelity flow for commercial customer onboarding.',
    priority: 'Normal',
    assigneeId: 'jonah',
    startDate: date(8),
    dueDate: date(11),
    storyPoints: 3,
  })
  addTask({
    key: 'HEL-404',
    projectId: 'helio',
    sprintId: 'hel-s1',
    title: 'Data migration inventory',
    status: 'backlog',
    description: 'Inventory the legacy account and contract data that needs to move.',
    priority: 'Normal',
    assigneeId: 'sam',
    startDate: date(9),
    dueDate: date(12),
    storyPoints: 2,
  })

  // ——— Archived sprint work ———
  const archiveSpecs: {
    sprintId: string
    projectId: string
    keyPrefix: string
    startOffset: number
    titles: string[]
    points: number[]
    assignees: string[]
  }[] = [
    {
      sprintId: 'nwc-s2',
      projectId: 'northwind',
      keyPrefix: 'NWC',
      startOffset: -22,
      titles: [
        'Ops console shell + navigation',
        'Exception data ingestion',
        'Supplier risk mock scoring',
        'Queue filtering + saved views',
        'Copilot context assembly',
        'Design QA: ops console',
        'Security review of pilot tenant',
        'Sprint review + client playback',
      ],
      points: [5, 5, 3, 3, 5, 2, 3, 1],
      assignees: ['priya', 'sam', 'noor', 'emma', 'noor', 'jonah', 'priya', 'alex'],
    },
    {
      sprintId: 'nwc-s1',
      projectId: 'northwind',
      keyPrefix: 'NWC',
      startOffset: -36,
      titles: [
        'Stakeholder interviews + synthesis',
        'Problem framing workshop',
        'Technical discovery',
        'Data source inventory',
        'Experience principles',
        'Demo prototype v1',
        'Sprint 01 client review',
      ],
      points: [3, 2, 5, 3, 2, 5, 1],
      assignees: ['maya', 'maya', 'priya', 'sam', 'jonah', 'emma', 'alex'],
    },
    {
      sprintId: 'vcp-s2',
      projectId: 'verity',
      keyPrefix: 'VCP',
      startOffset: -18,
      titles: [
        'Care team dashboard shell',
        'Secure document exchange',
        'Patient profile + preferences',
        'Intake form persistence',
        'Clinical status components',
        'QA: core portal flows',
        'Sprint 02 client playback',
      ],
      points: [5, 5, 3, 3, 2, 3, 1],
      assignees: ['emma', 'priya', 'jonah', 'sam', 'emma', 'luca', 'alex'],
    },
    {
      sprintId: 'vcp-s1',
      projectId: 'verity',
      keyPrefix: 'VCP',
      startOffset: -32,
      titles: [
        'Stakeholder + patient interviews',
        'Portal concept directions',
        'Security requirements workshop',
        'Technical discovery',
        'Clickable prototype',
        'Sprint 01 client review',
      ],
      points: [3, 5, 3, 5, 5, 1],
      assignees: ['maya', 'jonah', 'priya', 'priya', 'jonah', 'alex'],
    },
    {
      sprintId: 'gtm-s2',
      projectId: 'gtm',
      keyPrefix: 'GTM',
      startOffset: -25,
      titles: [
        'Offer messaging + narrative',
        'Launch page wireframes',
        'Case study landing template',
        'CRM pipeline setup',
        'First campaign assets',
        'Sprint review + retrospective',
      ],
      points: [3, 3, 5, 3, 5, 1],
      assignees: ['maya', 'jonah', 'emma', 'sam', 'jonah', 'alex'],
    },
    {
      sprintId: 'gtm-s1',
      projectId: 'gtm',
      keyPrefix: 'GTM',
      startOffset: -39,
      titles: [
        'Positioning interviews',
        '14-day delivery offer model',
        'Proof library audit',
        'Site analytics baseline',
        'Brand + voice refresh',
      ],
      points: [3, 5, 3, 3, 2],
      assignees: ['maya', 'alex', 'maya', 'sam', 'jonah'],
    },
  ]

  for (const spec of archiveSpecs) {
    const sprint = sprints.find((item) => item.id === spec.sprintId)
    if (!sprint) continue
    spec.titles.forEach((title, index) => {
      const offset = Math.min(2 + index, 11)
      const startDate = date(spec.startOffset + offset)
      const dueDate = date(spec.startOffset + Math.min(offset + 2, 12))
      addTask({
        key: `${spec.keyPrefix}-${spec.keyPrefix === 'NWC' ? 80 + index + (spec.sprintId === 'nwc-s2' ? 10 : 0) : spec.keyPrefix === 'VCP' ? 170 + index + (spec.sprintId === 'vcp-s2' ? 10 : 0) : 270 + index + (spec.sprintId === 'gtm-s2' ? 10 : 0)}`,
        projectId: spec.projectId,
        sprintId: spec.sprintId,
        title,
        description: 'Completed as part of the sprint delivery package.',
        status: 'done',
        priority: index < 2 ? 'High' : 'Normal',
        assigneeId: spec.assignees[index] ?? 'alex',
        startDate,
        dueDate,
        storyPoints: spec.points[index] ?? 3,
      })
    })
  }

  return { projects, sprints, tasks, members }
}
