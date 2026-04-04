import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const WORDS = [
  { text: 'Your',     exitX: -18, exitY: -55, exitR: -7 },
  { text: 'writing,', exitX:   4, exitY: -72, exitR:  3 },
  { text: 'your',     exitX: -10, exitY: -60, exitR: -4 },
  { text: 'voice.',   exitX:  22, exitY: -50, exitR:  8 },
]

type Phase = 'entering' | 'scattering' | 'dissolving' | 'done'

function Word({
  word,
  enterDelay,
  onEnterDone,
  exiting,
}: {
  word: (typeof WORDS)[0]
  enterDelay: number
  onEnterDone: () => void
  exiting: boolean
}) {
  return (
    <motion.span
      style={{ display: 'inline-block', willChange: 'transform, opacity, filter' }}
      initial={{ opacity: 0, y: -28, filter: 'blur(14px)' }}
      animate={
        exiting
          ? {
              opacity: 0,
              y: word.exitY,
              x: word.exitX,
              rotate: word.exitR,
              filter: 'blur(18px)',
              scale: 0.88,
            }
          : { opacity: 1, y: 0, x: 0, rotate: 0, filter: 'blur(0px)', scale: 1 }
      }
      transition={
        exiting
          ? { duration: 0.55, ease: [0.4, 0, 1, 1] }
          : { duration: 0.7, delay: enterDelay, ease: [0.22, 1, 0.36, 1] }
      }
      onAnimationComplete={exiting ? undefined : onEnterDone}
    >
      {word.text}
    </motion.span>
  )
}

export function Loader({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>('entering')
  const [overlayFading, setOverlayFading] = useState(false)

  const wordsDone = useRef(0)
  const seqStarted = useRef(false)

  const exiting = phase !== 'entering'
  const showText = phase === 'entering' || phase === 'scattering'

  const handleWordEnterDone = () => {
    if (seqStarted.current) return
    wordsDone.current += 1
    if (wordsDone.current < WORDS.length) return
    seqStarted.current = true

    setTimeout(() => {
      setPhase('scattering')

      setTimeout(() => {
        setPhase('dissolving')
        setOverlayFading(true)

        setTimeout(() => {
          setPhase('done')
          onComplete?.()
        }, 1800)
      }, 500)
    }, 600)
  }

  useEffect(() => {
    const id = setTimeout(() => {
      if (!seqStarted.current) {
        seqStarted.current = true
        setPhase('done')
        onComplete?.()
      }
    }, 9000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase === 'done') return null

  return (
    <motion.div
      animate={{ opacity: overlayFading ? 0 : 1 }}
      transition={{ duration: 1.8, ease: [0.76, 0, 0.24, 1] }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#050403',
        willChange: 'opacity',
      }}
    >
      {showText && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: exiting ? 0 : 0.3 }}
            transition={{ duration: 1.0, delay: exiting ? 0 : 0.4 }}
            style={{
              fontFamily: '"Cinzel", serif',
              fontSize: '0.68rem',
              letterSpacing: '0.42em',
              color: 'rgba(240,235,227,0.9)',
              textTransform: 'uppercase',
              margin: '0 0 3rem',
              padding: 0,
            }}
          >
            cadence
          </motion.p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '0 0.32em',
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontWeight: 300,
              fontSize: 'clamp(2.8rem, 6.5vw, 6.8rem)',
              lineHeight: 1.05,
              color: 'rgba(240,235,227,0.96)',
              letterSpacing: '-0.01em',
            }}
          >
            {WORDS.map((word, i) => (
              <Word
                key={word.text}
                word={word}
                enterDelay={0.35 + i * 0.2}
                exiting={exiting}
                onEnterDone={handleWordEnterDone}
              />
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: exiting ? 0 : 0.36, y: exiting ? 14 : 0 }}
            transition={{ duration: 0.7, delay: exiting ? 0 : 2.1 }}
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 'clamp(0.82rem, 1.3vw, 1rem)',
              color: 'rgba(168,155,140,0.9)',
              letterSpacing: '0.06em',
              margin: '1.5rem 0 0',
              padding: 0,
            }}
          >
            AI that writes exactly like you
          </motion.p>
        </div>
      )}
    </motion.div>
  )
}
