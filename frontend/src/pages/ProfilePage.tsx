import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useDocuments } from '../hooks/useDocuments'
import { supabase } from '../lib/supabase'
import { VoiceInterviewModal } from '../components/VoiceInterviewModal'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
}

interface VoiceSession {
  id: string
  conversation_id: string | null
  transcript: string
  duration_seconds: number | null
  fingerprint_json: Record<string, unknown> | null
  created_at: string
}

const MOCK_WRITING_PROFILE = {
  cadence_version: '1.0',
  export_type: 'voice_profile',
  fingerprint_type: 'writing',
  exported_at: '',
  user_display_name: '',
  profile: {
    source_document_count: 0,
    source_categories: [] as string[],
    voice_interview_included: false,
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
    exemplar_passages: [],
  },
}

const MOCK_COMMS_PROFILE = {
  cadence_version: '1.0',
  export_type: 'voice_profile',
  fingerprint_type: 'communication',
  exported_at: '',
  user_display_name: '',
  profile: {
    source_email_count: 0,
    voice_interview_included: false,
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
      "Sign off with 'Best,' — never 'Best regards'.",
      "Use contractions. Never write 'I will' when 'I'll' works.",
    ],
    exemplar_emails: [],
  },
}

function parseTranscriptMessages(raw: string): { role: 'agent' | 'user'; text: string }[] {
  const lines = raw.split(/\n\n/)
  return lines
    .map(line => {
      const trimmed = line.trim()
      if (trimmed.startsWith('Cadence: ')) {
        return { role: 'agent' as const, text: trimmed.slice(9) }
      } else if (trimmed.startsWith('You: ')) {
        return { role: 'user' as const, text: trimmed.slice(4) }
      }
      return null
    })
    .filter(Boolean) as { role: 'agent' | 'user'; text: string }[]
}

function VoiceInterviewProfile({
  session,
  totalSessions,
  formatDate,
  formatDuration,
}: {
  session: VoiceSession
  totalSessions: number
  formatDate: (d: string) => string
  formatDuration: (s: number | null) => string
}) {
  const [expanded, setExpanded] = useState(false)
  const messages = parseTranscriptMessages(session.transcript)
  const exchangeCount = messages.filter(m => m.role === 'user').length

  return (
    <div className="pp-voice-profile">
      <div className="pp-vp-meta">
        <div className="pp-vp-meta-row">
          <span className="pp-vp-meta-label">last interview</span>
          <span className="pp-vp-meta-value">{formatDate(session.created_at)}</span>
        </div>
        <div className="pp-vp-meta-row">
          <span className="pp-vp-meta-label">duration</span>
          <span className="pp-vp-meta-value">{formatDuration(session.duration_seconds)}</span>
        </div>
        <div className="pp-vp-meta-row">
          <span className="pp-vp-meta-label">exchanges</span>
          <span className="pp-vp-meta-value">{exchangeCount}</span>
        </div>
        <div className="pp-vp-meta-row">
          <span className="pp-vp-meta-label">total sessions</span>
          <span className="pp-vp-meta-value">{totalSessions}</span>
        </div>
      </div>

      <div className="pp-vp-transcript-section">
        <div className="pp-vp-transcript-header">
          <span className="pp-rules-label">transcript</span>
          <button
            className="pp-vp-expand-btn"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'collapse' : 'expand'}
          </button>
        </div>
        <div className={`pp-vp-transcript ${expanded ? 'pp-vp-transcript--expanded' : ''}`}>
          {messages.map((m, i) => (
            <div key={i} className={`pp-vp-msg pp-vp-msg--${m.role}`}>
              <span className="pp-vp-msg-role">{m.role === 'agent' ? 'cadence' : 'you'}</span>
              <span className="pp-vp-msg-text">{m.text}</span>
            </div>
          ))}
        </div>
      </div>

      {session.fingerprint_json && (
        <div className="pp-vp-fingerprint">
          <span className="pp-session-badge">fingerprint generated</span>
        </div>
      )}
    </div>
  )
}

export function ProfilePage() {
  const { user } = useAuth()
  const { grouped } = useDocuments()
  const [sessions, setSessions] = useState<VoiceSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [interviewOpen, setInterviewOpen] = useState(false)

  const writingDocCount = Object.values(grouped.writing).flat().length
  const commDocCount = Object.values(grouped.communication).flat().length
  const writingCategories = Object.keys(grouped.writing)
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

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
    const profile = type === 'writing'
      ? JSON.parse(JSON.stringify(MOCK_WRITING_PROFILE))
      : JSON.parse(JSON.stringify(MOCK_COMMS_PROFILE))

    profile.user_display_name = name
    profile.exported_at = new Date().toISOString()

    if (type === 'writing') {
      profile.profile.source_document_count = writingDocCount
      profile.profile.source_categories = writingCategories
      profile.profile.voice_interview_included = sessions.length > 0
    } else {
      profile.profile.source_email_count = commDocCount
      profile.profile.voice_interview_included = sessions.length > 0
    }

    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = type === 'writing' ? 'writing.cadence' : 'comms.cadence'
    a.click()
    URL.revokeObjectURL(url)
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

      <div className="pp-grid">
        {/* Writing Voice */}
        <div className="pp-card">
          <div className="pp-card-header">
            <div className="pp-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
              </svg>
            </div>
            <h2 className="pp-card-title">writing voice</h2>
          </div>

          <div className="pp-card-stats">
            <div className="pp-stat">
              <span className="pp-stat-value">{writingDocCount}</span>
              <span className="pp-stat-label">docs analyzed</span>
            </div>
            <div className="pp-stat">
              <span className="pp-stat-value">0.82</span>
              <span className="pp-stat-label">directness</span>
            </div>
            <div className="pp-stat">
              <span className="pp-stat-value">0.45</span>
              <span className="pp-stat-label">formality</span>
            </div>
            <div className="pp-stat">
              <span className="pp-stat-value">14.2</span>
              <span className="pp-stat-label">avg words/sent</span>
            </div>
          </div>

          <div className="pp-card-rules">
            <span className="pp-rules-label">voice rules</span>
            <ul className="pp-rules-list">
              {MOCK_WRITING_PROFILE.profile.writing_rules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <div className="pp-card-tags">
            <span className="pp-rules-label">signature phrases</span>
            <div className="pp-tags">
              {MOCK_WRITING_PROFILE.profile.signature_phrases.map((p, i) => (
                <span key={i} className="pp-tag">"{p}"</span>
              ))}
            </div>
          </div>

          <button className="pp-export" onClick={() => exportProfile('writing')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            export writing.cadence
          </button>
        </div>

        {/* Communication Voice */}
        <div className="pp-card">
          <div className="pp-card-header">
            <div className="pp-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h2 className="pp-card-title">communication voice</h2>
          </div>

          <div className="pp-card-stats">
            <div className="pp-stat">
              <span className="pp-stat-value">{commDocCount}</span>
              <span className="pp-stat-label">emails analyzed</span>
            </div>
            <div className="pp-stat">
              <span className="pp-stat-value">89</span>
              <span className="pp-stat-label">avg length</span>
            </div>
            <div className="pp-stat">
              <span className="pp-stat-value">0.30</span>
              <span className="pp-stat-label">peer formality</span>
            </div>
            <div className="pp-stat">
              <span className="pp-stat-value">0.70</span>
              <span className="pp-stat-label">exec formality</span>
            </div>
          </div>

          <div className="pp-card-rules">
            <span className="pp-rules-label">email patterns</span>
            <div className="pp-email-patterns">
              <div className="pp-pattern-row">
                <span className="pp-pattern-key">greeting</span>
                <span className="pp-pattern-val">{MOCK_COMMS_PROFILE.profile.email_style.greeting}</span>
              </div>
              <div className="pp-pattern-row">
                <span className="pp-pattern-key">signoff</span>
                <span className="pp-pattern-val">{MOCK_COMMS_PROFILE.profile.email_style.signoff}</span>
              </div>
            </div>
          </div>

          <div className="pp-card-rules">
            <span className="pp-rules-label">voice rules</span>
            <ul className="pp-rules-list">
              {MOCK_COMMS_PROFILE.profile.writing_rules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <button className="pp-export" onClick={() => exportProfile('communication')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            export comms.cadence
          </button>
        </div>

        {/* Voice Interview */}
        <div className="pp-card pp-card--wide">
          <div className="pp-card-header">
            <div className="pp-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </div>
            <h2 className="pp-card-title">voice interview</h2>
            {sessions.length > 0 && (
              <button className="pp-interview-btn" onClick={() => setInterviewOpen(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                </svg>
                retake interview
              </button>
            )}
          </div>

          {loadingSessions ? (
            <p className="pp-empty">loading...</p>
          ) : sessions.length === 0 ? (
            <div className="pp-empty-state">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              </svg>
              <p className="pp-empty">no voice interview yet</p>
              <p className="pp-empty-hint">
                a 5-minute conversation where cadence learns how you think and express yourself.
              </p>
              <button className="pp-start-btn" onClick={() => setInterviewOpen(true)}>
                start your first interview
              </button>
            </div>
          ) : (
            <VoiceInterviewProfile
              session={sessions[0]}
              totalSessions={sessions.length}
              formatDate={formatDate}
              formatDuration={formatDuration}
            />
          )}
        </div>
      </div>

      <VoiceInterviewModal
        open={interviewOpen}
        onClose={() => { setInterviewOpen(false); refreshSessions() }}
        onComplete={refreshSessions}
      />
    </motion.div>
  )
}
