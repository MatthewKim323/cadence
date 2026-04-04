import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  onboardingComplete: boolean | null
  showAuthModal: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  completeOnboarding: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const fetchOnboardingStatus = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', userId)
      .single()

    if (data) {
      setOnboardingComplete(data.onboarding_complete)
    } else {
      await supabase.from('profiles').insert({ id: userId, onboarding_complete: false })
      setOnboardingComplete(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchOnboardingStatus(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchOnboardingStatus(session.user.id)
        setShowAuthModal(false)
      } else {
        setOnboardingComplete(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchOnboardingStatus])

  const openAuthModal = useCallback(() => setShowAuthModal(true), [])
  const closeAuthModal = useCallback(() => setShowAuthModal(false), [])

  const completeOnboarding = useCallback(async () => {
    if (!session?.user) return
    await supabase
      .from('profiles')
      .update({ onboarding_complete: true })
      .eq('id', session.user.id)
    setOnboardingComplete(true)
  }, [session])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setOnboardingComplete(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        onboardingComplete,
        showAuthModal,
        openAuthModal,
        closeAuthModal,
        completeOnboarding,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
