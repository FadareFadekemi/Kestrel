import { useState } from 'react';
import { Bell, ChevronDown, Zap, LogOut, User, Settings } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const COMPANY_LINKS  = ['Dashboard', 'Leads', 'Sequences', 'Batch'];
const JOBSEEKER_LINKS = ['Dashboard', 'CV Optimiser', 'Job Matches', 'Applications', 'Outreach', 'Scam Detector'];

export default function Navbar({ activePage, setActivePage, user, userType, onLogout, onSettings }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isMobile  = useIsMobile();
  const NAV_LINKS = userType === 'jobseeker' ? JOBSEEKER_LINKS : COMPANY_LINKS;

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'K';

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';

  return (
    <nav data-fixed style={{
      background: 'rgba(10,15,15,0.92)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #1E3030',
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '0 12px' : '0 24px',
      paddingTop: 'max(0px, env(safe-area-inset-top, 0px))',
      height: 'calc(56px + env(safe-area-inset-top, 0px))',
      gap: isMobile ? 8 : 0,
    }}>
      {/* Logo */}
      <div onClick={() => setActivePage('Dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
        <div style={{
          background: 'linear-gradient(135deg, #00D4C8, #00B8AD)',
          borderRadius: 8, width: 28, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 12px rgba(0,212,200,0.35)',
        }}>
          <Zap size={14} color="#0A0F0F" fill="#0A0F0F" />
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.4px', color: '#00D4C8', fontFamily: "'Clash Display', sans-serif" }}>techcori</span>
        {!isMobile && (
          <span style={{ fontSize: 11, color: '#4A7A78', marginLeft: 4, fontStyle: 'italic' }}>
            work smart, rise sharp
          </span>
        )}
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 2, overflowX: 'auto', flexShrink: 1, minWidth: 0 }}>
        {NAV_LINKS.map(link => (
          <button key={link} onClick={() => setActivePage(link)} style={{
            fontSize: isMobile ? 12 : 13, fontWeight: activePage === link ? 500 : 400,
            color: activePage === link ? '#E8F5F4' : '#4A7A78',
            background: activePage === link ? '#1E3030' : 'transparent',
            border: 'none', borderRadius: 6,
            padding: isMobile ? '6px 10px' : '6px 14px',
            cursor: 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap',
          }}>{link}</button>
        ))}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, position: 'relative', flexShrink: 0 }}>
        {!isMobile && (
          <button style={{
            background: 'none', border: 'none', color: '#4A7A78', cursor: 'pointer',
            padding: 6, borderRadius: 6, position: 'relative', display: 'flex',
          }}>
            <Bell size={16} />
          </button>
        )}

        {/* User dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#111A1A', border: '1px solid #1E3030',
              borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'linear-gradient(135deg, #00D4C8, #00B8AD)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#0A0F0F', flexShrink: 0,
            }}>{initials}</div>
            {!isMobile && (
              <span style={{ fontSize: 13, color: '#C5E8E6', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
            )}
            <ChevronDown size={12} color="#4A7A78" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {dropdownOpen && (
            <>
              {/* Backdrop */}
              <div onClick={() => setDropdownOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
                background: '#111A1A', border: '1px solid #1E3030', borderRadius: 10,
                padding: '6px', minWidth: 200,
                boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                animation: 'fadeInUp 0.15s ease',
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #1E3030', marginBottom: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#E8F5F4', margin: 0 }}>{displayName}</p>
                  <p style={{ fontSize: 11, color: '#4A7A78', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                </div>
                <DropItem icon={<Settings size={13} />} label="Settings" onClick={() => { setDropdownOpen(false); onSettings?.(); }} />
                <DropItem icon={<LogOut size={13} />} label="Sign out" onClick={() => { setDropdownOpen(false); onLogout?.(); }} danger />
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function DropItem({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
      background: 'none', border: 'none', borderRadius: 6,
      padding: '7px 10px', cursor: 'pointer', textAlign: 'left',
      color: danger ? '#f87171' : '#C5E8E6', fontSize: 13,
      transition: 'background 0.1s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = '#1E3030'}
    onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {icon} {label}
    </button>
  );
}
