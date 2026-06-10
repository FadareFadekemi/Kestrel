import { getToken } from './authApi';

const BASE = '/api';

function headers() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Returns current-month usage for all three metered features plus the user's plan.
 * Shape: { plan, is_pro, period, features: { cv_optimiser, company_research, outreach_assistant } }
 * Each feature: { used, limit, remaining }
 */
export async function getUsageStatus() {
  const r = await fetch(`${BASE}/usage/status`, { headers: headers() });
  if (!r.ok) return null;
  return r.json();
}

/**
 * Increments usage for a feature before executing it.
 * Returns { allowed, feature, used, limit, remaining } on success.
 * Throws with the 403 detail payload when the free limit is reached.
 */
export async function incrementUsage(feature) {
  const r = await fetch(`${BASE}/usage/increment`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ feature }),
  });
  if (r.ok) return r.json();
  const err = await r.json().catch(() => ({}));
  const detail = err.detail || {};
  const error = new Error(detail.feature_label ? `${detail.feature_label} limit reached` : 'Usage limit reached');
  error.usageInfo = detail;
  throw error;
}

/**
 * Initiates a Paystack recurring subscription.
 * Returns { authorization_url, reference, public_key, email, amount }
 */
export async function createSubscription() {
  const r = await fetch(`${BASE}/subscription/create`, {
    method: 'POST',
    headers: headers(),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || 'Subscription initiation failed');
  }
  return r.json();
}

/**
 * Cancels the active subscription. User keeps access until period_end.
 * Returns { message, access_until }
 */
export async function cancelSubscription() {
  const r = await fetch(`${BASE}/subscription/cancel`, {
    method: 'POST',
    headers: headers(),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || 'Cancellation failed');
  }
  return r.json();
}

/**
 * Returns { plan, is_pro, status, renewal_date, period_start, billing_history }
 */
export async function getSubscriptionStatus() {
  const r = await fetch(`${BASE}/subscription/status`, { headers: headers() });
  if (!r.ok) throw new Error('Failed to fetch subscription status');
  return r.json();
}
