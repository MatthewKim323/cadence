import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Document } from '../../hooks/useDocuments'

const CATEGORIES = ['Academic', 'Creative', 'Professional', 'Personal', 'Communication'] as const

interface QueuedFile {
  file: File
  category: string
  docType: 'writing' | 'communication'
}

interface Props {
  open: boolean
  onClose: () => void
  uploadDocument: (file: File, category: string, docType: 'writing' | 'communication') => Promise<Document | null>
}

export function UploadModal({ open, onClose, uploadDocument }: Props) {
  const [files, setFiles] = useState<QueuedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const added = Array.from(newFiles).map(f => ({
      file: f,
      category: 'Academic',
      docType: 'writing' as const,
    }))
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

  const updateDocType = (idx: number, docType: 'writing' | 'communication') => {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, docType } : f))
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpload = async () => {
    if (!files.length) return
    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      const { file, category, docType } = files[i]
      await uploadDocument(file, category, docType)
      setProgress(Math.round(((i + 1) / files.length) * 100))
    }

    setUploading(false)
    setProgress(0)
    setFiles([])
    onClose()
  }

  const handleClose = () => {
    if (uploading) return
    setFiles([])
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="db-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="db-modal"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
          >
            <div className="db-modal-header">
              <h3>upload documents</h3>
              <button className="db-modal-close" onClick={handleClose}>×</button>
            </div>

            <div
              className={`db-dropzone ${dragging ? 'db-dropzone--active' : ''}`}
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
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.35">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p className="db-dropzone-text">drag files here or click to browse</p>
              <p className="db-dropzone-hint">pdf, doc, docx, txt, md, rtf</p>
            </div>

            {files.length > 0 && (
              <div className="db-upload-list">
                {files.map((f, i) => (
                  <div key={i} className="db-upload-row">
                    <span className="db-upload-name">{f.file.name}</span>
                    <select
                      className="db-upload-select"
                      value={f.docType}
                      onChange={e => updateDocType(i, e.target.value as 'writing' | 'communication')}
                    >
                      <option value="writing">writing</option>
                      <option value="communication">communication</option>
                    </select>
                    <select
                      className="db-upload-select"
                      value={f.category}
                      onChange={e => updateCategory(i, e.target.value)}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c.toLowerCase()}</option>
                      ))}
                    </select>
                    <button className="db-upload-remove" onClick={() => removeFile(i)}>×</button>
                  </div>
                ))}
              </div>
            )}

            {uploading ? (
              <div className="db-upload-progress">
                <div className="db-upload-progress-bar">
                  <div className="db-upload-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="db-upload-progress-text">uploading... {progress}%</span>
              </div>
            ) : (
              <button
                className="db-modal-submit"
                disabled={!files.length}
                onClick={handleUpload}
              >
                upload {files.length} file{files.length !== 1 ? 's' : ''}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
