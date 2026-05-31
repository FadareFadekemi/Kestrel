import { getToken } from './authApi';

const BASE = '/api';

function headers() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function initiateJsProPayment() {
  const r = await fetch(`${BASE}/payments/js/initiate`, {
    method: 'POST',
    headers: headers(),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || 'Payment initiation failed');
  }
  return r.json();
}

export async function verifyJsProPayment(reference) {
  const r = await fetch(`${BASE}/payments/js/verify`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ reference }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || 'Payment verification failed');
  }
  return r.json();
}

export async function getPaymentHistory() {
  const r = await fetch(`${BASE}/payments/history`, { headers: headers() });
  if (!r.ok) throw new Error('Failed to fetch payment history');
  return r.json();
}

export async function cancelSubscription() {
  const r = await fetch(`${BASE}/payments/js/subscription`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || 'Cancellation failed');
  }
  return r.json();
}

export async function getUserPlan() {
  const r = await fetch(`${BASE}/user/plan`, { headers: headers() });
  if (!r.ok) return { plan: 'free', expires_at: null };
  return r.json();
}

export async function initiateListingPayment(listingData) {
  const r = await fetch(`${BASE}/listings/initiate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(listingData),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || 'Listing payment initiation failed');
  }
  return r.json();
}

export async function verifyListingPayment(listingId, reference) {
  const r = await fetch(`${BASE}/listings/${listingId}/verify`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ reference }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || 'Listing verification failed');
  }
  return r.json();
}

export async function getMyListings() {
  const r = await fetch(`${BASE}/listings`, { headers: headers() });
  if (!r.ok) throw new Error('Failed to fetch listings');
  return r.json();
}

export async function getPublicListings(query = '', location = 'Nigeria', page = 1) {
  const params = new URLSearchParams({ query, location, page });
  const r = await fetch(`${BASE}/listings/public?${params}`);
  if (!r.ok) throw new Error('Failed to fetch listings');
  return r.json();
}

export async function renewListing(listingId) {
  const r = await fetch(`${BASE}/listings/${listingId}/renew`, {
    method: 'POST',
    headers: headers(),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || 'Renewal failed');
  }
  return r.json();
}
