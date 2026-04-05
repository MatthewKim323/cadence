import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ConversationProvider,
  useConversation,
} from '@elevenlabs/react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const BACKEND_URL = 'http://127.0.0.1:8000'

interface Props {
  open: boolean
  onClose: () => void
  onComplete?: () => void
  inline?: boolean
}

interface TranscriptEntry {
  role: 'user' | 'agent'
  text: string
  timestamp: number
}

function InterviewUI({ onClose, onComplete }: { onClose: () => void; onComplete?: () => void }) {
  const { user, session } = useAuth()
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [micAllowed, setMicAllowed] = useState(false)
  const startTimeRef = useRef<number>(0)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const conversationIdRef = useRef<string>('')

  const conversation = useConversation({
    onMessage: (msg) => {
      if (msg.source === 'ai' && msg.message) {
        setTranscript(prev => [...prev, {
          role: 'agent',
          text: msg.message,
          timestamp: Date.now(),
        }])
      } else if (msg.source === 'user' && msg.message) {
        setTranscript(prev => [...prev, {
          role: 'user',
          text: msg.message,
          timestamp: Date.now(),
        }])
      }
    },
    onDisconnect: () => {
      if (transcript.length > 0 && !saving) {
        handleSave()
      }
    },
  })

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const requestMic = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicAllowed(true)
    } catch {
      alert('Microphone access is required for the voice interview.')
    }
  }, [])

  const startInterview = useCallback(async () => {
    if (!session?.access_token) return

    try {
      const res = await fetch(`${BACKEND_URL}/api/voice-interview/signed-url`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) throw new Error('Failed to get signed URL')

      const { signed_url } = await res.json()
      startTimeRef.current = Date.now()

      const convId = await conversation.startSession({ signedUrl: signed_url })
      conversationIdRef.current = convId ?? ''
    } catch (err) {
      console.error('[voice-interview] start failed:', err)
      try {
        startTimeRef.current = Date.now()
        const convId = await conversation.startSession({
          agentId: 'agent_5901kndmhqz4fz090gd5x3f2pqxe',
        })
        conversationIdRef.current = convId ?? ''
      } catch (fallbackErr) {
        console.error('[voice-interview] fallback also failed:', fallbackErr)
      }
    }
  }, [conversation, session])

  const handleEnd = useCallback(async () => {
    await conversation.endSession()
    await handleSave()
  }, [conversation, transcript])

  const handleSave = async () => {
    if (saving || transcript.length === 0) return
    setSaving(true)

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
    const fullTranscript = transcript
      .map(t => `${t.role === 'agent' ? 'Cadence' : 'You'}: ${t.text}`)
      .join('\n\n')

    try {
      if (session?.access_token) {
        await fetch(`${BACKEND_URL}/api/voice-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            transcript: fullTranscript,
            duration_seconds: duration,
            conversation_id: conversationIdRef.current,
          }),
        })
      }
    } catch (err) {
      console.error('[voice-interview] save failed, saving locally:', err)
      await supabase.from('voice_sessions').insert({
        user_id: user?.id,
        transcript: fullTranscript,
        duration_seconds: duration,
        conversation_id: conversationIdRef.current,
      })
    }

    setSaving(false)
    onComplete?.()
  }

  const { status, isSpeaking } = conversation

  if (!micAllowed) {
    return (
      <div className="vi-step">
        <div className="vi-mic-request">
          <div className="vi-mic-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <h3 className="vi-heading">microphone access</h3>
          <p className="vi-desc">
            cadence needs your microphone to conduct the voice interview.
            the conversation is processed in real-time and never stored as audio.
          </p>
          <button className="vi-btn vi-btn--primary" onClick={requestMic}>
            allow microphone
          </button>
          <button className="vi-btn vi-btn--ghost" onClick={onClose}>
            cancel
          </button>
        </div>
      </div>
    )
  }

  if (status === 'disconnected' && transcript.length === 0) {
    return (
      <div className="vi-step">
        <div className="vi-ready">
          <div className="vi-orb">
            <div className="vi-orb-ring" />
            <div className="vi-orb-ring vi-orb-ring--2" />
            <div className="vi-orb-core" />
          </div>
          <h3 className="vi-heading">ready to begin</h3>
          <p className="vi-desc">
            a 5-minute conversation where cadence learns how you think,
            explain, and express yourself. just talk naturally.
          </p>
          <button className="vi-btn vi-btn--primary" onClick={startInterview}>
            start interview
          </button>
          <button className="vi-btn vi-btn--ghost" onClick={onClose}>
            cancel
          </button>
        </div>
      </div>
    )
  }

  if (status === 'connecting') {
    return (
      <div className="vi-step">
        <div className="vi-connecting">
          <div className="vi-orb vi-orb--pulse">
            <div className="vi-orb-ring" />
            <div className="vi-orb-ring vi-orb-ring--2" />
            <div className="vi-orb-core" />
          </div>
          <p className="vi-status-text">connecting...</p>
        </div>
      </div>
    )
  }

  if (saving || (status === 'disconnected' && transcript.length > 0)) {
    return (
      <div className="vi-step">
        <div className="vi-done">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <h3 className="vi-heading">{saving ? 'saving transcript...' : 'interview complete'}</h3>
          <p className="vi-desc">
            {saving
              ? 'building your voice profile from the conversation...'
              : `captured ${transcript.length} exchanges. your voice profile has been updated.`}
          </p>
          {!saving && (
            <button className="vi-btn vi-btn--primary" onClick={onClose}>
              done
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="vi-live">
      <div className="vi-live-header">
        <div className="vi-live-indicator">
          <span className={`vi-live-dot ${isSpeaking ? 'vi-live-dot--speaking' : ''}`} />
          <span className="vi-live-label">
            {isSpeaking ? 'cadence is speaking' : 'listening...'}
          </span>
        </div>
        <button className="vi-btn vi-btn--end" onClick={handleEnd}>
          end interview
        </button>
      </div>

      <div className="vi-orb-area">
        <div className={`vi-orb vi-orb--live ${isSpeaking ? 'vi-orb--speaking' : 'vi-orb--listening'}`}>
          <div className="vi-orb-ring" />
          <div className="vi-orb-ring vi-orb-ring--2" />
          <div className="vi-orb-ring vi-orb-ring--3" />
          <div className="vi-orb-core" />
        </div>
      </div>

      <div className="vi-transcript">
        {transcript.map((t, i) => (
          <div key={i} className={`vi-msg vi-msg--${t.role}`}>
            <span className="vi-msg-role">{t.role === 'agent' ? 'cadence' : 'you'}</span>
            <span className="vi-msg-text">{t.text}</span>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>
    </div>
  )
}

export function VoiceInterviewModal({ open, onClose, onComplete, inline }: Props) {
  if (!open) return null

  if (inline) {
    return (
      <ConversationProvider>
        <InterviewUI onClose={onClose} onComplete={onComplete} />
      </ConversationProvider>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="vi-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="vi-modal"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <ConversationProvider>
              <InterviewUI onClose={onClose} onComplete={onComplete} />
            </ConversationProvider>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
