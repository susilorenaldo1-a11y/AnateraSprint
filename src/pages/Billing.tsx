import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CheckCircle2, Pencil, Receipt, Send, TriangleAlert, Undo2, Wallet } from 'lucide-react'
import type { AppOutletContext } from '../App'
import { useWorkspace } from '../store/WorkspaceStore'
import type { Currency, PaymentMilestoneId, PaymentMilestoneStatus } from '../types'
import { EmptyState } from '../components/ui'
import { ColumnChart, Donut, Kpi, Ring, StackedBar, type Segment } from '../components/charts'
import { formatMoney } from '../lib/normalizeWorkspace'
import { formatMoneyCompact, getDueBuckets, getProjectBill, type BillMilestone, type ProjectBill } from '../lib/billing'
import { formatRelativeTime, formatShortDate } from '../lib/date'
import { getScopedProjects } from '../lib/scope'
import { cn } from '../lib/utils'
import { useI18n } from '../i18n/I18nProvider'

const COLORS = {
  paid: '#10B981',
  invoiced: '#3B82F6',
  pending: '#9CA3AF',
  overdue: '#E11D48',
  accent: '#6E56F0',
}

const STATUS_STYLE: Record<PaymentMilestoneStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Pending', bg: 'var(--faint)', fg: 'var(--muted)' },
  invoiced: { label: 'Invoiced', bg: 'var(--info-soft)', fg: 'var(--info)' },
  paid: { label: 'Paid', bg: 'var(--success-soft)', fg: 'var(--success)' },
}

const MILESTONE_TITLE: Record<PaymentMilestoneId, string> = {
  upfront: 'Upfront',
  completion: 'Completion',
  retention: 'Retention',
}

function MilestoneCell({
  bill,
  item,
  onStatus,
}: {
  bill: ProjectBill
  item: BillMilestone
  onStatus: (status: PaymentMilestoneStatus) => void
}) {
  const { t } = useI18n()
  const { milestone, amount, overdue } = item
  const style = STATUS_STYLE[milestone.status]
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border p-3"
      style={{ backgroundColor: 'var(--surface-sunken)', borderColor: overdue ? 'var(--danger)' : 'var(--line)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-semibold text-ink">{t(MILESTONE_TITLE[milestone.id])}</span>
        <span className="font-mono text-[9.5px] text-subtle">{milestone.percentage}%</span>
      </div>
      <div className="truncate text-[15px] font-semibold tracking-[-0.02em] text-ink">{formatMoney(amount, bill.currency)}</div>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn('inline-flex items-center gap-1 font-mono text-[9.5px]', overdue ? 'font-semibold' : 'text-subtle')}
          style={overdue ? { color: 'var(--danger)' } : undefined}
        >
          {overdue && <TriangleAlert size={10} />}
          {milestone.dueDate ? formatShortDate(milestone.dueDate) : '—'}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[9.5px] font-semibold"
          style={{ backgroundColor: style.bg, color: style.fg }}
        >
          {t(style.label)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {milestone.status === 'pending' && (
          <button type="button" className="btn btn-secondary !flex-1 !py-1.5 !text-[11px]" onClick={() => onStatus('invoiced')}>
            <Send size={11} /> {t('Invoice')}
          </button>
        )}
        {milestone.status === 'invoiced' && (
          <button type="button" className="btn btn-primary !flex-1 !py-1.5 !text-[11px]" onClick={() => onStatus('paid')}>
            <CheckCircle2 size={11} /> {t('Mark paid')}
          </button>
        )}
        {milestone.status === 'paid' && (
          <span className="flex flex-1 items-center gap-1 py-1.5 text-[10.5px] font-medium" style={{ color: 'var(--success)' }}>
            <CheckCircle2 size={12} /> {milestone.paidAt ? formatRelativeTime(milestone.paidAt) : t('Paid')}
          </span>
        )}
        {milestone.status !== 'pending' && (
          <button
            type="button"
            className="icon-btn h-7 w-7"
            title={t('Undo')}
            aria-label={t('Undo')}
            onClick={() => onStatus(milestone.status === 'paid' ? 'invoiced' : 'pending')}
          >
            <Undo2 size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

export function Billing() {
  const { data, projectFilter, updateProject, notify } = useWorkspace()
  const { openProjectWorkspace } = useOutletContext<AppOutletContext>()
  const { t, language } = useI18n()
  const [pickedCurrency, setPickedCurrency] = useState<Currency | null>(null)

  const scoped = getScopedProjects(data, projectFilter)
  const currencies = Array.from(new Set(scoped.map((project) => project.workflow.payments.currency)))
  const currency: Currency = pickedCurrency && currencies.includes(pickedCurrency) ? pickedCurrency : currencies[0] ?? 'USD'

  const bills = scoped.map((project) => getProjectBill(project)).filter((bill) => bill.currency === currency)
  const sum = (key: 'total' | 'paid' | 'invoiced' | 'pending' | 'overdue') =>
    bills.reduce((total, bill) => total + bill[key], 0)
  const total = sum('total')
  const paid = sum('paid')
  const invoiced = sum('invoiced')
  const pending = sum('pending')
  const overdue = sum('overdue')
  const overdueCount = bills.reduce((count, bill) => count + bill.overdueCount, 0)
  const collectedPct = total === 0 ? 0 : Math.round((paid / total) * 100)

  const segments: Segment[] = [
    { label: t('Paid'), value: paid, color: COLORS.paid },
    { label: t('Invoiced'), value: invoiced, color: COLORS.invoiced },
    { label: t('To invoice'), value: pending, color: COLORS.pending },
  ]
  const buckets = getDueBuckets(bills, {
    overdue: t('Overdue'),
    later: t('Later'),
    locale: language === 'id' ? 'id-ID' : 'en-US',
  })

  function setStatus(bill: ProjectBill, id: PaymentMilestoneId, status: PaymentMilestoneStatus) {
    const { project } = bill
    updateProject(project.id, {
      workflow: {
        ...project.workflow,
        payments: {
          ...project.workflow.payments,
          milestones: project.workflow.payments.milestones.map((milestone) =>
            milestone.id === id
              ? { ...milestone, status, paidAt: status === 'paid' ? new Date().toISOString() : undefined }
              : milestone,
          ),
        },
      },
    })
    notify(`${project.code} · ${t(MILESTONE_TITLE[id])} → ${t(STATUS_STYLE[status].label)}`)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">{t('Billing')}</span>
          <h1 className="mt-1.5 text-[27px] font-semibold leading-[1.15] tracking-[-0.035em] text-ink sm:text-[30px]">
            {formatMoney(total, currency)}
          </h1>
        </div>
        {currencies.length > 1 && (
          <div className="inline-flex rounded-[10px] border border-line p-0.5" style={{ backgroundColor: 'var(--faint)' }} role="tablist">
            {currencies.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={item === currency}
                onClick={() => setPickedCurrency(item)}
                className={cn(
                  'rounded-[8px] px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors',
                  item === currency ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
                )}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {bills.length === 0 ? (
        <EmptyState
          icon={<Receipt size={18} />}
          title={t('No bills yet')}
          description={t('Add a contract value to a project to see its bill.')}
        />
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi
              icon={<Wallet size={12} />}
              tint={COLORS.accent}
              label={t('Contract value')}
              size="md"
              value={formatMoneyCompact(total, currency)}
            />
            <Kpi
              icon={<CheckCircle2 size={12} />}
              tint={COLORS.paid}
              label={t('Paid')}
              size="md"
              value={formatMoneyCompact(paid, currency)}
              visual={<Ring value={collectedPct} size={52} thickness={5} color={COLORS.paid} />}
            />
            <Kpi
              icon={<Send size={12} />}
              tint={COLORS.invoiced}
              label={t('Invoiced')}
              size="md"
              value={formatMoneyCompact(invoiced, currency)}
            />
            <Kpi
              icon={<TriangleAlert size={12} />}
              tint={COLORS.overdue}
              label={t('Overdue')}
              size="md"
              value={formatMoneyCompact(overdue, currency)}
              valueClass={overdue > 0 ? 'text-[#be123c]' : undefined}
              visual={
                overdueCount > 0 ? (
                  <span
                    className="ml-auto flex w-fit items-center rounded-full px-2 py-1 text-[11px] font-semibold"
                    style={{ backgroundColor: 'var(--danger-soft)', color: 'var(--danger)' }}
                  >
                    {overdueCount}
                  </span>
                ) : undefined
              }
            />
          </div>

          {/* Charts */}
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <section className="card p-4">
              <h2 className="text-[12px] font-semibold text-ink">{t('Collection')}</h2>
              <div className="mt-3 flex items-center gap-4">
                <Donut
                  segments={segments}
                  size={120}
                  center={<span className="text-[22px] font-semibold leading-none tracking-[-0.04em] text-ink">{collectedPct}%</span>}
                />
                <ul className="min-w-0 flex-1 space-y-2">
                  {segments.map((segment) => (
                    <li key={segment.label} className="flex items-center gap-2 text-[10.5px]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span className="flex-1 truncate text-muted">{segment.label}</span>
                      <span className="font-mono font-medium text-ink">{formatMoneyCompact(segment.value, currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="card p-4">
              <h2 className="text-[12px] font-semibold text-ink">{t('Cash due')}</h2>
              <div className="mt-4">
                <ColumnChart
                  items={buckets.map((bucket) => ({
                    label: bucket.label,
                    value: bucket.value,
                    display: formatMoneyCompact(bucket.value, currency),
                    color: bucket.overdue ? COLORS.overdue : COLORS.accent,
                  }))}
                />
              </div>
            </section>
          </div>

          {/* Project bills */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-ink">{t('Project bills')}</h2>
              <span className="rounded-full bg-[var(--faint)] px-1.5 py-0.5 font-mono text-[9px] text-muted">{bills.length}</span>
            </div>
            <div className="space-y-3">
              {bills.map((bill) => (
                <article key={bill.project.id} className="card space-y-4 p-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openProjectWorkspace(bill.project.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] font-mono text-[10px] font-semibold text-white shadow-sm"
                      style={{ background: `linear-gradient(140deg, ${bill.project.color}, ${bill.project.color}d9)` }}
                      aria-label={`Open ${bill.project.name} project workspace`}
                    >
                      {bill.project.code}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-ink" title={bill.project.client}>
                        {bill.project.name}
                      </div>
                      <div className="mt-2">
                        <StackedBar
                          height={7}
                          segments={[
                            { label: t('Paid'), value: bill.paid, color: COLORS.paid },
                            { label: t('Invoiced'), value: bill.invoiced, color: COLORS.invoiced },
                            { label: t('To invoice'), value: bill.pending, color: COLORS.pending },
                          ]}
                        />
                      </div>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <div className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
                        {formatMoney(bill.total, bill.currency)}
                      </div>
                    </div>
                    <Ring value={bill.paidPct} size={44} thickness={5} color={COLORS.paid} />
                    <button
                      type="button"
                      className="icon-btn h-8 w-8"
                      onClick={() => openProjectWorkspace(bill.project.id)}
                      title={t('Edit project')}
                      aria-label={t('Edit project')}
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {bill.milestones.map((item) => (
                      <MilestoneCell
                        key={item.milestone.id}
                        bill={bill}
                        item={item}
                        onStatus={(status) => setStatus(bill, item.milestone.id, status)}
                      />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
