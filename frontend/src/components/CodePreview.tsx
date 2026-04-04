import { useInView } from '../hooks/useInView'

const lines = [
  { num: 1,  tokens: [{ type: 'keyword', text: 'from' }, { type: 'plain', text: ' uagents ' }, { type: 'keyword', text: 'import' }, { type: 'fn', text: ' Agent' }] },
  { num: 2,  tokens: [] },
  { num: 3,  tokens: [{ type: 'plain', text: 'agent = ' }, { type: 'fn', text: 'Agent' }, { type: 'plain', text: '(' }] },
  { num: 4,  tokens: [{ type: 'plain', text: '    name=' }, { type: 'string', text: '"Cadence Voice Writer"' }, { type: 'plain', text: ',' }] },
  { num: 5,  tokens: [{ type: 'plain', text: '    seed=' }, { type: 'plain', text: 'os.' }, { type: 'fn', text: 'getenv' }, { type: 'plain', text: '(' }, { type: 'string', text: '"AGENT_SEED_PHRASE"' }, { type: 'plain', text: '),' }] },
  { num: 6,  tokens: [{ type: 'plain', text: '    mailbox=' }, { type: 'keyword', text: 'True' }, { type: 'plain', text: ',' }] },
  { num: 7,  tokens: [{ type: 'plain', text: '    publish_agent_details=' }, { type: 'keyword', text: 'True' }, { type: 'plain', text: ',' }] },
  { num: 8,  tokens: [{ type: 'plain', text: ')' }] },
  { num: 9,  tokens: [] },
  { num: 10, tokens: [{ type: 'comment', text: '# chat protocol — receives messages from ASI:One' }] },
  { num: 11, tokens: [{ type: 'plain', text: 'agent.' }, { type: 'fn', text: 'include' }, { type: 'plain', text: '(chat_proto, publish_manifest=' }, { type: 'keyword', text: 'True' }, { type: 'plain', text: ')' }] },
  { num: 12, tokens: [] },
  { num: 13, tokens: [{ type: 'comment', text: '# payment protocol — on-chain FET verification' }] },
  { num: 14, tokens: [{ type: 'plain', text: 'agent.' }, { type: 'fn', text: 'include' }, { type: 'plain', text: '(payment_proto, publish_manifest=' }, { type: 'keyword', text: 'True' }, { type: 'plain', text: ')' }] },
  { num: 15, tokens: [] },
  { num: 16, tokens: [{ type: 'comment', text: '# detects .cadence profiles → skips analysis' }] },
  { num: 17, tokens: [{ type: 'comment', text: '# raw samples → full voice fingerprint pipeline' }] },
  { num: 18, tokens: [{ type: 'comment', text: '# 0.01 FET per draft, verified on-chain via cosmpy' }] },
]

export function CodePreview() {
  const { ref, isInView } = useInView()

  return (
    <section className="section code-section" ref={ref as React.RefObject<HTMLElement>}>
      <div className="section-inner">
        <div className="code-layout">
          <div className={`code-text reveal ${isInView ? 'in-view' : ''}`}>
            <p className="section-eyebrow">the agent</p>
            <h2 className="section-title">
              A uAgent on<br />
              <span className="accent">Agentverse.</span>
            </h2>
            <p className="section-desc">
              The Cadence voice engine runs as a Fetch.ai uAgent — registered
              on Agentverse, discoverable through ASI:One. Chat Protocol for
              messages, Payment Protocol for on-chain FET monetization.
            </p>
            <div className="code-badges">
              <span className="code-badge">python</span>
              <span className="code-badge">fetch.ai</span>
              <span className="code-badge">agentverse</span>
            </div>
          </div>

          <div className={`code-block reveal ${isInView ? 'in-view' : ''} reveal-delay-2`}>
            <div className="code-block-header">
              <div className="code-block-dots">
                <span className="terminal-dot terminal-dot--red" />
                <span className="terminal-dot terminal-dot--yellow" />
                <span className="terminal-dot terminal-dot--green" />
              </div>
              <span className="code-block-filename">agent.py</span>
              <span className="code-block-lang">Python</span>
            </div>
            <div className="code-block-body">
              {lines.map((line, i) => (
                <div
                  key={line.num}
                  className="code-line"
                  style={isInView ? { animationDelay: `${0.3 + i * 0.06}s` } : undefined}
                >
                  <span className="code-line-num">{line.num}</span>
                  <span className="code-line-content">
                    {line.tokens.length === 0 ? '\u00A0' : line.tokens.map((t, j) => (
                      <span key={j} className={`code-token code-token--${t.type}`}>{t.text}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
