'use client';

import { useEffect, useState } from 'react';
import { THEMES } from './ThemeProvider';

export default function FirstLaunchOverlay() {
  const [show, setShow] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);

  useEffect(() => {
    // Show only if user is logged in but has not chosen their tournament champion prediction yet
    const checkStatus = () => {
      const user = localStorage.getItem('copa26_user');
      const chosen = localStorage.getItem('copa26_champion_chosen');
      if (user && !chosen) {
        setShow(true);
      } else {
        setShow(false);
      }
    };

    // Check periodically or run immediately
    checkStatus();
    const interval = setInterval(checkStatus, 1500);
    return () => clearInterval(interval);
  }, []);

  if (!show) return null;

  const handleSelectTeam = (team) => {
    setSelectedTeam(team);
    setConfirmModal(true);
  };

  const handleConfirm = async () => {
    const user = localStorage.getItem('copa26_user');
    const pass = localStorage.getItem('copa26_pass');
    
    localStorage.setItem('copa26_champion_chosen', selectedTeam.nome);

    if (user && pass) {
      try {
        await fetch('/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateChampion',
            username: user,
            password: pass,
            champion: selectedTeam.nome
          })
        });
      } catch (e) {
        console.error('Erro ao salvar palpite no banco de dados:', e);
      }
    }

    setConfirmModal(false);
    setShow(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#070a13', zIndex: 9999, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      padding: '2rem 1rem', overflowY: 'auto'
    }}>
      <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center', margin: '0 auto' }}>
        
        {/* Header Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <img
            src="/icons/logo-transparent.png"
            alt="Logo Bolão Copa 2026"
            style={{ width: '90px', height: '90px', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(255,215,0,0.2))' }}
          />
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px', margin: 0 }}>
            BOLÃO COPA 2026
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>
            EUA • México • Canadá
          </p>
        </div>

        {/* Message */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 'bold', color: '#fff', margin: '0 0 0.4rem 0' }}>
            🏆 Quem será a Campeã da Copa?
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5', margin: 0 }}>
            Selecione a seleção que você acredita que levantará a taça em 2026! Seu palpite ficará registrado no seu perfil do bolão.
          </p>
        </div>

        {/* 48 Teams Rolland Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem',
          maxHeight: '52vh', overflowY: 'auto', padding: '0.5rem',
          background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '16px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
        }}>
          {Object.values(THEMES).map(t => (
            <div
              key={t.id}
              onClick={() => handleSelectTeam(t)}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px',
                padding: '0.75rem 0.5rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'transform 0.2s, background-color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              }}
            >
              <img
                src={`https://flagcdn.com/w80/${t.flag}.png`}
                alt={t.nome}
                style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.4)'
                }}
              />
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#e5e7eb', textAlign: 'center', wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {t.nome}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* Confirmation Modal */}
      {confirmModal && selectedTeam && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
            border: '2px solid #3b82f6',
            borderRadius: '24px',
            padding: '2rem 1.5rem',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <img
              src={`https://flagcdn.com/w160/${selectedTeam.flag}.png`}
              alt={selectedTeam.nome}
              style={{
                width: '60px', height: '60px', borderRadius: '50%',
                objectFit: 'cover', border: '3px solid #3b82f6',
                boxShadow: '0 8px 20px rgba(0,0,0,0.5)', marginBottom: '1.25rem'
              }}
            />
            <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 'bold', marginBottom: '0.75rem' }}>
              Confirmar Palpite: {selectedTeam.nome}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#d1d5db', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              Você confirma que o <strong>{selectedTeam.nome}</strong> será o grande campeão da Copa do Mundo de 2026? 
              <br/><br/>
              Esse palpite de campeão será registrado na sua conta e não poderá ser alterado posteriormente.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setConfirmModal(false)}
                style={{
                  flex: 1, padding: '0.65rem', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 'bold',
                  background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: 'none', cursor: 'pointer'
                }}
              >
                Voltar
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  flex: 1, padding: '0.65rem', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                }}
              >
                Confirmar Palpite! 🏆
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
