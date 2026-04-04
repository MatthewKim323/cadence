import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const WS_URL = import.meta.env.VITE_COMMS_WS_URL || 'ws://localhost:8000/ws/comms'

interface DraftReply {
  id: string
  sender: string
  subject: string
  body: string
  draft: string
  status: 'pending' | 'approved' | 'skipped'
}

interface Props {
  onBack: () => void
  documentIds: string[]
}

export function CommsReplyQueue({ onBack, documentIds }: Props) {
  const [replies, setReplies] = useState<DraftReply[]>([])
  const [scanning, setScanning] = useState(true)
  const [phase, setPhase] = useState<string>('connecting')
  const [browserUrl, setBrowserUrl] = useState('')
  const [agentLogs, setAgentLogs] = useState<string[]>([])
  const [thinkingLines, setThinkingLines] = useState<string[]>([])
  const [error, setError] = useState('')
  const [emailsFound, setEmailsFound] = useState<{sender: string; subject: string}[]>([])
  const [expandedBrowser, setExpandedBrowser] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)

  const addLog = (text: string) => {
    setAgentLogs(prev => [...prev, text])
  }

  useEffect(() => {
    let cancelled = false

    const connect = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        if (!cancelled) {
          setError('Not authenticated. Please log in again.')
          setScanning(false)
        }
        return
      }

      if (cancelled) return

      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (cancelled) { ws.close(); return }
        setPhase('profiling')
        addLog('connected to comms pipeline')
        ws.send(JSON.stringify({
          auth_token: token,
          document_ids: documentIds,
        }))
      }

      ws.onmessage = (event) => {
        if (cancelled) return
        try {
          const msg = JSON.parse(event.data)
          handleMessage(msg)
        } catch { /* ignore */ }
      }

      ws.onerror = () => {
        if (!cancelled) {
          setError('Connection failed. Is the backend running?')
          setScanning(false)
        }
      }

      ws.onclose = () => {
        if (!cancelled && phase !== 'complete') {
          setScanning(false)
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  const handleMessage = (msg: any) => {
    switch (msg.type) {
      case 'status':
        setPhase(msg.phase)
        if (msg.phase === 'scanning') {
          addLog('scanning inbox...')
        } else if (msg.phase === 'drafting') {
          setScanning(false)
          addLog('drafting replies...')
        } else if (msg.phase === 'complete') {
          setScanning(false)
        }
        break

      case 'thinking':
        if (msg.text) {
          setThinkingLines(prev => [...prev, msg.text])
        }
        break

      case 'agent_log':
        if (msg.text) {
          addLog(`[${msg.agent}] ${msg.text}`)
        }
        break

      case 'browser_url':
        if (msg.url) {
          setBrowserUrl(msg.url)
        }
        break

      case 'email_found':
        setEmailsFound(prev => [...prev, {
          sender: msg.sender,
          subject: msg.subject,
        }])
        break

      case 'scan_progress':
        addLog(`found ${msg.current} emails to reply to`)
        break

      case 'draft_reply':
        setReplies(prev => [...prev, {
          id: msg.id || String(prev.length),
          sender: msg.sender || 'Unknown',
          subject: msg.subject || '',
          body: msg.body || '',
          draft: msg.draft || '',
          status: 'pending',
        }])
        break

      case 'complete':
        setScanning(false)
        setPhase('complete')
        if (msg.message) addLog(msg.message)
        break

      case 'error':
        setError(msg.message || 'An error occurred')
        setScanning(false)
        break
    }
  }

  const handleBack = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    onBack()
  }

  const updateStatus = (id: string, status: 'approved' | 'skipped') => {
    setReplies(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const approveAll = () => {
    setReplies(prev => prev.map(r => r.status === 'pending' ? { ...r, status: 'approved' } : r))
  }

  const approvedCount = replies.filter(r => r.status === 'approved').length

  return (
    <div className="db-reply-queue">
      <div className="db-rq-header">
        <button className="db-back-btn" onClick={handleBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          back to compose
        </button>
        <span className="db-rq-title">reply queue</span>
        {phase !== 'complete' && phase !== 'connecting' && (
          <span className="db-wd-card-badge db-wd-card-badge--live">{phase}</span>
        )}
      </div>

      {error && (
        <div className="db-rq-error">
          <p>{error}</p>
        </div>
      )}

      {/* Gmail inbox iframe */}
      <div className="db-rq-inbox">
        <div className="db-rq-inbox-header">
          <span className="db-wd-browser-dot" />
          <span>gmail inbox — live browser</span>
          {browserUrl && (
            <button
              className="db-wd-browser-expand"
              onClick={() => setExpandedBrowser(true)}
              title="expand"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
          )}
        </div>
        <div className="db-rq-inbox-viewport">
          {browserUrl ? (
            <div className="db-rq-iframe-wrap">
              <iframe
                src={browserUrl}
                className="db-rq-iframe"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          ) : scanning ? (
            <div className="db-rq-scanning">
              <div className="db-wd-scan-pulse" />
              <p>{phase === 'profiling' ? 'analyzing your communication style...' : 'connecting to gmail...'}</p>
            </div>
          ) : (
            <div className="db-rq-scan-complete">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>inbox scan complete — {replies.length} repl{replies.length !== 1 ? 'ies' : 'y'} drafted</span>
            </div>
          )}
        </div>
      </div>

      {/* Agent log */}
      {agentLogs.length > 0 && (
        <div className="db-rq-logs">
          <div className="db-rq-logs-header">agent log</div>
          <div className="db-rq-logs-body">
            {agentLogs.slice(-8).map((l, i) => (
              <div key={i} className="db-rq-log-line">{l}</div>
            ))}
          </div>
        </div>
      )}

      {/* Emails found during scan */}
      {emailsFound.length > 0 && replies.length === 0 && scanning && (
        <div className="db-rq-found">
          <div className="db-rq-found-header">emails found ({emailsFound.length})</div>
          {emailsFound.map((e, i) => (
            <div key={i} className="db-rq-found-item">
              <span className="db-rq-found-sender">{e.sender}</span>
              <span className="db-rq-found-subject">— "{e.subject}"</span>
            </div>
          ))}
        </div>
      )}

      {/* Draft reply cards */}
      <div className="db-rq-drafts">
        <div className="db-rq-drafts-header">
          <span>draft queue ({replies.length} repl{replies.length !== 1 ? 'ies' : 'y'} ready)</span>
        </div>

        {replies.length === 0 && !scanning && !error && (
          <p className="db-rq-empty">no emails found that need replies.</p>
        )}

        {replies.map(reply => (
          <div key={reply.id} className={`db-rq-card ${reply.status !== 'pending' ? 'db-rq-card--done' : ''}`}>
            <div className="db-rq-card-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span className="db-rq-card-sender">{reply.sender}</span>
              <span className="db-rq-card-subject">— "{reply.subject}"</span>
            </div>
            {reply.body && (
              <div className="db-rq-card-original">
                <span className="db-rq-card-original-label">original:</span>
                <p>{reply.body.slice(0, 200)}{reply.body.length > 200 ? '...' : ''}</p>
              </div>
            )}
            <p className="db-rq-card-draft">{reply.draft}</p>
            <div className="db-rq-card-footer">
              {reply.status === 'pending' ? (
                <div className="db-rq-card-actions">
                  <button className="db-btn-primary db-btn-sm" onClick={() => updateStatus(reply.id, 'approved')}>approve</button>
                  <button className="db-btn-ghost db-btn-sm" onClick={() => updateStatus(reply.id, 'skipped')}>skip</button>
                </div>
              ) : (
                <span className={`db-rq-card-status ${reply.status}`}>{reply.status}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {replies.length > 0 && (
        <div className="db-rq-footer">
          <button className="db-btn-ghost" onClick={approveAll}>approve all</button>
          <button className="db-btn-primary" disabled={approvedCount === 0}>
            send {approvedCount} approved
          </button>
        </div>
      )}

      {/* Expanded browser overlay */}
      {expandedBrowser && browserUrl && (
        <div className="db-wd-browser-overlay" onClick={() => setExpandedBrowser(false)}>
          <div className="db-wd-browser-overlay-content" onClick={e => e.stopPropagation()}>
            <div className="db-wd-browser-overlay-header">
              <span>gmail inbox — live browser</span>
              <button className="db-wd-browser-overlay-close" onClick={() => setExpandedBrowser(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <iframe
              src={browserUrl}
              className="db-wd-browser-overlay-iframe"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </div>
      )}
    </div>
  )
}
