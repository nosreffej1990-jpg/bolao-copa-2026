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
              <span>🎨 Escolha o Tema</span>
              <button className="theme-modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="theme-grid">
              {Object.values(THEMES).map(t => (
                <button
                  key={t.id}
                  className={`theme-option ${theme === t.id ? 'theme-option--active' : ''}`}
                  onClick={() => { setTheme(t.id); setOpen(false); }}
                >
                  <div className="theme-preview">
                    {t.preview.map((color, i) => (
                      <span key={i} style={{ background: color }} />
                    ))}
                  </div>
                  <span className="theme-emoji">{t.emoji}</span>
                  <span className="theme-label">{t.nome}</span>
                  {theme === t.id && <span className="theme-check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
