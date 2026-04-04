import { useAuth } from '../../context/AuthContext'

const MOCK_WRITING_PROFILE = {
  cadence_version: '1.0',
  export_type: 'voice_profile',
  fingerprint_type: 'writing',
  exported_at: new Date().toISOString(),
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
      em_dash_frequency: 'heavy',
      semicolon_frequency: 'never',
    },
    writing_rules: [
      'Keep sentences between 8-20 words. Vary length.',
      "Never start with 'However' or 'Furthermore'.",
      'Use em-dashes for asides every 2-3 paragraphs.',
      'Favor concrete examples over abstract claims.',
      'No semicolons. Ever.',
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
  exported_at: new Date().toISOString(),
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

interface Props {
  docCount: number
  categories: string[]
}

export function VoiceProfile({ docCount, categories }: Props) {
  const { user } = useAuth()

  const exportProfile = (type: 'writing' | 'communication') => {
    const profile = type === 'writing' ? { ...MOCK_WRITING_PROFILE } : { ...MOCK_COMMS_PROFILE }
    profile.user_display_name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
    profile.exported_at = new Date().toISOString()
    if (type === 'writing') {
      (profile as typeof MOCK_WRITING_PROFILE).profile.source_document_count = docCount
      ;(profile as typeof MOCK_WRITING_PROFILE).profile.source_categories = categories
    }

    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = type === 'writing' ? 'writing.cadence' : 'comms.cadence'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="db-voice-profile">
      <div className="db-sidebar-label">voice profile</div>

      <div className="db-vp-section">
        <div className="db-vp-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span>writing</span>
        </div>
        <div className="db-vp-stats">
          <span>{docCount} docs analyzed</span>
          <span>directness: 0.82</span>
        </div>
        <button className="db-vp-export" onClick={() => exportProfile('writing')}>
          export writing.cadence
        </button>
      </div>

      <div className="db-vp-section">
        <div className="db-vp-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <span>communication</span>
        </div>
        <div className="db-vp-stats">
          <span>peer: 0.3</span>
          <span>manager: 0.55</span>
        </div>
        <button className="db-vp-export" onClick={() => exportProfile('communication')}>
          export comms.cadence
        </button>
      </div>
    </div>
  )
}
