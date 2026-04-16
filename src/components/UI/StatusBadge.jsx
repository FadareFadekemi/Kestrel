const STATUS_STYLES = {
  'Not Contacted': { color: '#71717a', bg: '#27272a', dot: '#52525b' },
  'Contacted':     { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', dot: '#3b82f6' },
  'Replied':       { color: '#34d399', bg: 'rgba(52,211,153,0.1)', dot: '#10b981' },
  'Converted':     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', dot: '#f59e0b' },
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
