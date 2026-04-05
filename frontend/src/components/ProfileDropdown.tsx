import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  onVoiceInterview?: () => void
}

export function ProfileDropdown({ onVoiceInterview }: Props) {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initial = user?.email?.[0] ?? user?.user_metadata?.full_name?.[0] ?? '?'

  return (
    <div className="profile-wrapper" ref={ref}>
      <button className="profile-btn" onClick={() => setOpen(!open)}>
        {initial}
      </button>
      {open && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-email">{user?.email}</div>
          <button
            className="profile-dropdown-item"
            onClick={() => { setOpen(false); navigate('/profile') }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            view voice profile
          </button>
          <button
            className="profile-dropdown-item"
            onClick={() => { setOpen(false); onVoiceInterview?.() }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            </svg>
            voice interview
          </button>
          <button className="profile-dropdown-item profile-dropdown-item--danger" onClick={signOut}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            sign out
          </button>
        </div>
      )}
    </div>
  )
}
