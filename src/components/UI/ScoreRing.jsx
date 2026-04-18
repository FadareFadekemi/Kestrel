export default function ScoreRing({ score = 0, size = 64, label }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const dash = pct * circ;

  const color = score >= 80 ? '#00D4C8' : score >= 60 ? '#60a5fa' : score >= 40 ? '#00D4C8' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E3030" strokeWidth={5} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={5}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: size < 56 ? 13 : 16, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        </div>
      </div>
      {label && <span style={{ fontSize: 10, color: '#4A7A78', textAlign: 'center' }}>{label}</span>}
    </div>
  );
}
