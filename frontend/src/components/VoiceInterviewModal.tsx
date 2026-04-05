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

function WispBackground({ speaking, visible }: { speaking: boolean; visible: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const rafRef = useRef<number>(0)
  const speakingRef = useRef(speaking)
  speakingRef.current = speaking

  useEffect(() => {
    if (!visible) return

    const sendLevel = () => {
      const iframe = iframeRef.current
      if (!iframe?.contentWindow) {
        rafRef.current = requestAnimationFrame(sendLevel)
        return
      }

      const level = speakingRef.current ? 1.0 : 0.0
      iframe.contentWindow.postMessage({ type: 'AUDIO_LEVEL', level }, '*')
      rafRef.current = requestAnimationFrame(sendLevel)
    }

    rafRef.current = requestAnimationFrame(sendLevel)
    return () => cancelAnimationFrame(rafRef.current)
  }, [visible])

  if (!visible) return null

  return (
    <motion.iframe
      ref={iframeRef}
      src="/wisp/index.html"
      className="vi-wisp-bg"
      title="voice visualizer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    />
  )
}

function InterviewUI({ onClose, onComplete, inline }: { onClose: () => void; onComplete?: () => void; inline?: boolean }) {
  const { user, session } = useAuth()
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [micAllowed, setMicAllowed] = useState(false)
  const [started, setStarted] = useState(false)
  const startTimeRef = useRef<number>(0)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const conversationIdRef = useRef<string>('')

  const transcriptRef = useRef<TranscriptEntry[]>([])
  const savingRef = useRef(false)

  useEffect(() => { transcriptRef.current = transcript }, [transcript])
  useEffect(() => { savingRef.current = saving }, [saving])

  const doSave = useCallback(async () => {
    const currentTranscript = transcriptRef.current
    if (savingRef.current || currentTranscript.length === 0) return
    setSaving(true)
    savingRef.current = true

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
    const fullTranscript = currentTranscript
      .map(t => `${t.role === 'agent' ? 'Cadence' : 'You'}: ${t.text}`)
      .join('\n\n')

    try {
      if (session?.access_token) {
        const res = await fetch(`${BACKEND_URL}/api/voice-session`, {
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
        if (!res.ok) {
          console.error('[voice-interview] save response not ok:', res.status)
        }
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
    savingRef.current = false
    onComplete?.()
  }, [session, user, onComplete])

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
      doSave()
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

    setStarted(true)

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
        setStarted(false)
      }
    }
  }, [conversation, session])

  const handleEnd = useCallback(async () => {
    await conversation.endSession()
    await doSave()
  }, [conversation, doSave])

  const { status, isSpeaking } = conversation
  const wrapCls = inline ? 'vi-fullpage vi-fullpage--inline' : 'vi-fullpage'
  const showWisp = started

  if (!micAllowed) {
    return (
      <div className={wrapCls}>
        <div className="vi-center-card">
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

  if (!started && status === 'disconnected' && transcript.length === 0) {
    return (
      <div className={wrapCls}>
        <div className="vi-center-card">
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

  if (saving || (status === 'disconnected' && transcript.length > 0)) {
    return (
      <div className={wrapCls}>
        <WispBackground speaking={false} visible={showWisp} />
        <div className="vi-center-card">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5">
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

  if (status === 'connecting') {
    return (
      <div className={wrapCls}>
        <WispBackground speaking={false} visible={showWisp} />
        <div className="vi-center-card vi-center-card--compact">
          <div className="vi-connecting-spinner" />
          <p className="vi-status-text">connecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={wrapCls}>
      <WispBackground speaking={isSpeaking} visible={showWisp} />

      <div className="vi-live-overlay">
        <div className="vi-live-top">
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

        <div className="vi-live-transcript">
          {transcript.map((t, i) => (
            <div key={i} className={`vi-msg vi-msg--${t.role}`}>
              <span className="vi-msg-role">{t.role === 'agent' ? 'cadence' : 'you'}</span>
              <span className="vi-msg-text">{t.text}</span>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  )
}

export function VoiceInterviewModal({ open, onClose, onComplete, inline }: Props) {
  if (!open) return null

  if (inline) {
    return (
      <ConversationProvider>
        <InterviewUI onClose={onClose} onComplete={onComplete} inline />
      </ConversationProvider>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="vi-page-takeover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <ConversationProvider>
            <InterviewUI onClose={onClose} onComplete={onComplete} />
          </ConversationProvider>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
