import React, { useState, useRef, useEffect } from 'react';
import { SettingsIcon } from './Icons';

export default function ProfileMenu({ full_name, email, avatar_url, role, score = 0, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = (full_name || email || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '6px 12px 6px 6px',
          background: 'rgba(168,85,247,0.08)',
          border: '1px solid rgba(168,85,247,0.2)',
          borderRadius: '40px', cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.45)'; e.currentTarget.style.background = 'rgba(168,85,247,0.14)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.2)'; e.currentTarget.style.background = 'rgba(168,85,247,0.08)'; }}
      >
        {avatar_url ? (
          <img src={avatar_url} alt={full_name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #a855f7, #f97316)',
            fontSize: '0.8rem', fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </div>
        )}
        <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e9d5ff', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {full_name || email?.split('@')[0] || 'User'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#a78bca' }}>
            {role === 'admin' ? '🛡️ Admin' : `⭐ ${score} pts`}
          </div>
        </div>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 10px)',
          width: 220, zIndex: 200,
          background: 'linear-gradient(135deg, #0e0820, #12063a)',
          border: '1px solid rgba(168,85,247,0.3)',
          borderRadius: '14px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid rgba(168,85,247,0.12)' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e9d5ff', marginBottom: '2px' }}>
              {full_name || 'User'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#a78bca', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </div>
            <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 10px', borderRadius: '12px', background: 'rgba(168,85,247,0.15)', fontSize: '0.72rem', color: '#c084fc' }}>
              {role === 'admin' ? '🛡️ Administrator' : `⭐ Score: ${score} pts`}
            </div>
          </div>
          <div style={{ padding: '6px' }}>
            <button
              onClick={() => { setOpen(false); onLogout?.(); }}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171', fontSize: '0.85rem', fontWeight: 600,
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}