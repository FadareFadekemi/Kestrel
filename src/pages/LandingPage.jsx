import { useState, useEffect, useRef } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import {
  Zap, Search, Mail, FileText, Briefcase, Shield, Check,
  ChevronRight, Star, TrendingUp, Target, Users, BarChart2,
  AlertTriangle, CheckCircle, XCircle, ArrowRight, Building2,
  Loader, Wand2, Globe, Menu, X,
} from 'lucide-react';

// ── Scroll reveal hook ───────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) el.classList.add('visible'); },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

// ── Animated counter hook ────────────────────────────────────────────────────
function useCounter(target, active) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let cur = 0;
    const step = target / 60;
    const id = setInterval(() => {
      cur += step;
      if (cur >= target) { setN(target); clearInterval(id); }
      else setN(Math.floor(cur));
    }, 24);
    return () => clearInterval(id);
  }, [target, active]);
  return n;
}

const A  = '#00D4C8';
const AD = 'rgba(0,212,200,0.08)';
const AB = 'rgba(0,212,200,0.18)';
const V  = '#00D4C8';
const VD = 'rgba(0,212,200,0.08)';
const VB = 'rgba(0,212,200,0.18)';
const BG   = '#0A0F0F';
const CARD = '#111A1A';
const BRD  = '#1E3030';

// ── Small reusables ───────────────────────────────────────────────────────────
const Pill = ({ children, color = A }) => (
  <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`,
    border: `1px solid ${color}30`, borderRadius: 20, padding: '3px 10px',
    letterSpacing: '0.04em', textTransform: 'uppercase' }}>
    {children}
  </span>
);

const GradBtn = ({ onClick, children, style = {} }) => (
  <button onClick={onClick} style={{
    background: `linear-gradient(135deg, ${A}, #00B8AD)`,
    color: BG, border: 'none', borderRadius: 10, padding: '12px 24px',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(0,212,200,0.3)', ...style,
  }}>
    {children}
  </button>
);

const OutlineBtn = ({ onClick, children, color = A, style = {} }) => (
  <button onClick={onClick} style={{
    background: 'transparent', color,
    border: `1.5px solid ${color}`, borderRadius: 10, padding: '11px 24px',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', ...style,
  }}>
    {children}
  </button>
);

// ── Mini ScoreBar ─────────────────────────────────────────────────────────────
const MiniBar = ({ label, pct, color }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 10, color: '#4A7A78' }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color }}>{pct}</span>
    </div>
    <div style={{ height: 4, background: BRD, borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: pct, background: color, borderRadius: 2,
        animation: 'bar-grow 1.2s ease forwards' }} />
    </div>
  </div>
);

// ── Hero mockup ───────────────────────────────────────────────────────────────
function HeroMockup() {
  const isMobile = useIsMobile();
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 520 }}>
      {/* Glow behind */}
      <div className="animate-glow" style={{
        position: 'absolute', inset: -30, borderRadius: 32,
        background: `radial-gradient(ellipse at 30% 50%, ${AD} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div className="animate-float" style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14,
        filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.6))',
      }}>
        {/* Company card */}
        <div style={{ background: CARD, border: `1px solid ${BRD}`, borderRadius: 14,
          padding: 16, borderTop: `2px solid ${A}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Search size={12} color={A} />
            <span style={{ fontSize: 11, fontWeight: 700, color: A, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Company Intel</span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#E8F5F4', margin: '0 0 2px' }}>Paystack</p>
          <p style={{ fontSize: 10, color: '#4A7A78', margin: '0 0 10px' }}>Lagos · Fintech</p>
          <div style={{ textAlign: 'center', margin: '8px 0 12px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${A}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: A }}>87</span>
            </div>
            <span style={{ fontSize: 9, color: '#4A7A78' }}>Overall Fit</span>
          </div>
          <div style={{ fontSize: 10, color: '#8ABAB8', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <CheckCircle size={9} color="#34d399" /> Hiring signals: 4
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle size={9} color="#34d399" /> Product roles open
            </div>
          </div>
          <div style={{ background: AD, border: `1px solid ${AB}`, borderRadius: 7,
            padding: '6px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: A }}>
            Write Email →
          </div>
        </div>

        {/* CV card */}
        <div style={{ background: CARD, border: `1px solid ${BRD}`, borderRadius: 14,
          padding: 16, borderTop: `2px solid ${V}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <FileText size={12} color={V} />
            <span style={{ fontSize: 11, fontWeight: 700, color: V, letterSpacing: '0.05em', textTransform: 'uppercase' }}>CV Score</span>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${V}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: V }}>78</span>
            </div>
            <span style={{ fontSize: 9, color: '#4A7A78' }}>out of 100</span>
          </div>
          <MiniBar label="Content"  pct="84%" color={A} />
          <MiniBar label="Keywords" pct="72%" color={V} />
          <MiniBar label="Format"   pct="65%" color="#34d399" />
          <div style={{ marginTop: 10, background: VD, border: `1px solid ${VB}`,
            borderRadius: 7, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Wand2 size={9} color={V} />
            <span style={{ fontSize: 9, fontWeight: 700, color: V }}>3 improvements found</span>
          </div>
        </div>

        {/* Bottom row, match score + follow-up */}
        <div style={{ background: CARD, border: `1px solid ${BRD}`, borderRadius: 12,
          padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(52,211,153,0.12)',
            border: '2px solid rgba(52,211,153,0.4)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#34d399' }}>94</span>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#E8F5F4', margin: 0 }}>Match Score</p>
            <p style={{ fontSize: 9, color: '#4A7A78', margin: 0 }}>Flutterwave · PM role</p>
          </div>
        </div>

        <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)',
          borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <Shield size={11} color="#34d399" />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#34d399' }}>Scam Check</span>
          </div>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#34d399', margin: 0 }}>✓ Safe, Verified</p>
          <p style={{ fontSize: 9, color: '#4A7A78', margin: '2px 0 0' }}>0 red flags detected</p>
        </div>
      </div>
    </div>
  );
}

// ── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, color = A, delay = 0 }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal reveal-delay-${delay}`}
      style={{ background: CARD, border: `1px solid ${BRD}`, borderRadius: 14,
        padding: 24, transition: 'border-color 0.2s, transform 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}50`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BRD; e.currentTarget.style.transform = 'none'; }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: `${color}15`,
        border: `1px solid ${color}30`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', marginBottom: 14 }}>
        {icon}
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#E8F5F4', margin: '0 0 6px' }}>{title}</p>
      <p style={{ fontSize: 13, color: '#4A7A78', margin: 0, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

// ── Step ──────────────────────────────────────────────────────────────────────
function Step({ n, icon, title, desc, color = A }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${color}15`,
          border: `2px solid ${color}40`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 14, fontWeight: 800, color }}>
          {n}
        </div>
        {n < 3 && <div style={{ width: 2, height: 32, background: `${color}20`,
          margin: '6px auto' }} />}
      </div>
      <div style={{ paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          {icon}
          <p style={{ fontSize: 14, fontWeight: 700, color: '#E8F5F4', margin: 0 }}>{title}</p>
        </div>
        <p style={{ fontSize: 13, color: '#4A7A78', margin: 0, lineHeight: 1.6 }}>{desc}</p>
      </div>
    </div>
  );
}

// ── Scam detector (public) ───────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL || '';

async function publicDetect(text) {
  const res = await fetch(`${BASE}/api/public/scam-detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Detection failed');
  return res.json();
}

// Simple keyword fallback when backend unavailable
function keywordRisk(text) {
  const lower = text.toLowerCase();
  const flags = ['upfront payment', 'no company', 'whatsapp only', 'you are selected',
    'bank details', 'bvn', 'transfer', 'send money', 'registration fee', 'starter kit'];
  const hits = flags.filter(f => lower.includes(f)).length;
  if (hits === 0) return { risk_level: 'Safe',        scam_signals: [], explanation: 'No obvious red flags in this listing.' };
  if (hits <= 2)  return { risk_level: 'Suspicious',  scam_signals: [], explanation: 'Some warning signs detected. Verify the company independently.' };
  return           { risk_level: 'Likely Scam',   scam_signals: [], explanation: 'Multiple red flags found. Do not pay any money or share personal details.' };
}

function ScamDetectorWidget({ onGetStarted }) {
  const [text,    setText]    = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  const analyse = async () => {
    if (!text.trim() || text.length < 20) return;
    setLoading(true); setResult(null);
    try { setResult(await publicDetect(text)); }
    catch  { setResult(keywordRisk(text)); }
    setLoading(false);
  };

  const riskStyle = {
    Safe:        { color: '#34d399', icon: <CheckCircle size={18} color="#34d399" />, border: 'rgba(52,211,153,0.25)',  bg: 'rgba(52,211,153,0.07)'  },
    Suspicious:  { color: A,         icon: <AlertTriangle size={18} color={A} />,     border: AB,                       bg: AD                         },
    'Likely Scam':{ color: '#f87171', icon: <XCircle size={18} color="#f87171" />,     border: 'rgba(248,113,113,0.25)', bg: 'rgba(248,113,113,0.07)' },
  };

  const r = result ? riskStyle[result.risk_level] : null;

  return (
    <div>
      <textarea value={text} onChange={e => { setText(e.target.value); setResult(null); }}
        placeholder="Paste a job listing, WhatsApp message, or recruiter email here…"
        rows={5}
        style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: `1px solid ${AB}`,
          borderRadius: 10, padding: '12px 16px', color: '#E8F5F4', fontSize: 14,
          outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6,
          boxSizing: 'border-box', transition: 'border-color 0.15s' }}
        onFocus={e => (e.target.style.borderColor = A)}
        onBlur={e  => (e.target.style.borderColor = AB)} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'rgba(0,212,200,0.5)' }}>{text.length} chars · No account needed</span>
        <button onClick={analyse} disabled={loading || text.length < 20}
          style={{ display: 'flex', alignItems: 'center', gap: 7,
            background: (loading || text.length < 20) ? 'rgba(0,212,200,0.08)' : `linear-gradient(135deg, ${A}, #00B8AD)`,
            color: (loading || text.length < 20) ? A : BG,
            border: `1px solid ${AB}`, borderRadius: 9, padding: '10px 22px',
            fontSize: 13, fontWeight: 700, cursor: (loading || text.length < 20) ? 'not-allowed' : 'pointer',
            opacity: text.length < 20 ? 0.5 : 1 }}>
          {loading ? <Loader size={14} className="animate-spin-icon" /> : <Shield size={14} />}
          {loading ? 'Analysing…' : 'Check for Scams'}
        </button>
      </div>

      {result && r && (
        <div style={{ marginTop: 14, background: r.bg, border: `1px solid ${r.border}`,
          borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            {r.icon}
            <span style={{ fontSize: 15, fontWeight: 700, color: r.color }}>{result.risk_level}</span>
          </div>
          <p style={{ fontSize: 13, color: r.color, opacity: 0.85, margin: '0 0 8px', lineHeight: 1.6 }}>{result.explanation}</p>
          {result.scam_signals?.length > 0 && (
            <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
              {result.scam_signals.slice(0, 3).map((s, i) => (
                <li key={i} style={{ fontSize: 12, color: r.color, opacity: 0.7, marginBottom: 4 }}>{s}</li>
              ))}
            </ul>
          )}
          <p style={{ fontSize: 11, color: r.color, opacity: 0.5, margin: '10px 0 0' }}>
            <span onClick={onGetStarted} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Sign up free</span> for AI-powered deep analysis
          </p>
        </div>
      )}
    </div>
  );
}

// ── Testimonial card ──────────────────────────────────────────────────────────
function Testimonial({ name, role, company, text, color = A }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BRD}`, borderRadius: 14, padding: 24, flex: 1 }}>
      <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
        {[1,2,3,4,5].map(i => <Star key={i} size={13} color={color} fill={color} />)}
      </div>
      <p style={{ fontSize: 14, color: '#C5E8E6', margin: '0 0 20px', lineHeight: 1.7, fontStyle: 'italic' }}>"{text}"</p>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#E8F5F4', margin: 0 }}>{name}</p>
        <p style={{ fontSize: 12, color: '#4A7A78', margin: '2px 0 0' }}>{role} · {company}</p>
      </div>
    </div>
  );
}

// ── Pricing tier ─────────────────────────────────────────────────────────────
function PricingTier({ name, price, period, features, cta, highlight, onGetStarted }) {
  return (
    <div style={{ background: highlight ? `linear-gradient(135deg, ${AD}, rgba(0,212,200,0.06))` : CARD,
      border: `1px solid ${highlight ? AB : BRD}`, borderRadius: 14, padding: 24, flex: 1 }}>
      {highlight && <div style={{ marginBottom: 10 }}><Pill>Most Popular</Pill></div>}
      <p style={{ fontSize: 13, fontWeight: 600, color: '#8ABAB8', margin: '0 0 6px' }}>{name}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: '#E8F5F4' }}>{price}</span>
        {period && <span style={{ fontSize: 13, color: '#4A7A78' }}>{period}</span>}
      </div>
      <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#8ABAB8' }}>
            <Check size={14} color="#34d399" style={{ flexShrink: 0, marginTop: 1 }} /> {f}
          </li>
        ))}
      </ul>
      <button onClick={onGetStarted}
        style={{ width: '100%', background: highlight ? `linear-gradient(135deg, ${A}, #00B8AD)` : 'transparent',
          color: highlight ? BG : A, border: `1.5px solid ${highlight ? 'transparent' : AB}`,
          borderRadius: 9, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
        {cta}
      </button>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function LandingPage({ onGetStarted }) {
  const isMobile = useIsMobile();
  const [howTab,     setHowTab]     = useState('company');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);

  const statsRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const c1 = useCounter(500,  statsVisible);
  const c2 = useCounter(1200, statsVisible);
  const c3 = useCounter(3400, statsVisible);

  // Pre-create refs for major sections
  const heroRef        = useReveal();
  const compRef        = useReveal();
  const compMockupRef  = useReveal();
  const seekerRef      = useReveal();
  const seekerMockupRef = useReveal();
  const howRef         = useReveal();
  const scamRef        = useReveal();
  const pricingRef     = useReveal();
  const testiRef       = useReveal();

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenu(false);
  };

  return (
    <div style={{ background: BG, color: '#E8F5F4', minHeight: '100vh', fontFamily: 'inherit' }}>

      {/* ── Navbar ───────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled || mobileMenu ? 'rgba(10,15,15,0.97)' : 'transparent',
        backdropFilter: 'blur(16px)',
        borderBottom: scrolled ? `1px solid ${BRD}` : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 20px', height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8,
              background: `linear-gradient(135deg, ${A}, #00B8AD)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 14px rgba(0,212,200,0.4)' }}>
              <Zap size={15} color={BG} fill={BG} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.5px', color: A,
              fontFamily: "'Clash Display', sans-serif" }}>techcori</span>
          </div>

          {/* Desktop nav links — hidden on mobile */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              {[['Features', 'features'], ['How it Works', 'how'], ['Pricing', 'pricing']].map(([l, id]) => (
                <button key={id} onClick={() => scrollTo(id)}
                  style={{ background: 'none', border: 'none', color: '#4A7A78', fontSize: 14,
                    cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#E8F5F4')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#4A7A78')}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {!isMobile && (
              <button onClick={onGetStarted}
                style={{ background: 'none', border: 'none', color: '#8ABAB8', fontSize: 13, cursor: 'pointer' }}>
                Sign In
              </button>
            )}
            <GradBtn onClick={onGetStarted} style={{ padding: isMobile ? '8px 14px' : '9px 18px', fontSize: 13 }}>
              {isMobile ? 'Join' : 'Get Started →'}
            </GradBtn>
            {isMobile && (
              <button onClick={() => setMobileMenu(m => !m)}
                style={{ background: 'none', border: `1px solid ${BRD}`, borderRadius: 8,
                  color: '#E8F5F4', cursor: 'pointer', padding: '6px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center' }}>
                {mobileMenu ? <X size={18} /> : <Menu size={18} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {isMobile && mobileMenu && (
          <div style={{ borderTop: `1px solid ${BRD}`, padding: '12px 20px 20px',
            display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[['Features', 'features'], ['How it Works', 'how'], ['Pricing', 'pricing']].map(([l, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{ background: 'none', border: 'none', color: '#E8F5F4', fontSize: 15,
                  cursor: 'pointer', textAlign: 'left', padding: '10px 0',
                  borderBottom: `1px solid ${BRD}` }}>
                {l}
              </button>
            ))}
            <button onClick={() => { setMobileMenu(false); onGetStarted(); }}
              style={{ background: 'none', border: 'none', color: '#4A7A78', fontSize: 15,
                cursor: 'pointer', textAlign: 'left', padding: '10px 0' }}>
              Sign In
            </button>
          </div>
        )}
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="grid-bg" style={{ paddingTop: 'calc(120px + env(safe-area-inset-top, 0px))', paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 600, borderRadius: '50%',
          background: `radial-gradient(ellipse, ${AD} 0%, transparent 70%)`,
          pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)',
          gap: isMobile ? 40 : 64, alignItems: 'center' }}>

          {/* Left: Text */}
          <div ref={heroRef} className="reveal" style={{ maxWidth: 520 }}>
            <div style={{ marginBottom: 20 }}>
              <Pill>AI Platform · Built for Nigeria</Pill>
            </div>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 900,
              lineHeight: 1.1, letterSpacing: '-1.5px', color: '#E8F5F4', margin: '0 0 20px' }}>
              The AI platform that finds your next{' '}
              <span style={{ background: `linear-gradient(135deg, ${A}, #00D4C8)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text' }}>
                client, and your next job
              </span>
            </h1>
            <p style={{ fontSize: isMobile ? 16 : 18, color: '#4A7A78', lineHeight: 1.7, margin: '0 0 32px', maxWidth: 440 }}>
              techcori gives companies sharp lead intelligence and job seekers a competitive edge,{' '}
              <span style={{ color: '#8ABAB8' }}>powered by the same AI engine.</span>
            </p>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12 }}>
              <GradBtn onClick={onGetStarted} style={isMobile ? { width: '100%' } : {}}>
                I am a Company →
              </GradBtn>
              <OutlineBtn onClick={onGetStarted} color={A} style={isMobile ? { width: '100%', textAlign: 'center' } : {}}>
                I am a Job Seeker →
              </OutlineBtn>
            </div>
            <p style={{ fontSize: 12, color: '#264040', margin: '16px 0 0' }}>
              Free to start · No credit card required
            </p>
          </div>

          {/* Right: Mockup */}
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ── Social Proof Bar ─────────────────────────────────────────────────── */}
      <div ref={statsRef} id="features"
        style={{ background: CARD, borderTop: `1px solid ${BRD}`, borderBottom: `1px solid ${BRD}`,
          padding: '40px 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#4A7A78', margin: '0 0 28px', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
            Built for Nigeria. Trusted by founders and job seekers.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, maxWidth: 600, margin: '0 auto' }}>
            {[
              { n: c1, suffix: '+', label: 'Companies Researched' },
              { n: c2, suffix: '+', label: 'CVs Analysed' },
              { n: c3, suffix: '+', label: 'Emails Sent' },
            ].map(({ n, suffix, label }) => (
              <div key={label}>
                <div style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 900, color: A, letterSpacing: '-1px' }}>
                  {n.toLocaleString()}{suffix}
                </div>
                <div style={{ fontSize: 12, color: '#4A7A78', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Company Features ─────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div ref={compRef} className="reveal" style={{ marginBottom: 56, maxWidth: 560 }}>
            <Pill color={A}>For Companies</Pill>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 800, letterSpacing: '-1px',
              color: '#E8F5F4', margin: '14px 0 14px', lineHeight: 1.15 }}>
              Find, Research, and Close
            </h2>
            <p style={{ fontSize: 16, color: '#4A7A78', lineHeight: 1.7, margin: 0 }}>
              Stop guessing which companies to target. techcori researches prospects in seconds, scores them by fit, and writes the email.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <FeatureCard delay={1} color={A}
              icon={<Search size={18} color={A} />}
              title="Lead Intelligence"
              desc="Research any company instantly. Get hiring signals, recent news, culture insights, and growth stage, all in one view." />
            <FeatureCard delay={2} color={A}
              icon={<Target size={18} color={A} />}
              title="Smart Scoring"
              desc="Every company is scored across Role Fit, Culture Fit, Growth Stage, and Hiring Activity. Focus only on the best opportunities." />
            <FeatureCard delay={3} color={A}
              icon={<Mail size={18} color={A} />}
              title="Personalised Outreach"
              desc="AI writes cold emails referencing real company news. Send directly from the app. Three tones: Consultative, Formal, Casual." />
          </div>

          {/* Company mockup preview */}
          <div ref={compMockupRef} className="reveal" style={{ marginTop: 56 }}>
            <div className="animate-float-slow" style={{ background: CARD, border: `1px solid ${BRD}`,
              borderRadius: 18, padding: 24, maxWidth: 680,
              boxShadow: `0 0 60px ${AD}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f87171' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: A }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399' }} />
                <span style={{ fontSize: 11, color: '#4A7A78', marginLeft: 8 }}>techcori · Company Intelligence</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#4A7A78', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Profile</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#E8F5F4', margin: '0 0 4px' }}>Flutterwave</p>
                  <p style={{ fontSize: 12, color: '#4A7A78', margin: '0 0 16px' }}>Lagos · Fintech · 500-1000 employees</p>
                  {[['Role Fit', 91, A], ['Culture Fit', 84, V], ['Hiring Activity', 78, '#34d399'], ['Overall', 87, A]].map(([l, v, c]) => (
                    <MiniBar key={l} label={l} pct={`${v}%`} color={c} />
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#4A7A78', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hiring Signals</p>
                  {['Expanding product team (Q4 2025)', 'Senior engineer roles posted', '4 open positions on careers page', 'Recent Series C announcement'].map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', flexShrink: 0, marginTop: 5 }} />
                      <span style={{ fontSize: 12, color: '#8ABAB8', lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 16, background: AD, border: `1px solid ${AB}`,
                    borderRadius: 9, padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: A }}>✉ Write Outreach Email</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Job Seeker Features ──────────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px', background: 'rgba(0,212,200,0.02)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div ref={seekerRef} className="reveal" style={{ marginBottom: 56, maxWidth: 560 }}>
            <Pill color={V}>For Job Seekers</Pill>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 800, letterSpacing: '-1px',
              color: '#E8F5F4', margin: '14px 0 14px', lineHeight: 1.15 }}>
              Stand Out and Get Hired
            </h2>
            <p style={{ fontSize: 16, color: '#4A7A78', lineHeight: 1.7, margin: 0 }}>
              The Nigerian job market is competitive. techcori gives you the tools to be the candidate every hiring manager remembers.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <FeatureCard delay={1} color={V}
              icon={<FileText size={18} color={V} />}
              title="CV Optimiser"
              desc="Get a score out of 100 across Content, Format, and Keywords. AI rewrites your summary and bullet points for maximum impact." />
            <FeatureCard delay={2} color={V}
              icon={<Building2 size={18} color={V} />}
              title="Smart Job Matching"
              desc="techcori finds companies actively hiring for your profile, scored by role fit, culture, and growth stage. No scrolling job boards." />
            <FeatureCard delay={3} color={V}
              icon={<Mail size={18} color={V} />}
              title="Outreach Assistant"
              desc="Don't email HR@company.com. techcori finds the hiring manager and writes a personalised cold email referencing real company news." />
            <FeatureCard delay={4} color="#34d399"
              icon={<Shield size={18} color="#34d399" />}
              title="Scam Detector"
              desc="Is that job real? AI analyses any listing or recruiter message for scam signals. Protect yourself before you share personal details." />
          </div>

          {/* CV mockup preview */}
          <div ref={seekerMockupRef} className="reveal" style={{ marginTop: 56 }}>
            <div className="animate-float-slow" style={{ background: CARD, border: `1px solid ${BRD}`,
              borderRadius: 18, padding: 24, maxWidth: 680,
              boxShadow: `0 0 60px ${VD}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f87171' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: A }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399' }} />
                <span style={{ fontSize: 11, color: '#4A7A78', marginLeft: 8 }}>techcori · CV Optimiser</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr', gap: 24, alignItems: 'start' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 84, height: 84, borderRadius: '50%',
                    border: `5px solid ${V}`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', margin: '0 auto 8px',
                    boxShadow: `0 0 24px ${VD}` }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: V }}>78</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#4A7A78', margin: 0 }}>CV Score</p>
                  <p style={{ fontSize: 11, color: '#264040', margin: '4px 0 0' }}>out of 100</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#4A7A78', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score Breakdown</p>
                  <MiniBar label="Content (40pts)"  pct="84%" color={V} />
                  <MiniBar label="Format (25pts)"   pct="72%" color={A} />
                  <MiniBar label="Keywords (25pts)" pct="65%" color="#34d399" />
                  <MiniBar label="Length (10pts)"   pct="90%" color="#60a5fa" />
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['Add quantified achievements to Experience bullets', 'Include "Python" and "SQL" in your Skills section'].map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: VD,
                        border: `1px solid ${VB}`, borderRadius: 7, padding: '8px 10px' }}>
                        <Wand2 size={11} color={V} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 11, color: '#8ABAB8', lineHeight: 1.5 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────────── */}
      <section id="how" style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div ref={howRef} className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 800, letterSpacing: '-1px',
              color: '#E8F5F4', margin: '0 0 16px' }}>
              How It Works
            </h2>
            <p style={{ fontSize: 16, color: '#4A7A78', margin: '0 0 28px' }}>
              From zero to outreach in under 5 minutes.
            </p>
            <div style={{ display: 'inline-flex', background: CARD, border: `1px solid ${BRD}`,
              borderRadius: 12, padding: 4, gap: 4 }}>
              {[['company', 'For Companies', A], ['jobseeker', 'For Job Seekers', V]].map(([id, label, color]) => (
                <button key={id} onClick={() => setHowTab(id)}
                  style={{ padding: '8px 20px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600,
                    background: howTab === id ? `${color}20` : 'transparent',
                    color: howTab === id ? color : '#4A7A78', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: CARD, border: `1px solid ${BRD}`, borderRadius: 18, padding: 40 }}>
            {howTab === 'company' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <Step n={1} color={A}
                  icon={<Search size={15} color={A} />}
                  title="Enter a company name or URL"
                  desc="techcori researches the company using real-time web intelligence, no manual Googling required." />
                <Step n={2} color={A}
                  icon={<BarChart2 size={15} color={A} />}
                  title="Get a full intelligence profile"
                  desc="See their hiring signals, growth stage, culture, and a score across 4 dimensions. Know before you reach out." />
                <Step n={3} color={A}
                  icon={<Mail size={15} color={A} />}
                  title="Send a personalised email"
                  desc="AI drafts a cold email referencing real company news. Review, customise, and send directly from techcori." />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <Step n={1} color={V}
                  icon={<FileText size={15} color={V} />}
                  title="Upload or paste your CV"
                  desc="techcori scores your CV across Content, Format, Keywords, and Length, and shows you exactly what to fix." />
                <Step n={2} color={V}
                  icon={<Building2 size={15} color={V} />}
                  title="Get matched to hiring companies"
                  desc="AI finds companies actively hiring for your profile in Nigeria, ranked by how well you fit the role." />
                <Step n={3} color={V}
                  icon={<Mail size={15} color={V} />}
                  title="Send outreach to the hiring manager"
                  desc="Skip the generic job portal. techcori writes a personalised email to the person who can actually hire you." />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Scam Detector Callout ─────────────────────────────────────────────── */}
      <section ref={scamRef} className="reveal"
        style={{ padding: '80px 24px', background: `linear-gradient(135deg, ${AD}, rgba(0,212,200,0.04))`,
          borderTop: `1px solid ${AB}`, borderBottom: `1px solid ${AB}` }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: AD,
              border: `1px solid ${AB}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color={A} />
            </div>
            <Pill color={A}>Free Tool · No Sign-up</Pill>
          </div>
          <h2 style={{ fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 800, letterSpacing: '-1px',
            color: '#E8F5F4', margin: '0 0 12px', lineHeight: 1.2 }}>
            Is that job real?{' '}
            <span style={{ background: `linear-gradient(135deg, ${A}, #00D4C8)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text' }}>
              Find out in seconds.
            </span>
          </h2>
          <p style={{ fontSize: 15, color: '#4A7A78', margin: '0 0 28px', lineHeight: 1.7 }}>
            Job scams are rampant in Nigeria. Paste any listing or recruiter message and our AI will analyse it for red flags, instantly, for free.
          </p>
          <ScamDetectorWidget onGetStarted={onGetStarted} />
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div ref={pricingRef} className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 800, letterSpacing: '-1px',
              color: '#E8F5F4', margin: '0 0 12px' }}>
              Simple Pricing
            </h2>
            <p style={{ fontSize: 16, color: '#4A7A78', margin: 0 }}>Start free. Upgrade when you're ready.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>

            {/* Job Seeker */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: V, textTransform: 'uppercase',
                letterSpacing: '0.06em', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Briefcase size={14} /> For Job Seekers
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <PricingTier onGetStarted={onGetStarted}
                  name="Free" price="₦0" period="" cta="Start Free"
                  features={['CV upload and tips', 'Scam Detector (5/day)', 'Basic job match suggestions', 'Applications tracker (20 apps)']} />
                <PricingTier onGetStarted={onGetStarted} highlight
                  name="Premium" price="₦1,500" period="/month" cta="Go Premium"
                  features={['AI CV scoring + full rewrite', 'Unlimited scam detection', 'Smart job matching (AI-powered)', 'Outreach assistant (10 emails/month)', 'JD Matcher + keyword analysis', 'Applications tracker (unlimited)']} />
              </div>
            </div>

            {/* Company */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: A, textTransform: 'uppercase',
                letterSpacing: '0.06em', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={14} /> For Companies
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <PricingTier onGetStarted={onGetStarted}
                  name="Starter" price="$29" period="/month" cta="Start Free Trial"
                  features={['50 company researches/month', 'Full intelligence profiles', '50 AI-written emails', 'Lead tracking & CRM', 'Email sending integration']} />
                <PricingTier onGetStarted={onGetStarted} highlight
                  name="Pro" price="$99" period="/month" cta="Start Free Trial"
                  features={['Unlimited research', 'A/B email variants', 'Follow-up sequences', 'Batch processing (CSV import)', 'Priority support', 'Team seats (5 users)']} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px', background: CARD, borderTop: `1px solid ${BRD}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div ref={testiRef} className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 800, letterSpacing: '-1px',
              color: '#E8F5F4', margin: '0 0 12px' }}>
              What people are saying
            </h2>
            <p style={{ fontSize: 15, color: '#4A7A78', margin: 0 }}>Early users across Lagos, Abuja, and Port Harcourt</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <Testimonial
              color={A}
              name="Adebayo Okafor"
              role="Founder" company="GrowthHub NG"
              text="I used to spend hours manually researching prospects. techcori does it in 60 seconds and writes the cold email. Our reply rate went from 3% to 18% in one month." />
            <Testimonial
              color={V}
              name="Chidinma Eze"
              role="Product Manager" company="Lagos"
              text="I got 3 interview invites in 2 weeks using the Outreach Assistant. The emails feel personal, hiring managers actually respond. Nothing like the generic stuff from job boards." />
            <Testimonial
              color="#34d399"
              name="Emeka Nwosu"
              role="Sales Lead" company="Techstart Africa"
              text="The company intelligence is genuinely impressive. It surfaces hiring signals I wouldn't have found on my own. We've closed 2 enterprise deals this quarter from techcori leads." />
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section className="grid-bg" style={{ padding: '100px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 600, height: 400, borderRadius: '50%',
          background: `radial-gradient(ellipse, ${AD} 0%, transparent 70%)`,
          pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, letterSpacing: '-1.5px',
            color: '#E8F5F4', margin: '0 0 16px', lineHeight: 1.1 }}>
            work smart,{' '}
            <span style={{ background: `linear-gradient(135deg, ${A}, #00D4C8)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text' }}>
              rise sharp.
            </span>
          </h2>
          <p style={{ fontSize: 17, color: '#4A7A78', margin: '0 0 36px', lineHeight: 1.7 }}>
            Join founders and job seekers across Nigeria who use techcori to move faster and smarter.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <GradBtn onClick={onGetStarted} style={{ padding: '14px 32px', fontSize: 15 }}>
              Get Started Free →
            </GradBtn>
            <OutlineBtn onClick={() => scrollTo('features')} color="#4A7A78">
              See how it works
            </OutlineBtn>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#060A0A', borderTop: `1px solid ${BRD}`, padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr auto', gap: isMobile ? 24 : 40, alignItems: 'start', marginBottom: 40 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8,
                  background: `linear-gradient(135deg, ${A}, #00B8AD)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={13} color={BG} fill={BG} />
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: A, fontFamily: "'Clash Display', sans-serif" }}>techcori</span>
              </div>
              <p style={{ fontSize: 12, color: '#4A7A78', margin: 0, lineHeight: 1.6, maxWidth: 200 }}>
                work smart, rise sharp
              </p>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              {[
                { heading: 'Product', links: ['Features', 'How it Works', 'Pricing', 'Changelog'] },
                { heading: 'Company', links: ['About', 'Contact', 'Privacy', 'Terms'] },
              ].map(({ heading, links }) => (
                <div key={heading}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#4A7A78', margin: '0 0 12px',
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>{heading}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {links.map(l => (
                      <span key={l} style={{ fontSize: 13, color: '#4A7A78', cursor: 'pointer',
                        transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#8ABAB8')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#4A7A78')}>
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
              <GradBtn onClick={onGetStarted} style={{ padding: '10px 20px', fontSize: 13, marginBottom: 12 }}>
                Get Started →
              </GradBtn>
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${BRD}`, paddingTop: 20,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ fontSize: 12, color: '#264040', margin: 0 }}>
              © 2025 techcori. All rights reserved.
            </p>
            <p style={{ fontSize: 12, color: '#264040', margin: 0 }}>
              Built in Nigeria 
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
