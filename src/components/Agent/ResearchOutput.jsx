import { ExternalLink, Cpu, AlertTriangle, TrendingUp } from 'lucide-react';
import { SkeletonText, SkeletonBlock } from '../UI/Skeleton';

export default function ResearchOutput({ research, isLoading, statusText }) {
  if (isLoading) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa', boxShadow: '0 0 8px #60a5fa' }} className="animate-pulse-glow" />
          <span style={{ fontSize: 12, color: '#60a5fa' }}>{statusText || 'Searching...'}</span>
        </div>
        <SkeletonText lines={4} />
        <SkeletonBlock height={60} style={{ marginTop: 16 }} />
      </div>
    );
  }

  if (!research) return null;

  return (
    <div style={{ padding: '20px', animation: 'fadeInUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fafafa', margin: 0 }}>{research.companyName}</h3>
          <a href={research.input?.startsWith('http') ? research.input : `https://${research.input}`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: '#71717a', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, textDecoration: 'none' }}>
            {research.input} <ExternalLink size={10} />
          </a>
        </div>
      </div>

      <Section title="Summary">
        <p style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.65, margin: 0 }}>{research.summary}</p>
      </Section>

      <Section title="Recent News" icon={<TrendingUp size={12} color="#f59e0b" />}>
        <p style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.65, margin: 0 }}>{research.recentNews}</p>
      </Section>

      {research.techStack?.length > 0 && (
        <Section title="Detected Tech Stack" icon={<Cpu size={12} color="#a78bfa" />}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {research.techStack.map(t => (
              <span key={t} style={{
                fontSize: 11, color: '#c4b5fd', background: 'rgba(167,139,250,0.1)',
                border: '1px solid rgba(167,139,250,0.2)', borderRadius: 6, padding: '3px 8px',
              }}>{t}</span>
            ))}
          </div>
        </Section>
      )}

      {research.competitors?.length > 0 && (
        <Section title="Competitor Signals" icon={<AlertTriangle size={12} color="#f87171" />}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {research.competitors.map(c => (
              <span key={c} style={{
                fontSize: 11, color: '#fca5a5', background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '3px 8px',
              }}>{c}</span>
            ))}
          </div>
        </Section>
      )}

      {research.sources?.length > 0 && (
        <Section title="Sources">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {research.sources.slice(0, 4).map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                style={{
                  fontSize: 11, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 6,
                  textDecoration: 'none', padding: '6px 10px', background: '#18181b',
                  borderRadius: 6, border: '1px solid #27272a',
                }}>
                <ExternalLink size={10} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title || s.url}
                </span>
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 600, color: '#52525b', letterSpacing: '0.6px', textTransform: 'uppercase' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
