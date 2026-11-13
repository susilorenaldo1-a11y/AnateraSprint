import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

/* ------------------------------------------------------------------
   Tiny, dependency-free SVG charts. Colours come from CSS variables
   so light and dark themes both work.
------------------------------------------------------------------- */

export interface Segment {
  label: string
  value: number
  color: string
}

/** Donut chart with a centre label. */
export function Donut({
  segments,
  size = 128,
  thickness = 5.5,
  center,
}: {
  segments: Segment[]
  size?: number
  thickness?: number
  center?: ReactNode
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const radius = 21 - thickness / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 42 42" width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx="21" cy="21" r={radius} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const length = (s.value / total) * circumference
              const dash = `${Math.max(0, length - 0.6)} ${circumference - Math.max(0, length - 0.6)}`
              const circle = (
                <circle
                  key={s.label}
                  cx="21"
                  cy="21"
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  style={{ transition: 'stroke-dasharray 600ms var(--ease-out-expo)' }}
                />
              )
              offset += length
              return circle
            })}
      </svg>
      {center && <div className="absolute inset-0 flex flex-col items-center justify-center">{center}</div>}
    </div>
  )
}

/** Single-value progress ring. */
export function Ring({
  value,
  size = 56,
  thickness = 5,
  color = 'var(--accent)',
  label,
}: {
  value: number
  size?: number
  thickness?: number
  color?: string
  label?: ReactNode
}) {
  const safe = Math.min(100, Math.max(0, value))
  const radius = 21 - thickness / 2
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 42 42" width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx="21" cy="21" r={radius} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        <circle
          cx="21"
          cy="21"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${(safe / 100) * circumference} ${circumference}`}
          style={{ transition: 'stroke-dasharray 600ms var(--ease-out-expo)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {label ?? <span className="text-[12px] font-semibold tracking-[-0.02em] text-ink">{Math.round(safe)}%</span>}
      </div>
    </div>
  )
}

/** One horizontal bar row: [left] ──bar── [value]. */
export function BarRow({
  left,
  value,
  max,
  color,
  display,
  onClick,
}: {
  left: ReactNode
  value: number
  max: number
  color: string
  display?: ReactNode
  onClick?: () => void
}) {
  const pct = max <= 0 ? 0 : Math.min(100, (value / max) * 100)
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 text-left"
    >
      <span className="flex w-[74px] shrink-0 items-center gap-1.5 truncate text-[10.5px] font-medium text-ink">{left}</span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--faint)' }}>
        <span
          className="block h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            transition: 'width 600ms var(--ease-out-expo)',
          }}
        />
      </span>
      <span className="w-9 shrink-0 text-right font-mono text-[10px] text-muted">{display ?? value}</span>
    </Tag>
  )
}

/** Small vertical bar chart (e.g. velocity per sprint). Last bar is highlighted. */
export function MiniBars({
  values,
  color = 'var(--accent)',
  height = 40,
  slots = 5,
}: {
  values: number[]
  color?: string
  height?: number
  slots?: number
}) {
  const shown = values.slice(-slots)
  const max = Math.max(1, ...shown)
  const empties = Math.max(0, slots - shown.length)
  return (
    <div className="flex items-end gap-1" style={{ height }} aria-hidden="true">
      {Array.from({ length: empties }, (_, i) => (
        <span key={`e${i}`} className="w-full rounded-[3px]" style={{ height: 4, backgroundColor: 'var(--line)' }} />
      ))}
      {shown.map((value, index) => (
        <span
          key={index}
          className="w-full rounded-[3px]"
          title={`${value}`}
          style={{
            height: Math.max(4, (value / max) * height),
            backgroundColor: color,
            opacity: index === shown.length - 1 ? 1 : 0.35,
            transition: 'height 600ms var(--ease-out-expo)',
          }}
        />
      ))}
    </div>
  )
}

/** One stacked horizontal bar made of coloured segments. */
export function StackedBar({ segments, height = 8 }: { segments: Segment[]; height?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  return (
    <div className="flex w-full gap-[2px] overflow-hidden rounded-full" style={{ height, backgroundColor: 'var(--faint)' }}>
      {total > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span
              key={s.label}
              title={`${s.label}: ${s.value}`}
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
            />
          ))}
    </div>
  )
}

/** Vertical column chart with a value above and a label below each column. */
export function ColumnChart({
  items,
  height = 120,
}: {
  items: { label: string; value: number; display: string; color: string }[]
  height?: number
}) {
  const max = Math.max(1, ...items.map((item) => item.value))
  return (
    <div className="flex items-end gap-2" style={{ height: height + 34 }}>
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <span className="h-3 font-mono text-[9px] leading-3 text-muted">{item.value > 0 ? item.display : ''}</span>
          <span
            className="w-full rounded-t-md"
            title={item.display}
            style={{
              height: item.value > 0 ? Math.max(6, (item.value / max) * height) : 3,
              backgroundColor: item.value > 0 ? item.color : 'var(--line)',
              transition: 'height 600ms var(--ease-out-expo)',
            }}
          />
          <span className="h-3 text-[9.5px] leading-3 text-subtle">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

/** Compact KPI tile: icon + label, one big value, and an optional small visual on the right. */
export function Kpi({
  icon,
  tint,
  label,
  value,
  valueClass,
  size = 'lg',
  visual,
}: {
  icon: ReactNode
  tint: string
  label: string
  value: ReactNode
  valueClass?: string
  size?: 'lg' | 'md'
  visual?: ReactNode
}) {
  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
          <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: `${tint}1f`, color: tint }}>
            {icon}
          </span>
          {label}
        </span>
        <div
          className={cn(
            'mt-2.5 truncate font-semibold leading-none tracking-[-0.045em] text-ink',
            size === 'lg' ? 'text-[30px]' : 'text-[22px]',
            valueClass,
          )}
        >
          {value}
        </div>
      </div>
      {visual && <div className="w-[64px] shrink-0">{visual}</div>}
    </div>
  )
}
