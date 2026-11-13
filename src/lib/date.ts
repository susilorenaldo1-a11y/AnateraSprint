import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { enUS, id as idLocale } from 'date-fns/locale'

export type AppLanguage = 'en' | 'id'

let activeLanguage: AppLanguage = 'en'
let activeDateLocale = enUS

export function setDateLocale(language: AppLanguage): void {
  activeLanguage = language
  activeDateLocale = language === 'id' ? idLocale : enUS
}

export const DAY_MS = 86_400_000

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(key: string): Date {
  return parse(key, 'yyyy-MM-dd', new Date())
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function shiftDateKey(key: string, days: number): string {
  return toDateKey(addDays(parseDateKey(key), days))
}

export function daysBetween(fromKey: string, toKey: string): number {
  return differenceInCalendarDays(parseDateKey(toKey), parseDateKey(fromKey))
}

export function sprintDay(startKey: string, dateKey: string): number {
  return daysBetween(startKey, dateKey) + 1
}

export function addDaysToKey(key: string, days: number): string {
  return shiftDateKey(key, days)
}

export function sprintEndFromStart(startKey: string): string {
  return shiftDateKey(startKey, 13)
}

export function fourteenDayWindow(startKey: string): string[] {
  return Array.from({ length: 14 }, (_, index) => shiftDateKey(startKey, index))
}

export function dateRangeKeys(startKey: string, endKey: string): string[] {
  if (endKey < startKey) return []
  return eachDayOfInterval({ start: parseDateKey(startKey), end: parseDateKey(endKey) }).map(toDateKey)
}

export function formatShortDate(key: string): string {
  return format(parseDateKey(key), 'MMM d', { locale: activeDateLocale })
}

export function formatLongDate(key: string): string {
  return format(parseDateKey(key), 'EEE, MMM d', { locale: activeDateLocale })
}

export function formatFullDate(key: string): string {
  return format(parseDateKey(key), 'EEEE, MMMM d, yyyy', { locale: activeDateLocale })
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: activeDateLocale })
}

export function formatRange(startKey: string, endKey: string): string {
  if (startKey === endKey) {
    return format(parseDateKey(startKey), 'MMM d, yyyy', { locale: activeDateLocale })
  }
  const start = parseDateKey(startKey)
  const end = parseDateKey(endKey)
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${format(start, 'MMM d', { locale: activeDateLocale })} – ${format(end, 'd, yyyy', { locale: activeDateLocale })}`
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'MMM d', { locale: activeDateLocale })} – ${format(end, 'MMM d, yyyy', { locale: activeDateLocale })}`
  }
  return `${format(start, 'MMM d, yyyy', { locale: activeDateLocale })} – ${format(end, 'MMM d, yyyy', { locale: activeDateLocale })}`
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const minutes = Math.max(1, Math.round(diff / 60_000))
  if (minutes < 60) return activeLanguage === 'id' ? `${minutes}m lalu` : `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return activeLanguage === 'id' ? `${hours}j lalu` : `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return activeLanguage === 'id' ? `${days}h lalu` : `${days}d ago`
  return format(new Date(then), 'MMM d', { locale: activeDateLocale })
}

export function dueLabel(dueKey: string): { label: string; tone: 'overdue' | 'today' | 'soon' | 'normal' } {
  const diff = daysBetween(todayKey(), dueKey)
  if (diff < 0) {
    return {
      label: activeLanguage === 'id' ? `${Math.abs(diff)}hr terlambat` : `${Math.abs(diff)}d overdue`,
      tone: 'overdue',
    }
  }
  if (diff === 0) return { label: activeLanguage === 'id' ? 'Jatuh tempo hari ini' : 'Due today', tone: 'today' }
  if (diff === 1) return { label: activeLanguage === 'id' ? 'Jatuh tempo besok' : 'Due tomorrow', tone: 'soon' }
  if (diff <= 3) return { label: format(parseDateKey(dueKey), 'EEE d', { locale: activeDateLocale }), tone: 'soon' }
  return { label: format(parseDateKey(dueKey), 'MMM d', { locale: activeDateLocale }), tone: 'normal' }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function getMonthMatrix(monthDate: Date): Date[] {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export { addDays, addMonths, endOfMonth, isSameDay, isSameMonth, isToday, parse, startOfMonth, subMonths, format }
