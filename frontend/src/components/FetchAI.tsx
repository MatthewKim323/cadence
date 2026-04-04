import { useInView } from '../hooks/useInView'

function MultiAgentVisual() {
  return (
    <svg viewBox="0 0 820 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="fetch-visual-svg">
      {/* ── CADENCE PLATFORM (leftmost) ── */}
      <g>
        <rect x="5" y="110" width="100" height="160" rx="8" stroke="#282828" strokeWidth="1" />
        <rect x="5" y="110" width="100" height="160" rx="8" fill="#ededed" opacity="0.02" />
        <text x="55" y="132" textAnchor="middle" fill="#ededed" fontSize="7" fontFamily="var(--font-mono)" fontWeight="500">CADENCE</text>
        <text x="55" y="143" textAnchor="middle" fill="#484848" fontSize="5.5" fontFamily="var(--font-mono)">platform</text>

        {/* Writing Studio mini-block */}
        <rect x="15" y="155" width="80" height="28" rx="4" stroke="#282828" strokeWidth="0.5" />
        <text x="55" y="167" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">writing studio</text>
        <text x="55" y="177" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)" opacity="0.6">→ writing.cadence</text>

        {/* Comms Studio mini-block */}
        <rect x="15" y="192" width="80" height="28" rx="4" stroke="#282828" strokeWidth="0.5" />
        <text x="55" y="204" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">comms studio</text>
        <text x="55" y="214" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)" opacity="0.6">→ comms.cadence</text>

        {/* Export label */}
        <rect x="18" y="232" width="74" height="14" rx="7" stroke="#484848" strokeWidth="0.5" fill="#ededed" opacity="0.04" />
        <text x="55" y="242" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">export profile</text>
      </g>

      {/* Arrow: Cadence → ASI:One */}
      <path d="M110 190 L145 190" stroke="#484848" strokeWidth="1" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-8" dur="1s" repeatCount="indefinite" />
      </path>
      <text x="127" y="183" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">.cadence</text>

      {/* ── ASI:ONE ── */}
      <g>
        <rect x="150" y="155" width="80" height="70" rx="8" stroke="#282828" strokeWidth="1" />
        <text x="190" y="178" textAnchor="middle" fill="#484848" fontSize="7" fontFamily="var(--font-mono)">ASI:ONE</text>
        <circle cx="190" cy="198" r="8" stroke="#484848" strokeWidth="1" fill="none" />
        <circle cx="190" cy="195" r="3" fill="none" stroke="#484848" strokeWidth="1" />
        <path d="M184 203 L190 206 L196 203" stroke="#484848" strokeWidth="1" fill="none" />
      </g>

      {/* Arrow: ASI:One → split */}
      <path d="M235 190 L265 190" stroke="#484848" strokeWidth="1" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-8" dur="1s" repeatCount="indefinite" />
      </path>

      {/* Split point */}
      <circle cx="270" cy="190" r="3" fill="#484848" />
      <path d="M273 190 L300 105" stroke="#484848" strokeWidth="1" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-8" dur="0.8s" repeatCount="indefinite" />
      </path>
      <path d="M273 190 L300 280" stroke="#484848" strokeWidth="1" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-8" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* ── LONG-FORM ORCHESTRATOR ── */}
      <g>
        <rect x="305" y="60" width="130" height="80" rx="8" stroke="#ededed" strokeWidth="1" opacity="0.4" />
        <rect x="305" y="60" width="130" height="80" rx="8" fill="#ededed" opacity="0.03">
          <animate attributeName="opacity" values="0.02;0.06;0.02" dur="3s" repeatCount="indefinite" />
        </rect>
        <text x="370" y="81" textAnchor="middle" fill="#ededed" fontSize="7" fontFamily="var(--font-mono)" fontWeight="500">LONG-FORM</text>
        <text x="370" y="92" textAnchor="middle" fill="#ededed" fontSize="7" fontFamily="var(--font-mono)" fontWeight="500">ORCHESTRATOR</text>

        <rect x="315" y="105" width="44" height="13" rx="6" stroke="#484848" strokeWidth="0.5" />
        <text x="337" y="114" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">chat</text>
        <rect x="365" y="105" width="55" height="13" rx="6" stroke="#484848" strokeWidth="0.5" />
        <text x="392" y="114" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">payment</text>

        <rect x="315" y="122" width="76" height="11" rx="5" stroke="#484848" strokeWidth="0.5" fill="#ededed" opacity="0.04" />
        <text x="353" y="130" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">writing.cadence</text>
      </g>

      {/* ── SHORT-FORM ORCHESTRATOR ── */}
      <g>
        <rect x="305" y="240" width="130" height="80" rx="8" stroke="#ededed" strokeWidth="1" opacity="0.4" />
        <rect x="305" y="240" width="130" height="80" rx="8" fill="#ededed" opacity="0.03">
          <animate attributeName="opacity" values="0.02;0.06;0.02" dur="3s" repeatCount="indefinite" />
        </rect>
        <text x="370" y="261" textAnchor="middle" fill="#ededed" fontSize="7" fontFamily="var(--font-mono)" fontWeight="500">SHORT-FORM</text>
        <text x="370" y="272" textAnchor="middle" fill="#ededed" fontSize="7" fontFamily="var(--font-mono)" fontWeight="500">ORCHESTRATOR</text>

        <rect x="315" y="285" width="44" height="13" rx="6" stroke="#484848" strokeWidth="0.5" />
        <text x="337" y="294" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">chat</text>
        <rect x="365" y="285" width="55" height="13" rx="6" stroke="#484848" strokeWidth="0.5" />
        <text x="392" y="294" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">payment</text>

        <rect x="315" y="302" width="76" height="11" rx="5" stroke="#484848" strokeWidth="0.5" fill="#ededed" opacity="0.04" />
        <text x="353" y="310" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">comms.cadence</text>
      </g>

      {/* ── SUB-AGENTS ── */}

      {/* Profile Digester — centered between orchestrators */}
      <g>
        <rect x="480" y="150" width="110" height="40" rx="6" stroke="#282828" strokeWidth="1" />
        <rect x="480" y="150" width="110" height="40" rx="6" fill="#ededed" opacity="0.02" />
        <text x="535" y="168" textAnchor="middle" fill="#ededed" fontSize="6.5" fontFamily="var(--font-mono)">profile digester</text>
        <text x="535" y="180" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">parses .cadence files</text>
      </g>
      {/* Long-Form Orch → Digester */}
      <path d="M440 100 L480 160" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>
      {/* Short-Form Orch → Digester */}
      <path d="M440 280 L480 180" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* Voice Analyst — above digester */}
      <g>
        <rect x="480" y="90" width="110" height="40" rx="6" stroke="#282828" strokeWidth="1" />
        <rect x="480" y="90" width="110" height="40" rx="6" fill="#ededed" opacity="0.02" />
        <text x="535" y="108" textAnchor="middle" fill="#ededed" fontSize="6.5" fontFamily="var(--font-mono)">voice analyst</text>
        <text x="535" y="120" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">claude fingerprint</text>
        <circle cx="580" cy="110" r="4" fill="#ededed" opacity="0.06">
          <animate attributeName="opacity" values="0.04;0.12;0.04" dur="2.5s" repeatCount="indefinite" />
        </circle>
      </g>
      {/* Fallback label */}
      <text x="475" y="85" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)" opacity="0.5">fallback (no profile)</text>

      {/* Long-Form Writer */}
      <g>
        <rect x="620" y="55" width="105" height="40" rx="6" stroke="#282828" strokeWidth="1" />
        <rect x="620" y="55" width="105" height="40" rx="6" fill="#ededed" opacity="0.02" />
        <text x="672" y="73" textAnchor="middle" fill="#ededed" fontSize="6.5" fontFamily="var(--font-mono)">long-form writer</text>
        <text x="672" y="85" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">essays · papers</text>
      </g>
      {/* Digester → Long-Form Writer */}
      <path d="M595 160 L620 85" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* Short-Form Writer */}
      <g>
        <rect x="620" y="285" width="105" height="40" rx="6" stroke="#282828" strokeWidth="1" />
        <rect x="620" y="285" width="105" height="40" rx="6" fill="#ededed" opacity="0.02" />
        <text x="672" y="303" textAnchor="middle" fill="#ededed" fontSize="6.5" fontFamily="var(--font-mono)">short-form writer</text>
        <text x="672" y="315" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">emails · messages</text>
      </g>
      {/* Digester → Short-Form Writer */}
      <path d="M595 180 L620 295" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* Quality Scorer — centered */}
      <g>
        <rect x="620" y="160" width="105" height="50" rx="6" stroke="#ededed" strokeWidth="1" opacity="0.5" />
        <rect x="620" y="160" width="105" height="50" rx="6" fill="#ededed" opacity="0.03">
          <animate attributeName="opacity" values="0.02;0.06;0.02" dur="2.5s" repeatCount="indefinite" />
        </rect>
        <text x="672" y="178" textAnchor="middle" fill="#ededed" fontSize="6.5" fontFamily="var(--font-mono)">quality scorer</text>
        <text x="672" y="190" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">voice match ≥ 85%</text>
        <text x="672" y="201" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">revision loop</text>
      </g>

      {/* Writer → Scorer arrows */}
      <path d="M725 85 L740 160" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>
      <path d="M725 290 L740 210" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>
      {/* Revision loop arrow back (from scorer back to writers) */}
      <path d="M730 185 C 775 185, 775 75, 730 75" stroke="#ededed" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.2" fill="none">
        <animate attributeName="stroke-dashoffset" values="0;-5" dur="1.5s" repeatCount="indefinite" />
      </path>
      <text x="785" y="130" fill="#484848" fontSize="5" fontFamily="var(--font-mono)" transform="rotate(90 785 130)">revise</text>

      {/* Output checkmark */}
      <path d="M730 185 L790 185" stroke="#484848" strokeWidth="1" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-8" dur="0.8s" repeatCount="indefinite" />
      </path>
      <g>
        <rect x="793" y="170" width="22" height="30" rx="4" stroke="#282828" strokeWidth="1" />
        <text x="804" y="189" textAnchor="middle" fill="#484848" fontSize="6" fontFamily="var(--font-mono)">✓</text>
      </g>

      {/* ── BADGES ── */}
      <g transform="translate(340, 355)">
        <rect width="140" height="22" rx="11" stroke="#282828" strokeWidth="0.5" fill="#0a0a0a" />
        <text x="70" y="14.5" textAnchor="middle" fill="#484848" fontSize="6" fontFamily="var(--font-mono)">7 agents on agentverse ✓</text>
        <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite" />
      </g>
      <g transform="translate(340, 380)">
        <rect width="140" height="18" rx="9" stroke="#282828" strokeWidth="0.5" fill="#0a0a0a" />
        <text x="70" y="12.5" textAnchor="middle" fill="#484848" fontSize="5.5" fontFamily="var(--font-mono)">on-chain FET verification</text>
      </g>
    </svg>
  )
}

const features = [
  {
    num: '01',
    title: 'Seven Agents, Two Orchestrators.',
    desc: 'Two user-facing orchestrators on ASI:One — one for essays, one for emails. Five specialized sub-agents coordinate behind the scenes: Profile Digester, Voice Analyst, Long-Form Writer, Short-Form Writer, Quality Scorer.',
    tags: ['7 agents', 'agentverse', 'uAgent messaging'],
  },
  {
    num: '02',
    title: 'Two .cadence File Types.',
    desc: 'Export writing.cadence from Writing Studio or comms.cadence from Communication Studio. Paste into ASI:One — the Profile Digester parses the type, routes to the right writer, skips analysis entirely.',
    tags: ['writing.cadence', 'comms.cadence', 'profile export'],
  },
  {
    num: '03',
    title: 'Quality Scoring Loop.',
    desc: 'The Quality Scorer evaluates every draft against your voice fingerprint — sentence length, avoided patterns, signature phrases, AI-slop. Revises until score hits 85%, max 3 iterations.',
    tags: ['voice match ≥85%', 'revision loop', 'anti-slop'],
  },
  {
    num: '04',
    title: 'On-Chain & Composable.',
    desc: 'Payment Protocol with real FET verification via cosmpy. Every sub-agent is independently discoverable on Agentverse — other agents can call the Writer or Scorer directly.',
    tags: ['payment protocol', 'composable', '0.01 FET'],
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
            Seven agents.<br />
            <span className="accent">On-chain.</span>
          </h2>
          <p className="section-desc">
            Two orchestrators on ASI:One coordinate five specialized sub-agents —
            all registered on Agentverse, payable in FET. One pipeline for essays,
            one for emails. Shared sub-agents, real uAgent messaging, quality
            scoring with a revision loop.
          </p>
        </div>

        {/* Architecture visual */}
        <div className={`fetch-visual reveal ${isInView ? 'in-view' : ''} reveal-delay-2`}>
          <MultiAgentVisual />
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

        {/* Pipeline breakdown */}
        <div className={`fetch-monetization reveal ${isInView2 ? 'in-view' : ''} reveal-delay-4`}>
          <div className="fetch-money-header">
            <span className="fetch-money-eyebrow">two pipelines</span>
          </div>
          <div className="fetch-tiers">
            <div className="fetch-tier">
              <div className="fetch-tier-header">
                <span className="fetch-tier-label">long-form orchestrator</span>
                <span className="fetch-tier-price">0.01 FET</span>
              </div>
              <p className="fetch-tier-desc">writing.cadence → digester → long-form writer → quality scorer → revision loop</p>
              <div className="fetch-tier-bar">
                <div className="fetch-tier-fill fetch-tier-fill--full" />
              </div>
              <span className="fetch-tier-time">essays · papers · reports</span>
            </div>
            <div className="fetch-tier">
              <div className="fetch-tier-header">
                <span className="fetch-tier-label">short-form orchestrator</span>
                <span className="fetch-tier-price">0.01 FET</span>
              </div>
              <p className="fetch-tier-desc">comms.cadence → digester → short-form writer → voice-matched draft</p>
              <div className="fetch-tier-bar">
                <div className="fetch-tier-fill fetch-tier-fill--half" />
              </div>
              <span className="fetch-tier-time">emails · messages · comms</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
