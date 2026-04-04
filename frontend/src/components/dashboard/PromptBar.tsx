import { useState, useRef, useEffect } from 'react'
import type { Document } from '../../hooks/useDocuments'

type Studio = 'writing' | 'comms' | null

interface Props {
  activeStudio: Studio
  selectedDocs: Document[]
  onRemoveDoc: (id: string) => void
  onSubmit: (prompt: string) => void
  onOpenUpload: () => void
  onOpenSelector: () => void
  recipient?: string
  relationship?: string
  onRecipientChange?: (v: string) => void
  onRelationshipChange?: (v: string) => void
}

export function PromptBar({
  activeStudio,
  selectedDocs,
  onRemoveDoc,
  onSubmit,
  onOpenUpload,
  onOpenSelector,
}: Props) {
  const [value, setValue] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const placeholder = activeStudio === 'comms'
    ? 'describe what you want to say...'
    : activeStudio === 'writing'
      ? 'describe what you want to write...'
      : 'select a studio to get started...'

  return (
    <div className="db-promptbar-wrap">
      {selectedDocs.length > 0 && (
        <div className="db-promptbar-chips">
          {selectedDocs.map(doc => (
            <span key={doc.id} className="db-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <path d="M14 2v6h6"/>
              </svg>
              {doc.filename}
              <button className="db-chip-remove" onClick={() => onRemoveDoc(doc.id)}>×</button>
            </span>
          ))}
        </div>
      )}

      <div className="db-promptbar">
        <div className="db-promptbar-plus-wrap" ref={menuRef}>
          <button
            className="db-promptbar-plus"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Add"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {menuOpen && (
            <div className="db-promptbar-menu">
              <button onClick={() => { onOpenUpload(); setMenuOpen(false) }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <path d="M14 2v6h6"/>
                </svg>
                upload new document
              </button>
              <button onClick={() => { onOpenSelector(); setMenuOpen(false) }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                </svg>
                select from library
              </button>
              <button disabled>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                  <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                </svg>
                voice interview
                <span className="db-promptbar-menu-badge">soon</span>
              </button>
            </div>
          )}
        </div>

        <textarea
          ref={inputRef}
          className="db-promptbar-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={!activeStudio}
        />

        <button
          className="db-promptbar-send"
          onClick={handleSubmit}
          disabled={!value.trim() || !activeStudio}
          aria-label="Send"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
