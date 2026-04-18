const STATUS_STYLES = {
  'Not Contacted': { color: '#4A7A78', bg: '#1E3030', dot: '#4A7A78' },
  'Contacted':     { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', dot: '#3b82f6' },
  'Replied':       { color: '#34d399', bg: 'rgba(52,211,153,0.1)', dot: '#10b981' },
  'Converted':     { color: '#00D4C8', bg: 'rgba(0,212,200,0.1)', dot: '#00D4C8' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Not Contacted'];
  const px = size === 'sm' ? '5px 10px' : '6px 12px';
  const fs = size === 'sm' ? 11 : 12;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: px, borderRadius: 20,
      background: s.bg, color: s.color,
      fontSize: fs, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}
