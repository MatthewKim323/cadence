import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  scan_session: string | null
  created_at: string
  sent_at: string | null
}

interface Props {
  onBack: () => void
  documentIds: string[]
  selectedDocs: DocInfo[]
  onOpenSelector: () => void
}

function generateSessionId() {
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
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
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)
  const [editingEmail, setEditingEmail] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const scanSessionRef = useRef<string>('')

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
      if (err) console.error('[cadence] inbox load failed:', err.message)
      if (data) setEmails(data as InboxEmail[])
      setLoaded(true)
    }
    load()
  }, [user])

  const persistEmail = useCallback(async (
    sender: string, subject: string, body: string, auto_draft: string
  ): Promise<string | null> => {
    if (!user) return null
    const { data, error: err } = await supabase
      .from('inbox_emails')
      .insert({
        user_id: user.id,
        sender, subject, body, auto_draft,
        status: 'pending',
        scan_session: scanSessionRef.current || null,
      })
      .select()
      .single()
    if (err) { console.error('[cadence] inbox insert failed:', err.message); return null }
    return data?.id || null
  }, [user])

  const updateEmail = useCallback(async (id: string, fields: Record<string, any>) => {
    fields.updated_at = new Date().toISOString()
    await supabase.from('inbox_emails').update(fields).eq('id', id)
  }, [])

  const handleMessage = useCallback(async (msg: any) => {
    switch (msg.type) {
      case 'status': setPhase(msg.phase); break
      case 'agent_log': if (msg.text) addLog(`[${msg.agent}] ${msg.text}`); break
      case 'browser_url': if (msg.url) setBrowserUrl(msg.url); break
      case 'email_found': addLog(`found: ${msg.sender} — "${msg.subject}"`); break
      case 'email_read': addLog(`read: ${msg.sender} — "${msg.subject}" (drafting...)`); break

      case 'draft_reply': {
        const dbId = await persistEmail(
          msg.sender || 'Unknown', msg.subject || '', msg.body || '', msg.draft || '',
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
          scan_session: scanSessionRef.current,
          created_at: new Date().toISOString(),
          sent_at: null,
        }
        setEmails(prev => [newEmail, ...prev])
        setExpandedEmail(newEmail.id)
        break
      }

      case 'reply_sent':
        setEmails(prev => prev.map(e => {
          if (e.id === msg.id) {
            const now = new Date().toISOString()
            const text = e.edited_draft || e.auto_draft
            updateEmail(e.id, { status: 'sent', sent_at: now, sent_text: text })
            return { ...e, status: 'sent' as const, sent_at: now, sent_text: text }
          }
          return e
        }))
        addLog(`reply sent to ${msg.sender}`)
        break

      case 'reply_failed':
        setEmails(prev => prev.map(e => {
          if (e.id === msg.id) { updateEmail(e.id, { status: 'failed' }); return { ...e, status: 'failed' as const } }
          return e
        }))
        addLog(`failed: ${msg.sender} — ${msg.reason || 'unknown'}`)
        break

      case 'complete': setPhase('complete'); if (msg.message) addLog(msg.message); break
      case 'error': setError(msg.message || 'An error occurred'); break
    }
  }, [addLog, persistEmail, updateEmail])

  const launchGmail = async () => {
    scanSessionRef.current = generateSessionId()
    setLaunched(true)
    setPhase('connecting')
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setError('Not authenticated.'); setPhase('idle'); setLaunched(false); return }

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws
    ws.onopen = () => {
      setPhase('profiling')
      addLog('connected — analyzing your communication style...')
      ws.send(JSON.stringify({ auth_token: token, document_ids: documentIds }))
    }
    ws.onmessage = (event) => { try { handleMessage(JSON.parse(event.data)) } catch {} }
    ws.onerror = () => { setError('Connection failed.'); setPhase('idle'); setLaunched(false) }
    ws.onclose = () => {}
  }

  const handleBack = () => { wsRef.current?.close(); wsRef.current = null; onBack() }

  const handleSend = (id: string) => {
    const email = emails.find(e => e.id === id)
    if (!email || !wsRef.current) return
    const text = email.edited_draft || email.auto_draft
    setEmails(prev => prev.map(e => e.id === id ? { ...e, status: 'sending' as const } : e))
    updateEmail(id, { status: 'sending' })
    wsRef.current.send(JSON.stringify({
      action: 'send_reply', reply_id: id,
      sender: email.sender, subject: email.subject, reply_text: text,
    }))
    addLog(`sending reply to ${email.sender}...`)
  }

  const handleDelete = (id: string) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, status: 'deleted' as const } : e))
    updateEmail(id, { status: 'deleted' })
    if (expandedEmail === id) setExpandedEmail(null)
  }

  const handleStartEdit = (id: string) => {
    const email = emails.find(e => e.id === id)
    if (!email) return
    setEmails(prev => prev.map(e =>
      e.id === id ? { ...e, edited_draft: e.edited_draft ?? e.auto_draft } : e
    ))
    setEditingEmail(id)
  }

  const handleSaveEdit = (id: string) => {
    const email = emails.find(e => e.id === id)
    if (email) updateEmail(id, { edited_draft: email.edited_draft })
    setEditingEmail(null)
  }

  const handleEditChange = (id: string, text: string) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, edited_draft: text } : e))
  }

  // Group emails by scan_session
  const sessionGroups = useMemo(() => {
    const groups: { session: string; date: string; emails: InboxEmail[] }[] = []
    const map = new Map<string, InboxEmail[]>()

    for (const e of emails) {
      const key = e.scan_session || `solo_${e.id}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }

    for (const [session, sessionEmails] of map) {
      const earliest = sessionEmails[sessionEmails.length - 1]?.created_at || ''
      const d = new Date(earliest)
      const date = d.toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
      groups.push({ session, date, emails: sessionEmails })
    }

    return groups
  }, [emails])

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const isRunning = launched && phase !== 'idle' && phase !== 'complete'

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
        {isRunning && (
          <span className="db-wd-card-badge db-wd-card-badge--live">{phase}</span>
        )}
        <div className="db-cs-header-right">
          <button className="db-btn-ghost db-btn-sm" onClick={onOpenSelector}>
            {selectedDocs.length > 0
              ? `${selectedDocs.length} doc${selectedDocs.length !== 1 ? 's' : ''} selected`
              : 'select comm samples'}
          </button>
          <button
            className="db-cs-header-launch"
            onClick={launchGmail}
            disabled={documentIds.length === 0 || isRunning}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 2L11 13"/>
              <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
            {isRunning ? 'scanning...' : 'scan gmail'}
          </button>
        </div>
      </div>

      {error && <div className="db-rq-error"><p>{error}</p></div>}

      {/* Two-panel layout */}
      <div className="db-cs-panels">
        {/* LEFT: Gmail-style inbox */}
        <div className="db-cs-left">
          <div className="db-cs-left-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
              <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
            </svg>
            <span>inbox</span>
            {emails.length > 0 && (
              <span className="db-cs-left-count">
                {emails.filter(e => e.status === 'pending' || e.status === 'failed').length} pending
              </span>
            )}
          </div>

          <div className="db-cs-inbox-scroll">
            {!loaded ? (
              <div className="db-cs-scanning-state"><p>loading...</p></div>
            ) : emails.length === 0 && !isRunning ? (
              <div className="db-cs-empty-inbox">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.15">
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
                  <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
                </svg>
                <p>no emails yet. hit "scan gmail" to get started.</p>
              </div>
            ) : (
              <>
                {/* Scanning indicator */}
                {isRunning && (
                  <div className="db-cs-scan-indicator">
                    <div className="db-wd-scan-pulse" />
                    <span>
                      {phase === 'profiling' && 'analyzing voice...'}
                      {phase === 'connecting' && 'connecting...'}
                      {phase === 'scanning' && 'scanning inbox...'}
                      {phase === 'drafting' && 'drafting reply...'}
                    </span>
                  </div>
                )}

                {/* Email rows grouped by session */}
                {sessionGroups.map(group => (
                  <div key={group.session} className="db-cs-session-group">
                    <div className="db-cs-session-divider">
                      <span className="db-cs-session-date">{group.date}</span>
                      <span className="db-cs-session-count">{group.emails.length} email{group.emails.length !== 1 ? 's' : ''}</span>
                    </div>

                    {group.emails.map(email => {
                      const isExpanded = expandedEmail === email.id
                      const isEditing = editingEmail === email.id
                      const draftText = email.edited_draft || email.auto_draft
                      const preview = email.body
                        ? email.body.slice(0, 80) + (email.body.length > 80 ? '...' : '')
                        : ''

                      return (
                        <div key={email.id} className="db-cs-email-row-wrap">
                          {/* Compact row */}
                          <div
                            className={`db-cs-email-row ${isExpanded ? 'db-cs-email-row--active' : ''} db-cs-email-row--${email.status}`}
                            onClick={() => setExpandedEmail(isExpanded ? null : email.id)}
                          >
                            <div className="db-cs-row-avatar">
                              {email.sender.charAt(0).toUpperCase()}
                            </div>
                            <div className="db-cs-row-content">
                              <div className="db-cs-row-top">
                                <span className="db-cs-row-sender">{email.sender}</span>
                                <span className="db-cs-row-time">{formatTime(email.created_at)}</span>
                              </div>
                              <div className="db-cs-row-subject">{email.subject}</div>
                              {!isExpanded && preview && (
                                <div className="db-cs-row-preview">{preview}</div>
                              )}
                            </div>
                            {email.status !== 'pending' && email.status !== 'editing' && email.status !== 'failed' && (
                              <span className={`db-cs-row-badge db-cs-row-badge--${email.status}`}>
                                {email.status === 'sending' ? '...' : email.status}
                              </span>
                            )}
                            {email.status === 'failed' && (
                              <span className="db-cs-row-badge db-cs-row-badge--failed">failed</span>
                            )}
                          </div>

                          {/* Expanded view */}
                          {isExpanded && (
                            <div className="db-cs-expanded">
                              {/* Original email */}
                              <div className="db-cs-exp-original">
                                <div className="db-cs-exp-from">
                                  <strong>{email.sender}</strong>
                                  <span className="db-cs-exp-subject">{email.subject}</span>
                                </div>
                                <p className="db-cs-exp-body">{email.body || '(no body)'}</p>
                              </div>

                              {/* Draft reply */}
                              <div className="db-cs-exp-draft">
                                <div className="db-cs-exp-draft-header">
                                  <span className="db-cs-exp-draft-label">
                                    {email.status === 'sent'
                                      ? (email.sent_text !== email.auto_draft ? 'sent (revised)' : 'sent (auto-draft)')
                                      : email.edited_draft ? 'revised draft' : 'auto-drafted reply'}
                                  </span>
                                  {email.sent_at && (
                                    <span className="db-cs-exp-sent-time">
                                      sent {new Date(email.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>

                                {isEditing ? (
                                  <textarea
                                    className="db-cs-draft-editor"
                                    value={email.edited_draft ?? email.auto_draft}
                                    onChange={e => handleEditChange(email.id, e.target.value)}
                                    rows={6}
                                    autoFocus
                                  />
                                ) : (
                                  <p className="db-cs-exp-draft-text">
                                    {email.status === 'sent' ? (email.sent_text || draftText) : draftText}
                                  </p>
                                )}
                              </div>

                              {/* Actions */}
                              {(email.status === 'pending' || email.status === 'failed') && (
                                <div className="db-cs-exp-actions">
                                  {isEditing ? (
                                    <button className="db-btn-ghost db-btn-sm" onClick={(e) => { e.stopPropagation(); handleSaveEdit(email.id) }}>
                                      done editing
                                    </button>
                                  ) : (
                                    <button className="db-cs-action-edit" onClick={(e) => { e.stopPropagation(); handleStartEdit(email.id) }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                      </svg>
                                      revise
                                    </button>
                                  )}
                                  <div className="db-cs-action-right">
                                    <button className="db-cs-action-delete" onClick={(e) => { e.stopPropagation(); handleDelete(email.id) }}>
                                      delete
                                    </button>
                                    <button
                                      className="db-cs-action-send"
                                      onClick={(e) => { e.stopPropagation(); handleSend(email.id) }}
                                      disabled={isEditing || !wsRef.current}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 2L11 13"/>
                                        <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                                      </svg>
                                      send
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Browser + log */}
        <div className="db-cs-right">
          <div className="db-cs-browser-card">
            <div className="db-cs-browser-header">
              <span className="db-wd-browser-dot" />
              <span>gmail — live agent</span>
              {browserUrl && (
                <button className="db-wd-browser-expand" onClick={() => setExpandedBrowser(true)} title="expand">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>
              )}
            </div>
            <div className="db-cs-browser-viewport">
              {browserUrl ? (
                <div className="db-cs-iframe-wrap">
                  <iframe src={browserUrl} className="db-cs-iframe" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
                </div>
              ) : isRunning ? (
                <div className="db-cs-browser-placeholder"><div className="db-wd-scan-pulse" /><p>connecting to gmail...</p></div>
              ) : (
                <div className="db-cs-browser-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.15">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  <p>gmail agent will appear here</p>
                </div>
              )}
            </div>
          </div>

          <div className="db-cs-log-card">
            <div className="db-cs-log-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
              <span>agent log</span>
            </div>
            <div className="db-cs-log-body">
              {agentLogs.length === 0 ? (
                <span className="db-cs-log-empty">waiting for launch...</span>
              ) : agentLogs.map((l, i) => (
                <div key={i} className="db-cs-log-line">{l}</div>
              ))}
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
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <iframe src={browserUrl} className="db-wd-browser-overlay-iframe" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
          </div>
        </div>
      )}
    </div>
  )
}
