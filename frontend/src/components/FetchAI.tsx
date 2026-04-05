import { useInView } from '../hooks/useInView'

function PipelineVisual() {
  return (
    <svg viewBox="0 0 860 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="fetch-visual-svg">
      {/* ── USER / ASI:ONE ── */}
      <g>
        <rect x="5" y="130" width="100" height="100" rx="8" stroke="#282828" strokeWidth="1" />
        <rect x="5" y="130" width="100" height="100" rx="8" fill="#ededed" opacity="0.02" />
        <text x="55" y="155" textAnchor="middle" fill="#ededed" fontSize="7.5" fontFamily="var(--font-mono)" fontWeight="500">ASI:ONE</text>
        <text x="55" y="168" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">chat protocol</text>

        <rect x="15" y="182" width="80" height="18" rx="4" stroke="#282828" strokeWidth="0.5" fill="#ededed" opacity="0.03" />
        <text x="55" y="194" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">writing.cadence.pdf</text>

        <rect x="15" y="206" width="80" height="14" rx="7" stroke="#484848" strokeWidth="0.5" />
        <text x="55" y="216" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">+ writing prompt</text>
      </g>

      {/* ASI:One → Orchestrator */}
      <path d="M110 180 L165 180" stroke="#484848" strokeWidth="1" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-8" dur="1s" repeatCount="indefinite" />
      </path>
      <text x="137" y="173" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)" opacity="0.6">mailbox</text>

      {/* ── ORCHESTRATOR ── */}
      <g>
        <rect x="170" y="120" width="140" height="120" rx="8" stroke="#ededed" strokeWidth="1" opacity="0.4" />
        <rect x="170" y="120" width="140" height="120" rx="8" fill="#ededed" opacity="0.03">
          <animate attributeName="opacity" values="0.02;0.06;0.02" dur="3s" repeatCount="indefinite" />
        </rect>
        <text x="240" y="146" textAnchor="middle" fill="#ededed" fontSize="8" fontFamily="var(--font-mono)" fontWeight="500">ORCHESTRATOR</text>
        <text x="240" y="160" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">coordinates pipeline</text>

        <rect x="182" y="172" width="52" height="14" rx="7" stroke="#484848" strokeWidth="0.5" />
        <text x="208" y="182" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">state</text>
        <rect x="240" y="172" width="58" height="14" rx="7" stroke="#484848" strokeWidth="0.5" />
        <text x="269" y="182" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">sessions</text>

        <rect x="182" y="194" width="116" height="14" rx="7" stroke="#484848" strokeWidth="0.5" fill="#ededed" opacity="0.03" />
        <text x="240" y="204" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">noise injection engine</text>

        <rect x="182" y="216" width="116" height="14" rx="7" stroke="#484848" strokeWidth="0.5" fill="#ededed" opacity="0.03" />
        <text x="240" y="226" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">max 5 iterations</text>
      </g>

      {/* Orchestrator → Digester */}
      <path d="M315 155 L385 155" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>
      <text x="350" y="148" textAnchor="middle" fill="#484848" fontSize="4" fontFamily="var(--font-mono)" opacity="0.5">step 1</text>

      {/* ── PROFILE DIGESTER ── */}
      <g>
        <rect x="390" y="130" width="110" height="50" rx="6" stroke="#282828" strokeWidth="1" />
        <rect x="390" y="130" width="110" height="50" rx="6" fill="#ededed" opacity="0.02" />
        <text x="445" y="150" textAnchor="middle" fill="#ededed" fontSize="6.5" fontFamily="var(--font-mono)">profile digester</text>
        <text x="445" y="163" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">parses voice fingerprint</text>
        <text x="445" y="173" textAnchor="middle" fill="#484848" fontSize="4" fontFamily="var(--font-mono)" opacity="0.5">claude-powered</text>
      </g>

      {/* Digester → back to Orchestrator (small return arrow) */}
      <path d="M390 170 L315 195" stroke="#484848" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.4">
        <animate attributeName="stroke-dashoffset" values="0;-5" dur="1s" repeatCount="indefinite" />
      </path>

      {/* Orchestrator → Writer */}
      <path d="M315 200 L385 235" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>
      <text x="350" y="225" textAnchor="middle" fill="#484848" fontSize="4" fontFamily="var(--font-mono)" opacity="0.5">step 2</text>

      {/* ── LONG-FORM WRITER ── */}
      <g>
        <rect x="390" y="210" width="110" height="50" rx="6" stroke="#282828" strokeWidth="1" />
        <rect x="390" y="210" width="110" height="50" rx="6" fill="#ededed" opacity="0.02" />
        <text x="445" y="230" textAnchor="middle" fill="#ededed" fontSize="6.5" fontFamily="var(--font-mono)">long-form writer</text>
        <text x="445" y="243" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">essays · papers · reports</text>
        <text x="445" y="253" textAnchor="middle" fill="#484848" fontSize="4" fontFamily="var(--font-mono)" opacity="0.5">claude sonnet</text>
      </g>

      {/* Writer → Detectors */}
      <path d="M505 225 L580 155" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>
      <path d="M505 245 L580 245" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>
      <text x="545" y="200" textAnchor="middle" fill="#484848" fontSize="4" fontFamily="var(--font-mono)" opacity="0.5">step 3 (parallel)</text>

      {/* ── DETECTORS ── */}
      <text x="640" y="115" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)" opacity="0.5">browser use</text>

      {/* ZeroGPT */}
      <g>
        <rect x="585" y="130" width="110" height="40" rx="5" stroke="#282828" strokeWidth="1" />
        <rect x="585" y="130" width="110" height="40" rx="5" fill="#ededed" opacity="0.02" />
        <text x="640" y="148" textAnchor="middle" fill="#ededed" fontSize="6" fontFamily="var(--font-mono)">zerogpt detector</text>
        <text x="640" y="161" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">AI % + flagged lines</text>
        <circle cx="685" cy="148" r="3" fill="#ededed" opacity="0.06">
          <animate attributeName="opacity" values="0.04;0.15;0.04" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Originality */}
      <g>
        <rect x="585" y="225" width="110" height="40" rx="5" stroke="#282828" strokeWidth="1" />
        <rect x="585" y="225" width="110" height="40" rx="5" fill="#ededed" opacity="0.02" />
        <text x="640" y="243" textAnchor="middle" fill="#ededed" fontSize="6" fontFamily="var(--font-mono)">originality detector</text>
        <text x="640" y="256" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">AI % + flagged lines</text>
        <circle cx="685" cy="243" r="3" fill="#ededed" opacity="0.06">
          <animate attributeName="opacity" values="0.04;0.15;0.04" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* "parallel" brace */}
      <text x="578" y="200" textAnchor="end" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)" opacity="0.4">parallel</text>
      <path d="M580 170 L575 198 L580 226" stroke="#484848" strokeWidth="0.5" fill="none" opacity="0.3" />

      {/* Detectors → Consensus */}
      <path d="M700 150 L740 190" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>
      <path d="M700 245 L740 205" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* ── CONSENSUS ── */}
      <g>
        <rect x="745" y="175" width="90" height="50" rx="6" stroke="#ededed" strokeWidth="1" opacity="0.4" />
        <rect x="745" y="175" width="90" height="50" rx="6" fill="#ededed" opacity="0.03">
          <animate attributeName="opacity" values="0.02;0.06;0.02" dur="2.5s" repeatCount="indefinite" />
        </rect>
        <text x="790" y="195" textAnchor="middle" fill="#ededed" fontSize="6" fontFamily="var(--font-mono)">consensus</text>
        <text x="790" y="208" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">avg ≤ 10% → pass</text>
        <text x="790" y="219" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)" opacity="0.6">&gt; 10% → revise</text>
      </g>

      {/* ── REVISION LOOP ── */}
      <path d="M790 230 C 790 300, 445 300, 445 265" stroke="#ededed" strokeWidth="0.7" strokeDasharray="3 4" opacity="0.25" fill="none">
        <animate attributeName="stroke-dashoffset" values="0;-7" dur="1.5s" repeatCount="indefinite" />
      </path>
      <text x="620" y="295" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)" opacity="0.4">revise flagged sentences → re-detect</text>

      {/* Output */}
      <path d="M840 200 L855 200" stroke="#484848" strokeWidth="1" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-8" dur="0.8s" repeatCount="indefinite" />
      </path>
      <text x="855" y="195" textAnchor="start" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">✓</text>

      {/* ── BADGES ── */}
      <g transform="translate(280, 330)">
        <rect width="130" height="22" rx="11" stroke="#282828" strokeWidth="0.5" fill="#0a0a0a" />
        <text x="65" y="14.5" textAnchor="middle" fill="#484848" fontSize="5.5" fontFamily="var(--font-mono)">5 agents on agentverse</text>
        <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite" />
      </g>
      <g transform="translate(420, 330)">
        <rect width="140" height="22" rx="11" stroke="#282828" strokeWidth="0.5" fill="#0a0a0a" />
        <text x="70" y="14.5" textAnchor="middle" fill="#484848" fontSize="5.5" fontFamily="var(--font-mono)">ASI:One chat protocol</text>
        <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite" />
      </g>
    </svg>
  )
}

const features = [
  {
    num: '01',
    title: 'Five Agents. One Pipeline.',
    desc: 'An orchestrator coordinates four specialized agents — a profile digester, a Claude-powered writer, and two Browser Use detectors — all communicating through Fetch.ai uAgent messaging on Agentverse.',
    tags: ['5 agents', 'uAgent protocol', 'agentverse'],
  },
  {
    num: '02',
    title: 'Write → Detect → Revise Loop.',
    desc: 'The writer drafts with Claude Sonnet using your voice fingerprint. Two Browser Use agents scan the draft on ZeroGPT and Originality.ai in parallel, returning AI scores and flagged sentences. If consensus exceeds 10%, the orchestrator sends flagged lines back for surgical revision — up to 5 iterations.',
    tags: ['parallel detection', 'consensus scoring', 'revision loop'],
  },
  {
    num: '03',
    title: 'Voice Profile via PDF.',
    desc: 'Export your writing.cadence.pdf from the Cadence webapp. Attach it to ASI:One — the orchestrator downloads the PDF, extracts your voice fingerprint with PyMuPDF, and passes it to the writer so every draft matches your style.',
    tags: ['writing.cadence.pdf', 'PyMuPDF extraction', 'ResourceContent'],
  },
  {
    num: '04',
    title: 'Progressive Noise Injection.',
    desc: 'Each revision round increases noise intensity — Cyrillic homoglyphs, zero-width spaces, contraction swaps, comma drops. Invisible at a glance, but enough to push AI detection scores below threshold.',
    tags: ['homoglyphs', 'zero-width chars', 'intensity scaling'],
  },
]

export function FetchAI() {
  const { ref, isInView } = useInView()
  const { ref: ref2, isInView: isInView2 } = useInView()

  return (
    <section id="fetchai" className="section fetch-section" ref={ref as React.RefObject<HTMLElement>}>
      <div className="section-inner">
        <div className={`reveal ${isInView ? 'in-view' : ''}`}>
          <p className="section-eyebrow">fetch.ai integration</p>
          <h2 className="section-title">
            Five agents.<br />
            <span className="accent">One pipeline.</span>
          </h2>
          <p className="section-desc">
            The Cadence long-form writing pipeline as a Fetch.ai multi-agent
            network. A Claude-powered writer and two Browser Use detectors,
            orchestrated through uAgent messaging. Accessible on ASI:One
            via chat protocol.
          </p>
        </div>

        {/* Architecture visual */}
        <div className={`fetch-visual reveal ${isInView ? 'in-view' : ''} reveal-delay-2`}>
          <PipelineVisual />
        </div>

        {/* Feature cards */}
        <div className="fetch-features" ref={ref2 as React.RefObject<HTMLDivElement>}>
          {features.map((f, i) => (
            <div
              key={f.num}
              className={`fetch-card reveal ${isInView2 ? 'in-view' : ''}`}
              style={{ transitionDelay: `${0.15 + i * 0.1}s` }}
            >
              <span className="fetch-card-num">{f.num}</span>
              <h3 className="fetch-card-title">{f.title}</h3>
              <p className="fetch-card-desc">{f.desc}</p>
              <div className="fetch-card-tags">
                {f.tags.map(t => (
                  <span key={t} className="fetch-card-tag">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
