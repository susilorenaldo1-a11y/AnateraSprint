import type { Currency, PaymentMilestone, Project } from '../types'
import { paymentAmount } from './normalizeWorkspace'
import { todayKey } from './date'

export interface BillMilestone {
  milestone: PaymentMilestone
  amount: number
  overdue: boolean
}

export interface ProjectBill {
  project: Project
  currency: Currency
  total: number
  paid: number
  invoiced: number
  pending: number
  overdue: number
  overdueCount: number
  paidPct: number
  milestones: BillMilestone[]
}

/** Money summary for one project, derived from its 50 / 40 / 10 payment schedule. */
export function getProjectBill(project: Project, referenceDate = todayKey()): ProjectBill {
  const payments = project.workflow.payments
  const milestones: BillMilestone[] = payments.milestones.map((milestone) => ({
    milestone,
    amount: paymentAmount(project, milestone),
    overdue: milestone.status !== 'paid' && Boolean(milestone.dueDate) && (milestone.dueDate as string) < referenceDate,
  }))
  const sum = (predicate: (item: BillMilestone) => boolean) =>
    milestones.filter(predicate).reduce((total, item) => total + item.amount, 0)

  const total = payments.contractValue
  const paid = sum((item) => item.milestone.status === 'paid')
  const invoiced = sum((item) => item.milestone.status === 'invoiced')
  return {
    project,
    currency: payments.currency,
    total,
    paid,
    invoiced,
    pending: Math.max(0, total - paid - invoiced),
    overdue: sum((item) => item.overdue),
    overdueCount: milestones.filter((item) => item.overdue).length,
    paidPct: total === 0 ? 0 : Math.round((paid / total) * 100),
    milestones,
  }
}

/** Compact money for tight spaces, e.g. "$12.5K" or "Rp 150 jt". */
export function formatMoneyCompact(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

export interface DueBucket {
  key: string
  label: string
  value: number
  overdue: boolean
}

/**
 * Unpaid money grouped by due month: one "overdue" bucket, then the next
 * `months` calendar months, then "later" (only when something falls there).
 */
export function getDueBuckets(
  bills: ProjectBill[],
  labels: { overdue: string; later: string; locale: string },
  months = 6,
  referenceDate = todayKey(),
): DueBucket[] {
  const [year, month] = referenceDate.split('-').map(Number)
  const buckets: DueBucket[] = [{ key: 'overdue', label: labels.overdue, value: 0, overdue: true }]
  for (let i = 0; i < months; i += 1) {
    const date = new Date(year, month - 1 + i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    buckets.push({
      key,
      label: date.toLocaleDateString(labels.locale, { month: 'short' }),
      value: 0,
      overdue: false,
    })
  }
  const later: DueBucket = { key: 'later', label: labels.later, value: 0, overdue: false }

  bills.forEach((bill) => {
    bill.milestones.forEach(({ milestone, amount, overdue }) => {
      if (milestone.status === 'paid') return
      if (overdue) {
        buckets[0].value += amount
        return
      }
      const key = (milestone.dueDate ?? '').slice(0, 7)
      const target = buckets.find((bucket) => bucket.key === key)
      if (target) target.value += amount
      else later.value += amount
    })
  })
  return later.value > 0 ? [...buckets, later] : buckets
}
