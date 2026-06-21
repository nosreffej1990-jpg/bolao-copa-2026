'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/Icons';
import { getFlagCode, formatMatchDate } from '@/lib/worldcupApi';
import { supabase, defaultUsuarios, isSupabaseConfigured } from '@/lib/supabase';
import { useTheme, THEMES } from '@/components/ThemeProvider';

export default function Home() {
  const { theme } = useTheme();
  const activeThemeObj = THEMES[theme] || THEMES['brasil'];
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [regErrorMsg, setRegErrorMsg] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [allowRegister, setAllowRegister] = useState(true);
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

    // Fetch live matches and configurations
    fetchLiveMatches();
    fetchConfig();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await supabase.from('config').select('*');
      if (data) {
        const item = data.find(c => c.key === 'allow_register');
        if (item) {
          setAllowRegister(item.value === 'true');
        }
      }
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
    }
  };

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

      const upcoming = games.filter(g =>
        g.finished === 'FALSE' &&
        (g.time_elapsed === 'notstarted' || !g.time_elapsed)
      );
      setUpcomingMatches(upcoming.slice(0, 3));
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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      // Query from database (Supabase or LocalStorage)
      const { data, error } = await supabase.from('usuarios').select('*');
      if (error) throw error;

      let userObj = (data || []).find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase()
      );

      // Fallback for hardcoded admins/moderators if not in DB
      if (!userObj) {
        userObj = defaultUsuarios.find(
          (u) => u.username.toLowerCase() === username.trim().toLowerCase()
        );
      }

      if (userObj && userObj.password === password) {
        if (!userObj.approved) {
          setShowPixModal(true);
          return;
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('copa26_user', userObj.username);
          localStorage.setItem('copa26_role', userObj.role || 'Jogador');
          localStorage.setItem('copa26_pass', password);
          localStorage.setItem('copa26_approved', userObj.approved ? 'true' : 'false');
        }
        router.push('/dashboard?tab=ranking');
      } else {
        setErrorMsg('Usuário ou senha incorretos!');
      }
    } catch (err) {
      setErrorMsg('Erro ao conectar ao banco de dados.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegErrorMsg('');

    const formattedUsername = regUsername.trim();
    if (!formattedUsername) {
      setRegErrorMsg('Usuário inválido');
      return;
    }

    try {
      if (isSupabaseConfigured) {
        const response = await fetch('/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register',
            regUsername: formattedUsername,
            regPassword,
            regWhatsapp
          })
        });

        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.error || 'Erro desconhecido ao cadastrar');
        }
      } else {
        const { data: existing, error: fetchErr } = await supabase.from('usuarios').select('*');
        if (fetchErr) throw fetchErr;

        const userExists = (existing || []).some(
          (u) => u.username.toLowerCase() === formattedUsername.toLowerCase()
        );

        if (userExists) {
          setRegErrorMsg('Nome de usuário já está em uso.');
          return;
        }

        const newUser = {
          username: formattedUsername,
          password: regPassword,
          whatsapp: regWhatsapp,
          role: 'Jogador',
          approved: false
        };

        const { error: insertErr } = await supabase.from('usuarios').insert(newUser);
        if (insertErr) throw insertErr;
      }

      setShowPixModal(true);
      setShowRegister(false);
      setShowLogin(true);
      setUsername(formattedUsername);
      setPassword(regPassword);
    } catch (err) {
      console.error('Erro detalhado no cadastro:', err);
      setRegErrorMsg(`Erro ao realizar o cadastro: ${err.message || err.error_description || JSON.stringify(err)}`);
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
          <header className="home-header" style={{
            position: 'relative',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '55px 1fr 55px',
            alignItems: 'center',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(225, 182, 79, 0.15)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <img
                src="/icons/logo-transparent.png"
                alt="Logo Copa 2026"
                style={{
                  width: '42px',
                  height: '52px',
                  objectFit: 'contain'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <h1 style={{
                margin: 0,
                fontSize: '1.4rem',
                fontWeight: '800',
                letterSpacing: '0.8px',
                lineHeight: '1.1',
                background: 'linear-gradient(to bottom, var(--gold-light) 0%, var(--gold-mid) 55%, var(--gold-dark) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: 'var(--font-main)'
              }}>
                BOLÃO COPA 2026
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>
                  EUA • MX • CAN
                </p>
                {isSupabaseConfigured ? (
                  <span title="Conectado ao Supabase Cloud" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.55rem', background: 'rgba(16,185,129,0.12)', color: 'var(--soccer-green)', padding: '0px 4px', borderRadius: '3px', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 'bold' }}>
                    Nuvem
                  </span>
                ) : (
                  <span title="As chaves do Supabase não estão configuradas no .env.local. Os dados são salvos apenas no seu navegador (LocalStorage)." style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.55rem', background: 'rgba(251,191,36,0.12)', color: 'var(--accent-gold)', padding: '0px 4px', borderRadius: '3px', border: '1px solid rgba(251,191,36,0.3)', fontWeight: 'bold' }}>
                    Demo
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(225, 182, 79, 0.05)',
                  border: '1.5px solid var(--accent-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Icons.User size={18} style={{ color: 'var(--accent-gold)' }} />
              </div>
            </div>
          </header>

          <div className="home-container" style={{ paddingBottom: '5.5rem' }}>
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
             {!showLogin && !showRegister && (
              <div className="home-menu-grid" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                
                {/* Android/Chrome Install Banner / Button */}
                {showInstallBtn && (
                  <div 
                    onClick={handleInstallClick}
                    style={{
                      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(184, 134, 11, 0.05) 100%)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      cursor: 'pointer',
                      boxShadow: '0 8px 32px rgba(251, 191, 36, 0.1)',
                      transition: 'transform 0.2s',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{
                      background: 'linear-gradient(135deg, #FBBF24, #D97706)',
                      borderRadius: '12px',
                      width: '42px',
                      height: '42px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000'
                    }}>
                      <Icons.Plus size={20} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>Adicionar à Tela Inicial</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Instale o app e acesse mais rápido</span>
                    </div>
                    <Icons.ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }} />
                  </div>
                )}

                {/* Primary Action Card: Login & Upload */}
                <div 
                  onClick={() => { setShowLogin(true); setShowRegister(false); setErrorMsg(''); }}
                  style={{
                    background: 'var(--btn-primary-bg)',
                    border: '1px solid rgba(210, 167, 79, 0.4)',
                    borderRadius: '20px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 8px 30px rgba(251, 191, 36, 0.35), 0 0 60px rgba(251, 191, 36, 0.1)',
                    transition: 'all 0.2s',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 35px rgba(251, 191, 36, 0.45)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(251, 191, 36, 0.3)';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center', gap: '0.15rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1a0f00', letterSpacing: '0.05em', textTransform: 'uppercase' }}>ENTRAR</span>
                  </div>
                  
                </div>

                {/* 2x2 Grid for standard features */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div 
                    onClick={() => handleDirectNavigate('ranking')}
                    className="home-btn"
                    style={{
                      background: 'var(--bg-card)',
                      backdropFilter: 'blur(10px)',
                      border: '2px solid var(--accent-gold)', boxShadow: '0 0 10px rgba(225, 182, 79, 0.4), inset 0 0 10px rgba(225, 182, 79, 0.2)',
                      borderRadius: '16px',
                      padding: '1.25rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.6rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      background: 'transparent',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--accent-gold)', boxShadow: '0 0 10px rgba(225, 182, 79, 0.4), inset 0 0 10px rgba(225, 182, 79, 0.2)'
                    }}>
                      <Icons.Trophy size={20} style={{ color: 'var(--accent-gold)' }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>Classificação</span>
                    <span className="text-gold-gradient" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Ver líderes e pontos</span>
                  </div>

                  <div 
                    onClick={() => handleDirectNavigate('placares_geral')}
                    className="home-btn"
                    style={{
                      background: 'var(--bg-card)',
                      backdropFilter: 'blur(10px)',
                      border: '2px solid var(--accent-gold)', boxShadow: '0 0 10px rgba(225, 182, 79, 0.4), inset 0 0 10px rgba(225, 182, 79, 0.2)',
                      borderRadius: '16px',
                      padding: '1.25rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.6rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      background: 'transparent',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--accent-gold)', boxShadow: '0 0 10px rgba(225, 182, 79, 0.4), inset 0 0 10px rgba(225, 182, 79, 0.2)'
                    }}>
                      <Icons.Check size={20} style={{ color: 'var(--accent-gold)' }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>Resultados</span>
                    <span className="text-gold-gradient" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Jogos finalizados</span>
                  </div>

                  <div 
                    onClick={() => handleDirectNavigate('confrontos_geral')}
                    className="home-btn"
                    style={{
                      background: 'var(--bg-card)',
                      backdropFilter: 'blur(10px)',
                      border: '2px solid var(--accent-gold)', boxShadow: '0 0 10px rgba(225, 182, 79, 0.4), inset 0 0 10px rgba(225, 182, 79, 0.2)',
                      borderRadius: '16px',
                      padding: '1.25rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.6rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      background: 'transparent',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--accent-gold)', boxShadow: '0 0 10px rgba(225, 182, 79, 0.4), inset 0 0 10px rgba(225, 182, 79, 0.2)'
                    }}>
                      <Icons.Calendar size={20} style={{ color: 'var(--accent-gold)' }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>Confrontos</span>
                    <span className="text-gold-gradient" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Agenda de jogos</span>
                  </div>

                  <div 
                    onClick={() => handleDirectNavigate('grupos')}
                    className="home-btn"
                    style={{
                      background: 'var(--bg-card)',
                      backdropFilter: 'blur(10px)',
                      border: '2px solid var(--accent-gold)', boxShadow: '0 0 10px rgba(225, 182, 79, 0.4), inset 0 0 10px rgba(225, 182, 79, 0.2)',
                      borderRadius: '16px',
                      padding: '1.25rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.6rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      background: 'transparent',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--accent-gold)', boxShadow: '0 0 10px rgba(225, 182, 79, 0.4), inset 0 0 10px rgba(225, 182, 79, 0.2)'
                    }}>
                      <Icons.List size={20} style={{ color: 'var(--accent-gold)' }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>Grupos</span>
                    <span className="text-gold-gradient" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Classificação oficial</span>
                  </div>
                </div>

                {/* Próximos Jogos Section */}
                <div style={{ marginTop: '0.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 0.25rem' }}>
                    <span className="text-gold-gradient" style={{ fontSize: '1rem', fontWeight: '900', letterSpacing: '0.05em', textTransform: 'uppercase' }}>PRÓXIMOS JOGOS</span>
                    <Icons.ChevronRight size={18} style={{ color: 'var(--accent-gold)', cursor: 'pointer' }} onClick={() => handleDirectNavigate('confrontos_geral')} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.85rem', overflowX: 'auto', paddingBottom: '0.5rem', width: '100%', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                    {upcomingMatches.map((g, idx) => (
                      <div key={idx} style={{
                        minWidth: '200px',
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.18) 0%, rgba(212, 160, 23, 0.08) 100%)',
                        border: '1px solid rgba(251, 191, 36, 0.35)',
                        borderRadius: '16px',
                        padding: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxSizing: 'border-box',
                        boxShadow: '0 4px 20px rgba(251, 191, 36, 0.08)'
                      }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#FBBF24' }}>
                          {formatMatchDate(g.match_date).date} {g.match_time ? g.match_time.slice(0, 5) : ''}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', width: '100%' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '0.2rem' }}>
                            <img src={`https://flagcdn.com/w40/${getFlagCode(g.home_team_name_en)}.png`} style={{ width: '26px', height: '17px', objectFit: 'cover', borderRadius: '2px' }} alt="" />
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#fff', textAlign: 'center', maxWidth: '65px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {g.home_team_name_en}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#FBBF24', fontWeight: '900' }}>VS</span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '0.2rem' }}>
                            <img src={`https://flagcdn.com/w40/${getFlagCode(g.away_team_name_en)}.png`} style={{ width: '26px', height: '17px', objectFit: 'cover', borderRadius: '2px' }} alt="" />
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#fff', textAlign: 'center', maxWidth: '65px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {g.away_team_name_en}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {upcomingMatches.length === 0 && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', width: '100%', textAlign: 'center', padding: '1rem' }}>
                        Nenhum jogo próximo agendado
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

             {showRegister && (
               <div className="login-container">
                 <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                   <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                   <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: '#fff' }}>Cadastro de Jogador</h3>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                     Crie sua conta para apostar nas próximas fases (mata-mata)
                   </p>
                 </div>

                 <form onSubmit={handleRegisterSubmit}>
                   <div className="form-group">
                     <label>Nome de Usuário</label>
                     <input
                       type="text"
                       className="form-control"
                       placeholder="Ex: joao_silva"
                       value={regUsername}
                       onChange={(e) => setRegUsername(e.target.value)}
                       required
                     />
                   </div>
                   <div className="form-group">
                     <label>Senha de Acesso</label>
                     <input
                       type="password"
                       className="form-control"
                       placeholder="Escolha sua senha"
                       value={regPassword}
                       onChange={(e) => setRegPassword(e.target.value)}
                       required
                     />
                   </div>
                   <div className="form-group">
                     <label>WhatsApp (com DDD)</label>
                     <input
                       type="text"
                       className="form-control"
                       placeholder="Ex: 22997973476"
                       value={regWhatsapp}
                       onChange={(e) => setRegWhatsapp(e.target.value)}
                       required
                     />
                   </div>
                   {regErrorMsg && (
                     <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                       ⚠️ {regErrorMsg}
                     </p>
                   )}
                   <button type="submit" className="btn-submit" style={{ background: 'linear-gradient(135deg, var(--soccer-green), #10b981)', color: '#000', fontWeight: 'bold' }}>FINALIZAR CADASTRO</button>
                   <button
                     type="button"
                     onClick={() => { setShowRegister(false); setShowLogin(true); setRegErrorMsg(''); }}
                     style={{ width: '100%', marginTop: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}
                   >
                     Já tem conta? Fazer Login
                   </button>
                   <button
                     type="button"
                     onClick={() => { setShowRegister(false); setShowLogin(false); setRegErrorMsg(''); }}
                     style={{ width: '100%', marginTop: '0.25rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}
                   >
                     ← Voltar
                   </button>
                 </form>
               </div>
             )}

             {showLogin && (
               <div className="login-container">
                 <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                   <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</div>
                   <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: '#fff' }}>Acesso Restrito</h3>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                     Faça login para gerenciar ou lançar seus palpites
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
                    <button type="submit" className="btn-submit" style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid #E1B64F',
                      background: 'var(--btn-primary-bg)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      fontWeight: '800',
                      letterSpacing: '1px'
                    }}>
                      ENTRAR NO BOLÃO
                    </button>
                   {allowRegister ? (
                     <button
                       type="button"
                       onClick={() => { setShowRegister(true); setShowLogin(false); setErrorMsg(''); }}
                       style={{ width: '100%', marginTop: '0.75rem', background: 'transparent', border: 'none', color: 'var(--accent-gold)', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
                     >
                       Criar Nova Conta (Jogador)
                     </button>
                   ) : (
                     <div style={{ margin: '0.75rem 0', fontSize: '0.72rem', color: 'rgba(239, 68, 68, 0.8)', fontWeight: 'bold', textAlign: 'center' }}>
                       🔒 Novos cadastros suspensos pelo Admin
                     </div>
                   )}
                   <button
                     type="button"
                     onClick={() => { setShowLogin(false); setErrorMsg(''); }}
                     style={{ width: '100%', marginTop: '0.25rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}
                   >
                     ← Voltar
                   </button>
                 </form>
               </div>
             )}

            {/* PIX / Whatsapp Verification Modal */}
            {showPixModal && (
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem', backdropFilter: 'blur(8px)'
              }}>
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-active)',
                  borderRadius: '20px',
                  padding: '2rem',
                  maxWidth: '420px',
                  width: '100%',
                  textAlign: 'center',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
                }}>
                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                    <Icons.Check size={48} style={{ color: 'var(--accent-gold)' }} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>
                    Cadastro Pendente de Aprovação
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#d1d5db', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                    Sua conta foi criada! Para liberar o acesso aos palpites da próxima fase, faça o pagamento da taxa do Bolão e encaminhe o comprovante Pix para o <strong>Junior</strong> via WhatsApp.
                  </p>

                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    fontSize: '0.8rem',
                    color: '#9ca3af',
                    marginBottom: '1.5rem',
                    cursor: 'pointer'
                  }} onClick={() => {
                    navigator.clipboard.writeText('+55 22 99797-3476');
                    alert('Chave Pix copiada!');
                  }}>
                    Chave Pix (Celular Junior):<br/>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>+55 22 99797-3476 📋 (Copiar)</strong>
                  </div>

                  <a
                    href={`https://wa.me/5522997973476?text=Ol%C3%A1%20Junior%2C%20conclu%C3%AD%20meu%20cadastro%20no%20Bol%C3%A3o%20Copa%202026%20como%20%22${username || regUsername}%22.%20Segue%20o%20comprovante%20PIX%20para%20aprova%C3%A7%C3%A3o!`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)', textShadow: '0 1px 2px rgba(255,255,255, 0.4)', padding: '0.85rem', borderRadius: '12px',
                      fontWeight: 'bold', textDecoration: 'none', fontSize: '0.95rem',
                      boxShadow: '0 4px 12px rgba(210, 167, 79, 0.3)', marginBottom: '0.75rem'
                    }}
                  >
                    <span>💬 Enviar Comprovante no WhatsApp</span>
                  </a>

                  <button
                    onClick={() => { setShowPixModal(false); }}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none',
                      color: '#9ca3af', padding: '0.6rem', borderRadius: '10px',
                      fontSize: '0.8rem', cursor: 'pointer'
                    }}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
            {/* Bottom Tab Bar */}
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: '480px',
              background: 'var(--bg-header)',
              backdropFilter: 'blur(12px)',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-around',
              padding: '0.6rem 0.5rem 0.75rem',
              boxSizing: 'border-box',
              zIndex: 100,
              borderTopLeftRadius: '18px',
              borderTopRightRadius: '18px',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.4)'
            }}>
              <div 
                onClick={() => { setShowLogin(false); setShowRegister(false); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', flex: 1 }}
              >
                <Icons.Home size={21} style={{ color: (!showLogin && !showRegister) ? 'var(--accent-gold)' : 'var(--text-secondary)' }} />
                <span className={(!showLogin && !showRegister) ? "text-gold-gradient" : ""} style={{ fontSize: '0.6rem', fontWeight: '700', color: (!showLogin && !showRegister) ? 'transparent' : 'var(--text-secondary)', letterSpacing: '0.03em' }}>INÍCIO</span>
              </div>
              <div 
                onClick={() => handleDirectNavigate('ranking')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', flex: 1 }}
              >
                <Icons.Trophy size={21} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>CLASSIFICAÇÃO</span>
              </div>
              <div 
                onClick={() => { setShowLogin(true); setShowRegister(false); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', flex: 1 }}
              >
                <Icons.LogIn size={21} style={{ color: (showLogin || showRegister) ? 'var(--accent-gold)' : 'var(--text-secondary)' }} />
                <span className={(showLogin || showRegister) ? "text-gold-gradient" : ""} style={{ fontSize: '0.6rem', fontWeight: '700', color: (showLogin || showRegister) ? 'transparent' : 'var(--text-secondary)', letterSpacing: '0.03em' }}>LOGIN</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
