import ScoreRing from '../UI/ScoreRing';
import { AlertTriangle, Cpu, Target, TrendingUp, CheckCircle } from 'lucide-react';

export default function RightPanel({ profile }) {
  if (!profile || profile.error) {
    return (
      <div style={{ padding: '20px 16px' }}>
        <Label>INTELLIGENCE</Label>
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 12, color: '#264040', margin: 0 }}>Run the pipeline to see lead intelligence</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Label>INTELLIGENCE</Label>

      {/* Overall score */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <ScoreRing score={profile.scores?.overall || 0} size={80} label="Lead Score" />
      </div>

      {/* Score breakdown bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { label: 'Tech Fit',  key: 'techFit',          color: '#00D4C8' },
          { label: 'Size Fit',  key: 'sizeFit',           color: '#60a5fa' },
          { label: 'Timing',    key: 'timing',             color: '#34d399' },
          { label: 'Growth',    key: 'growthIndicators',   color: '#00D4C8' },
        ].map(({ label, key, color }) => {
          const val = profile.scores?.[key] || 0;
          return (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#4A7A78' }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color }}>{val}</span>
              </div>
              <div style={{ height: 3, background: '#1E3030', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${val}%`, background: color, borderRadius: 2, transition: 'width 0.7s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {profile.scoreReasoning && (
        <p style={{ fontSize: 11, color: '#4A7A78', lineHeight: 1.55, margin: 0, padding: '8px 10px', background: '#111A1A', borderRadius: 6, border: '1px solid #1E3030' }}>
          {profile.scoreReasoning}
        </p>
      )}

      <HR />

      {/* Competitor flag */}
      {profile.usesCompetitor && profile.competitorName && (
        <>
          <Section title="Competitor Alert" icon={<AlertTriangle size={11} color="#ef4444" />}>
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '8px 10px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#fca5a5', margin: '0 0 3px' }}>{profile.competitorName}</p>
              <p style={{ fontSize: 11, color: '#991b1b', margin: 0, lineHeight: 1.45 }}>Displacement opportunity. Email adjusted.</p>
            </div>
          </Section>
          <HR />
        </>
      )}

      {/* Tech stack */}
      {profile.techStack?.length > 0 && (
        <>
          <Section title="Technographics" icon={<Cpu size={11} color="#00D4C8" />}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {profile.techStack.map(t => (
                <span key={t} style={{ fontSize: 10, color: '#c4b5fd', background: 'rgba(0,212,200,0.08)', border: '1px solid rgba(0,212,200,0.18)', borderRadius: 5, padding: '2px 7px' }}>{t}</span>
              ))}
            </div>
          </Section>
          <HR />
        </>
      )}

      {/* Pain points */}
      {profile.painPoints?.length > 0 && (
        <>
          <Section title="Pain Points" icon={<Target size={11} color="#f87171" />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {profile.painPoints.slice(0, 4).map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 9, color: '#ef4444', marginTop: 3, flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: 11, color: '#8ABAB8', lineHeight: 1.5 }}>{p}</span>
                </div>
              ))}
            </div>
          </Section>
          <HR />
        </>
      )}

      {/* Growth signals */}
      {profile.growthSignals?.length > 0 && (
        <Section title="Growth Signals" icon={<TrendingUp size={11} color="#34d399" />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {profile.growthSignals.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <CheckCircle size={10} color="#10b981" style={{ marginTop: 3, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#8ABAB8', lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Label({ children }) {
  return <p style={{ fontSize: 10, fontWeight: 600, color: '#4A7A78', letterSpacing: '0.6px', textTransform: 'uppercase', margin: 0 }}>{children}</p>;
}
function HR() { return <div style={{ height: 1, background: '#1c1c1e' }} />; }
function Section({ title, icon, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 600, color: '#4A7A78', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
