import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Minus,
  TrendingUp,
  X,
} from 'lucide-react'
import type { PaceState, Priority, ProjectStatus, TeamMember } from '../../types'
import { cn } from '../../lib/utils'
import { useWorkspace } from '../../store/WorkspaceStore'
import { useI18n } from '../../i18n/I18nProvider'

export function Avatar({
  member,
  size = 28,
  className,
  ring = false,
}: {
  member?: TeamMember | null
  size?: number
  className?: string
  ring?: boolean
}) {
  if (!member) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong bg-faint text-[9px] font-semibold text-subtle',
          ring && 'ring-2 ring-white',
          className,
        )}
        style={{ width: size, height: size }}
        title="Unassigned"
      >
        —
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none text-white',
        ring && 'ring-2 ring-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: member.color,
        fontSize: Math.max(8, Math.round(size * 0.34)),
        letterSpacing: '0.01em',
      }}
      title={`${member.name} · ${member.role}`}
      aria-label={member.name}
    >
      {member.initials}
    </span>
  )
}

export function AvatarStack({
  memberIds,
  members,
  max = 4,
  size = 26,
}: {
  memberIds: string[]
  members: TeamMember[]
  max?: number
  size?: number
}) {
  const found = memberIds
    .map((id) => members.find((member) => member.id === id))
    .filter((member): member is TeamMember => Boolean(member))
  const visible = found.slice(0, max)
  const overflow = found.length - visible.length

  return (
    <div className="flex items-center">
      <div className="flex -space-x-1.5">
        {visible.map((member) => (
          <Avatar key={member.id} member={member} size={size} ring />
        ))}
      </div>
      {overflow > 0 && (
        <span
          className="ml-1.5 inline-flex items-center justify-center rounded-full border border-line bg-faint font-medium text-muted"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.3) }}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}

const priorityMap: Record<Priority, { bg: string; text: string; dot: string }> = {
  Urgent: { bg: 'bg-[#fff1f2]', text: 'text-[#be123c]', dot: 'bg-[#e11d48]' },
  High: { bg: 'bg-[#fffbeb]', text: 'text-[#b45309]', dot: 'bg-[#f59e0b]' },
  Normal: { bg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]', dot: 'bg-[#3b82f6]' },
  Low: { bg: 'bg-[#f4f4f5]', text: 'text-[#6b7280]', dot: 'bg-[#a1a1aa]' },
}

export function PriorityBadge({ priority, compact = false }: { priority: Priority; compact?: boolean }) {
  const { t } = useI18n()
  const tone = priorityMap[priority]
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted">
        <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
        {t(priority)}
      </span>
    )
  }
  return (
    <span className={cn('badge', tone.bg, tone.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
      {t(priority)}
    </span>
  )
}

const projectStatusMap: Record<ProjectStatus, string> = {
  Active: 'bg-[#ecfdf5] text-[#047857]',
  'At Risk': 'bg-[#fff1f2] text-[#be123c]',
  Planning: 'bg-[#eff6ff] text-[#1d4ed8]',
  Complete: 'bg-[#f4f4f5] text-[#52525b]',
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useI18n()
  return (
    <span className={cn('badge', projectStatusMap[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {t(status)}
    </span>
  )
}

const paceMap: Record<
  PaceState,
  { bg: string; text: string; icon: typeof TrendingUp; dot: string }
> = {
  'Ahead of Schedule': { bg: 'bg-[#ecfdf5]', text: 'text-[#047857]', icon: TrendingUp, dot: 'bg-emerald-500' },
  'On Track': { bg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]', icon: Check, dot: 'bg-blue-500' },
  'At Risk': { bg: 'bg-[#fff1f2]', text: 'text-[#be123c]', icon: AlertTriangle, dot: 'bg-rose-500' },
  Upcoming: { bg: 'bg-[#fffbeb]', text: 'text-[#b45309]', icon: Clock3, dot: 'bg-amber-500' },
  Complete: { bg: 'bg-[#f0fdf4]', text: 'text-[#15803d]', icon: CheckCircle2, dot: 'bg-green-500' },
}

export function PaceBadge({ pace, compact = false }: { pace: PaceState; compact?: boolean }) {
  const { t } = useI18n()
  const tone = paceMap[pace]
  const Icon = tone.icon
  const label =
    compact && pace === 'Ahead of Schedule'
      ? t('Ahead')
      : compact && pace === 'At Risk'
        ? t('At risk')
        : t(pace)
  return (
    <span className={cn('badge', tone.bg, tone.text, compact && 'px-1.5 py-1 text-[9px]')}>
      <Icon size={compact ? 10 : 11} strokeWidth={2.2} />
      {label}
    </span>
  )
}

export function ProgressBar({
  value,
  color,
  className,
  height = 5,
  muted = false,
}: {
  value: number
  color?: string
  className?: string
  height?: number
  muted?: boolean
}) {
  const safeValue = Math.min(100, Math.max(0, value))
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-[#f0f1f3]', className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${safeValue}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ backgroundColor: muted ? '#d4d4d8' : color ?? 'var(--ink)' }}
      />
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-xl',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
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
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 pt-[8vh] sm:p-6 sm:pt-[10vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            className="fixed inset-0 cursor-default bg-[#111827]/30 backdrop-blur-[3px]"
            aria-label="Close dialog"
            onClick={onClose}
            tabIndex={-1}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn('relative z-10 w-full rounded-[18px] border border-white/60 bg-white shadow-[0_34px_90px_-30px_rgba(17,24,39,0.42)]', width)}
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
                {description && <p className="mt-1 text-[12px] leading-relaxed text-muted">{description}</p>}
              </div>
              <button type="button" className="icon-btn -mr-1.5 -mt-1" onClick={onClose} aria-label="Close">
                <X size={17} />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-2 rounded-b-[18px] border-t border-line bg-[#fcfcfd] px-6 py-3.5">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Popover({
  trigger,
  children,
  align = 'left',
  panelClassName,
  ariaLabel,
}: {
  trigger: ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: 'left' | 'right'
  panelClassName?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="block w-full text-left"
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -3, scale: 0.99 }}
            transition={{ duration: 0.14 }}
            className={cn(
              'absolute top-[calc(100%+8px)] z-50 min-w-[224px] overflow-hidden rounded-[12px] border border-line bg-white p-1.5 shadow-[var(--shadow-popover)]',
              align === 'right' ? 'right-0' : 'left-0',
              panelClassName,
            )}
          >
            {typeof children === 'function' ? children(close) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function DropdownItem({
  icon,
  children,
  onClick,
  selected = false,
  danger = false,
  description,
}: {
  icon?: ReactNode
  children: ReactNode
  onClick?: () => void
  selected?: boolean
  danger?: boolean
  description?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors hover:bg-[#f5f5f7]',
        danger ? 'text-[#be123c]' : 'text-ink',
      )}
    >
      {icon && <span className="mt-0.5 shrink-0 text-muted">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate">{children}</span>
          {selected && <Check size={13} className="ml-auto shrink-0 text-accent" />}
        </span>
        {description && <span className="mt-0.5 block text-[10.5px] leading-snug text-subtle">{description}</span>}
      </span>
    </button>
  )
}

export function ChevronHint() {
  return <ChevronDown size={13} className="shrink-0 text-subtle" />
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-muted shadow-card">
        {icon}
      </div>
      <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-[320px] text-[12px] leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ToastViewport() {
  const { toasts, dismissToast } = useWorkspace()
  return createPortal(
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[120] flex w-full max-w-[380px] -translate-x-1/2 flex-col gap-2 px-4">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex items-center gap-3 rounded-xl border border-[#2b2f39] bg-[#111827] px-3.5 py-3 text-white shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]"
          >
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                toast.tone === 'error' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300',
              )}
            >
              {toast.tone === 'error' ? <AlertTriangle size={12} /> : <Check size={12} />}
            </span>
            <p className="flex-1 text-[12px] font-medium leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Dismiss notification"
            >
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}

export function MetricDelta({ value, label }: { value: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-muted">
      {value > 0 ? <TrendingUp size={11} className="text-emerald-600" /> : <Minus size={11} />}
      {value > 0 ? '+' : ''}
      {value}
      {label ? ` ${label}` : ''}
    </span>
  )
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return <span className={cn('inline-block h-1.5 w-1.5 rounded-full', className)} style={{ backgroundColor: color }} />
}

export function ProjectDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ backgroundColor: color, width: size, height: size, boxShadow: `0 0 0 3px ${color}14` } as CSSProperties}
    />
  )
}
