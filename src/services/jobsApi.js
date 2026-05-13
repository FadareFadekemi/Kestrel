import { getToken } from './authApi';

const BASE       = import.meta.env.VITE_API_URL || '';
const SAVED_KEY  = 'tc_saved_jobs';
const APPS_KEY   = 'kestrel_js_applications';
const CV_KEY     = 'kestrel_cv_builder';

// ── Job search ────────────────────────────────────────────────────────────────

export async function searchJobs({ query = 'developer', location = 'Nigeria', page = 1 } = {}) {
  const token  = getToken();
  const params = new URLSearchParams({ query, location, page: String(page) });
  const r = await fetch(`${BASE}/api/jobseeker/jobs/search?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(err.detail || 'Failed to fetch jobs');
  }
  return r.json(); // { jobs, errors, total, cached }
}

// ── Saved jobs (localStorage) ─────────────────────────────────────────────────

export function getSavedJobs() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch { return []; }
}

export function isJobSaved(jobId) {
  return getSavedJobs().some(j => j.id === jobId);
}

export function saveJob(job) {
  const saved = getSavedJobs();
  if (!saved.find(j => j.id === job.id)) {
    saved.unshift(job);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); } catch {}
  }
}

export function unsaveJob(jobId) {
  const saved = getSavedJobs().filter(j => j.id !== jobId);
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); } catch {}
}

// ── Application tracker (localStorage) ───────────────────────────────────────
// Adds an entry to the same store used by ApplicationsPage.

export function logApplication(job) {
  try {
    const apps    = JSON.parse(localStorage.getItem(APPS_KEY) || '[]');
    const already = apps.find(
      a => a.company?.toLowerCase() === job.company?.toLowerCase() &&
           a.role?.toLowerCase()    === job.title?.toLowerCase()
    );
    if (already) return;
    apps.unshift({
      id:           Date.now(),
      company:      job.company  || '',
      role:         job.title    || '',
      sector:       job.source   || '',
      status:       'Applied',
      appliedDate:  new Date().toISOString().split('T')[0],
      emailSubject: '',
      createdAt:    new Date().toISOString(),
      jobUrl:       job.url      || '',
    });
    localStorage.setItem(APPS_KEY, JSON.stringify(apps));
  } catch {}
}

// ── CV text builder (for JD match) ───────────────────────────────────────────
// Reads the CV builder data from localStorage and serialises it to plain text
// so it can be sent to the /api/js/cv/jd-match endpoint.

export function buildCVText() {
  try {
    const raw = localStorage.getItem(CV_KEY);
    if (!raw) return '';
    const b = JSON.parse(raw);
    const parts = [];

    if (b.summary)         parts.push(`SUMMARY\n${b.summary}`);
    if (b.skills)          parts.push(`SKILLS\n${b.skills}`);

    if (b.experience?.length) {
      const exp = b.experience
        .filter(e => e.role || e.company)
        .map(e => `${e.role} at ${e.company} (${e.period})\n${e.bullets}`)
        .join('\n\n');
      if (exp) parts.push(`EXPERIENCE\n${exp}`);
    }

    if (b.education?.length) {
      const edu = b.education
        .filter(e => e.degree || e.school)
        .map(e => `${e.degree} — ${e.school} ${e.year}`)
        .join('\n');
      if (edu) parts.push(`EDUCATION\n${edu}`);
    }

    if (b.projects)        parts.push(`PROJECTS\n${b.projects}`);
    if (b.certifications)  parts.push(`CERTIFICATIONS\n${b.certifications}`);

    return parts.join('\n\n').trim();
  } catch {
    return '';
  }
}
