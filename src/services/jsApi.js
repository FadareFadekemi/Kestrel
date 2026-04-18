import { getToken } from './authApi';

const BASE = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Streams SSE from a POST endpoint. Calls onStream(text) for each delta,
// onStatus(text) for status events, returns the final result object.
export async function streamPost(path, body, { onStream, onStatus } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';
  let   result  = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      try {
        const { event, data } = JSON.parse(line.slice(5).trim());
        if (event === 'stream'  && onStream) onStream(data.text ?? '');
        if (event === 'status'  && onStatus) onStatus(data.text ?? '');
        if (event === 'result')              result = data;
        if (event === 'error')               throw new Error(data.message || 'Server error');
      } catch (e) {
        if (e.message !== 'Server error' && !e.message.startsWith('Server')) continue;
        throw e;
      }
    }
  }
  return result;
}

async function jsonPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// ── CV Optimiser ──────────────────────────────────────────────────────────────

export function analyseCV(cv_text, handlers)             { return streamPost('/api/js/cv/analyse',          { cv_text },                       handlers); }
export function improveSummary(summary, target_role, h)  { return streamPost('/api/js/cv/improve-summary',  { summary, target_role },           h); }
export function improveBullet(bullet, role, handlers)    { return streamPost('/api/js/cv/improve-bullet',   { bullet, role },                   handlers); }
export function suggestSkills(target_role, current_skills, h) { return streamPost('/api/js/cv/suggest-skills', { target_role, current_skills }, h); }
export function matchJD(cv_text, jd_text, handlers)      { return streamPost('/api/js/cv/jd-match',         { cv_text, jd_text },               handlers); }

// ── Job Matching ──────────────────────────────────────────────────────────────

export function fetchJobMatches(profile, handlers)        { return streamPost('/api/js/matches',             { profile },                        handlers); }

// ── Scam Detection ────────────────────────────────────────────────────────────

export function detectScam(text)                          { return jsonPost('/api/js/scam-detect',           { text }); }

// ── Outreach ──────────────────────────────────────────────────────────────────

export function jsResearch(company, target_role, h)       { return streamPost('/api/js/research',            { company, target_role },           h); }
export function jsProfiling(research, target_role, h)     { return streamPost('/api/js/profile',             { research, target_role },          h); }
export function jsEmail(profile, research, candidate, tone, h) { return streamPost('/api/js/email', { profile, research, candidate, tone }, h); }
export function jsFollowup(company, role, days, original_subject) { return jsonPost('/api/js/followup', { company, role, days, original_subject }); }
