import { useState } from 'react';
import { Loader } from 'lucide-react';
import { SkeletonText } from '../UI/Skeleton';

export default function ABVariants({ variants, isLoading, statusText }) {
  const [active, setActive] = useState('A');

  if (isLoading) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Loader size={13} color="#60a5fa" className="animate-spin-icon" />
          <span style={{ fontSize: 12, color: '#60a5fa' }}>{statusText || 'Generating A/B variants...'}</span>
        </div>
        <SkeletonText lines={6} />
      </div>
    );
  }

  if (!variants) return null;

  const email = variants[active];

  return (
    <div style={{ padding: 20, animation: 'fadeInUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa' }}>A/B Variants</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['A', 'B'].map(v => (
            <button key={v} onClick={() => setActive(v)} style={{
              width: 32, height: 28, fontSize: 12, fontWeight: 700,
              color: active === v ? '#09090b' : '#71717a',
              background: active === v ? '#f59e0b' : '#27272a',
              border: `1px solid ${active === v ? '#f59e0b' : '#3f3f46'}`,
              borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
            }}>{v}</button>
          ))}
        </div>
      </div>

      <div style={{ background: '#18181b', borderRadius: 8, border: '1px solid #27272a', padding: '12px 14px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#f4f4f5', margin: '0 0 10px', borderBottom: '1px solid #27272a', paddingBottom: 8 }}>
          {email?.subject}
        </p>
        <pre style={{ fontSize: 12, color: '#d4d4d8', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: 'inherit' }}>
          {email?.body}
        </pre>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
        <Chip label={`Variant ${active}`} color="#f59e0b" />
        <Chip label={email?.tone} color="#a78bfa" />
        <Chip label={`${email?.wordCount || '—'} words`} color="#71717a" />
      </div>
    </div>
  );
}

function Chip({ label, color }) {
  return (
    <span style={{
      fontSize: 10, color, background: `${color}15`, border: `1px solid ${color}30`,
      borderRadius: 5, padding: '2px 8px', fontWeight: 500,
    }}>{label}</span>
  );
}
