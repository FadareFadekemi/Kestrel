import { useState } from 'react';
import { Zap, ArrowRight, Building2, Target, AlertCircle } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import { useTheme } from '../context/ThemeContext';

export default function ModeSelectPage({ onSelect }) {
  const { colors: c } = useTheme();
  const isMobile = useIsMobile();
  const [hovering, setHovering] = useState(null);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(null);

  const handleSelect = async (type) => {
    setLoading(type);
    setError('');
    await onSelect(type, (err) => setError(err));
    setLoading(null);
  };

  return (
    <div style={{
      minHeight: '100vh', background: c.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? '24px 16px' : 32,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 700, height: 500, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse, rgba(0,212,200,0.07) 0%, transparent 70%)',
      }} />

      <div style={{ width: '100%', maxWidth: 780, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #00D4C8, #00B8AD)',
            boxShadow: '0 0 28px rgba(0,212,200,0.3)', marginBottom: 16,
          }}>
            <Zap size={24} color={c.bg} fill={c.bg} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: c.txt, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            What brings you to techcori?
          </h1>
          <p style={{ fontSize: 14, color: c.mut, margin: 0 }}>
            Choose your account type — this cannot be changed later
          </p>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 20,
        }}>
          {/* Company card */}
          <ModeCard
            icon={<Building2 size={28} color="#00D4C8" />}
            iconBg="rgba(0,212,200,0.1)"
            badge="For Sales & GTM Teams"
            title="I'm a Company"
            description="Find leads, research companies, score them, and post verified job listings."
            features={['Lead research & scoring', 'AI email generation', 'Post job listings']}
            note="Work email required"
            buttonLabel={loading === 'company' ? 'Setting up…' : 'Get Started'}
            buttonStyle="filled"
            isHovered={hovering === 'company'}
            onMouseEnter={() => setHovering('company')}
            onMouseLeave={() => setHovering(null)}
            onClick={() => handleSelect('company')}
            disabled={!!loading}
          />

          {/* Job Seeker card */}
          <ModeCard
            icon={<Target size={28} color="#00D4C8" />}
            iconBg="rgba(0,212,200,0.1)"
            badge="For Job Seekers"
            title="I'm a Job Seeker"
            description="Build your CV, find companies hiring for your role, and reach hiring managers directly."
            features={['CV scoring & AI rewrite', 'Job listings & matching', 'Outreach assistant']}
            buttonLabel={loading === 'jobseeker' ? 'Setting up…' : 'Get Started'}
            buttonStyle="outlined"
            accentColor="#00D4C8"
            isHovered={hovering === 'jobseeker'}
            onMouseEnter={() => setHovering('jobseeker')}
            onMouseLeave={() => setHovering(null)}
            onClick={() => handleSelect('jobseeker')}
            disabled={!!loading}
          />
        </div>

        {error && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--error-dim)', border: '1px solid var(--error)', borderRadius: 10, padding: '12px 16px', marginTop: 20 }}>
            <AlertCircle size={14} color="var(--error)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: 'var(--error)' }}>{error}</span>
          </div>
        )}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted-2)', marginTop: 24 }}>
          Sharp Intelligence. Precise Outreach.
        </p>
      </div>
    </div>
  );
}

function ModeCard({ icon, iconBg, badge, title, description, features, note, buttonLabel, buttonStyle, accentColor = '#00D4C8', isHovered, onMouseEnter, onMouseLeave, onClick, disabled }) {
  const { colors: c } = useTheme();
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: isHovered ? '#1c1c1f' : c.card,
        border: `1px solid ${isHovered ? accentColor + '40' : c.brd}`,
        borderRadius: 16, padding: 28,
        cursor: 'pointer', transition: 'all 0.2s ease',
        display: 'flex', flexDirection: 'column', gap: 20,
        boxShadow: isHovered ? `0 8px 32px rgba(0,0,0,0.3)` : 'none',
        transform: isHovered ? 'translateY(-2px)' : 'none',
      }}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => !disabled && (e.key === 'Enter' || e.key === ' ') && onClick()}
    >
      {/* Header */}
      <div>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase',
          color: accentColor, background: accentColor + '15',
          borderRadius: 4, padding: '3px 8px', display: 'inline-block', marginBottom: 16,
        }}>{badge}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {icon}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: c.txt, margin: 0 }}>{title}</h2>
        </div>

        <p style={{ fontSize: 13, color: c.mut, lineHeight: 1.65, margin: 0 }}>{description}</p>
      </div>

      {/* Features */}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: c.mut2 }}>{f}</span>
          </li>
        ))}
      </ul>
      {note && (
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)', background: 'var(--warning-dim)', borderRadius: 6, padding: '3px 8px', display: 'inline-block' }}>
          {note}
        </span>
      )}

      {/* Button */}
      <button
        onClick={e => { e.stopPropagation(); onClick(); }}
        style={{
          width: '100%', padding: '11px 0', borderRadius: 10,
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.15s',
          ...(buttonStyle === 'filled'
            ? { background: 'linear-gradient(135deg, #00D4C8, #00B8AD)', color: c.bg, border: 'none' }
            : { background: 'transparent', color: accentColor, border: `1.5px solid ${accentColor}` }
          ),
        }}
      >
        {buttonLabel} <ArrowRight size={15} />
      </button>
    </div>
  );
}
