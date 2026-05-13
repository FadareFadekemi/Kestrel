import { useState } from 'react';
import { Save, CheckCircle, AlertCircle, User, Building, FileText, Zap, Globe } from 'lucide-react';
import { authFetch } from '../services/authApi';
import useIsMobile from '../hooks/useIsMobile';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage({ user, onUserUpdated }) {
  const { colors: c } = useTheme();
  const isMobile = useIsMobile();
  const [form, setForm] = useState({
    name:               user?.name               || '',
    sender_title:       user?.senderTitle         || '',
    company_name:       user?.companyName         || '',
    product_description:user?.productDescription  || '',
    value_proposition:  user?.valueProposition    || '',
    website:            user?.website             || '',
  });
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setSaved(false); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await authFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Save failed');
      }
      const updated = await res.json();
      onUserUpdated?.(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isComplete = form.company_name.trim() && form.product_description.trim();

  const inputStyle = {
    width: '100%', background: c.card, border: `1px solid ${c.brd}`,
    borderRadius: 8, padding: '9px 12px', color: c.txt,
    fontSize: 13, outline: 'none', transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    fontSize: 11, fontWeight: 600, color: c.mut,
    letterSpacing: '0.5px', textTransform: 'uppercase',
    display: 'block', marginBottom: 6,
  };

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '28px 32px', overflowY: 'auto', height: '100%', maxWidth: 720 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: c.txt, margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 13, color: c.mut, marginTop: 4 }}>
          Your sender profile, used to personalise every outreach email techcori writes.
        </p>
      </div>

      {!isComplete && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: 'rgba(0,212,200,0.07)', border: '1px solid rgba(0,212,200,0.2)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 24,
        }}>
          <AlertCircle size={15} color="#00D4C8" style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#00D4C8', margin: 0 }}>Profile incomplete</p>
            <p style={{ fontSize: 12, color: '#92400e', margin: '3px 0 0', lineHeight: 1.5 }}>
              Fill in your company name and product description so techcori can write emails that pitch <em>your</em> product, not a generic placeholder.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave}>
        <Section title="Your Identity" icon={<User size={14} color="#00D4C8" />} colors={c}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <Field label="Your Name" placeholder="e.g. Sarah Johnson"
              value={form.name} onChange={v => set('name', v)}
              labelStyle={labelStyle} inputStyle={inputStyle} colors={c} />
            <Field label="Your Title" placeholder="e.g. Head of Sales"
              value={form.sender_title} onChange={v => set('sender_title', v)}
              labelStyle={labelStyle} inputStyle={inputStyle} colors={c} />
          </div>
        </Section>

        <Section title="Your Company" icon={<Building size={14} color="#00D4C8" />} colors={c}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="Company Name *" placeholder="e.g. Acme Inc."
              value={form.company_name} onChange={v => set('company_name', v)} required
              labelStyle={labelStyle} inputStyle={inputStyle} colors={c} />
            <Field label="Website" placeholder="e.g. acme.com"
              value={form.website} onChange={v => set('website', v)}
              labelStyle={labelStyle} inputStyle={inputStyle} colors={c} />
          </div>
        </Section>

        <Section title="What You Sell" icon={<FileText size={14} color="#00D4C8" />} colors={c}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Product / Service Description *</label>
            <textarea
              value={form.product_description}
              onChange={e => set('product_description', e.target.value)}
              placeholder="Describe what you sell in 2-4 sentences. The more specific, the better the emails.&#10;&#10;e.g. We help B2B SaaS companies automate their outbound sales process. Our platform researches leads, writes personalised emails, and tracks responses, reducing SDR research time by 80%."
              rows={5} required
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
            <p style={{ fontSize: 11, color: c.mut, marginTop: 5 }}>
              Tip: include your target customer, the problem you solve, and a concrete result.
            </p>
          </div>
          <Field
            label="One-line Value Proposition"
            placeholder="e.g. 3x more pipeline in 60 days, guaranteed."
            value={form.value_proposition} onChange={v => set('value_proposition', v)}
            labelStyle={labelStyle} inputStyle={inputStyle} colors={c}
          />
        </Section>

        {/* Preview */}
        {form.company_name && form.product_description && (
          <div style={{ background: c.card, border: `1px solid ${c.brd}`, borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
              <Zap size={12} color="#00D4C8" />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#00D4C8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email preview context</span>
            </div>
            <p style={{ fontSize: 12, color: c.mut, margin: 0, lineHeight: 1.6 }}>
              Emails will be written as <strong style={{ color: c.mut2 }}>{form.name || '{{senderName}}'}</strong>
              {form.sender_title && <>, <strong style={{ color: c.mut2 }}>{form.sender_title}</strong></>}
              {' '}at <strong style={{ color: c.mut2 }}>{form.company_name}</strong>, pitching:
              <em style={{ color: c.mut2 }}> "{form.product_description.slice(0, 120)}{form.product_description.length > 120 ? '…' : ''}"</em>
            </p>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <AlertCircle size={13} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
          </div>
        )}

        <button type="submit" disabled={saving} style={{
          background: saving ? c.brd : 'linear-gradient(135deg, #00D4C8, #00B8AD)',
          color: saving ? c.mut : c.bg,
          border: 'none', borderRadius: 10, padding: '10px 24px',
          fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
        }}>
          {saved
            ? <><CheckCircle size={14} /> Saved!</>
            : saving
            ? 'Saving...'
            : <><Save size={14} /> Save Profile</>
          }
        </button>
      </form>
    </div>
  );
}

function Section({ title, icon, children, colors: c }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #1c1c1e' }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 600, color: c.txt }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, placeholder, value, onChange, required, labelStyle, inputStyle, colors: c }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        style={inputStyle}
        onFocus={e => e.target.style.borderColor = '#00D4C8'}
        onBlur={e  => e.target.style.borderColor = c.brd}
      />
    </div>
  );
}
