import { useInView } from '../hooks/useInView'

function WritingVisual() {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      {/* Document panel */}
      <rect x="20" y="15" width="120" height="130" rx="6" stroke="#282828" strokeWidth="1" />
      <text x="32" y="32" fill="#484848" fontSize="7" fontFamily="var(--font-mono)">DRAFT</text>
      {[0,1,2,3,4,5,6].map(i => (
        <rect key={i} x="32" y={42 + i * 14} width={60 + Math.sin(i * 1.2) * 30} height="5" rx="2.5" fill="#ededed" opacity="0.08">
          <animate attributeName="opacity" values="0.04;0.15;0.08" dur="3s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
          <animate attributeName="width" values={`${20 + i * 5};${60 + Math.sin(i * 1.2) * 30};${60 + Math.sin(i * 1.2) * 30}`} dur="2s" begin={`${i * 0.15}s`} fill="freeze" />
        </rect>
      ))}
      {/* Scan line */}
      <line x1="20" y1="40" x2="140" y2="40" stroke="#ededed" strokeWidth="1" opacity="0.15">
        <animate attributeName="y1" values="40;145;40" dur="4s" repeatCount="indefinite" />
        <animate attributeName="y2" values="40;145;40" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;0.2;0" dur="4s" repeatCount="indefinite" />
      </line>

      {/* Data flow arrows */}
      <path d="M150 80 L175 80" stroke="#484848" strokeWidth="1" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* Agent brain */}
      <circle cx="200" cy="80" r="22" stroke="#282828" strokeWidth="1" />
      <circle cx="200" cy="80" r="22" stroke="#ededed" strokeWidth="1" opacity="0" strokeDasharray="6 4">
        <animate attributeName="opacity" values="0;0.5;0" dur="2s" repeatCount="indefinite" />
        <animate attributeName="stroke-dashoffset" values="0;-20" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="200" cy="80" r="8" fill="#ededed" opacity="0.15">
        <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.1;0.25;0.1" dur="2s" repeatCount="indefinite" />
      </circle>
      <text x="200" y="83" textAnchor="middle" fill="#ededed" fontSize="8" fontFamily="var(--font-mono)" fontWeight="500">AI</text>

      {/* Flow to detectors */}
      <path d="M225 80 L250 80" stroke="#484848" strokeWidth="1" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* Detection panel */}
      <rect x="260" y="15" width="120" height="130" rx="6" stroke="#282828" strokeWidth="1" />
      <text x="272" y="32" fill="#484848" fontSize="7" fontFamily="var(--font-mono)">DETECTORS</text>

      {/* GPTZero bar */}
      <text x="272" y="52" fill="#484848" fontSize="6.5" fontFamily="var(--font-mono)">gptzero</text>
      <rect x="272" y="56" width="96" height="6" rx="3" fill="#111" />
      <rect x="272" y="56" width="12" height="6" rx="3" fill="#28c840" opacity="0.6">
        <animate attributeName="width" values="80;40;12" dur="3s" repeatCount="indefinite" />
        <animate attributeName="fill" values="#ededed;#ededed;#28c840" dur="3s" repeatCount="indefinite" />
      </rect>

      {/* ZeroGPT bar */}
      <text x="272" y="78" fill="#484848" fontSize="6.5" fontFamily="var(--font-mono)">zerogpt</text>
      <rect x="272" y="82" width="96" height="6" rx="3" fill="#111" />
      <rect x="272" y="82" width="8" height="6" rx="3" fill="#28c840" opacity="0.5">
        <animate attributeName="width" values="65;30;8" dur="3s" begin="0.3s" repeatCount="indefinite" />
        <animate attributeName="fill" values="#ededed;#ededed;#28c840" dur="3s" begin="0.3s" repeatCount="indefinite" />
      </rect>

      {/* Originality bar */}
      <text x="272" y="104" fill="#484848" fontSize="6.5" fontFamily="var(--font-mono)">originality</text>
      <rect x="272" y="108" width="96" height="6" rx="3" fill="#111" />
      <rect x="272" y="108" width="15" height="6" rx="3" fill="#28c840" opacity="0.55">
        <animate attributeName="width" values="72;35;15" dur="3s" begin="0.6s" repeatCount="indefinite" />
        <animate attributeName="fill" values="#ededed;#ededed;#28c840" dur="3s" begin="0.6s" repeatCount="indefinite" />
      </rect>

      {/* Pass indicator */}
      <circle cx="320" cy="132" r="5" fill="#28c840" opacity="0">
        <animate attributeName="opacity" values="0;0;0.6;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
      <text x="330" y="135" fill="#28c840" fontSize="7" fontFamily="var(--font-mono)" fontWeight="500" opacity="0">
        PASS
        <animate attributeName="opacity" values="0;0;1;1" dur="3s" repeatCount="indefinite" />
      </text>

      {/* Loop arrow at bottom */}
      <path d="M320 160 C320 175, 200 185, 80 175 C60 172, 50 165, 55 155" stroke="#282828" strokeWidth="1" strokeDasharray="4 4" fill="none">
        <animate attributeName="stroke-dashoffset" values="0;-8" dur="1s" repeatCount="indefinite" />
        <animate attributeName="stroke" values="#282828;#484848;#282828" dur="3s" repeatCount="indefinite" />
      </path>
      <text x="185" y="183" textAnchor="middle" fill="#484848" fontSize="6" fontFamily="var(--font-mono)">revision loop</text>
    </svg>
  )
}


function CommsVisual() {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      {/* Inbox panel */}
      <rect x="20" y="20" width="140" height="120" rx="6" stroke="#282828" strokeWidth="1" />
      <text x="32" y="37" fill="#484848" fontSize="7" fontFamily="var(--font-mono)">INBOX</text>

      {/* Email items */}
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x="32" y={48 + i * 30} width="116" height="22" rx="4" stroke="#282828" strokeWidth="0.5" fill="transparent">
            <animate attributeName="stroke" values="#282828;#484848;#282828" dur="3s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
          </rect>
          <rect x="38" y={54 + i * 30} width={50 + i * 10} height="3" rx="1.5" fill="#ededed" opacity="0.08" />
          <rect x="38" y={61 + i * 30} width={70 - i * 5} height="3" rx="1.5" fill="#ededed" opacity="0.05" />
          <circle cx="138" cy={59 + i * 30} r="3" fill="none" stroke="#484848" strokeWidth="0.5">
            <animate attributeName="fill" values="transparent;transparent;#28c840" dur="4s" begin={`${1 + i * 0.4}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.3;0.8" dur="4s" begin={`${1 + i * 0.4}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}

      {/* Data flow */}
      <path d="M170 80 L195 80" stroke="#484848" strokeWidth="1" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* Voice fingerprint visualization */}
      <g transform="translate(210, 25)">
        <rect width="80" height="110" rx="6" stroke="#282828" strokeWidth="1" />
        <text x="10" y="15" fill="#484848" fontSize="7" fontFamily="var(--font-mono)">VOICE</text>

        {/* Waveform */}
        {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(i => {
          const h = 8 + Math.sin(i * 0.7) * 18
          return (
            <rect
              key={i}
              x={10 + i * 4.5}
              y={55 - h/2}
              width={2}
              height={h}
              rx={1}
              fill="#ededed"
              opacity={0.12 + Math.sin(i * 0.5) * 0.1}
            >
              <animate
                attributeName="height"
                values={`${5 + Math.sin(i) * 3};${h};${8 + Math.cos(i * 0.6) * 12}`}
                dur={`${1.5 + Math.sin(i) * 0.3}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="y"
                values={`${55 - (5 + Math.sin(i) * 3)/2};${55 - h/2};${55 - (8 + Math.cos(i * 0.6) * 12)/2}`}
                dur={`${1.5 + Math.sin(i) * 0.3}s`}
                repeatCount="indefinite"
              />
            </rect>
          )
        })}

        {/* Match score */}
        <text x="10" y="86" fill="#ededed" fontSize="16" fontFamily="var(--font-mono)" fontWeight="600">94%</text>
        <text x="46" y="86" fill="#484848" fontSize="7" fontFamily="var(--font-mono)">match</text>

        {/* Pulse ring */}
        <circle cx="22" cy="80" r="4" fill="none" stroke="#ededed" strokeWidth="0.5" opacity="0">
          <animate attributeName="r" values="4;16" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Output flow */}
      <path d="M300 80 L325 80" stroke="#484848" strokeWidth="1" strokeDasharray="3 3">
        <animate attributeName="stroke-dashoffset" values="0;-6" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* Reply draft */}
      <rect x="335" y="40" width="50" height="80" rx="6" stroke="#282828" strokeWidth="1" />
      <text x="343" y="55" fill="#484848" fontSize="6" fontFamily="var(--font-mono)">REPLY</text>
      {[0,1,2].map(i => (
        <rect key={i} x="343" y={64 + i * 10} width={30 + Math.sin(i) * 8} height="3" rx="1.5" fill="#ededed" opacity="0.08">
          <animate attributeName="width" values={`0;${30 + Math.sin(i) * 8}`} dur="1s" begin={`${2 + i * 0.3}s`} fill="freeze" />
        </rect>
      ))}

      {/* Status indicators */}
      {['email', 'inbox', 'tone'].map((label, i) => (
        <g key={label} transform={`translate(${50 + i * 120}, 165)`}>
          <circle r="3" fill="#28c840" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
          <text x="8" y="3" fill="#484848" fontSize="6" fontFamily="var(--font-mono)">{label}</text>
        </g>
      ))}
    </svg>
  )
}

export function Studios() {
  const { ref, isInView } = useInView()

  return (
    <section id="studios" className="section" ref={ref as React.RefObject<HTMLElement>}>
      <div className="section-inner">
        <div className={`reveal ${isInView ? 'in-view' : ''}`}>
          <p className="section-eyebrow">two studios, four agents</p>
          <h2 className="section-title">
            Two studios.<br />
            <span className="accent">One voice.</span>
          </h2>
          <p className="section-desc">
            Whether you're writing an essay or drafting a quick email,
            multi-agent pipelines preserve the rhythm that makes your
            writing yours.
          </p>
        </div>

        <div className="studios-grid">
          <div className={`studio-card reveal ${isInView ? 'in-view' : ''} reveal-delay-2`}>
            <span className="studio-number">01</span>
            <h3 className="studio-name">Writing Studio.</h3>
            <p className="studio-desc">
              Upload your past writing and watch a multi-agent pipeline work
              live. Voice Analyst fingerprints your style, Writer streams your
              draft, Detector Squad runs three parallel browsers on AI
              detectors, and the Quality Scorer loops revisions until you pass.
            </p>
            <div className="studio-tags">
              <span className="studio-tag">Multi-Agent</span>
              <span className="studio-tag">AI Detection Loop</span>
              <span className="studio-tag">Quality Scorer</span>
              <span className="studio-tag">Live Dashboard</span>
            </div>
            <div className="studio-visual">
              <WritingVisual />
            </div>
          </div>

          <div className={`studio-card reveal ${isInView ? 'in-view' : ''} reveal-delay-3`}>
            <span className="studio-number">02</span>
            <h3 className="studio-name">Communication Studio.</h3>
            <p className="studio-desc">
              Upload your email history. Cadence learns your tone shifts
              between peers and managers. Describe your intent — "tell Sarah
              I can't make 3pm" — and the Short-Form Writer drafts a
              recipient-aware email in your voice. Or let the inbox agent
              read your Gmail and draft replies.
            </p>
            <div className="studio-tags">
              <span className="studio-tag">Gmail</span>
              <span className="studio-tag">Recipient-Aware</span>
              <span className="studio-tag">Short-Form Writer</span>
              <span className="studio-tag">Inbox Agent</span>
            </div>
            <div className="studio-visual">
              <CommsVisual />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
