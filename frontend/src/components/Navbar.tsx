import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProfileDropdown() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
          <button className="profile-dropdown-item profile-dropdown-item--danger" onClick={signOut}>
            sign out
          </button>
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { user, loading, openAuthModal } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="navbar-brand">cadence.</Link>
      <div className="navbar-links">
        <a href="#studios">studios</a>
        <a href="#pipeline">pipeline</a>
        <a href="#fetchai">fetch.ai</a>
      </div>
      <div className="navbar-right">
        <a
          href="https://github.com/MatthewKim323/cadence"
          target="_blank"
          rel="noopener noreferrer"
          className="navbar-github"
          aria-label="GitHub"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </a>
        {!loading && (
          user ? (
            <>
              <Link to="/dashboard" className="navbar-login">dashboard</Link>
              <ProfileDropdown />
            </>
          ) : (
            <button className="navbar-login" onClick={openAuthModal}>
              log in
            </button>
          )
        )}
      </div>
    </nav>
  )
}
