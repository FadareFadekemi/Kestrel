import { useState } from 'react';
import { ChevronDown, Zap, LogOut, Settings, Menu, X, ChevronRight } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const COMPANY_LINKS   = ['Dashboard', 'Leads', 'Sequences', 'Batch'];
const JOBSEEKER_LINKS = ['Dashboard', 'CV Optimiser', 'Job Matches', 'Applications', 'Outreach', 'Scam Detector'];

export default function Navbar({ activePage, setActivePage, user, userType, onLogout, onSettings }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const isMobile  = useIsMobile();
  const NAV_LINKS = userType === 'jobseeker' ? JOBSEEKER_LINKS : COMPANY_LINKS;

  const initials    = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : user?.email?.[0]?.toUpperCase() || 'T';
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';

  const navigate = (page) => {
    setActivePage(page);
    setMobileOpen(false);
    setDropdownOpen(false);
  };

  return (
    <>
      <nav style={{
        background: 'rgba(10,15,15,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #1E3030',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      }}>
        {/* Safe-area spacer — fills the status bar / notch on iOS PWA */}
        <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />

        {/* Actual nav row — always exactly 56px tall */}
        <div style={{
          height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '0 16px' : '0 24px',
          gap: 8,
        }}>
          {/* Logo */}
          <div onClick={() => navigate('Dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
            <div style={{
              background: 'linear-gradient(135deg, #00D4C8, #00B8AD)',
              borderRadius: 8, width: 28, height: 28, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 12px rgba(0,212,200,0.35)',
            }}>
              <Zap size={14} color="#0A0F0F" fill="#0A0F0F" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#00D4C8', fontFamily: "'Clash Display', sans-serif", letterSpacing: '-0.3px' }}>techcori</span>
          </div>

          {/* Desktop nav links */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 2, flex: 1, justifyContent: 'center' }}>
              {NAV_LINKS.map(link => (
                <button key={link} onClick={() => navigate(link)} style={{
                  fontSize: 13, fontWeight: activePage === link ? 600 : 400,
                  color: activePage === link ? '#00D4C8' : '#4A7A78',
                  background: activePage === link ? 'rgba(0,212,200,0.08)' : 'transparent',
                  border: 'none', borderRadius: 7,
                  padding: '6px 14px',
                  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}>{link}</button>
              ))}
            </div>
          )}

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Desktop user dropdown */}
            {!isMobile && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setDropdownOpen(o => !o)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#111A1A', border: '1px solid #1E3030',
                  borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00D4C8, #00B8AD)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#0A0F0F', flexShrink: 0,
                  }}>{initials}</div>
                  <span style={{ fontSize: 13, color: '#C5E8E6', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                  <ChevronDown size={12} color="#4A7A78" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>

                {dropdownOpen && (
                  <>
                    <div onClick={() => setDropdownOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
                      background: '#111A1A', border: '1px solid #1E3030', borderRadius: 10,
                      padding: 6, minWidth: 200,
                      boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
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
            )}

            {/* Mobile: avatar + hamburger */}
            {isMobile && (
              <>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00D4C8, #00B8AD)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#0A0F0F', flexShrink: 0,
                }}>{initials}</div>
                <button onClick={() => setMobileOpen(o => !o)} style={{
                  background: 'none', border: 'none', color: '#E8F5F4',
                  cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
                }}>
                  {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile full-screen nav sheet */}
      {isMobile && mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 49,
            width: '80%', maxWidth: 300,
            background: '#111A1A', borderLeft: '1px solid #1E3030',
            display: 'flex', flexDirection: 'column',
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}>
            {/* Sheet header */}
            <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #1E3030' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: 0 }}>{displayName}</p>
                <p style={{ fontSize: 11, color: '#4A7A78', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{user?.email}</p>
              </div>
              <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: '#4A7A78', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Nav links */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {NAV_LINKS.map(link => (
                <button key={link} onClick={() => navigate(link)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px', background: activePage === link ? 'rgba(0,212,200,0.08)' : 'none',
                  border: 'none', borderLeft: activePage === link ? '3px solid #00D4C8' : '3px solid transparent',
                  color: activePage === link ? '#00D4C8' : '#C5E8E6',
                  fontSize: 15, fontWeight: activePage === link ? 600 : 400,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  {link}
                  {activePage === link && <ChevronRight size={14} />}
                </button>
              ))}
            </div>

            {/* Bottom actions */}
            <div style={{ padding: '12px 0', borderTop: '1px solid #1E3030', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
              <button onClick={() => { setMobileOpen(false); onSettings?.(); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 20px', background: 'none', border: 'none',
                color: '#8ABAB8', fontSize: 14, cursor: 'pointer', textAlign: 'left',
              }}>
                <Settings size={15} /> Settings
              </button>
              <button onClick={() => { setMobileOpen(false); onLogout?.(); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 20px', background: 'none', border: 'none',
                color: '#f87171', fontSize: 14, cursor: 'pointer', textAlign: 'left',
              }}>
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </>
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
