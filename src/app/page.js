'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/Icons';
import { getFlagCode } from '@/lib/worldcupApi';
import { supabase, defaultUsuarios } from '@/lib/supabase';
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
          <header className="home-header" style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
            <img
              src="/icons/logo-transparent.png"
              alt="Logo Copa 2026"
              style={{
                width: '60px',
                height: '60px',
                objectFit: 'contain'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', marginLeft: '0.5rem', flex: 1 }}>
              <h1>BOLÃO COPA 2026</h1>
              <p>EUA • México • Canadá</p>
            </div>
            {activeThemeObj && (
              <img
                src={`https://flagcdn.com/w40/${activeThemeObj.flag}.png`}
                alt={activeThemeObj.nome}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  marginRight: '0.5rem'
                }}
              />
            )}
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

            {!showLogin && !showRegister ? (
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
                
                <button className="home-btn" onClick={() => { setShowLogin(true); setShowRegister(false); setErrorMsg(''); }} style={{ gridColumn: 'span 2' }}>
                  <Icons.LogIn size={28} />
                  <span>Upar Bolão / Entrar</span>
                </button>
              </div>
            ) : showRegister ? (
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
            ) : (
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
                  <button type="submit" className="btn-submit">ENTRAR NO BOLÃO</button>
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
                  background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: '20px',
                  padding: '2rem',
                  maxWidth: '420px',
                  width: '100%',
                  textAlign: 'center',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💸</div>
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
                      background: '#25D366', color: '#fff', padding: '0.85rem', borderRadius: '12px',
                      fontWeight: 'bold', textDecoration: 'none', fontSize: '0.95rem',
                      boxShadow: '0 4px 12px rgba(37,211,102,0.3)', marginBottom: '0.75rem'
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
          </div>
        </div>
      )}
    </>
  );
}
