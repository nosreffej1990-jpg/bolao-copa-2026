'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icons } from '@/components/Icons';
import { supabase } from '@/lib/supabase';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // App states
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('boloes'); // placares, boloes, ranking, placares_geral, confrontos_geral
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  // Data states
  const [confrontos, setConfrontos] = useState([]);
  const [palpites, setPalpites] = useState({}); // key: match_id -> { home, away, saved }
  const [boloes, setBoloes] = useState([]);
  
  // Filters
  const [activeGroup, setActiveGroup] = useState('A');
  
  // Modals
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(null); // photoUrl
  const [showBetsModal, setShowBetsModal] = useState(null); // bolaoData
  
  // Camera simulation
  const [cameraStep, setCameraStep] = useState(1); // 1: choose, 2: capturing/ocr, 3: success
  const [tempBettorName, setTempBettorName] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(null);

  useEffect(() => {
    // Check authentication
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('copa26_user');
      if (user) {
        setCurrentUser(user);
      }
    }

    // Set tab from URL query params
    const queryTab = searchParams.get('tab');
    if (queryTab) {
      setActiveTab(queryTab);
    }

    // Load data from Supabase / LocalDB
    fetchData();
  }, [searchParams]);

  const fetchData = async () => {
    const { data: confs } = await supabase.from('confrontos').select('*');
    setConfrontos(confs || []);

    const { data: bols } = await supabase.from('boloes').select('*');
    setBoloes(bols || []);

    // Load user's saved predictions if logged in
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('copa26_user');
      if (user) {
        const { data: palps } = await supabase.from('palpites').select('*').eq('username', user);
        const palpsMap = {};
        (palps || []).forEach(p => {
          palpsMap[p.match_id] = {
            home: p.home_score,
            away: p.away_score,
            saved: true
          };
        });
        setPalpites(palpsMap);
      }
    }
  };

  const handleScoreChange = (matchId, team, val) => {
    setPalpites(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team]: val,
        saved: false
      }
    }));
  };

  const savePalpite = async (matchId) => {
    if (!currentUser) {
      showToast('Faça login para salvar palpites.', 'error');
      return;
    }

    const bet = palpites[matchId];
    if (!bet || bet.home === undefined || bet.away === undefined || bet.home === '' || bet.away === '') {
      showToast('Digite o placar completo.', 'error');
      return;
    }

    const { error } = await supabase.from('palpites').upsert({
      username: currentUser,
      match_id: matchId,
      home_score: parseInt(bet.home),
      away_score: parseInt(bet.away)
    });

    if (!error) {
      setPalpites(prev => ({
        ...prev,
        [matchId]: { ...prev[matchId], saved: true }
      }));
      showToast('Palpite salvo com sucesso!');
      fetchData(); // Refresh ranking/predictions
    } else {
      showToast('Erro ao salvar palpite.', 'error');
    }
  };

  // Toast trigger helper
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg('');
    }, 3000);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('copa26_user');
    }
    router.push('/');
  };

  // Upload/Camera bolão flow
  const startCameraUpload = () => {
    setTempBettorName('');
    setUploadedPhotoUrl(null);
    setCameraStep(1);
    setShowCameraModal(true);
  };

  // Handle file selection from device gallery/camera
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setUploadedPhotoUrl(localUrl);
  };

  const capturePhoto = () => {
    if (!tempBettorName.trim()) {
      alert('Por favor, insira o nome do apostador.');
      return;
    }
    setCameraStep(2);

    // Simulate OCR scanning process for 2.5 seconds
    setTimeout(async () => {
      setCameraStep(3);

      const generatedBets = [
        { match_id: 5, home: 'Brasil', away: 'Marrocos', bet_home: Math.floor(Math.random() * 4), bet_away: Math.floor(Math.random() * 2), real_home: null, real_away: null, pts: null },
        { match_id: 1, home: 'México', away: 'África do Sul', bet_home: 2, bet_away: 1, real_home: 2, real_away: 1, pts: 5 },
        { match_id: 3, home: 'Canadá', away: 'Catar', bet_home: 1, bet_away: 0, real_home: 3, real_away: 0, pts: 3 }
      ];

      // Use uploaded photo URL or fallback placeholder
      const photoToSave = uploadedPhotoUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=375&auto=format&fit=crop';

      // Insert bolão into database
      await supabase.from('boloes').insert({
        username: currentUser,
        bettor_name: tempBettorName.trim(),
        photo_url: photoToSave,
        bets_data: generatedBets
      });

      showToast('Bolão cadastrado com sucesso!');
      fetchData();

      setTimeout(() => {
        setShowCameraModal(false);
      }, 1200);
    }, 2500);
  };

  // Generate ranking purely from real bolões in the database
  const getSortedRanking = () => {
    // Build player scores from real boloes data
    const scoreMap = {};
    boloes.forEach(b => {
      if (!scoreMap[b.bettor_name]) {
        scoreMap[b.bettor_name] = {
          name: b.bettor_name,
          avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${b.bettor_name}`,
          pts: 0
        };
      }
      // Sum up points from bets_data
      if (Array.isArray(b.bets_data)) {
        b.bets_data.forEach(bet => {
          if (bet.pts !== null && bet.pts !== undefined) {
            scoreMap[b.bettor_name].pts += bet.pts;
          }
        });
      }
    });

    const players = Object.values(scoreMap);
    return players.sort((a, b) => b.pts - a.pts).map((p, idx) => ({ ...p, rank: idx + 1 }));
  };

  const ranking = getSortedRanking();
  const top3 = ranking.slice(0, 3);
  const restRank = ranking.slice(3);

  const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="back-btn" onClick={() => router.push('/')}>
          <Icons.ChevronLeft size={24} />
        </div>
        
        <div className="logo-mini">
          <span style={{ fontSize: '1.25rem' }}>🏆</span>
          <h2>BOLÃO COPA 2026</h2>
        </div>

        <button className="menu-toggle-btn" onClick={() => setIsDrawerOpen(true)}>
          <Icons.Menu size={20} />
        </button>
      </header>

      {/* Navigation Drawer Menu */}
      <div className={`drawer ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)}>
        <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <h3>Navegação</h3>
            <div style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setIsDrawerOpen(false)}>
              <Icons.X size={20} />
            </div>
          </div>

          <nav className="drawer-nav">
            {currentUser && (
              <>
                <button
                  className={`drawer-link ${activeTab === 'boloes' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('boloes'); setIsDrawerOpen(false); }}
                >
                  <Icons.Camera size={18} />
                  <span>Bolões</span>
                </button>
                <button
                  className={`drawer-link ${activeTab === 'placares' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('placares'); setIsDrawerOpen(false); }}
                >
                  <Icons.List size={18} />
                  <span>Placares</span>
                </button>
              </>
            )}

            <button
              className={`drawer-link ${activeTab === 'ranking' ? 'active' : ''}`}
              onClick={() => { setActiveTab('ranking'); setIsDrawerOpen(false); }}
            >
              <Icons.Trophy size={18} />
              <span>Classificação</span>
            </button>

            <button
              className={`drawer-link ${activeTab === 'placares_geral' ? 'active' : ''}`}
              onClick={() => { setActiveTab('placares_geral'); setIsDrawerOpen(false); }}
            >
              <Icons.Check size={18} />
              <span>Resultados</span>
            </button>

            <button
              className={`drawer-link ${activeTab === 'confrontos_geral' ? 'active' : ''}`}
              onClick={() => { setActiveTab('confrontos_geral'); setIsDrawerOpen(false); }}
            >
              <Icons.Calendar size={18} />
              <span>Próximos Confrontos</span>
            </button>
          </nav>

          <div className="drawer-footer">
            {currentUser ? (
              <div>
                <div className="profile-card">
                  <img
                    src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser}`}
                    alt="User"
                    className="profile-avatar"
                  />
                  <div>
                    <p style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{currentUser}</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)' }}>Logado</span>
                  </div>
                </div>
                <button className="btn-logout" onClick={handleLogout}>
                  Sair da Conta
                </button>
              </div>
            ) : (
              <button className="btn-submit" onClick={() => router.push('/')} style={{ marginTop: 0 }}>
                Entrar / Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Pages content switch */}
      <main className="dashboard-content">
        
        {/* 1. Placares (My Predictions Area - Requires Login) */}
        {activeTab === 'placares' && currentUser && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>Preencha seus palpites</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fase de grupos. Clique em confirmar na partida desejada.</p>
            </div>

            {/* Groups A-L Selector */}
            <div className="group-tabs">
              {groupsList.map(g => (
                <button
                  key={g}
                  className={`group-tab-btn ${activeGroup === g ? 'active' : ''}`}
                  onClick={() => setActiveGroup(g)}
                >
                  Grupo {g}
                </button>
              ))}
            </div>

            {/* Matchups list */}
            <div className="matchup-list">
              {confrontos
                .filter(m => m.grupo === activeGroup)
                .map(match => {
                  const savedBet = palpites[match.id] || { home: '', away: '', saved: false };
                  
                  return (
                    <div className="matchup-card" key={match.id}>
                      <div className="matchup-meta">
                        <span>Grupo {match.grupo} • {match.stadium}</span>
                        <span>{new Date(match.match_date).toLocaleDateString('pt-BR')} {match.match_time.slice(0, 5)}</span>
                      </div>
                      <div className="matchup-teams-row">
                        <div className="matchup-team-item">
                          <img src={`https://flagcdn.com/w80/${match.home_code}.png`} className="team-flag" alt={match.home_team} />
                          <span>{match.home_team}</span>
                        </div>
                        
                        <div className="matchup-scores-center">
                          <input
                            type="number"
                            min="0"
                            className="score-field"
                            value={savedBet.home}
                            onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                          />
                          <span className="score-sep">x</span>
                          <input
                            type="number"
                            min="0"
                            className="score-field"
                            value={savedBet.away}
                            onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                          />
                        </div>

                        <div className="matchup-team-item">
                          <img src={`https://flagcdn.com/w80/${match.away_code}.png`} className="team-flag" alt={match.away_team} />
                          <span>{match.away_team}</span>
                        </div>
                      </div>

                      <button
                        className="match-confirm-btn"
                        onClick={() => savePalpite(match.id)}
                      >
                        {savedBet.saved ? (
                          <>
                            <Icons.Check size={14} style={{ color: 'var(--soccer-green)' }} />
                            <span>Confirmado</span>
                          </>
                        ) : (
                          <span>Salvar Palpite</span>
                        )}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 2. Bolões (Bettors List & Upload Photo) */}
        {activeTab === 'boloes' && currentUser && (
          <div>
            <div className="boloes-header">
              <div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>Bolões Cadastrados</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Visualize fotos e palpites lidos.</p>
              </div>
              <button className="btn-upload-bolao" onClick={startCameraUpload}>
                <Icons.Camera size={14} />
                Upar Bolão
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {boloes.map(b => (
                <div className="bolao-card" key={b.id}>
                  <div className="bolao-card-top">
                    <img
                      src={`https://api.dicebear.com/7.x/identicon/svg?seed=${b.bettor_name}`}
                      className="bolao-avatar"
                      alt="avatar"
                    />
                    <div className="bolao-details">
                      <h4>{b.bettor_name}</h4>
                      <span>Registrado por: {b.username}</span>
                    </div>
                  </div>
                  <div className="bolao-card-actions">
                    <button className="bolao-action-btn btn-view-photo" onClick={() => setShowPhotoModal(b.photo_url)}>
                      <Icons.Eye size={12} />
                      Ver Foto
                    </button>
                    <button className="bolao-action-btn btn-view-bets" onClick={() => setShowBetsModal(b)}>
                      <Icons.Trophy size={12} />
                      Apostas
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Ranking */}
        {activeTab === 'ranking' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.2rem' }}>Classificação do Bolão</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pontuação calculada pelos bolões cadastrados</p>
            </div>

            {ranking.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
                <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Nenhum bolão cadastrado ainda</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Faça login e cadastre os bolões para ver a classificação aqui.</span>
              </div>
            ) : (
              <>
                {/* Podiums Gold, Silver, Bronze */}
                <div className="podium-container">
                  {/* 2nd Place */}
                  {top3[1] && (
                    <div className="podium-column second">
                      <img src={top3[1].avatar} className="podium-avatar" alt="2nd" />
                      <div className="podium-box">
                        <span className="podium-name">{top3[1].name}</span>
                        <span className="podium-pts">{top3[1].pts} pts</span>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 'bold' }}>2º Lugar</span>
                      </div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {top3[0] && (
                    <div className="podium-column first">
                      <span className="podium-crown">👑</span>
                      <img src={top3[0].avatar} className="podium-avatar" alt="1st" />
                      <div className="podium-box">
                        <span className="podium-name">{top3[0].name}</span>
                        <span className="podium-pts">{top3[0].pts} pts</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>1º Lugar</span>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {top3[2] && (
                    <div className="podium-column third">
                      <img src={top3[2].avatar} className="podium-avatar" alt="3rd" />
                      <div className="podium-box">
                        <span className="podium-name">{top3[2].name}</span>
                        <span className="podium-pts">{top3[2].pts} pts</span>
                        <span style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 'bold' }}>3º Lugar</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* List 4th place and below */}
                {restRank.length > 0 && (
                  <div className="ranking-list">
                    {restRank.map(item => (
                      <div className="ranking-item" key={item.name}>
                        <div className="ranking-item-left">
                          <span className="ranking-num">{item.rank}º</span>
                          <img src={item.avatar} className="ranking-avatar" alt="player" />
                          <span className="ranking-name">{item.name}</span>
                        </div>
                        <span className="ranking-pts">{item.pts} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 4. Placares Gerais (Finished Matches with scores) */}
        {activeTab === 'placares_geral' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>Resultados Oficiais</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Partidas da Copa finalizadas com pontuação válida</p>
            </div>

            <div className="matchup-list">
              {confrontos.filter(m => m.finished).map(match => (
                <div className="matchup-card" key={match.id} style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                  <div className="matchup-meta">
                    <span>Grupo {match.grupo} • Finalizado</span>
                    <span>{new Date(match.match_date).toLocaleDateString('pt-BR')} {match.match_time.slice(0, 5)}</span>
                  </div>
                  <div className="matchup-teams-row">
                    <div className="matchup-team-item">
                      <img src={`https://flagcdn.com/w80/${match.home_code}.png`} className="team-flag" alt={match.home_team} />
                      <span>{match.home_team}</span>
                    </div>

                    <div className="matchup-scores-center">
                      <input type="number" className="score-field" value={match.home_score} disabled />
                      <span className="score-sep">x</span>
                      <input type="number" className="score-field" value={match.away_score} disabled />
                    </div>

                    <div className="matchup-team-item">
                      <img src={`https://flagcdn.com/w80/${match.away_code}.png`} className="team-flag" alt={match.away_team} />
                      <span>{match.away_team}</span>
                    </div>
                  </div>
                </div>
              ))}
              {confrontos.filter(m => m.finished).length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Nenhum jogo finalizado ainda.</p>
              )}
            </div>
          </div>
        )}

        {/* 5. Próximos Confrontos (Upcoming matches) */}
        {activeTab === 'confrontos_geral' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>Próximos Confrontos</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Partidas com datas e horários oficiais da FIFA</p>
            </div>

            <div className="matchup-list">
              {confrontos.filter(m => !m.finished).map(match => (
                <div className="matchup-card" key={match.id}>
                  <div className="matchup-meta">
                    <span>Grupo {match.grupo} • {match.stadium}</span>
                    <span>{new Date(match.match_date).toLocaleDateString('pt-BR')} {match.match_time.slice(0, 5)}</span>
                  </div>
                  <div className="matchup-teams-row">
                    <div className="matchup-team-item">
                      <img src={`https://flagcdn.com/w80/${match.home_code}.png`} className="team-flag" alt={match.home_team} />
                      <span>{match.home_team}</span>
                    </div>

                    <div className="matchup-scores-center">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>vs</span>
                    </div>

                    <div className="matchup-team-item">
                      <img src={`https://flagcdn.com/w80/${match.away_code}.png`} className="team-flag" alt={match.away_team} />
                      <span>{match.away_team}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* 1. Camera / Upar bolão Simulation Modal */}
      {showCameraModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Upar Novo Bolão</h3>
              <div onClick={() => setShowCameraModal(false)} className="modal-close">
                <Icons.X size={20} />
              </div>
            </div>

            {cameraStep === 1 && (
              <div>
                <div className="form-group">
                  <label>Nome do Apostador</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nome da pessoa do papel"
                    value={tempBettorName}
                    onChange={(e) => setTempBettorName(e.target.value)}
                  />
                </div>

                {/* Photo preview if file loaded */}
                {uploadedPhotoUrl ? (
                  <div className="camera-box">
                    <img src={uploadedPhotoUrl} className="camera-preview-img" alt="Preview" />
                    <span className="camera-overlay-text">Foto carregada ✓</span>
                  </div>
                ) : (
                  <div className="camera-box" style={{ background: '#0a0a0a', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '2rem' }}>📷</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Nenhuma foto selecionada</span>
                  </div>
                )}

                {/* File input - opens gallery/camera on mobile */}
                <label htmlFor="file-upload" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  width: '100%', padding: '0.75rem', marginTop: '0.75rem',
                  background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6',
                  borderRadius: '8px', color: '#3b82f6', fontWeight: '700', fontSize: '0.85rem',
                  cursor: 'pointer'
                }}>
                  📁 Carregar Foto do Celular
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />

                <button className="btn-submit" onClick={capturePhoto} style={{ marginTop: '0.75rem' }}>
                  CONFIRMAR E ESCANEAR
                </button>
              </div>
            )}

            {cameraStep === 2 && (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div className="loader" style={{ margin: '0 auto 1.5rem auto', width: '45px', height: '45px' }}></div>
                <p style={{ fontWeight: 'bold' }}>IA Lendo Palpites...</p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Escaneando fotos com OCR inteligente</span>
              </div>
            )}

            {cameraStep === 3 && (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--soccer-green)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <p style={{ fontWeight: 'bold' }}>Leitura concluída com sucesso!</p>
                <span style={{ fontSize: '0.7rem', color: '#fff' }}>O bolão de {tempBettorName} foi adicionado ao ranking.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Ver Foto Modal */}
      {showPhotoModal && (
        <div className="modal-overlay" onClick={() => setShowPhotoModal(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ padding: '0.5rem' }}>
            <div className="modal-header" style={{ padding: '0.5rem', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '0.85rem' }}>Foto do Bolão Original</h4>
              <div onClick={() => setShowPhotoModal(null)} className="modal-close">
                <Icons.X size={18} />
              </div>
            </div>
            <img src={showPhotoModal} style={{ width: '100%', borderRadius: '8px', objectFit: 'contain' }} alt="Bolão" />
          </div>
        </div>
      )}

      {/* 3. Ver Apostas Lidas Modal */}
      {showBetsModal && (
        <div className="modal-overlay" onClick={() => setShowBetsModal(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Palpites Lidos</h3>
              <div onClick={() => setShowBetsModal(null)} className="modal-close">
                <Icons.X size={20} />
              </div>
            </div>

            <div className="bets-header-meta">
              <img
                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${showBetsModal.bettor_name}`}
                className="bolao-avatar"
                style={{ width: '30px', height: '30px' }}
                alt="avatar"
              />
              <div>
                <h4 style={{ fontSize: '0.85rem' }}>{showBetsModal.bettor_name}</h4>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Apostas extraídas com OCR da foto</p>
              </div>
            </div>

            <div className="bets-legend">
              <div className="legend-item">
                <div className="legend-color exact"></div>
                <span>Placar Exato (+5)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color winner"></div>
                <span>Vencedor (+3)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color wrong"></div>
                <span>Erro / Pendente (0)</span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="bets-table">
                <thead>
                  <tr>
                    <th>Jogo</th>
                    <th>Resultado</th>
                    <th>Aposta</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {showBetsModal.bets_data.map((bet, idx) => {
                    const badgeClass = bet.pts === 5 
                      ? 'exact' 
                      : bet.pts === 3 
                      ? 'winner' 
                      : bet.pts === 0 
                      ? 'wrong' 
                      : 'pending';
                    
                    return (
                      <tr key={idx}>
                        <td>{bet.home} x {bet.away}</td>
                        <td style={{ fontWeight: 'bold' }}>
                          {bet.real_home !== null ? `${bet.real_home}x${bet.real_away}` : '-'}
                        </td>
                        <td>
                          <span className={`bet-badge ${badgeClass}`}>
                            {bet.bet_home}x{bet.bet_away}
                          </span>
                        </td>
                        <td style={{ fontWeight: 'bold', color: bet.pts > 0 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                          {bet.pts !== null ? `+${bet.pts}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Toast Indicator */}
      {toastMsg && (
        <div className="toast-bar">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', padding: '2rem', textAlign: 'center' }}>Carregando Painel...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
