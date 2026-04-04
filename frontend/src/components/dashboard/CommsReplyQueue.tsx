import { useState, useEffect } from 'react'

interface DraftReply {
  id: string
  sender: string
  subject: string
  draft: string
  voiceMatch: number
  status: 'pending' | 'approved' | 'skipped'
}

const MOCK_REPLIES: DraftReply[] = [
  {
    id: '1',
    sender: 'Sarah Chen',
    subject: 'Q3 deck + meeting tomorrow',
    draft: "Hey Sarah, yep I'll be there. Can you send the deck beforehand so I can review? Thanks",
    voiceMatch: 96,
    status: 'pending',
  },
  {
    id: '2',
    sender: 'Mike Torres',
    subject: 'Vendor timeline update',
    draft: "Got it. The 2-week slip isn't ideal but we can work with it. Can you flag if it slips further?",
    voiceMatch: 91,
    status: 'pending',
  },
  {
    id: '3',
    sender: 'Anne Olin',
    subject: 'Board prep materials',
    draft: "Hi Anne, attached is the updated ops summary. Let me know if you'd like me to adjust anything before Thursday.",
    voiceMatch: 93,
    status: 'pending',
  },
]

interface Props {
  onBack: () => void
}

export function CommsReplyQueue({ onBack }: Props) {
  const [replies, setReplies] = useState<DraftReply[]>([])
  const [scanning, setScanning] = useState(true)
  const [scanProgress, setScanProgress] = useState(0)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      for (let i = 0; i <= 5; i++) {
        if (cancelled) return
        setScanProgress(i)
        await wait(800)
      }
      if (cancelled) return
      setScanning(false)
      for (let i = 0; i < MOCK_REPLIES.length; i++) {
        if (cancelled) return
        await wait(600)
        setReplies(prev => [...prev, MOCK_REPLIES[i]])
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

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
        <button className="db-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          back to compose
        </button>
        <span className="db-rq-title">reply queue</span>
      </div>

      <div className="db-rq-inbox">
        <div className="db-rq-inbox-header">
          <span className="db-wd-browser-dot" />
          <span>gmail inbox — live browser</span>
        </div>
        <div className="db-rq-inbox-viewport">
          {scanning ? (
            <div className="db-rq-scanning">
              <div className="db-wd-scan-pulse" />
              <p>agent is navigating gmail...</p>
              <p className="db-rq-scan-detail">reading {scanProgress} of 5 unread messages...</p>
            </div>
          ) : (
            <div className="db-rq-scan-complete">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>inbox scan complete — {MOCK_REPLIES.length} replies drafted</span>
            </div>
          )}
        </div>
      </div>

      <div className="db-rq-drafts">
        <div className="db-rq-drafts-header">
          <span>draft queue ({replies.length} repl{replies.length !== 1 ? 'ies' : 'y'} ready)</span>
        </div>

        {replies.length === 0 && !scanning && (
          <p className="db-rq-empty">no drafts yet.</p>
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
            <p className="db-rq-card-draft">{reply.draft}</p>
            <div className="db-rq-card-footer">
              <span className="db-rq-card-voice">voice: {reply.voiceMatch}%</span>
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
    </div>
  )
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
