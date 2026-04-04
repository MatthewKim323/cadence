import { useEffect, useState } from 'react'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <a href="#" className="navbar-brand">cadence.</a>
      <div className="navbar-links">
        <a href="#studios">studios</a>
        <a href="#pipeline">pipeline</a>
        <a href="#fetchai">fetch.ai</a>
      </div>
      <button className="navbar-cta">get early access</button>
    </nav>
  )
}
