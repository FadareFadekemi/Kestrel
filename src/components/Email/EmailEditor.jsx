import { useState, useEffect } from 'react';
import { Copy, Mail, MessageSquare, Check, RefreshCw, Loader, Send } from 'lucide-react';
import { SkeletonText } from '../UI/Skeleton';

const TONES = ['Consultative', 'Formal', 'Casual', 'Aggressive'];

export default function EmailEditor({ email, profile, onRetone, onGenerateAB, isLoading, statusText, streamText, contactEmail, onSendEmail }) {
  const [body,         setBody]         = useState('');
  const [subject,      setSubject]      = useState('');
  const [copied,       setCopied]       = useState(false);
  const [selectedTone, setSelectedTone] = useState('Consultative');
  const [sendState,    setSendState]    = useState('idle');  // idle | sending | sent | error
  const [sendError,    setSendError]    = useState('');

  useEffect(() => {
    if (email) {
      setBody(email.body || '');
      setSubject(email.subject || '');
      setSelectedTone(email.tone || 'Consultative');
    }
  }, [email]);

  const handleCopy = () => {
    const full = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!contactEmail || sendState === 'sending' || !onSendEmail) return;
    setSendState('sending');
    setSendError('');
    try {
      await onSendEmail(subject, body);
      setSendState('sent');
      setTimeout(() => setSendState('idle'), 5000);
    } catch (err) {
      setSendState('error');
      setSendError(err.message);
      setTimeout(() => setSendState('idle'), 6000);
    }
  };

  const handleGmail = () => {
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
  };

  const handleSlack = () => {
    // Mocked — shows an alert for portfolio demo
    alert('Slack integration coming in v1.1');
  };

  if (isLoading) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa' }} className="animate-pulse-glow" />
          <span style={{ fontSize: 12, color: '#60a5fa' }}>{statusText || 'Writing email...'}</span>
        </div>
        {streamText && (
          <div style={{ background: '#18181b', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #27272a', maxHeight: 100, overflow: 'hidden' }}>
            <pre style={{ fontSize: 10, color: '#3f3f46', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{streamText.slice(-300)}</pre>
          </div>
        )}
        <SkeletonText lines={8} />
      </div>
    );
  }

  if (!email) return null;

  return (
    <div style={{ padding: 20, animation: 'fadeInUp 0.35s ease' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
        {/* Tone selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TONES.map(t => (
            <button
              key={t}
              onClick={() => { setSelectedTone(t); onRetone?.(t); }}
              disabled={isLoading}
              style={{
                fontSize: 11, fontWeight: 500,
                color: selectedTone === t ? '#09090b' : '#71717a',
                background: selectedTone === t ? '#f59e0b' : '#27272a',
                border: `1px solid ${selectedTone === t ? '#f59e0b' : '#3f3f46'}`,
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >{t}</button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <ActionBtn icon={<RefreshCw size={12} />} label="A/B" onClick={() => onGenerateAB?.(selectedTone)} />
          <ActionBtn icon={copied ? <Check size={12} /> : <Copy size={12} />} label={copied ? 'Copied' : 'Copy'} onClick={handleCopy} highlight={copied} />
          <ActionBtn icon={<Mail size={12} />} label="Gmail" onClick={handleGmail} />
          <ActionBtn icon={<MessageSquare size={12} />} label="Slack" onClick={handleSlack} />
          {contactEmail && (
            <button
              onClick={handleSend}
              disabled={sendState === 'sending' || sendState === 'sent'}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600,
                color: sendState === 'sent' ? '#09090b' : '#09090b',
                background: sendState === 'sent'
                  ? 'linear-gradient(135deg, #34d399, #059669)'
                  : sendState === 'error'
                  ? 'rgba(239,68,68,0.15)'
                  : 'linear-gradient(135deg, #f59e0b, #b45309)',
                border: 'none', borderRadius: 6, padding: '5px 12px',
                cursor: sendState === 'sending' || sendState === 'sent' ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {sendState === 'sending' ? <><Loader size={11} className="animate-spin-icon" /> Sending...</>
               : sendState === 'sent'   ? <><Check size={11} /> Sent</>
               : sendState === 'error'  ? 'Retry'
               : <><Send size={11} /> Send</>}
            </button>
          )}
        </div>
      </div>

      {/* Subject */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, fontWeight: 600, color: '#52525b', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Subject</label>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          style={{
            width: '100%', background: '#18181b', border: '1px solid #27272a',
            borderRadius: 8, padding: '8px 12px', color: '#f4f4f5',
            fontSize: 13, fontWeight: 500, outline: 'none',
          }}
        />
      </div>

      {/* Body */}
      <div>
        <label style={{ fontSize: 10, fontWeight: 600, color: '#52525b', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Body</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={12}
          style={{
            width: '100%', background: '#18181b', border: '1px solid #27272a',
            borderRadius: 8, padding: '12px', color: '#d4d4d8',
            fontSize: 13, lineHeight: 1.7, outline: 'none', resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 11, color: '#3f3f46' }}>
          {email.wordCount || body.split(/\s+/).filter(Boolean).length} words · Variant {email.variant || 'A'}
        </span>
        <span style={{ fontSize: 11, color: '#3f3f46' }}>Placeholders: {'{{firstName}}'}, {'{{senderName}}'}</span>
      </div>
      {contactEmail && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#52525b' }}>
          Sending to: <span style={{ color: '#71717a' }}>{contactEmail}</span>
        </div>
      )}
      {sendState === 'error' && sendError && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#fca5a5', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '6px 10px' }}>
          {sendError}
        </div>
      )}
      {sendState === 'sent' && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 6, padding: '6px 10px' }}>
          Email delivered to {contactEmail}.
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon, label, onClick, highlight }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500,
      color: highlight ? '#f59e0b' : '#71717a',
      background: highlight ? 'rgba(245,158,11,0.1)' : '#27272a',
      border: `1px solid ${highlight ? 'rgba(245,158,11,0.3)' : '#3f3f46'}`,
      borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
      transition: 'all 0.15s',
    }}>
      {icon} {label}
    </button>
  );
}
