import { authFetch } from './authApi';

export async function fetchLeads() {
  const res = await authFetch('/api/leads');
  if (!res.ok) throw new Error('Failed to load leads');
  return res.json();
}

export async function saveLead(lead) {
  const res = await authFetch('/api/leads', {
    method: 'POST',
    body: JSON.stringify({ lead }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to save lead');
  }
  return res.json(); // returns the saved lead with DB-assigned id
}

export async function updateLead(id, data) {
  const res = await authFetch(`/api/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update lead');
  }
  return res.json();
}

export async function deleteLead(id) {
  const res = await authFetch(`/api/leads/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete lead');
}
