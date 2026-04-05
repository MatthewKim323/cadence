import { useState, useEffect, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useDocuments } from '../hooks/useDocuments'
import { supabase } from '../lib/supabase'
import { VoiceInterviewModal } from '../components/VoiceInterviewModal'
import { exportWritingPdf, exportCommsPdf, exportInterviewPdf } from '../utils/exportPdf'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const } },
}

interface VoiceSession {
  id: string
  conversation_id: string | null
  transcript: string
  duration_seconds: number | null
  fingerprint_json: Record<string, unknown> | null
  created_at: string
}

// ─── Expandable Card Shell ─────────────────────────────
function ExpandableCard({
  icon,
  title,
  headerRight,
  summary,
  expanded,
  onToggle,
  children,
}: {
  icon: ReactNode
  title: string
  headerRight?: ReactNode
  summary: ReactNode
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className={`pp-card ${expanded ? 'pp-card--expanded' : ''}`}>
      <div className="pp-card-header">
        <div className="pp-card-icon">{icon}</div>
        <h2 className="pp-card-title">{title}</h2>
        {headerRight}
        <button className="pp-toggle-btn" onClick={onToggle}>
          {expanded ? 'collapse' : 'expand'}
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}
          >
            <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {summary}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className="pp-card-expand"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Helpers ─────────────────────────────
function parseTranscriptMessages(raw: string): { role: 'agent' | 'user'; text: string }[] {
  return raw.split(/\n\n/)
    .map(line => {
      const trimmed = line.trim()
      if (trimmed.startsWith('Cadence: ')) return { role: 'agent' as const, text: trimmed.slice(9) }
      if (trimmed.startsWith('You: ')) return { role: 'user' as const, text: trimmed.slice(4) }
      return null
    })
    .filter(Boolean) as { role: 'agent' | 'user'; text: string }[]
}

function renderKeyValue(key: string, val: unknown) {
  if (val === null || val === undefined) return null
  if (typeof val === 'object' && !Array.isArray(val)) {
    return (
      <div className="pp-kv-group" key={key}>
        <span className="pp-kv-key">{key}</span>
        <div className="pp-kv-nested">
          {Object.entries(val as Record<string, unknown>).map(([k, v]) => renderKeyValue(k, v))}
        </div>
      </div>
    )
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return null
    return (
      <div className="pp-kv-group" key={key}>
        <span className="pp-kv-key">{key}</span>
        <div className="pp-kv-array">
          {val.map((item, i) => (
            <span key={i} className="pp-kv-array-item">{String(item)}</span>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="pp-kv-row" key={key}>
      <span className="pp-kv-key">{key}</span>
      <span className="pp-kv-val">{String(val)}</span>
    </div>
  )
}

const MOCK_WRITING_PROFILE = {
  metrics: {
    avg_sentence_length: 14.2,
    sentence_length_variance: 'high',
    formality: 0.45,
    directness: 0.82,
    humor: 0.35,
    em_dash_frequency: 'never',
    semicolon_frequency: 'never',
  },
  writing_rules: [
    'Keep sentences between 8-20 words. Vary length.',
    "Never start with 'However' or 'Furthermore'.",
    'Favor concrete examples over abstract claims.',
    'No semicolons. Ever.',
    'Never use em-dashes.',
  ],
  signature_phrases: ['The thing about', 'turns out'],
  avoided_patterns: ['It is important to note', 'In conclusion'],
  exemplar_passages: [] as string[],
}

const MOCK_COMMS_PROFILE = {
  email_style: {
    avg_length: 89,
    greeting: 'Hey {first_name},',
    signoff: 'Best,',
    formality_by_recipient: { peer: 0.3, manager: 0.55, executive: 0.7, external: 0.8 },
  },
  response_patterns: {
    acknowledgment_first: true,
    asks_followup_questions: true,
    says_yes: ['Sounds good', "Let's do it", "I'm down"],
    says_no: ["I don't think that's the move", 'Let me push back here'],
  },
  writing_rules: [
    "Start with 'Hey {first_name},' for peers.",
    'Keep emails to 3-5 sentences for peers.',
    "Always acknowledge the other person's point first.",
    "Sign off with 'Best,' -- never 'Best regards'.",
    "Use contractions. Never write 'I will' when 'I'll' works.",
  ],
  exemplar_emails: [] as string[],
}

// ─── Writing Card ─────────────────────────────
function WritingCard({ docCount, expanded, onToggle, onExport }: {
  docCount: number
  expanded: boolean
  onToggle: () => void
  onExport: () => void
}) {
  const p = MOCK_WRITING_PROFILE
  return (
    <ExpandableCard
      icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 19l7-7 3 3-7 7-3-3z"/>
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
        </svg>
      }
      title="writing.cadence.pdf"
      headerRight={
        <button className="pp-export-sm" onClick={onExport}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          export
        </button>
      }
      summary={
        <div className="pp-card-stats">
          <div className="pp-stat">
            <span className="pp-stat-value">{docCount}</span>
            <span className="pp-stat-label">docs analyzed</span>
          </div>
          <div className="pp-stat">
            <span className="pp-stat-value">{p.metrics.directness}</span>
            <span className="pp-stat-label">directness</span>
          </div>
          <div className="pp-stat">
            <span className="pp-stat-value">{p.metrics.formality}</span>
            <span className="pp-stat-label">formality</span>
          </div>
          <div className="pp-stat">
            <span className="pp-stat-value">{p.metrics.avg_sentence_length}</span>
            <span className="pp-stat-label">avg words/sent</span>
          </div>
        </div>
      }
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="pp-full-profile">
        <div className="pp-section">
          <span className="pp-rules-label">metrics</span>
          <div className="pp-kv-grid">
            {Object.entries(p.metrics).map(([k, v]) => renderKeyValue(k, v))}
          </div>
        </div>

        <div className="pp-section">
          <span className="pp-rules-label">voice rules</span>
          <ul className="pp-rules-list">
            {p.writing_rules.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        <div className="pp-section">
          <span className="pp-rules-label">signature phrases</span>
          <div className="pp-tags">
            {p.signature_phrases.map((ph, i) => <span key={i} className="pp-tag">"{ph}"</span>)}
          </div>
        </div>

        <div className="pp-section">
          <span className="pp-rules-label">avoided patterns</span>
          <div className="pp-tags">
            {p.avoided_patterns.map((pa, i) => <span key={i} className="pp-tag pp-tag--avoid">{pa}</span>)}
          </div>
        </div>

        {p.exemplar_passages.length > 0 && (
          <div className="pp-section">
            <span className="pp-rules-label">exemplar passages</span>
            {p.exemplar_passages.map((ex, i) => (
              <blockquote key={i} className="pp-exemplar">{ex}</blockquote>
            ))}
          </div>
        )}
      </div>
    </ExpandableCard>
  )
}

// ─── Comms Card ─────────────────────────────
function CommsCard({ emailCount, expanded, onToggle, onExport }: {
  emailCount: number
  expanded: boolean
  onToggle: () => void
  onExport: () => void
}) {
  const p = MOCK_COMMS_PROFILE
  return (
    <ExpandableCard
      icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      }
      title="comms.cadence.pdf"
      headerRight={
        <button className="pp-export-sm" onClick={onExport}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          export
        </button>
      }
      summary={
        <div className="pp-card-stats">
          <div className="pp-stat">
            <span className="pp-stat-value">{emailCount}</span>
            <span className="pp-stat-label">emails analyzed</span>
          </div>
          <div className="pp-stat">
            <span className="pp-stat-value">{p.email_style.avg_length}</span>
            <span className="pp-stat-label">avg length</span>
          </div>
          <div className="pp-stat">
            <span className="pp-stat-value">{p.email_style.formality_by_recipient.peer}</span>
            <span className="pp-stat-label">peer formality</span>
          </div>
          <div className="pp-stat">
            <span className="pp-stat-value">{p.email_style.formality_by_recipient.executive}</span>
            <span className="pp-stat-label">exec formality</span>
          </div>
        </div>
      }
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="pp-full-profile">
        <div className="pp-section">
          <span className="pp-rules-label">email style</span>
          <div className="pp-kv-grid">
            {Object.entries(p.email_style).map(([k, v]) => renderKeyValue(k, v))}
          </div>
        </div>

        <div className="pp-section">
          <span className="pp-rules-label">response patterns</span>
          <div className="pp-kv-grid">
            {Object.entries(p.response_patterns).map(([k, v]) => renderKeyValue(k, v))}
          </div>
        </div>

        <div className="pp-section">
          <span className="pp-rules-label">voice rules</span>
          <ul className="pp-rules-list">
            {p.writing_rules.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        {p.exemplar_emails.length > 0 && (
          <div className="pp-section">
            <span className="pp-rules-label">exemplar emails</span>
            {p.exemplar_emails.map((ex, i) => (
              <blockquote key={i} className="pp-exemplar">{ex}</blockquote>
            ))}
          </div>
        )}
      </div>
    </ExpandableCard>
  )
}

// ─── Interview Card ─────────────────────────────
function InterviewCard({
  sessions,
  loading,
  expanded,
  onToggle,
  onStartInterview,
  formatDate,
  formatDuration,
}: {
  sessions: VoiceSession[]
  loading: boolean
  expanded: boolean
  onToggle: () => void
  onStartInterview: () => void
  formatDate: (d: string) => string
  formatDuration: (s: number | null) => string
}) {
  const session = sessions[0]
  const fp = session?.fingerprint_json as Record<string, unknown> | null
  const personality = fp?.personality as Record<string, unknown> | undefined
  const speechPatterns = fp?.speech_patterns as Record<string, unknown> | undefined
  const messages = session ? parseTranscriptMessages(session.transcript) : []
  const exchangeCount = messages.filter(m => m.role === 'user').length

  return (
    <ExpandableCard
      icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
          <path d="M19 10v2a7 7 0 01-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      }
      title="interview.cadence.pdf"
      headerRight={
        sessions.length > 0 ? (
          <button className="pp-interview-btn" onClick={onStartInterview}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
            </svg>
            retake
          </button>
        ) : undefined
      }
      summary={
        loading ? (
          <p className="pp-empty">loading...</p>
        ) : !session ? (
          <div className="pp-empty-state">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            </svg>
            <p className="pp-empty">no voice interview yet</p>
            <p className="pp-empty-hint">a 5-minute conversation where cadence learns how you think and express yourself.</p>
            <button className="pp-start-btn" onClick={onStartInterview}>start your first interview</button>
          </div>
        ) : (
          <div className="pp-card-stats">
            <div className="pp-stat">
              <span className="pp-stat-value">{formatDate(session.created_at)}</span>
              <span className="pp-stat-label">last interview</span>
            </div>
            <div className="pp-stat">
              <span className="pp-stat-value">{formatDuration(session.duration_seconds)}</span>
              <span className="pp-stat-label">duration</span>
            </div>
            <div className="pp-stat">
              <span className="pp-stat-value">{exchangeCount}</span>
              <span className="pp-stat-label">exchanges</span>
            </div>
            <div className="pp-stat">
              <span className="pp-stat-value">{sessions.length}</span>
              <span className="pp-stat-label">total sessions</span>
            </div>
            {personality && (
              <>
                <div className="pp-stat">
                  <span className="pp-stat-value">{String((personality as Record<string, unknown>).thinking_style ?? '--')}</span>
                  <span className="pp-stat-label">thinking style</span>
                </div>
                <div className="pp-stat">
                  <span className="pp-stat-value">{String((personality as Record<string, unknown>).energy ?? '--')}</span>
                  <span className="pp-stat-label">energy</span>
                </div>
              </>
            )}
          </div>
        )
      }
      expanded={expanded}
      onToggle={onToggle}
    >
      {session && (
        <div className="pp-full-profile">
          {fp ? (
            <>
              {personality && (
                <div className="pp-section">
                  <span className="pp-rules-label">personality</span>
                  <div className="pp-kv-grid">
                    {Object.entries(personality).map(([k, v]) => renderKeyValue(k, v))}
                  </div>
                </div>
              )}

              {speechPatterns && (
                <div className="pp-section">
                  <span className="pp-rules-label">speech patterns</span>
                  <div className="pp-kv-grid">
                    {Object.entries(speechPatterns).map(([k, v]) => renderKeyValue(k, v))}
                  </div>
                </div>
              )}

              {fp.reasoning_style && (
                <div className="pp-section">
                  <span className="pp-rules-label">reasoning style</span>
                  <div className="pp-kv-grid">
                    {Object.entries(fp.reasoning_style as Record<string, unknown>).map(([k, v]) => renderKeyValue(k, v))}
                  </div>
                </div>
              )}

              {fp.vocabulary && (
                <div className="pp-section">
                  <span className="pp-rules-label">vocabulary</span>
                  <div className="pp-kv-grid">
                    {Object.entries(fp.vocabulary as Record<string, unknown>).map(([k, v]) => renderKeyValue(k, v))}
                  </div>
                </div>
              )}

              {Array.isArray(fp.voice_rules) && fp.voice_rules.length > 0 && (
                <div className="pp-section">
                  <span className="pp-rules-label">voice rules</span>
                  <ul className="pp-rules-list">
                    {(fp.voice_rules as string[]).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {Array.isArray(fp.exemplar_quotes) && fp.exemplar_quotes.length > 0 && (
                <div className="pp-section">
                  <span className="pp-rules-label">exemplar quotes</span>
                  {(fp.exemplar_quotes as string[]).map((q, i) => (
                    <blockquote key={i} className="pp-exemplar">"{q}"</blockquote>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="pp-section">
              <p className="pp-empty-hint" style={{ textAlign: 'left' }}>
                fingerprint not yet generated. retake the interview to generate one.
              </p>
            </div>
          )}

          <div className="pp-section">
            <span className="pp-rules-label">transcript</span>
            <div className="pp-transcript-block">
              {messages.map((m, i) => (
                <div key={i} className={`pp-vp-msg pp-vp-msg--${m.role}`}>
                  <span className="pp-vp-msg-role">{m.role === 'agent' ? 'cadence' : 'you'}</span>
                  <span className="pp-vp-msg-text">{m.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ExpandableCard>
  )
}

// ─── Main Page ─────────────────────────────
export function ProfilePage() {
  const { user } = useAuth()
  const { grouped } = useDocuments()
  const [sessions, setSessions] = useState<VoiceSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [interviewOpen, setInterviewOpen] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})

  const writingDocCount = Object.values(grouped.writing).flat().length
  const commDocCount = Object.values(grouped.communication).flat().length
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  const toggleCard = (id: string) =>
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }))

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('voice_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setSessions(data ?? [])
      setLoadingSessions(false)
    }
    load()
  }, [user])

  const refreshSessions = async () => {
    if (!user) return
    const { data } = await supabase
      .from('voice_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setSessions(data ?? [])
  }

  const exportProfile = (type: 'writing' | 'communication') => {
    if (type === 'writing') {
      exportWritingPdf(MOCK_WRITING_PROFILE as unknown as Record<string, unknown>, name)
    } else {
      exportCommsPdf(MOCK_COMMS_PROFILE as unknown as Record<string, unknown>, name)
    }
  }

  const exportInterview = () => {
    const session = sessions[0]
    if (!session) return
    const fp = (session.fingerprint_json ?? {}) as Record<string, unknown>
    exportInterviewPdf(fp, session.transcript, name)
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const formatDuration = (s: number | null) => {
    if (!s) return '--'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <motion.div
      className="pp-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="pp-header">
        <Link to="/dashboard" className="pp-back">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          back to dashboard
        </Link>
        <h1 className="pp-title">voice profile</h1>
        <p className="pp-subtitle">{name}'s cadence fingerprint</p>
      </div>

      <div className="pp-grid-3">
        <WritingCard
          docCount={writingDocCount}
          expanded={!!expandedCards['writing']}
          onToggle={() => toggleCard('writing')}
          onExport={() => exportProfile('writing')}
        />

        <CommsCard
          emailCount={commDocCount}
          expanded={!!expandedCards['comms']}
          onToggle={() => toggleCard('comms')}
          onExport={() => exportProfile('communication')}
        />

        <InterviewCard
          sessions={sessions}
          loading={loadingSessions}
          expanded={!!expandedCards['interview']}
          onToggle={() => toggleCard('interview')}
          onStartInterview={() => setInterviewOpen(true)}
          formatDate={formatDate}
          formatDuration={formatDuration}
        />
      </div>

      {sessions.length > 0 && sessions[0].fingerprint_json && (
        <div className="pp-export-footer">
          <button className="pp-export" onClick={exportInterview}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            export interview.cadence.pdf
          </button>
        </div>
      )}

      <VoiceInterviewModal
        open={interviewOpen}
        onClose={() => { setInterviewOpen(false); refreshSessions() }}
        onComplete={refreshSessions}
      />
    </motion.div>
  )
}
