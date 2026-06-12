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
    // Simulate initial asset loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Pre-registered users
    const validUsers = [
      { user: 'Jefferson', pass: '060199' },
      { user: 'Junior', pass: '062026' }
    ];

    const match = validUsers.find(
      (u) => u.user.toLowerCase() === username.trim().toLowerCase() && u.pass === password
    );

    if (match) {
      // Save credentials in session storage / local storage
      if (typeof window !== 'undefined') {
        localStorage.setItem('copa26_user', match.user);
      }
      router.push('/dashboard');
    } else {
      setErrorMsg('Login ou Senha incorretos!');
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
                <button className="home-btn" onClick={() => setShowLogin(true)}>
                  <Icons.LogIn size={28} />
                  <span>Login</span>
                </button>
                
                <button className="home-btn" onClick={() => handleDirectNavigate('ranking')}>
                  <Icons.Trophy size={28} />
                  <span>Ranking</span>
                </button>

                <button className="home-btn" onClick={() => handleDirectNavigate('placares_geral')}>
                  <Icons.BarChart size={28} />
                  <span>Placares</span>
                </button>

                <button className="home-btn" onClick={() => handleDirectNavigate('confrontos_geral')}>
                  <Icons.Calendar size={28} />
                  <span>Próximos jogos</span>
                </button>
              </div>
            ) : (
              <div className="login-section">
                <h3>
                  <Icons.Lock size={18} />
                  Entrar no Bolão
                </h3>
                
                {errorMsg && (
                  <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit}>
                  <div className="form-group">
                    <label htmlFor="username">Usuário</label>
                    <input
                      type="text"
                      id="username"
                      className="form-control"
                      placeholder="Ex: Jefferson"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">Senha</label>
                    <input
                      type="password"
                      id="password"
                      className="form-control"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn-submit">
                    CONFIRMAR
                  </button>
                  
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowLogin(false);
                      setErrorMsg('');
                      setUsername('');
                      setPassword('');
                    }}
                  >
                    Voltar
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
