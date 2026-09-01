import React from 'react';
import { LogoIcon } from './Icons';

const ACCENT_MAP = {
  purple: { active: 'rgba(168,85,247,0.25)', border: 'rgba(168,85,247,0.4)', text: '#e9d5ff', dot: '#a855f7' },
  orange: { active: 'rgba(249,115,22,0.2)',  border: 'rgba(249,115,22,0.4)',  text: '#fed7aa', dot: '#f97316' },
  green:  { active: 'rgba(34,197,94,0.2)',   border: 'rgba(34,197,94,0.4)',   text: '#bbf7d0', dot: '#22c55e' },
};

export default function Sidebar({ items = [], activeItem, onSelect, accent = 'purple', title = 'DSA_Tracker' }) {
  const colors = ACCENT_MAP[accent] || ACCENT_MAP.purple;

  return (
    <aside className="dt-sidebar">
      <div className="dt-sidebar-logo">
        <LogoIcon size={30} />
        <span>{title}</span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {items.map(item => {
          const isActive = activeItem === item.key;
          return (
            <button
              key={item.key}
              className="dt-nav-item"
              style={isActive ? {
                background: `linear-gradient(135deg, ${colors.active} 0%, rgba(0,0,0,0.1) 100%)`,
                borderColor: colors.border,
                color: colors.text,
              } : {}}
              onClick={() => onSelect(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge ? (
                <span style={{
                  minWidth: '20px', height: '20px', padding: '0 5px',
                  background: '#f97316', borderRadius: '10px',
                  fontSize: '0.7rem', fontWeight: 700, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.badge}
                </span>
              ) : null}
              {isActive && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: colors.dot, flexShrink: 0,
                }} />
              )}
            </button>
          );
        })}
      </nav>

      <div style={{
        marginTop: 'auto', paddingTop: '1rem',
        borderTop: '1px solid rgba(168,85,247,0.1)',
        fontSize: '0.72rem', color: 'rgba(107,90,135,0.7)',
        textAlign: 'center',
      }}>
        DSA Tracker v2.0
      </div>
    </aside>
  );
}