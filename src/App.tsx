import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { TaskComposer, type TaskComposerPreset } from './components/TaskComposer'
import { TaskDrawer } from './components/TaskDrawer'
import { SprintModal } from './components/SprintModal'
import { ProjectModal } from './components/ProjectModal'
import { DataModal } from './components/DataModal'
import { CommandPalette } from './components/CommandPalette'
import { ProjectWorkspace } from './components/ProjectWorkspace'
import { ToastViewport } from './components/ui'
import { Overview } from './pages/Overview'
import { Board } from './pages/Board'
import { Calendar } from './pages/Calendar'
import { Archive } from './pages/Archive'
import { useWorkspace } from './store/WorkspaceStore'
import type { Project } from './types'

export interface AppOutletContext {
  openTask: (taskId: string) => void
  openNewTask: (preset?: TaskComposerPreset) => void
  openNewProject: () => void
  openEditProject: (project: Project) => void
  openProjectWorkspace: (projectId: string) => void
  openNewSprint: (projectId?: string) => void
  openSearch: () => void
}

function Shell() {
  const location = useLocation()
  const { data, projectFilter } = useWorkspace()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [composer, setComposer] = useState<{ open: boolean; preset?: TaskComposerPreset }>({ open: false })
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null)
  const [projectModal, setProjectModal] = useState<{ open: boolean; project?: Project | null }>({ open: false })
  const [projectWorkspaceId, setProjectWorkspaceId] = useState<string | null>(null)
  const [sprintModal, setSprintModal] = useState<{ open: boolean; projectId?: string }>({ open: false })
  const [dataModal, setDataModal] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  const openTask = (taskId: string) => setDrawerTaskId(taskId)
  const openNewTask = (preset?: TaskComposerPreset) => setComposer({ open: true, preset })
  const openNewProject = () => setProjectModal({ open: true, project: null })
  const openEditProject = (project: Project) => setProjectModal({ open: true, project })
  const openProjectWorkspace = (projectId: string) => setProjectWorkspaceId(projectId)
  const openNewSprint = (projectId?: string) =>
    setSprintModal({ open: true, projectId: projectId ?? (projectFilter !== 'all' ? projectFilter : undefined) })
  const openSearch = () => setSearchOpen(true)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((current) => !current)
        return
      }

      if (
        !typing &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        event.key.toLowerCase() === 'c' &&
        !composer.open &&
        !drawerTaskId &&
        !searchOpen &&
        !projectModal.open &&
        !sprintModal.open &&
        !dataModal
      ) {
        event.preventDefault()
        setComposer({ open: true, preset: undefined })
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [composer.open, drawerTaskId, searchOpen, projectModal.open, sprintModal.open, dataModal])

  const outletContext: AppOutletContext = {
    openTask,
    openNewTask,
    openNewProject,
    openEditProject,
    openProjectWorkspace,
    openNewSprint,
    openSearch,
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onNewTask={() => openNewTask()}
        onOpenData={() => setDataModal(true)}
      />
      <div className="min-h-screen lg:pl-[252px]">
        <Topbar
          onOpenMenu={() => setMobileOpen(true)}
          onNewTask={() => openNewTask()}
          onOpenSearch={openSearch}
          onOpenTask={openTask}
          onNewProject={openNewProject}
          onNewSprint={() => openNewSprint()}
        />
        <main className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-[1560px] px-4 py-5 sm:px-6 sm:py-7 xl:px-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet context={outletContext} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <TaskComposer
        open={composer.open}
        preset={composer.preset}
        onClose={() => setComposer({ open: false, preset: composer.preset })}
        onCreated={(taskId) => {
          setComposer({ open: false })
          window.setTimeout(() => setDrawerTaskId(taskId), 120)
        }}
      />
      <TaskDrawer taskId={drawerTaskId} onClose={() => setDrawerTaskId(null)} />
      <ProjectModal
        open={projectModal.open}
        project={projectModal.project}
        onClose={() => setProjectModal({ open: false, project: projectModal.project })}
        onCreated={(projectId) => {
          window.setTimeout(() => setProjectWorkspaceId(projectId), 160)
        }}
      />
      <ProjectWorkspace
        projectId={projectWorkspaceId}
        onClose={() => setProjectWorkspaceId(null)}
        onEditProject={(project) => {
          setProjectWorkspaceId(null)
          window.setTimeout(() => setProjectModal({ open: true, project }), 120)
        }}
        onStartSprint={(projectId) => setSprintModal({ open: true, projectId })}
      />
      <SprintModal
        open={sprintModal.open}
        initialProjectId={sprintModal.projectId}
        onClose={() => setSprintModal({ open: false, projectId: sprintModal.projectId })}
      />
      <DataModal open={dataModal} onClose={() => setDataModal(false)} />
      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpenTask={openTask}
        onNewTask={() => {
          setSearchOpen(false)
          openNewTask()
        }}
        onNewProject={() => {
          setSearchOpen(false)
          openNewProject()
        }}
        onNewSprint={() => {
          setSearchOpen(false)
          openNewSprint()
        }}
        onOpenData={() => {
          setSearchOpen(false)
          setDataModal(true)
        }}
      />
      <ToastViewport />
      <span className="sr-only">{data.projects.length} projects loaded</span>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Overview />} />
        <Route path="board" element={<Board />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="archive" element={<Archive />} />
        <Route path="*" element={<Overview />} />
      </Route>
    </Routes>
  )
}
