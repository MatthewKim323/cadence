import { useState, useCallback } from 'react'
import { useDocuments } from '../hooks/useDocuments'
import { useSessions } from '../hooks/useSessions'
import type { Document } from '../hooks/useDocuments'
import { Sidebar } from '../components/dashboard/Sidebar'
import { PromptBar } from '../components/dashboard/PromptBar'
import { UploadModal } from '../components/dashboard/UploadModal'
import { DocumentSelector } from '../components/dashboard/DocumentSelector'
import { WritingStudioContent } from '../components/dashboard/WritingStudioContent'
import { CommsStudioContent } from '../components/dashboard/CommsStudioContent'
import { WritingDashboard } from '../components/dashboard/WritingDashboard'
import { DetectionDeepDive } from '../components/dashboard/DetectionDeepDive'
import { CommsComposeView } from '../components/dashboard/CommsComposeView'
import { CommsReplyQueue } from '../components/dashboard/CommsReplyQueue'
import '../dashboard.css'

type Studio = 'writing' | 'comms'

type DashboardView =
  | { kind: 'home' }
  | { kind: 'writing' }
  | { kind: 'writing-pipeline' }
  | { kind: 'deep-dive' }
  | { kind: 'comms-compose' }
  | { kind: 'comms-reply-queue' }

export function Dashboard() {
  const { documents, grouped, uploadDocument } = useDocuments()
  const { sessions } = useSessions()

  const [activeStudio, setActiveStudio] = useState<Studio | null>(null)
  const [view, setView] = useState<DashboardView>({ kind: 'home' })
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectorOpen, setSelectorOpen] = useState(false)

  const selectedDocs = documents.filter(d => selectedDocIds.includes(d.id))

  const handleSelectStudio = useCallback((s: Studio) => {
    setActiveStudio(s)
    setView(s === 'writing' ? { kind: 'writing' } : { kind: 'comms-compose' })
  }, [])

  const handleSubmit = useCallback((prompt: string) => {
    if (activeStudio === 'writing') {
      setView({ kind: 'writing-pipeline' })
    }
    // Comms compose handles its own generation inline
    void prompt
  }, [activeStudio])

  const handleConfirmDocs = useCallback((ids: string[]) => {
    setSelectedDocIds(ids)
    setSelectorOpen(false)
  }, [])

  const handleRemoveDoc = useCallback((id: string) => {
    setSelectedDocIds(prev => prev.filter(d => d !== id))
  }, [])

  const isFullscreen = view.kind === 'writing-pipeline' || view.kind === 'deep-dive' || view.kind === 'comms-reply-queue'

  const renderContent = () => {
    switch (view.kind) {
      case 'home':
        return (
          <div className="db-home">
            <h1 className="db-home-title">what would you like to write?</h1>
            <p className="db-home-desc">
              select a studio from the sidebar, pick some source documents, and describe what you need.
            </p>
          </div>
        )
      case 'writing':
        return <WritingStudioContent />
      case 'writing-pipeline':
        return (
          <WritingDashboard
            onBack={() => setView({ kind: 'writing' })}
            onDeepDive={() => setView({ kind: 'deep-dive' })}
          />
        )
      case 'deep-dive':
        return (
          <DetectionDeepDive
            onBack={() => setView({ kind: 'writing-pipeline' })}
          />
        )
      case 'comms-compose':
        return <CommsComposeView />
      case 'comms-reply-queue':
        return (
          <CommsReplyQueue
            onBack={() => setView({ kind: 'comms-compose' })}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className={`db-layout ${isFullscreen ? 'db-layout--fullscreen' : ''}`}>
      {!isFullscreen && (
        <Sidebar
          activeStudio={activeStudio}
          onSelectStudio={handleSelectStudio}
          grouped={grouped}
          sessions={sessions}
          onOpenUpload={() => setUploadOpen(true)}
          onSessionClick={() => {}}
        />
      )}

      <main className="db-main">
        <div className="db-content">
          {renderContent()}
        </div>

        {!isFullscreen && view.kind !== 'comms-compose' && (
          <PromptBar
            activeStudio={activeStudio}
            selectedDocs={selectedDocs}
            onRemoveDoc={handleRemoveDoc}
            onSubmit={handleSubmit}
            onOpenUpload={() => setUploadOpen(true)}
            onOpenSelector={() => setSelectorOpen(true)}
          />
        )}

        {view.kind === 'comms-compose' && (
          <div className="db-comms-bar-wrap">
            <button
              className="db-btn-ghost"
              onClick={() => setView({ kind: 'comms-reply-queue' })}
            >
              switch to reply queue
            </button>
          </div>
        )}
      </main>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} uploadDocument={uploadDocument} />
      <DocumentSelector
        open={selectorOpen}
        grouped={grouped}
        selected={selectedDocIds}
        onConfirm={handleConfirmDocs}
        onClose={() => setSelectorOpen(false)}
      />
    </div>
  )
}
