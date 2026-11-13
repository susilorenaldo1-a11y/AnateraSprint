import { useEffect, useState, type FormEvent } from 'react'
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Contact,
  Mail,
  MapPin,
  Palette,
  Phone,
  Plus,
  UserRound,
} from 'lucide-react'
import type { Currency, Project, ProjectStatus } from '../types'
import { PROJECT_STATUSES } from '../types'
import { useWorkspace } from '../store/WorkspaceStore'
import { Modal } from './ui'
import { shiftDateKey, todayKey } from '../lib/date'
import { useI18n } from '../i18n/I18nProvider'

const ACCENTS = ['#6E56F0', '#0E9384', '#D97706', '#2563EB', '#C2415D', '#7C3AED', '#475569', '#0F766E']

export function ProjectModal({
  open,
  onClose,
  project,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  project?: Project | null
  onCreated?: (projectId: string) => void
}) {
  const { data, addProject, updateProject, notify } = useWorkspace()
  const { t, language } = useI18n()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [client, setClient] = useState('')
  const [leadId, setLeadId] = useState('maya')
  const [status, setStatus] = useState<ProjectStatus>('Planning')
  const [color, setColor] = useState(ACCENTS[0])
  const [description, setDescription] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactAddress, setContactAddress] = useState('')
  const [projectType, setProjectType] = useState('Product delivery')
  const [objectives, setObjectives] = useState('')
  const [contractValue, setContractValue] = useState(0)
  const [currency, setCurrency] = useState<Currency>('USD')
  const [startDate, setStartDate] = useState(todayKey())
  const [targetEndDate, setTargetEndDate] = useState(shiftDateKey(todayKey(), 45))
  const [error, setError] = useState('')
  const editing = Boolean(project)

  useEffect(() => {
    if (!open) return
    setName(project?.name ?? '')
    setCode(project?.code ?? '')
    setClient(project?.client ?? '')
    setLeadId(project?.leadId ?? data.members[0]?.id ?? 'maya')
    setStatus(project?.status ?? 'Planning')
    setColor(project?.color ?? ACCENTS[data.projects.length % ACCENTS.length])
    setDescription(project?.description ?? '')
    setContactName(project?.clientContact?.name ?? '')
    setContactRole(project?.clientContact?.role ?? '')
    setContactEmail(project?.clientContact?.email ?? '')
    setContactPhone(project?.clientContact?.phone ?? '')
    setContactAddress(project?.clientContact?.address ?? '')
    setProjectType(project?.projectDetails?.type ?? 'Product delivery')
    setObjectives(project?.projectDetails?.objectives ?? '')
    setContractValue(project?.projectDetails?.contractValue ?? project?.workflow.payments.contractValue ?? 0)
    setCurrency(project?.projectDetails?.currency ?? 'USD')
    setStartDate(project?.projectDetails?.startDate ?? todayKey())
    setTargetEndDate(project?.projectDetails?.targetEndDate ?? shiftDateKey(todayKey(), 45))
    setError('')
  }, [open, project, data.members, data.projects.length])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !code.trim() || !client.trim()) {
      setError('Project name, project code and client are required.')
      return
    }
    if (!contactName.trim()) {
      setError('Add the main client contact person.')
      return
    }
    if (contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setError('Enter a valid email for the client contact.')
      return
    }
    if (targetEndDate < startDate) {
      setError('The target end date must be after the project start date.')
      return
    }
    const normalizedCode = code.trim().toUpperCase()
    const duplicate = data.projects.find(
      (item) => item.code.toUpperCase() === normalizedCode && item.id !== project?.id,
    )
    if (duplicate) {
      setError(`The code ${normalizedCode} is already used by ${duplicate.name}.`)
      return
    }

    const clientContact = {
      name: contactName.trim(),
      role: contactRole.trim(),
      email: contactEmail.trim(),
      phone: contactPhone.trim(),
      address: contactAddress.trim(),
    }
    const projectDetails = {
      type: projectType.trim() || 'Product delivery',
      objectives: objectives.trim(),
      contractValue: Math.max(0, Number(contractValue) || 0),
      currency,
      startDate,
      targetEndDate,
    }

    if (editing && project) {
      updateProject(project.id, {
        name: name.trim(),
        code: normalizedCode,
        client: client.trim(),
        leadId,
        status,
        color,
        description: description.trim(),
        clientContact,
        projectDetails,
        workflow: {
          ...project.workflow,
          payments: {
            ...project.workflow.payments,
            contractValue: projectDetails.contractValue,
            currency,
          },
        },
      })
      notify(`${name.trim()} updated.`)
      onClose()
      return
    }

    const created = addProject({
      name,
      code: normalizedCode,
      client,
      leadId,
      status,
      color,
      description,
      clientContact,
      projectDetails,
    })
    notify(`${created.name} created. Complete the delivery flow to start the project.`)
    onClose()
    onCreated?.(created.id)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('Edit project') : t('New project')}
      description={
        editing
          ? t('Update client, commercial and delivery details.')
          : t('Set up a client project, capture the main contact and prepare the delivery flow.')
      }
      width="max-w-[780px]"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('Cancel')}
          </button>
          <button type="submit" form="project-form" className="btn btn-primary">
            {editing ? <Check size={13} /> : <Plus size={13} />}
            {editing ? t('Save changes') : t('Create project')}
          </button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} className="space-y-5">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#f4f1ff] text-[#6d28d9]">
              <BriefcaseBusiness size={11} />
            </span>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{t('Project identity')}</h3>
          </div>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1.5fr_0.6fr]">
              <label className="block">
                <span className="field-label">{t('Project name')}</span>
                <input
                  id="project-name"
                  autoFocus
                  className="input !py-3 !text-[14px] font-medium"
                  placeholder="e.g. Northwind AI Copilot"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="field-label">{t('Project code')}</span>
                <input
                  className="input font-mono uppercase"
                  placeholder="NWC"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">{t('Client company')}</span>
                <span className="relative block">
                  <Building2 size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                  <input
                    className="input pl-8"
                    placeholder="Client or Internal"
                    value={client}
                    onChange={(event) => setClient(event.target.value)}
                  />
                </span>
              </label>
              <label className="block">
                <span className="field-label">{t('Lead owner')}</span>
                <span className="relative block">
                  <UserRound size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                  <select
                    className="input appearance-none pl-8 pr-8"
                    value={leadId}
                    onChange={(event) => setLeadId(event.target.value)}
                  >
                    {data.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} · {member.role}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle" />
                </span>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">{t('Status')}</span>
                <select
                  className="input appearance-none"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ProjectStatus)}
                >
                  {PROJECT_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {t(item)}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="field-label flex items-center gap-1.5">
                  <Palette size={11} /> {t('Accent colour')}
                </span>
                <div className="flex h-[38px] flex-wrap items-center gap-1.5">
                  {ACCENTS.slice(0, 7).map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => setColor(swatch)}
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-transform hover:scale-105 ${
                        color === swatch ? 'border-ink' : 'border-transparent'
                      }`}
                      aria-label={`Use accent ${swatch}`}
                    >
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: swatch }} />
                    </button>
                  ))}
                  <label className="ml-0.5 flex h-6 cursor-pointer items-center rounded-full border border-line px-1.5 text-[9px] font-medium text-muted">
                    <input
                      type="color"
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                      className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
                    />
                  </label>
                </div>
              </div>
            </div>

            <label className="block">
              <span className="field-label">{t('Short description')}</span>
              <textarea
                className="input min-h-[58px] resize-y leading-relaxed"
                placeholder="One-line summary of the project."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-[#fcfcfd] p-3.5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#eff6ff] text-[#1d4ed8]">
              <Contact size={11} />
            </span>
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{t('Client details')}</h3>
              <p className="mt-0.5 text-[9.5px] text-subtle">{t('Main contact person')}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">{t('Main contact person')}</span>
              <input
                className="input bg-white"
                placeholder="e.g. Daniel Tan"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="field-label">{t('Role / position')}</span>
              <input
                className="input bg-white"
                placeholder="e.g. VP Operations"
                value={contactRole}
                onChange={(event) => setContactRole(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="field-label">{t('Contact email')}</span>
              <span className="relative block">
                <Mail size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <input
                  type="email"
                  className="input bg-white pl-8"
                  placeholder="contact@company.com"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                />
              </span>
            </label>
            <label className="block">
              <span className="field-label">{t('Contact phone')}</span>
              <span className="relative block">
                <Phone size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <input
                  className="input bg-white pl-8"
                  placeholder="+62 812 3456 7890"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                />
              </span>
            </label>
            <label className="block sm:col-span-2">
              <span className="field-label">{t('Client address')}</span>
              <span className="relative block">
                <MapPin size={13} className="pointer-events-none absolute left-3 top-3 text-subtle" />
                <input
                  className="input bg-white pl-8"
                  placeholder="Office / billing address"
                  value={contactAddress}
                  onChange={(event) => setContactAddress(event.target.value)}
                />
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-[#fcfcfd] p-3.5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#ecfdf5] text-[#047857]">
              <CircleDollarSign size={11} />
            </span>
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{t('Project details')}</h3>
              <p className="mt-0.5 text-[9.5px] text-subtle">{t('Delivery objectives')}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">{t('Project type')}</span>
              <input
                className="input bg-white"
                placeholder="e.g. AI product, client portal"
                value={projectType}
                onChange={(event) => setProjectType(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="field-label">{t('Contract value')}</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="input min-w-0 flex-1 bg-white"
                  placeholder="0"
                  value={contractValue}
                  onChange={(event) => setContractValue(Number(event.target.value))}
                />
                <select
                  className="input w-[88px] appearance-none bg-white font-mono"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as Currency)}
                >
                  <option value="USD">USD</option>
                  <option value="IDR">IDR</option>
                </select>
              </div>
            </label>
            <label className="block">
              <span className="field-label">{t('Project start')}</span>
              <span className="relative block">
                <CalendarDays size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <input
                  type="date"
                  className="input bg-white pl-8"
                  value={startDate}
                  onChange={(event) => {
                    const next = event.target.value
                    if (!next) return
                    setStartDate(next)
                    if (targetEndDate < next) setTargetEndDate(shiftDateKey(next, 45))
                  }}
                />
              </span>
            </label>
            <label className="block">
              <span className="field-label">{t('Target end date')}</span>
              <span className="relative block">
                <CalendarDays size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <input
                  type="date"
                  className="input bg-white pl-8"
                  min={startDate}
                  value={targetEndDate}
                  onChange={(event) => setTargetEndDate(event.target.value)}
                />
              </span>
            </label>
            <label className="block sm:col-span-2">
              <span className="field-label">{t('Delivery objectives')}</span>
              <textarea
                className="input min-h-[62px] resize-y bg-white leading-relaxed"
                placeholder="What outcome does this project need to create for the client?"
                value={objectives}
                onChange={(event) => setObjectives(event.target.value)}
              />
            </label>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-[#fecdd3] bg-[#fff1f2] px-3 py-2 text-[12px] text-[#be123c]">
            {error}
          </div>
        )}
      </form>
    </Modal>
  )
}
