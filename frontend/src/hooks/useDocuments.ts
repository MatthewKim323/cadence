import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export interface Document {
  id: string
  user_id: string
  filename: string
  category: string
  doc_type: 'writing' | 'communication'
  platform: string | null
  file_path: string
  extracted_text: string | null
  word_count: number | null
  uploaded_at: string
  metadata: Record<string, unknown>
}

export interface GroupedDocuments {
  writing: Record<string, Document[]>
  communication: Record<string, Document[]>
}

export function useDocuments() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDocuments = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('[cadence] fetchDocuments failed:', error.message)
    }
    if (data) {
      console.log('[cadence] fetchDocuments:', data.length, 'documents')
      setDocuments(data as Document[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const grouped: GroupedDocuments = {
    writing: {},
    communication: {},
  }
  for (const doc of documents) {
    const bucket = doc.doc_type === 'communication' ? grouped.communication : grouped.writing
    const cat = doc.category || 'uncategorized'
    if (!bucket[cat]) bucket[cat] = []
    bucket[cat].push(doc)
  }

  const uploadDocument = useCallback(async (
    file: File,
    category: string,
    docType: 'writing' | 'communication' = 'writing'
  ) => {
    if (!user) {
      console.error('[cadence] uploadDocument: no user')
      return null
    }
    const path = `${user.id}/${docType}/${category.toLowerCase()}/${Date.now()}_${file.name}`
    const { error: storageError } = await supabase.storage
      .from('writing-samples')
      .upload(path, file)

    if (storageError) {
      console.error('[cadence] Storage upload failed:', storageError.message)
      return null
    }

    const { data, error } = await supabase.from('documents').insert({
      user_id: user.id,
      filename: file.name,
      category,
      doc_type: docType,
      file_path: path,
      word_count: null,
      metadata: { size: file.size, type: file.type },
    }).select().single()

    if (error) {
      console.error('[cadence] DB insert failed:', error.message)
      return null
    }

    if (data) {
      setDocuments(prev => [data as Document, ...prev])
      return data as Document
    }
    return null
  }, [user])

  const deleteDocument = useCallback(async (doc: Document) => {
    await supabase.storage.from('writing-samples').remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
  }, [])

  return { documents, grouped, loading, fetchDocuments, uploadDocument, deleteDocument }
}
