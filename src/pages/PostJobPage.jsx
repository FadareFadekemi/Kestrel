import { useState } from 'react';
import { Briefcase, MapPin, DollarSign, FileText, Check, Zap, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { initiateListingPayment, verifyListingPayment } from '../services/paymentApi';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];

export default function PostJobPage({ user }) {
  const { colors: c } = useTheme();
  const [form, setForm] = useState({
    title: '', company: user?.companyName || '', location: '',
    description: '', salary_range: '', job_type: 'Full-time',
  });
  const [step, setStep] = useState('form'); // 'form' | 'paying' | 'success'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeListing, setActiveListing] = useState(null);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Job title is required.'); return; }
    if (!window.PaystackPop) {
      setError('Payment service is still loading. Please wait a moment and try again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { listing_id, reference, public_key, email, amount } = await initiateListingPayment(form);
      const handler = window.PaystackPop.setup({
        key: public_key,
        email,
        amount,
        ref: reference,
        onSuccess: async (tx) => {
          setStep('paying');
          try {
            const listing = await verifyListingPayment(listing_id, tx.reference);
            setActiveListing(listing);
            setStep('success');
          } catch (err) {
            setError('Payment succeeded but listing activation failed. Contact support.');
            setStep('form');
          }
        },
        onCancel: () => {
          setLoading(false);
          setStep('form');
        },
      });
      handler.openIframe();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success' && activeListing) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--success-dim)', border: '2px solid var(--success)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <Check size={28} color="var(--success)" strokeWidth={2.5} />
        </div>
        <h2 style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }}>
          Listing is live!
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 15, margin: '0 0 8px', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>{activeListing.title}</strong> is now visible to Pro job seekers via AI matching.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 28px' }}>
          Active for 30 days · Expires {activeListing.expiresAt ? new Date(activeListing.expiresAt).toLocaleDateString('en-NG', { dateStyle: 'long' }) : ''}
        </p>
        <button onClick={() => { setStep('form'); setForm({ title: '', company: user?.companyName || '', location: '', description: '', salary_range: '', job_type: 'Full-time' }); }} style={{
          background: 'var(--accent)', color: '#fff', border: 'none',
          borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          Post another job
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent-dim)', border: '1px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Briefcase size={18} color="var(--accent)" />
          </div>
          <h1 style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Post a Job
          </h1>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--accent-dim)', border: '1px solid var(--accent)',
          borderRadius: 8, padding: '8px 12px',
        }}>
          <Zap size={13} color="var(--accent)" fill="var(--accent)" />
          <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>
            ₦2,000 per listing · Active for 30 days · Matched to Pro job seekers automatically
          </span>
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'var(--error-dim)', border: '1px solid var(--error)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 20,
        }}>
          <AlertCircle size={15} color="var(--error)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: 'var(--error)' }}>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        <Field label="Job Title *" icon={<Briefcase size={14} />}>
          <input value={form.title} onChange={set('title')} placeholder="e.g. Senior Product Manager"
            required maxLength={300}
            style={inputStyle(c)} />
        </Field>

        <Field label="Company Name" icon={<Briefcase size={14} />}>
          <input value={form.company} onChange={set('company')} placeholder="Your company name"
            maxLength={200} style={inputStyle(c)} />
        </Field>

        <Field label="Location" icon={<MapPin size={14} />}>
          <input value={form.location} onChange={set('location')} placeholder="e.g. Lagos, Nigeria / Remote"
            maxLength={200} style={inputStyle(c)} />
        </Field>

        <Field label="Salary Range" icon={<DollarSign size={14} />}>
          <input value={form.salary_range} onChange={set('salary_range')} placeholder="e.g. ₦300,000 – ₦450,000/month"
            maxLength={200} style={inputStyle(c)} />
        </Field>

        <Field label="Job Type">
          <select value={form.job_type} onChange={set('job_type')} style={inputStyle(c)}>
            {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Job Description" icon={<FileText size={14} />}>
          <textarea
            value={form.description} onChange={set('description')}
            placeholder="Describe the role, responsibilities, requirements, and what makes it great…"
            rows={8} maxLength={5000}
            style={{ ...inputStyle(c), resize: 'vertical', lineHeight: 1.6 }}
          />
          <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
            {form.description.length}/5000
          </span>
        </Field>

        <button type="submit" disabled={loading} style={{
          background: loading ? 'var(--muted)' : 'var(--accent)',
          color: loading ? 'var(--muted-2)' : '#fff',
          border: 'none', borderRadius: 12, padding: '14px 0',
          fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s', marginTop: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Zap size={16} fill={loading ? 'transparent' : 'currentColor'} />
          {loading ? 'Processing…' : 'Pay ₦2,000 & Publish Listing'}
        </button>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, margin: 0 }}>
          Secured by Paystack · Receipt emailed after payment
        </p>
      </form>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span style={{ color: 'var(--accent)' }}>{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

function inputStyle(c) {
  return {
    background: 'var(--card)',
    border: '1.5px solid var(--border)',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    color: 'var(--text)',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  };
}
