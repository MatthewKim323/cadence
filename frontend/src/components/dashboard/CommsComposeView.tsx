import { useState, useEffect, useRef } from 'react'

const MOCK_DRAFT = `Hey Sarah,

Can't make the 3pm — vendor stuff is running behind and I need to be on a call with them. Free tomorrow same time if that works?

Also — can you send me the deck when you get a chance?

Thanks`

export function CommsComposeView() {
  const [recipient, setRecipient] = useState('')
  const [relationship, setRelationship] = useState('peer')
  const [intent, setIntent] = useState('')
  const [draft, setDraft] = useState('')
  const [generating, setGenerating] = useState(false)
  const [voiceMatch, setVoiceMatch] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const draftRef = useRef<HTMLDivElement>(null)

  const handleGenerate = async () => {
    if (!intent.trim()) return
    setGenerating(true)
    setDraft('')
    setVoiceMatch(null)

    for (let i = 0; i <= MOCK_DRAFT.length; i++) {
      await wait(12 + Math.random() * 18)
      setDraft(MOCK_DRAFT.slice(0, i))
    }

    setVoiceMatch(94)
    setGenerating(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  useEffect(() => {
    if (draftRef.current) draftRef.current.scrollTop = draftRef.current.scrollHeight
  }, [draft])

  const handleCopy = () => {
    navigator.clipboard.writeText(MOCK_DRAFT)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="db-comms-compose">
      <div className="db-comms-col db-comms-context">
        <div className="db-comms-field-label">context</div>

        <div className="db-comms-field">
          <label>platform</label>
          <select className="db-comms-select" defaultValue="email">
            <option value="email">email</option>
          </select>
        </div>

        <div className="db-comms-field">
          <label>to</label>
          <input
            className="db-comms-input"
            type="text"
            placeholder="recipient name"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
          />
        </div>

        <div className="db-comms-field">
          <label>relationship</label>
          <select
            className="db-comms-select"
            value={relationship}
            onChange={e => setRelationship(e.target.value)}
          >
            <option value="peer">peer</option>
            <option value="manager">manager</option>
            <option value="executive">executive</option>
            <option value="external">external</option>
          </select>
        </div>

        <div className="db-comms-field">
          <label>intent</label>
          <textarea
            className="db-comms-textarea"
            placeholder="describe what you want to say..."
            value={intent}
            onChange={e => setIntent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
          />
        </div>

        <button
          className="db-btn-primary db-comms-generate"
          onClick={handleGenerate}
          disabled={generating || !intent.trim()}
        >
          {generating ? 'generating...' : 'generate draft'}
        </button>

        <div className="db-comms-tone">
          <span className="db-comms-tone-label">tone:</span>
          <span className="db-comms-tone-val">
            {relationship === 'peer' ? 'casual' : relationship === 'manager' ? 'semi-formal' : 'formal'}
          </span>
        </div>
      </div>

      <div className="db-comms-col db-comms-preview">
        <div className="db-comms-field-label">draft preview</div>

        {!draft && !generating ? (
          <div className="db-comms-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <p>fill in the context and describe your intent to generate a draft.</p>
          </div>
        ) : (
          <div className="db-comms-draft-area" ref={draftRef}>
            <pre className="db-comms-draft-text">
              {draft}
              {generating && <span className="db-wd-cursor" />}
            </pre>
          </div>
        )}

        {voiceMatch !== null && (
          <div className="db-comms-voice-bar">
            <span className="db-comms-voice-label">voice match</span>
            <div className="db-comms-voice-track">
              <div className="db-comms-voice-fill" style={{ width: `${voiceMatch}%` }} />
            </div>
            <span className="db-comms-voice-val">{voiceMatch}%</span>
          </div>
        )}

        {draft && !generating && (
          <div className="db-comms-actions">
            <button className="db-btn-primary" onClick={handleCopy}>
              {copied ? 'copied!' : 'copy'}
            </button>
            <button className="db-btn-ghost" onClick={handleGenerate}>regenerate</button>
          </div>
        )}
      </div>
    </div>
  )
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
