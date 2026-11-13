import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  FileSignature,
  FileText,
  Handshake,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Rocket,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react'
import type { Currency, PaymentMilestone, PaymentMilestoneStatus, Project, ProjectDocument } from '../types'
import { useWorkspace } from '../store/WorkspaceStore'
import { formatMoney, workflowProgress } from '../lib/normalizeWorkspace'
import { formatRange, formatRelativeTime, formatShortDate, shiftDateKey, todayKey } from '../lib/date'
import { cn } from '../lib/utils'
import { ProgressBar, ProjectStatusBadge } from './ui'
import { useI18n } from '../i18n/I18nProvider'

type FlowStep = 'proposal' | 'agreement' | 'payment' | 'start'

const STEP_META: { id: FlowStep; label: string; description: string; icon: typeof FileText }[] = [
  { id: 'proposal', label: 'Proposal', description: 'Submit your proposed scope', icon: FileText },
  { id: 'agreement', label: 'Agreement', description: 'Upload the signed agreement', icon: Handshake },
  { id: 'payment', label: 'Payment details', description: '50 / 40 / 10 schedule', icon: WalletCards },
  { id: 'start', label: 'Start project', description: 'Kick off delivery', icon: Rocket },
]

const MAX_FILE_SIZE = 8 * 1024 * 1024

function readDocument(file: File): Promise<ProjectDocument> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error('The file is larger than 8 MB.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        id: `doc-${crypto.randomUUID().slice(0, 8)}`,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: String(reader.result),
        uploadedAt: new Date().toISOString(),
      })
    }
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

function DocumentZone({
  document,
  onUpload,
  onRemove,
  label,
  hint,
}: {
  document?: ProjectDocument
  onUpload: (file: File) => void
  onRemove: () => void
  label: string
  hint: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { t, language } = useI18n()

  if (document) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[#d7f1e4] bg-[#f0fdf4] p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#047857] shadow-card">
          <FileText size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11.5px] font-semibold text-ink">{document.name}</p>
          <p className="mt-0.5 text-[9.5px] text-subtle">
            {(document.size / 1024 / 1024).toFixed(2)} MB · {t('Uploaded').toLowerCase()} {formatRelativeTime(document.uploadedAt)}
          </p>
        </div>
        <a
          href={document.dataUrl}
          download={document.name}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-white hover:text-ink"
          aria-label="Download document"
        >
          <Download size={13} />
        </a>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-7 w-7 items-center justify-center rounded-md text-subtle transition-colors hover:bg-white hover:text-[#be123c]"
          aria-label="Remove document"
        >
          <Trash2 size={12} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const file = event.dataTransfer.files?.[0]
          if (file) onUpload(file)
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
          dragging
            ? 'border-[#a99bff] bg-[#f7f5ff]'
            : 'border-[#d9dbe2] bg-[#fcfcfd] hover:border-[#b9adff] hover:bg-[#fbfaff]',
        )}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-muted shadow-card">
          <UploadCloud size={16} />
        </span>
        <span className="text-[11.5px] font-medium text-ink">{label}</span>
        <span className="text-[9.5px] text-subtle">{hint}</span>
        <span className="text-[9.5px] text-subtle">PDF, DOC, DOCX {language === 'id' ? 'atau gambar' : 'or image'} · max 8 MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onUpload(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}

const paymentLabels: Record<PaymentMilestone['id'], { title: string; timing: string; icon: typeof WalletCards }> = {
  upfront: { title: 'Upfront', timing: 'Due before kick-off', icon: Rocket },
  completion: { title: 'After completion', timing: 'Due after final handover', icon: CheckCircle2 },
  retention: { title: '3-month retention', timing: 'Due after the retention period', icon: ShieldCheck },
}

export function ProjectWorkspace({
  projectId,
  onClose,
  onEditProject,
  onStartSprint,
}: {
  projectId: string | null
  onClose: () => void
  onEditProject: (project: Project) => void
  onStartSprint: (projectId: string) => void
}) {
  const { data, updateProject, notify, setProjectFilter, setSprintFilter } = useWorkspace()
  const { t, language } = useI18n()
  const navigate = useNavigate()
  const project = data.projects.find((item) => item.id === projectId)
  const [activeStep, setActiveStep] = useState<FlowStep>('proposal')
  const [contractDraft, setContractDraft] = useState('')

  const progress = useMemo(() => (project ? workflowProgress(project) : null), [project])

  useEffect(() => {
    if (!project) return
    const next = workflowProgress(project)
    if (!next.proposalDone) setActiveStep('proposal')
    else if (!next.agreementDone) setActiveStep('agreement')
    else if (!next.upfrontPaid) setActiveStep('payment')
    else setActiveStep('start')
    setContractDraft(String(project.workflow.payments.contractValue || project.projectDetails.contractValue || 0))
  }, [projectId, project?.id])

  useEffect(() => {
    if (!project) return
    setContractDraft(String(project.workflow.payments.contractValue || project.projectDetails.contractValue || 0))
  }, [project?.workflow.payments.contractValue, project?.projectDetails.contractValue])

  useEffect(() => {
    if (!projectId) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [projectId, onClose])

  if (!project || !progress) return null

  const currentProject: Project = project
  const lead = data.members.find((member) => member.id === project.leadId)
  const contractValue = Number(contractDraft) || 0
  const paymentTotal = project.workflow.payments.milestones.reduce((sum, milestone) => {
    return sum + Math.round((contractValue * milestone.percentage) / 100)
  }, 0)
  const eligibleToStart = progress.proposalDone && progress.agreementDone && progress.upfrontPaid && !progress.started
  const missingForStart = [
    !progress.proposalDone ? t('submit the proposal') : null,
    !progress.agreementDone ? t('upload the agreement') : null,
    !progress.upfrontPaid ? t('confirm the 50% upfront payment') : null,
  ].filter(Boolean) as string[]

  function updateWorkflow(updater: (workflow: Project['workflow']) => Project['workflow']) {
    updateProject(currentProject.id, { workflow: updater(currentProject.workflow) })
  }

  async function uploadDocument(file: File, target: 'proposal' | 'agreement') {
    try {
      const document = await readDocument(file)
      updateWorkflow((workflow) => ({
        ...workflow,
        [target]: {
          ...workflow[target],
          document,
          status: target === 'proposal'
            ? workflow.proposal.status === 'accepted' ? 'accepted' : 'draft'
            : workflow.agreement.status === 'signed' ? 'signed' : 'uploaded',
        },
      }))
      notify(t('{name} uploaded.', { name: file.name }))
    } catch (error) {
      notify(error instanceof Error ? error.message : t('Upload failed.'), 'error')
    }
  }

  function submitProposal() {
    if (!currentProject.workflow.proposal.document && !currentProject.workflow.proposal.notes.trim()) {
      notify(t('Attach the proposal or add a proposal summary before submitting.'), 'error')
      return
    }
    updateWorkflow((workflow) => ({
      ...workflow,
      proposal: { ...workflow.proposal, status: 'submitted', submittedAt: new Date().toISOString() },
    }))
    notify(t('Proposal submitted to the client.'))
  }

  function markAgreementSigned() {
    if (!currentProject.workflow.agreement.document) {
      notify(t('Upload the signed agreement first.'), 'error')
      return
    }
    updateWorkflow((workflow) => ({
      ...workflow,
      agreement: { ...workflow.agreement, status: 'signed', signedAt: new Date().toISOString() },
    }))
    notify(t('Agreement marked as signed.'))
  }

  function updatePaymentStatus(milestoneId: PaymentMilestone['id'], status: PaymentMilestoneStatus) {
    updateWorkflow((workflow) => ({
      ...workflow,
      payments: {
        ...workflow.payments,
        milestones: workflow.payments.milestones.map((milestone) =>
          milestone.id === milestoneId
            ? {
                ...milestone,
                status,
                paidAt: status === 'paid' ? new Date().toISOString() : undefined,
              }
            : milestone,
        ),
      },
    }))
  }

  function updatePaymentDueDate(milestoneId: PaymentMilestone['id'], dueDate: string) {
    updateWorkflow((workflow) => ({
      ...workflow,
      payments: {
        ...workflow.payments,
        milestones: workflow.payments.milestones.map((milestone) =>
          milestone.id === milestoneId ? { ...milestone, dueDate } : milestone,
        ),
      },
    }))
  }

  function saveContractValue() {
    const next = Math.max(0, Number(contractDraft) || 0)
    updateProject(currentProject.id, {
      workflow: {
        ...currentProject.workflow,
        payments: {
          ...currentProject.workflow.payments,
          contractValue: next,
        },
      },
      projectDetails: {
        ...currentProject.projectDetails,
        contractValue: next,
      },
    })
    notify(t('Contract value updated.'))
  }

  function startProject() {
    if (!eligibleToStart) return
    updateProject(currentProject.id, {
      status: 'Active',
      workflow: {
        ...currentProject.workflow,
        startedAt: new Date().toISOString(),
        payments: {
          ...currentProject.workflow.payments,
          contractValue: contractValue,
        },
      },
      projectDetails: {
        ...currentProject.projectDetails,
        contractValue,
        startDate: currentProject.projectDetails.startDate || todayKey(),
      },
    })
    notify(t('{name} is now live. Create the first 2-week sprint.', { name: currentProject.name }))
    onClose()
    window.setTimeout(() => onStartSprint(currentProject.id), 140)
  }

  function openBoard() {
    setProjectFilter(currentProject.id)
    setSprintFilter('active')
    onClose()
    navigate('/board')
  }

  return createPortal(
    <AnimatePresence>
      {projectId && (
        <motion.div
          className="fixed inset-0 z-[92]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-[#111827]/35 backdrop-blur-[2px]"
            onClick={onClose}
            aria-label="Close project details"
            tabIndex={-1}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`${project.name} project workspace`}
            className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-white shadow-[var(--shadow-drawer)] sm:w-[700px] xl:w-[780px]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-line px-5">
              <div className="flex min-w-0 items-center gap-2 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
                <span className="font-mono font-medium text-ink">{project.code}</span>
                <span className="text-subtle">/</span>
                <span className="truncate text-muted">{t('Project workspace')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onEditProject(project)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[10.5px] font-medium text-muted transition-colors hover:bg-[#f4f4f5] hover:text-ink"
                >
                  <Pencil size={11} /> {t('Edit details')}
                </button>
                <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Close')}>
                  <X size={17} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-[10px] font-semibold text-white"
                    style={{ backgroundColor: project.color }}
                  >
                    {project.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[19px] font-semibold tracking-[-0.025em] text-ink">{project.name}</h2>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                    <p className="mt-1 text-[10.5px] text-subtle">
                      {project.client} · {t('Lead')} {lead?.name ?? t('Unassigned')} · {project.projectDetails.type}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="font-mono text-[15px] font-semibold text-ink">
                      {formatMoney(contractValue, project.workflow.payments.currency)}
                    </p>
                    <p className="mt-0.5 text-[8.5px] uppercase tracking-[0.08em] text-subtle">{t('Contract value')}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-line bg-[#fcfcfd] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-semibold uppercase tracking-[0.11em] text-subtle">
                      {t('Delivery flow')}
                    </span>
                    <span className="font-mono text-[9px] text-muted">
                      {progress.percent}% {t('complete')}
                    </span>
                  </div>
                  <ProgressBar value={progress.percent} height={4} color={project.color} className="mt-2" />
                  <div className="mt-3 grid grid-cols-4 gap-1">
                    {STEP_META.map((step, index) => {
                      const done =
                        (step.id === 'proposal' && progress.proposalDone) ||
                        (step.id === 'agreement' && progress.agreementDone) ||
                        (step.id === 'payment' && progress.upfrontPaid) ||
                        (step.id === 'start' && progress.started)
                      const isActive = activeStep === step.id
                      const Icon = step.icon
                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => setActiveStep(step.id)}
                          className={cn(
                            'group relative flex min-w-0 flex-col items-start gap-1.5 rounded-lg border px-2 py-2 text-left transition-all',
                            isActive
                              ? 'border-[#d8d2ff] bg-white shadow-card'
                              : 'border-transparent hover:bg-white/80',
                          )}
                        >
                          <span className="flex w-full items-center gap-1.5">
                            <span
                              className={cn(
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px]',
                                done
                                  ? 'bg-[#ecfdf5] text-[#047857]'
                                  : isActive
                                    ? 'bg-[#f1edff] text-[#6d28d9]'
                                    : 'border border-line bg-white text-subtle',
                              )}
                            >
                              {done ? <Check size={10} strokeWidth={3} /> : <Icon size={10} />}
                            </span>
                            <span className="font-mono text-[8px] text-subtle">0{index + 1}</span>
                          </span>
                          <span className={cn('truncate text-[9.5px] font-semibold', isActive ? 'text-ink' : 'text-muted')}>
                            {t(step.label)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6">
                {activeStep === 'proposal' && (
                  <section>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="eyebrow flex items-center gap-1.5">
                          <FileText size={11} /> {t('Step 01 · Proposal')}
                        </p>
                        <h3 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-ink">
                          {t('Submit the proposal to your client')}
                        </h3>
                        <p className="mt-1 max-w-[520px] text-[11px] leading-relaxed text-muted">
                          {t('Keep the proposal, the commercial summary and the submission record together.')}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'badge',
                          project.workflow.proposal.status === 'accepted'
                            ? 'bg-[#ecfdf5] text-[#047857]'
                            : project.workflow.proposal.status === 'submitted'
                              ? 'bg-[#eff6ff] text-[#1d4ed8]'
                              : 'bg-[#f4f4f5] text-muted',
                        )}
                      >
                        {project.workflow.proposal.status === 'accepted'
                          ? t('Accepted')
                          : project.workflow.proposal.status === 'submitted'
                            ? t('Submitted')
                            : t('Draft')}
                      </span>
                    </div>

                    <div className="mt-4">
                      <DocumentZone
                        document={project.workflow.proposal.document}
                        label={t('Upload proposal document')}
                        hint={t('Drop the PDF or Word proposal here')}
                        onUpload={(file) => void uploadDocument(file, 'proposal')}
                        onRemove={() =>
                          updateWorkflow((workflow) => ({
                            ...workflow,
                            proposal: { ...workflow.proposal, document: undefined },
                          }))
                        }
                      />
                    </div>

                    <label className="mt-4 block">
                      <span className="field-label">{t('Proposal summary')}</span>
                      <textarea
                        value={project.workflow.proposal.notes}
                        onChange={(event) =>
                          updateWorkflow((workflow) => ({
                            ...workflow,
                            proposal: { ...workflow.proposal, notes: event.target.value },
                          }))
                        }
                        placeholder={
                          language === 'id'
                            ? 'Cakupan, hasil, investasi, dan asumsi utama…'
                            : 'Scope, outcomes, investment and key assumptions…'
                        }
                        className="input min-h-[92px] resize-y leading-relaxed"
                      />
                    </label>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[9.5px] text-subtle">
                        {project.workflow.proposal.submittedAt
                          ? `${t('Submitted')} ${formatRelativeTime(project.workflow.proposal.submittedAt)}`
                          : t('Keep the proposal, the commercial summary and the submission record together.')}
                      </p>
                      <div className="flex gap-2">
                        {project.workflow.proposal.status === 'submitted' && (
                          <button
                            type="button"
                            onClick={() =>
                              updateWorkflow((workflow) => ({
                                ...workflow,
                                proposal: { ...workflow.proposal, status: 'accepted' },
                              }))
                            }
                            className="btn btn-secondary !py-2 !text-[11px]"
                          >
                            <CheckCircle2 size={12} /> {t('Mark accepted')}
                          </button>
                        )}
                        {project.workflow.proposal.status !== 'accepted' && (
                          <button
                            type="button"
                            onClick={submitProposal}
                            disabled={!project.workflow.proposal.document && !project.workflow.proposal.notes.trim()}
                            className="btn btn-primary !py-2 !text-[11px]"
                          >
                            {t('Submit proposal')} <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {activeStep === 'agreement' && (
                  <section>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="eyebrow flex items-center gap-1.5">
                          <Handshake size={11} /> {t('Step 02 · Agreement')}
                        </p>
                        <h3 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-ink">
                          {t('Upload the signed agreement')}
                        </h3>
                        <p className="mt-1 max-w-[520px] text-[11px] leading-relaxed text-muted">
                          {t('Store the contract and record when it was signed.')}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'badge',
                          project.workflow.agreement.status === 'signed'
                            ? 'bg-[#ecfdf5] text-[#047857]'
                            : project.workflow.agreement.status === 'uploaded'
                              ? 'bg-[#eff6ff] text-[#1d4ed8]'
                              : 'bg-[#f4f4f5] text-muted',
                        )}
                      >
                        {project.workflow.agreement.status === 'signed'
                          ? t('Signed')
                          : project.workflow.agreement.status === 'uploaded'
                            ? t('Uploaded')
                            : t('Pending')}
                      </span>
                    </div>

                    <div className="mt-4">
                      <DocumentZone
                        document={project.workflow.agreement.document}
                        label={t('Upload signed agreement')}
                        hint={t('Drop the signed contract here')}
                        onUpload={(file) => void uploadDocument(file, 'agreement')}
                        onRemove={() =>
                          updateWorkflow((workflow) => ({
                            ...workflow,
                            agreement: {
                              ...workflow.agreement,
                              document: undefined,
                              status: 'pending',
                              signedAt: undefined,
                            },
                          }))
                        }
                      />
                    </div>

                    <label className="mt-4 block">
                      <span className="field-label">{t('Agreement notes')}</span>
                      <textarea
                        value={project.workflow.agreement.notes}
                        onChange={(event) =>
                          updateWorkflow((workflow) => ({
                            ...workflow,
                            agreement: { ...workflow.agreement, notes: event.target.value },
                          }))
                        }
                        placeholder={
                          language === 'id'
                            ? 'Catatan kontrak, penandatangan, atau ketentuan khusus…'
                            : 'Contract notes, signatories or special terms…'
                        }
                        className="input min-h-[82px] resize-y leading-relaxed"
                      />
                    </label>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[9.5px] text-subtle">
                        {project.workflow.agreement.signedAt
                          ? `${t('Signed')} ${formatRelativeTime(project.workflow.agreement.signedAt)}`
                          : t('Upload the signed agreement')}
                      </p>
                      <button
                        type="button"
                        onClick={markAgreementSigned}
                        disabled={!project.workflow.agreement.document || project.workflow.agreement.status === 'signed'}
                        className="btn btn-primary !py-2 !text-[11px]"
                      >
                        <FileSignature size={12} /> {t('Mark as signed')}
                      </button>
                    </div>
                  </section>
                )}

                {activeStep === 'payment' && (
                  <section>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="eyebrow flex items-center gap-1.5">
                          <WalletCards size={11} /> {t('Step 03 · Payment details')}
                        </p>
                        <h3 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-ink">
                          {t('50% upfront · 40% after finish · 10% retention')}
                        </h3>
                        <p className="mt-1 max-w-[560px] text-[11px] leading-relaxed text-muted">
                          {t('One clear payment schedule across kick-off, handover and the three-month retention period.')}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'badge',
                          progress.upfrontPaid ? 'bg-[#ecfdf5] text-[#047857]' : 'bg-[#fffbeb] text-[#b45309]',
                        )}
                      >
                        {progress.upfrontPaid ? t('Upfront confirmed') : t('Upfront pending')}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 rounded-xl border border-line bg-[#fcfcfd] p-3.5 sm:grid-cols-[1fr_130px]">
                      <label className="block">
                        <span className="field-label">{t('Contract value')}</span>
                        <div className="relative">
                          <CircleDollarSign size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                          <input
                            type="number"
                            min={0}
                            className="input bg-white pl-8 font-mono"
                            value={contractDraft}
                            onChange={(event) => setContractDraft(event.target.value)}
                            onBlur={saveContractValue}
                          />
                        </div>
                      </label>
                      <label className="block">
                        <span className="field-label">{t('Currency')}</span>
                        <span className="relative block">
                          <select
                            className="input appearance-none bg-white font-mono"
                            value={project.workflow.payments.currency}
                            onChange={(event) => {
                              const currency = event.target.value as Currency
                              updateProject(project.id, {
                                workflow: {
                                  ...project.workflow,
                                  payments: { ...project.workflow.payments, currency },
                                },
                                projectDetails: { ...project.projectDetails, currency },
                              })
                            }}
                          >
                            <option value="USD">USD</option>
                            <option value="IDR">IDR</option>
                          </select>
                          <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle" />
                        </span>
                      </label>
                      <div className="text-[9.5px] text-subtle sm:col-span-2">
                        {t('Scheduled total')}{' '}
                        <span className="font-mono font-medium text-muted">
                          {formatMoney(paymentTotal, project.workflow.payments.currency)}
                        </span>{' '}
                        {t('Amounts update automatically as the contract value changes.')}
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {project.workflow.payments.milestones.map((milestone) => {
                        const meta = paymentLabels[milestone.id]
                        const Icon = meta.icon
                        const amount = Math.round((contractValue * milestone.percentage) / 100)
                        return (
                          <div
                            key={milestone.id}
                            className={cn(
                              'rounded-xl border p-3.5',
                              milestone.id === 'upfront' && milestone.status !== 'paid'
                                ? 'border-[#fde68a] bg-[#fffdf7]'
                                : 'border-line bg-white',
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'flex h-8 w-8 items-center justify-center rounded-lg',
                                  milestone.status === 'paid'
                                    ? 'bg-[#ecfdf5] text-[#047857]'
                                    : milestone.id === 'upfront'
                                      ? 'bg-[#fffbeb] text-[#b45309]'
                                      : 'bg-[#f4f4f5] text-muted',
                                )}
                              >
                                <Icon size={14} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-[11.5px] font-semibold text-ink">{t(meta.title)}</p>
                                  <span className="rounded bg-[#f4f4f5] px-1.5 py-0.5 font-mono text-[8.5px] text-muted">
                                    {milestone.percentage}%
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[9px] text-subtle">{t(meta.timing)}</p>
                              </div>
                              <p className="font-mono text-[12.5px] font-semibold text-ink">
                                {formatMoney(amount, project.workflow.payments.currency)}
                              </p>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/80 pt-2.5">
                              <label className="flex items-center gap-1.5 text-[9px] text-subtle">
                                {t('Due')}
                                <input
                                  type="date"
                                  className="rounded border border-line bg-[#fafafa] px-1.5 py-1 text-[9.5px] text-ink outline-none"
                                  value={milestone.dueDate ?? ''}
                                  onChange={(event) => updatePaymentDueDate(milestone.id, event.target.value)}
                                />
                              </label>
                              <div className="ml-auto flex items-center gap-1.5">
                                <select
                                  value={milestone.status}
                                  onChange={(event) =>
                                    updatePaymentStatus(
                                      milestone.id,
                                      event.target.value as PaymentMilestoneStatus,
                                    )
                                  }
                                  className="cursor-pointer rounded-md border border-line bg-white px-2 py-1 text-[9.5px] font-medium text-ink outline-none"
                                >
                                  <option value="pending">{t('Pending')}</option>
                                  <option value="invoiced">{language === 'id' ? 'Ditagihkan' : 'Invoiced'}</option>
                                  <option value="paid">{t('Paid')}</option>
                                </select>
                                {milestone.status !== 'paid' ? (
                                  <button
                                    type="button"
                                    onClick={() => updatePaymentStatus(milestone.id, 'paid')}
                                    className="inline-flex items-center gap-1 rounded-md bg-ink px-2 py-1.5 text-[9px] font-semibold text-white hover:bg-[#1f2937]"
                                  >
                                    <Check size={9} /> {t('Mark paid')}
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-medium text-[#047857]">
                                    <CheckCircle2 size={10} /> {milestone.paidAt ? formatRelativeTime(milestone.paidAt) : t('Paid')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}

                {activeStep === 'start' && (
                  <section>
                    <p className="eyebrow flex items-center gap-1.5">
                      <Rocket size={11} /> {t('Step 04 · Start project')}
                    </p>
                    <h3 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-ink">
                      {progress.started ? t('Project is in delivery') : t('Ready to kick off?')}
                    </h3>
                    <p className="mt-1 max-w-[540px] text-[11px] leading-relaxed text-muted">
                      {progress.started
                        ? t('The project has started. Keep the 2-week sprint cadence running and track delivery from the board.')
                        : t('Confirm the three entry conditions, then start the project and begin the first sprint.')}
                    </p>

                    <div className="mt-4 space-y-2">
                      {[
                        {
                          label: t('Proposal submitted'),
                          done: progress.proposalDone,
                          detail: project.workflow.proposal.submittedAt
                            ? `${t('Submitted')} ${formatRelativeTime(project.workflow.proposal.submittedAt)}`
                            : t('Submit proposal'),
                          step: 'proposal' as FlowStep,
                        },
                        {
                          label: t('Agreement uploaded'),
                          done: progress.agreementDone,
                          detail: project.workflow.agreement.signedAt
                            ? `${t('Signed')} ${formatRelativeTime(project.workflow.agreement.signedAt)}`
                            : t('Upload the signed agreement'),
                          step: 'agreement' as FlowStep,
                        },
                        {
                          label: t('50% upfront payment'),
                          done: progress.upfrontPaid,
                          detail: progress.upfrontPaid
                            ? t('Upfront confirmed')
                            : t('Mark paid'),
                          step: 'payment' as FlowStep,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5"
                        >
                          <span
                            className={cn(
                              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                              item.done ? 'bg-[#ecfdf5] text-[#047857]' : 'border border-line bg-[#fafafa] text-subtle',
                            )}
                          >
                            {item.done ? <Check size={12} strokeWidth={3} /> : <Clock3 size={11} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-ink">{item.label}</p>
                            <p className="mt-0.5 text-[9px] text-subtle">{item.detail}</p>
                          </div>
                          {!item.done && (
                            <button
                              type="button"
                              onClick={() => setActiveStep(item.step)}
                              className="rounded-md px-2 py-1 text-[9px] font-medium text-[#5b21b6] hover:bg-[#f7f5ff]"
                            >
                              {t('Complete')}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {progress.started ? (
                      <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#d7f1e4] bg-[#f0fdf4] px-3 py-3">
                        <CheckCircle2 size={15} className="text-[#047857]" />
                        <div className="flex-1">
                          <p className="text-[11px] font-semibold text-[#047857]">{t('Project started')}</p>
                          <p className="mt-0.5 text-[9.5px] text-[#047857]/75">
                            {project.workflow.startedAt
                              ? `${t('Started')} ${formatRelativeTime(project.workflow.startedAt)}`
                              : t('Delivery is active')}
                          </p>
                        </div>
                        <button type="button" className="btn btn-secondary !py-1.5 !text-[10px]" onClick={openBoard}>
                          {t('Open board')} <ArrowRight size={11} />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-line bg-[#fcfcfd] p-3.5">
                        <button
                          type="button"
                          onClick={startProject}
                          disabled={!eligibleToStart}
                          className="btn btn-primary w-full !py-2.5"
                        >
                          <Rocket size={13} /> {t('Start project')}
                        </button>
                        <p className="mt-2 text-center text-[9px] leading-relaxed text-subtle">
                          {eligibleToStart
                            ? t('Starting the project activates it on the dashboard and opens the sprint planner.')
                            : `${t('To start, ')}${missingForStart.join(', ')}.`}
                        </p>
                      </div>
                    )}
                  </section>
                )}

                <section className="mt-6 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-[#fcfcfd] p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="eyebrow flex items-center gap-1.5">
                        <Building2 size={11} /> {t('Client details')}
                      </p>
                      <button
                        type="button"
                        onClick={() => onEditProject(project)}
                        className="text-[9px] font-medium text-muted hover:text-ink"
                      >
                        {t('Edit')}
                      </button>
                    </div>
                    <p className="mt-2 text-[12px] font-semibold text-ink">{project.client}</p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {project.clientContact.name}
                      {project.clientContact.role ? ` · ${project.clientContact.role}` : ''}
                    </p>
                    <div className="mt-2.5 space-y-1.5 text-[9.5px] text-muted">
                      {project.clientContact.email && (
                        <a
                          href={`mailto:${project.clientContact.email}`}
                          className="flex items-center gap-1.5 hover:text-ink"
                        >
                          <Mail size={10} className="text-subtle" /> {project.clientContact.email}
                        </a>
                      )}
                      {project.clientContact.phone && (
                        <a
                          href={`tel:${project.clientContact.phone}`}
                          className="flex items-center gap-1.5 hover:text-ink"
                        >
                          <Phone size={10} className="text-subtle" /> {project.clientContact.phone}
                        </a>
                      )}
                      {project.clientContact.address && (
                        <p className="flex items-start gap-1.5">
                          <MapPin size={10} className="mt-0.5 shrink-0 text-subtle" /> {project.clientContact.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-[#fcfcfd] p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="eyebrow flex items-center gap-1.5">
                        <CalendarDays size={11} /> {t('Project details')}
                      </p>
                      <button
                        type="button"
                        onClick={() => onEditProject(project)}
                        className="text-[9px] font-medium text-muted hover:text-ink"
                      >
                        {t('Edit')}
                      </button>
                    </div>
                    <p className="mt-2 text-[10px] font-medium text-ink">{project.projectDetails.type}</p>
                    <p className="mt-1 line-clamp-3 text-[9.5px] leading-relaxed text-muted">
                      {project.projectDetails.objectives || project.description || t('No project objective added yet.')}
                    </p>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-line/80 pt-2 text-[9px]">
                      <div>
                        <p className="text-subtle">{t('Project start')}</p>
                        <p className="mt-0.5 font-medium text-ink">
                          {formatShortDate(project.projectDetails.startDate)} →{' '}
                          {formatShortDate(project.projectDetails.targetEndDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-subtle">{t('Contract value')}</p>
                        <p className="mt-0.5 font-mono font-medium text-ink">
                          {formatMoney(project.projectDetails.contractValue, project.projectDetails.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="mt-4 flex items-center justify-between text-[9px] text-subtle">
                  <span className="flex items-center gap-1.5">
                    <UserRound size={10} /> {t('Project lead')} {lead?.name ?? t('Unassigned')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock3 size={10} /> {t('Target end date')} {formatRange(project.projectDetails.startDate, project.projectDetails.targetEndDate)}
                  </span>
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
