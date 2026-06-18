'use client';

import { useState } from 'react';
import { useTheme, THEMES } from './ThemeProvider';

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botão flutuante de tema */}
      <button
        id="theme-selector-btn"
        className="theme-fab"
        onClick={() => setOpen(true)}
        title="Trocar tema"
        aria-label="Abrir seletor de tema"
      >
        <span style={{ fontSize: '1.2rem' }}>🎨</span>
      </button>

      {/* Modal de seleção */}
      {open && (
        <div className="theme-modal-overlay" onClick={() => setOpen(false)}>
          <div className="theme-modal" onClick={e => e.stopPropagation()}>
            <div className="theme-modal-header">
              <span>🎨 Escolha o Tema (Seleções)</span>
              <button className="theme-modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="theme-grid" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {Object.values(THEMES).map(t => (
                <button
                  key={t.id}
                  className={`theme-option ${theme === t.id ? 'theme-option--active' : ''}`}
                  onClick={() => { setTheme(t.id); setOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '0.4rem', background: 'rgba(255,255,255,0.02)' }}
                >
                  <img
                    src={`https://flagcdn.com/w40/${t.flag}.png`}
                    alt={t.nome}
                    style={{ width: '24px', height: '16px', borderRadius: '3px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <span className="theme-label" style={{ fontSize: '0.82rem', fontWeight: '600', color: '#fff', flex: 1, textAlign: 'left' }}>
                    {t.nome}
                  </span>
                  {theme === t.id && <span className="theme-check" style={{ color: 'var(--accent-gold)' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
