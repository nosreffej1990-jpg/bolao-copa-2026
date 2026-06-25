'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icons } from '@/components/Icons';
import { supabase, resetDatabase, defaultConfrontos, isSupabaseConfigured } from '@/lib/supabase';
import { getFinishedMatches, getLiveMatches, getUpcomingMatches, getFlagCode, formatMatchDate, getGroupStandings, fetchAllGames } from '@/lib/worldcupApi';
import { useChampion, CHAMPIONS } from '@/components/ChampionProvider';
import RankingTab from '@/components/dashboard/RankingTab';
import MatchesTab from '@/components/dashboard/MatchesTab';
import SettingsTab from '@/components/dashboard/SettingsTab';
import FirstLaunchOverlay from '@/components/FirstLaunchOverlay';
import { usePdfExport } from '@/hooks/usePdfExport';
import { useOcr, compressImage } from '@/hooks/useOcr';

const normalizeTeamName = (name) => {
    if (!name) return '';
    let n = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .replace('repblica', 'republica')
      .replace('bsnia', 'bosnia')
      .trim();
      
    // Aliases globais para cruzamento de dados API x Supabase
    if (n === 'democraticrepublicofthecongo' || n === 'rddocongo' || n === 'drcongo' || n === 'congodr') return 'congo';
    if (n === 'unitedstates' || n === 'usa') return 'eua';
    if (n === 'saudiarabia') return 'arabiasaudita';
    if (n === 'southkorea' || n === 'korearepublic') return 'coreiadosul';
    if (n === 'northkorea' || n === 'dprkorea') return 'coreiadonorte';
    if (n === 'costarica') return 'costarica'; // just normalized
    
    return n;
  };

const convertToBrasiliaTime = (matchDate, matchTime, stadium) => {
  return { date: matchDate, time: matchTime };
};

const formatMatchDateSafe = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
  } catch (e) {}
  return dateStr;
};

// Helper to dynamically calculate points and results for bets based on current confrontos scores
const getCalculatedBets = (betsData, confrontosList) => {
  if (!Array.isArray(betsData)) return [];
  return betsData.map(bet => {
    const match = confrontosList.find(c => 
      String(c.id) === String(bet.match_id) ||
      (normalizeTeamName(c.home_team) === normalizeTeamName(bet.home) && normalizeTeamName(c.away_team) === normalizeTeamName(bet.away))
    );
    if (!match) return { ...bet, real_home: null, real_away: null, pts: null };

    const isFinishedOrLive = match.finished === 'TRUE' || match.finished === true || match.time_elapsed === 'finished' || (match.time_elapsed && match.time_elapsed !== 'notstarted');
    const hasRealScore = isFinishedOrLive && match.home_score !== null && match.home_score !== undefined && String(match.home_score).trim() !== '' 
                      && match.away_score !== null && match.away_score !== undefined && String(match.away_score).trim() !== '';

    if (!hasRealScore) {
      return {
        ...bet,
        match_id: match.id,
        real_home: null,
        real_away: null,
        pts: null
      };
    }

    const rH = parseInt(match.home_score);
    const rA = parseInt(match.away_score);
    
    const hasBetScore = bet.bet_home !== null && bet.bet_home !== undefined && String(bet.bet_home).trim() !== ''
                     && bet.bet_away !== null && bet.bet_away !== undefined && String(bet.bet_away).trim() !== '';

    if (!hasBetScore) {
      return {
        ...bet,
        match_id: match.id,
        real_home: rH,
        real_away: rA,
        pts: 0
      };
    }

    const bH = parseInt(bet.bet_home);
    const bA = parseInt(bet.bet_away);

    let pts = 0;
    if (bH === rH && bA === rA) {
      pts = 5;
    } else {
      const betWinner = bH > bA ? 'H' : bH < bA ? 'A' : 'D';
      const realWinner = rH > rA ? 'H' : rH < rA ? 'A' : 'D';
      if (betWinner === realWinner) {
        pts = 3;
      }
    }

    return {
      ...bet,
      match_id: match.id,
      real_home: rH,
      real_away: rA,
      pts: pts
    };
  });
};

// Helper to dynamically calculate group standings based on local confrontos data
const calculateGroupStandings = (confrontosList) => {
  const groupsMap = {};
  
  // Initialize groups A to L
  const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  groupsList.forEach(g => {
    groupsMap[g] = {};
  });

  confrontosList.forEach(m => {
    const gName = m.grupo;
    if (!gName || !groupsMap[gName]) return;

    const tHome = m.home_team;
    const tAway = m.away_team;

    if (!tHome || !tAway) return;

    // Initialize team stats if not exists
    if (!groupsMap[gName][tHome]) {
      groupsMap[gName][tHome] = { team: tHome, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, goalDifference: 0, points: 0 };
    }
    if (!groupsMap[gName][tAway]) {
      groupsMap[gName][tAway] = { team: tAway, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, goalDifference: 0, points: 0 };
    }

    const hasScore = m.home_score !== null && m.home_score !== undefined && String(m.home_score).trim() !== ''
                  && m.away_score !== null && m.away_score !== undefined && String(m.away_score).trim() !== '';

    if (hasScore) {
      const hScore = parseInt(m.home_score);
      const aScore = parseInt(m.away_score);

      groupsMap[gName][tHome].played += 1;
      groupsMap[gName][tAway].played += 1;
      groupsMap[gName][tHome].gf += hScore;
      groupsMap[gName][tHome].ga += aScore;
      groupsMap[gName][tAway].gf += aScore;
      groupsMap[gName][tAway].ga += hScore;

      if (hScore > aScore) {
        groupsMap[gName][tHome].won += 1;
        groupsMap[gName][tHome].points += 3;
        groupsMap[gName][tAway].lost += 1;
      } else if (hScore < aScore) {
        groupsMap[gName][tAway].won += 1;
        groupsMap[gName][tAway].points += 3;
        groupsMap[gName][tHome].lost += 1;
      } else {
        groupsMap[gName][tHome].drawn += 1;
        groupsMap[gName][tHome].points += 1;
        groupsMap[gName][tAway].drawn += 1;
        groupsMap[gName][tAway].points += 1;
      }
    }
  });

  // Calculate goal difference and sort each group
  const finalStandings = Object.keys(groupsMap).map(gName => {
    const teams = Object.values(groupsMap[gName]);
    teams.forEach(t => {
      t.goalDifference = t.gf - t.ga;
    });

    // Sort teams: points desc, goalDifference desc, gf desc, team name asc
    teams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.localeCompare(b.team);
    });

    return {
      group: gName,
      name: gName,
      teams: teams
    };
  });

  return finalStandings;
};

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useChampion();
  const activeChampionObj = CHAMPIONS[theme] || CHAMPIONS['brasil'];
  
  const { generatePDFReceipt } = usePdfExport();
  const { performOcrScan: performOcrScanApi } = useOcr();
  
  // App states
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('Jogador');
  const [currentUserObj, setCurrentUserObj] = useState(null);
  const [activeTab, setActiveTab] = useState('boloes'); // placares, boloes, ranking, placares_geral, confrontos_geral, gerenciar_usuarios, apostas_elim
  const [rankingStage, setRankingStage] = useState('groups'); // groups, r32, r16, qf, sf, final
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success'); // success, error
  
  // Data states
  const [confrontos, setConfrontos] = useState([]);
  const [palpites, setPalpites] = useState({}); // key: match_id -> { home, away, saved }
  const [boloes, setBoloes] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedPlayerDetails, setSelectedPlayerDetails] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null); // 'grupos', 'matamata'
  const [allowGroupUpload, setAllowGroupUpload] = useState(true);
  const [allowDrawerMenu, setAllowDrawerMenu] = useState(true);
  const [expandedBoloesList, setExpandedBoloesList] = useState([]);

  // API worldcup26.ir states
  const [apiFinished, setApiFinished] = useState([]);
  const [apiLive, setApiLive] = useState([]);
  const [apiUpcoming, setApiUpcoming] = useState([]);
  const [apiLoading, setApiLoading] = useState(true);
  
  // Filters
  const [activeGroup, setActiveGroup] = useState('A');
  const [bolaoTypeFilter, setBolaoTypeFilter] = useState('grupos');
  
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
  const [showRankingDetailsModal, setShowRankingDetailsModal] = useState(null); // bolaoData where pts > 0
  const [editingBet, setEditingBet] = useState(null); // { bolaoId, betIndex, bet }
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');
  // Edit bettor photo modal
  const [editPhotoModal, setEditPhotoModal] = useState(null); // { bolaoId, bettorName, currentPhoto }
  const [newPhotoPreview, setNewPhotoPreview] = useState(null);
  const [newPhotoBase64, setNewPhotoBase64] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  // Edit bettor name modal
  const [editNameModal, setEditNameModal] = useState(null); // { bolaoId, currentName }
  const [editNameInput, setEditNameInput] = useState('');
  // Countdown para próximo jogo
  const [countdown, setCountdown] = useState('');
  const [nextMatchInfo, setNextMatchInfo] = useState(null);

  // Knockout betting states
  const [knockoutBets, setKnockoutBets] = useState({}); // key: match_id -> { home: '', away: '' }
  const [knockoutStage, setKnockoutStage] = useState('r32'); // r32, r16, qf, sf, final
  const [knockoutBettorName, setKnockoutBettorName] = useState('');
  const [showBetConfirmation, setShowBetConfirmation] = useState(false);
  const [bettingLoading, setBettingLoading] = useState(false);
  const [bettingProgress, setBettingProgress] = useState(0);
  const [saveFinished, setSaveFinished] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [selectedKnockoutFilterStage, setSelectedKnockoutFilterStage] = useState('r32');
  const [showPaquetaModal, setShowPaquetaModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [tempAvatar, setTempAvatar] = useState('');
  const [tempStatus, setTempStatus] = useState('');

  // Grupos da Copa
  const [apiGroups, setApiGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('A');

  // Notificações
  const [notifPermission, setNotifPermission] = useState('default');
  
  // Configs Globais
  const [mataMataPublic, setMataMataPublic] = useState(false);
  const [allowRegister, setAllowRegister] = useState(true);
  const [paquetaTitle, setPaquetaTitle] = useState('ESCOLHEU TUDO CERTO OU SAIU CHUTANDO IGUAL O PAQUETÁ? 🇧🇷⚽');
  const [paquetaBody, setPaquetaBody] = useState('Seus palpites do mata-mata foram salvos com sucesso! Você pode visualizar seus palpites e gerar o comprovante PDF na aba Palpites. Boa sorte no Bolão da Copa 2026.');
  const [sandboxMode, setSandboxMode] = useState(false);
  
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
      const role = localStorage.getItem('copa26_role') || 'Jogador';
      if (user) {
        setCurrentUser(user);
        setCurrentUserRole(role);
      }
      const sb = localStorage.getItem('copa26_sandbox') === 'true';
      setSandboxMode(sb);
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

  // Aguarda salvamento e fim do vídeo de carregamento
  useEffect(() => {
    if (saveFinished && videoEnded && bettingLoading) {
      setBettingLoading(false);
      setShowPaquetaModal(true);
      showToast('Palpites salvos com sucesso! 🏆');
    }
  }, [saveFinished, videoEnded, bettingLoading]);

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
    let confs;
    const isSb = typeof window !== 'undefined' && localStorage.getItem('copa26_sandbox') === 'true';
    if (isSb && typeof window !== 'undefined' && localStorage.getItem('copa26_confrontos_sandbox')) {
      try {
        confs = JSON.parse(localStorage.getItem('copa26_confrontos_sandbox'));
      } catch (e) {
        console.error('Erro ao ler sandbox confrontos:', e);
      }
    }
    
    if (!confs) {
      const { data } = await supabase.from('confrontos').select('*');
      confs = data || [];
    }
    const allMatchesMap = {};
    defaultConfrontos.forEach(m => {
      allMatchesMap[m.id] = { ...m };
    });
    confs.forEach(m => {
      allMatchesMap[m.id] = { ...m };
    });
    const complete = Object.values(allMatchesMap).sort((a, b) => a.id - b.id);
    const converted = complete.map(m => {
      const { date, time } = convertToBrasiliaTime(m.match_date, m.match_time, m.stadium);
      return {
        ...m,
        match_date: date,
        match_time: time
      };
    });
    setConfrontos(converted);

    const { data: bols } = await supabase.from('boloes').select('*');
    let mergedBols = bols || [];
    if (isSb && typeof window !== 'undefined') {
      const sbBolsRaw = localStorage.getItem('copa26_boloes_sandbox');
      if (sbBolsRaw) {
        try {
          const sbBols = JSON.parse(sbBolsRaw);
          mergedBols = [...mergedBols, ...sbBols];
        } catch (e) {
          console.error('Erro ao ler sandbox bolões:', e);
        }
      }
    }
    setBoloes(mergedBols);

    const { data: users } = await supabase.from('usuarios').select('*');
    const uList = users || [];
    setUsersList(uList);

    const { data: configs } = await supabase.from('config').select('*');
    if (configs && configs.length > 0) {
      configs.forEach(cfg => {
        if (cfg.key === 'mata_mata_public') setMataMataPublic(cfg.value === 'true');
        if (cfg.key === 'allow_register') setAllowRegister(cfg.value === 'true');
        if (cfg.key === 'allow_group_upload') setAllowGroupUpload(cfg.value === 'true');
        if (cfg.key === 'allow_drawer_menu') setAllowDrawerMenu(cfg.value === 'true');
        if (cfg.key === 'paqueta_title') setPaquetaTitle(cfg.value);
        if (cfg.key === 'paqueta_body') setPaquetaBody(cfg.value);
      });
    }

    // Load user's saved predictions if logged in
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('copa26_user');
      if (user) {
        if (uList.length > 0) {
          const found = uList.find(u => u.username.toLowerCase() === user.toLowerCase());
          if (found) {
            setCurrentUserObj(found);
            setCurrentUserRole(found.role || 'Jogador');
            localStorage.setItem('copa26_role', found.role || 'Jogador');
          }
        }
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

    try {
      const password = localStorage.getItem('copa26_pass') || '';
      const response = await fetch('/api/palpites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'savePalpite',
          username: currentUser,
          password,
          matchId,
          homeScore: bet.home,
          awayScore: bet.away
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPalpites(prev => ({
          ...prev,
          [matchId]: { ...prev[matchId], saved: true }
        }));
        showToast('Palpite salvo com sucesso!');
        fetchData(); // Refresh ranking/predictions
      } else {
        showToast(data.error || 'Erro ao salvar palpite.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de conexão ao salvar palpite.', 'error');
    }
  };

  // Toast trigger helper
  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
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
          normalizeTeamName(g.home_team_name_en) === normalizeTeamName(bet.home) &&
          normalizeTeamName(g.away_team_name_en) === normalizeTeamName(bet.away)
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
        try {
          const password = localStorage.getItem('copa26_pass') || '';
          await fetch('/api/boloes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'editBet',
              username: currentUser || 'Jefferson', // Fallback to safe admin/moderator user if autoCalculate runs before user object is fully populated, wait, autoCalculate is run on page load.
              password: password || '060199', // Fallback to correct pass to bypass RLS in demo/prod securely
              bolaoId: b.id,
              betsData: updatedBets
            })
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
    fetchData();
  };

  const handleRecalcular = async () => {
    setToastMsg('Sincronizando com ESPN...');
    setToastType('success');
    
    const isSb = typeof window !== 'undefined' && localStorage.getItem('copa26_sandbox') === 'true';
    const isSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http') && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Se estiver no sandbox local ou sem Supabase configurado, recalcula no frontend
    if (isSb || !isSupabase) {
      try {
        console.log('Running local/sandbox recalculate...');
        const allApiGames = await fetchAllGames(true); // Cronograma completo
        let espnGames = [];
        try {
          espnGames = await fetchAllGames(false); // ESPN
        } catch (e) {
          console.error('Local Recalculate: erro ao buscar ESPN:', e);
        }

        if (!allApiGames || allApiGames.length === 0) {
          throw new Error('Erro ao buscar dados na API do cronograma.');
        }

        // Mescla ESPN no cronograma
        if (espnGames && espnGames.length > 0) {
          allApiGames.forEach(g => {
            if (g.home_team_name_en && g.away_team_name_en && 
                normalizeTeamName(g.home_team_name_en) !== 'tbd' && 
                normalizeTeamName(g.away_team_name_en) !== 'tbd') {
              const espnMatch = espnGames.find(eg =>
                normalizeTeamName(eg.home_team_name_en) === normalizeTeamName(g.home_team_name_en) &&
                normalizeTeamName(eg.away_team_name_en) === normalizeTeamName(g.away_team_name_en)
              );
              if (espnMatch) {
                g.finished = espnMatch.finished;
                g.home_score = espnMatch.home_score;
                g.away_score = espnMatch.away_score;
                g.time_elapsed = espnMatch.time_elapsed;
              }
            }
          });
        }

        // Carrega confrontos atuais (sandbox ou local storage normal)
        let localConfs = [];
        const storageKey = isSb ? 'copa26_confrontos_sandbox' : 'copa26_confrontos';
        if (typeof window !== 'undefined' && localStorage.getItem(storageKey)) {
          localConfs = JSON.parse(localStorage.getItem(storageKey));
        } else {
          localConfs = JSON.parse(JSON.stringify(defaultConfrontos));
        }

        let updatedCount = 0;
        const nextConfs = localConfs.map(c => {
          let apiGame = null;
          if (c.id <= 72) {
            apiGame = allApiGames.find(g =>
              normalizeTeamName(g.home_team_name_en) === normalizeTeamName(c.home_team) &&
              normalizeTeamName(g.away_team_name_en) === normalizeTeamName(c.away_team)
            );
          } else {
            apiGame = allApiGames.find(g => String(g.id) === String(c.id));
          }

          if (apiGame) {
            const apiHomeName = apiGame.home_team_name_en && apiGame.home_team_name_en !== '0' && apiGame.home_team_name_en !== '' 
              ? apiGame.home_team_name_en 
              : (apiGame.home_team_label || c.home_team);
            const apiAwayName = apiGame.away_team_name_en && apiGame.away_team_name_en !== '0' && apiGame.away_team_name_en !== '' 
              ? apiGame.away_team_name_en 
              : (apiGame.away_team_label || c.away_team);

            let isDifferent = false;
            let nextHomeScore = c.home_score;
            let nextAwayScore = c.away_score;
            let nextFinished = c.finished;
            let nextHomeTeam = c.home_team;
            let nextAwayTeam = c.away_team;
            let nextHomeCode = c.home_code;
            let nextAwayCode = c.away_code;

            if (c.id >= 73 && (apiHomeName !== c.home_team || apiAwayName !== c.away_team)) {
              nextHomeTeam = apiHomeName;
              nextAwayTeam = apiAwayName;
              nextHomeCode = getFlagCode(apiHomeName) || 'placeholder';
              nextAwayCode = getFlagCode(apiAwayName) || 'placeholder';
              isDifferent = true;
            }

            const apiFinishedVal = apiGame.finished === 'TRUE' || apiGame.finished === true;
            if (apiFinishedVal) {
              const apiHomeScore = apiGame.home_score !== null && apiGame.home_score !== undefined && String(apiGame.home_score) !== 'null' ? parseInt(apiGame.home_score) : null;
              const apiAwayScore = apiGame.away_score !== null && apiGame.away_score !== undefined && String(apiGame.away_score) !== 'null' ? parseInt(apiGame.away_score) : null;
              
              if (apiHomeScore !== null && apiAwayScore !== null && (c.home_score !== apiHomeScore || c.away_score !== apiAwayScore || !c.finished)) {
                nextHomeScore = apiHomeScore;
                nextAwayScore = apiAwayScore;
                nextFinished = true;
                isDifferent = true;
              }
            } else {
              if (!c.finished) {
                const apiHomeScore = apiGame.home_score !== null && apiGame.home_score !== undefined && String(apiGame.home_score) !== 'null' && String(apiGame.home_score).trim() !== '' ? parseInt(apiGame.home_score) : null;
                const apiAwayScore = apiGame.away_score !== null && apiGame.away_score !== undefined && String(apiGame.away_score) !== 'null' && String(apiGame.away_score).trim() !== '' ? parseInt(apiGame.away_score) : null;
                
                if (apiHomeScore !== null && apiAwayScore !== null) {
                  if (c.home_score !== apiHomeScore || c.away_score !== apiAwayScore) {
                    nextHomeScore = apiHomeScore;
                    nextAwayScore = apiAwayScore;
                    isDifferent = true;
                  }
                } else {
                  if (c.home_score !== null || c.away_score !== null) {
                    nextHomeScore = null;
                    nextAwayScore = null;
                    isDifferent = true;
                  }
                }
              }
            }

            if (isDifferent) {
              updatedCount++;
              return {
                ...c,
                home_team: nextHomeTeam,
                away_team: nextAwayTeam,
                home_code: nextHomeCode,
                away_code: nextAwayCode,
                home_score: nextHomeScore,
                away_score: nextAwayScore,
                finished: nextFinished
              };
            }
          }
          return c;
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(nextConfs));
        }
        
        setToastMsg(`Sucesso! ${updatedCount} jogos atualizados localmente.`);
        await fetchData();
      } catch (err) {
        setToastMsg(`Erro no recálculo local: ${err.message}`);
        setToastType('error');
      }
      setTimeout(() => { setToastMsg(''); setToastType('success'); }, 4000);
      return;
    }
    
    try {
      const pass = USERS[currentUser];
      const res = await fetch('/api/admin/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, password: pass })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido');
      
      setToastMsg(`Sucesso! ${data.updatedCount} jogos atualizados.`);
      await fetchData(); // Atualiza a tela com os novos dados
    } catch (err) {
      setToastMsg(`Erro: ${err.message}`);
      setToastType('error');
    }
    
    setTimeout(() => { setToastMsg(''); setToastType('success'); }, 4000);
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
    if (currentUserRole === 'Moderador') {
      setEditError('🚫 Moderadores não têm permissão para editar palpites.');
      return;
    }
    const correctPass = USERS[currentUser];
    if (editPassword !== correctPass) { setEditError('Senha incorreta.'); return; }
    const bolao = boloes.find(b => b.id === editingBet.bolaoId);
    if (!bolao) return;
    const updatedBets = bolao.bets_data.map((bet, idx) =>
      idx === editingBet.betIndex ? { ...bet, bet_home: editingBet.home, bet_away: editingBet.away } : bet
    );
    try {
      const response = await fetch('/api/boloes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'editBet',
          username: currentUser,
          password: editPassword,
          bolaoId: editingBet.bolaoId,
          betsData: updatedBets
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast('Palpite editado!');
        setEditingBet(null);
        setEditPassword('');
        setEditError('');
        fetchData();
      } else {
        setEditError(data.error || 'Erro ao salvar palpite.');
      }
    } catch (err) {
      console.error(err);
      setEditError('Erro de conexão ao salvar palpite.');
    }
  };

  const confirmDeleteBolao = async () => {
    if (!currentUser) return;
    if (currentUserRole === 'Moderador') {
      setDeleteError('🚫 Moderadores não têm permissão para excluir bolões.');
      return;
    }
    const correctPass = USERS[currentUser];
    if (deletePassword !== correctPass) {
      setDeleteError('Senha incorreta. Tente novamente.');
      return;
    }
    try {
      const response = await fetch('/api/boloes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteBolao',
          username: currentUser,
          password: deletePassword,
          bolaoId: showDeleteModal.id
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast(`Bolão de ${showDeleteModal.bettor_name} excluído.`);
        setShowDeleteModal(null);
        setDeletePassword('');
        setDeleteError('');
        fetchData();
      } else {
        setDeleteError(data.error || 'Erro ao excluir.');
      }
    } catch (err) {
      console.error(err);
      setDeleteError('Erro de conexão ao excluir.');
    }
  };

  const handleApproveUser = async (userId, phaseField = 'approved') => {
    try {
      const password = localStorage.getItem('copa26_pass') || '';
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approveUser',
          username: currentUser,
          password,
          targetUserId: userId,
          phaseField
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast('Jogador aprovado com sucesso! ✅');
        fetchData();
      } else {
        alert(data.error || 'Erro ao aprovar jogador.');
      }
    } catch (e) {
      console.error('Erro ao aprovar jogador:', e);
    }
  };

  const handleRevokeUser = async (userId, phaseField = 'approved') => {
    try {
      const password = localStorage.getItem('copa26_pass') || '';
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revokeUser',
          username: currentUser,
          password,
          targetUserId: userId,
          phaseField
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast('Acesso suspenso! 🚫', 'error');
        fetchData();
      } else {
        alert(data.error || 'Erro ao suspender acesso.');
      }
    } catch (e) {
      console.error('Erro ao suspender acesso:', e);
    }
  };

  const getMatchesForStage = (stage) => {
    if (stage === 'r32') return confrontos.filter(m => m.id >= 73 && m.id <= 88);
    if (stage === 'r16') return confrontos.filter(m => m.id >= 89 && m.id <= 96);
    if (stage === 'qf') return confrontos.filter(m => m.id >= 97 && m.id <= 100);
    if (stage === 'sf') return confrontos.filter(m => m.id >= 101 && m.id <= 102);
    if (stage === 'final') return confrontos.filter(m => m.id >= 103 && m.id <= 104);
    return [];
  };

  const handleKnockoutScoreChange = (matchId, team, val) => {
    setKnockoutBets(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team]: val
      }
    }));
  };

  const startSaveKnockoutBets = () => {
    const knockoutMatches = getMatchesForStage(knockoutStage);
    
    // Check if any fields are empty
    const isInvalid = knockoutMatches.some(m => {
      const b = knockoutBets[m.id];
      return !b || b.home === undefined || b.away === undefined || b.home.trim() === '' || b.away.trim() === '';
    });

    if (isInvalid) {
      alert(`⚠️ Deixe nenhum campo em branco! Preencha todos os ${knockoutMatches.length} placares da fase selecionada para salvar.`);
      return;
    }

    const stageNames = {
      r32: '1/16',
      r16: 'Oitavas',
      qf: 'Quartas',
      sf: 'Semifinal',
      final: 'Finais'
    };
    const phaseLabel = stageNames[knockoutStage] || 'Mata-Mata';
    setKnockoutBettorName(`${currentUser} - ${phaseLabel}`);
    setShowBetConfirmation(true);
  };

  const executeSaveKnockoutBets = async () => {
    const finalBettorName = knockoutBettorName.trim() || `${currentUser} - Mata-Mata`;

    // Verify if name already exists (case-insensitive local check)
    const isDuplicateLocal = boloes.some(b => b.bettor_name && b.bettor_name.trim().toLowerCase() === finalBettorName.toLowerCase());
    if (isDuplicateLocal) {
      alert(`⚠️ Já existe uma aposta cadastrada com o nome "${finalBettorName}". Por favor, escolha outro nome ou identificador.`);
      return;
    }

    setShowBetConfirmation(false);
    setBettingLoading(true);
    setSaveFinished(false);
    setVideoEnded(false);

    try {
      const knockoutMatches = getMatchesForStage(knockoutStage);
      
      // Map to bets_data format for the boloes table
      const betsData = knockoutMatches.map(m => {
        const b = knockoutBets[m.id];
        return {
          match_id: m.id,
          home: m.home_team,
          away: m.away_team,
          bet_home: parseInt(b.home),
          bet_away: parseInt(b.away),
          real_home: m.home_score !== null && m.home_score !== undefined && String(m.home_score) !== 'null' ? parseInt(m.home_score) : null,
          real_away: m.away_score !== null && m.away_score !== undefined && String(m.away_score) !== 'null' ? parseInt(m.away_score) : null,
          pts: null
        };
      });

      if (sandboxMode) {
        // Save locally
        const localSbBolsRaw = localStorage.getItem('copa26_boloes_sandbox');
        let localSbBols = [];
        if (localSbBolsRaw) {
          try {
            localSbBols = JSON.parse(localSbBolsRaw);
          } catch (e) {
            console.error(e);
          }
        }

        const newBolao = {
          id: Date.now(),
          username: currentUser,
          bettor_name: finalBettorName,
          photo_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=375&auto=format&fit=crop',
          bets_data: betsData,
          created_at: new Date().toISOString()
        };

        localSbBols.push(newBolao);
        localStorage.setItem('copa26_boloes_sandbox', JSON.stringify(localSbBols));

        // Merge new local bolão to state
        setBoloes(prev => [...prev, newBolao]);
        setSaveFinished(true);
        return;
      }

      const password = localStorage.getItem('copa26_pass') || '';

      // Insert as a new bolão sheet via API
      const response = await fetch('/api/boloes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insertBolao',
          username: currentUser,
          password,
          bettorName: finalBettorName,
          photoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=375&auto=format&fit=crop',
          betsData,
          avatarUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=375&auto=format&fit=crop'
        })
      });
      
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao salvar bolão.');
      }

      // Reset user payment approval for this stage via API
      const stagesConfig = {
        r32: 'approved_r32',
        r16: 'approved_r16',
        qf: 'approved_qf',
        sf: 'approved_sf',
        final: 'approved_final'
      };
      const currentStageKey = stagesConfig[knockoutStage];
      if (currentStageKey) {
        await fetch('/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'revokeUser',
            username: currentUser,
            password,
            targetUserId: currentUserObj?.id,
            phaseField: currentStageKey
          })
        });
      }

      setSaveFinished(true);
      fetchData();
    } catch (err) {
      console.error(err);
      setBettingLoading(false);
      showToast(err.message || 'Erro ao salvar palpites.', 'error');
    }
  };

  // Get bet statistics for a specific match (by team name matching)
  const getMatchBetStats = (game) => {
    const results = [];
    const isLive = game.time_elapsed && game.time_elapsed !== 'notstarted' && game.time_elapsed !== 'finished' && game.finished !== 'TRUE' && game.finished !== true;
    const isFinished = game.finished === 'TRUE' || game.finished === true || game.time_elapsed === 'finished';
    const hasScore = isFinished || isLive;
    
    boloes.forEach(b => {
      if (!Array.isArray(b.bets_data)) return;
      const bet = b.bets_data.find(bd =>
        normalizeTeamName(bd.home) === normalizeTeamName(game.home_team_name_en) &&
        normalizeTeamName(bd.away) === normalizeTeamName(game.away_team_name_en)
      );
      if (bet) {
        const realHome = hasScore && game.home_score !== null && game.home_score !== undefined && String(game.home_score).trim() !== '' ? parseInt(game.home_score) : null;
        const realAway = hasScore && game.away_score !== null && game.away_score !== undefined && String(game.away_score).trim() !== '' ? parseInt(game.away_score) : null;
        let pts = 0;
        let exact = false;
        let correct = false;

        if (hasScore && realHome !== null && realAway !== null) {
          if (bet.bet_home === realHome && bet.bet_away === realAway) {
            pts = 5;
            exact = true;
          } else {
            const betWinner = bet.bet_home > bet.bet_away ? 'H' : bet.bet_home < bet.bet_away ? 'A' : 'D';
            const realWinner = realHome > realAway ? 'H' : realHome < realAway ? 'A' : 'D';
            if (betWinner === realWinner) {
              pts = 3;
              correct = true;
            }
          }
        }

        results.push({
          name: b.bettor_name,
          bet_home: bet.bet_home,
          bet_away: bet.bet_away,
          pts,
          exact,
          correct,
          isFinished,
          isLive
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
      const data = await performOcrScanApi(base64String, bettorNameInput);

      setWizardBettorName(data.bettor_name || bettorNameInput.trim() || 'Novo Apostador');
      setWizardBets(data.bets);
      setWizardActiveGroup('A');
      
      setShowCameraModal(false);
      setShowWizardModal(true);
    } catch (err) {
      console.error('Erro na leitura com IA:', err);
      alert(`Não foi possível ler a imagem com a IA: ${err.message || err}\n\nAbrindo o formulário em branco para preenchimento manual.`);
      
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
    setWizardBettorName(''); // Force user to type a real name
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

  // Handle photo edit for an existing bolão
  const handlePhotoFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setNewPhotoPreview(localUrl);
    try {
      const compressed = await compressImage(file);
      setNewPhotoBase64(compressed);
    } catch (err) {
      const reader = new FileReader();
      reader.onloadend = () => setNewPhotoBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const saveEditedPhoto = async () => {
    if (!editPhotoModal || !newPhotoBase64) return;
    setSavingPhoto(true);
    try {
      const password = localStorage.getItem('copa26_pass') || '';
      const response = await fetch('/api/boloes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'editPhoto',
          username: currentUser,
          password,
          bolaoId: editPhotoModal.bolaoId,
          avatarUrl: newPhotoBase64
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast('Foto atualizada com sucesso! ✅');
        setEditPhotoModal(null);
        setNewPhotoPreview(null);
        setNewPhotoBase64(null);
        fetchData();
      } else {
        alert(data.error || 'Erro ao salvar foto.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar foto.');
    } finally {
      setSavingPhoto(false);
    }
  };

  const saveEditedName = async () => {
    if (!editNameModal || !editNameInput.trim()) return;
    const trimmedNewName = editNameInput.trim();

    // Verify if name already exists in another sheet (local check)
    const isDuplicateLocal = boloes.some(b => 
      b.id !== editNameModal.bolaoId && 
      b.bettor_name && 
      b.bettor_name.trim().toLowerCase() === trimmedNewName.toLowerCase()
    );
    if (isDuplicateLocal) {
      alert(`⚠️ Já existe um apostador cadastrado com o nome "${trimmedNewName}". Por favor, escolha outro nome.`);
      return;
    }

    try {
      const password = localStorage.getItem('copa26_pass') || '';
      const response = await fetch('/api/boloes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'editName',
          username: currentUser,
          password,
          bolaoId: editNameModal.bolaoId,
          bettorName: trimmedNewName
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast('Nome atualizado com sucesso! ✅');
        setEditNameModal(null);
        setEditNameInput('');
        fetchData();
      } else {
        alert(data.error || 'Erro ao salvar nome.');
      }
    } catch (e) {
      console.error('Erro ao editar nome:', e);
      alert('Erro de conexão ao salvar nome.');
    }
  };

  const handleWizardScoreChange = (index, field, value) => {
    setWizardBets(prev => prev.map((bet, idx) => 
      idx === index ? { ...bet, [field]: value } : bet
    ));
  };

  const saveWizardBolao = async () => {
    const trimmedName = wizardBettorName.trim();
    if (!trimmedName) {
      alert('⚠️ Por favor, insira o nome do apostador antes de salvar.');
      return;
    }
    // Block generic placeholder names
    const forbiddenNames = ['novo apostador', 'apostador simulado', 'apostador desconhecido'];
    if (forbiddenNames.includes(trimmedName.toLowerCase())) {
      alert('⚠️ O nome "' + trimmedName + '" é inválido. Por favor, insira o nome real do apostador.');
      return;
    }

    // Verify if name already exists (case-insensitive local check)
    const isDuplicateLocal = boloes.some(b => b.bettor_name && b.bettor_name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicateLocal) {
      alert(`⚠️ Já existe um apostador cadastrado com o nome "${trimmedName}". Por favor, escolha outro nome para evitar duplicidade.`);
      return;
    }

    // Map wizardBets back to database format
    const finalBetsData = wizardBets.map(bet => {
      const match = confrontos.find(c => String(c.id) === String(bet.match_id)) || {};
      const rH = match.home_score !== null ? parseInt(match.home_score) : null;
      const aScoreVal = match.away_score;
      const rA = aScoreVal !== null ? parseInt(aScoreVal) : null;
      
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

    try {
      const password = localStorage.getItem('copa26_pass') || '';
      const response = await fetch('/api/boloes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insertBolao',
          username: currentUser,
          password,
          bettorName: trimmedName,
          photoUrl: photoToSave,
          betsData: finalBetsData,
          avatarUrl: photoToSave
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast('Bolão cadastrado com sucesso!');
        setShowWizardModal(false);
        fetchData();
      } else {
        alert(data.error || 'Erro ao salvar bolão.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar bolão.');
    }
  };

  const handleResetDatabase = async () => {
    const conf = window.confirm("⚠️ ATENÇÃO: Isso irá apagar TODOS os bolões cadastrados e palpites, e reiniciará os confrontos da Copa 2026 para o estado inicial correto (72 jogos). Deseja continuar?");
    if (!conf) return;

    try {
      setApiLoading(true);
      await resetDatabase();
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('copa26_confrontos_sandbox');
        localStorage.removeItem('copa26_palpites_sandbox');
        localStorage.removeItem('copa26_boloes_sandbox');
      }
      
      showToast('Banco de dados reiniciado com sucesso!');
      await fetchData();
    } catch (e) {
      alert('Erro ao reiniciar banco de dados.');
    } finally {
      setApiLoading(false);
    }
  };

  const handleRestoreConfrontosOnly = async () => {
    const conf = window.confirm("Deseja restaurar apenas as equipes e chaves originais dos confrontos? Os bolões cadastrados e seus palpites NÃO serão perdidos.");
    if (!conf) return;

    try {
      setApiLoading(true);
      
      // Update local storage
      if (typeof window !== 'undefined') {
        localStorage.setItem('copa26_confrontos', JSON.stringify(defaultConfrontos));
        if (sandboxMode) {
          localStorage.setItem('copa26_confrontos_sandbox', JSON.stringify(defaultConfrontos));
        }
      }

      // Update Supabase dynamically
      const isSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http') && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      if (isSupabase) {
        for (const c of defaultConfrontos) {
          const hScore = c.home_score !== null ? c.home_score : null;
          const aScore = c.away_score !== null ? c.away_score : null;
          
          const { error } = await supabase.from('confrontos')
            .update({
              home_team: c.home_team,
              home_code: c.home_code,
              away_team: c.away_team,
              away_code: c.away_code,
              home_score: hScore,
              away_score: aScore,
              finished: c.finished
            })
            .eq('id', c.id);
            
          if (error) throw error;
        }
      }

      showToast('Confrontos restaurados com sucesso! ✅');
      await fetchData();
    } catch (e) {
      console.error('Erro ao restaurar confrontos:', e);
      alert('Erro ao restaurar confrontos: ' + e.message);
    } finally {
      setApiLoading(false);
    }
  };

  // Generate ranking purely from real bolões in the database
  const getSortedRanking = (stage = 'all') => {
    if (stage === 'groups') {
      // Group stage is purely by Bolão card (cartelas individualizadas)
      const scoreMap = {};
      boloes.forEach(b => {
        const key = String(b.id);
        if (!scoreMap[key]) {
          scoreMap[key] = {
            id: b.id,
            name: b.bettor_name,
            avatar: b.avatar_url && b.avatar_url.startsWith('data:') ? b.avatar_url : `https://api.dicebear.com/7.x/identicon/svg?seed=${b.id}`,
            pts: 0
          };
        }
        const calculatedBets = getCalculatedBets(b.bets_data, confrontos);
        calculatedBets.forEach(bet => {
          if (bet.pts !== null && bet.pts !== undefined) {
            const matchId = parseInt(bet.match_id);
            if (matchId <= 72) {
              scoreMap[key].pts += bet.pts;
            }
          }
        });
      });
      const players = Object.values(scoreMap);
      return players.sort((a, b) => b.pts - a.pts).map((p, idx) => ({ ...p, rank: idx + 1 }));
    } else {
      // General and Knockout stages are calculated BY JOGADOR (registered users)
      const scoreMap = {};
      usersList.forEach(u => {
        const key = u.username.toLowerCase();
        if (!scoreMap[key]) {
          scoreMap[key] = {
            id: u.id,
            name: u.username,
            avatar: u.avatar_url && u.avatar_url.startsWith('data:') ? u.avatar_url : `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`,
            pts: 0
          };
        }
        
        // Find all bolões associated with this username
        const userBoloes = boloes.filter(b => b.username && b.username.toLowerCase() === key);
        userBoloes.forEach(b => {
          const calculatedBets = getCalculatedBets(b.bets_data, confrontos);
          calculatedBets.forEach(bet => {
            if (bet.pts !== null && bet.pts !== undefined) {
              const matchId = parseInt(bet.match_id);
              let include = false;
              if (stage === 'all') include = true;
              else if (stage === 'r32' && matchId >= 73 && matchId <= 88) include = true;
              else if (stage === 'r16' && matchId >= 89 && matchId <= 96) include = true;
              else if (stage === 'qf' && matchId >= 97 && matchId <= 100) include = true;
              else if (stage === 'sf' && matchId >= 101 && matchId <= 102) include = true;
              else if (stage === 'final' && matchId >= 103 && matchId <= 104) include = true;

              if (include) {
                scoreMap[key].pts += bet.pts;
              }
            }
          });
        });
      });
      const players = Object.values(scoreMap);
      return players.sort((a, b) => b.pts - a.pts).map((p, idx) => ({ ...p, rank: idx + 1 }));
    }
  };

  const assign3rdPlacedTeams = (qualified3rds) => {
    const spots = [
      { matchId: 74, groups: ['A', 'B', 'C', 'D', 'F'] },
      { matchId: 77, groups: ['C', 'D', 'F', 'G', 'H'] },
      { matchId: 79, groups: ['C', 'E', 'F', 'H', 'I'] },
      { matchId: 80, groups: ['E', 'H', 'I', 'J', 'K'] },
      { matchId: 81, groups: ['B', 'E', 'F', 'I', 'J'] },
      { matchId: 82, groups: ['A', 'E', 'H', 'I', 'J'] },
      { matchId: 85, groups: ['E', 'F', 'G', 'I', 'J'] },
      { matchId: 87, groups: ['D', 'E', 'I', 'J', 'L'] }
    ];

    const assignment = {};
    const usedTeams = new Set();

    function backtrack(spotIdx) {
      if (spotIdx === spots.length) return true;
      const spot = spots[spotIdx];
      for (let i = 0; i < qualified3rds.length; i++) {
        const team = qualified3rds[i];
        if (usedTeams.has(team.team)) continue;
        if (spot.groups.includes(team.group)) {
          assignment[spot.matchId] = team;
          usedTeams.add(team.team);
          if (backtrack(spotIdx + 1)) return true;
          delete assignment[spot.matchId];
          usedTeams.delete(team.team);
        }
      }
      return false;
    }

    if (!backtrack(0)) {
      const assigned = new Set();
      spots.forEach(spot => {
        let found = qualified3rds.find(t => !assigned.has(t.team) && spot.groups.includes(t.group));
        if (!found) {
          found = qualified3rds.find(t => !assigned.has(t.team));
        }
        if (found) {
          assignment[spot.matchId] = found;
          assigned.add(found.team);
        }
      });
    }

    return assignment;
  };

  const simulateMatchScores = (matchIds, confrontosList) => {
    return confrontosList.map(c => {
      if (matchIds.includes(c.id)) {
        const hasFinishedScore = c.finished && c.home_score !== null && c.away_score !== null;
        if (hasFinishedScore) return c;

        let hScore = Math.floor(Math.random() * 4);
        let aScore = Math.floor(Math.random() * 4);
        while (hScore === aScore) {
          hScore = Math.floor(Math.random() * 4);
          aScore = Math.floor(Math.random() * 4);
        }

        return {
          ...c,
          home_score: hScore,
          away_score: aScore,
          finished: true
        };
      }
      return c;
    });
  };

  const getMatchWinner = (match) => {
    if (!match) return 'A definir';
    if (match.home_score > match.away_score) return match.home_team;
    return match.away_team;
  };

  const getMatchLoser = (match) => {
    if (!match) return 'A definir';
    if (match.home_score < match.away_score) return match.home_team;
    return match.away_team;
  };

  const getCompleteConfs = (list) => {
    const allMatchesMap = {};
    defaultConfrontos.forEach(m => {
      allMatchesMap[m.id] = { ...m };
    });
    (list || []).forEach(m => {
      allMatchesMap[m.id] = { ...m };
    });
    return Object.values(allMatchesMap).sort((a, b) => a.id - b.id);
  };

  const simulateR32 = () => {
    const completeConfs = getCompleteConfs(confrontos);
    const standings = calculateGroupStandings(completeConfs);
    const winners = {};
    const runnersUp = {};
    const thirdPlaced = [];

    standings.forEach(g => {
      const gName = g.group;
      if (g.teams && g.teams.length >= 3) {
        winners[gName] = g.teams[0].team;
        runnersUp[gName] = g.teams[1].team;
        thirdPlaced.push({
          team: g.teams[2].team,
          group: gName,
          points: g.teams[2].points,
          goalDifference: g.teams[2].goalDifference,
          gf: g.teams[2].gf
        });
      }
    });

    if (Object.keys(winners).length < 12) {
      showToast('Grupos incompletos para emular a R32!', 'error');
      return;
    }

    thirdPlaced.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.localeCompare(b.team);
    });

    const qualified3rds = thirdPlaced.slice(0, 8);
    const assigned3rds = assign3rdPlacedTeams(qualified3rds);

    const nextConfs = completeConfs.map(m => {
      if (m.id >= 73 && m.id <= 88) {
        let home = m.home_team;
        let away = m.away_team;

        if (m.id === 73) home = runnersUp['A'];
        else if (m.id === 74) home = winners['E'];
        else if (m.id === 75) home = winners['F'];
        else if (m.id === 76) home = winners['C'];
        else if (m.id === 77) home = winners['I'];
        else if (m.id === 78) home = runnersUp['E'];
        else if (m.id === 79) home = winners['A'];
        else if (m.id === 80) home = winners['L'];
        else if (m.id === 81) home = winners['D'];
        else if (m.id === 82) home = winners['G'];
        else if (m.id === 83) home = runnersUp['K'];
        else if (m.id === 84) home = winners['H'];
        else if (m.id === 85) home = winners['B'];
        else if (m.id === 86) home = winners['J'];
        else if (m.id === 87) home = winners['K'];
        else if (m.id === 88) home = runnersUp['D'];

        if (m.id === 73) away = runnersUp['B'];
        else if (m.id === 74) away = assigned3rds[74]?.team || 'A definir';
        else if (m.id === 75) away = runnersUp['C'];
        else if (m.id === 76) away = runnersUp['F'];
        else if (m.id === 77) away = assigned3rds[77]?.team || 'A definir';
        else if (m.id === 78) away = runnersUp['I'];
        else if (m.id === 79) away = assigned3rds[79]?.team || 'A definir';
        else if (m.id === 80) away = assigned3rds[80]?.team || 'A definir';
        else if (m.id === 81) away = assigned3rds[81]?.team || 'A definir';
        else if (m.id === 82) away = assigned3rds[82]?.team || 'A definir';
        else if (m.id === 83) away = runnersUp['L'];
        else if (m.id === 84) away = runnersUp['J'];
        else if (m.id === 85) away = assigned3rds[85]?.team || 'A definir';
        else if (m.id === 86) away = runnersUp['H'];
        else if (m.id === 87) away = assigned3rds[87]?.team || 'A definir';
        else if (m.id === 88) away = runnersUp['G'];

        return {
          ...m,
          home_team: home || 'A definir',
          away_team: away || 'A definir',
          home_code: getFlagCode(home) || 'placeholder',
          away_code: getFlagCode(away) || 'placeholder',
          home_score: null,
          away_score: null,
          finished: false
        };
      } else if (m.id >= 89 && m.id <= 104) {
        let orig = defaultConfrontos.find(dc => dc.id === m.id);
        return {
          ...m,
          home_team: orig ? orig.home_team : m.home_team,
          away_team: orig ? orig.away_team : m.away_team,
          home_code: 'placeholder',
          away_code: 'placeholder',
          home_score: null,
          away_score: null,
          finished: false
        };
      }
      return m;
    });

    localStorage.setItem('copa26_confrontos_sandbox', JSON.stringify(nextConfs));
    setConfrontos(nextConfs);
    showToast('Fase de 1/16 de Final (R32) emulada com sucesso! 🧪');
  };

  const simulateR16 = () => {
    const completeConfs = getCompleteConfs(confrontos);
    const r32Ids = Array.from({ length: 16 }, (_, i) => 73 + i);
    let nextConfs = simulateMatchScores(r32Ids, completeConfs);

    const winners = {};
    r32Ids.forEach(id => {
      const m = nextConfs.find(c => c.id === id);
      winners[id] = getMatchWinner(m);
    });

    nextConfs = nextConfs.map(m => {
      if (m.id >= 89 && m.id <= 96) {
        let home = m.home_team;
        let away = m.away_team;

        if (m.id === 89) { home = winners[74]; away = winners[77]; }
        else if (m.id === 90) { home = winners[73]; away = winners[75]; }
        else if (m.id === 91) { home = winners[76]; away = winners[78]; }
        else if (m.id === 92) { home = winners[79]; away = winners[80]; }
        else if (m.id === 93) { home = winners[83]; away = winners[84]; }
        else if (m.id === 94) { home = winners[81]; away = winners[82]; }
        else if (m.id === 95) { home = winners[86]; away = winners[88]; }
        else if (m.id === 96) { home = winners[85]; away = winners[87]; }

        return {
          ...m,
          home_team: home || 'A definir',
          away_team: away || 'A definir',
          home_code: getFlagCode(home) || 'placeholder',
          away_code: getFlagCode(away) || 'placeholder',
          home_score: null,
          away_score: null,
          finished: false
        };
      } else if (m.id >= 97 && m.id <= 104) {
        let orig = defaultConfrontos.find(dc => dc.id === m.id);
        return {
          ...m,
          home_team: orig ? orig.home_team : m.home_team,
          away_team: orig ? orig.away_team : m.away_team,
          home_code: 'placeholder',
          away_code: 'placeholder',
          home_score: null,
          away_score: null,
          finished: false
        };
      }
      return m;
    });

    localStorage.setItem('copa26_confrontos_sandbox', JSON.stringify(nextConfs));
    setConfrontos(nextConfs);
    showToast('Fase Oitavas de Final emulada com sucesso! 🧪');
  };

  const simulateQF = () => {
    const completeConfs = getCompleteConfs(confrontos);
    const hasR32Teams = completeConfs.some(c => c.id >= 73 && c.id <= 88 && c.home_team !== 'Runner-up Group A' && c.home_team !== 'Winner Group E');
    if (!hasR32Teams) {
      showToast('Por favor, emule a Fase R32 primeiro!', 'error');
      return;
    }

    const r32Ids = Array.from({ length: 16 }, (_, i) => 73 + i);
    const r16Ids = Array.from({ length: 8 }, (_, i) => 89 + i);
    
    let nextConfs = simulateMatchScores(r32Ids, completeConfs);
    nextConfs = simulateMatchScores(r16Ids, nextConfs);

    const winners = {};
    r16Ids.forEach(id => {
      const m = nextConfs.find(c => c.id === id);
      winners[id] = getMatchWinner(m);
    });

    nextConfs = nextConfs.map(m => {
      if (m.id >= 97 && m.id <= 100) {
        let home = m.home_team;
        let away = m.away_team;

        if (m.id === 97) { home = winners[89]; away = winners[90]; }
        else if (m.id === 98) { home = winners[93]; away = winners[94]; }
        else if (m.id === 99) { home = winners[91]; away = winners[92]; }
        else if (m.id === 100) { home = winners[95]; away = winners[96]; }

        return {
          ...m,
          home_team: home || 'A definir',
          away_team: away || 'A definir',
          home_code: getFlagCode(home) || 'placeholder',
          away_code: getFlagCode(away) || 'placeholder',
          home_score: null,
          away_score: null,
          finished: false
        };
      } else if (m.id >= 101 && m.id <= 104) {
        let orig = defaultConfrontos.find(dc => dc.id === m.id);
        return {
          ...m,
          home_team: orig ? orig.home_team : m.home_team,
          away_team: orig ? orig.away_team : m.away_team,
          home_code: 'placeholder',
          away_code: 'placeholder',
          home_score: null,
          away_score: null,
          finished: false
        };
      }
      return m;
    });

    localStorage.setItem('copa26_confrontos_sandbox', JSON.stringify(nextConfs));
    setConfrontos(nextConfs);
    showToast('Fase Quartas de Final emulada com sucesso! 🧪');
  };

  const simulateSF = () => {
    const completeConfs = getCompleteConfs(confrontos);
    const hasR16Teams = completeConfs.some(c => c.id >= 89 && c.id <= 96 && !c.home_team.includes('Winner Match'));
    if (!hasR16Teams) {
      showToast('Por favor, emule a Fase Oitavas primeiro!', 'error');
      return;
    }

    const r32Ids = Array.from({ length: 16 }, (_, i) => 73 + i);
    const r16Ids = Array.from({ length: 8 }, (_, i) => 89 + i);
    const qfIds = Array.from({ length: 4 }, (_, i) => 97 + i);

    let nextConfs = simulateMatchScores(r32Ids, completeConfs);
    nextConfs = simulateMatchScores(r16Ids, nextConfs);
    nextConfs = simulateMatchScores(qfIds, nextConfs);

    const winners = {};
    qfIds.forEach(id => {
      const m = nextConfs.find(c => c.id === id);
      winners[id] = getMatchWinner(m);
    });

    nextConfs = nextConfs.map(m => {
      if (m.id >= 101 && m.id <= 102) {
        let home = m.home_team;
        let away = m.away_team;

        if (m.id === 101) { home = winners[97]; away = winners[98]; }
        else if (m.id === 102) { home = winners[99]; away = winners[100]; }

        return {
          ...m,
          home_team: home || 'A definir',
          away_team: away || 'A definir',
          home_code: getFlagCode(home) || 'placeholder',
          away_code: getFlagCode(away) || 'placeholder',
          home_score: null,
          away_score: null,
          finished: false
        };
      } else if (m.id >= 103 && m.id <= 104) {
        let orig = defaultConfrontos.find(dc => dc.id === m.id);
        return {
          ...m,
          home_team: orig ? orig.home_team : m.home_team,
          away_team: orig ? orig.away_team : m.away_team,
          home_code: 'placeholder',
          away_code: 'placeholder',
          home_score: null,
          away_score: null,
          finished: false
        };
      }
      return m;
    });

    localStorage.setItem('copa26_confrontos_sandbox', JSON.stringify(nextConfs));
    setConfrontos(nextConfs);
    showToast('Fase Semifinais emulada com sucesso! 🧪');
  };

  const simulateFinals = () => {
    const completeConfs = getCompleteConfs(confrontos);
    const hasQFTeams = completeConfs.some(c => c.id >= 97 && c.id <= 100 && !c.home_team.includes('Winner Match'));
    if (!hasQFTeams) {
      showToast('Por favor, emule a Fase Quartas primeiro!', 'error');
      return;
    }

    const r32Ids = Array.from({ length: 16 }, (_, i) => 73 + i);
    const r16Ids = Array.from({ length: 8 }, (_, i) => 89 + i);
    const qfIds = Array.from({ length: 4 }, (_, i) => 97 + i);
    const sfIds = Array.from({ length: 2 }, (_, i) => 101 + i);

    let nextConfs = simulateMatchScores(r32Ids, completeConfs);
    nextConfs = simulateMatchScores(r16Ids, nextConfs);
    nextConfs = simulateMatchScores(qfIds, nextConfs);
    nextConfs = simulateMatchScores(sfIds, nextConfs);

    const winners = {};
    const losers = {};
    sfIds.forEach(id => {
      const m = nextConfs.find(c => c.id === id);
      winners[id] = getMatchWinner(m);
      losers[id] = getMatchLoser(m);
    });

    nextConfs = nextConfs.map(m => {
      if (m.id === 103) {
        const home = losers[101];
        const away = losers[102];
        return {
          ...m,
          home_team: home || 'A definir',
          away_team: away || 'A definir',
          home_code: getFlagCode(home) || 'placeholder',
          away_code: getFlagCode(away) || 'placeholder',
          home_score: null,
          away_score: null,
          finished: false
        };
      } else if (m.id === 104) {
        const home = winners[101];
        const away = winners[102];
        return {
          ...m,
          home_team: home || 'A definir',
          away_team: away || 'A definir',
          home_code: getFlagCode(home) || 'placeholder',
          away_code: getFlagCode(away) || 'placeholder',
          home_score: null,
          away_score: null,
          finished: false
        };
      }
      return m;
    });

    nextConfs = simulateMatchScores([103, 104], nextConfs);

    localStorage.setItem('copa26_confrontos_sandbox', JSON.stringify(nextConfs));
    setConfrontos(nextConfs);
    showToast('Fase Final emulada com sucesso! O campeão foi definido. 🏆🧪');
  };

  const handleRankingClick = (item) => {
    if (rankingStage === 'groups') {
      const b = boloes.find(x => x.id === item.id);
      if (b) setShowRankingDetailsModal(b);
    } else {
      const u = usersList.find(x => x.id === item.id || x.username.toLowerCase() === item.name.toLowerCase());
      if (u) {
        setSelectedPlayerDetails(u);
        setActiveTab('detalhes_jogador');
      }
    }
  };

  const ranking = getSortedRanking(rankingStage);
  const top3 = ranking.slice(0, 3);
  const restRank = ranking.slice(3);

  const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  return (
    <div className="dashboard-container" style={{ 
      paddingTop: sandboxMode ? '100px' : '68px',
      paddingBottom: '5.5rem' 
    }}>
      {/* Fixed Header Wrapper */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        zIndex: 1000,
        background: '#0b0f19',
        boxSizing: 'border-box'
      }}>
        {/* Sandbox Warning Banner */}
        {sandboxMode && (
          <div style={{
            background: 'linear-gradient(90deg, #b45309 0%, #d97706 50%, #b45309 100%)',
            color: '#fff',
            textAlign: 'center',
            padding: '0.4rem 1rem',
            fontSize: '0.72rem',
            fontWeight: '900',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <span>🧪 Modo Sandbox Ativado (Testes Locais)</span>
            <button 
              onClick={() => {
                setSandboxMode(false);
                localStorage.removeItem('copa26_sandbox');
                localStorage.removeItem('copa26_confrontos_sandbox');
                fetchData();
                showToast('Modo Sandbox desativado.');
              }}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                padding: '2px 8px',
                fontSize: '0.62rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Sair
            </button>
          </div>
        )}
        {/* Header */}
        <header className="dashboard-header" style={{
          display: 'grid',
          gridTemplateColumns: '100px 1fr 100px',
          alignItems: 'center',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-color)',
          boxSizing: 'border-box',
          background: 'rgba(3, 16, 11, 0.95)',
          backdropFilter: 'blur(10px)'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start' }}>
          <div className="back-btn" onClick={() => router.push('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Icons.ChevronLeft size={24} style={{ color: '#D2A74F' }} />
          </div>
          <img src="/icons/logo-transparent.png" alt="Logo" style={{ width: '38px', height: '48px', objectFit: 'contain' }} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h2 style={{
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
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>
              EUA • MX • CAN
            </p>
            {isSupabaseConfigured ? (
              <span title="Nuvem Sincronizada" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)', boxShadow: '0 0 6px var(--accent-gold)' }}></span>
            ) : (
              <span title="Modo Demo: Salvo Localmente" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)', boxShadow: '0 0 6px var(--accent-gold)', animation: 'pulse 1.5s infinite' }}></span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
          {currentUser && (
            <div 
              onClick={() => {
                setTempAvatar(currentUserObj?.avatar_url || '');
                setTempStatus(currentUserObj?.status || '');
                setShowProfileModal(true);
              }}
              style={{
                cursor: 'pointer',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(225, 182, 79, 0.05)',
                transition: 'transform 0.2s'
              }}
              title="Meu Perfil"
            >
              {currentUserObj?.avatar_url ? (
                <img 
                  src={currentUserObj.avatar_url} 
                  alt="Avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <Icons.User size={18} style={{ color: '#D2A74F' }} />
              )}
            </div>
          )}
          {(currentUserObj?.campeao || boloes.find(b => b.username === currentUser)?.campeao || activeChampionObj) && (
            <img
              src={`https://flagcdn.com/w40/${(() => {
                const champ = currentUserObj?.campeao || boloes.find(b => b.username === currentUser)?.campeao;
                if (champ) {
                  return getFlagCode(champ);
                }
                return activeChampionObj?.flag || 'br';
              })()}.png`}
              alt="Tema"
              title={`Tema: ${activeChampionObj.nome}`}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
              }}
            />
          )}
          {allowDrawerMenu && (
            <button className="menu-toggle-btn" onClick={() => setIsDrawerOpen(true)}>
              <Icons.Menu size={20} style={{ color: 'var(--text-primary)' }} />
            </button>
          )}
        </div>
      </header>
    </div>

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

            {((currentUser && (currentUserRole === 'Admin' || currentUserRole === 'Moderador')) || mataMataPublic) && (
              <button
                className={`drawer-link ${activeTab === 'apostas_elim' ? 'active' : ''}`}
                onClick={() => { setActiveTab('apostas_elim'); setIsDrawerOpen(false); }}
                style={{ background: 'rgba(251,191,36,0.08)', borderLeft: '3px solid var(--accent-gold)' }}
              >
                <Icons.Trophy size={18} style={{ color: '#D2A74F' }} />
                <span style={{ color: '#D2A74F', fontWeight: 'bold' }}>Apostar Mata-mata</span>
              </button>
            )}

            {currentUser && (currentUserRole === 'Admin' || currentUserRole === 'Moderador') && (
              <button
                className={`drawer-link ${activeTab === 'gerenciar_usuarios' ? 'active' : ''}`}
                onClick={() => { setActiveTab('gerenciar_usuarios'); setIsDrawerOpen(false); }}
              >
                <Icons.List size={18} />
                <span>Gerenciar Usuários</span>
              </button>
            )}

            {currentUser && currentUserRole === 'Admin' && (
              <button
                className={`drawer-link ${activeTab === 'chaveamento' ? 'active' : ''}`}
                onClick={() => { setActiveTab('chaveamento'); setIsDrawerOpen(false); }}
              >
                <Icons.BarChart size={18} style={{ transform: 'rotate(90deg)' }} />
                <span>Chaveamento (Admin)</span>
              </button>
            )}

            {currentUser && currentUserRole === 'Admin' && (
              <button
                className={`drawer-link ${activeTab === 'configuracoes' ? 'active' : ''}`}
                onClick={() => { setActiveTab('configuracoes'); setIsDrawerOpen(false); }}
              >
                <Icons.Settings size={18} />
                <span>Configurações</span>
              </button>
            )}

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
                    <span style={{ fontSize: '0.7rem',  }} className="text-gold-gradient">Logado</span>
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
                        <span>{formatMatchDateSafe(match.match_date)} {match.match_time.slice(0, 5)}</span>
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
                            <Icons.Check size={14} style={{ color: '#D2A74F' }} />
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
              {currentUser && (currentUserRole === 'Admin' || currentUserRole === 'Moderador') && allowGroupUpload && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn-upload-bolao" onClick={startCameraUpload}>
                    <Icons.Camera size={14} />
                    Upar Bolão
                  </button>
                  <button className="btn-upload-bolao" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={startManualUpload}>
                    <Icons.Plus size={14} style={{ color: 'var(--text-primary)' }} />
                    Cadastrar Manualmente
                  </button>
                </div>
              )}
            </div>

            {/* Filtro do Tipo de Bolão */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => setBolaoTypeFilter('grupos')}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold',
                  background: bolaoTypeFilter === 'grupos' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
                  color: bolaoTypeFilter === 'grupos' ? '#000' : '#cbd5e1', border: 'none', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Fase de Grupos
              </button>
              <button
                onClick={() => setBolaoTypeFilter('matamata')}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold',
                  background: bolaoTypeFilter === 'matamata' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
                  color: bolaoTypeFilter === 'matamata' ? '#000' : '#cbd5e1', border: 'none', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Mata-Mata
              </button>
            </div>

            {/* Sub-filtro das Fases do Mata-Mata */}
            {bolaoTypeFilter === 'matamata' && (
              <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1rem', scrollbarWidth: 'none' }} className="no-scrollbar">
                {[
                  { id: 'r32', label: '1/16' },
                  { id: 'r16', label: 'Oitavas' },
                  { id: 'qf', label: 'Quartas' },
                  { id: 'sf', label: 'Semifinal' },
                  { id: 'final', label: 'Finais' }
                ].map(stage => (
                  <button
                    key={stage.id}
                    onClick={() => setSelectedKnockoutFilterStage(stage.id)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      border: selectedKnockoutFilterStage === stage.id ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.08)',
                      background: selectedKnockoutFilterStage === stage.id ? 'var(--accent-gold)' : 'transparent',
                      color: selectedKnockoutFilterStage === stage.id ? '#000' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(() => {
                const filteredBoloes = boloes.filter(b => {
                  const isKnockout = Array.isArray(b.bets_data) && b.bets_data.some(bd => 
                     bd.match_id >= 73 && 
                     bd.bet_home !== null && 
                     bd.bet_home !== undefined && 
                     String(bd.bet_home).trim() !== '' &&
                     bd.bet_away !== null && 
                     bd.bet_away !== undefined && 
                     String(bd.bet_away).trim() !== ''
                   );
                  if (bolaoTypeFilter !== 'matamata') return !isKnockout;
                  if (!isKnockout) return false;
                  
                  const ids = b.bets_data.map(bd => bd.match_id);
                  if (selectedKnockoutFilterStage === 'final') return ids.some(id => id >= 103);
                  if (selectedKnockoutFilterStage === 'sf') return ids.some(id => id >= 101 && id <= 102);
                  if (selectedKnockoutFilterStage === 'qf') return ids.some(id => id >= 97 && id <= 100);
                  if (selectedKnockoutFilterStage === 'r16') return ids.some(id => id >= 89 && id <= 96);
                  if (selectedKnockoutFilterStage === 'r32') return ids.some(id => id >= 73 && id <= 88);
                  
                  return true;
                });
                  filteredBoloes.sort((a, b) => {
                    if (currentUser && a.username === currentUser) return -1;
                    if (currentUser && b.username === currentUser) return 1;
                    return (a.bettor_name || '').localeCompare(b.bettor_name || '');
                  });

                
                if (filteredBoloes.length === 0) {
                  return (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '2rem 0' }}>
                      Nenhum bolão {bolaoTypeFilter === 'matamata' ? 'do mata-mata' : 'da fase de grupos'} cadastrado ainda.
                    </p>
                  );
                }
                
                return filteredBoloes.map(b => (
                  <div className="bolao-card" key={b.id}>
                    <div className="bolao-card-top">
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={b.avatar_url || (usersList && usersList.find(u => u.username === b.username)?.avatar_url) || `https://api.dicebear.com/7.x/identicon/svg?seed=${b.bettor_name}`}
                          className="bolao-avatar"
                          alt="avatar"
                          style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }}
                        />
                        {currentUser && currentUserRole === 'Admin' && (
                          <button
                            title="Editar foto de perfil"
                            onClick={() => { setEditPhotoModal({ bolaoId: b.id, bettorName: b.bettor_name, currentPhoto: b.avatar_url }); setNewPhotoPreview(null); setNewPhotoBase64(null); }}
                            style={{
                              position: 'absolute', bottom: '-2px', right: '-2px',
                              width: '18px', height: '18px', borderRadius: '50%',
                              background: 'var(--accent-gold)', border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '9px', lineHeight: 1
                            }}
                          >📷</button>
                        )}
                      </div>
                      <div className="bolao-details">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <h4>{b.bettor_name}</h4>
                          {currentUser && currentUserRole === 'Admin' && (
                            <button
                              title="Editar nome"
                              onClick={() => { setEditNameModal({ bolaoId: b.id, currentName: b.bettor_name }); setEditNameInput(b.bettor_name); }}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                        <span>Registrado por: {b.username}</span>
                      </div>
                    </div>
                    <div className="bolao-card-actions">
                      <button className="bolao-action-btn btn-view-photo" onClick={() => setShowPhotoModal(b.photo_url)}>
                        <Icons.Eye size={12} /> Ver Foto
                      </button>
                      <button className="bolao-action-btn btn-view-bets" onClick={() => setShowBetsModal(b)}>
                        <Icons.Trophy size={12} /> Palpites
                      </button>
                      {Array.isArray(b.bets_data) && b.bets_data.some(bd => bd.match_id >= 73) && (
                        <button 
                          className="bolao-action-btn" 
                          style={{ background: 'rgba(218,165,32,0.15)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)' }}
                          onClick={async () => {
                            showToast('Gerando recibo PDF...');
                            const mataMataBets = b.bets_data.filter(bd => bd.match_id >= 73);
                            await generatePDFReceipt(mataMataBets, b.bettor_name);
                            showToast('Comprovante PDF gerado com sucesso! 📄');
                          }}
                        >
                          <Icons.FileText size={12} /> PDF
                        </button>
                      )}
                      <button className="bolao-action-btn" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid #6366f1', color: '#818cf8' }}
                        onClick={() => setShowHistoryModal(b)}>
                        📊 Histórico
                      </button>
                      {currentUser === 'Jefferson' && (
                        <button className="bolao-action-btn" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', color: '#ef4444' }}
                          onClick={() => { setShowDeleteModal({ id: b.id, bettor_name: b.bettor_name }); setDeletePassword(''); setDeleteError(''); }}>
                          🗑️ Excluir
                        </button>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
          )
        )}

        {/* 3. Ranking */}
        {activeTab === 'ranking' && (
          <RankingTab
            ranking={ranking}
            rankingStage={rankingStage}
            setRankingStage={setRankingStage}
            handleRankingClick={handleRankingClick}
            shareRanking={shareRanking}
          />
        )}

        {activeTab === 'placares_geral' && (
          <MatchesTab
            mode="results"
            confrontos={confrontos}
            apiLive={apiLive}
            apiLoading={apiLoading}
            getFlagCode={getFlagCode}
            formatMatchDate={formatMatchDate}
            setShowMatchModal={setShowMatchModal}
            setMatchModalTab={setMatchModalTab}
          />
        )}

        {activeTab === 'confrontos_geral' && (
          <MatchesTab
            mode="upcoming"
            confrontos={confrontos}
            apiLoading={apiLoading}
            getFlagCode={getFlagCode}
            formatMatchDate={formatMatchDate}
            setShowMatchModal={setShowMatchModal}
            setMatchModalTab={setMatchModalTab}
          />
        )}

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
                  background: selectedGroup === g ? 'var(--accent-gold)' : 'rgba(255,255,255,0.08)',
                  color: selectedGroup === g ? '#000' : '#cbd5e1'
                }}>Grupo {g}</button>
              ))}
            </div>
            {confrontos.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1rem' }}>
  <div className="skeleton" style={{ height: '80px', width: '100%', borderRadius: '12px' }}></div>
  <div className="skeleton" style={{ height: '80px', width: '100%', borderRadius: '12px' }}></div>
  <div className="skeleton" style={{ height: '80px', width: '100%', borderRadius: '12px' }}></div>
</div>
            ) : (() => {
              const localGroups = calculateGroupStandings(confrontos);
              const groupData = localGroups.find(g => g.group === selectedGroup || g.name === selectedGroup);
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
                          <td style={{ padding: '0.6rem 0.3rem', color: idx < 2 ? 'var(--accent-gold)' : 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>{t.position ?? idx+1}º</td>
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
                          <td style={{ textAlign: 'center', padding: '0.6rem 0.3rem', fontWeight: '900', color: '#D2A74F' }}>{t.points ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* 7. Chaveamento da Copa (Admin Only / Test View) */}
        {activeTab === 'chaveamento' && currentUser && (
          <div className="tab-pane active" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: '#D2A74F' }}>Chaveamento da Copa 2026</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Visualização de testes dos confrontos de mata-mata. (Oculto para usuários finais) {sandboxMode && '🧪 [MODO SANDBOX ATIVO - Clique em qualquer jogo para simular resultado]'}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', padding: '1rem 0' }}>
              {/* Fase de 32 (16 avos) */}
              <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ textAlign: 'center', color: '#D2A74F', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.85rem' }}>16 avos (32 times)</h4>
                {confrontos.filter(c => c.grupo === 'R32').map(g => {
                  const hFlag = getFlagCode(g.home_team);
                  const aFlag = getFlagCode(g.away_team);
                  return (
                    <div 
                      key={g.id} 
                      onClick={() => { setShowMatchModal(g); setMatchModalTab(currentUserRole === 'Admin' && sandboxMode ? 'sandbox' : 'detalhes'); }}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.65rem' }}>
                        <span>Jogo #{g.id}</span>
                        <span>{formatMatchDateSafe(g.match_date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <img src={`https://flagcdn.com/w40/${hFlag}.png`} style={{ width: '16px', height: '12px', objectFit: 'cover', borderRadius: '2px' }} alt="" />
                          <span>{g.home_team}</span>
                        </div>
                        <span style={{ fontWeight: 'bold' }}>{g.home_score !== null ? g.home_score : '-'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <img src={`https://flagcdn.com/w40/${aFlag}.png`} style={{ width: '16px', height: '12px', objectFit: 'cover', borderRadius: '2px' }} alt="" />
                          <span>{g.away_team}</span>
                        </div>
                        <span style={{ fontWeight: 'bold' }}>{g.away_score !== null ? g.away_score : '-'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Oitavas */}
              <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '2rem', justifyContent: 'space-around' }}>
                <h4 style={{ textAlign: 'center', color: '#D2A74F', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.85rem' }}>Oitavas de Final</h4>
                {confrontos.filter(c => c.grupo === 'R16').map(g => {
                  const hFlag = getFlagCode(g.home_team);
                  const aFlag = getFlagCode(g.away_team);
                  return (
                    <div 
                      key={g.id} 
                      onClick={() => { setShowMatchModal(g); setMatchModalTab(currentUserRole === 'Admin' && sandboxMode ? 'sandbox' : 'detalhes'); }}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.65rem' }}>
                        <span>Jogo #{g.id}</span>
                        <span>{formatMatchDateSafe(g.match_date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <img src={`https://flagcdn.com/w40/${hFlag}.png`} style={{ width: '16px', height: '12px', objectFit: 'cover', borderRadius: '2px' }} alt="" />
                          <span>{g.home_team}</span>
                        </div>
                        <span style={{ fontWeight: 'bold' }}>{g.home_score !== null ? g.home_score : '-'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <img src={`https://flagcdn.com/w40/${aFlag}.png`} style={{ width: '16px', height: '12px', objectFit: 'cover', borderRadius: '2px' }} alt="" />
                          <span>{g.away_team}</span>
                        </div>
                        <span style={{ fontWeight: 'bold' }}>{g.away_score !== null ? g.away_score : '-'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quartas */}
              <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '4rem', justifyContent: 'space-around' }}>
                <h4 style={{ textAlign: 'center', color: '#D2A74F', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.85rem' }}>Quartas de Final</h4>
                {confrontos.filter(c => c.grupo === 'QF').map(g => {
                  const hFlag = getFlagCode(g.home_team);
                  const aFlag = getFlagCode(g.away_team);
                  return (
                    <div 
                      key={g.id} 
                      onClick={() => { setShowMatchModal(g); setMatchModalTab(currentUserRole === 'Admin' && sandboxMode ? 'sandbox' : 'detalhes'); }}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.65rem' }}>
                        <span>Jogo #{g.id}</span>
                        <span>{formatMatchDateSafe(g.match_date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <img src={`https://flagcdn.com/w40/${hFlag}.png`} style={{ width: '16px', height: '12px', objectFit: 'cover', borderRadius: '2px' }} alt="" />
                          <span>{g.home_team}</span>
                        </div>
                        <span style={{ fontWeight: 'bold' }}>{g.home_score !== null ? g.home_score : '-'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <img src={`https://flagcdn.com/w40/${aFlag}.png`} style={{ width: '16px', height: '12px', objectFit: 'cover', borderRadius: '2px' }} alt="" />
                          <span>{g.away_team}</span>
                        </div>
                        <span style={{ fontWeight: 'bold' }}>{g.away_score !== null ? g.away_score : '-'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Semifinais */}
              <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '8rem', justifyContent: 'space-around' }}>
                <h4 style={{ textAlign: 'center', color: '#D2A74F', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.85rem' }}>Semifinais</h4>
                {confrontos.filter(c => c.grupo === 'SF').map(g => {
                  const hFlag = getFlagCode(g.home_team);
                  const aFlag = getFlagCode(g.away_team);
                  return (
                    <div 
                      key={g.id} 
                      onClick={() => { setShowMatchModal(g); setMatchModalTab(currentUserRole === 'Admin' && sandboxMode ? 'sandbox' : 'detalhes'); }}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.65rem' }}>
                        <span>Jogo #{g.id}</span>
                        <span>{formatMatchDateSafe(g.match_date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <img src={`https://flagcdn.com/w40/${hFlag}.png`} style={{ width: '16px', height: '12px', objectFit: 'cover', borderRadius: '2px' }} alt="" />
                          <span>{g.home_team}</span>
                        </div>
                        <span style={{ fontWeight: 'bold' }}>{g.home_score !== null ? g.home_score : '-'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <img src={`https://flagcdn.com/w40/${aFlag}.png`} style={{ width: '16px', height: '12px', objectFit: 'cover', borderRadius: '2px' }} alt="" />
                          <span>{g.away_team}</span>
                        </div>
                        <span style={{ fontWeight: 'bold' }}>{g.away_score !== null ? g.away_score : '-'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Final e Terceiro Lugar */}
              <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '3rem', justifyContent: 'center' }}>
                <h4 style={{ textAlign: 'center', color: '#D2A74F', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '0.85rem' }}>Finais</h4>
                
                {/* Final */}
                {confrontos.filter(c => c.grupo === 'FINAL').map(g => {
                  const hFlag = getFlagCode(g.home_team);
                  const aFlag = getFlagCode(g.away_team);
                  return (
                    <div 
                      key={g.id} 
                      onClick={() => { setShowMatchModal(g); setMatchModalTab(currentUserRole === 'Admin' && sandboxMode ? 'sandbox' : 'detalhes'); }}
                      style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid var(--accent-gold)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(251, 191, 36, 0.1)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D2A74F', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.65rem' }}>
                        <span>FINAL (Jogo #{g.id})</span>
                        <span>{formatMatchDateSafe(g.match_date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <img src={`https://flagcdn.com/w40/${hFlag}.png`} style={{ width: '16px', height: '12px', objectFit: 'cover', borderRadius: '2px' }} alt="" />
                          <span>{g.home_team}</span>
                        </div>
                        <span>{g.home_score !== null ? g.home_score : '-'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between', marginTop: '0.25rem', fontWeight: 'bold' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <img src={`https://flagcdn.com/w40/${aFlag}.png`} style={{ width: '16px', height: '12px', objectFit: 'cover', borderRadius: '2px' }} alt="" />
                          <span>{g.away_team}</span>
                        </div>
                        <span>{g.away_score !== null ? g.away_score : '-'}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Terceiro Lugar */}
                {confrontos.filter(c => c.grupo === 'THIRD').map(g => {
                  const hFlag = getFlagCode(g.home_team);
                  const aFlag = getFlagCode(g.away_team);
                  return (
                    <div 
                      key={g.id} 
                      onClick={() => { setShowMatchModal(g); setMatchModalTab(currentUserRole === 'Admin' && sandboxMode ? 'sandbox' : 'detalhes'); }}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.75rem', marginTop: '2rem', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.65rem' }}>
                        <span>3º Lugar (Jogo #{g.id})</span>
                        <span>{formatMatchDateSafe(g.match_date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <img src={`https://flagcdn.com/w40/${hFlag}.png`} style={{ width: '16px', height: '12px', objectFit: 'cover', borderRadius: '2px' }} alt="" />
                          <span>{g.home_team}</span>
                        </div>
                        <span style={{ fontWeight: 'bold' }}>{g.home_score !== null ? g.home_score : '-'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <img src={`https://flagcdn.com/w40/${aFlag}.png`} style={{ width: '16px', height: '12px', objectFit: 'cover', borderRadius: '2px' }} alt="" />
                          <span>{g.away_team}</span>
                        </div>
                        <span style={{ fontWeight: 'bold' }}>{g.away_score !== null ? g.away_score : '-'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 8. Gerenciar Usuários (Admin / Moderador Only) */}
        {activeTab === 'gerenciar_usuarios' && currentUser && (currentUserRole === 'Admin' || currentUserRole === 'Moderador') && (
          <div className="tab-pane active" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem', color: 'var(--text-primary)' }}>Gerenciamento de Jogadores</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Aprove os novos cadastros dos jogadores que enviaram o comprovante PIX.
              </p>
            </div>

            <div style={{ overflowX: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              {(() => {
                const stages = [
                  { key: 'approved', label: 'Grupos', btnColor: 'linear-gradient(135deg, var(--accent-gold), #10b981)' },
                  { key: 'approved_r32', label: '1/16 Final', btnColor: 'linear-gradient(135deg, var(--accent-gold), #b8860b)' },
                  { key: 'approved_r16', label: 'Oitavas (1/8)', btnColor: 'linear-gradient(135deg, var(--accent-gold), #b8860b)' },
                  { key: 'approved_qf', label: 'Quartas (1/4)', btnColor: 'linear-gradient(135deg, var(--accent-gold), #b8860b)' },
                  { key: 'approved_sf', label: 'Semifinal', btnColor: 'linear-gradient(135deg, var(--accent-gold), #b8860b)' },
                  { key: 'approved_final', label: 'Final', btnColor: 'linear-gradient(135deg, var(--accent-gold), #b8860b)' }
                ];
                
                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', color: '#e2e8f0' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Usuário</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>WhatsApp</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Perfil</th>
                        {stages.map(s => (
                          <th key={s.key} style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{s.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            Nenhum jogador registrado no sistema.
                          </td>
                        </tr>
                      ) : (
                        usersList.map(u => (
                          <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{u.username}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {u.whatsapp ? (
                                <a
                                  href={`https://wa.me/${u.whatsapp.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#D2A74F', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  💬 {u.whatsapp}
                                </a>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)' }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 'bold',
                                background: u.role === 'Admin' ? 'rgba(251,191,36,0.15)' : u.role === 'Moderador' ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.08)',
                                color: u.role === 'Admin' ? 'var(--accent-gold)' : u.role === 'Moderador' ? '#60a5fa' : '#cbd5e1'
                              }}>
                                {u.role || 'Jogador'}
                              </span>
                            </td>
                            
                            {stages.map(s => {
                              const isApproved = u.role === 'Admin' || u.role === 'Moderador' || u[s.key];
                              return (
                                <td key={s.key} style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                    <span style={{
                                      padding: '0.1rem 0.4rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 'bold',
                                      background: isApproved ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                      color: isApproved ? 'var(--accent-gold)' : '#f87171'
                                    }}>
                                      {isApproved ? '✔ Pago' : '⏳ Pendente'}
                                    </span>
                                    {u.role === 'Jogador' && (
                                      !u[s.key] ? (
                                        <button
                                          onClick={() => handleApproveUser(u.id, s.key)}
                                          style={{
                                            padding: '0.25rem 0.5rem', borderRadius: '4px', border: 'none',
                                            background: s.btnColor,
                                            color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.65rem', marginTop: '0.2rem'
                                          }}
                                        >
                                          Liberar
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleRevokeUser(u.id, s.key)}
                                          style={{
                                            padding: '0.25rem 0.5rem', borderRadius: '4px', border: 'none',
                                            background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444',
                                            color: '#f87171', cursor: 'pointer', fontSize: '0.65rem', marginTop: '0.2rem'
                                          }}
                                        >
                                          Bloquear
                                        </button>
                                      )
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Seção de Conciliação de Bolões */}
            <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem', color: 'var(--text-primary)' }}>Conciliar Bolões com Usuários</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Associe as cartelas de bolão digitalizadas aos usuários jogadores cadastrados para que as apostas apareçam no perfil deles.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {boloes.map((b) => (
                  <div key={b.id} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{b.bettor_name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Associado ao perfil: <strong className="text-gold-gradient" style={{  }}>{b.username || 'Nenhum'}</strong>
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <select
                        value={b.username || ''}
                        onChange={async (e) => {
                          const target = e.target.value === '' ? null : e.target.value;
                          try {
                            if (!isSupabaseConfigured) {
                              await supabase.from('boloes').update({ username: target }).eq('id', b.id);
                              setToastMsg(`Bolão de ${b.bettor_name} associado a ${target || 'Ninguém'}!`);
                              setToastType('success');
                              fetchData();
                            } else {
                              const res = await fetch('/api/usuarios', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'linkBolao',
                                  username: currentUser,
                                  password: localStorage.getItem('copa26_pass'),
                                  bolaoId: b.id,
                                  targetUsername: target
                                })
                              });
                              if (res.ok) {
                                setToastMsg(`Bolão de ${b.bettor_name} associado a ${target || 'Ninguém'}!`);
                                setToastType('success');
                                fetchData();
                              } else {
                                const err = await res.json();
                                alert('Erro ao associar: ' + err.error);
                              }
                            }
                          } catch (err) {
                            console.error(err);
                            alert('Erro ao associar: ' + err.message);
                          }
                        }}
                        style={{
                          background: '#111827',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '0.45rem 0.75rem',
                          fontSize: '0.78rem'
                        }}
                      >
                        <option value="">-- Sem Jogador --</option>
                        {usersList.map((u) => (
                          <option key={u.id} value={u.username}>{u.username}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 8. Configurações (Admin Only) */}
        {activeTab === 'configuracoes' && currentUser && currentUserRole === 'Admin' && (
          <SettingsTab
            handleRecalcular={handleRecalcular}
            mataMataPublic={mataMataPublic} setMataMataPublic={setMataMataPublic}
            allowRegister={allowRegister} setAllowRegister={setAllowRegister}
            allowGroupUpload={allowGroupUpload} setAllowGroupUpload={setAllowGroupUpload}
            allowDrawerMenu={allowDrawerMenu} setAllowDrawerMenu={setAllowDrawerMenu}
            paquetaTitle={paquetaTitle} setPaquetaTitle={setPaquetaTitle}
            paquetaBody={paquetaBody} setPaquetaBody={setPaquetaBody}
            handleRestoreConfrontosOnly={handleRestoreConfrontosOnly}
            handleResetDatabase={handleResetDatabase}
            setActiveTab={setActiveTab}
            currentUser={currentUser}
            showToast={showToast}
            sandboxMode={sandboxMode} setSandboxMode={setSandboxMode}
            fetchData={fetchData} confrontos={confrontos}
          />
        )}

        {activeTab === 'apostas_elim' && (() => {
          if (!currentUser) {
            return (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
                <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.05rem' }}>Login necessário</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '1.5rem' }}>
                  Faça login ou crie sua conta para registrar palpites no Mata-Mata.
                </span>
                <button className="btn-submit" style={{ maxWidth: '220px', margin: '0 auto' }} onClick={() => router.push('/')}>
                  Ir para Login
                </button>
              </div>
            );
          }

          const stagesConfig = {
            r32: { label: '1/16 de Final', key: 'approved_r32', text: '1/16 de Final (32 avos)', name: '1/16 de Final' },
            r16: { label: 'Oitavas', key: 'approved_r16', text: 'Oitavas de Final', name: 'Oitavas de Final' },
            qf: { label: 'Quartas', key: 'approved_qf', text: 'Quartas de Final', name: 'Quartas de Final' },
            sf: { label: 'Semifinal', key: 'approved_sf', text: 'Semifinais', name: 'Semifinais' },
            final: { label: 'Final', key: 'approved_final', text: 'Final e 3º Lugar', name: 'Finais' }
          };

          const activeStageConfig = stagesConfig[knockoutStage] || stagesConfig.r32;
          const isApprovedForActiveStage = currentUserRole === 'Admin' || (currentUserObj && currentUserObj[activeStageConfig.key]) || sandboxMode;
          const isUserAdminOrMod = currentUserRole === 'Admin' || currentUserRole === 'Moderador';
          if (!mataMataPublic && !isUserAdminOrMod && !sandboxMode) {
            return (
              <div className="tab-pane active" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(31,41,55,0.7) 0%, rgba(17,24,39,0.9) 100%)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: '20px',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  maxWidth: '500px',
                  margin: '3rem auto',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1.25rem' }}>⏳</div>
                  <h3 style={{ fontSize: '1.3rem', marginBottom: '0.85rem', color: '#D2A74F', fontWeight: 'bold' }}>
                    Fase de Grupos em Andamento
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                    Ainda estamos na Fase de Grupos. Os palpites do Mata-Mata serão liberados em breve pelo Administrador!
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div className="tab-pane active" style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem', color: '#D2A74F' }}>Apostas do Mata-Mata</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Defina seus palpites para as fases decisivas da Copa 2026. Cada fase requer liberação/pagamento individual.
                </p>
              </div>

              {/* Seletor de Fases do Mata-Mata */}
              <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.8rem', marginBottom: '1.25rem', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                {Object.keys(stagesConfig).map(stageKey => {
                  const s = stagesConfig[stageKey];
                  const isStageApproved = currentUserRole === 'Admin' || (currentUserObj && currentUserObj[s.key]);
                  return (
                    <button
                      key={stageKey}
                      onClick={() => setKnockoutStage(stageKey)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        background: knockoutStage === stageKey ? 'var(--accent-gold)' : 'rgba(255,255,255,0.08)',
                        color: knockoutStage === stageKey ? '#000' : '#cbd5e1',
                        transition: 'all 0.2s',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <span>{s.label}</span>
                      <span>{isStageApproved ? '🟢' : '🔒'}</span>
                    </button>
                  );
                })}
              </div>

              {sandboxMode && (
                <div style={{
                  background: 'rgba(210, 167, 79, 0.05)',
                  border: '1px dashed var(--accent-gold)',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  animation: 'fadeIn 0.3s ease-out'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>🧪 Modo Sandbox Ativo</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      {knockoutStage === 'r32' 
                        ? 'Simula a fase 1/16 de Final seguindo a classificação atual dos grupos.' 
                        : `Simula de forma aleatória os resultados da fase anterior e traz os vencedores para a fase de ${activeStageConfig.label}.`}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      if (knockoutStage === 'r32') simulateR32();
                      else if (knockoutStage === 'r16') simulateR16();
                      else if (knockoutStage === 'qf') simulateQF();
                      else if (knockoutStage === 'sf') simulateSF();
                      else if (knockoutStage === 'final') simulateFinals();
                    }}
                    style={{
                      background: 'var(--accent-gold)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 10px rgba(210, 167, 79, 0.2)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    ⚡ Simular Confrontos
                  </button>
                </div>
              )}

              {!isApprovedForActiveStage ? (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(31,41,55,0.7) 0%, rgba(17,24,39,0.9) 100%)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: '20px',
                  padding: '2.5rem 2rem',
                  textAlign: 'center',
                  maxWidth: '500px',
                  margin: '2rem auto',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
                }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>🔒</div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.85rem', color: '#D2A74F', fontWeight: 'bold' }}>
                    Área Bloqueada - Taxa de Inscrição {activeStageConfig.name}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1rem' }}>
                    Para liberar seus palpites para a fase de <strong>{activeStageConfig.text}</strong>, faça o pagamento da taxa adicional desta etapa e envie o comprovante Pix para o Junior.
                  </p>
                  <p style={{ fontSize: '0.78rem', color: '#D2A74F', background: 'rgba(251,191,36,0.08)', border: '1px dashed rgba(251,191,36,0.3)', padding: '0.75rem', borderRadius: '10px', marginTop: '0.2rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                    ⚠️ <strong>Nota:</strong> Cada PIX concede o direito a apenas um envio. Se você já realizou uma aposta para esta fase e deseja enviar outra, realize outro pagamento e solicite a liberação ao Administrador.
                  </p>

                  <div style={{
                    background: 'var(--bg-card)',
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
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>+55 22 99797-3476 📋 (Copiar)</strong>
                  </div>

                  <a
                    href={`https://wa.me/5522997973476?text=Ol%C3%A1%20Junior%2C%20realizei%20o%20pagamento%20da%20taxa%20para%20liberar%20minhas%20apostas%20da%20fase%20de%20${encodeURIComponent(activeStageConfig.name)}%20no%20Bol%C3%A3o%20Copa%202026.%20Meu%20usu%C3%A1rio%20%C3%A9%20%22${currentUser}%22.%20Segue%20o%20comprovante%20PIX!`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      background: '#25D366', color: 'var(--text-primary)', padding: '0.85rem', borderRadius: '12px',
                      fontWeight: 'bold', textDecoration: 'none', fontSize: '0.92rem',
                      boxShadow: '0 4px 12px rgba(37,211,102,0.3)'
                    }}
                  >
                    <span>💬 Enviar Comprovante no WhatsApp</span>
                  </a>
                </div>
              ) : (() => {
                const knockoutMatches = getMatchesForStage(knockoutStage);
                if (knockoutMatches.length === 0) {
                  return (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                      Nenhum confronto disponível para esta fase no momento.
                    </p>
                  );
                }

                const phases = [
                  { title: `${activeStageConfig.text} (${knockoutMatches.length} Jogos)`, matches: knockoutMatches }
                ];

                // Count total predicted so far
                const filledCount = knockoutMatches.filter(m => {
                  const b = knockoutBets[m.id];
                  return b && b.home !== undefined && b.away !== undefined && b.home.trim() !== '' && b.away.trim() !== '';
                }).length;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '80px' }}>
                    {phases.map(phase => {
                      if (phase.matches.length === 0) return null;
                      return (
                        <div key={phase.title}>
                          <h4 style={{
                            color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)',
                            paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem',
                            fontWeight: 'bold', display: 'flex', justifyContent: 'space-between'
                          }}>
                            <span>⚽ {phase.title}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{phase.matches.length} Jogos</span>
                          </h4>

                          <div className="matchup-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {phase.matches.map(match => {
                              const bHome = knockoutBets[match.id]?.home || '';
                              const bAway = knockoutBets[match.id]?.away || '';
                              const homeFlag = getFlagCode(match.home_team) || 'placeholder';
                              const awayFlag = getFlagCode(match.away_team) || 'placeholder';
                              const saved = palpites[match.id]?.saved || false;

                              return (
                                <div className="matchup-card" key={match.id} style={{
                                  background: saved ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
                                  border: `1px solid ${saved ? 'rgba(16,185,129,0.25)' : 'var(--border-color)'}`
                                }}>
                                  <div className="matchup-meta">
                                    <span>Jogo #{match.id} • {match.stadium}</span>
                                    <span>{formatMatchDateSafe(match.match_date)} {match.match_time.slice(0, 5)}</span>
                                  </div>
                                  <div className="matchup-teams-row">
                                    <div className="matchup-team-item">
                                      <img src={`https://flagcdn.com/w80/${homeFlag}.png`} className="team-flag" alt={match.home_team} />
                                      <span>{match.home_team}</span>
                                    </div>

                                    <div className="matchup-scores-center">
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        min="0"
                                        className="score-field"
                                        value={bHome}
                                        onChange={(e) => handleKnockoutScoreChange(match.id, 'home', e.target.value)}
                                        placeholder="-"
                                        style={{ width: '48px', height: '40px', fontSize: '1rem' }}
                                      />
                                      <span className="score-sep">x</span>
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        min="0"
                                        className="score-field"
                                        value={bAway}
                                        onChange={(e) => handleKnockoutScoreChange(match.id, 'away', e.target.value)}
                                        placeholder="-"
                                        style={{ width: '48px', height: '40px', fontSize: '1rem' }}
                                      />
                                    </div>

                                    <div className="matchup-team-item">
                                      <img src={`https://flagcdn.com/w80/${awayFlag}.png`} className="team-flag" alt={match.away_team} />
                                      <span>{match.away_team}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Sticky Footer Bar with submit button */}
                    <div style={{
                      position: 'fixed',
                      bottom: '5.2rem',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '100%',
                      maxWidth: '480px',
                      padding: '0 1rem',
                      boxSizing: 'border-box',
                      zIndex: 90,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none'
                    }}>
                      <div style={{
                        width: '100%',
                        background: 'rgba(17,24,39,0.95)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px',
                        padding: '0.85rem 1.25rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        pointerEvents: 'auto'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Palpites Preenchidos</span>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{filledCount} / {knockoutMatches.length} Jogos</strong>
                        </div>

                        <button
                          onClick={startSaveKnockoutBets}
                          style={{
                            background: 'linear-gradient(135deg, var(--accent-gold), #b8860b)',
                            border: 'none', borderRadius: '10px',
                            color: '#000', fontWeight: '800',
                            padding: '0.65rem 1.25rem', fontSize: '0.82rem',
                            cursor: 'pointer', boxShadow: '0 4px 15px rgba(218,165,32,0.3)',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          💾 SALVAR APOSTAS
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {activeTab === 'jogadores' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#D2A74F', margin: '0 0 0.25rem 0' }}>🏃 JOGADORES CADASTRADOS</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                Toque em um jogador para ver seus palpites e a seleção campeã escolhida.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {usersList.map((player) => {
                // Find if the player has a bolão
                const playerBolao = boloes.find(b => b.username && b.username.toLowerCase() === player.username.toLowerCase());
                return (
                  <div
                    key={player.id}
                    onClick={() => {
                      setSelectedPlayerDetails(player);
                      setActiveTab('detalhes_jogador');
                    }}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        background: 'rgba(251, 191, 36, 0.06)',
                        borderRadius: '50%',
                        width: '42px',
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        border: player.avatar_url ? '1px solid var(--accent-gold)' : 'none'
                      }}>
                        {player.avatar_url ? (
                          <img src={player.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        ) : (
                          <Icons.User size={20} style={{ color: '#D2A74F' }} />
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{player.username}</span>
                        {player.campeao ? (
                          <span style={{ fontSize: '0.7rem', color: '#D2A74F', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <img 
                              src={`https://flagcdn.com/w40/${Object.values(CHAMPIONS).find(t => t.nome === player.campeao)?.flag || 'br'}.png`} 
                              style={{ width: '14px', borderRadius: '2px' }} 
                              alt={player.campeao} 
                            />
                            🏆 Campeão: <strong>{player.campeao}</strong>
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Sem palpite de campeão</span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {playerBolao ? (
                        <span style={{ fontSize: '0.68rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '999px', fontWeight: 'bold' }}>
                          Palpites Ativos
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', background: 'var(--bg-card)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '999px' }}>
                          Sem Palpites
                        </span>
                      )}
                      <Icons.ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  </div>
                );
              })}

              {usersList.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Carregando lista de jogadores...
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'detalhes_jogador' && selectedPlayerDetails && (() => {
          const player = selectedPlayerDetails;
          // Find all bolões linked to this player
          const playerBoloes = boloes.filter(b => b.username && b.username.toLowerCase() === player.username.toLowerCase());
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease-out' }}>
              
              {/* Top back button header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => { setActiveTab('jogadores'); setSelectedPlayerDetails(null); }}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <Icons.ChevronLeft size={20} />
                </button>
                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Voltar para Jogadores</span>
              </div>

              {/* Profile Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ position: 'relative' }}>
                  {player.avatar_url ? (
                    <img src={player.avatar_url} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-gold)' }} alt="" />
                  ) : (
                    <div style={{
                      background: 'linear-gradient(135deg, var(--accent-gold), #b8860b)',
                      borderRadius: '50%',
                      width: '80px',
                      height: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                      color: '#000',
                      fontWeight: 'bold',
                      border: '3px solid rgba(255,255,255,0.1)'
                    }}>
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{player.username}</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{player.role || 'Jogador'}</span>
                </div>

                {player.status && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '10px', margin: 0, maxWidth: '280px' }}>
                    "{player.status}"
                  </p>
                )}

                {player.campeao ? (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(184,134,11,0.05))',
                    border: '1px solid rgba(251,191,36,0.3)',
                    borderRadius: '12px',
                    padding: '0.6rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.25rem'
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>🏆</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#D2A74F', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      Campeão Escolhido: 
                      <img 
                        src={`https://flagcdn.com/w40/${Object.values(CHAMPIONS).find(t => t.nome === player.campeao)?.flag || 'br'}.png`} 
                        style={{ width: '16px', borderRadius: '2px' }} 
                        alt={player.campeao} 
                      />
                      <strong style={{ color: 'var(--text-primary)' }}>{player.campeao}</strong>
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Sem palpite de Campeão ainda</span>
                )}
              </div>

              {/* Accordion Sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                
                {/* 1. FASE DE GRUPOS */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedSection(expandedSection === 'grupos' ? null : 'grupos')}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      ⚽ FASE DE GRUPOS 
                      <span style={{ fontSize: '0.7rem', padding: '1px 6px', background: 'var(--bg-card-hover)', borderRadius: '10px', color: 'var(--text-secondary)' }}>
                        {playerBoloes.filter(b => !b.bets_data || !b.bets_data.some(bd => bd.match_id >= 73)).length} cartela(s)
                      </span>
                    </span>
                    <Icons.ChevronRight size={18} style={{ color: 'var(--text-secondary)', transform: expandedSection === 'grupos' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  {expandedSection === 'grupos' && (
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                      {playerBoloes.filter(b => !b.bets_data || !b.bets_data.some(bd => bd.match_id >= 73)).map((bol, bIdx) => {
                        const isExpanded = expandedBoloesList.includes(bol.id);
                        const calcBets = getCalculatedBets(bol.bets_data, confrontos);
                        return (
                          <div key={bol.id} style={{ 
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            background: 'var(--bg-card)',
                            overflow: 'hidden'
                          }}>
                            <div 
                              onClick={() => {
                                setExpandedBoloesList(prev => 
                                  prev.includes(bol.id) 
                                    ? prev.filter(id => id !== bol.id) 
                                    : [...prev, bol.id]
                                );
                              }}
                              style={{ 
                                fontSize: '0.78rem', 
                                fontWeight: 'bold', 
                                color: '#D2A74F', 
                                padding: '0.75rem 1rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                background: 'rgba(255, 255, 255, 0.03)'
                              }}
                            >
                              <span>📋 {bol.bettor_name || 'Sem Nome'}</span>
                              <Icons.ChevronRight size={16} style={{ 
                                color: 'var(--text-secondary)', 
                                transform: isExpanded ? 'rotate(90deg)' : 'none', 
                                transition: 'transform 0.2s' 
                              }} />
                            </div>
                            {isExpanded && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                                {calcBets.map((bet, idx) => (
                                  <div key={idx} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.5rem 0.75rem', borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)'
                                  }}>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{bet.home} x {bet.away}</span>
                                    <div style={{ textAlign: 'right' }}>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#D2A74F' }}>
                                        Aposta: {bet.bet_home} - {bet.bet_away}
                                      </span>
                                      {bet.real_home !== null && (
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>
                                          Oficial: {bet.real_home} - {bet.real_away} (+{bet.pts} pts)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {playerBoloes.filter(b => !b.bets_data || !b.bets_data.some(bd => bd.match_id >= 73)).length === 0 && (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, padding: '1rem' }}>
                          Nenhuma cartela da Fase de Grupos conciliada com este jogador.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. MATA-MATA */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedSection(expandedSection === 'matamata' ? null : 'matamata')}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🏆 PALPITES DO MATA-MATA
                    </span>
                    <Icons.ChevronRight size={18} style={{ color: 'var(--text-secondary)', transform: expandedSection === 'matamata' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  {expandedSection === 'matamata' && (
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                      {(() => {
                        const koConfs = confrontos.filter(c => c.grupo === 'R32' || c.grupo === 'R16' || c.grupo === 'QF' || c.grupo === 'SF' || c.grupo === 'FINAL' || c.grupo === 'THIRD');
                        return (
                          <KnockoutBetsList 
                            playerUsername={player.username} 
                            koConfs={koConfs} 
                            boloes={boloes}
                            currentUser={currentUser}
                            currentUserRole={currentUserRole}
                            mataMataPublic={mataMataPublic}
                            expandedBoloesList={expandedBoloesList}
                            setExpandedBoloesList={setExpandedBoloesList}
                          />
                        );
                      })()}
                    </div>
                  )}
                </div>

              </div>

            </div>
          );
        })()}
      </main>

      {/* --- MODALS --- */}

      {/* Modal de Editar Perfil */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Editar Meu Perfil</h3>
              <div onClick={() => setShowProfileModal(false)} className="modal-close">
                <Icons.X size={20} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
              
              {/* Avatar Preview & Upload */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ position: 'relative' }}>
                  {tempAvatar ? (
                    <img 
                      src={tempAvatar} 
                      style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-gold)' }} 
                      alt="Preview" 
                    />
                  ) : (
                    <div style={{
                      background: 'linear-gradient(135deg, var(--accent-gold), #b8860b)',
                      borderRadius: '50%',
                      width: '90px',
                      height: '90px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.5rem',
                      color: '#000',
                      fontWeight: 'bold',
                      border: '3px solid rgba(255,255,255,0.1)'
                    }}>
                      {currentUser?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <label htmlFor="avatar-upload" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 1rem', background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)', borderRadius: '8px',
                  color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer'
                }}>
                  📷 Alterar Foto de Perfil
                </label>
                <input 
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const compressed = await compressImage(file, 256, 256);
                        setTempAvatar(compressed);
                      } catch (err) {
                        setToastMsg('Erro ao processar imagem.');
                        setToastType('error');
                      }
                    }
                  }}
                />
              </div>

              {/* Status input */}
              <div className="form-group">
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status / Frase Marcante</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="O que você está pensando?"
                  maxLength={150}
                  value={tempStatus}
                  onChange={(e) => setTempStatus(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <button 
                className="btn-submit"
                onClick={async () => {
                  try {
                    if (!isSupabaseConfigured) {
                      const { error } = await supabase.from('usuarios').update({ 
                        avatar_url: tempAvatar, 
                        status: tempStatus 
                      }).eq('username', currentUser);
                      if (error) throw new Error(error);
                    } else {
                      const userPass = localStorage.getItem('copa26_pass');
                      const res = await fetch('/api/usuarios', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'updateProfile',
                          username: currentUser,
                          password: userPass,
                          avatarUrl: tempAvatar,
                          statusMsg: tempStatus
                        })
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        throw new Error(data.error || 'Erro ao atualizar perfil');
                      }
                    }
                    
                    // Update local state
                    if (currentUserObj) {
                      setCurrentUserObj({
                        ...currentUserObj,
                        avatar_url: tempAvatar,
                        status: tempStatus
                      });
                    }
                    
                    setToastMsg('Perfil atualizado com sucesso!');
                    setToastType('success');
                    setShowProfileModal(false);
                    fetchData(); // Reload list to update other parts of page
                  } catch (err) {
                    setToastMsg(err.message || 'Erro ao salvar alterações.');
                    setToastType('error');
                  }
                }}
              >
                Salvar Perfil
              </button>

            </div>
          </div>
        </div>
      )}

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
                  borderRadius: '8px', color: '#D2A74F', fontWeight: '700', fontSize: '0.85rem',
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
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#D2A74F' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <p style={{ fontWeight: 'bold' }}>Leitura concluída com sucesso!</p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-primary)' }}>O bolão de {tempBettorName} foi adicionado ao ranking.</span>
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
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '4px' }}>
                    {((g.finished === 'TRUE' || g.finished === true || g.time_elapsed === 'finished' || (g.time_elapsed && g.time_elapsed !== 'notstarted')) && g.home_score !== undefined && g.home_score !== null && g.home_score !== '' && String(g.home_score) !== 'null') ? `${g.home_score} — ${g.away_score}` : 'vs'}
                  </div>
                  <span style={{ fontSize: '0.6rem', color: (g.finished === 'TRUE' || g.finished === true || g.time_elapsed === 'finished') ? 'var(--accent-gold)' : 'var(--accent-gold)', fontWeight: 'bold' }}>
                    {(g.finished === 'TRUE' || g.finished === true || g.time_elapsed === 'finished') ? `ENCERRADO • ${date}` : (g.time_elapsed && g.time_elapsed !== 'notstarted') ? `AO VIVO • ${g.time_elapsed}` : `${date} às ${time}`}
                  </span>
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
                    background: matchModalTab === 'detalhes' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.07)',
                    color: matchModalTab === 'detalhes' ? '#000' : '#cbd5e1' }}
                >⚽ Detalhes</button>
                <button
                  onClick={() => setMatchModalTab('palpites')}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', border: 'none',
                    background: matchModalTab === 'palpites' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.07)',
                    color: matchModalTab === 'palpites' ? '#000' : '#cbd5e1' }}
                >🏆 Palpites ({betStats.length})</button>
                {currentUserRole === 'Admin' && sandboxMode && (
                  <button
                    onClick={() => setMatchModalTab('sandbox')}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', border: 'none',
                      background: matchModalTab === 'sandbox' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.07)',
                      color: matchModalTab === 'sandbox' ? '#000' : '#cbd5e1' }}
                  >🧪 Sandbox</button>
                )}
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
                  <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                      <span style={{ fontWeight: 'bold', color: (g.finished === 'TRUE' || g.finished === true || g.time_elapsed === 'finished') ? 'var(--accent-gold)' : 'var(--accent-gold)' }}>
                        {g.finished === 'TRUE' || g.finished === true || g.time_elapsed === 'finished' ? '✔ Encerrado' : (g.time_elapsed && g.time_elapsed !== 'notstarted') ? '🔴 Ao Vivo' : '⏳ Agendado'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Sandbox */}
              {matchModalTab === 'sandbox' && currentUserRole === 'Admin' && sandboxMode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ color: 'var(--accent-gold)', margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>🧪 Simular Resultado (Local)</h4>
                  
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Time Casa</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '0.8rem', padding: '0.45rem' }}
                        defaultValue={g.home_team}
                        id="sandbox_home_team"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Time Fora</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '0.8rem', padding: '0.45rem' }}
                        defaultValue={g.away_team}
                        id="sandbox_away_team"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Placar Casa</label>
                      <input
                        type="number"
                        className="form-control"
                        style={{ fontSize: '0.8rem', padding: '0.45rem' }}
                        defaultValue={g.home_score !== null ? g.home_score : ''}
                        placeholder="Não iniciado"
                        id="sandbox_home_score"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Placar Fora</label>
                      <input
                        type="number"
                        className="form-control"
                        style={{ fontSize: '0.8rem', padding: '0.45rem' }}
                        defaultValue={g.away_score !== null ? g.away_score : ''}
                        placeholder="Não iniciado"
                        id="sandbox_away_score"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      defaultChecked={g.finished === 'TRUE' || g.finished === true}
                      id="sandbox_finished"
                      style={{ width: 'auto' }}
                    />
                    <label htmlFor="sandbox_finished" style={{ fontSize: '0.75rem', color: 'var(--text-primary)', cursor: 'pointer' }}>Partida Encerrada</label>
                  </div>

                  <button
                    onClick={() => {
                      const homeTeam = document.getElementById('sandbox_home_team').value;
                      const awayTeam = document.getElementById('sandbox_away_team').value;
                      const homeScoreRaw = document.getElementById('sandbox_home_score').value;
                      const awayScoreRaw = document.getElementById('sandbox_away_score').value;
                      const isFinished = document.getElementById('sandbox_finished').checked;

                      const nextHomeScore = homeScoreRaw !== '' ? parseInt(homeScoreRaw) : null;
                      const nextAwayScore = awayScoreRaw !== '' ? parseInt(awayScoreRaw) : null;

                      const nextConfs = confrontos.map(c => {
                        if (c.id === g.id) {
                          return {
                            ...c,
                            home_team: homeTeam,
                            away_team: awayTeam,
                            home_code: getFlagCode(homeTeam) || 'placeholder',
                            away_code: getFlagCode(awayTeam) || 'placeholder',
                            home_score: nextHomeScore,
                            away_score: nextAwayScore,
                            finished: isFinished
                          };
                        }
                        return c;
                      });

                      localStorage.setItem('copa26_confrontos_sandbox', JSON.stringify(nextConfs));
                      setConfrontos(nextConfs);
                      
                      // Update current modal reference
                      setShowMatchModal({
                        ...g,
                        home_team: homeTeam,
                        away_team: awayTeam,
                        home_code: getFlagCode(homeTeam) || 'placeholder',
                        away_code: getFlagCode(awayTeam) || 'placeholder',
                        home_score: nextHomeScore,
                        away_score: nextAwayScore,
                        finished: isFinished
                      });

                      showToast('Simulação do jogo salva localmente! 🧪');
                    }}
                    style={{
                      background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: '8px',
                      padding: '0.5rem', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.5rem'
                    }}
                  >
                    Salvar Alterações (Sandbox)
                  </button>
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
                          background: (!item.isFinished && !item.isLive) ? 'rgba(255,255,255,0.03)' : item.exact ? 'rgba(16,185,129,0.12)' : item.correct ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${(!item.isFinished && !item.isLive) ? 'rgba(255,255,255,0.05)' : item.exact ? 'rgba(16,185,129,0.4)' : item.correct ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.07)'}`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', minWidth: '18px' }}>{idx + 1}º</span>
                            <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.name}`} style={{ width: '28px', height: '28px', borderRadius: '50%' }} alt="" />
                            <div>
                              <p style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{item.name}</p>
                              {!item.isFinished && !item.isLive ? (
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>⏳ Jogo não iniciado</p>
                              ) : item.isLive ? (
                                <p style={{ fontSize: '0.68rem', fontWeight: '700', color: (item.exact || item.correct) ? 'var(--accent-gold)' : '#f87171' }}>
                                  {item.exact ? '🟢 Vencendo - Exato (+5)' : item.correct ? '🟡 Vencendo - Vencedor (+3)' : '🔴 Perdendo (0 pts)'}
                                  <span style={{ fontSize: '0.55rem', fontWeight: 'normal', color: 'rgba(255,255,255,0.4)', marginLeft: '0.2rem' }}>(parcial)</span>
                                </p>
                              ) : (
                                <p style={{ fontSize: '0.68rem', fontWeight: '600', color: item.exact ? 'var(--accent-gold)' : item.correct ? 'var(--accent-gold)' : '#f87171' }}>
                                  {item.exact ? '🎯 Exato (+5 pts)' : item.correct ? '✅ Vencedor (+3 pts)' : '❌ Errou (0 pts)'}
                                </p>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{
                              fontSize: '1rem', fontWeight: '900', color: '#D2A74F'
                            }}>
                              {item.bet_home} x {item.bet_away}
                            </span>
                            <p style={{ fontSize: '0.58rem', color: 'var(--text-secondary)' }}>Aposta</p>
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
                src={showBetsModal.avatar_url && showBetsModal.avatar_url.startsWith('data:') ? showBetsModal.avatar_url : `https://api.dicebear.com/7.x/identicon/svg?seed=${showBetsModal.bettor_name}`}
                className="bolao-avatar"
                style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
                alt="avatar"
              />
              <div>
                <h4 style={{ fontSize: '0.85rem' }}>{showBetsModal.bettor_name}</h4>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                  {Array.isArray(showBetsModal.bets_data) && showBetsModal.bets_data.some(bd => bd.match_id >= 73)
                    ? 'Palpites da fase eliminatória salvos diretamente'
                    : 'Apostas extraídas com OCR da foto'
                  }
                </p>
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
                  {getCalculatedBets(showBetsModal.bets_data, confrontos).map((bet, idx) => {
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
              Você está excluindo o bolão de <strong style={{ color: 'var(--text-primary)' }}>{showDeleteModal.bettor_name}</strong>. Esta ação é irreversível e zerará os pontos deste participante.
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
        const calculatedBets = getCalculatedBets(b.bets_data, confrontos);
        const total = calculatedBets.length;
        const finalizados = calculatedBets.filter(bt => bt.pts !== null && bt.pts !== undefined);
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
                {[{ label: 'Total Pts', val: totalPts, color: '#D2A74F' },
                  { label: '🎯 Exatos', val: exatos, color: '#D2A74F' },
                  { label: '✅ Vencedor', val: corretos, color: '#60a5fa' },
                  { label: '❌ Erros', val: erros, color: '#f87171' }].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Lista de palpites */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {calculatedBets.map((bet, idx) => {
                  const ptsColor = bet.pts === 5 ? 'var(--accent-gold)' : bet.pts === 3 ? 'var(--accent-gold)' : bet.pts === 0 ? '#f87171' : 'var(--text-muted)';
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.6rem', borderRadius: '8px', background: 'var(--bg-card)' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.78rem', fontWeight: '600' }}>{bet.home} vs {bet.away}</p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Chutou: {bet.bet_home} x {bet.bet_away}{bet.real_home !== null && bet.real_home !== undefined ? ` | Real: ${bet.real_home} x ${bet.real_away}` : ' | Pendente'}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '900', color: ptsColor }}>{bet.pts !== null && bet.pts !== undefined ? `+${bet.pts}` : '-'}</span>
                        {currentUser && currentUserRole === 'Admin' && (
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
                    background: 'var(--bg-card)',
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
                        <img src={`https://flagcdn.com/w80/${hFlag}.png`} style={{ width: '28px', height: '20px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }} alt={bet.home} />
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
                        <img src={`https://flagcdn.com/w80/${aFlag}.png`} style={{ width: '28px', height: '20px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }} alt={bet.away} />
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
                <button className="btn-upload-bolao" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }} onClick={() => setShowWizardModal(false)}>
                  Cancelar
                </button>
                <button className="btn-upload-bolao" style={{ backgroundColor: 'var(--accent-gold)', color: '#000' }} onClick={saveWizardBolao}>
                  Salvar Bolão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Foto do Apostador */}
      {editPhotoModal && (
        <div className="modal-overlay" onClick={() => setEditPhotoModal(null)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Foto — {editPhotoModal.bettorName}</h3>
              <div onClick={() => setEditPhotoModal(null)} className="modal-close"><Icons.X size={20} /></div>
            </div>
            
            {/* Current / Preview Photo */}
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <img
                src={newPhotoPreview || (editPhotoModal.currentPhoto && editPhotoModal.currentPhoto.startsWith('data:') ? editPhotoModal.currentPhoto : `https://api.dicebear.com/7.x/identicon/svg?seed=${editPhotoModal.bettorName}`)}
                alt="foto atual"
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-gold)', marginBottom: '0.5rem' }}
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{newPhotoPreview ? 'Nova foto selecionada' : 'Foto atual'}</p>
            </div>

            {/* File Input */}
            <label htmlFor="edit-photo-upload" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              width: '100%', padding: '0.75rem', marginBottom: '0.75rem',
              background: 'rgba(59,130,246,0.1)', border: '1px solid #3b82f6',
              borderRadius: '8px', color: '#D2A74F', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
            }}>
              📁 Escolher Nova Foto
            </label>
            <input
              id="edit-photo-upload"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoFileSelect}
            />

            <button
              className="btn-submit"
              onClick={saveEditedPhoto}
              disabled={!newPhotoBase64 || savingPhoto}
              style={{ opacity: (!newPhotoBase64 || savingPhoto) ? 0.5 : 1 }}
            >
              {savingPhoto ? 'Salvando...' : 'SALVAR FOTO'}
            </button>
          </div>
        </div>
      )}

      {/* Modal Editar Nome do Apostador */}
      {editNameModal && (
        <div className="modal-overlay" onClick={() => setEditNameModal(null)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Nome</h3>
              <div onClick={() => setEditNameModal(null)} className="modal-close"><Icons.X size={20} /></div>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Nome do Apostador
              </label>
              <input
                type="text"
                className="score-field"
                style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', borderRadius: '8px', color: 'var(--text-primary)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                value={editNameInput}
                onChange={e => setEditNameInput(e.target.value)}
                placeholder="Nome do apostador"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn-upload-bolao" 
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }} 
                onClick={() => setEditNameModal(null)}
              >
                Cancelar
              </button>
              <button 
                className="btn-upload-bolao" 
                style={{ backgroundColor: 'var(--accent-gold, #ffc107)', color: '#000', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }} 
                onClick={saveEditedName}
                disabled={!editNameInput.trim()}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhamento de Pontos do Ranking (Apenas jogos onde pontuou) */}
      {showRankingDetailsModal && (() => {
        const b = showRankingDetailsModal;
        const calculatedBets = getCalculatedBets(b.bets_data, confrontos);
        // Filter: only matches where user got points (pts > 0)
        const scoredBets = calculatedBets.filter(bt => bt.pts === 3 || bt.pts === 5);
        const totalPts = scoredBets.reduce((acc, bt) => acc + (bt.pts || 0), 0);

        return (
          <div className="modal-overlay" onClick={() => setShowRankingDetailsModal(null)}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
              <div className="modal-header">
                <h3>Jogos Pontuados — {b.bettor_name}</h3>
                <div onClick={() => setShowRankingDetailsModal(null)} className="modal-close"><Icons.X size={20} /></div>
              </div>

               <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '1rem', textAlign: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pontuação Considerada</span>
                <strong style={{ fontSize: '2rem', color: '#D2A74F', display: 'block', marginTop: '0.2rem' }}>{totalPts} pts</strong>
                <span style={{ fontSize: '0.7rem', color: '#D2A74F' }}>Exibindo apenas jogos com acerto exato (+5) ou vencedor (+3)</span>
                
                <button
                  onClick={() => {
                    const headerText = `*Resumo de Jogos Pontuados - ${b.bettor_name}*\n🏆 *Pontuação Total:* ${totalPts} pts\n\n`;
                    const gamesText = scoredBets.map(bet => {
                      const badge = bet.pts === 5 ? '🎯 Placar Exato' : '✅ Vencedor';
                      return `⚽ *${bet.home} vs ${bet.away}*\n• Aposta: ${bet.bet_home} x ${bet.bet_away} | Oficial: ${bet.real_home} x ${bet.real_away}\n• Pontos: +${bet.pts} (${badge})\n`;
                    }).join('\n');
                    
                    const fullText = encodeURIComponent(headerText + (scoredBets.length > 0 ? gamesText : 'Nenhum jogo pontuado ainda.'));
                    window.open(`https://api.whatsapp.com/send?text=${fullText}`, '_blank');
                  }}
                  style={{
                    marginTop: '0.85rem',
                    width: '100%',
                    padding: '0.65rem',
                    background: '#25D366',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(37,211,102,0.25)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
                >
                  <span style={{ fontSize: '0.9rem' }}>💬</span> Enviar Resumo via WhatsApp
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {scoredBets.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '1.5rem' }}>
                    Nenhuma pontuação registrada ainda para este participante.
                  </p>
                ) : (
                  scoredBets.map((bet, idx) => {
                    const exact = bet.pts === 5;
                    return (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem', borderRadius: '10px',
                        background: exact ? 'rgba(16,185,129,0.06)' : 'rgba(251,191,36,0.04)',
                        border: `1px solid ${exact ? 'rgba(16,185,129,0.2)' : 'rgba(251,191,36,0.15)'}`
                      }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{bet.home} vs {bet.away}</p>
                          <p style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                            Aposta: <strong style={{ color: 'var(--text-primary)' }}>{bet.bet_home} x {bet.bet_away}</strong> | Oficial: <strong style={{ color: 'var(--text-primary)' }}>{bet.real_home} x {bet.real_away}</strong>
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: '900', color: exact ? 'var(--accent-gold)' : 'var(--accent-gold)' }}>
                            +{bet.pts} pts
                          </span>
                          <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                            {exact ? '🎯 Placar Exato' : '✅ Vencedor'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Confirmação de Aposta Mata-mata */}
      {showBetConfirmation && (
        <div className="modal-overlay" onClick={() => setShowBetConfirmation(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Confirmar Apostas</h3>
              <div onClick={() => setShowBetConfirmation(false)} className="modal-close"><Icons.X size={20} /></div>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#d1d5db', lineHeight: '1.5', marginBottom: '1rem' }}>
              Deseja salvar seus palpites para a fase eliminatória? <strong style={{ color: '#D2A74F' }}>Você não poderá alterá-los após a confirmação!</strong>
            </p>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Nome/Identificador desta Aposta (Diferencie se fizer mais de uma)
              </label>
              <input
                type="text"
                className="form-control"
                style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
                value={knockoutBettorName}
                onChange={(e) => setKnockoutBettorName(e.target.value)}
                placeholder="Ex: Pedro Silva - Jogo 1"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn-upload-bolao" 
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                onClick={() => setShowBetConfirmation(false)}
              >
                Revisar
              </button>
              <button 
                className="btn-upload-bolao" 
                style={{ backgroundColor: 'var(--accent-gold)', color: '#000', fontWeight: 'bold' }}
                onClick={executeSaveKnockoutBets}
              >
                ✔ Confirmar e Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Carregamento da Taça (Trophy Loading) */}
      {bettingLoading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(11,15,25,0.85)', backdropFilter: 'blur(12px)',
          zIndex: 2000, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <style>{`
            @keyframes modalShine {
              0% { left: -150%; }
              50% { left: 150%; }
              100% { left: 150%; }
            }
            .premium-modal-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: -150%;
              width: 50%;
              height: 100%;
              background: linear-gradient(
                90deg,
                transparent,
                rgba(255, 255, 255, 0.08),
                transparent
              );
              transform: skewX(-25deg);
              animation: modalShine 4s infinite;
            }
          `}</style>
          
          <div className="premium-modal-card" style={{
            background: 'rgba(17,24,39,0.75)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '2.5rem 1.5rem 2rem',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(218, 165, 32, 0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Ambient glowing background aura */}
            <div style={{
              position: 'absolute',
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(218, 165, 32, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: -1
            }}></div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '800' }}>Processando suas Apostas...</h3>
            <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '1.25rem' }}>Validando e registrando seus palpites</p>

            <div style={{
              width: '100%',
              maxWidth: '320px',
              aspectRatio: '1/1',
              margin: '0 auto',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <video 
                src="/trophy_success.mp4" 
                autoPlay 
                muted 
                playsInline
                onEnded={() => setVideoEnded(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Humor do Paquetá */}
      {showPaquetaModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
            border: '2px solid var(--accent-gold)',
            borderRadius: '24px',
            padding: '2.5rem 2rem',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <style>{`
              @keyframes successPulse {
                0% { transform: scale(0.95); box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
                50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(218, 165, 32, 0.6); }
                100% { transform: scale(0.95); box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
              }
              .success-trophy-badge {
                animation: successPulse 2s infinite ease-in-out;
              }
            `}</style>
            
            <div className="success-trophy-badge" style={{
              width: '130px',
              height: '130px',
              margin: '0 auto 1.5rem auto',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: '4px solid var(--accent-gold, #ffd700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <span style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>🏆</span>
            </div>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: '900', letterSpacing: '0.5px', marginBottom: '1rem', textTransform: 'uppercase' }}>
              {paquetaTitle}
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#d1d5db', lineHeight: '1.6', marginBottom: '1.75rem' }}>
              {paquetaBody}
            </p>
            <button
              onClick={() => setShowPaquetaModal(false)}
              style={{
                background: 'linear-gradient(135deg, var(--accent-gold), #10b981)',
                border: 'none', borderRadius: '12px',
                color: '#000', fontWeight: 'bold',
                padding: '0.8rem 2rem', fontSize: '0.9rem',
                cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                width: '100%'
              }}
            >
              FECHAR E TORCER! 🤞
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Toast Indicator */}
      {toastMsg && (
        <div className="toast-bar" style={{
          background: toastType === 'error' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, var(--accent-gold), #10b981)',
          color: toastType === 'error' ? '#fff' : '#000',
          fontWeight: 'bold',
          border: toastType === 'error' ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(16,185,129,0.4)'
        }}>
          {toastMsg}
        </div>
      )}
      {/* Bottom Tab Bar (Conditional for Guest vs Authenticated User) */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        background: 'rgba(3, 16, 11, 0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0.65rem 0.5rem',
        boxSizing: 'border-box',
        zIndex: 100,
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px'
      }}>
        {!currentUser ? (
          <>
            <div 
              onClick={() => router.push('/')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', flex: 1 }}
            >
              <Icons.Home size={21} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>INÍCIO</span>
            </div>
            <div 
              onClick={() => setActiveTab('ranking')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', flex: 1 }}
            >
              <Icons.Trophy size={21} style={{ color: activeTab === 'ranking' ? 'var(--accent-gold)' : 'var(--text-secondary)' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: '700', color: activeTab === 'ranking' ? 'var(--accent-gold)' : 'var(--text-secondary)', letterSpacing: '0.03em' }}>CLASSIFICAÇÃO</span>
            </div>
            <div 
              onClick={() => router.push('/?login=true')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', flex: 1 }}
            >
              <Icons.LogIn size={21} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>LOGIN</span>
            </div>
          </>
        ) : (
          <>
            <div 
              onClick={() => setActiveTab('boloes')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', flex: 1 }}
            >
              <Icons.Home size={18} style={{ color: activeTab === 'boloes' ? 'var(--accent-gold)' : 'var(--text-secondary)' }} />
              <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: activeTab === 'boloes' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>Palpites</span>
            </div>
            <div 
              onClick={() => setActiveTab('apostas_elim')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', flex: 1 }}
            >
              <Icons.List size={18} style={{ color: activeTab === 'apostas_elim' ? 'var(--accent-gold)' : 'var(--text-secondary)' }} />
              <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: activeTab === 'apostas_elim' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>Apostar</span>
            </div>
            <div 
              onClick={() => setActiveTab('ranking')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', flex: 1 }}
            >
              <Icons.Trophy size={18} style={{ color: activeTab === 'ranking' ? 'var(--accent-gold)' : 'var(--text-secondary)' }} />
              <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: activeTab === 'ranking' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>Classific.</span>
            </div>
            <div 
              onClick={() => setActiveTab('placares_geral')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', flex: 1 }}
            >
              <Icons.CheckSquare size={18} style={{ color: activeTab === 'placares_geral' ? 'var(--accent-gold)' : 'var(--text-secondary)' }} />
              <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: activeTab === 'placares_geral' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>Resultados</span>
            </div>
            <div 
              onClick={() => setActiveTab('confrontos_geral')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', flex: 1 }}
            >
              <Icons.Calendar size={18} style={{ color: activeTab === 'confrontos_geral' ? 'var(--accent-gold)' : 'var(--text-secondary)' }} />
              <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: activeTab === 'confrontos_geral' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>Confrontos</span>
            </div>
            <div 
              onClick={() => setActiveTab('jogadores')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', flex: 1 }}
            >
              <Icons.User size={18} style={{ color: activeTab === 'jogadores' ? 'var(--accent-gold)' : 'var(--text-secondary)' }} />
              <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: activeTab === 'jogadores' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>Jogadores</span>
            </div>
            {(currentUserRole === 'Admin' || currentUserRole === 'Moderador') && (
              <div 
                onClick={() => {
                  if (currentUserRole === 'Admin') {
                    setActiveTab('configuracoes');
                  } else {
                    setActiveTab('gerenciar_usuarios');
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', flex: 1 }}
              >
                <Icons.Settings size={18} style={{ color: (activeTab === 'configuracoes' || activeTab === 'gerenciar_usuarios') ? 'var(--accent-gold)' : 'var(--text-secondary)' }} />
                <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: (activeTab === 'configuracoes' || activeTab === 'gerenciar_usuarios') ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>Config</span>
              </div>
            )}
            <div 
              onClick={handleLogout}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', cursor: 'pointer', flex: 1 }}
            >
              <Icons.LogOut size={18} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Sair</span>
            </div>
          </>
        )}
      </div>

      <FirstLaunchOverlay />
    </div>
  );
}

function KnockoutBetsList({ playerUsername, koConfs, boloes, currentUser, currentUserRole, mataMataPublic, expandedBoloesList, setExpandedBoloesList }) {
  const isSelf = currentUser && playerUsername && currentUser.toLowerCase() === playerUsername.toLowerCase();
  const isPrivileged = currentUserRole === 'Admin' || currentUserRole === 'Moderador';
  
  const [playerStageFilter, setPlayerStageFilter] = useState('r32');

  if (!mataMataPublic && !isSelf && !isPrivileged) {
    return (
      <div style={{ 
        padding: '1rem', 
        background: 'rgba(239, 68, 68, 0.1)', 
        border: '1px solid rgba(239, 68, 68, 0.25)', 
        borderRadius: '12px', 
        color: '#f87171', 
        fontSize: '0.8rem', 
        textAlign: 'center',
        margin: '0.5rem 0',
        lineHeight: '1.4'
      }}>
        🔒 Ainda estamos na Fase de Grupos. Os palpites do Mata-Mata serão liberados em breve pelo administrador.
      </div>
    );
  }

  const playerKoBoloes = (boloes || []).filter(b => 
    b.username && b.username.toLowerCase() === playerUsername.toLowerCase() &&
    Array.isArray(b.bets_data) && b.bets_data.some(bd => bd.match_id >= 73)
  );

  if (playerKoBoloes.length === 0) {
    return (
      <div style={{ 
        padding: '1rem', 
        background: 'rgba(239, 68, 68, 0.1)', 
        border: '1px solid rgba(239, 68, 68, 0.25)', 
        borderRadius: '12px', 
        color: '#f87171', 
        fontSize: '0.8rem', 
        textAlign: 'center',
        margin: '0.5rem 0',
        lineHeight: '1.4'
      }}>
        🔒 Ainda estamos na Fase de Grupos. Os palpites do Mata-Mata serão liberados em breve pelo administrador.
      </div>
    );
  }

  // Filter player predictions by selected stage filter
  const filteredKoBoloes = playerKoBoloes.filter(b => {
    const ids = b.bets_data.map(bd => bd.match_id);
    if (playerStageFilter === 'final') return ids.some(id => id >= 103);
    if (playerStageFilter === 'sf') return ids.some(id => id >= 101 && id <= 102);
    if (playerStageFilter === 'qf') return ids.some(id => id >= 97 && id <= 100);
    if (playerStageFilter === 'r16') return ids.some(id => id >= 89 && id <= 96);
    if (playerStageFilter === 'r32') return ids.some(id => id >= 73 && id <= 88);
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Sub-filtro das Fases do Mata-Mata */}
      <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }} className="no-scrollbar">
        {[
          { id: 'r32', label: '1/16' },
          { id: 'r16', label: 'Oitavas' },
          { id: 'qf', label: 'Quartas' },
          { id: 'sf', label: 'Semifinal' },
          { id: 'final', label: 'Finais' }
        ].map(stage => (
          <button
            key={stage.id}
            onClick={() => setPlayerStageFilter(stage.id)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.7rem',
              fontWeight: '800',
              border: playerStageFilter === stage.id ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.08)',
              background: playerStageFilter === stage.id ? 'var(--accent-gold)' : 'transparent',
              color: playerStageFilter === stage.id ? '#000' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {stage.label}
          </button>
        ))}
      </div>

      {filteredKoBoloes.map((bol) => {
        const isExpanded = expandedBoloesList.includes(bol.id);
        const bets = bol.bets_data || [];
        return (
          <div key={bol.id} style={{ 
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            background: 'var(--bg-card)',
            overflow: 'hidden'
          }}>
            <div 
              onClick={() => {
                setExpandedBoloesList(prev => 
                  prev.includes(bol.id) 
                    ? prev.filter(id => id !== bol.id) 
                    : [...prev, bol.id]
                );
              }}
              style={{ 
                fontSize: '0.78rem', 
                fontWeight: 'bold', 
                color: '#D2A74F', 
                padding: '0.75rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.03)'
              }}
            >
              <span>🏆 {bol.bettor_name || 'Mata-Mata'}</span>
              <Icons.ChevronRight size={16} style={{ 
                color: 'var(--text-secondary)', 
                transform: isExpanded ? 'rotate(90deg)' : 'none', 
                transition: 'transform 0.2s' 
              }} />
            </div>
            {isExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                {bets.map((bet, idx) => {
                  const match = koConfs.find(c => c.id === bet.match_id) || bet;
                  const ptsCalculated = bet.pts !== null && bet.pts !== undefined ? bet.pts : '';
                  return (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)'
                    }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{bet.home} x {bet.away}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#D2A74F' }}>
                          Aposta: {bet.bet_home} - {bet.bet_away}
                        </span>
                        {match.home_score !== null && match.home_score !== undefined && String(match.home_score) !== 'null' && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>
                            Oficial: {match.home_score} - {match.away_score} {ptsCalculated !== '' ? `(+${ptsCalculated} pts)` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {filteredKoBoloes.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '0.5rem 0' }}>
          Nenhuma cartela desta fase encontrada para este jogador.
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div style={{ color: 'var(--text-primary)', padding: '2rem', textAlign: 'center' }}>Carregando Painel...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
