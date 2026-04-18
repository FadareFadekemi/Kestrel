import { useState, useCallback, useEffect } from 'react';
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

const USER_TYPE_KEY = 'kestrel_user_type';
const VALID_TYPES   = ['company', 'jobseeker'];

function getStoredUserType() {
  try {
    const v = localStorage.getItem(USER_TYPE_KEY);
    return VALID_TYPES.includes(v) ? v : null;
  } catch { return null; }
}

function storeUserType(type) {
  if (!VALID_TYPES.includes(type)) return;
  try { localStorage.setItem(USER_TYPE_KEY, type); } catch { /* private mode */ }
}

function clearStoredUserType() {
  try { localStorage.removeItem(USER_TYPE_KEY); } catch { /* private mode */ }
}

export default function App() {
  const [activePage,  setActivePage]  = useState('Dashboard');
  const [leads,       setLeads]       = useState([]);
  const [user,        setUser]        = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [userType,    setUserType]    = useState(null);
  const [appStep,       setAppStep]       = useState('app'); // 'mode-select' | 'jobseeker-setup' | 'app'
  const [viewingLanding, setViewingLanding] = useState(() => !isLoggedIn());

  // ── Restore session ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn()) { setAuthChecked(true); return; }
    fetchMe()
      .then(u => {
        if (u) {
          setUser(u);
          const stored = getStoredUserType() || 'company';
          storeUserType(stored);
          setUserType(stored);
          return loadLeads();
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  async function loadLeads() {
    try { setLeads(await fetchLeads()); } catch { /* backend may not be running */ }
  }

  // ── Auth handlers ────────────────────────────────────────────────────────────
  const handleAuth = useCallback((u, isNewUser) => {
    setUser(u);
    const stored = getStoredUserType();
    if (isNewUser && !stored) {
      setAppStep('mode-select');
    } else {
      const type = stored || 'company';
      storeUserType(type);
      setUserType(type);
      setAppStep('app');
      loadLeads();
    }
  }, []);

  const handleModeSelect = useCallback((type) => {
    if (!VALID_TYPES.includes(type)) return;
    storeUserType(type);
    setUserType(type);
    if (type === 'jobseeker') {
      setAppStep('jobseeker-setup');
    } else {
      setAppStep('app');
      loadLeads();
    }
  }, []);

  const handleJobSeekerSetupComplete = useCallback(() => {
    setAppStep('app');
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    clearStoredUserType();
    setUser(null);
    setUserType(null);
    setLeads([]);
    setActivePage('Dashboard');
    setAppStep('app');
  }, []);

  // ── Lead persistence ─────────────────────────────────────────────────────────
  const handleLeadSaved = useCallback(async (lead) => {
    try {
      const saved = await saveLead(lead);
      setLeads(prev => {
        const exists = prev.find(l => l.id === saved.id);
        return exists ? prev.map(l => l.id === saved.id ? saved : l) : [saved, ...prev];
      });
      return saved;
    } catch (err) {
      console.error('Failed to save lead:', err);
      setLeads(prev => [lead, ...prev]);
      return lead;
    }
  }, []);

  const handleUpdateLead = useCallback(async (updated) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    try {
      const saved = await updateLeadApi(updated.id, { status: updated.status });
      setLeads(prev => prev.map(l => l.id === saved.id ? saved : l));
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  }, []);

  // ── Render guards ─────────────────────────────────────────────────────────────
  if (!authChecked)                   return null;
  if (!user && viewingLanding)        return <LandingPage onGetStarted={() => setViewingLanding(false)} />;
  if (!user)                          return <AuthPage onAuth={handleAuth} />;
  if (appStep === 'mode-select')      return <ModeSelectPage onSelect={handleModeSelect} />;
  if (appStep === 'jobseeker-setup')  return <JobSeekerSetupPage user={user} onComplete={handleJobSeekerSetupComplete} />;

  const isJobSeeker = userType === 'jobseeker';

  const renderPage = () => {
    // ── Job seeker pages ──────────────────────────────────────────────────────
    if (isJobSeeker) {
      switch (activePage) {
        case 'Dashboard':     return <JobSeekerDashboard user={user} setActivePage={setActivePage} />;
        case 'CV Optimiser':  return <CVOptimiserPage />;
        case 'Job Matches':   return <JobMatchesPage setActivePage={setActivePage} />;
        case 'Applications':  return <ApplicationsPage setActivePage={setActivePage} />;
        case 'Scam Detector': return <ScamDetectorPage />;
        case 'Outreach':      return <OutreachAssistantPage />;
        case 'Agent':         return <AgentPage onLeadSaved={handleLeadSaved} user={user} onGoToSettings={() => setActivePage('Settings')} />;
        case 'Settings':      return <SettingsPage user={user} onUserUpdated={setUser} />;
        default:              return <JobSeekerDashboard user={user} setActivePage={setActivePage} />;
      }
    }
    // ── Company pages (unchanged) ─────────────────────────────────────────────
    switch (activePage) {
      case 'Dashboard':  return <Dashboard leads={leads} setActivePage={setActivePage} />;
      case 'Agent':      return <AgentPage onLeadSaved={handleLeadSaved} user={user} onGoToSettings={() => setActivePage('Settings')} />;
      case 'Leads':      return <LeadsPage leads={leads} onUpdateLead={handleUpdateLead} setActivePage={setActivePage} />;
      case 'Sequences':  return <SequencesPage leads={leads} />;
      case 'Batch':      return <BatchPage onLeadSaved={handleLeadSaved} user={user} />;
      case 'Settings':   return <SettingsPage user={user} onUserUpdated={setUser} />;
      default:           return <Dashboard leads={leads} setActivePage={setActivePage} />;
    }
  };

  const floatingTarget = isJobSeeker ? 'Outreach' : 'Agent';
  const floatingLabel  = isJobSeeker ? 'Outreach Assistant' : 'Research a Lead';

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F0F', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        userType={userType}
        onLogout={handleLogout}
        onSettings={() => setActivePage('Settings')}
      />

      {activePage !== floatingTarget && (
        <button
          onClick={() => setActivePage(floatingTarget)}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 40,
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

      <main style={{ marginTop: 56, flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px)' }}>
        {renderPage()}
      </main>
    </div>
  );
}
