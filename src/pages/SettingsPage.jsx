import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, User, Building, FileText, Zap, Globe,
         ShieldCheck, ShieldAlert, Mail, Link, Hash, RefreshCw, ExternalLink,
         CreditCard, Star, XCircle } from 'lucide-react';
import { authFetch } from '../services/authApi';
import useIsMobile from '../hooks/useIsMobile';
import { useTheme } from '../context/ThemeContext';
import { getSubscriptionStatus, cancelSubscription } from '../services/usageApi';

export default function SettingsPage({ user, onUserUpdated, userPlan, onPricing }) {
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

  // Verification state
  const [emailVerified,    setEmailVerified]    = useState(user?.emailVerified || false);
  const [domainVerified,   setDomainVerified]   = useState(user?.companyDomainVerified || false);
  const [cacNumber,        setCacNumber]        = useState(user?.companyCacNumber || '');
  const [linkedinUrl,      setLinkedinUrl]      = useState(user?.companyLinkedinUrl || '');
  const [verifyMsg,        setVerifyMsg]        = useState('');
  const [verifyErr,        setVerifyErr]        = useState('');
  const [verifyLoading,    setVerifyLoading]    = useState('');
  const [dnsInstructions,  setDnsInstructions]  = useState(null);

  // Billing state
  const [subStatus,        setSubStatus]        = useState(null);
  const [billingLoading,   setBillingLoading]   = useState(true);
  const [cancelLoading,    setCancelLoading]    = useState(false);
  const [cancelMsg,        setCancelMsg]        = useState('');
  const [cancelErr,        setCancelErr]        = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const isJobSeeker = user?.accountType === 'jobseeker';

  useEffect(() => {
    if (!isJobSeeker) return;
    getSubscriptionStatus()
      .then(setSubStatus)
      .catch(() => {})
      .finally(() => setBillingLoading(false));
  }, [isJobSeeker, userPlan]);

  async function handleCancelSubscription() {
    setCancelLoading(true); setCancelErr(''); setCancelMsg('');
    try {
      const res = await cancelSubscription();
      setCancelMsg(res.message || 'Subscription cancelled. Access continues until end of period.');
      setShowCancelConfirm(false);
      const updated = await getSubscriptionStatus();
      setSubStatus(updated);
    } catch (err) {
      setCancelErr(err.message || 'Cancellation failed. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  }

  async function sendVerificationEmail() {
    setVerifyLoading('email'); setVerifyMsg(''); setVerifyErr('');
    try {
      const r = await authFetch('/api/auth/send-email-verification', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Failed');
      setVerifyMsg(d.message);
    } catch (e) { setVerifyErr(e.message); }
    finally { setVerifyLoading(''); }
  }

  async function initiateDomainVerify() {
    setVerifyLoading('domain'); setVerifyMsg(''); setVerifyErr('');
    try {
      const r = await authFetch('/api/company/domain-verify/initiate', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Failed');
      if (d.verified) { setDomainVerified(true); setVerifyMsg('Domain already verified!'); }
      else { setDnsInstructions(d); }
    } catch (e) { setVerifyErr(e.message); }
    finally { setVerifyLoading(''); }
  }

  async function checkDomainVerify() {
    setVerifyLoading('check'); setVerifyMsg(''); setVerifyErr('');
    try {
      const r = await authFetch('/api/company/domain-verify/check', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Failed');
      if (d.verified) { setDomainVerified(true); setDnsInstructions(null); }
      setVerifyMsg(d.message);
    } catch (e) { setVerifyErr(e.message); }
    finally { setVerifyLoading(''); }
  }

  async function saveCompanyExtras() {
    setVerifyLoading('extras'); setVerifyMsg(''); setVerifyErr('');
    try {
      const r = await authFetch('/api/company/profile', {
        method: 'PATCH',
        body: JSON.stringify({ company_cac_number: cacNumber, company_linkedin_url: linkedinUrl }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Failed');
      onUserUpdated?.(d);
      setVerifyMsg('Company details saved.');
    } catch (e) { setVerifyErr(e.message); }
    finally { setVerifyLoading(''); }
  }

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
            <span style={{ fontSize: 12, color: 'var(--error)' }}>{error}</span>
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

      {/* ── Company Verification ─────────────────────────────────────────── */}
      <div style={{ marginTop: 40, borderTop: '1px solid var(--border)', paddingTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <ShieldCheck size={16} color="var(--accent)" />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Company Verification</h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
          Verified companies get a trust badge on all job listings. This helps job seekers identify legitimate employers and increases your listing visibility.
        </p>

        {/* Feedback */}
        {verifyMsg && <div style={{ background: 'var(--success-dim)', border: '1px solid var(--success)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--success)' }}>{verifyMsg}</div>}
        {verifyErr && <div style={{ background: 'var(--error-dim)', border: '1px solid var(--error)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--error)' }}>{verifyErr}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Email verification */}
          <VerifyRow
            icon={<Mail size={15} />}
            title="Email Verification"
            description="Verify your email address to get the basic Verified badge."
            status={emailVerified ? 'verified' : 'unverified'}
            statusLabel={emailVerified ? 'Verified' : 'Not verified'}
            action={!emailVerified && (
              <button onClick={sendVerificationEmail} disabled={verifyLoading === 'email'} style={verifyBtnStyle}>
                {verifyLoading === 'email' ? 'Sending…' : 'Send verification email'}
              </button>
            )}
          />

          {/* Domain (DNS) verification */}
          <VerifyRow
            icon={<Globe size={15} />}
            title="Domain Ownership"
            description="Prove you own your company domain by adding a DNS TXT record. Highest trust tier."
            status={domainVerified ? 'verified' : 'unverified'}
            statusLabel={domainVerified ? 'Domain Verified' : 'Not verified'}
            action={!domainVerified && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={initiateDomainVerify} disabled={verifyLoading === 'domain'} style={verifyBtnStyle}>
                  {verifyLoading === 'domain' ? 'Loading…' : 'Get DNS instructions'}
                </button>
                {dnsInstructions && (
                  <button onClick={checkDomainVerify} disabled={verifyLoading === 'check'} style={{ ...verifyBtnStyle, background: 'var(--accent)', color: '#fff', border: 'none' }}>
                    <RefreshCw size={12} /> {verifyLoading === 'check' ? 'Checking…' : 'Check verification'}
                  </button>
                )}
              </div>
            )}
          />

          {/* DNS instructions box */}
          {dnsInstructions && (
            <div style={{ background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontSize: 13 }}>
              <p style={{ fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>Add this TXT record to {dnsInstructions.domain}:</p>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 6, padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)', marginBottom: 10, wordBreak: 'break-all' }}>
                {dnsInstructions.txt_record}
              </div>
              <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                In your DNS provider, add a <strong>TXT record</strong> with host <strong>@</strong> and the value above. DNS changes can take up to 48 hours to propagate.
              </p>
            </div>
          )}

          {/* CAC Number */}
          <VerifyRow
            icon={<Hash size={15} />}
            title="CAC Registration Number"
            description="Your Corporate Affairs Commission registration number. Optional but builds trust."
            status={cacNumber ? 'provided' : 'unverified'}
            statusLabel={cacNumber ? 'Provided' : 'Not provided'}
            action={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={cacNumber} onChange={e => setCacNumber(e.target.value)}
                  placeholder="e.g. RC1234567" maxLength={50}
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', width: 160 }} />
                <button onClick={saveCompanyExtras} disabled={verifyLoading === 'extras'} style={verifyBtnStyle}>
                  {verifyLoading === 'extras' ? 'Saving…' : 'Save'}
                </button>
              </div>
            }
          />

          {/* LinkedIn */}
          <VerifyRow
            icon={<Link size={15} />}
            title="LinkedIn Company Page"
            description="Link your LinkedIn company profile to help job seekers verify your company."
            status={linkedinUrl ? 'provided' : 'unverified'}
            statusLabel={linkedinUrl ? 'Linked' : 'Not linked'}
            action={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/company/…" maxLength={500}
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', minWidth: 220, flex: 1 }} />
                <button onClick={saveCompanyExtras} disabled={verifyLoading === 'extras'} style={verifyBtnStyle}>Save</button>
                {linkedinUrl && <a href={linkedinUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><ExternalLink size={12} /> View</a>}
              </div>
            }
          />
        </div>
      </div>

      {/* ── Billing (job seekers only) ───────────────────────────────────── */}
      {isJobSeeker && (
        <div style={{ marginTop: 40, borderTop: '1px solid var(--border)', paddingTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <CreditCard size={16} color="var(--accent)" />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Billing</h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
            Manage your Pro subscription and view payment history.
          </p>

          {billingLoading ? (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>Loading billing info…</p>
            </div>
          ) : (
            <>
              {/* Plan card */}
              <div style={{ background: 'var(--card)', border: `1px solid ${userPlan === 'pro' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {userPlan === 'pro' ? <Star size={15} color="var(--accent)" fill="var(--accent)" /> : <CreditCard size={15} color="var(--muted)" />}
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                        {userPlan === 'pro' ? 'Pro' : 'Free'} Plan
                      </span>
                      {userPlan === 'pro' && (
                        <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 8px' }}>Active</span>
                      )}
                    </div>
                    {subStatus?.renewal_date && userPlan === 'pro' && subStatus?.status !== 'cancelled' && (
                      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                        Renews {new Date(subStatus.renewal_date).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                    {subStatus?.status === 'cancelled' && subStatus?.renewal_date && (
                      <p style={{ fontSize: 12, color: '#f59e0b', margin: 0 }}>
                        Access until {new Date(subStatus.renewal_date).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                    {userPlan === 'free' && (
                      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>5 uses/month per AI feature</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {userPlan !== 'pro' && (
                      <button onClick={onPricing} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Star size={13} fill="currentColor" /> Upgrade to Pro
                      </button>
                    )}
                    {userPlan === 'pro' && subStatus?.status !== 'cancelled' && !showCancelConfirm && (
                      <button onClick={() => setShowCancelConfirm(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
                        Cancel subscription
                      </button>
                    )}
                  </div>
                </div>

                {/* Cancel confirmation */}
                {showCancelConfirm && (
                  <div style={{ marginTop: 16, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                    <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 12px', lineHeight: 1.6 }}>
                      Are you sure? You'll keep Pro access until the end of your current billing period.
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={handleCancelSubscription} disabled={cancelLoading}
                        style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: cancelLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <XCircle size={13} /> {cancelLoading ? 'Cancelling…' : 'Yes, cancel'}
                      </button>
                      <button onClick={() => setShowCancelConfirm(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                        Keep Pro
                      </button>
                    </div>
                  </div>
                )}

                {cancelMsg && <p style={{ fontSize: 13, color: 'var(--success)', marginTop: 12, marginBottom: 0 }}>{cancelMsg}</p>}
                {cancelErr && <p style={{ fontSize: 13, color: 'var(--error)', marginTop: 12, marginBottom: 0 }}>{cancelErr}</p>}
              </div>

              {/* Billing history */}
              {subStatus?.billing_history?.length > 0 && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Payment History</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {subStatus.billing_history.map((log) => (
                      <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>₦{(log.amountNgn || 0).toLocaleString()}</p>
                          <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
                            {new Date(log.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <span style={{ background: 'var(--success-dim)', color: 'var(--success)', border: '1px solid var(--success)', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px', textTransform: 'uppercase' }}>
                          {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {subStatus?.billing_history?.length === 0 && userPlan === 'free' && (
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>No payment history yet.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const verifyBtnStyle = {
  background: 'var(--accent-dim)', border: '1px solid var(--accent)',
  color: 'var(--accent)', borderRadius: 8, padding: '7px 14px',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex',
  alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
};

function VerifyRow({ icon, title, description, status, statusLabel, action }) {
  const statusColor = status === 'verified' ? 'var(--success)'
    : status === 'provided' ? 'var(--accent)'
    : 'var(--muted)';
  const StatusIcon = status === 'verified' || status === 'provided' ? CheckCircle : ShieldAlert;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
          <div style={{ color: 'var(--accent)', marginTop: 1 }}>{icon}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: statusColor }}>
                <StatusIcon size={11} /> {statusLabel}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>{description}</p>
          </div>
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
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
