import { useState, useEffect, useRef } from 'react'
import { PipelineStatusBar } from './PipelineStatusBar'

const PIPELINE_STEPS = ['voice profile', 'writing', 'detection', 'revision', 'complete']

const MOCK_THINKING = [
  'analyzing voice fingerprint from 3 selected documents...',
  'user favors short declarative sentences. avg length: 14 words.',
  'sentence length variance: high — alternates between 6-word punches and 24-word expansions.',
  'em-dash frequency: heavy. used for asides and mid-sentence pivots.',
  'semicolons: never. full stop preference.',
  'avoids "Furthermore", "Moreover", "It is important to note".',
  'humor register: dry, observational. appears every 3-4 paragraphs.',
  'voice profile assembled. starting draft with 3-layer prompt stack...',
]

const MOCK_DRAFT = `The thing about remote work and creativity is that nobody actually agrees on what either of those words means. Ask ten managers and you'll get eleven frameworks — and at least three will contradict themselves by slide 7.

Here's what the research actually shows. Distributed teams produce more code, more documents, and more Slack messages. Whether that counts as "more creative" depends entirely on how you define the word. Most studies don't.

What they do show — and this part is interesting — is that asynchronous communication changes the texture of ideas. When you have to write your thoughts down instead of tossing them across a conference table, something happens. The half-formed tangent that would've gotten a polite nod in a meeting room becomes a three-paragraph memo. Sometimes that memo is brilliant. Sometimes it's three paragraphs of absolutely nothing.

The real question isn't whether remote work helps or hurts creativity. It's whether you're measuring the right things. If your metric is "number of brainstorming sessions per week," remote teams will always lose. If your metric is "quality of solutions that actually ship," the picture gets more complicated — and more interesting.`

interface IterationData {
  round: number
  scores: { gptzero: number; zerogpt: number; originality: number }
  consensus: number
  flaggedCount: number
}

const MOCK_ITERATIONS: IterationData[] = [
  { round: 1, scores: { gptzero: 48.2, zerogpt: 55.1, originality: 43.8 }, consensus: 49.0, flaggedCount: 5 },
  { round: 2, scores: { gptzero: 31.4, zerogpt: 38.7, originality: 27.3 }, consensus: 32.5, flaggedCount: 3 },
  { round: 3, scores: { gptzero: 14.1, zerogpt: 19.8, originality: 12.4 }, consensus: 15.4, flaggedCount: 1 },
  { round: 4, scores: { gptzero: 5.8, zerogpt: 8.4, originality: 6.1 }, consensus: 6.8, flaggedCount: 0 },
]

type Phase = 'profiling' | 'writing' | 'detecting' | 'revising' | 'complete'

interface Props {
  onBack: () => void
  onDeepDive: () => void
}

export function WritingDashboard({ onBack, onDeepDive }: Props) {
  const [phase, setPhase] = useState<Phase>('profiling')
  const [thinkingLines, setThinkingLines] = useState<string[]>([])
  const [draftText, setDraftText] = useState('')
  const [currentIteration, setCurrentIteration] = useState(0)
  const [detectorScores, setDetectorScores] = useState<{ gptzero: number | null; zerogpt: number | null; originality: number | null }>({ gptzero: null, zerogpt: null, originality: null })
  const [completedIterations, setCompletedIterations] = useState<IterationData[]>([])
  const draftRef = useRef<HTMLDivElement>(null)
  const thinkingRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    let cancelled = false
    const run = async () => {
      // Phase 1: profiling (stream thinking lines)
      for (let i = 0; i < MOCK_THINKING.length; i++) {
        if (cancelled) return
        await wait(400 + Math.random() * 300)
        setThinkingLines(prev => [...prev, MOCK_THINKING[i]])
      }

      await wait(600)
      if (cancelled) return
      setPhase('writing')

      // Phase 2: writing (stream draft character-by-character)
      for (let i = 0; i <= MOCK_DRAFT.length; i++) {
        if (cancelled) return
        setDraftText(MOCK_DRAFT.slice(0, i))
        await wait(8 + Math.random() * 12)
      }

      await wait(400)
      if (cancelled) return

      // Phase 3-4: detection iterations
      for (let iter = 0; iter < MOCK_ITERATIONS.length; iter++) {
        if (cancelled) return
        setPhase('detecting')
        setCurrentIteration(iter + 1)
        setDetectorScores({ gptzero: null, zerogpt: null, originality: null })

        await wait(800)
        if (cancelled) return
        setDetectorScores(prev => ({ ...prev, gptzero: MOCK_ITERATIONS[iter].scores.gptzero }))

        await wait(600)
        if (cancelled) return
        setDetectorScores(prev => ({ ...prev, zerogpt: MOCK_ITERATIONS[iter].scores.zerogpt }))

        await wait(500)
        if (cancelled) return
        setDetectorScores(prev => ({ ...prev, originality: MOCK_ITERATIONS[iter].scores.originality }))

        await wait(400)
        if (cancelled) return
        setCompletedIterations(prev => [...prev, MOCK_ITERATIONS[iter]])

        if (MOCK_ITERATIONS[iter].consensus <= 10) {
          setPhase('complete')
          break
        }

        if (iter < MOCK_ITERATIONS.length - 1) {
          setPhase('revising')
          setThinkingLines(prev => [
            ...prev,
            `--- iteration ${iter + 1} — consensus ${MOCK_ITERATIONS[iter].consensus.toFixed(1)}% — revising ${MOCK_ITERATIONS[iter].flaggedCount} flagged sentences ---`,
          ])
          await wait(1200)
        }
      }

      if (!cancelled) setPhase('complete')
    }

    run()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (draftRef.current) draftRef.current.scrollTop = draftRef.current.scrollHeight
  }, [draftText])

  useEffect(() => {
    if (thinkingRef.current) thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight
  }, [thinkingLines])

  const pipelineIndex =
    phase === 'profiling' ? 0 :
    phase === 'writing' ? 1 :
    phase === 'detecting' ? 2 :
    phase === 'revising' ? 3 : 4

  const copyDraft = () => {
    navigator.clipboard.writeText(MOCK_DRAFT)
  }

  return (
    <div className="db-writing-dashboard">
      <div className="db-wd-header">
        <button className="db-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          back
        </button>
        <span className="db-wd-title">writing studio — live dashboard</span>
        {currentIteration > 0 && (
          <span className="db-wd-iteration">iteration {currentIteration}/{MOCK_ITERATIONS.length}</span>
        )}
      </div>

      <PipelineStatusBar steps={PIPELINE_STEPS} currentIndex={pipelineIndex} />

      <div className="db-wd-panels">
        <div className="db-wd-panel db-wd-thinking" ref={thinkingRef}>
          <div className="db-wd-panel-label">agent thinking</div>
          {thinkingLines.map((line, i) => (
            <p key={i} className={`db-wd-think-line ${line.startsWith('---') ? 'db-wd-think-divider' : ''}`}>
              {line}
            </p>
          ))}
          {(phase === 'profiling' || phase === 'revising') && (
            <span className="db-wd-cursor" />
          )}
        </div>

        <div className="db-wd-panel db-wd-draft" ref={draftRef}>
          <div className="db-wd-panel-label">live draft</div>
          <div className="db-wd-draft-text">
            {draftText}
            {phase === 'writing' && <span className="db-wd-cursor" />}
          </div>
        </div>
      </div>

      <div className="db-wd-browsers">
        <div className="db-wd-panel-label">ai detection — live browsers</div>
        <div className="db-wd-browser-grid">
          {(['gptzero', 'zerogpt', 'originality'] as const).map(name => {
            const score = detectorScores[name]
            const label = name === 'gptzero' ? 'GPTZero' : name === 'zerogpt' ? 'ZeroGPT' : 'Originality.ai'
            return (
              <div key={name} className="db-wd-browser">
                <div className="db-wd-browser-header">
                  <span className="db-wd-browser-dot" />
                  <span>{label}</span>
                </div>
                <div className="db-wd-browser-viewport">
                  {score === null ? (
                    <div className="db-wd-browser-scanning">
                      <div className="db-wd-scan-pulse" />
                      <span>scanning...</span>
                    </div>
                  ) : (
                    <div className="db-wd-browser-result">
                      <span className={`db-wd-score ${score <= 10 ? 'pass' : score <= 30 ? 'warn' : 'fail'}`}>
                        {score.toFixed(1)}%
                      </span>
                      <span className="db-wd-score-label">ai probability</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {completedIterations.length > 0 && (
        <div className="db-wd-history">
          <div className="db-wd-panel-label">iteration history</div>
          <div className="db-wd-history-bars">
            {completedIterations.map((iter, i) => (
              <div key={i} className="db-wd-history-row">
                <span className="db-wd-history-label">round {iter.round}</span>
                <div className="db-wd-history-bar">
                  <div
                    className={`db-wd-history-fill ${iter.consensus <= 10 ? 'pass' : iter.consensus <= 30 ? 'warn' : 'fail'}`}
                    style={{ width: `${Math.min(iter.consensus, 100)}%` }}
                  />
                </div>
                <span className={`db-wd-history-val ${iter.consensus <= 10 ? 'pass' : ''}`}>
                  {iter.consensus.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === 'complete' && (
        <div className="db-wd-complete">
          <div className="db-wd-complete-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>
              complete — {completedIterations[completedIterations.length - 1]?.consensus.toFixed(1)}%
              ({completedIterations.length} iteration{completedIterations.length !== 1 ? 's' : ''})
            </span>
          </div>

          <div className="db-wd-complete-stats">
            <div className="db-wd-stat">
              <span className="db-wd-stat-val">{completedIterations.length * 3}</span>
              <span className="db-wd-stat-label">browser sessions</span>
            </div>
            <div className="db-wd-stat">
              <span className="db-wd-stat-val">{completedIterations.length * 3 * 3}</span>
              <span className="db-wd-stat-label">pages navigated</span>
            </div>
            <div className="db-wd-stat">
              <span className="db-wd-stat-val">{completedIterations.length}</span>
              <span className="db-wd-stat-label">drafts scanned</span>
            </div>
            <div className="db-wd-stat">
              <span className="db-wd-stat-val">{completedIterations.length}/{completedIterations.length}</span>
              <span className="db-wd-stat-label">no captcha blocks</span>
            </div>
          </div>

          <div className="db-wd-complete-actions">
            <button className="db-btn-primary" onClick={copyDraft}>copy draft</button>
            <button className="db-btn-ghost" onClick={onDeepDive}>detection deep dive</button>
          </div>
        </div>
      )}
    </div>
  )
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
