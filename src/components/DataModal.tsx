import { useEffect, useRef, useState } from 'react'
import {
  Database,
  Download,
  FileJson,
  HardDrive,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react'
import { useWorkspace } from '../store/WorkspaceStore'
import { Modal } from './ui'
import { useI18n } from '../i18n/I18nProvider'

export function DataModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, exportBackup, importBackup, loadDemo, notify } = useWorkspace()
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [confirmDemo, setConfirmDemo] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setConfirmDemo(false)
    setError('')
  }, [open])

  async function handleImport(file: File | undefined) {
    if (!file) return
    setError('')
    try {
      const text = await file.text()
      importBackup(text)
      onClose()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Could not read that file.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('Workspace data')}
      description={t('Your workspace is saved to your account and synced across devices. Export a JSON backup at any time.')}
      width="max-w-[580px]"
      footer={
        <>
          <span className="mr-auto flex items-center gap-1.5 text-[10.5px] text-subtle">
            <ShieldCheck size={12} /> {t('Account-synced workspace')}
          </span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('Close')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: t('Projects'), value: data.projects.length },
            { label: t('Sprints'), value: data.sprints.length },
            { label: t('Tasks'), value: data.tasks.length },
            { label: t('People'), value: data.members.length },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-line bg-[#fcfcfd] px-3 py-2.5">
              <p className="font-mono text-[17px] font-medium leading-none tracking-tight text-ink">{stat.value}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.09em] text-subtle">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={exportBackup}
            className="group flex items-start gap-3 rounded-xl border border-line bg-white p-3.5 text-left transition-all hover:border-line-strong hover:shadow-card"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4f4f5] text-muted group-hover:text-ink">
              <Download size={16} />
            </span>
            <span>
              <span className="block text-[12.5px] font-semibold text-ink">{t('Export JSON backup')}</span>
              <span className="mt-0.5 block text-[10.5px] leading-snug text-muted">
                {t('Full projects, sprints, tasks and comments.')}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group flex items-start gap-3 rounded-xl border border-line bg-white p-3.5 text-left transition-all hover:border-line-strong hover:shadow-card"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4f4f5] text-muted group-hover:text-ink">
              <Upload size={16} />
            </span>
            <span>
              <span className="block text-[12.5px] font-semibold text-ink">{t('Import a backup')}</span>
              <span className="mt-0.5 block text-[10.5px] leading-snug text-muted">
                {t('Restore an Anatera Sprint OS JSON file.')}
              </span>
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              void handleImport(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>

        <div className="rounded-xl border border-[#e8e4ff] bg-[#f8f6ff] p-3.5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#6d28d9] shadow-card">
              <Sparkles size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-ink">{t('Load Anatera Demo Sprints')}</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
                {t('Reset the workspace with four realistic projects, three live 2-week sprints and a full delivery archive.')}
              </p>
              {!confirmDemo ? (
                <button
                  type="button"
                  onClick={() => setConfirmDemo(true)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#d9d0ff] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#5b21b6] transition-colors hover:bg-[#f3efff]"
                >
                  <RotateCcw size={11} /> {t('Load Anatera Demo Sprints')}
                </button>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-[#e8e4ff] bg-white p-2">
                  <span className="text-[10.5px] text-muted">{t('Replace the current workspace?')}</span>
                  <button
                    type="button"
                    className="rounded-md bg-ink px-2 py-1 text-[10.5px] font-semibold text-white hover:bg-[#1f2937]"
                    onClick={() => {
                      loadDemo()
                      onClose()
                    }}
                  >
                    {t('Yes, load demo')}
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-[10.5px] font-medium text-muted hover:bg-[#f4f4f5]"
                    onClick={() => setConfirmDemo(false)}
                  >
                    {t('Cancel')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-[#fcfcfd] px-2.5 py-2 text-[10.5px] leading-relaxed text-subtle">
          <Database size={12} className="mt-0.5 shrink-0" />
          <span>
            {t('Stored in your workspace database and cached locally. Export a backup before clearing site data or switching accounts.')}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-subtle">
          <HardDrive size={11} /> <FileJson size={11} /> Anatera Sprint OS · JSON v1
        </div>

        {error && (
          <div className="rounded-lg border border-[#fecdd3] bg-[#fff1f2] px-3 py-2 text-[12px] text-[#be123c]">
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

