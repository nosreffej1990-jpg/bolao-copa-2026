// worldcupApi.js — Integração com a API worldcup26.ir (gratuita, sem chave)
const BASE_URL = 'https://worldcup26.ir/get';

// Cache simples para evitar chamadas repetidas em menos de 60s
let cache = { games: null, lastFetch: 0 };
const CACHE_TTL = 60 * 1000; // 60 segundos

export async function fetchAllGames() {
  const now = Date.now();
  if (cache.games && now - cache.lastFetch < CACHE_TTL) {
    return cache.games;
  }
  try {
    const res = await fetch(`${BASE_URL}/games`, { cache: 'no-store' });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    cache.games = data.games || [];
    cache.lastFetch = now;
    return cache.games;
  } catch (e) {
    console.error('Erro ao buscar jogos:', e);
    return cache.games || [];
  }
}

// Jogos finalizados — com placar real
export async function getFinishedMatches() {
  const games = await fetchAllGames();
  return games
    .filter(g => g.finished === 'TRUE')
    .sort((a, b) => new Date(b.local_date) - new Date(a.local_date));
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
export async function getUpcomingMatches(limit = 10) {
  const games = await fetchAllGames();
  return games
    .filter(g => g.finished === 'FALSE' && g.time_elapsed === 'notstarted' && g.type === 'group')
    .sort((a, b) => new Date(a.local_date) - new Date(b.local_date))
    .slice(0, limit);
}

// Formata a data do jogo para exibição em pt-BR
export function formatMatchDate(localDate) {
  // localDate vem como "MM/DD/YYYY HH:mm"
  const [datePart, timePart] = localDate.split(' ');
  const [month, day, year] = datePart.split('/');
  const d = new Date(`${year}-${month}-${day}T${timePart}:00`);
  return {
    date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    time: timePart,
    full: d,
  };
}

// Retorna código de bandeira do país (mapeamento manual)
export function getFlagCode(teamNameEn) {
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
