'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/Icons';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

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
            <div className="splash-logo">🏆</div>
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
            <h1>BOLÃO COPA 2026</h1>
            <p>EUA • México • Canadá</p>
          </header>

          <div className="home-container">
            {!showLogin ? (
              <div className="home-menu-grid">
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
                <button className="home-btn" onClick={() => setShowLogin(true)}>
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
