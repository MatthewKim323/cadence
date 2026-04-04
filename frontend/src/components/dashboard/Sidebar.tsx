import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { GroupedDocuments } from '../../hooks/useDocuments'
import type { PipelineSession } from '../../hooks/useSessions'
import { VoiceProfile } from './VoiceProfile'

type Studio = 'writing' | 'comms'

interface Props {
  activeStudio: Studio | null
  onSelectStudio: (s: Studio) => void
  grouped: GroupedDocuments
  sessions: PipelineSession[]
  onOpenUpload: () => void
  onSessionClick: (session: PipelineSession) => void
}

export function Sidebar({ activeStudio, onSelectStudio, grouped, sessions, onOpenUpload, onSessionClick }: Props) {
  const { user, signOut } = useAuth()
  const [libraryOpen, setLibraryOpen] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(true)

  const writingCategories = Object.keys(grouped.writing)
  const commCategories = Object.keys(grouped.communication)
  const totalDocs = Object.values(grouped.writing).flat().length + Object.values(grouped.communication).flat().length
  const name = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'user'

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <aside className="db-sidebar">
      <div className="db-sidebar-top">
        <div className="db-sidebar-brand">
          <Link to="/" className="db-sidebar-logo">cadence.</Link>
          <span className="db-sidebar-user">{name}</span>
        </div>
      </div>

      <div className="db-sidebar-scroll">
        {/* Studios */}
        <div className="db-sidebar-section">
          <div className="db-sidebar-label">studios</div>
          <button
            className={`db-sidebar-studio ${activeStudio === 'writing' ? 'active' : ''}`}
            onClick={() => onSelectStudio('writing')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 19l7-7 3 3-7 7-3-3z"/>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
              <path d="M2 2l7.586 7.586"/>
            </svg>
            <span>writing studio</span>
          </button>
          <button
            className={`db-sidebar-studio ${activeStudio === 'comms' ? 'active' : ''}`}
            onClick={() => onSelectStudio('comms')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>comms studio</span>
          </button>
        </div>

        {/* Library */}
        <div className="db-sidebar-section">
          <button className="db-sidebar-label db-sidebar-toggle" onClick={() => setLibraryOpen(!libraryOpen)}>
            library
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ transform: libraryOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {libraryOpen && (
            <div className="db-sidebar-library">
              {/* Writing Samples */}
              <div className="db-sidebar-lib-group">
                <div className="db-sidebar-lib-header">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                  </svg>
                  <span>writing samples</span>
                </div>
                {writingCategories.length === 0 ? (
                  <span className="db-sidebar-lib-empty">no documents yet</span>
                ) : (
                  writingCategories.map(cat => (
                    <div key={cat} className="db-sidebar-lib-cat">
                      <span className="db-sidebar-lib-cat-name">{cat.toLowerCase()} ({grouped.writing[cat].length})</span>
                      {grouped.writing[cat].map(doc => (
                        <span key={doc.id} className="db-sidebar-lib-file">{doc.filename}</span>
                      ))}
                    </div>
                  ))
                )}
              </div>

              {/* Communications */}
              <div className="db-sidebar-lib-group">
                <div className="db-sidebar-lib-header">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span>communications</span>
                </div>
                {commCategories.length === 0 ? (
                  <span className="db-sidebar-lib-empty">no emails yet</span>
                ) : (
                  commCategories.map(cat => (
                    <div key={cat} className="db-sidebar-lib-cat">
                      <span className="db-sidebar-lib-cat-name">{cat.toLowerCase()} ({grouped.communication[cat].length})</span>
                    </div>
                  ))
                )}
              </div>

              {/* Voice Interviews */}
              <div className="db-sidebar-lib-group">
                <div className="db-sidebar-lib-header">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                    <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                  </svg>
                  <span>voice interviews</span>
                </div>
                <span className="db-sidebar-lib-empty">none yet</span>
              </div>
            </div>
          )}
        </div>

        {/* Voice Profile */}
        <div className="db-sidebar-section">
          <VoiceProfile docCount={totalDocs} categories={writingCategories} />
        </div>

        {/* Session History */}
        <div className="db-sidebar-section">
          <button className="db-sidebar-label db-sidebar-toggle" onClick={() => setHistoryOpen(!historyOpen)}>
            session history
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ transform: historyOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {historyOpen && (
            <div className="db-sidebar-history">
              {sessions.length === 0 ? (
                <span className="db-sidebar-lib-empty">no sessions yet</span>
              ) : (
                sessions.slice(0, 8).map(s => (
                  <button
                    key={s.id}
                    className="db-sidebar-session"
                    onClick={() => onSessionClick(s)}
                  >
                    <span className="db-sidebar-session-icon">
                      {s.studio === 'writing' ? '✏️' : '💬'}
                    </span>
                    <span className="db-sidebar-session-text">
                      {s.prompt?.slice(0, 30) || 'untitled'}
                      {(s.prompt?.length ?? 0) > 30 ? '...' : ''}
                    </span>
                    <span className="db-sidebar-session-date">{formatDate(s.created_at)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="db-sidebar-section db-sidebar-actions">
          <button className="db-sidebar-action" onClick={onOpenUpload}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            add to library
          </button>
          <button className="db-sidebar-action" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            </svg>
            voice interview
          </button>
        </div>
      </div>

      <div className="db-sidebar-bottom">
        <button className="db-sidebar-signout" onClick={signOut}>sign out</button>
      </div>
    </aside>
  )
}
