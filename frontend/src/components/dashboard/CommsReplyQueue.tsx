import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const WS_URL = import.meta.env.VITE_COMMS_WS_URL || 'ws://localhost:8000/ws/comms'

interface DocInfo {
  id: string
  filename: string
}

interface InboxEmail {
  id: string
  sender: string
  subject: string
  body: string
  auto_draft: string
  edited_draft: string | null
  sent_text: string | null
  status: 'pending' | 'sending' | 'sent' | 'deleted' | 'failed' | 'editing'
  created_at: string
  sent_at: string | null
}

interface Props {
  onBack: () => void
  documentIds: string[]
  selectedDocs: DocInfo[]
  onOpenSelector: () => void
}

export function CommsReplyQueue({ onBack, documentIds, selectedDocs, onOpenSelector }: Props) {
  const { user } = useAuth()
  const [emails, setEmails] = useState<InboxEmail[]>([])
  const [loaded, setLoaded] = useState(false)
  const [launched, setLaunched] = useState(false)
  const [phase, setPhase] = useState<string>('idle')
  const [browserUrl, setBrowserUrl] = useState('')
  const [agentLogs, setAgentLogs] = useState<string[]>([])
  const [error, setError] = useState('')
  const [expandedBrowser, setExpandedBrowser] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const addLog = useCallback((text: string) => {
    setAgentLogs(prev => [...prev.slice(-50), text])
  }, [])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentLogs])

  // Load persisted inbox on mount
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data, error: err } = await supabase
        .from('inbox_emails')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (err) {
        console.error('[cadence] inbox load failed:', err.message)
      }
      if (data) {
        setEmails(data as InboxEmail[])
      }
      setLoaded(true)
    }
    load()
  }, [user])

  // Persist a new email to Supabase, return its DB id
  const persistEmail = useCallback(async (
    sender: string, subject: string, body: string, auto_draft: string
  ): Promise<string | null> => {
    if (!user) return null
    const { data, error: err } = await supabase
      .from('inbox_emails')
      .insert({
        user_id: user.id,
        sender,
        subject,
        body,
        auto_draft,
        status: 'pending',
      })
      .select()
      .single()
    if (err) {
      console.error('[cadence] inbox insert failed:', err.message)
      return null
    }
    return data?.id || null
  }, [user])

  // Update a field on an inbox email
  const updateEmail = useCallback(async (id: string, fields: Record<string, any>) => {
    fields.updated_at = new Date().toISOString()
    const { error: err } = await supabase
      .from('inbox_emails')
      .update(fields)
      .eq('id', id)
    if (err) console.error('[cadence] inbox update failed:', err.message)
  }, [])

  const handleMessage = useCallback(async (msg: any) => {
    switch (msg.type) {
      case 'status':
        setPhase(msg.phase)
        break

      case 'agent_log':
        if (msg.text) addLog(`[${msg.agent}] ${msg.text}`)
        break

      case 'browser_url':
        if (msg.url) setBrowserUrl(msg.url)
        break

      case 'email_found':
        addLog(`found: ${msg.sender} — "${msg.subject}"`)
        break

      case 'email_read':
        addLog(`read: ${msg.sender} — "${msg.subject}" (drafting reply...)`)
        break

      case 'draft_reply': {
        const dbId = await persistEmail(
          msg.sender || 'Unknown',
          msg.subject || '',
          msg.body || '',
          msg.draft || '',
        )
        const newEmail: InboxEmail = {
          id: dbId || msg.id || String(Date.now()),
          sender: msg.sender || 'Unknown',
          subject: msg.subject || '',
          body: msg.body || '',
          auto_draft: msg.draft || '',
          edited_draft: null,
          sent_text: null,
          status: 'pending',
          created_at: new Date().toISOString(),
          sent_at: null,
        }
        setEmails(prev => [newEmail, ...prev])
        break
      }

      case 'reply_sent':
        setEmails(prev => prev.map(e => {
          if (e.id === msg.id) {
            const sentAt = new Date().toISOString()
            updateEmail(e.id, { status: 'sent', sent_at: sentAt, sent_text: e.edited_draft || e.auto_draft })
            return { ...e, status: 'sent' as const, sent_at: sentAt, sent_text: e.edited_draft || e.auto_draft }
          }
          return e
        }))
        addLog(`reply sent to ${msg.sender}`)
        break

      case 'reply_failed':
        setEmails(prev => prev.map(e => {
          if (e.id === msg.id) {
            updateEmail(e.id, { status: 'failed' })
            return { ...e, status: 'failed' as const }
          }
          return e
        }))
        addLog(`failed to send reply to ${msg.sender}: ${msg.reason || 'unknown error'}`)
        break

      case 'complete':
        setPhase('complete')
        if (msg.message) addLog(msg.message)
        break

      case 'error':
        setError(msg.message || 'An error occurred')
        break
    }
  }, [addLog, persistEmail, updateEmail])

  const launchGmail = async () => {
    setLaunched(true)
    setPhase('connecting')
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      setError('Not authenticated. Please log in again.')
      setPhase('idle')
      setLaunched(false)
      return
    }

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setPhase('profiling')
      addLog('connected — analyzing your communication style...')
      ws.send(JSON.stringify({ auth_token: token, document_ids: documentIds }))
    }

    ws.onmessage = (event) => {
      try { handleMessage(JSON.parse(event.data)) } catch { /* ignore */ }
    }

    ws.onerror = () => {
      setError('Connection failed. Is the backend running?')
      setPhase('idle')
      setLaunched(false)
    }

    ws.onclose = () => {}
  }

  const handleBack = () => {
    wsRef.current?.close()
    wsRef.current = null
    onBack()
  }

  const handleSend = (id: string) => {
    const email = emails.find(e => e.id === id)
    if (!email || !wsRef.current) return

    const textToSend = email.edited_draft || email.auto_draft
    setEmails(prev => prev.map(e =>
      e.id === id ? { ...e, status: 'sending' as const } : e
    ))
    updateEmail(id, { status: 'sending' })

    wsRef.current.send(JSON.stringify({
      action: 'send_reply',
      reply_id: id,
      sender: email.sender,
      subject: email.subject,
      reply_text: textToSend,
    }))

    addLog(`sending reply to ${email.sender}...`)
  }

  const handleDelete = (id: string) => {
    setEmails(prev => prev.map(e =>
      e.id === id ? { ...e, status: 'deleted' as const } : e
    ))
    updateEmail(id, { status: 'deleted' })
  }

  const handleEdit = (id: string) => {
    const email = emails.find(e => e.id === id)
    if (!email) return
    setEmails(prev => prev.map(e =>
      e.id === id ? { ...e, status: 'editing' as const, edited_draft: e.edited_draft ?? e.auto_draft } : e
    ))
  }

  const handleSaveEdit = (id: string) => {
    const email = emails.find(e => e.id === id)
    if (!email) return
    setEmails(prev => prev.map(e =>
      e.id === id ? { ...e, status: 'pending' as const } : e
    ))
    updateEmail(id, { status: 'pending', edited_draft: email.edited_draft })
  }

  const handleEditChange = (id: string, text: string) => {
    setEmails(prev => prev.map(e =>
      e.id === id ? { ...e, edited_draft: text } : e
    ))
  }

  const pendingEmails = emails.filter(e => e.status === 'pending' || e.status === 'editing' || e.status === 'failed')
  const handledEmails = emails.filter(e => e.status === 'sent' || e.status === 'deleted' || e.status === 'sending')

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="db-comms-studio">
      {/* Header */}
      <div className="db-cs-header">
        <button className="db-back-btn" onClick={handleBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          back
        </button>
        <span className="db-cs-title">communication studio</span>
        {phase !== 'idle' && phase !== 'complete' && (
          <span className="db-wd-card-badge db-wd-card-badge--live">{phase}</span>
        )}
        <div className="db-cs-header-right">
          <button className="db-btn-ghost db-btn-sm" onClick={onOpenSelector}>
            {selectedDocs.length > 0
              ? `${selectedDocs.length} doc${selectedDocs.length !== 1 ? 's' : ''} selected`
              : 'select comm samples'}
          </button>
          {selectedDocs.length > 0 && !launched && (
            <div className="db-cs-header-chips">
              {selectedDocs.slice(0, 2).map(d => (
                <span key={d.id} className="db-cs-header-chip">{d.filename}</span>
              ))}
              {selectedDocs.length > 2 && (
                <span className="db-cs-header-chip">+{selectedDocs.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="db-rq-error"><p>{error}</p></div>
      )}

      {/* Two-panel layout */}
      <div className="db-cs-panels">
        {/* LEFT: Persistent inbox */}
        <div className="db-cs-left">
          <div className="db-cs-left-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
              <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
            </svg>
            <span>inbox</span>
            {emails.length > 0 && (
              <span className="db-cs-left-count">
                {pendingEmails.length} pending · {handledEmails.length} handled
              </span>
            )}
          </div>

          <div className="db-cs-inbox-scroll">
            {!loaded ? (
              <div className="db-cs-scanning-state"><p>loading inbox...</p></div>
            ) : emails.length === 0 && !launched ? (
              <div className="db-cs-launch-area">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <p className="db-cs-launch-text">
                  launch gmail to scan your inbox and auto-draft replies using your communication voice.
                </p>
                <button
                  className="db-cs-launch-btn"
                  onClick={launchGmail}
                  disabled={documentIds.length === 0}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 2L11 13"/>
                    <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                  launch gmail
                </button>
                {documentIds.length === 0 && (
                  <p className="db-cs-launch-hint">select communication samples first</p>
                )}
              </div>
            ) : (
              <>
                {/* Launch button when inbox has history but pipeline not running */}
                {loaded && !launched && emails.length > 0 && (
                  <div className="db-cs-rescan-bar">
                    <button
                      className="db-cs-launch-btn db-cs-launch-btn--small"
                      onClick={launchGmail}
                      disabled={documentIds.length === 0}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M22 2L11 13"/>
                        <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                      </svg>
                      scan for new emails
                    </button>
                  </div>
                )}

                {/* Scanning state (only while pipeline is active with no new results yet) */}
                {launched && phase !== 'complete' && phase !== 'idle' && pendingEmails.length === 0 && handledEmails.length === emails.length && (
                  <div className="db-cs-scanning-state">
                    <div className="db-wd-scan-pulse" />
                    <p>
                      {phase === 'profiling' && 'analyzing your communication style...'}
                      {phase === 'connecting' && 'connecting...'}
                      {phase === 'scanning' && 'scanning your gmail inbox...'}
                      {phase === 'drafting' && 'writing draft replies...'}
                    </p>
                  </div>
                )}

                {/* Pending emails */}
                {pendingEmails.map(email => (
                  <div key={email.id} className="db-cs-email-card">
                    <div className="db-cs-email-from">
                      <div className="db-cs-email-avatar">
                        {email.sender.charAt(0).toUpperCase()}
                      </div>
                      <div className="db-cs-email-meta">
                        <span className="db-cs-email-sender">{email.sender}</span>
                        <span className="db-cs-email-subject">{email.subject}</span>
                      </div>
                      <span className="db-cs-email-time">{formatTime(email.created_at)}</span>
                    </div>

                    {email.body && (
                      <div className="db-cs-email-original">
                        <p>{email.body.length > 300 ? email.body.slice(0, 300) + '...' : email.body}</p>
                      </div>
                    )}

                    <div className="db-cs-draft-section">
                      <span className="db-cs-draft-label">
                        {email.edited_draft ? 'revised draft' : 'auto-drafted reply'}
                      </span>
                      {email.status === 'editing' ? (
                        <textarea
                          className="db-cs-draft-editor"
                          value={email.edited_draft ?? email.auto_draft}
                          onChange={e => handleEditChange(email.id, e.target.value)}
                          rows={6}
                          autoFocus
                        />
                      ) : (
                        <p className="db-cs-draft-text">{email.edited_draft || email.auto_draft}</p>
                      )}
                      {email.status === 'failed' && (
                        <span className="db-cs-failed-hint">send failed — try again or edit</span>
                      )}
                    </div>

                    <div className="db-cs-email-actions">
                      {email.status === 'editing' ? (
                        <button className="db-btn-ghost db-btn-sm" onClick={() => handleSaveEdit(email.id)}>
                          done editing
                        </button>
                      ) : (
                        <button className="db-cs-action-edit" onClick={() => handleEdit(email.id)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          edit
                        </button>
                      )}
                      <div className="db-cs-action-right">
                        <button className="db-cs-action-delete" onClick={() => handleDelete(email.id)}>
                          delete
                        </button>
                        <button
                          className="db-cs-action-send"
                          onClick={() => handleSend(email.id)}
                          disabled={email.status === 'editing' || !wsRef.current}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 2L11 13"/>
                            <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                          </svg>
                          send
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Handled emails (full history) */}
                {handledEmails.length > 0 && (
                  <div className="db-cs-handled-section">
                    <span className="db-cs-handled-label">history ({handledEmails.length})</span>
                    {handledEmails.map(email => (
                      <div key={email.id} className={`db-cs-email-card db-cs-email-card--${email.status}`}>
                        <div className="db-cs-email-from">
                          <div className="db-cs-email-avatar">
                            {email.sender.charAt(0).toUpperCase()}
                          </div>
                          <div className="db-cs-email-meta">
                            <span className="db-cs-email-sender">{email.sender}</span>
                            <span className="db-cs-email-subject">{email.subject}</span>
                          </div>
                          <span className={`db-cs-status-badge db-cs-status-badge--${email.status}`}>
                            {email.status === 'sending' ? 'sending...' : email.status}
                          </span>
                        </div>

                        {/* Show what was sent for sent emails */}
                        {email.status === 'sent' && (
                          <div className="db-cs-sent-detail">
                            <span className="db-cs-draft-label">
                              {email.sent_text !== email.auto_draft ? 'sent (revised)' : 'sent (auto-draft)'}
                            </span>
                            <p className="db-cs-draft-text">{email.sent_text || email.auto_draft}</p>
                            {email.sent_at && (
                              <span className="db-cs-sent-time">sent {formatTime(email.sent_at)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Browser livestream + agent log */}
        <div className="db-cs-right">
          <div className="db-cs-browser-card">
            <div className="db-cs-browser-header">
              <span className="db-wd-browser-dot" />
              <span>gmail — live agent</span>
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
            <div className="db-cs-browser-viewport">
              {browserUrl ? (
                <div className="db-cs-iframe-wrap">
                  <iframe
                    src={browserUrl}
                    className="db-cs-iframe"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>
              ) : launched ? (
                <div className="db-cs-browser-placeholder">
                  <div className="db-wd-scan-pulse" />
                  <p>connecting to gmail...</p>
                </div>
              ) : (
                <div className="db-cs-browser-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.15">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  <p>gmail agent will appear here</p>
                </div>
              )}
            </div>
          </div>

          <div className="db-cs-log-card">
            <div className="db-cs-log-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="4 17 10 11 4 5"/>
                <line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
              <span>agent log</span>
            </div>
            <div className="db-cs-log-body">
              {agentLogs.length === 0 ? (
                <span className="db-cs-log-empty">waiting for launch...</span>
              ) : (
                agentLogs.map((l, i) => (
                  <div key={i} className="db-cs-log-line">{l}</div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded browser overlay */}
      {expandedBrowser && browserUrl && (
        <div className="db-wd-browser-overlay" onClick={() => setExpandedBrowser(false)}>
          <div className="db-wd-browser-overlay-content" onClick={e => e.stopPropagation()}>
            <div className="db-wd-browser-overlay-header">
              <span>gmail — live agent</span>
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
