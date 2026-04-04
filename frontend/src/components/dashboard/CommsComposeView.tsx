import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Props {
  documentIds: string[]
}

export function CommsComposeView({ documentIds }: Props) {
  const [recipient, setRecipient] = useState('')
  const [relationship, setRelationship] = useState('peer')
  const [intent, setIntent] = useState('')
  const [draft, setDraft] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const draftRef = useRef<HTMLDivElement>(null)

  const handleGenerate = async () => {
    if (!intent.trim()) return
    setGenerating(true)
    setDraft('')
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setError('Not authenticated. Please log in again.')
        setGenerating(false)
        return
      }

      const res = await fetch(`${API_URL}/api/compose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: token,
          document_ids: documentIds,
          recipient,
          relationship,
          intent,
        }),
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setDraft(data.draft || '')
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate draft. Is the backend running?')
    }

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
    navigator.clipboard.writeText(draft)
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

        {documentIds.length === 0 && (
          <div className="db-comms-no-docs">
            select communication samples from the library for better voice matching
          </div>
        )}

        <div className="db-comms-tone">
          <span className="db-comms-tone-label">tone:</span>
          <span className="db-comms-tone-val">
            {relationship === 'peer' ? 'casual' : relationship === 'manager' ? 'semi-formal' : 'formal'}
          </span>
        </div>
      </div>

      <div className="db-comms-col db-comms-preview">
        <div className="db-comms-field-label">draft preview</div>

        {error && (
          <div className="db-rq-error">
            <p>{error}</p>
          </div>
        )}

        {!draft && !generating && !error ? (
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
              {draft || (generating ? '' : '')}
              {generating && <span className="db-wd-cursor" />}
            </pre>
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
