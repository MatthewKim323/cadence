import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export interface PipelineSession {
  id: string
  user_id: string
  studio: 'writing' | 'communication'
  status: string
  current_iteration: number
  prompt: string | null
  source_document_ids: string[] | null
  fingerprint_json: Record<string, unknown> | null
  iterations: unknown[]
  final_draft: string | null
  voice_match_score: number | null
  total_duration_seconds: number | null
  created_at: string
  completed_at: string | null
}

export function useSessions() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<PipelineSession[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSessions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('pipeline_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) setSessions(data as PipelineSession[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const createSession = useCallback(async (
    studio: 'writing' | 'communication',
    prompt: string,
    documentIds: string[]
  ) => {
    if (!user) return null
    const { data, error } = await supabase.from('pipeline_sessions').insert({
      user_id: user.id,
      studio,
      status: 'profiling',
      prompt,
      source_document_ids: documentIds,
      iterations: [],
    }).select().single()

    if (!error && data) {
      const session = data as PipelineSession
      setSessions(prev => [session, ...prev])
      return session
    }
    return null
  }, [user])

  return { sessions, loading, fetchSessions, createSession }
}
