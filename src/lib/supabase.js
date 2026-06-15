import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase keys are provided, otherwise fallback to localMock
export const isSupabaseConfigured = !!(supabaseUrl && supabaseUrl.startsWith('http') && supabaseAnonKey);

let supabaseClient = null;

if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

// Default values
export const defaultConfrontos = [
    // Grupo A
    { id: 1, grupo: 'A', home_team: 'México', home_code: 'mx', away_team: 'África do Sul', away_code: 'za', match_date: '2026-06-11', match_time: '17:00:00', stadium: 'Estádio Azteca (CDMX)', home_score: 2, away_score: 1, finished: true },
    { id: 2, grupo: 'A', home_team: 'Coreia do Sul', home_code: 'kr', away_team: 'República Tcheca', away_code: 'cz', match_date: '2026-06-12', match_time: '14:00:00', stadium: 'BC Place (Vancouver)', home_score: null, away_score: null, finished: false },
    { id: 3, grupo: 'A', home_team: 'México', home_code: 'mx', away_team: 'Coreia do Sul', away_code: 'kr', match_date: '2026-06-15', match_time: '17:00:00', stadium: 'Estádio Azteca (CDMX)', home_score: null, away_score: null, finished: false },
    { id: 4, grupo: 'A', home_team: 'República Tcheca', home_code: 'cz', away_team: 'África do Sul', away_code: 'za', match_date: '2026-06-16', match_time: '14:00:00', stadium: 'BC Place (Vancouver)', home_score: null, away_score: null, finished: false },
    { id: 5, grupo: 'A', home_team: 'República Tcheca', home_code: 'cz', away_team: 'México', away_code: 'mx', match_date: '2026-06-20', match_time: '17:00:00', stadium: 'Estádio Azteca (CDMX)', home_score: null, away_score: null, finished: false },
    { id: 6, grupo: 'A', home_team: 'África do Sul', home_code: 'za', away_team: 'Coreia do Sul', away_code: 'kr', match_date: '2026-06-20', match_time: '14:00:00', stadium: 'BC Place (Vancouver)', home_score: null, away_score: null, finished: false },

    // Grupo B
    { id: 7, grupo: 'B', home_team: 'Canadá', home_code: 'ca', away_team: 'Bósnia e Herzegovina', away_code: 'ba', match_date: '2026-06-12', match_time: '16:00:00', stadium: 'BMO Field (Toronto)', home_score: 3, away_score: 0, finished: true },
    { id: 8, grupo: 'B', home_team: 'Catar', home_code: 'qa', away_team: 'Suíça', away_code: 'ch', match_date: '2026-06-12', match_time: '19:00:00', stadium: 'Gillette Stadium (Boston)', home_score: null, away_score: null, finished: false },
    { id: 9, grupo: 'B', home_team: 'Canadá', home_code: 'ca', away_team: 'Catar', away_code: 'qa', match_date: '2026-06-16', match_time: '16:00:00', stadium: 'BMO Field (Toronto)', home_score: null, away_score: null, finished: false },
    { id: 10, grupo: 'B', home_team: 'Suíça', home_code: 'ch', away_team: 'Bósnia e Herzegovina', away_code: 'ba', match_date: '2026-06-16', match_time: '19:00:00', stadium: 'Gillette Stadium (Boston)', home_score: null, away_score: null, finished: false },
    { id: 11, grupo: 'B', home_team: 'Suíça', home_code: 'ch', away_team: 'Canadá', away_code: 'ca', match_date: '2026-06-21', match_time: '16:00:00', stadium: 'BMO Field (Toronto)', home_score: null, away_score: null, finished: false },
    { id: 12, grupo: 'B', home_team: 'Bósnia e Herzegovina', home_code: 'ba', away_team: 'Catar', away_code: 'qa', match_date: '2026-06-21', match_time: '19:00:00', stadium: 'Gillette Stadium (Boston)', home_score: null, away_score: null, finished: false },

    // Grupo C
    { id: 13, grupo: 'C', home_team: 'Brasil', home_code: 'br', away_team: 'Marrocos', away_code: 'ma', match_date: '2026-06-13', match_time: '15:00:00', stadium: 'MetLife Stadium (NY)', home_score: null, away_score: null, finished: false },
    { id: 14, grupo: 'C', home_team: 'Haiti', home_code: 'ht', away_team: 'Escócia', away_code: 'gb-sct', match_date: '2026-06-13', match_time: '18:00:00', stadium: 'Hard Rock Stadium (Miami)', home_score: null, away_score: null, finished: false },
    { id: 15, grupo: 'C', home_team: 'Brasil', home_code: 'br', away_team: 'Haiti', away_code: 'ht', match_date: '2026-06-17', match_time: '15:00:00', stadium: 'MetLife Stadium (NY)', home_score: null, away_score: null, finished: false },
    { id: 16, grupo: 'C', home_team: 'Escócia', home_code: 'gb-sct', away_team: 'Marrocos', away_code: 'ma', match_date: '2026-06-17', match_time: '18:00:00', stadium: 'Hard Rock Stadium (Miami)', home_score: null, away_score: null, finished: false },
    { id: 17, grupo: 'C', home_team: 'Escócia', home_code: 'gb-sct', away_team: 'Brasil', away_code: 'br', match_date: '2026-06-22', match_time: '15:00:00', stadium: 'MetLife Stadium (NY)', home_score: null, away_score: null, finished: false },
    { id: 18, grupo: 'C', home_team: 'Marrocos', home_code: 'ma', away_team: 'Haiti', away_code: 'ht', match_date: '2026-06-22', match_time: '18:00:00', stadium: 'Hard Rock Stadium (Miami)', home_score: null, away_score: null, finished: false },

    // Grupo D
    { id: 19, grupo: 'D', home_team: 'Estados Unidos', home_code: 'us', away_team: 'Paraguai', away_code: 'py', match_date: '2026-06-12', match_time: '19:00:00', stadium: 'SoFi Stadium (Los Angeles)', home_score: null, away_score: null, finished: false },
    { id: 20, grupo: 'D', home_team: 'Austrália', home_code: 'au', away_team: 'Turquia', away_code: 'tr', match_date: '2026-06-13', match_time: '21:00:00', stadium: 'Levi\'s Stadium (San Francisco)', home_score: null, away_score: null, finished: false },
    { id: 21, grupo: 'D', home_team: 'Estados Unidos', home_code: 'us', away_team: 'Austrália', away_code: 'au', match_date: '2026-06-17', match_time: '19:00:00', stadium: 'SoFi Stadium (Los Angeles)', home_score: null, away_score: null, finished: false },
    { id: 22, grupo: 'D', home_team: 'Turquia', home_code: 'tr', away_team: 'Paraguai', away_code: 'py', match_date: '2026-06-18', match_time: '21:00:00', stadium: 'Levi\'s Stadium (San Francisco)', home_score: null, away_score: null, finished: false },
    { id: 23, grupo: 'D', home_team: 'Turquia', home_code: 'tr', away_team: 'Estados Unidos', away_code: 'us', match_date: '2026-06-23', match_time: '19:00:00', stadium: 'SoFi Stadium (Los Angeles)', home_score: null, away_score: null, finished: false },
    { id: 24, grupo: 'D', home_team: 'Paraguai', home_code: 'py', away_team: 'Austrália', away_code: 'au', match_date: '2026-06-23', match_time: '21:00:00', stadium: 'Levi\'s Stadium (San Francisco)', home_score: null, away_score: null, finished: false },

    // Grupo E
    { id: 25, grupo: 'E', home_team: 'Alemanha', home_code: 'de', away_team: 'Curaçao', away_code: 'cw', match_date: '2026-06-14', match_time: '13:00:00', stadium: 'Mercedes-Benz Stadium (Atlanta)', home_score: null, away_score: null, finished: false },
    { id: 26, grupo: 'E', home_team: 'Costa do Marfim', home_code: 'ci', away_team: 'Equador', away_code: 'ec', match_date: '2026-06-14', match_time: '16:00:00', stadium: 'Lincoln Financial Field (Philadelphia)', home_score: null, away_score: null, finished: false },
    { id: 27, grupo: 'E', home_team: 'Alemanha', home_code: 'de', away_team: 'Costa do Marfim', away_code: 'ci', match_date: '2026-06-18', match_time: '13:00:00', stadium: 'Mercedes-Benz Stadium (Atlanta)', home_score: null, away_score: null, finished: false },
    { id: 28, grupo: 'E', home_team: 'Equador', home_code: 'ec', away_team: 'Curaçao', away_code: 'cw', match_date: '2026-06-19', match_time: '16:00:00', stadium: 'Lincoln Financial Field (Philadelphia)', home_score: null, away_score: null, finished: false },
    { id: 29, grupo: 'E', home_team: 'Equador', home_code: 'ec', away_team: 'Alemanha', away_code: 'de', match_date: '2026-06-24', match_time: '13:00:00', stadium: 'Mercedes-Benz Stadium (Atlanta)', home_score: null, away_score: null, finished: false },
    { id: 30, grupo: 'E', home_team: 'Curaçao', home_code: 'cw', away_team: 'Costa do Marfim', away_code: 'ci', match_date: '2026-06-24', match_time: '16:00:00', stadium: 'Lincoln Financial Field (Philadelphia)', home_score: null, away_score: null, finished: false },

    // Grupo F
    { id: 31, grupo: 'F', home_team: 'Holanda', home_code: 'nl', away_team: 'Japão', away_code: 'jp', match_date: '2026-06-14', match_time: '19:00:00', stadium: 'Arrowhead Stadium (Kansas City)', home_score: null, away_score: null, finished: false },
    { id: 32, grupo: 'F', home_team: 'Suécia', home_code: 'se', away_team: 'Tunísia', away_code: 'tn', match_date: '2026-06-14', match_time: '22:00:00', stadium: 'Lumen Field (Seattle)', home_score: null, away_score: null, finished: false },
    { id: 33, grupo: 'F', home_team: 'Holanda', home_code: 'nl', away_team: 'Suécia', away_code: 'se', match_date: '2026-06-19', match_time: '19:00:00', stadium: 'Arrowhead Stadium (Kansas City)', home_score: null, away_score: null, finished: false },
    { id: 34, grupo: 'F', home_team: 'Tunísia', home_code: 'tn', away_team: 'Japão', away_code: 'jp', match_date: '2026-06-19', match_time: '22:00:00', stadium: 'Lumen Field (Seattle)', home_score: null, away_score: null, finished: false },
    { id: 35, grupo: 'F', home_team: 'Tunísia', home_code: 'tn', away_team: 'Holanda', away_code: 'nl', match_date: '2026-06-25', match_time: '19:00:00', stadium: 'Arrowhead Stadium (Kansas City)', home_score: null, away_score: null, finished: false },
    { id: 36, grupo: 'F', home_team: 'Japão', home_code: 'jp', away_team: 'Suécia', away_code: 'se', match_date: '2026-06-25', match_time: '22:00:00', stadium: 'Lumen Field (Seattle)', home_score: null, away_score: null, finished: false },

    // Grupo G
    { id: 37, grupo: 'G', home_team: 'Bélgica', home_code: 'be', away_team: 'Egito', away_code: 'eg', match_date: '2026-06-15', match_time: '13:00:00', stadium: 'Gillette Stadium (Boston)', home_score: null, away_score: null, finished: false },
    { id: 38, grupo: 'G', home_team: 'Irã', home_code: 'ir', away_team: 'Nova Zelândia', away_code: 'nz', match_date: '2026-06-15', match_time: '16:00:00', stadium: 'MetLife Stadium (NY)', home_score: null, away_score: null, finished: false },
    { id: 39, grupo: 'G', home_team: 'Bélgica', home_code: 'be', away_team: 'Irã', away_code: 'ir', match_date: '2026-06-20', match_time: '13:00:00', stadium: 'Gillette Stadium (Boston)', home_score: null, away_score: null, finished: false },
    { id: 40, grupo: 'G', home_team: 'Nova Zelândia', home_code: 'nz', away_team: 'Egito', away_code: 'eg', match_date: '2026-06-20', match_time: '16:00:00', stadium: 'MetLife Stadium (NY)', home_score: null, away_score: null, finished: false },
    { id: 41, grupo: 'G', home_team: 'Nova Zelândia', home_code: 'nz', away_team: 'Bélgica', away_code: 'be', match_date: '2026-06-26', match_time: '13:00:00', stadium: 'Gillette Stadium (Boston)', home_score: null, away_score: null, finished: false },
    { id: 42, grupo: 'G', home_team: 'Egito', home_code: 'eg', away_team: 'Irã', away_code: 'ir', match_date: '2026-06-26', match_time: '16:00:00', stadium: 'MetLife Stadium (NY)', home_score: null, away_score: null, finished: false },

    // Grupo H
    { id: 43, grupo: 'H', home_team: 'Espanha', home_code: 'es', away_team: 'Cabo Verde', away_code: 'cv', match_date: '2026-06-15', match_time: '19:00:00', stadium: 'Hard Rock Stadium (Miami)', home_score: null, away_score: null, finished: false },
    { id: 44, grupo: 'H', home_team: 'Arábia Saudita', home_code: 'sa', away_team: 'Uruguai', away_code: 'uy', match_date: '2026-06-15', match_time: '22:00:00', stadium: 'AT&T Stadium (Dallas)', home_score: null, away_score: null, finished: false },
    { id: 45, grupo: 'H', home_team: 'Espanha', home_code: 'es', away_team: 'Arábia Saudita', away_code: 'sa', match_date: '2026-06-20', match_time: '19:00:00', stadium: 'Hard Rock Stadium (Miami)', home_score: null, away_score: null, finished: false },
    { id: 46, grupo: 'H', home_team: 'Uruguai', home_code: 'uy', away_team: 'Cabo Verde', away_code: 'cv', match_date: '2026-06-21', match_time: '22:00:00', stadium: 'AT&T Stadium (Dallas)', home_score: null, away_score: null, finished: false },
    { id: 47, grupo: 'H', home_team: 'Uruguai', home_code: 'uy', away_team: 'Espanha', away_code: 'es', match_date: '2026-06-26', match_time: '19:00:00', stadium: 'Hard Rock Stadium (Miami)', home_score: null, away_score: null, finished: false },
    { id: 48, grupo: 'H', home_team: 'Cabo Verde', home_code: 'cv', away_team: 'Arábia Saudita', away_code: 'sa', match_date: '2026-06-26', match_time: '22:00:00', stadium: 'AT&T Stadium (Dallas)', home_score: null, away_score: null, finished: false },

    // Grupo I
    { id: 49, grupo: 'I', home_team: 'França', home_code: 'fr', away_team: 'Senegal', away_code: 'sn', match_date: '2026-06-16', match_time: '13:00:00', stadium: 'Mercedes-Benz Stadium (Atlanta)', home_score: null, away_score: null, finished: false },
    { id: 50, grupo: 'I', home_team: 'Iraque', home_code: 'iq', away_team: 'Noruega', away_code: 'no', match_date: '2026-06-16', match_time: '16:00:00', stadium: 'NRG Stadium (Houston)', home_score: null, away_score: null, finished: false },
    { id: 51, grupo: 'I', home_team: 'França', home_code: 'fr', away_team: 'Iraque', away_code: 'iq', match_date: '2026-06-21', match_time: '13:00:00', stadium: 'Mercedes-Benz Stadium (Atlanta)', home_score: null, away_score: null, finished: false },
    { id: 52, grupo: 'I', home_team: 'Noruega', home_code: 'no', away_team: 'Senegal', away_code: 'sn', match_date: '2026-06-22', match_time: '16:00:00', stadium: 'NRG Stadium (Houston)', home_score: null, away_score: null, finished: false },
    { id: 53, grupo: 'I', home_team: 'Noruega', home_code: 'no', away_team: 'França', away_code: 'fr', match_date: '2026-06-27', match_time: '13:00:00', stadium: 'Mercedes-Benz Stadium (Atlanta)', home_score: null, away_score: null, finished: false },
    { id: 54, grupo: 'I', home_team: 'Senegal', home_code: 'sn', away_team: 'Iraque', away_code: 'iq', match_date: '2026-06-27', match_time: '16:00:00', stadium: 'NRG Stadium (Houston)', home_score: null, away_score: null, finished: false },

    // Grupo J
    { id: 55, grupo: 'J', home_team: 'Argentina', home_code: 'ar', away_team: 'Argélia', away_code: 'dz', match_date: '2026-06-16', match_time: '19:00:00', stadium: 'MetLife Stadium (NY)', home_score: null, away_score: null, finished: false },
    { id: 56, grupo: 'J', home_team: 'Áustria', home_code: 'at', away_team: 'Jordânia', away_code: 'jo', match_date: '2026-06-16', match_time: '22:00:00', stadium: 'SoFi Stadium (Los Angeles)', home_score: null, away_score: null, finished: false },
    { id: 57, grupo: 'J', home_team: 'Argentina', home_code: 'ar', away_team: 'Áustria', away_code: 'at', match_date: '2026-06-21', match_time: '19:00:00', stadium: 'MetLife Stadium (NY)', home_score: null, away_score: null, finished: false },
    { id: 58, grupo: 'J', home_team: 'Jordânia', home_code: 'jo', away_team: 'Argélia', away_code: 'dz', match_date: '2026-06-22', match_time: '22:00:00', stadium: 'SoFi Stadium (Los Angeles)', home_score: null, away_score: null, finished: false },
    { id: 59, grupo: 'J', home_team: 'Jordânia', home_code: 'jo', away_team: 'Argentina', away_code: 'ar', match_date: '2026-06-27', match_time: '19:00:00', stadium: 'MetLife Stadium (NY)', home_score: null, away_score: null, finished: false },
    { id: 60, grupo: 'J', home_team: 'Argélia', home_code: 'dz', away_team: 'Áustria', away_code: 'at', match_date: '2026-06-27', match_time: '22:00:00', stadium: 'SoFi Stadium (Los Angeles)', home_score: null, away_score: null, finished: false },

    // Grupo K
    { id: 61, grupo: 'K', home_team: 'Portugal', home_code: 'pt', away_team: 'Congo', away_code: 'cg', match_date: '2026-06-17', match_time: '14:00:00', stadium: 'BC Place (Vancouver)', home_score: null, away_score: null, finished: false },
    { id: 62, grupo: 'K', home_team: 'Uzbequistão', home_code: 'uz', away_team: 'Colômbia', away_code: 'co', match_date: '2026-06-17', match_time: '17:00:00', stadium: 'Lumen Field (Seattle)', home_score: null, away_score: null, finished: false },
    { id: 63, grupo: 'K', home_team: 'Portugal', home_code: 'pt', away_team: 'Uzbequistão', away_code: 'uz', match_date: '2026-06-22', match_time: '14:00:00', stadium: 'BC Place (Vancouver)', home_score: null, away_score: null, finished: false },
    { id: 64, grupo: 'K', home_team: 'Colômbia', home_code: 'co', away_team: 'Congo', away_code: 'cg', match_date: '2026-06-23', match_time: '17:00:00', stadium: 'Lumen Field (Seattle)', home_score: null, away_score: null, finished: false },
    { id: 65, grupo: 'K', home_team: 'Colômbia', home_code: 'co', away_team: 'Portugal', away_code: 'pt', match_date: '2026-06-27', match_time: '14:00:00', stadium: 'BC Place (Vancouver)', home_score: null, away_score: null, finished: false },
    { id: 66, grupo: 'K', home_team: 'Congo', home_code: 'cg', away_team: 'Uzbequistão', away_code: 'uz', match_date: '2026-06-27', match_time: '17:00:00', stadium: 'Lumen Field (Seattle)', home_score: null, away_score: null, finished: false },

    // Grupo L
    { id: 67, grupo: 'L', home_team: 'Inglaterra', home_code: 'gb-eng', away_team: 'Croácia', away_code: 'hr', match_date: '2026-06-17', match_time: '20:00:00', stadium: 'Hard Rock Stadium (Miami)', home_score: null, away_score: null, finished: false },
    { id: 68, grupo: 'L', home_team: 'Gana', home_code: 'gh', away_team: 'Panamá', away_code: 'pa', match_date: '2026-06-17', match_time: '23:00:00', stadium: 'SoFi Stadium (Los Angeles)', home_score: null, away_score: null, finished: false },
    { id: 69, grupo: 'L', home_team: 'Inglaterra', home_code: 'gb-eng', away_team: 'Gana', away_code: 'gh', match_date: '2026-06-22', match_time: '20:00:00', stadium: 'Hard Rock Stadium (Miami)', home_score: null, away_score: null, finished: false },
    { id: 70, grupo: 'L', home_team: 'Panamá', home_code: 'pa', away_team: 'Croácia', away_code: 'hr', match_date: '2026-06-23', match_time: '23:00:00', stadium: 'SoFi Stadium (Los Angeles)', home_score: null, away_score: null, finished: false },
    { id: 71, grupo: 'L', home_team: 'Panamá', home_code: 'pa', away_team: 'Inglaterra', away_code: 'gb-eng', match_date: '2026-06-27', match_time: '20:00:00', stadium: 'Hard Rock Stadium (Miami)', home_score: null, away_score: null, finished: false },
    { id: 72, grupo: 'L', home_team: 'Croácia', home_code: 'hr', away_team: 'Gana', away_code: 'gh', match_date: '2026-06-27', match_time: '23:00:00', stadium: 'SoFi Stadium (Los Angeles)', home_score: null, away_score: null, finished: false }
];

// In-Memory/LocalStorage Database for instant preview
const getLocalDB = () => {
  if (typeof window === 'undefined') return { confrontos: [], palpites: [], boloes: [] };

  const defaultBoloes = [];

  // Robust migration/verification of local mock database to ensure all 72 World Cup 2026 matches are present
  let needsReset = false;
  const storedConfs = localStorage.getItem('copa26_confrontos');
  if (!storedConfs) {
    needsReset = true;
  } else {
    try {
      const parsed = JSON.parse(storedConfs) || [];
      const hasItaly = parsed.some(c => c.home_team === 'Itália' || c.away_team === 'Itália');
      if (parsed.length < 72 || hasItaly) {
        needsReset = true;
      }
    } catch (e) {
      needsReset = true;
    }
  }

  if (needsReset) {
    localStorage.setItem('copa26_confrontos', JSON.stringify(defaultConfrontos));
    localStorage.setItem('copa26_palpites', JSON.stringify([]));
    localStorage.setItem('copa26_boloes', JSON.stringify([]));
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
      },
      update: (updatedFields) => {
        return {
          eq: async (field, val) => {
            const list = db[table] || [];
            list.forEach((item, idx) => {
              if (item[field] === val) {
                list[idx] = { ...item, ...updatedFields };
              }
            });
            saveLocalDB(db);
            return { data: list, error: null };
          }
        };
      },
      delete: () => {
        return {
          eq: async (field, val) => {
            const list = db[table] || [];
            db[table] = list.filter(item => item[field] !== val);
            saveLocalDB(db);
            return { data: db[table], error: null };
          }
        };
      }
    };
  }
};

export const resetDatabase = async () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('copa26_confrontos');
    localStorage.removeItem('copa26_palpites');
    localStorage.removeItem('copa26_boloes');
  }

  if (isSupabaseConfigured && supabaseClient) {
    try {
      // Clear tables in Supabase
      await supabaseClient.from('palpites').delete().gt('id', 0);
      await supabaseClient.from('boloes').delete().gt('id', 0);
      await supabaseClient.from('confrontos').delete().gt('id', 0);

      // Reseed confrontos in Supabase
      const { error } = await supabaseClient.from('confrontos').insert(defaultConfrontos);
      if (error) throw error;
    } catch (e) {
      console.error('Erro ao resetar banco Supabase:', e);
      throw e;
    }
  }
};
