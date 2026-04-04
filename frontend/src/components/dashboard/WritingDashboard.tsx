import { useState, useEffect, useRef, useCallback } from 'react'
import { PipelineStatusBar } from './PipelineStatusBar'
import { AgentLog, type LogEntry } from './AgentLog'
import { supabase } from '../../lib/supabase'

const PIPELINE_STEPS = ['voice profile', 'writing', 'detection', 'revision', 'complete']

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/pipeline'

type Phase = 'connecting' | 'profiling' | 'writing' | 'detecting' | 'revising' | 'complete' | 'error'

interface IterationData {
  round: number
  scores: Record<string, number>
  consensus: number
  flaggedCount: number
}

interface BrowserInfo {
  name: string
  url: string
  score: number | null
}

interface Props {
  prompt: string
  documentIds: string[]
  onBack: () => void
  onDeepDive: () => void
}

export function WritingDashboard({ prompt, documentIds, onBack, onDeepDive }: Props) {
  const [phase, setPhase] = useState<Phase>('connecting')
  const [thinkingLines, setThinkingLines] = useState<string[]>([])
  const [thinkingBuffer, setThinkingBuffer] = useState('')
  const [draftText, setDraftText] = useState('')
  const [draftHistory, setDraftHistory] = useState<string[]>([])
  const [viewingDraft, setViewingDraft] = useState(-1)
  const [currentIteration, setCurrentIteration] = useState(0)
  const [completedIterations, setCompletedIterations] = useState<IterationData[]>([])
  const [browsers, setBrowsers] = useState<BrowserInfo[]>([
    { name: 'zerogpt', url: '', score: null },
    { name: 'originality', url: '', score: null },
  ])
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [finalDraft, setFinalDraft] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [expandedBrowser, setExpandedBrowser] = useState<string | null>(null)

  const draftRef = useRef<HTMLDivElement>(null)
  const thinkingRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const addLog = useCallback((agent: string, text: string) => {
    setLogEntries(prev => [...prev, { agent, text, timestamp: Date.now() }])
  }, [])

  useEffect(() => {
    let cancelled = false

    const connect = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        if (!cancelled) {
          setPhase('error')
          setErrorMsg('Not authenticated. Please log in again.')
        }
        return
      }

      if (cancelled) return

      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (cancelled) { ws.close(); return }
        setPhase('profiling')
        addLog('system', 'connected to pipeline server')
        ws.send(JSON.stringify({
          auth_token: token,
          prompt,
          document_ids: documentIds,
        }))
      }

      ws.onmessage = (event) => {
        if (cancelled) return
        try {
          const msg = JSON.parse(event.data)
          handleMessage(msg)
        } catch { /* ignore parse errors */ }
      }

      ws.onerror = (e) => {
        if (cancelled) return
        console.error('[cadence] WebSocket error:', e)
        setPhase('error')
        setErrorMsg('Connection to pipeline server failed. Make sure the backend is running.')
      }

      ws.onclose = (e) => {
        console.log('[cadence] WebSocket closed — code:', e.code, 'reason:', e.reason)
        wsRef.current = null
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
        if (msg.phase) setPhase(msg.phase as Phase)
        if (msg.iteration) setCurrentIteration(msg.iteration)
        break

      case 'thinking': {
        const text: string = msg.text || ''
        if (text.includes('\n')) {
          setThinkingBuffer(prev => {
            const combined = prev + text
            const parts = combined.split('\n')
            const complete = parts.slice(0, -1).filter(l => l.trim())
            const remainder = parts[parts.length - 1]
            if (complete.length > 0) {
              setThinkingLines(lines => [...lines, ...complete])
            }
            return remainder
          })
        } else if (phase === 'profiling' || phase === 'revising') {
          setThinkingLines(prev => [...prev, text])
        } else {
          setThinkingBuffer(prev => prev + text)
        }
        break
      }

      case 'fingerprint':
        break

      case 'draft_chunk':
        setThinkingBuffer(prev => {
          if (prev.trim()) {
            setThinkingLines(lines => [...lines, prev.trim()])
          }
          return ''
        })
        setDraftText(prev => prev + msg.text)
        setViewingDraft(-1)
        break

      case 'draft_complete':
        setFinalDraft(msg.text || '')
        setDraftHistory(prev => [...prev, msg.text || ''])
        setViewingDraft(-1)
        break

      case 'browser_url':
        setBrowsers(prev =>
          prev.map(b => b.name === msg.name ? { ...b, url: msg.url } : b)
        )
        break

      case 'detection':
        if (msg.scores) {
          setBrowsers(prev =>
            prev.map(b => ({
              ...b,
              score: msg.scores[b.name] ?? b.score,
            }))
          )
        }
        if (msg.consensus !== undefined) {
          setCompletedIterations(prev => [...prev, {
            round: msg.iteration || prev.length + 1,
            scores: msg.scores || {},
            consensus: msg.consensus,
            flaggedCount: msg.flagged_count || 0,
          }])
        }
        break

      case 'revising':
        setPhase('revising')
        setDraftText('')
        setBrowsers(prev => prev.map(b => ({ ...b, score: null, url: '' })))
        if (msg.flagged_sentences) {
          const count = msg.flagged_sentences.length
          setThinkingLines(prev => [
            ...prev,
            `--- iteration ${msg.iteration} — revising ${count} flagged sentences ---`,
          ])
        }
        break

      case 'complete':
        setPhase('complete')
        if (msg.draft) {
          setFinalDraft(msg.draft)
          setDraftHistory(prev => {
            if (prev.length === 0 || prev[prev.length - 1] !== msg.draft) {
              return [...prev, msg.draft]
            }
            return prev
          })
        }
        break

      case 'error':
        setPhase('error')
        setErrorMsg(msg.message || 'Unknown error')
        addLog('system', `error: ${msg.message}`)
        break

      case 'agent_log':
        addLog(msg.agent || 'system', msg.text || '')
        break
    }
  }

  useEffect(() => {
    if (draftRef.current && viewingDraft === -1) {
      draftRef.current.scrollTop = draftRef.current.scrollHeight
    }
  }, [draftText, viewingDraft])

  useEffect(() => {
    if (thinkingRef.current) thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight
  }, [thinkingLines, thinkingBuffer])

  const pipelineIndex =
    phase === 'connecting' || phase === 'profiling' ? 0 :
    phase === 'writing' ? 1 :
    phase === 'detecting' ? 2 :
    phase === 'revising' ? 3 : 4

  const handleBack = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    onBack()
  }, [onBack])

  const copyDraft = () => {
    navigator.clipboard.writeText(finalDraft || draftText)
  }

  const browserLabel = (name: string) =>
    name === 'zerogpt' ? 'ZeroGPT' : 'Originality.ai'

  const isViewingOld = viewingDraft >= 0 && viewingDraft < draftHistory.length
  const displayedDraftText = isViewingOld ? draftHistory[viewingDraft] : draftText
  const totalDrafts = draftHistory.length
  const currentDraftIndex = isViewingOld ? viewingDraft : totalDrafts - 1

  const canGoPrev = totalDrafts > 1 && (isViewingOld ? viewingDraft > 0 : totalDrafts > 1)
  const canGoNext = isViewingOld && viewingDraft < totalDrafts - 1

  const goPrevDraft = () => {
    if (isViewingOld) {
      if (viewingDraft > 0) setViewingDraft(viewingDraft - 1)
    } else {
      setViewingDraft(totalDrafts - 2)
    }
  }

  const goNextDraft = () => {
    if (isViewingOld) {
      if (viewingDraft < totalDrafts - 1) {
        setViewingDraft(viewingDraft + 1)
      }
      if (viewingDraft + 1 === totalDrafts - 1) {
        setViewingDraft(-1)
      }
    }
  }

  return (
    <div className="db-writing-dashboard">
      <div className="db-wd-header">
        <button className="db-back-btn" onClick={handleBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          back
        </button>
        <span className="db-wd-title">writing studio — live dashboard</span>
        {currentIteration > 0 && (
          <span className="db-wd-iteration">iteration {currentIteration}/5</span>
        )}
      </div>

      <PipelineStatusBar steps={PIPELINE_STEPS} currentIndex={pipelineIndex} />

      {phase === 'error' && (
        <div className="db-wd-error">
          <span className="db-wd-error-icon">!</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="db-wd-split">
        {/* LEFT COLUMN: thinking + draft */}
        <div className="db-wd-left">
          <div className="db-wd-card">
            <div className="db-wd-card-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z"/>
                <path d="M10 22h4"/>
              </svg>
              <span className="db-wd-card-title">agent thinking</span>
              <span className="db-wd-card-badge">
                {phase === 'profiling' ? 'analyzing voice' : phase === 'writing' ? 'drafting' : phase === 'revising' ? 'revising' : phase === 'detecting' ? 'detecting' : phase === 'complete' ? 'done' : 'connecting'}
              </span>
            </div>
            <div className="db-wd-panel db-wd-thinking" ref={thinkingRef}>
              {thinkingLines.map((line, i) => (
                <p key={i} className={`db-wd-think-line ${line.startsWith('---') ? 'db-wd-think-divider' : ''}`}>
                  {line}
                </p>
              ))}
              {thinkingBuffer && (
                <p className="db-wd-think-line db-wd-think-streaming">
                  {thinkingBuffer}
                  <span className="db-wd-cursor" />
                </p>
              )}
              {!thinkingBuffer && (phase === 'profiling' || phase === 'revising' || phase === 'connecting') && (
                <span className="db-wd-cursor" />
              )}
            </div>
          </div>

          <div className="db-wd-card">
            <div className="db-wd-card-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span className="db-wd-card-title">live draft</span>
              {totalDrafts > 0 && (
                <div className="db-wd-draft-nav">
                  <button
                    className="db-wd-draft-arrow"
                    disabled={!canGoPrev}
                    onClick={goPrevDraft}
                    title="Previous draft"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 12l-4-4 4-4"/>
                    </svg>
                  </button>
                  <span className="db-wd-draft-counter">
                    {isViewingOld ? `v${viewingDraft + 1}` : `v${totalDrafts}`} / {totalDrafts}
                  </span>
                  <button
                    className="db-wd-draft-arrow"
                    disabled={!canGoNext}
                    onClick={goNextDraft}
                    title="Next draft"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 4l4 4-4 4"/>
                    </svg>
                  </button>
                </div>
              )}
              {phase === 'writing' && (
                <span className="db-wd-card-badge db-wd-card-badge--live">streaming</span>
              )}
            </div>
            <div className="db-wd-panel db-wd-draft" ref={draftRef}>
              <div className="db-wd-draft-text">
                {displayedDraftText}
                {phase === 'writing' && !isViewingOld && <span className="db-wd-cursor" />}
              </div>
            </div>
          </div>

          {completedIterations.length > 0 && (
            <div className="db-wd-card">
              <div className="db-wd-card-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <span className="db-wd-card-title">iteration history</span>
              </div>
              <div className="db-wd-history-bars">
                {completedIterations.map((iter, i) => (
                  <div key={i} className="db-wd-history-row">
                    <span className="db-wd-history-label">round {iter.round}</span>
                    <div className="db-wd-history-bar">
                      <div
                        className={`db-wd-history-fill ${iter.consensus <= 10 ? 'pass' : iter.consensus <= 30 ? 'warn' : 'fail'}`}
                        style={{ width: `${Math.min(iter.consensus, 100)}%` }}
                      />
                    </div>
                    <span className={`db-wd-history-val ${iter.consensus <= 10 ? 'pass' : ''}`}>
                      {iter.consensus.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: browsers + agent log */}
        <div className="db-wd-right">
          <div className="db-wd-browsers-stacked">
            <div className="db-wd-panel-label">ai detection — live browsers</div>
            {browsers.map(browser => (
              <div
                key={browser.name}
                className="db-wd-browser db-wd-browser--clickable"
                onClick={() => browser.url && setExpandedBrowser(browser.name)}
              >
                <div className="db-wd-browser-header">
                  <span className="db-wd-browser-dot" />
                  <span>{browserLabel(browser.name)}</span>
                  {browser.score !== null && (
                    <span className={`db-wd-browser-score-inline ${browser.score <= 10 ? 'pass' : browser.score <= 30 ? 'warn' : 'fail'}`}>
                      {browser.score.toFixed(1)}%
                    </span>
                  )}
                  {browser.url && (
                    <span className="db-wd-browser-expand-hint">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M6 2h8v8M14 2L7 9"/>
                      </svg>
                    </span>
                  )}
                </div>
                <div className="db-wd-browser-viewport">
                  {browser.url ? (
                    <div className="db-wd-browser-crop">
                      <iframe
                        src={browser.url}
                        className="db-wd-browser-iframe"
                        title={browser.name}
                        sandbox="allow-scripts allow-same-origin allow-popups"
                      />
                    </div>
                  ) : browser.score !== null ? (
                    <div className="db-wd-browser-result">
                      <span className={`db-wd-score ${browser.score <= 10 ? 'pass' : browser.score <= 30 ? 'warn' : 'fail'}`}>
                        {browser.score.toFixed(1)}%
                      </span>
                      <span className="db-wd-score-label">ai probability</span>
                    </div>
                  ) : (
                    <div className="db-wd-browser-scanning">
                      <div className="db-wd-scan-pulse" />
                      <span>{phase === 'detecting' ? 'scanning...' : 'waiting...'}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <AgentLog entries={logEntries} />
        </div>

        {/* Expanded browser overlay */}
        {expandedBrowser && (() => {
          const b = browsers.find(x => x.name === expandedBrowser)
          if (!b) return null
          return (
            <div className="db-wd-browser-overlay" onClick={() => setExpandedBrowser(null)}>
              <div className="db-wd-browser-expanded" onClick={e => e.stopPropagation()}>
                <div className="db-wd-browser-expanded-header">
                  <span className="db-wd-browser-dot" />
                  <span>{browserLabel(b.name)}</span>
                  {b.score !== null && (
                    <span className={`db-wd-browser-score-inline ${b.score <= 10 ? 'pass' : b.score <= 30 ? 'warn' : 'fail'}`}>
                      {b.score.toFixed(1)}%
                    </span>
                  )}
                  <button className="db-wd-browser-close" onClick={() => setExpandedBrowser(null)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M4 4l8 8M12 4l-8 8"/>
                    </svg>
                  </button>
                </div>
                {b.url ? (
                  <div className="db-wd-browser-crop-expanded">
                    <iframe
                      src={b.url}
                      className="db-wd-browser-iframe-expanded"
                      title={b.name}
                      sandbox="allow-scripts allow-same-origin allow-popups"
                    />
                  </div>
                ) : (
                  <div className="db-wd-browser-viewport" style={{ height: '100%' }}>
                    <div className="db-wd-browser-scanning">
                      <div className="db-wd-scan-pulse" />
                      <span>waiting...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {phase === 'complete' && (
        <div className="db-wd-complete">
          <div className="db-wd-complete-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>
              complete — {completedIterations[completedIterations.length - 1]?.consensus.toFixed(1)}%
              ({completedIterations.length} iteration{completedIterations.length !== 1 ? 's' : ''})
            </span>
          </div>

          <div className="db-wd-complete-stats">
            <div className="db-wd-stat">
              <span className="db-wd-stat-val">{completedIterations.length * 2}</span>
              <span className="db-wd-stat-label">browser sessions</span>
            </div>
            <div className="db-wd-stat">
              <span className="db-wd-stat-val">{(finalDraft || draftText).split(/\s+/).length}</span>
              <span className="db-wd-stat-label">words written</span>
            </div>
            <div className="db-wd-stat">
              <span className="db-wd-stat-val">{completedIterations.length}</span>
              <span className="db-wd-stat-label">rounds</span>
            </div>
            <div className="db-wd-stat">
              <span className="db-wd-stat-val">{logEntries.length}</span>
              <span className="db-wd-stat-label">agent messages</span>
            </div>
          </div>

          <div className="db-wd-complete-actions">
            <button className="db-btn-primary" onClick={copyDraft}>copy draft</button>
            <button className="db-btn-ghost" onClick={onDeepDive}>detection deep dive</button>
          </div>
        </div>
      )}
    </div>
  )
}
