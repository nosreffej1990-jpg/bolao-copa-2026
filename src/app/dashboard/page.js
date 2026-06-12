'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icons } from '@/components/Icons';
import { supabase } from '@/lib/supabase';
import { getFinishedMatches, getLiveMatches, getUpcomingMatches, getFlagCode, formatMatchDate } from '@/lib/worldcupApi';

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

  // API worldcup26.ir states
  const [apiFinished, setApiFinished] = useState([]);
  const [apiLive, setApiLive] = useState([]);
  const [apiUpcoming, setApiUpcoming] = useState([]);
  const [apiLoading, setApiLoading] = useState(true);
  
  // Filters
  const [activeGroup, setActiveGroup] = useState('A');
  
  // Modals
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(null); // photoUrl
  const [showBetsModal, setShowBetsModal] = useState(null); // bolaoData
  const [showDeleteModal, setShowDeleteModal] = useState(null); // { id, bettor_name }
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showMatchModal, setShowMatchModal] = useState(null); // API game object
  const [matchModalTab, setMatchModalTab] = useState('detalhes'); // 'detalhes' | 'palpites'
  
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

    // Load data from Supabase
    fetchData();

    // Load API data on mount
    fetchApiData();
  }, [searchParams]);

  // Poll API every 60 seconds for live updates
  useEffect(() => {
    const interval = setInterval(fetchApiData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchApiData = async () => {
    setApiLoading(true);
    try {
      const [finished, live, upcoming] = await Promise.all([
        getFinishedMatches(),
        getLiveMatches(),
        getUpcomingMatches(15),
      ]);
      setApiFinished(finished);
      setApiLive(live);
      setApiUpcoming(upcoming);
    } catch (e) {
      console.error('Erro na API:', e);
    } finally {
      setApiLoading(false);
    }
  };

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

  // Delete bolão with password confirmation
  const USERS = { Jefferson: '060199', Junior: '062026' };
  const confirmDeleteBolao = async () => {
    if (!currentUser) return;
    const correctPass = USERS[currentUser];
    if (deletePassword !== correctPass) {
      setDeleteError('Senha incorreta. Tente novamente.');
      return;
    }
    const { error } = await supabase.from('boloes').delete().eq('id', showDeleteModal.id);
    if (!error) {
      showToast(`Bolão de ${showDeleteModal.bettor_name} excluído.`);
      setShowDeleteModal(null);
      setDeletePassword('');
      setDeleteError('');
      fetchData();
    } else {
      setDeleteError('Erro ao excluir. Tente novamente.');
    }
  };

  // Get bet statistics for a specific match (by team name matching)
  const getMatchBetStats = (game) => {
    const results = [];
    boloes.forEach(b => {
      if (!Array.isArray(b.bets_data)) return;
      const bet = b.bets_data.find(bd =>
        bd.home?.toLowerCase().includes(game.home_team_name_en.split(' ')[0].toLowerCase()) ||
        bd.away?.toLowerCase().includes(game.away_team_name_en.split(' ')[0].toLowerCase())
      );
      if (bet) {
        const realHome = parseInt(game.home_score);
        const realAway = parseInt(game.away_score);
        let pts = 0;
        if (bet.bet_home === realHome && bet.bet_away === realAway) pts = 5; // placar exato
        else {
          const betWinner = bet.bet_home > bet.bet_away ? 'H' : bet.bet_home < bet.bet_away ? 'A' : 'D';
          const realWinner = realHome > realAway ? 'H' : realHome < realAway ? 'A' : 'D';
          if (betWinner === realWinner) pts = 3; // vencedor certo
        }
        results.push({
          name: b.bettor_name,
          bet_home: bet.bet_home,
          bet_away: bet.bet_away,
          pts,
          exact: pts === 5,
          correct: pts === 3,
        });
      }
    });
    return results.sort((a, b) => b.pts - a.pts);
  };
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
              <button
                className={`drawer-link ${activeTab === 'boloes' ? 'active' : ''}`}
                onClick={() => { setActiveTab('boloes'); setIsDrawerOpen(false); }}
              >
                <Icons.Camera size={18} />
                <span>Bolões</span>
              </button>
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
              {boloes.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '2rem 0' }}>Nenhum bolão cadastrado ainda. Clique em "Upar Bolão" para adicionar!</p>
              )}
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
                    <button
                      className="bolao-action-btn"
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', color: '#ef4444' }}
                      onClick={() => { setShowDeleteModal({ id: b.id, bettor_name: b.bettor_name }); setDeletePassword(''); setDeleteError(''); }}
                    >
                      🗑️ Excluir
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
                {/* 4. Resultados via API */}
        {activeTab === 'placares_geral' && (
          <div>
            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>Resultados dos Jogos</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Placares oficiais • Atualizado a cada 60s</p>
              </div>
              {apiLive.length > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', padding: '0.2rem 0.5rem', borderRadius: '999px', animation: 'pulse 1.5s infinite' }}>🔴 AO VIVO</span>
              )}
            </div>

            {/* Ao vivo */}
            {apiLive.map(g => {
              const hFlag = getFlagCode(g.home_team_name_en);
              const aFlag = getFlagCode(g.away_team_name_en);
              return (
                <div className="matchup-card" key={g.id} style={{ borderColor: '#ef4444', boxShadow: '0 0 12px rgba(239,68,68,0.25)' }}>
                  <div className="matchup-meta">
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>🔴 AO VIVO • Grupo {g.group}</span>
                    <span>{g.time_elapsed}</span>
                  </div>
                  <div className="matchup-teams-row">
                    <div className="matchup-team-item">
                      <img src={`https://flagcdn.com/w80/${hFlag}.png`} className="team-flag" alt={g.home_team_name_en} />
                      <span>{g.home_team_name_en}</span>
                    </div>
                    <div className="matchup-scores-center">
                      <input type="number" className="score-field" value={g.home_score} readOnly />
                      <span className="score-sep">x</span>
                      <input type="number" className="score-field" value={g.away_score} readOnly />
                    </div>
                    <div className="matchup-team-item">
                      <img src={`https://flagcdn.com/w80/${aFlag}.png`} className="team-flag" alt={g.away_team_name_en} />
                      <span>{g.away_team_name_en}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Finalizados */}
            {apiLoading && apiFinished.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '2rem' }}>Carregando resultados...</p>
            ) : apiFinished.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '2rem' }}>Nenhum jogo finalizado ainda.</p>
            ) : (
              <div className="matchup-list">
                {apiFinished.map(g => {
                  const hFlag = getFlagCode(g.home_team_name_en);
                  const aFlag = getFlagCode(g.away_team_name_en);
                  const { date, time } = formatMatchDate(g.local_date);
                  return (
                    <div
                      className="matchup-card"
                      key={g.id}
                      style={{ borderColor: 'rgba(16,185,129,0.3)', cursor: 'pointer', position: 'relative' }}
                      onClick={() => { setShowMatchModal(g); setMatchModalTab('detalhes'); }}
                    >
                      <div className="matchup-meta">
                        <span>Grupo {g.group} • Encerrado</span>
                        <span>{date} {time}</span>
                      </div>
                      <div className="matchup-teams-row">
                        <div className="matchup-team-item">
                          <img src={`https://flagcdn.com/w80/${hFlag}.png`} className="team-flag" alt={g.home_team_name_en} />
                          <span>{g.home_team_name_en}</span>
                        </div>
                        <div className="matchup-scores-center">
                          <input type="number" className="score-field" value={g.home_score} readOnly />
                          <span className="score-sep">x</span>
                          <input type="number" className="score-field" value={g.away_score} readOnly />
                        </div>
                        <div className="matchup-team-item">
                          <img src={`https://flagcdn.com/w80/${aFlag}.png`} className="team-flag" alt={g.away_team_name_en} />
                          <span>{g.away_team_name_en}</span>
                        </div>
                      </div>
                      {g.home_scorers && g.home_scorers !== 'null' && (
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>⚽ {g.home_scorers.replace(/[{}"]/g, '')}</p>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>Toque para ver detalhes</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. Próximos Confrontos via API */}
        {activeTab === 'confrontos_geral' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>Próximos Confrontos</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Partidas oficiais da Copa 2026 • worldcup26.ir</p>
            </div>

            {apiLoading && apiUpcoming.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '2rem' }}>Carregando calendário...</p>
            ) : (
              <div className="matchup-list">
                {apiUpcoming.map(g => {
                  const hFlag = getFlagCode(g.home_team_name_en);
                  const aFlag = getFlagCode(g.away_team_name_en);
                  const { date, time } = formatMatchDate(g.local_date);
                  return (
                    <div className="matchup-card" key={g.id}>
                      <div className="matchup-meta">
                        <span>Grupo {g.group} • Rodada {g.matchday}</span>
                        <span>{date} às {time}</span>
                      </div>
                      <div className="matchup-teams-row">
                        <div className="matchup-team-item">
                          <img src={`https://flagcdn.com/w80/${hFlag}.png`} className="team-flag" alt={g.home_team_name_en} />
                          <span>{g.home_team_name_en}</span>
                        </div>
                        <div className="matchup-scores-center">
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>vs</span>
                        </div>
                        <div className="matchup-team-item">
                          <img src={`https://flagcdn.com/w80/${aFlag}.png`} className="team-flag" alt={g.away_team_name_en} />
                          <span>{g.away_team_name_en}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
              </>
            )}
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

      {/* Modal Detalhes do Jogo */}
      {showMatchModal && (() => {
        const g = showMatchModal;
        const hFlag = getFlagCode(g.home_team_name_en);
        const aFlag = getFlagCode(g.away_team_name_en);
        const { date, time } = formatMatchDate(g.local_date);
        const betStats = getMatchBetStats(g);
        const parseScorers = (raw) => {
          if (!raw || raw === 'null') return [];
          return raw.replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
        };
        const homeScorers = parseScorers(g.home_scorers);
        const awayScorers = parseScorers(g.away_scorers);

        return (
          <div className="modal-overlay" onClick={() => setShowMatchModal(null)}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
              {/* Header */}
              <div className="modal-header">
                <h3 style={{ fontSize: '0.95rem' }}>Grupo {g.group} • Rodada {g.matchday}</h3>
                <div onClick={() => setShowMatchModal(null)} className="modal-close"><Icons.X size={20} /></div>
              </div>

              {/* Placar principal */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <img src={`https://flagcdn.com/w80/${hFlag}.png`} style={{ width: '48px', marginBottom: '0.4rem' }} alt={g.home_team_name_en} />
                  <p style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{g.home_team_name_en}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fff', letterSpacing: '4px' }}>{g.home_score} — {g.away_score}</div>
                  <span style={{ fontSize: '0.6rem', color: 'var(--soccer-green)', fontWeight: 'bold' }}>ENCERRADO • {date}</span>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <img src={`https://flagcdn.com/w80/${aFlag}.png`} style={{ width: '48px', marginBottom: '0.4rem' }} alt={g.away_team_name_en} />
                  <p style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{g.away_team_name_en}</p>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  onClick={() => setMatchModalTab('detalhes')}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', border: 'none',
                    background: matchModalTab === 'detalhes' ? 'var(--soccer-green)' : 'rgba(255,255,255,0.07)',
                    color: matchModalTab === 'detalhes' ? '#000' : '#cbd5e1' }}
                >⚽ Detalhes</button>
                <button
                  onClick={() => setMatchModalTab('palpites')}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', border: 'none',
                    background: matchModalTab === 'palpites' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.07)',
                    color: matchModalTab === 'palpites' ? '#000' : '#cbd5e1' }}
                >🏆 Palpites ({betStats.length})</button>
              </div>

              {/* Tab: Detalhes */}
              {matchModalTab === 'detalhes' && (
                <div>
                  {/* Artilheiros */}
                  {(homeScorers.length > 0 || awayScorers.length > 0) ? (
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚽ Gols</p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          {homeScorers.map((s, i) => (
                            <div key={i} style={{ fontSize: '0.78rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)', color: '#e2e8f0' }}>⚽ {s}</div>
                          ))}
                        </div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          {awayScorers.map((s, i) => (
                            <div key={i} style={{ fontSize: '0.78rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)', color: '#e2e8f0' }}>{s} ⚽</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1rem' }}>Detalhes de gols não disponíveis.</p>
                  )}

                  {/* Info do jogo */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Data</span>
                      <span style={{ fontWeight: 'bold' }}>{date} às {time}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Grupo</span>
                      <span style={{ fontWeight: 'bold' }}>Grupo {g.group}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Rodada</span>
                      <span style={{ fontWeight: 'bold' }}>{g.matchday}ª Rodada</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--soccer-green)' }}>✔ Encerrado</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Palpites */}
              {matchModalTab === 'palpites' && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Quem apostou neste jogo e quantos pontos ganhou:
                  </p>
                  {betStats.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
                      Nenhum bolão cadastrado com palpite para este jogo.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {betStats.map((item, idx) => (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem', borderRadius: '8px',
                          background: item.exact ? 'rgba(16,185,129,0.12)' : item.correct ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${item.exact ? 'rgba(16,185,129,0.4)' : item.correct ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.07)'}`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', minWidth: '18px' }}>{idx + 1}º</span>
                            <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.name}`} style={{ width: '28px', height: '28px', borderRadius: '50%' }} alt="" />
                            <div>
                              <p style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{item.name}</p>
                              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Chutou: {item.bet_home} x {item.bet_away}</p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{
                              fontSize: '0.85rem', fontWeight: '900',
                              color: item.exact ? 'var(--soccer-green)' : item.correct ? 'var(--accent-gold)' : 'var(--text-muted)'
                            }}>
                              {item.pts > 0 ? `+${item.pts}` : '0'} pts
                            </span>
                            <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                              {item.exact ? '🎯 Exato' : item.correct ? '✅ Vencedor' : '❌ Errou'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

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

      {/* Modal de Exclusão de Bolão */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Excluir Bolão</h3>
              <div onClick={() => { setShowDeleteModal(null); setDeletePassword(''); setDeleteError(''); }} className="modal-close">
                <Icons.X size={20} />
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Você está excluindo o bolão de <strong style={{ color: '#fff' }}>{showDeleteModal.bettor_name}</strong>. Esta ação é irreversível e zerará os pontos deste participante.
            </p>
            <div className="form-group">
              <label>Confirme sua senha para continuar</label>
              <input
                type="password"
                className="form-control"
                placeholder="Sua senha de login"
                value={deletePassword}
                onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(''); }}
              />
            </div>
            {deleteError && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{deleteError}</p>}
            <button
              className="btn-submit"
              style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}
              onClick={confirmDeleteBolao}
            >
              CONFIRMAR EXCLUSÃO
            </button>
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
