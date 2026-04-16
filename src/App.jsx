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
import { isLoggedIn, logout, fetchMe } from './services/authApi';
import { fetchLeads, saveLead, updateLead as updateLeadApi } from './services/leadsApi';
import './index.css';

export default function App() {
  const [activePage, setActivePage] = useState('Dashboard');
  const [leads,      setLeads]      = useState([]);
  const [user,       setUser]       = useState(null);
  const [authChecked, setAuthChecked] = useState(false);  // prevents flash

  // ── Restore session on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn()) { setAuthChecked(true); return; }
    fetchMe()
      .then(u => {
        if (u) { setUser(u); return loadLeads(); }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  async function loadLeads() {
    try {
      const data = await fetchLeads();
      setLeads(data);
    } catch { /* backend may not be running yet */ }
  }

  // ── Auth handlers ───────────────────────────────────────────────────────────
  const handleAuth = useCallback((u) => {
    setUser(u);
    loadLeads();
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setUser(null);
    setLeads([]);
    setActivePage('Dashboard');
  }, []);

  // ── Lead persistence ────────────────────────────────────────────────────────
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
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l)); // optimistic
    try {
      const saved = await updateLeadApi(updated.id, { status: updated.status });
      setLeads(prev => prev.map(l => l.id === saved.id ? saved : l));
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  }, []);

  // ── Render guard ────────────────────────────────────────────────────────────
  if (!authChecked) return null;  // brief blank while checking session
  if (!user) return <AuthPage onAuth={handleAuth} />;

  const renderPage = () => {
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

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', flexDirection: 'column' }}>
      <Navbar activePage={activePage} setActivePage={setActivePage} user={user} onLogout={handleLogout} onSettings={() => setActivePage('Settings')} />

      {activePage !== 'Agent' && (
        <button
          onClick={() => setActivePage('Agent')}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 40,
            background: 'linear-gradient(135deg, #f59e0b, #b45309)',
            color: '#09090b', border: 'none', borderRadius: 12,
            padding: '12px 20px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 8px 28px rgba(245,158,11,0.35)',
          }}
        >
          <Zap size={14} fill="currentColor" /> Research a Lead
        </button>
      )}

      <main style={{ marginTop: 56, flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px)' }}>
        {renderPage()}
      </main>
    </div>
  );
}
