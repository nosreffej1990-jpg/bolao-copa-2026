// worldcupApi.js — Integração com a API worldcup26.ir (com proxy local e fallback direto)
const BASE_URL = 'https://worldcup26.ir/get';

// Cache simples para evitar chamadas repetidas em menos de 60s
let cache = { games: null, lastFetch: 0 };
let teamsCache = null;
const CACHE_TTL = 60 * 1000; // 60 segundos

// Parser robusto de data da API ("MM/DD/YYYY HH:mm") que funciona em TODOS os navegadores (inclusive iOS/Safari)
export function parseApiDate(localDateStr) {
  if (!localDateStr) return new Date(0);
  try {
    const [datePart, timePart] = localDateStr.split(' ');
    if (!datePart || !timePart) return new Date(localDateStr);
    const [month, day, year] = datePart.split('/');
    return new Date(`${year}-${month}-${day}T${timePart}:00`);
  } catch (e) {
    console.error('Erro ao fazer parse da data:', localDateStr, e);
    return new Date(localDateStr);
  }
}

// Busca todos os times para mapeamento de id -> nome
export async function fetchAllTeams() {
  if (teamsCache) return teamsCache;
  
  let url = `${BASE_URL}/teams`;
  // No navegador, usa o proxy local da API para evitar CORS e problemas de SSL
  if (typeof window !== 'undefined') {
    url = '/api/teams';
  }

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('API teams error');
    const data = await res.json();
    const teams = Array.isArray(data) ? data : (data.teams || []);
    
    const map = {};
    teams.forEach(t => {
      map[t.id] = t;
    });
    teamsCache = map;
    return teamsCache;
  } catch (e) {
    console.error('Erro ao buscar times no proxy:', e);
    
    // Fallback: tenta chamar a API direta se estiver rodando no navegador e a rota de proxy falhar
    if (typeof window !== 'undefined' && url !== `${BASE_URL}/teams`) {
      try {
        console.log('Tentando fallback direto para buscar times...');
        const fallbackRes = await fetch(`${BASE_URL}/teams`, { cache: 'no-store' });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const teams = Array.isArray(fallbackData) ? fallbackData : (fallbackData.teams || []);
          const map = {};
          teams.forEach(t => {
            map[t.id] = t;
          });
          teamsCache = map;
          return teamsCache;
        }
      } catch (err) {
        console.error('Erro no fallback de busca direta dos times:', err);
      }
    }
    return {};
  }
}

// Busca todos os jogos
export async function fetchAllGames() {
  const now = Date.now();
  if (cache.games && now - cache.lastFetch < CACHE_TTL) {
    return cache.games;
  }

  let url = `${BASE_URL}/games`;
  if (typeof window !== 'undefined') {
    url = '/api/games';
  }

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('API games error');
    const data = await res.json();
    cache.games = data.games || [];
    cache.lastFetch = now;
    return cache.games;
  } catch (e) {
    console.error('Erro ao buscar jogos no proxy:', e);
    
    // Fallback: tenta chamar a API direta se estiver rodando no navegador e a rota de proxy falhar
    if (typeof window !== 'undefined' && url !== `${BASE_URL}/games`) {
      try {
        console.log('Tentando fallback direto para buscar jogos...');
        const fallbackRes = await fetch(`${BASE_URL}/games`, { cache: 'no-store' });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          cache.games = fallbackData.games || [];
          cache.lastFetch = now;
          return cache.games;
        }
      } catch (err) {
        console.error('Erro no fallback de busca direta de jogos:', err);
      }
    }
    return cache.games || [];
  }
}

// Jogos finalizados — com placar real
export async function getFinishedMatches() {
  const games = await fetchAllGames();
  return games
    .filter(g => g.finished === 'TRUE')
    .sort((a, b) => parseApiDate(b.local_date) - parseApiDate(a.local_date));
}

// Jogos ao vivo (em andamento)
export async function getLiveMatches() {
  const games = await fetchAllGames();
  return games.filter(g =>
    g.finished === 'FALSE' &&
    g.time_elapsed !== 'notstarted' &&
    g.time_elapsed !== 'finished'
  );
}

// Próximos jogos (ainda não começaram)
// Retirado o filtro g.type === 'group' para poder exibir jogos de mata-mata no futuro
export async function getUpcomingMatches(limit = 15) {
  const games = await fetchAllGames();
  return games
    .filter(g => g.finished === 'FALSE' && g.time_elapsed === 'notstarted')
    .sort((a, b) => parseApiDate(a.local_date) - parseApiDate(b.local_date))
    .slice(0, limit);
}

// Formata a data do jogo para exibição em pt-BR
export function formatMatchDate(localDate) {
  const d = parseApiDate(localDate);
  const timePart = localDate && localDate.includes(' ') ? localDate.split(' ')[1] : '00:00';
  return {
    date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    time: timePart || '00:00',
    full: d,
  };
}

// Retorna código de bandeira do país (mapeamento manual)
export function getFlagCode(teamNameEn) {
  if (!teamNameEn) return 'un';
  const map = {
    'Mexico': 'mx', 'South Africa': 'za', 'South Korea': 'kr', 'Czech Republic': 'cz',
    'Canada': 'ca', 'Bosnia and Herzegovina': 'ba', 'United States': 'us', 'Paraguay': 'py',
    'Haiti': 'ht', 'Scotland': 'gb-sct', 'Brazil': 'br', 'Morocco': 'ma',
    'Qatar': 'qa', 'Switzerland': 'ch', 'Australia': 'au', 'Turkey': 'tr',
    'Germany': 'de', 'Curaçao': 'cw', 'Ivory Coast': 'ci', 'Ecuador': 'ec',
    'Netherlands': 'nl', 'Japan': 'jp', 'Sweden': 'se', 'Tunisia': 'tn',
    'Belgium': 'be', 'Egypt': 'eg', 'Iran': 'ir', 'New Zealand': 'nz',
    'Spain': 'es', 'Cape Verde': 'cv', 'Saudi Arabia': 'sa', 'Uruguay': 'uy',
    'France': 'fr', 'Senegal': 'sn', 'Iraq': 'iq', 'Norway': 'no',
    'Argentina': 'ar', 'Algeria': 'dz', 'Austria': 'at', 'Jordan': 'jo',
    'Portugal': 'pt', 'Democratic Republic of the Congo': 'cd', 'Uzbekistan': 'uz', 'Colombia': 'co',
    'England': 'gb-eng', 'Croatia': 'hr', 'Ghana': 'gh', 'Panama': 'pa',
  };
  return map[teamNameEn] || 'un';
}

// Tabela de classificação dos grupos
export async function getGroupStandings() {
  let url = `${BASE_URL}/groups`;
  if (typeof window !== 'undefined') {
    url = '/api/groups';
  }

  try {
    // Busca os grupos e a lista de times de forma concorrente
    const [res, teamsMap] = await Promise.all([
      fetch(url, { cache: 'no-store' }),
      fetchAllTeams()
    ]);

    if (!res.ok) throw new Error('API groups error');
    const data = await res.json();
    const groups = data.groups || data || [];
    
    // Mapeia os times e normaliza as estatísticas para as propriedades esperadas no frontend
    return groups.map(g => ({
      ...g,
      group: g.name, // Garante compatibilidade (g.group e g.name)
      teams: (g.teams || []).map(t => {
        const teamInfo = teamsMap[t.team_id] || {};
        return {
          ...t,
          team: teamInfo.name_en || `Time ${t.team_id}`,
          played: t.mp !== undefined ? parseInt(t.mp) : 0,
          won: t.w !== undefined ? parseInt(t.w) : 0,
          drawn: t.d !== undefined ? parseInt(t.d) : 0,
          lost: t.l !== undefined ? parseInt(t.l) : 0,
          goal_difference: t.gd !== undefined ? parseInt(t.gd) : 0,
          goalDifference: t.gd !== undefined ? parseInt(t.gd) : 0,
          points: t.pts !== undefined ? parseInt(t.pts) : 0
        };
      })
    }));
  } catch (e) {
    console.error('Erro ao buscar grupos no proxy:', e);
    
    // Fallback: tenta chamar a API direta se a rota do proxy falhar
    if (typeof window !== 'undefined' && url !== `${BASE_URL}/groups`) {
      try {
        console.log('Tentando fallback direto para buscar grupos...');
        const fallbackRes = await fetch(`${BASE_URL}/groups`, { cache: 'no-store' });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const groups = fallbackData.groups || fallbackData || [];
          const teamsMap = await fetchAllTeams();
          return groups.map(g => ({
            ...g,
            group: g.name,
            teams: (g.teams || []).map(t => {
              const teamInfo = teamsMap[t.team_id] || {};
              return {
                ...t,
                team: teamInfo.name_en || `Time ${t.team_id}`,
                played: t.mp !== undefined ? parseInt(t.mp) : 0,
                won: t.w !== undefined ? parseInt(t.w) : 0,
                drawn: t.d !== undefined ? parseInt(t.d) : 0,
                lost: t.l !== undefined ? parseInt(t.l) : 0,
                goal_difference: t.gd !== undefined ? parseInt(t.gd) : 0,
                goalDifference: t.gd !== undefined ? parseInt(t.gd) : 0,
                points: t.pts !== undefined ? parseInt(t.pts) : 0
              };
            })
          }));
        }
      } catch (err) {
        console.error('Erro no fallback de busca direta dos grupos:', err);
      }
    }
    return [];
  }
}
