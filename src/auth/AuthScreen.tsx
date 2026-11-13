import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  KanbanSquare,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
  Wifi,
} from 'lucide-react'
import { useSession } from './SessionProvider'
import { useI18n } from '../i18n/I18nProvider'
import { useTheme, type ThemeMode } from '../theme/ThemeProvider'
import { cn } from '../lib/utils'

const DEMO_EMAIL = 'demo@anatera.co'
const DEMO_PASSWORD = 'Anatera2026!'

function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" style={{ width: size * 0.58, height: size * 0.58 }} fill="none" aria-hidden="true">
        <path d="M5 19L10.6 5.4a1.45 1.45 0 0 1 2.68 0L19 19" stroke="#111827" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 14.1h8.4" stroke="#6E56F0" strokeWidth="2.15" strokeLinecap="round" />
      </svg>
      <span className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-[#6E56F0]" />
    </span>
  )
}

export function AuthScreen() {
  const { login, register } = useSession()
  const { t, language, setLanguage } = useI18n()
  const { theme, setTheme, resolvedTheme, toggleTheme } = useTheme()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function localizedError(message: string): string {
    const known: Record<string, string> = {
      'Invalid email or password': t('Invalid email or password.'),
      'An account with this email already exists': t('An account with this email already exists.'),
      'Password must be at least 8 characters': t('Password must be at least 8 characters.'),
      'Enter a valid email address': t('Enter a valid email address.'),
      'Enter your name': t('Enter your name.'),
      'Failed to fetch': t('Could not connect to the workspace server.'),
    }
    return known[message] ?? message
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Enter your name')
        await register(name.trim(), email.trim(), password)
      } else {
        await login(email.trim(), password)
      }
    } catch (submitError) {
      setError(
        localizedError(submitError instanceof Error ? submitError.message : t('Sign in failed. Please try again.')),
      )
    } finally {
      setBusy(false)
    }
  }

  async function useDemo() {
    setError('')
    setBusy(true)
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD)
    } catch (demoError) {
      setError(localizedError(demoError instanceof Error ? demoError.message : t('Sign in failed. Please try again.')))
    } finally {
      setBusy(false)
    }
  }

  const themeOptions: { id: ThemeMode; icon: typeof Sun; label: string }[] = [
    { id: 'light', icon: Sun, label: t('Light') },
    { id: 'dark', icon: Moon, label: t('Dark') },
    { id: 'system', icon: Monitor, label: t('System') },
  ]

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <div className="relative hidden w-[46%] max-w-[660px] flex-col justify-between overflow-hidden bg-[#0b0b0d] p-10 text-white lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="pointer-events-none absolute -right-28 top-1/4 h-[420px] w-[420px] rounded-full bg-[#6E56F0]/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-[360px] w-[360px] rounded-full bg-[#3B82F6]/10 blur-[90px]" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex items-center gap-3"
        >
          <BrandMark />
          <div>
            <p className="text-[17px] font-semibold tracking-[-0.035em]">anatera</p>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/45">Sprint OS</p>
          </div>
        </motion.div>

        <div className="relative z-10 max-w-[480px]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[9.5px] font-medium uppercase tracking-[0.12em] text-white/60">
              <span className="h-1 w-1 rounded-full bg-[#A99BFF]" />
              {t('Live sync')}
            </span>
            <h1 className="mt-5 text-[46px] font-semibold leading-[1.02] tracking-[-0.045em] xl:text-[54px]">
              {t('14-day delivery, one shared source of truth.')}
            </h1>
            <p className="mt-5 max-w-[420px] text-[13px] leading-[1.75] text-white/55">
              {t('Project flow, proposals, agreements, payments and sprint delivery in one place.')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="mt-9 space-y-3"
          >
            {[
              { icon: ChevronRight, text: t('Proposal, agreement and payment steps stay visible') },
              { icon: KanbanSquare, text: t('Kanban and calendar share one live task store') },
              { icon: Wifi, text: t('Your workspace follows your account across devices') },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.text} className="flex items-center gap-3 text-[11.5px] text-white/70">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                    <Icon size={12} />
                  </span>
                  {item.text}
                </div>
              )
            })}
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-[9px] text-white/35">
          <span>{t('Built for fast, calm delivery teams.')}</span>
          <span className="font-mono">Day 1 → Day 14</span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between p-5 sm:p-7">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#111827]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                <path d="M5 19L10.6 5.4a1.45 1.45 0 0 1 2.68 0L19 19" stroke="white" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7.5 14.1h8.4" stroke="#A99BFF" strokeWidth="2.15" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-[14px] font-semibold tracking-[-0.03em] text-ink">anatera</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="hidden items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 sm:flex">
              {themeOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTheme(option.id)}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                      theme === option.id ? 'bg-ink text-white' : 'text-muted hover:bg-faint hover:text-ink',
                    )}
                    aria-label={option.label}
                    title={option.label}
                  >
                    <Icon size={12} />
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="icon-btn sm:hidden"
              aria-label={t('Appearance')}
            >
              {resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5">
              {(['en', 'id'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] transition-colors',
                    language === code ? 'bg-ink text-white' : 'text-muted hover:text-ink',
                  )}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[392px]"
          >
            <div className="mb-6">
              <h2 className="text-[25px] font-semibold tracking-[-0.045em] text-ink">
                {mode === 'signin' ? t('Welcome back') : t('Create your workspace')}
              </h2>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                {mode === 'signin'
                  ? t('Sign in to your delivery workspace')
                  : t('Set up your Anatera Sprint OS account in seconds.')}
              </p>
            </div>

            <div className="mb-5 flex rounded-[10px] border border-line bg-surface-sunken p-0.5">
              {[
                { id: 'signin' as const, label: t('Sign in') },
                { id: 'signup' as const, label: t('Sign up') },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMode(tab.id)
                    setError('')
                  }}
                  className={cn(
                    'flex-1 rounded-lg py-2 text-[11px] font-medium transition-all',
                    mode === tab.id ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-3">
              {mode === 'signup' && (
                <label className="block">
                  <span className="field-label">{t('Full name')}</span>
                  <span className="relative block">
                    <UserRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                    <input
                      className="input !py-3 pl-9"
                      autoComplete="name"
                      placeholder="Alex Morgan"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </span>
                </label>
              )}
              <label className="block">
                <span className="field-label">{t('Email')}</span>
                <span className="relative block">
                  <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                  <input
                    type="email"
                    required
                    className="input !py-3 pl-9"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </span>
              </label>
              <label className="block">
                <span className="field-label">{t('Password')}</span>
                <span className="relative block">
                  <LockKeyhole size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="input !py-3 pl-9 pr-10"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    placeholder={mode === 'signin' ? t('Your password') : t('at least 8 characters')}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle transition-colors hover:text-ink"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </span>
              </label>

              {error && (
                <div className="rounded-lg border border-[#fecdd3] bg-[#fff1f2] px-3 py-2 text-[11px] leading-relaxed text-[#be123c]">
                  {error}
                </div>
              )}

              <button type="submit" disabled={busy} className="btn btn-primary mt-1 w-full !py-3">
                {busy ? (
                  <>
                    <LoaderCircle size={14} className="animate-spin" />
                    {mode === 'signin' ? t('Signing in…') : t('Creating account…')}
                  </>
                ) : (
                  <>
                    {mode === 'signin' ? t('Sign in') : t('Create account')}
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="text-[9px] uppercase tracking-[0.12em] text-subtle">{t('Demo credentials')}</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <div className="rounded-xl border border-line bg-surface-sunken p-3">
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-[#5b21b6]">
                  <ShieldCheck size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10.5px] text-ink">{DEMO_EMAIL}</p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-muted">{DEMO_PASSWORD}</p>
                  <button
                    type="button"
                    onClick={() => void useDemo()}
                    disabled={busy}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[10px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-faint disabled:opacity-50"
                  >
                    {busy ? <LoaderCircle size={10} className="animate-spin" /> : <ArrowRight size={10} />}
                    {t('Sign in with demo account')}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2 text-[9.5px] leading-relaxed text-subtle">
              <Wifi size={11} className="mt-0.5 shrink-0" />
              <p>{t('Same login, same live workspace — on every device.')}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
