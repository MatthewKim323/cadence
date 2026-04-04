import { useInView } from '../hooks/useInView'

function MultiAgentVisual() {
  return (
    <svg viewBox="0 0 860 440" fill="none" xmlns="http://www.w3.org/2000/svg" className="fetch-visual-svg">
      {/* ── CADENCE PLATFORM ── */}
      <g>
        <rect x="5" y="130" width="100" height="160" rx="8" stroke="#282828" strokeWidth="1" />
        <rect x="5" y="130" width="100" height="160" rx="8" fill="#ededed" opacity="0.02" />
        <text x="55" y="152" textAnchor="middle" fill="#ededed" fontSize="7" fontFamily="var(--font-mono)" fontWeight="500">CADENCE</text>
        <text x="55" y="163" textAnchor="middle" fill="#484848" fontSize="5.5" fontFamily="var(--font-mono)">platform</text>

        <rect x="15" y="175" width="80" height="24" rx="4" stroke="#282828" strokeWidth="0.5" />
        <text x="55" y="186" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">writing studio</text>
        <text x="55" y="194" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)" opacity="0.6">→ writing.cadence</text>

        <rect x="15" y="206" width="80" height="24" rx="4" stroke="#282828" strokeWidth="0.5" />
        <text x="55" y="217" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">comms studio</text>
        <text x="55" y="225" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)" opacity="0.6">→ comms.cadence</text>

        <rect x="18" y="242" width="74" height="14" rx="7" stroke="#484848" strokeWidth="0.5" fill="#ededed" opacity="0.04" />
        <text x="55" y="252" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">export profile</text>
      </g>

      {/* Cadence → ASI:One */}
      <path d="M110 210 L145 210" stroke="#484848" strokeWidth="1" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-8" dur="1s" repeatCount="indefinite" />
      </path>
      <text x="127" y="203" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">.cadence</text>

      {/* ── ASI:ONE ── */}
      <g>
        <rect x="150" y="175" width="80" height="70" rx="8" stroke="#282828" strokeWidth="1" />
        <text x="190" y="198" textAnchor="middle" fill="#484848" fontSize="7" fontFamily="var(--font-mono)">ASI:ONE</text>
        <circle cx="190" cy="218" r="8" stroke="#484848" strokeWidth="1" fill="none" />
        <circle cx="190" cy="215" r="3" fill="none" stroke="#484848" strokeWidth="1" />
        <path d="M184 223 L190 226 L196 223" stroke="#484848" strokeWidth="1" fill="none" />
      </g>

      {/* ASI:One → split */}
      <path d="M235 210 L265 210" stroke="#484848" strokeWidth="1" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-8" dur="1s" repeatCount="indefinite" />
      </path>

      {/* Split */}
      <circle cx="270" cy="210" r="3" fill="#484848" />
      <path d="M273 210 L300 110" stroke="#484848" strokeWidth="1" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-8" dur="0.8s" repeatCount="indefinite" />
      </path>
      <path d="M273 210 L300 310" stroke="#484848" strokeWidth="1" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-8" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* ── LONG-FORM ORCHESTRATOR ── */}
      <g>
        <rect x="305" y="65" width="130" height="80" rx="8" stroke="#ededed" strokeWidth="1" opacity="0.4" />
        <rect x="305" y="65" width="130" height="80" rx="8" fill="#ededed" opacity="0.03">
          <animate attributeName="opacity" values="0.02;0.06;0.02" dur="3s" repeatCount="indefinite" />
        </rect>
        <text x="370" y="86" textAnchor="middle" fill="#ededed" fontSize="7" fontFamily="var(--font-mono)" fontWeight="500">LONG-FORM</text>
        <text x="370" y="97" textAnchor="middle" fill="#ededed" fontSize="7" fontFamily="var(--font-mono)" fontWeight="500">ORCHESTRATOR</text>
        <rect x="315" y="108" width="44" height="13" rx="6" stroke="#484848" strokeWidth="0.5" />
        <text x="337" y="117" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">chat</text>
        <rect x="365" y="108" width="55" height="13" rx="6" stroke="#484848" strokeWidth="0.5" />
        <text x="392" y="117" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">payment</text>
        <rect x="315" y="126" width="76" height="11" rx="5" stroke="#484848" strokeWidth="0.5" fill="#ededed" opacity="0.04" />
        <text x="353" y="134" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">writing.cadence</text>
      </g>

      {/* ── SHORT-FORM ORCHESTRATOR ── */}
      <g>
        <rect x="305" y="270" width="130" height="80" rx="8" stroke="#ededed" strokeWidth="1" opacity="0.4" />
        <rect x="305" y="270" width="130" height="80" rx="8" fill="#ededed" opacity="0.03">
          <animate attributeName="opacity" values="0.02;0.06;0.02" dur="3s" repeatCount="indefinite" />
        </rect>
        <text x="370" y="291" textAnchor="middle" fill="#ededed" fontSize="7" fontFamily="var(--font-mono)" fontWeight="500">SHORT-FORM</text>
        <text x="370" y="302" textAnchor="middle" fill="#ededed" fontSize="7" fontFamily="var(--font-mono)" fontWeight="500">ORCHESTRATOR</text>
        <rect x="315" y="315" width="44" height="13" rx="6" stroke="#484848" strokeWidth="0.5" />
        <text x="337" y="324" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">chat</text>
        <rect x="365" y="315" width="55" height="13" rx="6" stroke="#484848" strokeWidth="0.5" />
        <text x="392" y="324" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">payment</text>
        <rect x="315" y="332" width="76" height="11" rx="5" stroke="#484848" strokeWidth="0.5" fill="#ededed" opacity="0.04" />
        <text x="353" y="340" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">comms.cadence</text>
      </g>

      {/* ── CLAUDE-POWERED AGENTS (middle column) ── */}
      {/* Category label */}
      <text x="500" y="42" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)" opacity="0.5">claude-powered</text>

      {/* Profile Digester — centered */}
      <g>
        <rect x="460" y="170" width="100" height="36" rx="6" stroke="#282828" strokeWidth="1" />
        <rect x="460" y="170" width="100" height="36" rx="6" fill="#ededed" opacity="0.02" />
        <text x="510" y="186" textAnchor="middle" fill="#ededed" fontSize="6" fontFamily="var(--font-mono)">profile digester</text>
        <text x="510" y="198" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">parses .cadence</text>
      </g>
      <path d="M440 105 L460 182" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>
      <path d="M440 310 L460 196" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* Voice Analyst */}
      <g>
        <rect x="460" y="218" width="100" height="36" rx="6" stroke="#282828" strokeWidth="1" />
        <rect x="460" y="218" width="100" height="36" rx="6" fill="#ededed" opacity="0.02" />
        <text x="510" y="234" textAnchor="middle" fill="#ededed" fontSize="6" fontFamily="var(--font-mono)">voice analyst</text>
        <text x="510" y="246" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">fallback (no profile)</text>
      </g>

      {/* Long-Form Writer */}
      <g>
        <rect x="460" y="55" width="100" height="36" rx="6" stroke="#282828" strokeWidth="1" />
        <rect x="460" y="55" width="100" height="36" rx="6" fill="#ededed" opacity="0.02" />
        <text x="510" y="71" textAnchor="middle" fill="#ededed" fontSize="6" fontFamily="var(--font-mono)">long-form writer</text>
        <text x="510" y="83" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">essays · papers</text>
      </g>
      <path d="M565 188 L570 91" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* Short-Form Writer */}
      <g>
        <rect x="460" y="330" width="100" height="36" rx="6" stroke="#282828" strokeWidth="1" />
        <rect x="460" y="330" width="100" height="36" rx="6" fill="#ededed" opacity="0.02" />
        <text x="510" y="346" textAnchor="middle" fill="#ededed" fontSize="6" fontFamily="var(--font-mono)">short-form writer</text>
        <text x="510" y="358" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">emails · messages</text>
      </g>
      <path d="M565 200 L570 330" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* ── BROWSER USE AGENTS (right column) ── */}
      {/* Category label */}
      <text x="700" y="42" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)" opacity="0.5">browser use</text>

      {/* 3 Detector agents — stacked */}
      <g>
        <rect x="620" y="55" width="95" height="28" rx="5" stroke="#282828" strokeWidth="1" />
        <rect x="620" y="55" width="95" height="28" rx="5" fill="#ededed" opacity="0.02" />
        <text x="667" y="71" textAnchor="middle" fill="#ededed" fontSize="5.5" fontFamily="var(--font-mono)">gptzero detector</text>
        <circle cx="705" cy="69" r="3" fill="#ededed" opacity="0.06">
          <animate attributeName="opacity" values="0.04;0.15;0.04" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>
      <g>
        <rect x="620" y="90" width="95" height="28" rx="5" stroke="#282828" strokeWidth="1" />
        <rect x="620" y="90" width="95" height="28" rx="5" fill="#ededed" opacity="0.02" />
        <text x="667" y="106" textAnchor="middle" fill="#ededed" fontSize="5.5" fontFamily="var(--font-mono)">zerogpt detector</text>
        <circle cx="705" cy="104" r="3" fill="#ededed" opacity="0.06">
          <animate attributeName="opacity" values="0.04;0.15;0.04" dur="2.3s" repeatCount="indefinite" />
        </circle>
      </g>
      <g>
        <rect x="620" y="125" width="95" height="28" rx="5" stroke="#282828" strokeWidth="1" />
        <rect x="620" y="125" width="95" height="28" rx="5" fill="#ededed" opacity="0.02" />
        <text x="667" y="141" textAnchor="middle" fill="#ededed" fontSize="5.5" fontFamily="var(--font-mono)">originality detector</text>
        <circle cx="705" cy="139" r="3" fill="#ededed" opacity="0.06">
          <animate attributeName="opacity" values="0.04;0.15;0.04" dur="2.6s" repeatCount="indefinite" />
        </circle>
      </g>
      {/* "parallel" label */}
      <text x="612" y="108" textAnchor="end" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)" opacity="0.5">parallel</text>
      {/* Writer → Detectors */}
      <path d="M565 73 L620 69" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>
      <path d="M565 73 L620 104" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>
      <path d="M565 73 L620 139" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* Consensus + revision loop */}
      <g>
        <rect x="735" y="75" width="80" height="46" rx="6" stroke="#ededed" strokeWidth="1" opacity="0.4" />
        <rect x="735" y="75" width="80" height="46" rx="6" fill="#ededed" opacity="0.03">
          <animate attributeName="opacity" values="0.02;0.06;0.02" dur="2.5s" repeatCount="indefinite" />
        </rect>
        <text x="775" y="93" textAnchor="middle" fill="#ededed" fontSize="5.5" fontFamily="var(--font-mono)">consensus</text>
        <text x="775" y="104" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">avg ≤ 10%</text>
        <text x="775" y="115" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)">revision loop</text>
      </g>
      {/* Detectors → Consensus */}
      <path d="M720 83 L735 93" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>
      {/* Revision loop back to writer */}
      <path d="M775 125 C 775 160, 560 160, 560 91" stroke="#ededed" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.25" fill="none">
        <animate attributeName="stroke-dashoffset" values="0;-5" dur="1.5s" repeatCount="indefinite" />
      </path>
      <text x="670" y="165" textAnchor="middle" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)" opacity="0.5">revise flagged sentences</text>

      {/* Output check from consensus */}
      <path d="M820 98 L840 98" stroke="#484848" strokeWidth="1" strokeDasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-8" dur="0.8s" repeatCount="indefinite" />
      </path>
      <g>
        <rect x="842" y="85" width="16" height="26" rx="3" stroke="#282828" strokeWidth="1" />
        <text x="850" y="102" textAnchor="middle" fill="#484848" fontSize="5" fontFamily="var(--font-mono)">✓</text>
      </g>

      {/* Gmail agents (bottom right) */}
      <g>
        <rect x="620" y="310" width="95" height="28" rx="5" stroke="#282828" strokeWidth="1" />
        <rect x="620" y="310" width="95" height="28" rx="5" fill="#ededed" opacity="0.02" />
        <text x="667" y="326" textAnchor="middle" fill="#ededed" fontSize="5.5" fontFamily="var(--font-mono)">gmail reader</text>
      </g>
      <g>
        <rect x="620" y="345" width="95" height="28" rx="5" stroke="#282828" strokeWidth="1" />
        <rect x="620" y="345" width="95" height="28" rx="5" fill="#ededed" opacity="0.02" />
        <text x="667" y="361" textAnchor="middle" fill="#ededed" fontSize="5.5" fontFamily="var(--font-mono)">gmail sender</text>
      </g>
      {/* Short-Form Writer ↔ Gmail */}
      <path d="M565 348 L620 324" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>
      <path d="M565 348 L620 359" stroke="#484848" strokeWidth="0.8" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>
      <text x="612" y="342" textAnchor="end" fill="#484848" fontSize="4.5" fontFamily="var(--font-mono)" opacity="0.5">optional</text>

      {/* ── BADGES ── */}
      <g transform="translate(300, 405)">
        <rect width="150" height="22" rx="11" stroke="#282828" strokeWidth="0.5" fill="#0a0a0a" />
        <text x="75" y="14.5" textAnchor="middle" fill="#484848" fontSize="6" fontFamily="var(--font-mono)">11 agents on agentverse ✓</text>
        <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite" />
      </g>
      <g transform="translate(460, 405)">
        <rect width="120" height="22" rx="11" stroke="#282828" strokeWidth="0.5" fill="#0a0a0a" />
        <text x="60" y="14.5" textAnchor="middle" fill="#484848" fontSize="5.5" fontFamily="var(--font-mono)">on-chain FET ✓</text>
        <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite" />
      </g>
    </svg>
  )
}

const features = [
  {
    num: '01',
    title: 'Eleven Agents. Two Frameworks.',
    desc: 'Some agents use Claude for intelligence — fingerprinting, writing. Others use Browser Use for web interaction — AI detection, Gmail. All are Fetch.ai uAgents communicating through the same protocol.',
    tags: ['11 agents', 'claude + browser use', 'uAgent messaging'],
  },
  {
    num: '02',
    title: 'Browser Use Detection Loop.',
    desc: 'Three Browser Use agents navigate GPTZero, ZeroGPT, and Originality.ai in parallel. Each scrapes per-sentence flagging data — no API exists for this. Orchestrator computes consensus, loops back to Writer for surgical revision.',
    tags: ['3 detectors', 'consensus scoring', 'sentence-level scraping'],
  },
  {
    num: '03',
    title: 'Two .cadence File Types.',
    desc: 'Export writing.cadence from Writing Studio or comms.cadence from Communication Studio. Paste into ASI:One — the Profile Digester parses the type, routes to the right pipeline.',
    tags: ['writing.cadence', 'comms.cadence', 'profile export'],
  },
  {
    num: '04',
    title: 'Gmail Agents.',
    desc: 'Gmail Reader navigates your inbox via Browser Use, extracts messages needing replies. Short-Form Writer drafts in your voice. Gmail Sender opens the thread and hits send. Full inbox automation.',
    tags: ['gmail reader', 'gmail sender', 'inbox automation'],
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
            Eleven agents.<br />
            <span className="accent">Two frameworks.</span>
          </h2>
          <p className="section-desc">
            The entire Cadence system as a Fetch.ai multi-agent network.
            Claude-powered agents for intelligence. Browser Use agents for web
            interaction. All registered on Agentverse, coordinated through
            uAgent messaging, payable in FET.
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
              <p className="fetch-tier-desc">digester → writer → 3 browser use detectors (parallel) → consensus → revision loop</p>
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
              <p className="fetch-tier-desc">digester → short-form writer + optional gmail reader → gmail sender</p>
              <div className="fetch-tier-bar">
                <div className="fetch-tier-fill fetch-tier-fill--half" />
              </div>
              <span className="fetch-tier-time">emails · messages · inbox replies</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
