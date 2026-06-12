import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase keys are provided, otherwise fallback to localMock
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabaseClient = null;

if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

// In-Memory/LocalStorage Database for instant preview
const getLocalDB = () => {
  if (typeof window === 'undefined') return { confrontos: [], palpites: [], boloes: [] };
  
  // Default values
  const defaultConfrontos = [
    { id: 1, grupo: 'A', home_team: 'México', home_code: 'mx', away_team: 'África do Sul', away_code: 'za', match_date: '2026-06-11', match_time: '17:00:00', stadium: 'Estádio Azteca (CDMX)', home_score: 2, away_score: 1, finished: true },
    { id: 2, grupo: 'A', home_team: 'Coreia do Sul', home_code: 'kr', away_team: 'Itália', away_code: 'it', match_date: '2026-06-12', match_time: '14:00:00', stadium: 'BC Place (Vancouver)', home_score: null, away_score: null, finished: false },
    { id: 3, grupo: 'B', home_team: 'Canadá', home_code: 'ca', away_team: 'Catar', away_code: 'qa', match_date: '2026-06-12', match_time: '16:00:00', stadium: 'BMO Field (Toronto)', home_score: 3, away_score: 0, finished: true },
    { id: 4, grupo: 'B', home_team: 'Suíça', home_code: 'ch', away_team: 'Suécia', away_code: 'se', match_date: '2026-06-13', match_time: '13:00:00', stadium: 'Gillette Stadium (Boston)', home_score: null, away_score: null, finished: false },
    { id: 5, public: true, grupo: 'C', home_team: 'Brasil', home_code: 'br', away_team: 'Marrocos', away_code: 'ma', match_date: '2026-06-13', match_time: '15:00:00', stadium: 'MetLife Stadium (NY)', home_score: null, away_score: null, finished: false },
    { id: 6, grupo: 'C', home_team: 'Haiti', home_code: 'ht', away_team: 'Escócia', away_code: 'gb-sct', match_date: '2026-06-13', match_time: '18:00:00', stadium: 'Hard Rock Stadium (Miami)', home_score: null, away_score: null, finished: false },
    { id: 7, grupo: 'D', home_team: 'EUA', home_code: 'us', away_team: 'Paraguai', away_code: 'py', match_date: '2026-06-12', match_time: '19:00:00', stadium: 'SoFi Stadium (Los Angeles)', home_score: null, away_score: null, finished: false },
    { id: 8, grupo: 'D', home_team: 'Austrália', home_code: 'au', away_team: 'Ucrânia', away_code: 'ua', match_date: '2026-06-13', match_time: '21:00:00', stadium: 'Levi\'s Stadium (San Francisco)', home_score: null, away_score: null, finished: false },
    { id: 9, grupo: 'E', home_team: 'Alemanha', home_code: 'de', away_team: 'Curaçao', away_code: 'cw', match_date: '2026-06-14', match_time: '13:00:00', stadium: 'Mercedes-Benz Stadium (Atlanta)', home_score: null, away_score: null, finished: false },
    { id: 10, grupo: 'E', home_team: 'Costa do Marfim', home_code: 'ci', away_team: 'Equador', away_code: 'ec', match_date: '2026-06-14', match_time: '16:00:00', stadium: 'Lincoln Financial Field (Philly)', home_score: null, away_score: null, finished: false },
    { id: 11, grupo: 'F', home_team: 'Holanda', home_code: 'nl', away_team: 'Japão', away_code: 'jp', match_date: '2026-06-14', match_time: '19:00:00', stadium: 'Arrowhead Stadium (Kansas)', home_score: null, away_score: null, finished: false },
    { id: 12, grupo: 'F', home_team: 'Tunísia', home_code: 'tn', away_team: 'Polônia', away_code: 'pl', match_date: '2026-06-14', match_time: '22:00:00', stadium: 'Lumen Field (Seattle)', home_score: null, away_score: null, finished: false },
    { id: 13, grupo: 'G', home_team: 'Bélgica', home_code: 'be', away_team: 'Egito', away_code: 'eg', match_date: '2026-06-15', match_time: '13:00:00', stadium: 'Gillette Stadium (Boston)', home_score: null, away_score: null, finished: false },
    { id: 14, grupo: 'G', home_team: 'Irã', home_code: 'ir', away_team: 'Nova Zelândia', away_code: 'nz', match_date: '2026-06-15', match_time: '16:00:00', stadium: 'MetLife Stadium (NY)', home_score: null, away_score: null, finished: false },
    { id: 15, grupo: 'H', home_team: 'Espanha', home_code: 'es', away_team: 'Cabo Verde', away_code: 'cv', match_date: '2026-06-15', match_time: '19:00:00', stadium: 'Hard Rock Stadium (Miami)', home_score: null, away_score: null, finished: false },
    { id: 16, grupo: 'H', home_team: 'Arábia Saudita', home_code: 'sa', away_team: 'Uruguai', away_code: 'uy', match_date: '2026-06-15', match_time: '22:00:00', stadium: 'AT&T Stadium (Dallas)', home_score: null, away_score: null, finished: false },
    { id: 17, grupo: 'I', home_team: 'França', home_code: 'fr', away_team: 'Senegal', away_code: 'sn', match_date: '2026-06-16', match_time: '13:00:00', stadium: 'Mercedes-Benz Stadium (Atlanta)', home_score: null, away_score: null, finished: false },
    { id: 18, grupo: 'I', home_team: 'Noruega', home_code: 'no', away_team: 'Honduras', away_code: 'hn', match_date: '2026-06-16', match_time: '16:00:00', stadium: 'NRG Stadium (Houston)', home_score: null, away_score: null, finished: false },
    { id: 19, grupo: 'J', home_team: 'Argentina', home_code: 'ar', away_team: 'Argélia', away_code: 'dz', match_date: '2026-06-16', match_time: '19:00:00', stadium: 'MetLife Stadium (NY)', home_score: null, away_score: null, finished: false },
    { id: 20, grupo: 'J', home_team: 'Áustria', home_code: 'at', away_team: 'Jordânia', away_code: 'jo', match_date: '2026-06-16', match_time: '22:00:00', stadium: 'SoFi Stadium (Los Angeles)', home_score: null, away_score: null, finished: false },
    { id: 21, grupo: 'K', home_team: 'Portugal', home_code: 'pt', away_team: 'Uzbequistão', away_code: 'uz', match_date: '2026-06-17', match_time: '14:00:00', stadium: 'BC Place (Vancouver)', home_score: null, away_score: null, finished: false },
    { id: 22, grupo: 'K', home_team: 'Colômbia', home_code: 'co', away_team: 'Chile', away_code: 'cl', match_date: '2026-06-17', match_time: '17:00:00', stadium: 'Lumen Field (Seattle)', home_score: null, away_score: null, finished: false },
    { id: 23, grupo: 'L', home_team: 'Inglaterra', home_code: 'gb', away_team: 'Croácia', away_code: 'hr', match_date: '2026-06-17', match_time: '20:00:00', stadium: 'Hard Rock Stadium (Miami)', home_score: null, away_score: null, finished: false },
    { id: 24, grupo: 'L', home_team: 'Gana', home_code: 'gh', away_team: 'Panamá', away_code: 'pa', match_date: '2026-06-17', match_time: '23:00:00', stadium: 'SoFi Stadium (Los Angeles)', home_score: null, away_score: null, finished: false }
  ];

  const defaultBoloes = [
    {
      id: 1,
      username: 'Jefferson',
      bettor_name: 'Marcos Rhian',
      photo_url: 'https://images.unsplash.com/photo-1518152006812-edab29b069ac?q=80&w=375&auto=format&fit=crop',
      created_at: '2026-06-11T12:00:00Z',
      bets_data: [
        { match_id: 1, home: 'México', away: 'África do Sul', bet_home: 2, bet_away: 1, real_home: 2, real_away: 1, pts: 5 },
        { match_id: 3, home: 'Canadá', away: 'Catar', bet_home: 2, bet_away: 0, real_home: 3, real_away: 0, pts: 3 },
        { match_id: 5, home: 'Brasil', away: 'Marrocos', bet_home: 3, bet_away: 1, real_home: null, real_away: null, pts: null }
      ]
    },
    {
      id: 2,
      username: 'Junior',
      bettor_name: 'Ana Cláudia',
      photo_url: 'https://images.unsplash.com/photo-1540747737956-37872ba68c5a?q=80&w=375&auto=format&fit=crop',
      created_at: '2026-06-11T14:30:00Z',
      bets_data: [
        { match_id: 1, home: 'México', away: 'África do Sul', bet_home: 1, bet_away: 1, real_home: 2, real_away: 1, pts: 0 },
        { match_id: 3, home: 'Canadá', away: 'Catar', bet_home: 3, bet_away: 0, real_home: 3, real_away: 0, pts: 5 },
        { match_id: 5, home: 'Brasil', away: 'Marrocos', bet_home: 2, bet_away: 0, real_home: null, real_away: null, pts: null }
      ]
    }
  ];

  if (!localStorage.getItem('copa26_confrontos')) {
    localStorage.setItem('copa26_confrontos', JSON.stringify(defaultConfrontos));
  }
  if (!localStorage.getItem('copa26_palpites')) {
    localStorage.setItem('copa26_palpites', JSON.stringify([]));
  }
  if (!localStorage.getItem('copa26_boloes')) {
    localStorage.setItem('copa26_boloes', JSON.stringify(defaultBoloes));
  }

  return {
    confrontos: JSON.parse(localStorage.getItem('copa26_confrontos')),
    palpites: JSON.parse(localStorage.getItem('copa26_palpites')),
    boloes: JSON.parse(localStorage.getItem('copa26_boloes')),
  };
};

const saveLocalDB = (db) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('copa26_confrontos', JSON.stringify(db.confrontos));
  localStorage.setItem('copa26_palpites', JSON.stringify(db.palpites));
  localStorage.setItem('copa26_boloes', JSON.stringify(db.boloes));
};

// Custom Mock Client implementing equivalent APIs
export const supabase = isSupabaseConfigured ? supabaseClient : {
  from: (table) => {
    const db = getLocalDB();
    return {
      select: () => {
        return {
          data: db[table] || [],
          error: null,
          eq: (field, val) => {
            const dataFiltered = (db[table] || []).filter(item => item[field] === val);
            return { data: dataFiltered, error: null };
          }
        };
      },
      insert: async (newData) => {
        const list = Array.isArray(newData) ? newData : [newData];
        list.forEach(item => {
          item.id = Date.now() + Math.floor(Math.random() * 1000);
          item.created_at = new Date().toISOString();
          db[table].push(item);
        });
        saveLocalDB(db);
        return { data: list, error: null };
      },
      upsert: async (upsertData) => {
        const items = Array.isArray(upsertData) ? upsertData : [upsertData];
        items.forEach(item => {
          const idx = db[table].findIndex(x => x.username === item.username && x.match_id === item.match_id);
          if (idx !== -1) {
            db[table][idx] = { ...db[table][idx], ...item };
          } else {
            item.id = Date.now() + Math.floor(Math.random() * 1000);
            db[table].push(item);
          }
        });
        saveLocalDB(db);
        return { data: items, error: null };
      }
    };
  }
};
