import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Document, GroupedDocuments } from '../../hooks/useDocuments'

interface Props {
  open: boolean
  grouped: GroupedDocuments
  selected: string[]
  onConfirm: (ids: string[]) => void
  onClose: () => void
}

export function DocumentSelector({ open, grouped, selected: initialSelected, onConfirm, onClose }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set(initialSelected))

  const allDocs = useMemo(() => {
    const docs: Document[] = []
    for (const cat of Object.values(grouped.writing)) docs.push(...cat)
    for (const cat of Object.values(grouped.communication)) docs.push(...cat)
    return docs
  }, [grouped])

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllWriting = () => {
    const ids = new Set(checked)
    for (const cat of Object.values(grouped.writing)) {
      for (const doc of cat) ids.add(doc.id)
    }
    setChecked(ids)
  }

  const clearAll = () => setChecked(new Set())

  const renderGroup = (label: string, docs: Record<string, Document[]>) => {
    const categories = Object.entries(docs)
    if (categories.length === 0) return null
    return (
      <div className="db-docselector-group">
        <div className="db-docselector-group-label">{label}</div>
        {categories.map(([cat, catDocs]) => (
          <div key={cat} className="db-docselector-category">
            <div className="db-docselector-cat-label">{cat.toLowerCase()}</div>
            {catDocs.map(doc => (
              <label key={doc.id} className="db-docselector-item">
                <input
                  type="checkbox"
                  checked={checked.has(doc.id)}
                  onChange={() => toggle(doc.id)}
                />
                <span>{doc.filename}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="db-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="db-modal db-modal--selector"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
          >
            <div className="db-modal-header">
              <h3>select source documents</h3>
              <button className="db-modal-close" onClick={onClose}>×</button>
            </div>

            <div className="db-docselector-body">
              {allDocs.length === 0 ? (
                <p className="db-docselector-empty">
                  no documents yet. upload some writing to your library first.
                </p>
              ) : (
                <>
                  {renderGroup('writing samples', grouped.writing)}
                  {renderGroup('communications', grouped.communication)}
                </>
              )}
            </div>

            <div className="db-docselector-footer">
              <span className="db-docselector-count">selected: {checked.size} document{checked.size !== 1 ? 's' : ''}</span>
              <div className="db-docselector-actions">
                <button className="db-btn-ghost" onClick={clearAll}>clear all</button>
                <button className="db-btn-ghost" onClick={selectAllWriting}>select all writing</button>
                <button
                  className="db-btn-primary"
                  onClick={() => onConfirm(Array.from(checked))}
                >
                  confirm
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
