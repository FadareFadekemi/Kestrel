import { SkeletonText, SkeletonBlock } from '../UI/Skeleton';
import ScoreRing from '../UI/ScoreRing';
import { Cpu, TrendingUp, Target, Users, MapPin, DollarSign, AlertTriangle } from 'lucide-react';

export default function ProfileOutput({ profile, isLoading, statusText, streamText }) {
  if (isLoading) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa' }} className="animate-pulse-glow" />
          <span style={{ fontSize: 12, color: '#60a5fa' }}>{statusText || 'Profiling...'}</span>
        </div>
        {streamText && (
          <div style={{
            background: '#18181b', borderRadius: 8, padding: 12, marginBottom: 12,
            border: '1px solid #27272a', maxHeight: 120, overflow: 'hidden',
          }}>
            <pre style={{ fontSize: 10, color: '#3f3f46', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {streamText.slice(-400)}
            </pre>
          </div>
        )}
        <SkeletonBlock height={80} />
        <SkeletonText lines={4} style={{ marginTop: 16 }} />
      </div>
    );
  }

  if (!profile || profile.error) return null;

  return (
    <div style={{ padding: 20, animation: 'fadeInUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            <MetaChip icon={<Users size={10} />} label={profile.companySize} />
            <MetaChip icon={<MapPin size={10} />} label={profile.location} />
            <MetaChip icon={<DollarSign size={10} />} label={profile.fundingStage} />
          </div>
          <p style={{ fontSize: 12, color: '#71717a', margin: 0, lineHeight: 1.5 }}>
            <span style={{ color: '#a1a1aa' }}>{profile.contactName}</span>
            {profile.contactTitle ? ` · ${profile.contactTitle}` : ''}
          </p>
          <p style={{ fontSize: 12, color: '#52525b', marginTop: 4, lineHeight: 1.5 }}>{profile.icp_fit}</p>
        </div>
        {/* Score rings */}
        <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
          <ScoreRing score={profile.scores?.overall || 0} size={64} label="Overall" />
        </div>
      </div>

      {/* Score breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'techFit', label: 'Tech Fit' },
          { key: 'sizeFit', label: 'Size Fit' },
          { key: 'timing', label: 'Timing' },
          { key: 'growthIndicators', label: 'Growth' },
        ].map(({ key, label }) => (
          <ScoreBar key={key} label={label} value={profile.scores?.[key] || 0} />
        ))}
      </div>

      {profile.scoreReasoning && (
        <div style={{ background: '#18181b', borderRadius: 8, padding: '10px 12px', marginBottom: 16, border: '1px solid #27272a' }}>
          <p style={{ fontSize: 11, color: '#71717a', margin: 0, lineHeight: 1.55 }}>{profile.scoreReasoning}</p>
        </div>
      )}

      {/* Pain points */}
      {profile.painPoints?.length > 0 && (
        <Section title="Pain Points" icon={<Target size={12} color="#f87171" />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {profile.painPoints.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>•</span>
                <span style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>{p}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Growth signals */}
      {profile.growthSignals?.length > 0 && (
        <Section title="Growth Signals" icon={<TrendingUp size={12} color="#34d399" />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {profile.growthSignals.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, color: '#10b981', marginTop: 2 }}>↑</span>
                <span style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Tech stack */}
      {profile.techStack?.length > 0 && (
        <Section title="Tech Stack" icon={<Cpu size={12} color="#a78bfa" />}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {profile.techStack.map(t => (
              <span key={t} style={{
                fontSize: 11, color: '#c4b5fd', background: 'rgba(167,139,250,0.08)',
                border: '1px solid rgba(167,139,250,0.15)', borderRadius: 5, padding: '2px 7px',
              }}>{t}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Competitor flag */}
      {profile.usesCompetitor && profile.competitorName && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8, padding: '10px 12px',
        }}>
          <AlertTriangle size={14} color="#ef4444" />
          <div>
            <span style={{ fontSize: 12, color: '#fca5a5', fontWeight: 600 }}>Competitor Detected: </span>
            <span style={{ fontSize: 12, color: '#fca5a5' }}>{profile.competitorName}</span>
            <p style={{ fontSize: 11, color: '#7f1d1d', margin: '2px 0 0' }}>Displacement angle included in the email.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaChip({ icon, label }) {
  if (!label || label === 'Unknown') return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, color: '#71717a', background: '#27272a',
      border: '1px solid #3f3f46', borderRadius: 5, padding: '3px 8px',
    }}>
      {icon} {label}
    </span>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 600, color: '#52525b', letterSpacing: '0.6px', textTransform: 'uppercase' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function ScoreBar({ label, value }) {
  const color = value >= 80 ? '#f59e0b' : value >= 60 ? '#60a5fa' : value >= 40 ? '#a78bfa' : '#ef4444';
  return (
    <div style={{ background: '#18181b', borderRadius: 8, padding: '8px 10px', border: '1px solid #27272a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: '#71717a' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 3, background: '#27272a', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value}%`, background: color,
          borderRadius: 2, transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}
