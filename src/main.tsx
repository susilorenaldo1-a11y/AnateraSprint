import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { WorkspaceProvider } from './store/WorkspaceStore'
import { ThemeProvider } from './theme/ThemeProvider'
import { I18nProvider, useI18n } from './i18n/I18nProvider'
import { SessionProvider, useSession } from './auth/SessionProvider'
import { AuthScreen } from './auth/AuthScreen'
import './globals.css'

function SessionSplash() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-[#111827] shadow-[0_12px_30px_-12px_rgba(17,24,39,0.45)]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
            <path d="M5 19L10.6 5.4a1.45 1.45 0 0 1 2.68 0L19 19" stroke="white" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7.5 14.1h8.4" stroke="#A99BFF" strokeWidth="2.15" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-[11px] font-medium text-muted">{t('Loading workspace…')}</p>
      </div>
    </div>
  )
}

function Root() {
  const { user, loading } = useSession()
  if (loading) return <SessionSplash />
  if (!user) return <AuthScreen />
  return (
    <WorkspaceProvider user={user}>
      <App />
    </WorkspaceProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <SessionProvider>
            <Root />
          </SessionProvider>
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
