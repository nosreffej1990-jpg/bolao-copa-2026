'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icons } from '@/components/Icons';
import { supabase, resetDatabase } from '@/lib/supabase';
import { getFinishedMatches, getLiveMatches, getUpcomingMatches, getFlagCode, formatMatchDate, getGroupStandings } from '@/lib/worldcupApi';

// Helper to compress and resize images on client-side before sending to API
const compressImage = (file, maxWidth = 1024, maxHeight = 1024) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Apply aspect ratio scaling
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to jpeg with 0.8 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

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
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showMatchModal, setShowMatchModal] = useState(null);
  const [matchModalTab, setMatchModalTab] = useState('detalhes');
  const [showHistoryModal, setShowHistoryModal] = useState(null); // bolaoData
  const [editingBet, setEditingBet] = useState(null); // { bolaoId, betIndex, bet }
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');

  // Countdown para próximo jogo
  const [countdown, setCountdown] = useState('');
  const [nextMatchInfo, setNextMatchInfo] = useState(null);

  // Grupos da Copa
  const [apiGroups, setApiGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('A');

  // Notificações
  const [notifPermission, setNotifPermission] = useState('default');
  
  // Camera / OCR / Wizard states
  const [cameraStep, setCameraStep] = useState(1); // 1: choose, 2: capturing/ocr
  const [tempBettorName, setTempBettorName] = useState('');
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(null);
  const [base64Photo, setBase64Photo] = useState(null);

  // Wizard Manual Entry / Review states
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [wizardBettorName, setWizardBettorName] = useState('');
  const [wizardBets, setWizardBets] = useState([]); // Array of matches with score predictions
  const [wizardActiveGroup, setWizardActiveGroup] = useState('A');

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

  // Countdown para o próximo jogo
  useEffect(() => {
    const tick = () => {
      if (apiUpcoming.length === 0) return;
      const next = apiUpcoming[0];
      if (!next || !next.local_date) return;
      const [datePart, timePart] = next.local_date.split(' ');
      if (!datePart || !timePart) return;
      const [month, day, year] = datePart.split('/');
      if (!month || !day || !year) return;
      const target = new Date(`${year}-${month}-${day}T${timePart}:00`);
      const diff = target - new Date();
      if (diff <= 0) { setCountdown('AO VIVO AGORA!'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`);
      setNextMatchInfo(next);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [apiUpcoming]);

  // Checar permissão de notificação
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // Notificar 15min antes do próximo jogo
  useEffect(() => {
    if (!apiUpcoming.length || notifPermission !== 'granted') return;
    const checkAndNotify = () => {
      const next = apiUpcoming[0];
      if (!next || !next.local_date) return;
      const [datePart, timePart] = next.local_date.split(' ');
      if (!datePart || !timePart) return;
      const [month, day, year] = datePart.split('/');
      if (!month || !day || !year) return;
      const target = new Date(`${year}-${month}-${day}T${timePart}:00`);
      const diff = target - new Date();
      if (diff > 0 && diff <= 15 * 60 * 1000) {
        new Notification('⚽ Jogo em 15 minutos!', {
          body: `${next.home_team_name_en} vs ${next.away_team_name_en}`,
          icon: '/icons/icon-192.png',
        });
      }
    };
    const id = setInterval(checkAndNotify, 60000);
    return () => clearInterval(id);
  }, [apiUpcoming, notifPermission]);

  const fetchApiData = async () => {
    setApiLoading(true);
    try {
      const [finished, live, upcoming, groups] = await Promise.all([
        getFinishedMatches(),
        getLiveMatches(),
        getUpcomingMatches(15),
        getGroupStandings(),
      ]);
      setApiFinished(finished);
      setApiLive(live);
      setApiUpcoming(upcoming);
      setApiGroups(groups);

      // Pontuação automática: atualizar pts dos bolões com jogos finalizados
      if (finished.length > 0) {
        autoCalculatePoints(finished);
      }
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

  // Pontuação automática: percorre bolões e atualiza pts com base nos jogos finalizados
  const autoCalculatePoints = async (finishedGames) => {
    if (!boloes.length) return;
    for (const b of boloes) {
      if (!Array.isArray(b.bets_data)) continue;
      let changed = false;
      const updatedBets = b.bets_data.map(bet => {
        const game = finishedGames.find(g =>
          g.home_team_name_en.toLowerCase().includes((bet.home || '').split(' ')[0].toLowerCase()) ||
          g.away_team_name_en.toLowerCase().includes((bet.away || '').split(' ')[0].toLowerCase())
        );
        if (!game) return bet;
        const rH = parseInt(game.home_score);
        const rA = parseInt(game.away_score);
        let pts = 0;
        if (bet.bet_home === rH && bet.bet_away === rA) pts = 5;
        else {
          const bW = bet.bet_home > bet.bet_away ? 'H' : bet.bet_home < bet.bet_away ? 'A' : 'D';
          const rW = rH > rA ? 'H' : rH < rA ? 'A' : 'D';
          if (bW === rW) pts = 3;
        }
        if (bet.pts !== pts) { changed = true; return { ...bet, real_home: rH, real_away: rA, pts }; }
        return bet;
      });
      if (changed) {
        await supabase.from('boloes').update({ bets_data: updatedBets }).eq('id', b.id);
      }
    }
    fetchData();
  };

  // Compartilhar ranking via Web Share API (com fallback WhatsApp)
  const shareRanking = async () => {
    const text = ranking.map((r, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}º`;
      return `${medal} ${r.name} — ${r.pts} pts`;
    }).join('\n');
    const fullText = `🏆 Ranking Bolão Copa 2026 🏆\n\n${text}\n\n⚽ Quem vai ganhar?`;
    if (navigator.canShare?.({ text: fullText })) {
      try { await navigator.share({ title: 'Bolão Copa 2026', text: fullText }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    // Fallback: WhatsApp deep link
    window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank');
  };

  // Ativar notificações
  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') { alert('Seu navegador não suporta notificações.'); return; }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') showToast('Notificações ativadas! ✅');
    else showToast('Permissão negada.');
  };

  // Salvar edição de palpite (admin)
  const USERS = { Jefferson: '060199', Junior: '062026' };
  const saveEditedBet = async () => {
    if (!editingBet) return;
    const correctPass = USERS[currentUser];
    if (editPassword !== correctPass) { setEditError('Senha incorreta.'); return; }
    const bolao = boloes.find(b => b.id === editingBet.bolaoId);
    if (!bolao) return;
    const updatedBets = bolao.bets_data.map((bet, idx) =>
      idx === editingBet.betIndex ? { ...bet, bet_home: editingBet.home, bet_away: editingBet.away } : bet
    );
    await supabase.from('boloes').update({ bets_data: updatedBets }).eq('id', editingBet.bolaoId);
    showToast('Palpite editado!');
    setEditingBet(null);
    setEditPassword('');
    setEditError('');
    fetchData();
  };

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
    setBase64Photo(null);
    setCameraStep(1);
    setShowCameraModal(true);
  };

  const performOcrScan = async (base64String, bettorNameInput) => {
    setCameraStep(2);
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64String,
          name: bettorNameInput
        })
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(`Resposta inválida do servidor (HTTP ${res.status})`);
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || `Erro HTTP ${res.status}`);
      }

      setWizardBettorName(data.bettor_name || bettorNameInput.trim() || 'Novo Apostador');
      setWizardBets(data.bets);
      setWizardActiveGroup('A');
      
      setShowCameraModal(false);
      setShowWizardModal(true);
    } catch (err) {
      console.error('Erro na leitura com IA:', err);
      alert(`Não foi possível ler a imagem com a IA: ${err.message}\n\nAbrindo o formulário em branco para preenchimento manual.`);
      
      // Fallback to manual blank form on error
      const blankBets = confrontos.map(match => ({
        match_id: match.id,
        home: match.home_team,
        away: match.away_team,
        bet_home: '',
        bet_away: '',
        grupo: match.grupo
      }));
      
      setWizardBettorName(bettorNameInput.trim() || 'Novo Apostador');
      setWizardBets(blankBets);
      setWizardActiveGroup('A');
      
      setShowCameraModal(false);
      setShowWizardModal(true);
    } finally {
      setCameraStep(1);
    }
  };

  // Handle file selection from device gallery/camera and convert to Base64
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Preview URL
    const localUrl = URL.createObjectURL(file);
    setUploadedPhotoUrl(localUrl);

    try {
      // Compress and resize image first (max 1024px, 80% quality)
      const compressedBase64 = await compressImage(file);
      setBase64Photo(compressedBase64);
      // Automatically trigger scanning using the real API
      performOcrScan(compressedBase64, tempBettorName);
    } catch (err) {
      console.error('Erro ao comprimir a imagem, enviando original:', err);
      // Fallback to raw FileReader if compression fails
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64Photo(reader.result);
        performOcrScan(reader.result, tempBettorName);
      };
      reader.readAsDataURL(file);
    }
  };

  const capturePhoto = () => {
    if (!base64Photo) {
      alert('Por favor, carregue uma foto primeiro.');
      return;
    }
    performOcrScan(base64Photo, tempBettorName);
  };

  const startManualUpload = () => {
    setWizardBettorName('');
    setBase64Photo(null);
    
    // Prefill all games with blank scores
    const blankBets = confrontos.map(match => ({
      match_id: match.id,
      home: match.home_team,
      away: match.away_team,
      bet_home: '',
      bet_away: '',
      grupo: match.grupo
    }));

    setWizardBets(blankBets);
    setWizardActiveGroup('A');
    setShowWizardModal(true);
  };

  const handleWizardScoreChange = (index, field, value) => {
    setWizardBets(prev => prev.map((bet, idx) => 
      idx === index ? { ...bet, [field]: value } : bet
    ));
  };

  const saveWizardBolao = async () => {
    if (!wizardBettorName.trim()) {
      alert('Por favor, insira o nome do apostador.');
      return;
    }

    // Map wizardBets back to database format
    const finalBetsData = wizardBets.map(bet => {
      const match = confrontos.find(c => c.id === bet.match_id) || {};
      const rH = match.home_score !== null ? parseInt(match.home_score) : null;
      const rA = match.away_score !== null ? parseInt(match.away_score) : null;
      
      let pts = null;
      if (rH !== null && rA !== null && bet.bet_home !== '' && bet.bet_away !== '') {
        const bH = parseInt(bet.bet_home);
        const bA = parseInt(bet.bet_away);
        if (bH === rH && bA === rA) {
          pts = 5;
        } else {
          const bW = bH > bA ? 'H' : bH < bA ? 'A' : 'D';
          const rW = rH > rA ? 'H' : rH < rA ? 'A' : 'D';
          if (bW === rW) {
            pts = 3;
          } else {
            pts = 0;
          }
        }
      }

      return {
        match_id: bet.match_id,
        home: bet.home,
        away: bet.away,
        bet_home: bet.bet_home !== '' ? parseInt(bet.bet_home) : null,
        bet_away: bet.bet_away !== '' ? parseInt(bet.bet_away) : null,
        real_home: rH,
        real_away: rA,
        pts: pts
      };
    });

    const photoToSave = base64Photo || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=375&auto=format&fit=crop';

    const { error } = await supabase.from('boloes').insert({
      username: currentUser,
      bettor_name: wizardBettorName.trim(),
      photo_url: photoToSave,
      bets_data: finalBetsData
    });

    if (!error) {
      showToast('Bolão cadastrado com sucesso!');
      setShowWizardModal(false);
      fetchData();
    } else {
      alert('Erro ao salvar bolão.');
    }
  };

  const handleResetDatabase = async () => {
    const conf = window.confirm("⚠️ ATENÇÃO: Isso irá apagar TODOS os bolões cadastrados e palpites, e reiniciará os confrontos da Copa 2026 para o estado inicial correto (72 jogos). Deseja continuar?");
    if (!conf) return;

    try {
      setApiLoading(true);
      await resetDatabase();
      showToast('Banco de dados reiniciado com sucesso!');
      await fetchData();
    } catch (e) {
      alert('Erro ao reiniciar banco de dados.');
    } finally {
      setApiLoading(false);
    }
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
            <button
              className={`drawer-link ${activeTab === 'boloes' ? 'active' : ''}`}
              onClick={() => { setActiveTab('boloes'); setIsDrawerOpen(false); }}
            >
              <Icons.Camera size={18} />
              <span>Bolões</span>
            </button>

            <button
              className={`drawer-link ${activeTab === 'ranking' ? 'active' : ''}`}
              onClick={() => { setActiveTab('ranking'); setIsDrawerOpen(false); }}
            >
              <Icons.Trophy size={18} />
              <span>Classificação</span>
            </button>

            <button
              className={`drawer-link ${activeTab === 'grupos' ? 'active' : ''}`}
              onClick={() => { setActiveTab('grupos'); setIsDrawerOpen(false); }}
            >
              <Icons.List size={18} />
              <span>Grupos da Copa</span>
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

            <button
              className={`drawer-link`}
              onClick={() => { setIsDrawerOpen(false); requestNotifications(); }}
            >
              <Icons.Bell size={18} />
              <span>{notifPermission === 'granted' ? '🔔 Notificações ON' : 'Ativar Notificações'}</span>
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

        {/* Countdown Widget para próximo jogo */}
        {nextMatchInfo && countdown && activeTab !== 'grupos' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(251,191,36,0.08))',
            border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px',
            padding: '0.75rem 1rem', marginBottom: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <img src={`https://flagcdn.com/w40/${getFlagCode(nextMatchInfo.home_team_name_en)}.png`} style={{ width: '24px' }} alt="" />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>vs</span>
              <img src={`https://flagcdn.com/w40/${getFlagCode(nextMatchInfo.away_team_name_en)}.png`} style={{ width: '24px' }} alt="" />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>Próximo jogo</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: '900', color: countdown === 'AO VIVO AGORA!' ? '#ef4444' : 'var(--accent-gold)', letterSpacing: '1px' }}>{countdown}</div>
            </div>
          </div>
        )}

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
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min="0"
                            className="score-field"
                            value={savedBet.home}
                            onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                          />
                          <span className="score-sep">x</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
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

        {/* 2. Bolões (Bettors List & Upload) */}
        {activeTab === 'boloes' && (
          !currentUser ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
              <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1rem' }}>Login necessário</p>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '1.5rem' }}>
                Apenas administradores podem upar e gerenciar bolões.
              </span>
              <button className="btn-submit" style={{ maxWidth: '220px', margin: '0 auto' }} onClick={() => router.push('/')}>
                Ir para Login
              </button>
            </div>
          ) : (
          <div>
            <div className="boloes-header">
              <div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>Bolões Cadastrados</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Visualize fotos e palpites lidos.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn-upload-bolao" onClick={startCameraUpload}>
                  <Icons.Camera size={14} />
                  Upar Bolão
                </button>
                <button className="btn-upload-bolao" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#fff', border: '1px solid var(--border-color)' }} onClick={startManualUpload}>
                  <Icons.Plus size={14} style={{ color: '#fff' }} />
                  Cadastrar Manualmente
                </button>
                <button className="btn-upload-bolao" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }} onClick={handleResetDatabase}>
                  🗑️ Reiniciar Dados
                </button>
              </div>
            </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {boloes.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '2rem 0' }}>Nenhum bolão cadastrado ainda. Clique em "Upar Bolão" para adicionar!</p>
              )}
              {boloes.map(b => (
                <div className="bolao-card" key={b.id}>
                  <div className="bolao-card-top">
                    <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${b.bettor_name}`} className="bolao-avatar" alt="avatar" />
                    <div className="bolao-details">
                      <h4>{b.bettor_name}</h4>
                      <span>Registrado por: {b.username}</span>
                    </div>
                  </div>
                  <div className="bolao-card-actions">
                    <button className="bolao-action-btn btn-view-photo" onClick={() => setShowPhotoModal(b.photo_url)}>
                      <Icons.Eye size={12} /> Ver Foto
                    </button>
                    <button className="bolao-action-btn btn-view-bets" onClick={() => setShowBetsModal(b)}>
                      <Icons.Trophy size={12} /> Apostas
                    </button>
                    <button className="bolao-action-btn" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid #6366f1', color: '#818cf8' }}
                      onClick={() => setShowHistoryModal(b)}>
                      📊 Histórico
                    </button>
                    <button className="bolao-action-btn" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', color: '#ef4444' }}
                      onClick={() => { setShowDeleteModal({ id: b.id, bettor_name: b.bettor_name }); setDeletePassword(''); setDeleteError(''); }}>
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )
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
                {/* Podiums */}
                <div className="podium-container">
                  {top3[1] && (<div className="podium-column second">
                    <img src={top3[1].avatar} className="podium-avatar" alt="2nd" />
                    <div className="podium-box">
                      <span className="podium-name">{top3[1].name}</span>
                      <span className="podium-pts">{top3[1].pts} pts</span>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 'bold' }}>2º Lugar</span>
                    </div>
                  </div>)}
                  {top3[0] && (<div className="podium-column first">
                    <span className="podium-crown">👑</span>
                    <img src={top3[0].avatar} className="podium-avatar" alt="1st" />
                    <div className="podium-box">
                      <span className="podium-name">{top3[0].name}</span>
                      <span className="podium-pts">{top3[0].pts} pts</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>1º Lugar</span>
                    </div>
                  </div>)}
                  {top3[2] && (<div className="podium-column third">
                    <img src={top3[2].avatar} className="podium-avatar" alt="3rd" />
                    <div className="podium-box">
                      <span className="podium-name">{top3[2].name}</span>
                      <span className="podium-pts">{top3[2].pts} pts</span>
                      <span style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 'bold' }}>3º Lugar</span>
                    </div>
                  </div>)}
                </div>
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
                {/* Compartilhar Ranking */}
                <button onClick={shareRanking} style={{
                  width: '100%', marginTop: '1.25rem', padding: '0.85rem',
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  border: 'none', borderRadius: '10px', color: '#fff',
                  fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}>
                  📤 Compartilhar Ranking no WhatsApp
                </button>
              </>
            )}
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

        {/* 6. Grupos da Copa via API */}
        {activeTab === 'grupos' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>Grupos da Copa 2026</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Classificação em tempo real • Verde = classificado</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
              {['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => (
                <button key={g} onClick={() => setSelectedGroup(g)} style={{
                  padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700',
                  border: 'none', cursor: 'pointer',
                  background: selectedGroup === g ? 'var(--soccer-green)' : 'rgba(255,255,255,0.08)',
                  color: selectedGroup === g ? '#000' : '#cbd5e1'
                }}>Grupo {g}</button>
              ))}
            </div>
            {apiLoading && apiGroups.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '2rem' }}>Carregando grupos...</p>
            ) : (() => {
              const groupData = apiGroups.find(g => g.group === selectedGroup || g.name === selectedGroup);
              if (!groupData || !groupData.teams) return (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '2rem' }}>Dados do Grupo {selectedGroup} indisponíveis ainda.</p>
              );
              return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        {['Pos','País','J','V','E','D','SG','Pts'].map(h => (
                          <th key={h} style={{ padding: '0.5rem 0.3rem', color: h === 'Pts' ? 'var(--accent-gold)' : 'var(--text-secondary)', textAlign: h === 'País' ? 'left' : 'center' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupData.teams.map((t, idx) => (
                        <tr key={t.team} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx < 2 ? 'rgba(16,185,129,0.07)' : 'transparent' }}>
                          <td style={{ padding: '0.6rem 0.3rem', color: idx < 2 ? 'var(--soccer-green)' : 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>{t.position ?? idx+1}º</td>
                          <td style={{ padding: '0.6rem 0.3rem', fontWeight: '600' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <img src={`https://flagcdn.com/w40/${getFlagCode(t.team)}.png`} style={{ width: '20px' }} alt="" />{t.team}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.6rem 0.3rem' }}>{t.played ?? '-'}</td>
                          <td style={{ textAlign: 'center', padding: '0.6rem 0.3rem' }}>{t.won ?? '-'}</td>
                          <td style={{ textAlign: 'center', padding: '0.6rem 0.3rem' }}>{t.drawn ?? '-'}</td>
                          <td style={{ textAlign: 'center', padding: '0.6rem 0.3rem' }}>{t.lost ?? '-'}</td>
                          <td style={{ textAlign: 'center', padding: '0.6rem 0.3rem' }}>{t.goalDifference ?? t.goal_difference ?? '-'}</td>
                          <td style={{ textAlign: 'center', padding: '0.6rem 0.3rem', fontWeight: '900', color: 'var(--accent-gold)' }}>{t.points ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
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

      {/* Modal Histórico de Palpites */}
      {showHistoryModal && (() => {
        const b = showHistoryModal;
        const total = Array.isArray(b.bets_data) ? b.bets_data.length : 0;
        const finalizados = Array.isArray(b.bets_data) ? b.bets_data.filter(bt => bt.pts !== null && bt.pts !== undefined) : [];
        const exatos = finalizados.filter(bt => bt.pts === 5).length;
        const corretos = finalizados.filter(bt => bt.pts === 3).length;
        const erros = finalizados.filter(bt => bt.pts === 0).length;
        const totalPts = finalizados.reduce((acc, bt) => acc + (bt.pts || 0), 0);
        return (
          <div className="modal-overlay" onClick={() => setShowHistoryModal(null)}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-header">
                <h3>Histórico — {b.bettor_name}</h3>
                <div onClick={() => setShowHistoryModal(null)} className="modal-close"><Icons.X size={20} /></div>
              </div>
              {/* Stats resumo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                {[{ label: 'Total Pts', val: totalPts, color: 'var(--accent-gold)' },
                  { label: '🎯 Exatos', val: exatos, color: 'var(--soccer-green)' },
                  { label: '✅ Vencedor', val: corretos, color: '#60a5fa' },
                  { label: '❌ Erros', val: erros, color: '#f87171' }].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Lista de palpites */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(b.bets_data || []).map((bet, idx) => {
                  const ptsColor = bet.pts === 5 ? 'var(--soccer-green)' : bet.pts === 3 ? 'var(--accent-gold)' : bet.pts === 0 ? '#f87171' : 'var(--text-muted)';
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.04)' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.78rem', fontWeight: '600' }}>{bet.home} vs {bet.away}</p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Chutou: {bet.bet_home} x {bet.bet_away}{bet.real_home !== null && bet.real_home !== undefined ? ` | Real: ${bet.real_home} x ${bet.real_away}` : ' | Pendente'}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '900', color: ptsColor }}>{bet.pts !== null && bet.pts !== undefined ? `+${bet.pts}` : '-'}</span>
                        {currentUser && (
                          <button onClick={() => { setEditingBet({ bolaoId: b.id, betIndex: idx, home: bet.bet_home, away: bet.bet_away }); setEditPassword(''); setEditError(''); setShowHistoryModal(null); }}
                            style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem', background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1', color: '#818cf8', borderRadius: '6px', cursor: 'pointer' }}>
                            ✏️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Editar Palpite (Admin) */}
      {editingBet && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Editar Palpite</h3>
              <div onClick={() => setEditingBet(null)} className="modal-close"><Icons.X size={20} /></div>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Corrija o placar apostado:</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', justifyContent: 'center' }}>
              <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" max="20" value={editingBet.home}
                onChange={e => setEditingBet(prev => ({ ...prev, home: parseInt(e.target.value) || 0 }))}
                className="score-field" style={{ fontSize: '1.5rem', width: '60px', height: '60px', textAlign: 'center' }} />
              <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>x</span>
              <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" max="20" value={editingBet.away}
                onChange={e => setEditingBet(prev => ({ ...prev, away: parseInt(e.target.value) || 0 }))}
                className="score-field" style={{ fontSize: '1.5rem', width: '60px', height: '60px', textAlign: 'center' }} />
            </div>
            <div className="form-group">
              <label>Confirme sua senha</label>
              <input type="password" className="form-control" placeholder="Sua senha de login"
                value={editPassword} onChange={e => { setEditPassword(e.target.value); setEditError(''); }} />
            </div>
            {editError && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{editError}</p>}
            <button className="btn-submit" onClick={saveEditedBet}>SALVAR CORREÇÃO</button>
          </div>
        </div>
      )}

      {/* 5. Cadastro/Revisão Wizard Modal */}
      {showWizardModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '650px', width: '100%' }}>
            <div className="modal-header">
              <h3>Revisar / Cadastrar Bolão</h3>
              <div onClick={() => setShowWizardModal(false)} className="modal-close">
                <Icons.X size={20} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Nome do Apostador</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: Maria Clara"
                value={wizardBettorName}
                onChange={(e) => setWizardBettorName(e.target.value)}
                style={{ fontSize: '0.9rem', padding: '0.6rem 0.75rem' }}
              />
            </div>

            {/* Groups Select Tabs */}
            <div className="group-tabs" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
              {groupsList.map(g => {
                const groupBets = wizardBets.filter(b => b.grupo === g);
                const filledCount = groupBets.filter(b => b.bet_home !== '' && b.bet_away !== '' && b.bet_home !== null && b.bet_away !== null).length;
                const isActive = wizardActiveGroup === g;
                return (
                  <button
                    key={g}
                    className={`group-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setWizardActiveGroup(g)}
                    style={{
                      flexShrink: 0,
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: isActive ? 'var(--accent-gold)' : 'rgba(255,255,255,0.03)',
                      color: isActive ? '#000' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Grupo {g}
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '0.1rem 0.3rem',
                      borderRadius: '10px',
                      background: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                      color: isActive ? '#000' : 'var(--text-muted)'
                    }}>
                      {filledCount}/6
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 6 Confrontos do Grupo Selecionado */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '45vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {wizardBets.map((bet, idx) => {
                if (bet.grupo !== wizardActiveGroup) return null;
                const hFlag = getFlagCode(bet.home);
                const aFlag = getFlagCode(bet.away);
                return (
                  <div key={bet.match_id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                      <span>Jogo #{bet.match_id}</span>
                      <span>Grupo {bet.grupo}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                        <img src={`https://flagcdn.com/w80/${hFlag}.png`} style={{ width: '28px', height: '20px', borderRadius: '4px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} alt={bet.home} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bet.home}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                        <input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min="0"
                          placeholder="-"
                          className="score-field"
                          style={{ width: '45px', height: '40px', fontSize: '1.1rem', textAlign: 'center', borderRadius: '6px' }}
                          value={bet.bet_home}
                          onChange={(e) => handleWizardScoreChange(idx, 'bet_home', e.target.value)}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>x</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min="0"
                          placeholder="-"
                          className="score-field"
                          style={{ width: '45px', height: '40px', fontSize: '1.1rem', textAlign: 'center', borderRadius: '6px' }}
                          value={bet.bet_away}
                          onChange={(e) => handleWizardScoreChange(idx, 'bet_away', e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0, justifyContent: 'flex-end', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bet.away}</span>
                        <img src={`https://flagcdn.com/w80/${aFlag}.png`} style={{ width: '28px', height: '20px', borderRadius: '4px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} alt={bet.away} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer / Salvar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Progresso: <strong>{wizardBets.filter(b => b.bet_home !== '' && b.bet_away !== '' && b.bet_home !== null && b.bet_away !== null).length}/72</strong> jogos
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-upload-bolao" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }} onClick={() => setShowWizardModal(false)}>
                  Cancelar
                </button>
                <button className="btn-upload-bolao" style={{ backgroundColor: 'var(--soccer-green)', color: '#000' }} onClick={saveWizardBolao}>
                  Salvar Bolão
                </button>
              </div>
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
