import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

type Step = 'welcome' | 'upload' | 'voice' | 'uploading'

const CATEGORIES = ['Academic', 'Creative', 'Professional', 'Personal', 'Communication'] as const

interface QueuedFile {
  file: File
  category: string
}

const fadeSlide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
}

function WelcomeStep({ user, onChoice }: { user: { email?: string; user_metadata?: { full_name?: string } } | null; onChoice: (s: Step) => void }) {
  const name = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  return (
    <motion.div className="ob-card" {...fadeSlide}>
      <p className="ob-brand">cadence.</p>
      <h1 className="ob-title">welcome to cadence, {name}.</h1>
      <p className="ob-subtitle">
        before you start, we can learn your voice. this helps cadence write
        like you from day one. you can always do this later.
      </p>

      <div className="ob-options">
        <button className="ob-option" onClick={() => onChoice('voice')}>
          <div className="ob-option-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <div className="ob-option-text">
            <span className="ob-option-title">start voice interview</span>
            <span className="ob-option-desc">a 5-minute conversation where we learn how you think, explain, and express yourself.</span>
          </div>
          <svg className="ob-option-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <button className="ob-option" onClick={() => onChoice('upload')}>
          <div className="ob-option-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <path d="M9 15l3-3 3 3"/>
            </svg>
          </div>
          <div className="ob-option-text">
            <span className="ob-option-title">upload my writing</span>
            <span className="ob-option-desc">drop in essays, emails, blog posts — anything you've written. the more, the better.</span>
          </div>
          <svg className="ob-option-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <button className="ob-option ob-option--skip" onClick={() => onChoice('uploading')}>
          <div className="ob-option-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4"/>
              <line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
          </div>
          <div className="ob-option-text">
            <span className="ob-option-title">skip for now</span>
            <span className="ob-option-desc">jump straight into cadence. set up your voice profile anytime from the library.</span>
          </div>
          <svg className="ob-option-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

function UploadStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { user } = useAuth()
  const [files, setFiles] = useState<QueuedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const added = Array.from(newFiles).map(f => ({ file: f, category: 'Academic' }))
    setFiles(prev => [...prev, ...added])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }, [addFiles])

  const updateCategory = (idx: number, cat: string) => {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, category: cat } : f))
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpload = async () => {
    if (!files.length || !user) return
    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      const { file, category } = files[i]
      const path = `${user.id}/writing/${category.toLowerCase()}/${Date.now()}_${file.name}`
      const { error: storageError } = await supabase.storage.from('writing-samples').upload(path, file)

      if (!storageError) {
        await supabase.from('documents').insert({
          user_id: user.id,
          filename: file.name,
          category,
          doc_type: 'writing',
          file_path: path,
          word_count: null,
          metadata: { size: file.size, type: file.type },
        })
      }

      setProgress(Math.round(((i + 1) / files.length) * 100))
    }

    onDone()
  }

  return (
    <motion.div className="ob-card ob-card--wide" {...fadeSlide}>
      <button className="ob-back" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        back
      </button>

      <h2 className="ob-step-title">upload your writing.</h2>
      <p className="ob-step-desc">
        drop in anything you've written — essays, emails, blog posts, reports.
        assign a category to each so cadence knows the context.
      </p>

      <div
        className={`ob-dropzone ${dragging ? 'ob-dropzone--active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.md,.rtf"
          style={{ display: 'none' }}
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p className="ob-dropzone-text">drag files here or click to browse</p>
        <p className="ob-dropzone-hint">pdf, doc, docx, txt, md, rtf</p>
      </div>

      {files.length > 0 && (
        <div className="ob-file-list">
          {files.map((f, i) => (
            <div key={i} className="ob-file-row">
              <span className="ob-file-name">{f.file.name}</span>
              <select
                className="ob-file-category"
                value={f.category}
                onChange={e => updateCategory(i, e.target.value)}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.toLowerCase()}</option>
                ))}
              </select>
              <button className="ob-file-remove" onClick={() => removeFile(i)}>×</button>
            </div>
          ))}
        </div>
      )}

      {uploading ? (
        <div className="ob-progress">
          <div className="ob-progress-bar">
            <div className="ob-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="ob-progress-text">uploading... {progress}%</span>
        </div>
      ) : (
        <button
          className="ob-continue"
          disabled={!files.length}
          onClick={handleUpload}
        >
          upload {files.length} file{files.length !== 1 ? 's' : ''} & continue
        </button>
      )}
    </motion.div>
  )
}

function VoiceStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  return (
    <motion.div className="ob-card" {...fadeSlide}>
      <button className="ob-back" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        back
      </button>

      <h2 className="ob-step-title">voice interview.</h2>
      <p className="ob-step-desc">
        a 5-minute adaptive conversation powered by ElevenLabs. we'll learn how you
        think, explain, and express yourself — then build your voice profile from the transcript.
      </p>

      <div className="ob-voice-placeholder">
        <div className="ob-voice-mic">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <div className="ob-voice-ring" />
          <div className="ob-voice-ring ob-voice-ring--2" />
        </div>
        <p className="ob-voice-status">coming soon — elevenlabs integration</p>
        <p className="ob-voice-hint">
          for now, upload your writing samples instead. voice interviews
          will be available in the next update.
        </p>
      </div>

      <div className="ob-voice-actions">
        <button className="ob-continue ob-continue--secondary" onClick={onBack}>
          upload writing instead
        </button>
        <button className="ob-continue ob-continue--ghost" onClick={onDone}>
          skip for now
        </button>
      </div>
    </motion.div>
  )
}

export function Onboarding() {
  const { user, completeOnboarding } = useAuth()
  const [step, setStep] = useState<Step>('welcome')

  const handleChoice = (s: Step) => {
    if (s === 'uploading') {
      completeOnboarding()
      return
    }
    setStep(s)
  }

  const handleDone = () => {
    completeOnboarding()
  }

  return (
    <div className="ob-overlay">
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <WelcomeStep key="welcome" user={user} onChoice={handleChoice} />
        )}
        {step === 'upload' && (
          <UploadStep key="upload" onBack={() => setStep('welcome')} onDone={handleDone} />
        )}
        {step === 'voice' && (
          <VoiceStep key="voice" onBack={() => setStep('welcome')} onDone={handleDone} />
        )}
      </AnimatePresence>
    </div>
  )
}
