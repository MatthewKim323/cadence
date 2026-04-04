import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup'

export function AuthModal() {
  const { showAuthModal, closeAuthModal } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  const reset = () => {
    setEmail('')
    setPassword('')
    setError('')
    setCheckEmail(false)
  }

  const handleClose = () => {
    reset()
    closeAuthModal()
  }

  const handleGoogle = async () => {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) setError(error.message)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setCheckEmail(true)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        navigate('/dashboard')
      }
    }
    setLoading(false)
  }

  return (
    <AnimatePresence>
      {showAuthModal && (
        <motion.div
          className="auth-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleClose}
        >
          <motion.div
            className="auth-modal"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
          >
            <button className="auth-close" onClick={handleClose}>×</button>

            <p className="auth-brand">cadence.</p>
            <h2 className="auth-title">
              {checkEmail ? 'check your email.' : mode === 'signup' ? 'create your account.' : 'welcome back.'}
            </h2>

            {checkEmail ? (
              <p className="auth-subtitle">
                we sent a confirmation link to <strong>{email}</strong>.
                click it and you're in.
              </p>
            ) : (
              <>
                <button className="auth-google" onClick={handleGoogle}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  continue with google
                </button>

                <div className="auth-divider">
                  <span>or</span>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                  <input
                    type="email"
                    placeholder="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="auth-input"
                    required
                  />
                  <input
                    type="password"
                    placeholder="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="auth-input"
                    required
                    minLength={6}
                  />
                  {error && <p className="auth-error">{error}</p>}
                  <button type="submit" className="auth-submit" disabled={loading}>
                    {loading ? '...' : mode === 'signup' ? 'sign up' : 'log in'}
                  </button>
                </form>

                <p className="auth-toggle">
                  {mode === 'signup' ? (
                    <>already have an account? <button onClick={() => { setMode('signin'); setError('') }}>log in</button></>
                  ) : (
                    <>don't have an account? <button onClick={() => { setMode('signup'); setError('') }}>sign up</button></>
                  )}
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
