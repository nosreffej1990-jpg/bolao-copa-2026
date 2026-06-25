// worldcupApi.js — Integração com a API worldcup26.ir (com proxy local e fuso de Brasília)
const BASE_URL = 'https://worldcup26.ir/get';

// Cache simples para evitar chamadas repetidas em menos de 60s
let cache = { games: null, lastFetch: 0 };
let teamsCache = null;
const CACHE_TTL = 60 * 1000; // 60 segundos

const STADIUM_OFFSETS = {
  '1': 3,  // CDMX (Mexico City) -> UTC-6 -> Brasília is +3 hours
  '2': 4,  // Vancouver -> UTC-7 (DST) -> Brasília is +4 hours
  '3': 4,  // Seattle -> UTC-7 (DST) -> Brasília is +4 hours
  '4': 2,  // Kansas City -> UTC-5 (DST) -> Brasília is +2 hours
  '5': 1,  // Atlanta -> UTC-4 (DST) -> Brasília is +1 hour
  '6': 1,  // NY/NJ -> UTC-4 (DST) -> Brasília is +1 hour
  '7': 1,  // Miami -> UTC-4 (DST) -> Brasília is +1 hour
  '8': 2,  // Dallas -> UTC-5 (DST) -> Brasília is +2 hours
  '9': 1,  // Miami -> UTC-4 (DST) -> Brasília is +1 hour
  '10': 1, // Philadelphia -> UTC-4 (DST) -> Brasília is +1 hour
  '11': 1, // NY/NJ -> UTC-4 (DST) -> Brasília is +1 hour
  '12': 1, // Toronto -> UTC-4 (DST) -> Brasília is +1 hour
  '13': 4, // San Francisco -> UTC-7 (DST) -> Brasília is +4 hours
  '14': 1, // Boston -> UTC-4 (DST) -> Brasília is +1 hour
  '15': 1, // Boston -> UTC-4 (DST) -> Brasília is +1 hour
  '16': 4  // Los Angeles -> UTC-7 (DST) -> Brasília is +4 hours
};

const TEAM_TRANSLATIONS = {
  'Mexico': 'México', 'South Africa': 'África do Sul', 'South Korea': 'Coreia do Sul', 'Czech Republic': 'República Tcheca',
  'Canada': 'Canadá', 'Bosnia and Herzegovina': 'Bósnia e Herzegovina', 'United States': 'Estados Unidos', 'Paraguay': 'Paraguai',
  'Haiti': 'Haiti', 'Scotland': 'Escócia', 'Brazil': 'Brasil', 'Morocco': 'Marrocos',
  'Qatar': 'Catar', 'Switzerland': 'Suíça', 'Australia': 'Austrália', 'Turkey': 'Turquia',
  'Germany': 'Alemanha', 'Curaçao': 'Curaçao', 'Ivory Coast': 'Costa do Marfim', 'Ecuador': 'Equador',
  'Netherlands': 'Holanda', 'Japan': 'Japão', 'Sweden': 'Suécia', 'Tunisia': 'Tunísia',
  'Belgium': 'Bélgica', 'Egypt': 'Egito', 'Iran': 'Irã', 'New Zealand': 'Nova Zelândia',
  'Spain': 'Espanha', 'Cape Verde': 'Cabo Verde', 'Saudi Arabia': 'Arábia Saudita', 'Uruguay': 'Uruguai',
  'France': 'França', 'Senegal': 'Senegal', 'Iraq': 'Iraque', 'Norway': 'Noruega',
  'Argentina': 'Argentina', 'Algeria': 'Argélia', 'Austria': 'Áustria', 'Jordan': 'Jordânia',
  'Portugal': 'Portugal', 'Democratic Republic of the Congo': 'RD do Congo', 'Uzbekistan': 'Uzbequistão', 'Colombia': 'Colômbia',
  'England': 'Inglaterra', 'Croatia': 'Croácia', 'Ghana': 'Gana', 'Panama': 'Panamá',
  'Italy': 'Itália', 'Ukraine': 'Ucrânia', 'Poland': 'Polônia', 'Honduras': 'Honduras',
  'Chile': 'Chile', 'Congo': 'Congo'
};

export function convertToBrasiliaDate(localDateStr, stadiumId) {
  if (!localDateStr) return '';
  try {
    const [datePart, timePart] = localDateStr.split(' ');
    if (!datePart || !timePart) return localDateStr;
    const [month, day, year] = datePart.split('/');
    const parsed = new Date(`${year}-${month}-${day}T${timePart}:00`);
    if (isNaN(parsed.getTime())) return localDateStr;
    
    const offsetHours = STADIUM_OFFSETS[String(stadiumId)] || 0;
    parsed.setHours(parsed.getHours() + offsetHours);
    
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    const yyyy = parsed.getFullYear();
    const hh = String(parsed.getHours()).padStart(2, '0');
    const min = String(parsed.getMinutes()).padStart(2, '0');
    return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
  } catch (e) {
    return localDateStr;
  }
}

// Parser robusto de data da API ("MM/DD/YYYY HH:mm" ou "YYYY-MM-DD HH:mm:ss") que funciona em TODOS os navegadores (inclusive iOS/Safari)
export function parseApiDate(localDateStr) {
  if (!localDateStr) return new Date(0);
  try {
    const [datePart, timePart] = localDateStr.split(' ');
    if (!datePart || !timePart) return new Date(localDateStr);
    
    if (datePart.includes('/')) {
      const [month, day, year] = datePart.split('/');
      return new Date(`${year}-${month}-${day}T${timePart}`);
    } else if (datePart.includes('-')) {
      return new Date(`${datePart}T${timePart}`);
    }
    return new Date(localDateStr);
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
export async function fetchAllGames(forceWorldCupApi = false) {
  const now = Date.now();
  if (!forceWorldCupApi && cache.games && now - cache.lastFetch < CACHE_TTL) {
    return cache.games;
  }

  try {
    if (!forceWorldCupApi) {
      const espnRes = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard', { cache: 'no-store' });
      if (espnRes.ok) {
      const espnData = await espnRes.json();
      if (espnData && espnData.events) {
        const games = espnData.events.map((event, idx) => {
          const comp = event.competitions[0];
          const home = comp.competitors.find(c => c.homeAway === 'home');
          const away = comp.competitors.find(c => c.homeAway === 'away');
          
          const state = comp.status.type.state;
          let finished = 'FALSE';
          let time_elapsed = 'notstarted';
          if (state === 'post') {
            finished = 'TRUE';
            time_elapsed = 'finished';
          } else if (state === 'in') {
            time_elapsed = comp.status.displayClock || "Live";
          }
          
          const homeName = home ? home.team.name : 'TBD';
          const awayName = away ? away.team.name : 'TBD';
          
          const d = new Date(event.date);
          // convert UTC to UTC-3
          d.setHours(d.getHours() - 3);
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const yyyy = d.getFullYear();
          const hh = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          const local_date = `${mm}/${dd}/${yyyy} ${hh}:${min}`;

          return {
            id: String(idx + 1),
            home_team_name_en: TEAM_TRANSLATIONS[homeName] || homeName,
            away_team_name_en: TEAM_TRANSLATIONS[awayName] || awayName,
            home_score: home && home.score ? home.score : "null",
            away_score: away && away.score ? away.score : "null",
            finished,
            time_elapsed,
            local_date,
            stadium_id: '1'
          };
        });
        
        cache.games = games;
        cache.lastFetch = now;
        return cache.games;
      }
    }
  }
} catch (err) {
    console.error('Erro na ESPN API, caindo para fallback:', err);
  }

  // FALLBACK PARA worldcup26.ir
  let url = `${BASE_URL}/games`;
  if (typeof window !== 'undefined') {
    url = '/api/games';
  }

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('API games error');
    const data = await res.json();
    const games = data.games || [];
    
    cache.games = games.map(g => ({
      ...g,
      home_team_name_en: TEAM_TRANSLATIONS[g.home_team_name_en] || g.home_team_name_en,
      away_team_name_en: TEAM_TRANSLATIONS[g.away_team_name_en] || g.away_team_name_en,
      local_date: convertToBrasiliaDate(g.local_date, g.stadium_id)
    }));
    
    cache.lastFetch = now;
    return cache.games;
  } catch (e) {
    console.error('Erro ao buscar jogos no proxy fallback:', e);
    
    if (typeof window !== 'undefined' && url !== `${BASE_URL}/games`) {
      try {
        const fallbackRes = await fetch(`${BASE_URL}/games`, { cache: 'no-store' });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const games = fallbackData.games || [];
          
          cache.games = games.map(g => ({
            ...g,
            home_team_name_en: TEAM_TRANSLATIONS[g.home_team_name_en] || g.home_team_name_en,
            away_team_name_en: TEAM_TRANSLATIONS[g.away_team_name_en] || g.away_team_name_en,
            local_date: convertToBrasiliaDate(g.local_date, g.stadium_id)
          }));
          
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
    .filter(g => (g.finished === 'TRUE' || g.finished === true))
    .sort((a, b) => parseApiDate(b.local_date) - parseApiDate(a.local_date));
}

// Jogos ao vivo (em andamento)
export async function getLiveMatches() {
  const games = await fetchAllGames();
  return games.filter(g =>
    (g.finished === 'FALSE' || g.finished === false) &&
    g.time_elapsed !== 'notstarted' &&
    g.time_elapsed !== 'finished'
  );
}

// Próximos jogos (ainda não começaram)
export async function getUpcomingMatches(limit = 15) {
  const games = await fetchAllGames();
  return games
    .filter(g => (g.finished === 'FALSE' || g.finished === false) && g.time_elapsed === 'notstarted')
    .sort((a, b) => parseApiDate(a.local_date) - parseApiDate(b.local_date))
    .slice(0, limit);
}

// Formata a data do jogo para exibição em pt-BR
export function formatMatchDate(localDate) {
  const d = parseApiDate(localDate);
  const timePart = localDate && localDate.includes(' ') ? localDate.split(' ')[1] : '00:00';
  const formattedTime = timePart ? timePart.slice(0, 5) : '00:00';
  return {
    date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    time: formattedTime,
    full: d,
  };
}

// Retorna código de bandeira do país (mapeamento manual)
export function getFlagCode(teamNameEn) {
  if (!teamNameEn) return 'un';
  
  // Mapeamento compatível com nomes traduzidos e originais
  const map = {
    'México': 'mx', 'Mexico': 'mx',
    'África do Sul': 'za', 'South Africa': 'za',
    'Coreia do Sul': 'kr', 'South Korea': 'kr',
    'República Tcheca': 'cz', 'Czech Republic': 'cz',
    'Canadá': 'ca', 'Canada': 'ca',
    'Bósnia e Herzegovina': 'ba', 'Bosnia and Herzegovina': 'ba', 'Bósnia': 'ba',
    'Estados Unidos': 'us', 'United States': 'us', 'EUA': 'us',
    'Paraguai': 'py', 'Paraguay': 'py',
    'Haiti': 'ht',
    'Escócia': 'gb-sct', 'Scotland': 'gb-sct',
    'Brasil': 'br', 'Brazil': 'br',
    'Marrocos': 'ma', 'Morocco': 'ma',
    'Catar': 'qa', 'Qatar': 'qa',
    'Suíça': 'ch', 'Switzerland': 'ch',
    'Austrália': 'au', 'Australia': 'au',
    'Turquia': 'tr', 'Turkey': 'tr',
    'Alemanha': 'de', 'Germany': 'de',
    'Curaçao': 'cw',
    'Costa do Marfim': 'ci', 'Ivory Coast': 'ci',
    'Equador': 'ec', 'Ecuador': 'ec',
    'Holanda': 'nl', 'Netherlands': 'nl',
    'Japão': 'jp', 'Japan': 'jp',
    'Suécia': 'se', 'Sweden': 'se',
    'Tunísia': 'tn', 'Tunisia': 'tn',
    'Bélgica': 'be', 'Belgium': 'be',
    'Egito': 'eg', 'Egypt': 'eg',
    'Irã': 'ir', 'Iran': 'ir',
    'Nova Zelândia': 'nz', 'New Zealand': 'nz',
    'Espanha': 'es', 'Spain': 'es',
    'Cabo Verde': 'cv', 'Cape Verde': 'cv',
    'Arábia Saudita': 'sa', 'Saudi Arabia': 'sa',
    'Uruguai': 'uy', 'Uruguay': 'uy',
    'França': 'fr', 'France': 'fr',
    'Senegal': 'sn',
    'Iraque': 'iq', 'Iraq': 'iq',
    'Noruega': 'no', 'Norway': 'no',
    'Argentina': 'ar',
    'Argélia': 'dz', 'Algeria': 'dz',
    'Áustria': 'at', 'Austria': 'at',
    'Jordânia': 'jo', 'Jordan': 'jo',
    'Portugal': 'pt',
    'RD do Congo': 'cd', 'Democratic Republic of the Congo': 'cd',
    'Uzbequistão': 'uz', 'Uzbekistan': 'uz',
    'Colômbia': 'co', 'Colombia': 'co',
    'Inglaterra': 'gb-eng', 'England': 'gb-eng',
    'Croácia': 'hr', 'Croatia': 'hr',
    'Gana': 'gh', 'Ghana': 'gh',
    'Panamá': 'pa', 'Panama': 'pa',
    'Itália': 'it', 'Italy': 'it',
    'Ucrânia': 'ua', 'Ukraine': 'ua',
    'Polônia': 'pl', 'Poland': 'pl',
    'Honduras': 'hn',
    'Chile': 'cl',
    'Congo': 'cg'
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
    const [res, teamsMap] = await Promise.all([
      fetch(url, { cache: 'no-store' }),
      fetchAllTeams()
    ]);

    if (!res.ok) throw new Error('API groups error');
    const data = await res.json();
    const groups = data.groups || data || [];
    
    // Normaliza classificação
    const standings = groups.map(g => ({
      ...g,
      group: g.name,
      teams: (g.teams || []).map(t => {
        const teamInfo = teamsMap[t.team_id] || {};
        const rawTeamName = teamInfo.name_en || `Time ${t.team_id}`;
        return {
          ...t,
          team: TEAM_TRANSLATIONS[rawTeamName] || rawTeamName,
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

    // Ordenação estrita (pontos desc, saldo desc, nome time asc)
    standings.forEach(g => {
      g.teams.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const aGD = a.goalDifference !== undefined ? a.goalDifference : a.goal_difference;
        const bGD = b.goalDifference !== undefined ? b.goalDifference : b.goal_difference;
        if (bGD !== aGD) return bGD - aGD;
        return a.team.localeCompare(b.team);
      });
    });

    return standings;
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
          
          const standings = groups.map(g => ({
            ...g,
            group: g.name,
            teams: (g.teams || []).map(t => {
              const teamInfo = teamsMap[t.team_id] || {};
              const rawTeamName = teamInfo.name_en || `Time ${t.team_id}`;
              return {
                ...t,
                team: TEAM_TRANSLATIONS[rawTeamName] || rawTeamName,
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

          standings.forEach(g => {
            g.teams.sort((a, b) => {
              if (b.points !== a.points) return b.points - a.points;
              const aGD = a.goalDifference !== undefined ? a.goalDifference : a.goal_difference;
              const bGD = b.goalDifference !== undefined ? b.goalDifference : b.goal_difference;
              if (bGD !== aGD) return bGD - aGD;
              return a.team.localeCompare(b.team);
            });
          });

          return standings;
        }
      } catch (err) {
        console.error('Erro no fallback de busca direta dos grupos:', err);
      }
    }
    return [];
  }
}
