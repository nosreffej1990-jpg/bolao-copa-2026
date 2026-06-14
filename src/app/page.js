'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/Icons';
import { getFlagCode } from '@/lib/worldcupApi';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [liveMatches, setLiveMatches] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);

    // PWA setup
    if (typeof window !== 'undefined') {
      const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
      setIsInstalled(isStandalone);
      
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isAndroidDevice = /android/.test(userAgent);
      setIsIOS(isIOSDevice);
      setIsAndroid(isAndroidDevice);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fetch live matches for home banner
    fetchLiveMatches();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const fetchLiveMatches = async () => {
    try {
      const res = await fetch('/api/games', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const games = data.games || [];
      const live = games.filter(g =>
        g.finished === 'FALSE' &&
        g.time_elapsed !== 'notstarted' &&
        g.time_elapsed !== 'finished'
      );
      setLiveMatches(live);
    } catch (e) {
      // silently fail - live scores are optional
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('PWA instalado com sucesso');
    }
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const validUsers = [
      { user: 'Jefferson', pass: '060199' },
      { user: 'Junior', pass: '062026' }
    ];

    const match = validUsers.find(
      (u) => u.user.toLowerCase() === username.trim().toLowerCase() && u.pass === password
    );

    if (match) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('copa26_user', match.user);
      }
      router.push('/dashboard?tab=boloes');
    } else {
      setErrorMsg('Usuário ou senha incorretos!');
    }
  };

  const handleDirectNavigate = (tab) => {
    router.push(`/dashboard?tab=${tab}`);
  };

  return (
    <>
      {/* Loading Splash Screen */}
      {loading && (
        <div className="splash-screen">
          <div className="splash-logo-container">
            <div className="logo-glow"></div>
            {/* Trophy icon with no white border - use filter drop-shadow instead of boxShadow */}
            <img
              src="/icons/logo-transparent.png"
              className="splash-logo-img"
              alt="Taça"
              style={{
                width: '150px',
                height: '150px',
                objectFit: 'contain',
                borderRadius: '16px',
                background: 'transparent',
                mixBlendMode: 'normal',
                filter: 'drop-shadow(0 0 24px rgba(251,191,36,0.6))'
              }}
            />
          </div>
          <h2>BOLÃO COPA 2026</h2>
          <span>Carregando...</span>
          <div className="loader"></div>
        </div>
      )}

      {/* Main Home Screen */}
      {!loading && (
        <div className="home-page-wrapper">
          <header className="home-header">
            <img
              src="/icons/logo-transparent.png"
              alt="Logo Copa 2026"
              style={{
                width: '60px',
                height: '60px',
                objectFit: 'contain'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              <h1>BOLÃO COPA 2026</h1>
              <p>EUA • México • Canadá</p>
            </div>
          </header>

          <div className="home-container">
            {/* Live Match Banner */}
            {liveMatches.length > 0 && (
              <div
                onClick={() => handleDirectNavigate('placares_geral')}
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(251,191,36,0.08))',
                  border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: '14px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    background: '#ef4444', color: '#fff', fontSize: '0.6rem',
                    fontWeight: 'bold', padding: '0.2rem 0.5rem', borderRadius: '999px',
                    animation: 'pulse 1.5s infinite', letterSpacing: '1px'
                  }}>🔴 AO VIVO</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Toque para ver placar ›</span>
                </div>
                {liveMatches.slice(0, 2).map((g, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img src={`https://flagcdn.com/w40/${getFlagCode(g.home_team_name_en)}.png`} style={{ width: '22px' }} alt="" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 'bold' }}>{g.home_team_name_en}</span>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#fff', letterSpacing: '3px' }}>
                      {g.home_score} — {g.away_score}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 'bold' }}>{g.away_team_name_en}</span>
                      <img src={`https://flagcdn.com/w40/${getFlagCode(g.away_team_name_en)}.png`} style={{ width: '22px' }} alt="" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* iOS Install Banner */}
            {isIOS && !isInstalled && (
              <div className="ios-install-banner" style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.72rem',
                color: 'var(--text-secondary)', marginBottom: '1.25rem', textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '0.2rem',
                width: '100%', boxSizing: 'border-box'
              }}>
                <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.78rem' }}>📲 Adicione o App à Tela Inicial</span>
                <span>Toque no botão <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>Compartilhar</span> e depois em <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>Adicionar à Tela de Início</span> no seu Safari.</span>
              </div>
            )}

            {/* Android Install Banner (when beforeinstallprompt not available but not installed) */}
            {isAndroid && !isInstalled && !showInstallBtn && (
              <div style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.72rem',
                color: 'var(--text-secondary)', marginBottom: '1.25rem', textAlign: 'center',
                display: 'flex', flexDirection: 'column', gap: '0.2rem',
                width: '100%', boxSizing: 'border-box'
              }}>
                <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.78rem' }}>📲 Instale o App no Android</span>
                <span>Toque no menu <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>⋮</span> do Chrome e depois em <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>Adicionar à tela inicial</span>.</span>
              </div>
            )}

            {!showLogin ? (
              <div className="home-menu-grid">
                {/* Android/Chrome Install Button (when prompt is available) */}
                {showInstallBtn && (
                  <button
                    id="install-btn"
                    className="home-btn install-btn"
                    onClick={handleInstallClick}
                    style={{
                      gridColumn: 'span 2',
                      background: 'linear-gradient(135deg, var(--soccer-green), #10b981)',
                      color: '#000', fontWeight: 'bold',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <Icons.Plus size={24} style={{ color: '#000' }} />
                    <span>Adicionar à Tela Inicial</span>
                  </button>
                )}

                <button className="home-btn" onClick={() => handleDirectNavigate('ranking')}>
                  <Icons.Trophy size={28} />
                  <span>Ranking</span>
                </button>
                <button className="home-btn" onClick={() => handleDirectNavigate('placares_geral')}>
                  <Icons.Check size={28} />
                  <span>Resultados</span>
                </button>
                <button className="home-btn" onClick={() => handleDirectNavigate('confrontos_geral')}>
                  <Icons.Calendar size={28} />
                  <span>Confrontos</span>
                </button>
                <button className="home-btn" onClick={() => handleDirectNavigate('grupos')}>
                  <Icons.List size={28} />
                  <span>Grupos</span>
                </button>
                <button className="home-btn" onClick={() => setShowLogin(true)} style={{ gridColumn: 'span 2' }}>
                  <Icons.LogIn size={28} />
                  <span>Upar Bolão</span>
                </button>
              </div>
            ) : (
              <div className="login-container">
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Acesso Restrito</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Faça login para adicionar e gerenciar bolões
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit}>
                  <div className="form-group">
                    <label>Usuário</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: Jefferson"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Senha</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {errorMsg && (
                    <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                      ⚠️ {errorMsg}
                    </p>
                  )}
                  <button type="submit" className="btn-submit">ENTRAR NO BOLÃO</button>
                  <button
                    type="button"
                    onClick={() => { setShowLogin(false); setErrorMsg(''); }}
                    style={{ width: '100%', marginTop: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    ← Voltar
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
