import { useState } from 'react'

interface SentenceResult {
  text: string
  gptzero: number
  zerogpt: number
  originality: number
  consensus: 'human' | 'ai' | 'mixed'
  rewrittenText?: string
  rewrittenScores?: { gptzero: number; zerogpt: number; originality: number }
}

interface IterationRound {
  round: number
  avgScore: number
  sentences: SentenceResult[]
}

const MOCK_ROUNDS: IterationRound[] = [
  {
    round: 1, avgScore: 49.0,
    sentences: [
      { text: 'The thing about remote work and creativity is that nobody actually agrees on what either of those words means.', gptzero: 12, zerogpt: 8, originality: 15, consensus: 'human' },
      { text: 'Ask ten managers and you\'ll get eleven frameworks — and at least three will contradict themselves by slide 7.', gptzero: 9, zerogpt: 14, originality: 11, consensus: 'human' },
      { text: 'It is important to note that distributed teams consistently produce more output across all measurable dimensions.', gptzero: 89, zerogpt: 91, originality: 82, consensus: 'ai', rewrittenText: 'Distributed teams produce more code, more documents, and more Slack messages.', rewrittenScores: { gptzero: 11, zerogpt: 14, originality: 9 } },
      { text: 'Whether that counts as "more creative" depends entirely on how you define the word.', gptzero: 15, zerogpt: 19, originality: 21, consensus: 'human' },
      { text: 'Furthermore, the data suggests that asynchronous communication fundamentally alters the nature of ideation.', gptzero: 92, zerogpt: 88, originality: 85, consensus: 'ai', rewrittenText: 'What they do show — and this part is interesting — is that asynchronous communication changes the texture of ideas.', rewrittenScores: { gptzero: 8, zerogpt: 12, originality: 7 } },
      { text: 'When you have to write your thoughts down instead of tossing them across a conference table, something happens.', gptzero: 14, zerogpt: 11, originality: 19, consensus: 'human' },
      { text: 'The implementation of written communication as a primary modality has proven to be instrumental in driving deeper analytical thinking.', gptzero: 76, zerogpt: 68, originality: 71, consensus: 'ai', rewrittenText: 'The half-formed tangent that would\'ve gotten a polite nod in a meeting room becomes a three-paragraph memo.', rewrittenScores: { gptzero: 6, zerogpt: 9, originality: 8 } },
      { text: 'The real question isn\'t whether remote work helps or hurts creativity.', gptzero: 14, zerogpt: 11, originality: 19, consensus: 'human' },
    ],
  },
  {
    round: 2, avgScore: 32.5,
    sentences: [
      { text: 'The thing about remote work and creativity is that nobody actually agrees on what either of those words means.', gptzero: 12, zerogpt: 8, originality: 15, consensus: 'human' },
      { text: 'Ask ten managers and you\'ll get eleven frameworks — and at least three will contradict themselves by slide 7.', gptzero: 9, zerogpt: 14, originality: 11, consensus: 'human' },
      { text: 'Distributed teams produce more code, more documents, and more Slack messages.', gptzero: 11, zerogpt: 14, originality: 9, consensus: 'human' },
      { text: 'Whether that counts as "more creative" depends entirely on how you define the word.', gptzero: 15, zerogpt: 19, originality: 21, consensus: 'human' },
      { text: 'What they do show — and this part is interesting — is that asynchronous communication changes the texture of ideas.', gptzero: 8, zerogpt: 12, originality: 7, consensus: 'human' },
      { text: 'When you have to write your thoughts down instead of tossing them across a conference table, something happens.', gptzero: 14, zerogpt: 11, originality: 19, consensus: 'human' },
      { text: 'The half-formed tangent that would\'ve gotten a polite nod in a meeting room becomes a three-paragraph memo.', gptzero: 6, zerogpt: 9, originality: 8, consensus: 'human' },
      { text: 'It\'s whether you\'re measuring the right things.', gptzero: 23, zerogpt: 45, originality: 18, consensus: 'mixed' },
    ],
  },
  {
    round: 3, avgScore: 15.4,
    sentences: [
      { text: 'The thing about remote work and creativity is that nobody actually agrees on what either of those words means.', gptzero: 10, zerogpt: 7, originality: 12, consensus: 'human' },
      { text: 'Ask ten managers and you\'ll get eleven frameworks — and at least three will contradict themselves by slide 7.', gptzero: 8, zerogpt: 11, originality: 9, consensus: 'human' },
      { text: 'Distributed teams produce more code, more documents, and more Slack messages.', gptzero: 9, zerogpt: 12, originality: 8, consensus: 'human' },
      { text: 'Whether that counts as "more creative" depends entirely on how you define the word.', gptzero: 13, zerogpt: 16, originality: 18, consensus: 'human' },
      { text: 'What they do show — and this part is interesting — is that asynchronous communication changes the texture of ideas.', gptzero: 7, zerogpt: 10, originality: 6, consensus: 'human' },
      { text: 'When you have to write your thoughts down instead of tossing them across a conference table, something happens.', gptzero: 12, zerogpt: 9, originality: 15, consensus: 'human' },
      { text: 'The half-formed tangent that would\'ve gotten a polite nod in a meeting room becomes a three-paragraph memo.', gptzero: 5, zerogpt: 8, originality: 7, consensus: 'human' },
      { text: 'It\'s whether you\'re measuring the right things.', gptzero: 18, zerogpt: 22, originality: 14, consensus: 'human' },
    ],
  },
  {
    round: 4, avgScore: 6.8,
    sentences: [
      { text: 'The thing about remote work and creativity is that nobody actually agrees on what either of those words means.', gptzero: 8, zerogpt: 6, originality: 10, consensus: 'human' },
      { text: 'Ask ten managers and you\'ll get eleven frameworks — and at least three will contradict themselves by slide 7.', gptzero: 6, zerogpt: 9, originality: 7, consensus: 'human' },
      { text: 'Distributed teams produce more code, more documents, and more Slack messages.', gptzero: 7, zerogpt: 10, originality: 6, consensus: 'human' },
      { text: 'Whether that counts as "more creative" depends entirely on how you define the word.', gptzero: 5, zerogpt: 8, originality: 6, consensus: 'human' },
      { text: 'What they do show — and this part is interesting — is that asynchronous communication changes the texture of ideas.', gptzero: 4, zerogpt: 7, originality: 5, consensus: 'human' },
      { text: 'When you have to write your thoughts down instead of tossing them across a conference table, something happens.', gptzero: 6, zerogpt: 8, originality: 7, consensus: 'human' },
      { text: 'The half-formed tangent that would\'ve gotten a polite nod in a meeting room becomes a three-paragraph memo.', gptzero: 4, zerogpt: 6, originality: 5, consensus: 'human' },
      { text: 'It\'s whether you\'re measuring the right things.', gptzero: 6, zerogpt: 9, originality: 5, consensus: 'human' },
    ],
  },
]

interface Props {
  onBack: () => void
}

export function DetectionDeepDive({ onBack }: Props) {
  const [selectedRound, setSelectedRound] = useState(0)
  const [expandedSentence, setExpandedSentence] = useState<number | null>(null)

  const round = MOCK_ROUNDS[selectedRound]

  const scoreClass = (score: number) =>
    score <= 10 ? 'pass' : score <= 30 ? 'warn' : 'fail'

  const consensusIcon = (c: string) =>
    c === 'human' ? '✅' : c === 'ai' ? '❌' : '⚠️'

  return (
    <div className="db-deep-dive">
      <div className="db-dd-header">
        <button className="db-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          back
        </button>
        <span className="db-dd-title">detection deep dive</span>
      </div>

      <div className="db-dd-rounds">
        {MOCK_ROUNDS.map((r, i) => (
          <button
            key={r.round}
            className={`db-dd-round-btn ${i === selectedRound ? 'active' : ''}`}
            onClick={() => { setSelectedRound(i); setExpandedSentence(null) }}
          >
            round {r.round}: {r.avgScore.toFixed(1)}%
          </button>
        ))}
      </div>

      <div className="db-dd-table-wrap">
        <table className="db-dd-table">
          <thead>
            <tr>
              <th className="db-dd-th-sent">sentence</th>
              <th>GPTZero</th>
              <th>ZeroGPT</th>
              <th>Originality</th>
              <th>consensus</th>
            </tr>
          </thead>
          <tbody>
            {round.sentences.map((sent, i) => (
              <>
                <tr
                  key={i}
                  className={`db-dd-row ${sent.consensus === 'ai' ? 'flagged' : ''} ${expandedSentence === i ? 'expanded' : ''}`}
                  onClick={() => setExpandedSentence(expandedSentence === i ? null : i)}
                >
                  <td className="db-dd-sent-cell">
                    <span className="db-dd-sent-num">{i + 1}</span>
                    <span className="db-dd-sent-text">{sent.text.slice(0, 60)}{sent.text.length > 60 ? '...' : ''}</span>
                  </td>
                  <td className={scoreClass(sent.gptzero)}>{sent.gptzero}%</td>
                  <td className={scoreClass(sent.zerogpt)}>{sent.zerogpt}%</td>
                  <td className={scoreClass(sent.originality)}>{sent.originality}%</td>
                  <td>{consensusIcon(sent.consensus)} {sent.consensus}</td>
                </tr>
                {expandedSentence === i && (
                  <tr key={`${i}-detail`} className="db-dd-detail-row">
                    <td colSpan={5}>
                      <div className="db-dd-detail">
                        <div className="db-dd-detail-section">
                          <span className="db-dd-detail-label">full sentence:</span>
                          <p className="db-dd-detail-text">{sent.text}</p>
                        </div>
                        {sent.rewrittenText && (
                          <div className="db-dd-detail-section">
                            <span className="db-dd-detail-label">rewritten version:</span>
                            <p className="db-dd-detail-text db-dd-rewritten">{sent.rewrittenText}</p>
                            {sent.rewrittenScores && (
                              <div className="db-dd-rewritten-scores">
                                <span className={scoreClass(sent.rewrittenScores.gptzero)}>GPTZero: {sent.rewrittenScores.gptzero}%</span>
                                <span className={scoreClass(sent.rewrittenScores.zerogpt)}>ZeroGPT: {sent.rewrittenScores.zerogpt}%</span>
                                <span className={scoreClass(sent.rewrittenScores.originality)}>Originality: {sent.rewrittenScores.originality}%</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="db-dd-chart">
        <div className="db-dd-chart-label">score trend</div>
        <div className="db-dd-chart-area">
          <div className="db-dd-chart-y">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>
          <div className="db-dd-chart-bars">
            {MOCK_ROUNDS.map(r => (
              <div key={r.round} className="db-dd-chart-col">
                <div className="db-dd-chart-bar-wrap">
                  <div
                    className={`db-dd-chart-bar ${r.avgScore <= 10 ? 'pass' : r.avgScore <= 30 ? 'warn' : 'fail'}`}
                    style={{ height: `${r.avgScore}%` }}
                  />
                </div>
                <span className="db-dd-chart-x">R{r.round}</span>
                <span className="db-dd-chart-val">{r.avgScore.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <div className="db-dd-threshold" style={{ bottom: '10%' }}>
            <span>threshold: 10%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
