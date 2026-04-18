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
        <span style={{ fontSize: 12, fontWeight: 600, color: '#8ABAB8' }}>A/B Variants</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['A', 'B'].map(v => (
            <button key={v} onClick={() => setActive(v)} style={{
              width: 32, height: 28, fontSize: 12, fontWeight: 700,
              color: active === v ? '#0A0F0F' : '#4A7A78',
              background: active === v ? '#00D4C8' : '#1E3030',
              border: `1px solid ${active === v ? '#00D4C8' : '#264040'}`,
              borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
            }}>{v}</button>
          ))}
        </div>
      </div>

      <div style={{ background: '#111A1A', borderRadius: 8, border: '1px solid #1E3030', padding: '12px 14px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#E8F5F4', margin: '0 0 10px', borderBottom: '1px solid #1E3030', paddingBottom: 8 }}>
          {email?.subject}
        </p>
        <pre style={{ fontSize: 12, color: '#C5E8E6', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: 'inherit' }}>
          {email?.body}
        </pre>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
        <Chip label={`Variant ${active}`} color="#00D4C8" />
        <Chip label={email?.tone} color="#00D4C8" />
        <Chip label={`${email?.wordCount || '—'} words`} color="#4A7A78" />
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
