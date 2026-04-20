import { useState, useCallback, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
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
import LandingPage from './pages/LandingPage';
import { isLoggedIn, logout, fetchMe } from './services/authApi';
import { fetchLeads, saveLead, updateLead as updateLeadApi } from './services/leadsApi';
import './index.css';

const VALID_TYPES = ['company', 'jobseeker'];

// User type is keyed per user ID so different accounts on the same device
// each keep their own mode choice.
const typeKey   = (uid) => `tc_user_type_${uid}`;
const getType   = (uid) => { try { const v = localStorage.getItem(typeKey(uid)); return VALID_TYPES.includes(v) ? v : null; } catch { return null; } };
const saveType  = (uid, type) => { if (!VALID_TYPES.includes(type)) return; try { localStorage.setItem(typeKey(uid), type); } catch {} };
const clearType = (uid) => { try { localStorage.removeItem(typeKey(uid)); } catch {} };

export default function App() {
  const [activePage,     setActivePage]     = useState('Dashboard');
  const [leads,          setLeads]          = useState([]);
  const [user,           setUser]           = useState(null);
  const [authChecked,    setAuthChecked]    = useState(false);
  const [userType,       setUserType]       = useState(null);
  const [appStep,        setAppStep]        = useState('app');
  const [viewingLanding, setViewingLanding] = useState(() => !isLoggedIn());

  const historyReady = useRef(false);

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
        // Popped back to before any history entry — show landing for guests
        if (!isLoggedIn()) setViewingLanding(true);
        return;
      }
      if (s.tc === 'landing') { setViewingLanding(true); return; }
      if (s.tc === 'auth')    { setViewingLanding(false); return; }
      if (s.tc === 'app' && s.page) { setActivePage(s.page); }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Seed initial history entry when the app first renders
  useEffect(() => {
    if (!authChecked || historyReady.current) return;
    historyReady.current = true;
    if (!isLoggedIn()) {
      window.history.replaceState({ tc: 'landing' }, '');
    } else {
      window.history.replaceState({ tc: 'app', page: 'Dashboard' }, '');
    }
  }, [authChecked]);

  // Push a history entry whenever the active page changes (enables swipe-back within the app)
  useEffect(() => {
    if (!historyReady.current || !user) return;
    window.history.pushState({ tc: 'app', page: activePage }, '');
  }, [activePage, user]);

  // ── Restore session ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn()) { setAuthChecked(true); return; }
    fetchMe()
      .then(u => {
        if (u) {
          setUser(u);
          const stored = getType(u.id);
          if (stored) {
            setUserType(stored);
            return loadLeads();
          }
          // No type stored for this user — show mode select
          setAppStep('mode-select');
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  async function loadLeads() {
    try { setLeads(await fetchLeads()); } catch {}
  }

  // ── Auth handlers ────────────────────────────────────────────────────────────
  const handleAuth = useCallback((u) => {
    setUser(u);
    const stored = getType(u.id);
    if (stored) {
      setUserType(stored);
      setAppStep('app');
      loadLeads();
      window.history.pushState({ tc: 'app', page: 'Dashboard' }, '');
    } else {
      // No mode chosen for this account yet — always prompt
      setAppStep('mode-select');
      window.history.pushState({ tc: 'app', page: 'Dashboard' }, '');
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
    setViewingLanding(true);
    window.history.pushState({ tc: 'landing' }, '');
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

  if (!user && viewingLanding) {
    return (
      <LandingPage onGetStarted={() => {
        window.history.pushState({ tc: 'auth' }, '');
        setViewingLanding(false);
      }} />
    );
  }

  if (!user)                         return <AuthPage onAuth={handleAuth} />;
  if (appStep === 'mode-select')     return <ModeSelectPage onSelect={handleModeSelect} />;
  if (appStep === 'jobseeker-setup') return <JobSeekerSetupPage user={user} onComplete={handleJobSeekerSetupComplete} />;

  const isJobSeeker = userType === 'jobseeker';

  const renderPage = () => {
    if (isJobSeeker) {
      switch (activePage) {
        case 'Dashboard':     return <JobSeekerDashboard user={user} setActivePage={pushPage} />;
        case 'CV Optimiser':  return <CVOptimiserPage />;
        case 'Job Matches':   return <JobMatchesPage setActivePage={pushPage} />;
        case 'Applications':  return <ApplicationsPage setActivePage={pushPage} />;
        case 'Scam Detector': return <ScamDetectorPage />;
        case 'Outreach':      return <OutreachAssistantPage />;
        case 'Agent':         return <AgentPage onLeadSaved={handleLeadSaved} user={user} onGoToSettings={() => pushPage('Settings')} />;
        case 'Settings':      return <SettingsPage user={user} onUserUpdated={setUser} />;
        default:              return <JobSeekerDashboard user={user} setActivePage={pushPage} />;
      }
    }
    switch (activePage) {
      case 'Dashboard':  return <Dashboard leads={leads} setActivePage={pushPage} />;
      case 'Agent':      return <AgentPage onLeadSaved={handleLeadSaved} user={user} onGoToSettings={() => pushPage('Settings')} />;
      case 'Leads':      return <LeadsPage leads={leads} onUpdateLead={handleUpdateLead} setActivePage={pushPage} />;
      case 'Sequences':  return <SequencesPage leads={leads} />;
      case 'Batch':      return <BatchPage onLeadSaved={handleLeadSaved} user={user} />;
      case 'Settings':   return <SettingsPage user={user} onUserUpdated={setUser} />;
      default:           return <Dashboard leads={leads} setActivePage={pushPage} />;
    }
  };

  const floatingTarget = isJobSeeker ? 'Outreach' : 'Agent';
  const floatingLabel  = isJobSeeker ? 'Outreach Assistant' : 'Research a Lead';

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F0F', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activePage={activePage}
        setActivePage={pushPage}
        user={user}
        userType={userType}
        onLogout={handleLogout}
        onSettings={() => pushPage('Settings')}
      />

      {activePage !== floatingTarget && (
        <button
          onClick={() => pushPage(floatingTarget)}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 40, bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            background: 'linear-gradient(135deg, #00D4C8, #00B8AD)',
            color: '#0A0F0F', border: 'none', borderRadius: 12,
            padding: '12px 20px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 8px 28px rgba(0,212,200,0.35)',
          }}
        >
          <Zap size={14} fill="currentColor" /> {floatingLabel}
        </button>
      )}

      <main data-main style={{ marginTop: 'calc(56px + env(safe-area-inset-top, 0px))', flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px - env(safe-area-inset-top, 0px))' }}>
        {renderPage()}
      </main>
    </div>
  );
}
