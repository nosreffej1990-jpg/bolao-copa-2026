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
    { id: 72, grupo: 'L', home_team: 'Croácia', home_code: 'hr', away_team: 'Gana', away_code: 'gh', match_date: '2026-06-27', match_time: '23:00:00', stadium: 'SoFi Stadium (Los Angeles)', home_score: null, away_score: null, finished: false },
    // Mata-mata
    { id: 73, grupo: 'R32', home_team: 'Runner-up Group A', home_code: 'placeholder', away_team: 'Runner-up Group B', away_code: 'placeholder', match_date: '2026-06-28', match_time: '12:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 74, grupo: 'R32', home_team: 'Winner Group E', home_code: 'placeholder', away_team: '3rd Group A/B/C/D/F', away_code: 'placeholder', match_date: '2026-06-29', match_time: '16:30:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 75, grupo: 'R32', home_team: 'Winner Group F', home_code: 'placeholder', away_team: 'Runner-up Group C', away_code: 'placeholder', match_date: '2026-06-29', match_time: '19:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 76, grupo: 'R32', home_team: 'Winner Group C', home_code: 'placeholder', away_team: 'Runner-up Group F', away_code: 'placeholder', match_date: '2026-06-29', match_time: '12:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 77, grupo: 'R32', home_team: 'Winner Group I', home_code: 'placeholder', away_team: '3rd Group C/D/F/G/H', away_code: 'placeholder', match_date: '2026-06-30', match_time: '17:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 78, grupo: 'R32', home_team: 'Runner-up Group E', home_code: 'placeholder', away_team: 'Runner-up Group I', away_code: 'placeholder', match_date: '2026-06-30', match_time: '12:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 79, grupo: 'R32', home_team: 'Winner Group A', home_code: 'placeholder', away_team: '3rd Group C/E/F/H/I', away_code: 'placeholder', match_date: '2026-06-30', match_time: '19:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 80, grupo: 'R32', home_team: 'Winner Group L', home_code: 'placeholder', away_team: '3rd Group E/H/I/J/K', away_code: 'placeholder', match_date: '2026-07-01', match_time: '12:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 81, grupo: 'R32', home_team: 'Winner Group D', home_code: 'placeholder', away_team: '3rd Group B/E/F/I/J', away_code: 'placeholder', match_date: '2026-07-01', match_time: '17:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 82, grupo: 'R32', home_team: 'Winner Group G', home_code: 'placeholder', away_team: '3rd Group A/E/H/I/J', away_code: 'placeholder', match_date: '2026-07-01', match_time: '13:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 83, grupo: 'R32', home_team: 'Runner-up Group K', home_code: 'placeholder', away_team: 'Runner-up Group L', away_code: 'placeholder', match_date: '2026-07-02', match_time: '19:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 84, grupo: 'R32', home_team: 'Winner Group H', home_code: 'placeholder', away_team: 'Runner-up Group J', away_code: 'placeholder', match_date: '2026-07-02', match_time: '12:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 85, grupo: 'R32', home_team: 'Winner Group B', home_code: 'placeholder', away_team: '3rd Group E/F/G/I/J', away_code: 'placeholder', match_date: '2026-07-02', match_time: '20:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 86, grupo: 'R32', home_team: 'Winner Group J', home_code: 'placeholder', away_team: 'Runner-up Group H', away_code: 'placeholder', match_date: '2026-07-03', match_time: '18:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 87, grupo: 'R32', home_team: 'Winner Group K', home_code: 'placeholder', away_team: '3rd Group D/E/I/J/L', away_code: 'placeholder', match_date: '2026-07-03', match_time: '20:30:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 88, grupo: 'R32', home_team: 'Runner-up Group D', home_code: 'placeholder', away_team: 'Runner-up Group G', away_code: 'placeholder', match_date: '2026-07-03', match_time: '13:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 89, grupo: 'R16', home_team: 'Winner Match 74', home_code: 'placeholder', away_team: 'Winner Match 77', away_code: 'placeholder', match_date: '2026-07-04', match_time: '17:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 90, grupo: 'R16', home_team: 'Winner Match 73', home_code: 'placeholder', away_team: 'Winner Match 75', away_code: 'placeholder', match_date: '2026-07-04', match_time: '12:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 91, grupo: 'R16', home_team: 'Winner Match 76', home_code: 'placeholder', away_team: 'Winner Match 78', away_code: 'placeholder', match_date: '2026-07-05', match_time: '16:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 92, grupo: 'R16', home_team: 'Winner Match 79', home_code: 'placeholder', away_team: 'Winner Match 80', away_code: 'placeholder', match_date: '2026-07-05', match_time: '18:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 93, grupo: 'R16', home_team: 'Winner Match 83', home_code: 'placeholder', away_team: 'Winner Match 84', away_code: 'placeholder', match_date: '2026-07-06', match_time: '14:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 94, grupo: 'R16', home_team: 'Winner Match 81', home_code: 'placeholder', away_team: 'Winner Match 82', away_code: 'placeholder', match_date: '2026-07-06', match_time: '17:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 95, grupo: 'R16', home_team: 'Winner Match 86', home_code: 'placeholder', away_team: 'Winner Match 88', away_code: 'placeholder', match_date: '2026-07-07', match_time: '12:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 96, grupo: 'R16', home_team: 'Winner Match 85', home_code: 'placeholder', away_team: 'Winner Match 87', away_code: 'placeholder', match_date: '2026-07-07', match_time: '13:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 97, grupo: 'QF', home_team: 'Winner Match 89', home_code: 'placeholder', away_team: 'Winner Match 90', away_code: 'placeholder', match_date: '2026-07-09', match_time: '16:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 98, grupo: 'QF', home_team: 'Winner Match 93', home_code: 'placeholder', away_team: 'Winner Match 94', away_code: 'placeholder', match_date: '2026-07-10', match_time: '12:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 99, grupo: 'QF', home_team: 'Winner Match 91', home_code: 'placeholder', away_team: 'Winner Match 92', away_code: 'placeholder', match_date: '2026-07-11', match_time: '17:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 100, grupo: 'QF', home_team: 'Winner Match 95', home_code: 'placeholder', away_team: 'Winner Match 96', away_code: 'placeholder', match_date: '2026-07-11', match_time: '20:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 101, grupo: 'SF', home_team: 'Winner Match 97', home_code: 'placeholder', away_team: 'Winner Match 98', away_code: 'placeholder', match_date: '2026-07-14', match_time: '14:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 102, grupo: 'SF', home_team: 'Winner Match 99', home_code: 'placeholder', away_team: 'Winner Match 100', away_code: 'placeholder', match_date: '2026-07-15', match_time: '15:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 103, grupo: 'THIRD', home_team: 'Loser Match 101', home_code: 'placeholder', away_team: 'Loser Match 102', away_code: 'placeholder', match_date: '2026-07-18', match_time: '17:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false },
    { id: 104, grupo: 'FINAL', home_team: 'Winner Match 101', home_code: 'placeholder', away_team: 'Winner Match 102', away_code: 'placeholder', match_date: '2026-07-19', match_time: '15:00:00', stadium: 'A definir', home_score: null, away_score: null, finished: false }
];

// Seed de Usuários Padrão para Banco Local
export const defaultUsuarios = [
  { id: 1, username: 'Jefferson', password: '060199', role: 'Admin', approved: true, approved_r32: true, approved_r16: true, approved_qf: true, approved_sf: true, approved_final: true },
  { id: 2, username: 'Junior', password: '062026', role: 'Moderador', approved: true, approved_r32: true, approved_r16: true, approved_qf: true, approved_sf: true, approved_final: true }
];

const generateMockBetsData = (seedValue) => {
  return defaultConfrontos.map(match => {
    if (match.id > 72) return null; // Apenas fase de grupos (1 a 72)
    
    // Gerador determinístico simples de palpites
    const homeScore = (match.id + seedValue) % 4;
    const awayScore = (match.id * seedValue + 1) % 3;
    
    const isFinished = match.home_score !== null && match.home_score !== undefined;
    const realHome = isFinished ? match.home_score : null;
    const realAway = isFinished ? match.away_score : null;
    
    let pts = 0;
    if (isFinished && realHome !== null && realAway !== null) {
      const rHome = parseInt(realHome);
      const rAway = parseInt(realAway);
      if (homeScore === rHome && awayScore === rAway) {
        pts = 3;
      } else if ((homeScore > awayScore && rHome > rAway) || 
                 (homeScore < awayScore && rHome < rAway) || 
                 (homeScore === awayScore && rHome === rAway)) {
        pts = 1;
      }
    }
    
    return {
      match_id: match.id,
      home: match.home_team,
      away: match.away_team,
      bet_home: homeScore,
      bet_away: awayScore,
      real_home: realHome,
      real_away: realAway,
      pts: pts
    };
  }).filter(Boolean);
};

export const defaultBoloes = [
  {
    id: 1,
    username: 'Jefferson',
    bettor_name: 'Pedro Silva',
    photo_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=375&auto=format&fit=crop',
    bets_data: generateMockBetsData(2)
  },
  {
    id: 2,
    username: 'Jefferson',
    bettor_name: 'Lucas Souza',
    photo_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=375&auto=format&fit=crop',
    bets_data: generateMockBetsData(5)
  },
  {
    id: 3,
    username: 'Junior',
    bettor_name: 'Mariana Costa',
    photo_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=375&auto=format&fit=crop',
    bets_data: generateMockBetsData(7)
  }
];

export const defaultConfig = [
  { key: 'mata_mata_public', value: 'false' },
  { key: 'allow_register', value: 'true' },
  { key: 'paqueta_title', value: 'ESCOLHEU TUDO CERTO OU SAIU CHUTANDO IGUAL O PAQUETÁ? 🇧🇷⚽' },
  { key: 'paqueta_body', value: 'Seus palpites do mata-mata foram processados com sucesso no banco de dados e o seu comprovante PDF foi gerado automaticamente! Boa sorte no Bolão da Copa 2026.' }
];

// In-Memory/LocalStorage Database for instant preview
const getLocalDB = () => {
  if (typeof window === 'undefined') return { confrontos: [], palpites: [], boloes: [], usuarios: [], config: [] };

  // Robust migration/verification of local mock database to ensure all 104 World Cup 2026 matches are present
  let needsReset = false;
  const storedConfs = localStorage.getItem('copa26_confrontos');
  if (!storedConfs) {
    needsReset = true;
  } else {
    try {
      const parsed = JSON.parse(storedConfs) || [];
      const hasItaly = parsed.some(c => c.home_team === 'Itália' || c.away_team === 'Itália');
      if (parsed.length < 104 || hasItaly) {
        needsReset = true;
      }
    } catch (e) {
      needsReset = true;
    }
  }

  if (needsReset) {
    localStorage.setItem('copa26_confrontos', JSON.stringify(defaultConfrontos));
    localStorage.setItem('copa26_palpites', JSON.stringify([]));
    localStorage.setItem('copa26_boloes', JSON.stringify(defaultBoloes));
    localStorage.setItem('copa26_usuarios', JSON.stringify(defaultUsuarios));
    localStorage.setItem('copa26_config', JSON.stringify(defaultConfig));
  }

  if (!localStorage.getItem('copa26_palpites')) {
    localStorage.setItem('copa26_palpites', JSON.stringify([]));
  }
  if (!localStorage.getItem('copa26_boloes')) {
    localStorage.setItem('copa26_boloes', JSON.stringify(defaultBoloes));
  }
  if (!localStorage.getItem('copa26_usuarios')) {
    localStorage.setItem('copa26_usuarios', JSON.stringify(defaultUsuarios));
  }
  if (!localStorage.getItem('copa26_config')) {
    localStorage.setItem('copa26_config', JSON.stringify(defaultConfig));
  }

  return {
    confrontos: JSON.parse(localStorage.getItem('copa26_confrontos')),
    palpites: JSON.parse(localStorage.getItem('copa26_palpites')),
    boloes: JSON.parse(localStorage.getItem('copa26_boloes')),
    usuarios: JSON.parse(localStorage.getItem('copa26_usuarios')) || defaultUsuarios,
    config: JSON.parse(localStorage.getItem('copa26_config')) || defaultConfig,
  };
};

const saveLocalDB = (db) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('copa26_confrontos', JSON.stringify(db.confrontos));
  localStorage.setItem('copa26_palpites', JSON.stringify(db.palpites));
  localStorage.setItem('copa26_boloes', JSON.stringify(db.boloes));
  localStorage.setItem('copa26_usuarios', JSON.stringify(db.usuarios || defaultUsuarios));
  localStorage.setItem('copa26_config', JSON.stringify(db.config || defaultConfig));
};

// Custom Mock Client implementing equivalent APIs
export const supabase = isSupabaseConfigured ? supabaseClient : {
  from: (table) => {
    const db = getLocalDB();
    return {
      select: () => {
        const result = {
          data: db[table] || [],
          error: null,
          eq: (field, val) => {
            const dataFiltered = (db[table] || []).filter(item => item[field] === val);
            return { data: dataFiltered, error: null };
          },
          order: (field, options) => {
            // Keep it simple, return data
            return { data: db[table] || [], error: null };
          }
        };
        return result;
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
          let idx = -1;
          if (table === 'config') {
            idx = db[table].findIndex(x => x.key === item.key);
          } else {
            idx = db[table].findIndex(x => x.username === item.username && x.match_id === item.match_id);
          }

          if (idx !== -1) {
            db[table][idx] = { ...db[table][idx], ...item };
          } else {
            if (table !== 'config') {
              item.id = Date.now() + Math.floor(Math.random() * 1000);
            }
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
    localStorage.removeItem('copa26_usuarios');
    localStorage.removeItem('copa26_config');
  }

  if (isSupabaseConfigured && supabaseClient) {
    try {
      // Clear tables in Supabase
      await supabaseClient.from('palpites').delete().gt('id', 0);
      await supabaseClient.from('boloes').delete().gt('id', 0);
      await supabaseClient.from('confrontos').delete().gt('id', 0);
      await supabaseClient.from('usuarios').delete().gt('id', 0);
      try {
        await supabaseClient.from('config').delete().neq('key', '');
      } catch (err) {
        // silently catch if config table not migrated yet
      }

      // Reseed confrontos in Supabase
      const { error } = await supabaseClient.from('confrontos').insert(defaultConfrontos);
      if (error) throw error;

      // Reseed config in Supabase
      try {
        await supabaseClient.from('config').insert(defaultConfig);
      } catch (err) {
        // silently catch
      }

      // Reseed users in Supabase
      const { error: err2 } = await supabaseClient.from('usuarios').insert([
        { username: 'Jefferson', password: '060199', role: 'Admin', approved: true, approved_r32: true, approved_r16: true, approved_qf: true, approved_sf: true, approved_final: true },
        { username: 'Junior', password: '062026', role: 'Moderador', approved: true, approved_r32: true, approved_r16: true, approved_qf: true, approved_sf: true, approved_final: true }
      ]);
      if (err2) throw err2;
    } catch (e) {
      console.error('Erro ao resetar banco Supabase:', e);
      throw e;
    }
  }
};
