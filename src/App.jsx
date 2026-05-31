import { useState, useCallback, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { PaywallProvider } from './context/PaywallContext';
import PaywallModal from './components/UI/PaywallModal';
import Navbar from './components/Layout/Navbar';
import Dashboard from './pages/Dashboard';
import AgentPage from './pages/AgentPage';
import LeadsPage from './pages/LeadsPage';
import SequencesPage from './pages/SequencesPage';
import BatchPage from './pages/BatchPage';
import AuthPage from './pages/AuthPage';
import SettingsPage from './pages/SettingsPage';
import ModeSelectPage from './pages/ModeSelectPage';
import JobSeekerSetupPage from './pages/JobSeekerSetupPage';
import JobSeekerDashboard from './pages/jobseeker/JobSeekerDashboard';
import CVOptimiserPage from './pages/jobseeker/CVOptimiserPage';
import JobMatchesPage from './pages/jobseeker/JobMatchesPage';
import ApplicationsPage from './pages/jobseeker/ApplicationsPage';
import ScamDetectorPage from './pages/jobseeker/ScamDetectorPage';
import OutreachAssistantPage from './pages/jobseeker/OutreachAssistantPage';
import JobListingsPage from './pages/jobseeker/JobListingsPage';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import PostJobPage from './pages/PostJobPage';
import { isLoggedIn, logout, fetchMe } from './services/authApi';
import { fetchLeads, saveLead, updateLead as updateLeadApi } from './services/leadsApi';
import { getUserPlan } from './services/paymentApi';
import './index.css';

const VALID_TYPES = ['company', 'jobseeker'];

const typeKey   = (uid) => `tc_user_type_${uid}`;
const getType   = (uid) => { try { const v = localStorage.getItem(typeKey(uid)); return VALID_TYPES.includes(v) ? v : null; } catch { return null; } };
const saveType  = (uid, type) => { if (!VALID_TYPES.includes(type)) return; try { localStorage.setItem(typeKey(uid), type); } catch {} };
const clearType = (uid) => { try { localStorage.removeItem(typeKey(uid)); } catch {} };

// Load Paystack inline JS once
function loadPaystackScript() {
  if (document.getElementById('paystack-js')) return;
  const s = document.createElement('script');
  s.id = 'paystack-js';
  s.src = 'https://js.paystack.co/v1/inline.js';
  s.async = true;
  document.head.appendChild(s);
}

export default function App() {
  return <ThemeProvider><AppInner /></ThemeProvider>;
}

function AppInner() {
  const { colors: c } = useTheme();
  const [activePage,     setActivePage]     = useState('Dashboard');
  const [leads,          setLeads]          = useState([]);
  const [user,           setUser]           = useState(null);
  const [authChecked,    setAuthChecked]    = useState(false);
  const [userType,       setUserType]       = useState(null);
  const [appStep,        setAppStep]        = useState('app');
  const [viewingLanding, setViewingLanding] = useState(() => !isLoggedIn());
  const [viewingPricing, setViewingPricing] = useState(() => window.location.pathname === '/pricing');
  const [resetToken,     setResetToken]     = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('reset_token') || null;
  });
  const [userPlan,       setUserPlan]       = useState('free');
  const [paywallFeature, setPaywallFeature] = useState(null);

  const historyReady = useRef(false);

  // Load Paystack popup script on mount
  useEffect(() => { loadPaystackScript(); }, []);

  // Sync URL for pricing page
  useEffect(() => {
    if (viewingPricing) {
      if (window.location.pathname !== '/pricing') {
        window.history.pushState({ tc: 'pricing' }, '', '/pricing');
      }
    }
  }, [viewingPricing]);

  // ── History: push a state entry so swipe-back works ────────────────────────
  const pushPage = useCallback((page) => {
    setActivePage(page);
    window.history.pushState({ tc: 'app', page }, '');
  }, []);

  // Listen for browser/swipe back
  useEffect(() => {
    const onPop = (e) => {
      const s = e.state;
      if (!s) {
        if (!isLoggedIn()) setViewingLanding(true);
        return;
      }
      if (s.tc === 'landing')  { setViewingLanding(true); setViewingPricing(false); return; }
      if (s.tc === 'pricing')  { setViewingPricing(true); setViewingLanding(false); return; }
      if (s.tc === 'auth')     { setViewingLanding(false); setViewingPricing(false); return; }
      if (s.tc === 'app' && s.page) { setActivePage(s.page); setViewingPricing(false); }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Seed initial history entry
  useEffect(() => {
    if (!authChecked || historyReady.current) return;
    historyReady.current = true;
    if (viewingPricing) {
      window.history.replaceState({ tc: 'pricing' }, '', '/pricing');
    } else if (!isLoggedIn()) {
      window.history.replaceState({ tc: 'landing' }, '', '/');
    } else {
      window.history.replaceState({ tc: 'app', page: 'Dashboard' }, '', '/');
    }
  }, [authChecked, viewingPricing]);

  // Push a history entry when active page changes
  useEffect(() => {
    if (!historyReady.current || !user) return;
    window.history.pushState({ tc: 'app', page: activePage }, '', '/');
  }, [activePage, user]);

  // ── Restore session ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn()) { setAuthChecked(true); return; }
    fetchMe()
      .then(async (u) => {
        if (u) {
          setUser(u);
          // Apply server-side theme preference
          if (u.themePref) {
            try { localStorage.setItem('tc_theme', u.themePref); } catch {}
          }
          const stored = getType(u.id);
          if (stored) {
            setUserType(stored);
            const [, plan] = await Promise.all([loadLeads(), getUserPlan().catch(() => ({ plan: 'free' }))]);
            setUserPlan(plan?.plan || u.jsPlan || 'free');
            return;
          }
          setAppStep('mode-select');
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  async function loadLeads() {
    try { setLeads(await fetchLeads()); } catch {}
  }

  async function refreshUserPlan() {
    try {
      const plan = await getUserPlan();
      setUserPlan(plan.plan);
    } catch {}
  }

  // ── Auth handlers ────────────────────────────────────────────────────────────
  const handleAuth = useCallback(async (u) => {
    setUser(u);
    const stored = getType(u.id);
    if (stored) {
      setUserType(stored);
      setAppStep('app');
      loadLeads();
      getUserPlan().then(p => setUserPlan(p.plan)).catch(() => {});
      window.history.pushState({ tc: 'app', page: 'Dashboard' }, '', '/');
    } else {
      setAppStep('mode-select');
      window.history.pushState({ tc: 'app', page: 'Dashboard' }, '', '/');
    }
  }, []);

  const handleModeSelect = useCallback((type) => {
    if (!VALID_TYPES.includes(type)) return;
    setUserType(type);
    if (user) saveType(user.id, type);
    if (type === 'jobseeker') {
      setAppStep('jobseeker-setup');
    } else {
      setAppStep('app');
      loadLeads();
    }
  }, [user]);

  const handleJobSeekerSetupComplete = useCallback(() => { setAppStep('app'); }, []);

  const handleLogout = useCallback(() => {
    if (user) clearType(user.id);
    logout();
    setUser(null);
    setUserType(null);
    setLeads([]);
    setActivePage('Dashboard');
    setAppStep('app');
    setUserPlan('free');
    setViewingLanding(true);
    window.history.pushState({ tc: 'landing' }, '', '/');
  }, [user]);

  // ── Lead persistence ─────────────────────────────────────────────────────────
  const handleLeadSaved = useCallback(async (lead) => {
    try {
      const saved = await saveLead(lead);
      setLeads(prev => {
        const exists = prev.find(l => l.id === saved.id);
        return exists ? prev.map(l => l.id === saved.id ? saved : l) : [saved, ...prev];
      });
      return saved;
    } catch {
      setLeads(prev => [lead, ...prev]);
      return lead;
    }
  }, []);

  const handleUpdateLead = useCallback(async (updated) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    try {
      const saved = await updateLeadApi(updated.id, { status: updated.status });
      setLeads(prev => prev.map(l => l.id === saved.id ? saved : l));
    } catch {}
  }, []);

  // ── Render guards ─────────────────────────────────────────────────────────────
  if (!authChecked) return null;

  // Pricing page — accessible to all
  if (viewingPricing) {
    return (
      <PricingPage
        user={user}
        userPlan={userPlan}
        onBack={() => {
          setViewingPricing(false);
          window.history.pushState(user ? { tc: 'app', page: 'Dashboard' } : { tc: 'landing' }, '', '/');
        }}
        onGetStarted={() => {
          setViewingPricing(false);
          if (!user) {
            window.history.pushState({ tc: 'auth' }, '', '/');
            setViewingLanding(false);
          }
        }}
      />
    );
  }

  if (!user && viewingLanding) {
    return (
      <LandingPage
        onGetStarted={() => {
          window.history.pushState({ tc: 'auth' }, '', '/');
          setViewingLanding(false);
        }}
        onPricing={() => {
          setViewingPricing(true);
        }}
      />
    );
  }

  if (!user)                         return <AuthPage onAuth={handleAuth} resetToken={resetToken} />;
  if (appStep === 'mode-select')     return <ModeSelectPage onSelect={handleModeSelect} />;
  if (appStep === 'jobseeker-setup') return <JobSeekerSetupPage user={user} onComplete={handleJobSeekerSetupComplete} />;

  const isJobSeeker = userType === 'jobseeker';

  const renderPage = () => {
    if (isJobSeeker) {
      switch (activePage) {
        case 'Dashboard':     return <JobSeekerDashboard user={user} setActivePage={pushPage} userPlan={userPlan} onOpenPaywall={setPaywallFeature} />;
        case 'CV Optimiser':  return <CVOptimiserPage userPlan={userPlan} onOpenPaywall={setPaywallFeature} />;
        case 'Job Matches':   return <JobMatchesPage setActivePage={pushPage} />;
        case 'Applications':  return <ApplicationsPage setActivePage={pushPage} userPlan={userPlan} onOpenPaywall={setPaywallFeature} />;
        case 'Scam Detector': return <ScamDetectorPage />;
        case 'Outreach':      return <OutreachAssistantPage userPlan={userPlan} onOpenPaywall={setPaywallFeature} />;
        case 'Jobs':          return <JobListingsPage />;
        case 'Agent':         return <AgentPage onLeadSaved={handleLeadSaved} user={user} onGoToSettings={() => pushPage('Settings')} />;
        case 'Settings':      return <SettingsPage user={user} onUserUpdated={setUser} userPlan={userPlan} onPricing={() => setViewingPricing(true)} />;
        default:              return <JobSeekerDashboard user={user} setActivePage={pushPage} userPlan={userPlan} onOpenPaywall={setPaywallFeature} />;
      }
    }
    switch (activePage) {
      case 'Dashboard':  return <Dashboard leads={leads} setActivePage={pushPage} />;
      case 'Agent':      return <AgentPage onLeadSaved={handleLeadSaved} user={user} onGoToSettings={() => pushPage('Settings')} />;
      case 'Leads':      return <LeadsPage leads={leads} onUpdateLead={handleUpdateLead} setActivePage={pushPage} />;
      case 'Sequences':  return <SequencesPage leads={leads} />;
      case 'Batch':      return <BatchPage onLeadSaved={handleLeadSaved} user={user} />;
      case 'Post a Job': return <PostJobPage user={user} />;
      case 'Settings':   return <SettingsPage user={user} onUserUpdated={setUser} userPlan={userPlan} onPricing={() => setViewingPricing(true)} />;
      default:           return <Dashboard leads={leads} setActivePage={pushPage} />;
    }
  };

  const floatingTarget = isJobSeeker ? 'Outreach' : 'Post a Job';
  const floatingLabel  = isJobSeeker ? 'Outreach Assistant' : 'Post a Job';

  return (
    <PaywallProvider userPlan={userPlan} onUpgrade={refreshUserPlan}>
      <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', flexDirection: 'column' }}>
        <Navbar
          activePage={activePage}
          setActivePage={pushPage}
          user={user}
          userType={userType}
          onLogout={handleLogout}
          onSettings={() => pushPage('Settings')}
          userPlan={userPlan}
          onPricing={() => setViewingPricing(true)}
        />

        {activePage !== floatingTarget && (
          <button
            onClick={() => pushPage(floatingTarget)}
            style={{
              position: 'fixed', bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', right: 24, zIndex: 40,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-mid))',
              color: '#fff', border: 'none', borderRadius: 12,
              padding: '12px 20px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 28px var(--accent-glow)',
            }}
          >
            <Zap size={14} fill="currentColor" /> {floatingLabel}
          </button>
        )}

        <main data-main style={{ marginTop: 'calc(56px + env(safe-area-inset-top, 0px))', flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px - env(safe-area-inset-top, 0px))' }}>
          {renderPage()}
        </main>

        {/* Paywall modal — rendered at app level so it's always on top */}
        {paywallFeature && (
          <PaywallModal
            feature={paywallFeature}
            user={user}
            onClose={() => setPaywallFeature(null)}
            onUpgradeSuccess={() => {
              setPaywallFeature(null);
              refreshUserPlan();
            }}
          />
        )}
      </div>
    </PaywallProvider>
  );
}
