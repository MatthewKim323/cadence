const items = [
  'voice fingerprinting',
  'live dashboard',
  'ai detection loop',
  '11 agents on agentverse',
  'browser use detectors',
  'consensus scoring',
  'writing studio',
  'communication studio',
  'voice interviews',
  'two orchestrators',
  'writing.cadence',
  'comms.cadence',
  'gmail reader + sender',
  'claude + browser use',
]

export function Marquee() {
  const doubled = [...items, ...items]

  return (
    <div className="marquee-section">
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span className="marquee-item" key={i}>
            <span className="dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
