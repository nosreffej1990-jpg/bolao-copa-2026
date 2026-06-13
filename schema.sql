-- SQL Schema para o Banco de Dados do Supabase
-- Rodar este script no Painel do Supabase -> SQL Editor

-- 1. Tabela de Confrontos (Jogos da Copa 2026)
CREATE TABLE IF NOT EXISTS public.confrontos (
    id SERIAL PRIMARY KEY,
    grupo VARCHAR(2) NOT NULL, -- A, B, C, D, E, F, G, H, I, J, K, L
    home_team VARCHAR(50) NOT NULL,
    home_code VARCHAR(10) NOT NULL, -- Código ISO da bandeira
    away_team VARCHAR(50) NOT NULL,
    away_code VARCHAR(10) NOT NULL, -- Código ISO da bandeira
    match_date DATE NOT NULL,
    match_time TIME NOT NULL,
    stadium VARCHAR(100),
    home_score INT DEFAULT NULL, -- Placar oficial do jogo
    away_score INT DEFAULT NULL, -- Placar oficial do jogo
    finished BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS (Row Level Security) na tabela confrontos
ALTER TABLE public.confrontos ENABLE ROW LEVEL SECURITY;

-- Permissões para confrontos (Leitura pública, escrita apenas para Admin)
CREATE POLICY "Leitura pública de confrontos" ON public.confrontos FOR SELECT USING (true);
CREATE POLICY "Escrita por admin de confrontos" ON public.confrontos FOR ALL USING (true);

-- 2. Tabela de Palpites dos Usuários
CREATE TABLE IF NOT EXISTS public.palpites (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL, -- Jefferson ou Junior
    match_id INT REFERENCES public.confrontos(id) ON DELETE CASCADE,
    home_score INT NOT NULL,
    away_score INT NOT NULL,
    points INT DEFAULT 0, -- Calculado com base no placar oficial
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(username, match_id)
);

ALTER TABLE public.palpites ENABLE ROW LEVEL SECURITY;

-- Permissões para palpites (Leitura pública, inserção/edição pelo próprio usuário)
CREATE POLICY "Acesso total de palpites" ON public.palpites FOR ALL USING (true);

-- 3. Tabela de Bolões (Uploads de Fotos dos Bolões)
CREATE TABLE IF NOT EXISTS public.boloes (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL, -- Quem fez o upload
    bettor_name VARCHAR(100) NOT NULL, -- Nome do apostador do Bolão
    photo_url TEXT, -- Link da imagem salva como Base64 ou URL do Storage
    bets_data JSONB, -- Lista de apostas lidas por OCR
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.boloes ENABLE ROW LEVEL SECURITY;

-- Permissões para bolões
CREATE POLICY "Acesso total de boloes" ON public.boloes FOR ALL USING (true);

-- 4. Inserção de dados dos confrontos oficiais (Fase de Grupos Completa da Copa 2026 - 72 Jogos)
INSERT INTO public.confrontos (id, grupo, home_team, home_code, away_team, away_code, match_date, match_time, stadium, home_score, away_score, finished) VALUES
-- Grupo A
(1, 'A', 'México', 'mx', 'África do Sul', 'za', '2026-06-11', '17:00:00', 'Estádio Azteca (CDMX)', 2, 1, true),
(2, 'A', 'Coreia do Sul', 'kr', 'República Tcheca', 'cz', '2026-06-12', '14:00:00', 'BC Place (Vancouver)', NULL, NULL, false),
(3, 'A', 'México', 'mx', 'Coreia do Sul', 'kr', '2026-06-15', '17:00:00', 'Estádio Azteca (CDMX)', NULL, NULL, false),
(4, 'A', 'República Tcheca', 'cz', 'África do Sul', 'za', '2026-06-16', '14:00:00', 'BC Place (Vancouver)', NULL, NULL, false),
(5, 'A', 'República Tcheca', 'cz', 'México', 'mx', '2026-06-20', '17:00:00', 'Estádio Azteca (CDMX)', NULL, NULL, false),
(6, 'A', 'África do Sul', 'za', 'Coreia do Sul', 'kr', '2026-06-20', '14:00:00', 'BC Place (Vancouver)', NULL, NULL, false),
-- Grupo B
(7, 'B', 'Canadá', 'ca', 'Bósnia e Herzegovina', 'ba', '2026-06-12', '16:00:00', 'BMO Field (Toronto)', 3, 0, true),
(8, 'B', 'Catar', 'qa', 'Suíça', 'ch', '2026-06-12', '19:00:00', 'Gillette Stadium (Boston)', NULL, NULL, false),
(9, 'B', 'Canadá', 'ca', 'Catar', 'qa', '2026-06-16', '16:00:00', 'BMO Field (Toronto)', NULL, NULL, false),
(10, 'B', 'Suíça', 'ch', 'Bósnia e Herzegovina', 'ba', '2026-06-16', '19:00:00', 'Gillette Stadium (Boston)', NULL, NULL, false),
(11, 'B', 'Suíça', 'ch', 'Canadá', 'ca', '2026-06-21', '16:00:00', 'BMO Field (Toronto)', NULL, NULL, false),
(12, 'B', 'Bósnia e Herzegovina', 'ba', 'Catar', 'qa', '2026-06-21', '19:00:00', 'Gillette Stadium (Boston)', NULL, NULL, false),
-- Grupo C
(13, 'C', 'Brasil', 'br', 'Marrocos', 'ma', '2026-06-13', '15:00:00', 'MetLife Stadium (NY)', NULL, NULL, false),
(14, 'C', 'Haiti', 'ht', 'Escócia', 'gb-sct', '2026-06-13', '18:00:00', 'Hard Rock Stadium (Miami)', NULL, NULL, false),
(15, 'C', 'Brasil', 'br', 'Haiti', 'ht', '2026-06-17', '15:00:00', 'MetLife Stadium (NY)', NULL, NULL, false),
(16, 'C', 'Escócia', 'gb-sct', 'Marrocos', 'ma', '2026-06-17', '18:00:00', 'Hard Rock Stadium (Miami)', NULL, NULL, false),
(17, 'C', 'Escócia', 'gb-sct', 'Brasil', 'br', '2026-06-22', '15:00:00', 'MetLife Stadium (NY)', NULL, NULL, false),
(18, 'C', 'Marrocos', 'ma', 'Haiti', 'ht', '2026-06-22', '18:00:00', 'Hard Rock Stadium (Miami)', NULL, NULL, false),
-- Grupo D
(19, 'D', 'Estados Unidos', 'us', 'Paraguai', 'py', '2026-06-12', '19:00:00', 'SoFi Stadium (Los Angeles)', NULL, NULL, false),
(20, 'D', 'Austrália', 'au', 'Turquia', 'tr', '2026-06-13', '21:00:00', 'Levi\'s Stadium (San Francisco)', NULL, NULL, false),
(21, 'D', 'Estados Unidos', 'us', 'Austrália', 'au', '2026-06-17', '19:00:00', 'SoFi Stadium (Los Angeles)', NULL, NULL, false),
(22, 'D', 'Turquia', 'tr', 'Paraguai', 'py', '2026-06-18', '21:00:00', 'Levi\'s Stadium (San Francisco)', NULL, NULL, false),
(23, 'D', 'Turquia', 'tr', 'Estados Unidos', 'us', '2026-06-23', '19:00:00', 'SoFi Stadium (Los Angeles)', NULL, NULL, false),
(24, 'D', 'Paraguai', 'py', 'Austrália', 'au', '2026-06-23', '21:00:00', 'Levi\'s Stadium (San Francisco)', NULL, NULL, false),
-- Grupo E
(25, 'E', 'Alemanha', 'de', 'Curaçao', 'cw', '2026-06-14', '13:00:00', 'Mercedes-Benz Stadium (Atlanta)', NULL, NULL, false),
(26, 'E', 'Costa do Marfim', 'ci', 'Equador', 'ec', '2026-06-14', '16:00:00', 'Lincoln Financial Field (Philadelphia)', NULL, NULL, false),
(27, 'E', 'Alemanha', 'de', 'Costa do Marfim', 'ci', '2026-06-18', '13:00:00', 'Mercedes-Benz Stadium (Atlanta)', NULL, NULL, false),
(28, 'E', 'Equador', 'ec', 'Curaçao', 'cw', '2026-06-19', '16:00:00', 'Lincoln Financial Field (Philadelphia)', NULL, NULL, false),
(29, 'E', 'Equador', 'ec', 'Alemanha', 'de', '2026-06-24', '13:00:00', 'Mercedes-Benz Stadium (Atlanta)', NULL, NULL, false),
(30, 'E', 'Curaçao', 'cw', 'Costa do Marfim', 'ci', '2026-06-24', '16:00:00', 'Lincoln Financial Field (Philadelphia)', NULL, NULL, false),
-- Grupo F
(31, 'F', 'Holanda', 'nl', 'Japão', 'jp', '2026-06-14', '19:00:00', 'Arrowhead Stadium (Kansas City)', NULL, NULL, false),
(32, 'F', 'Suécia', 'se', 'Tunísia', 'tn', '2026-06-14', '22:00:00', 'Lumen Field (Seattle)', NULL, NULL, false),
(33, 'F', 'Holanda', 'nl', 'Suécia', 'se', '2026-06-19', '19:00:00', 'Arrowhead Stadium (Kansas City)', NULL, NULL, false),
(34, 'F', 'Tunísia', 'tn', 'Japão', 'jp', '2026-06-19', '22:00:00', 'Lumen Field (Seattle)', NULL, NULL, false),
(35, 'F', 'Tunísia', 'tn', 'Holanda', 'nl', '2026-06-25', '19:00:00', 'Arrowhead Stadium (Kansas City)', NULL, NULL, false),
(36, 'F', 'Japão', 'jp', 'Suécia', 'se', '2026-06-25', '22:00:00', 'Lumen Field (Seattle)', NULL, NULL, false),
-- Grupo G
(37, 'G', 'Bélgica', 'be', 'Egito', 'eg', '2026-06-15', '13:00:00', 'Gillette Stadium (Boston)', NULL, NULL, false),
(38, 'G', 'Irã', 'ir', 'Nova Zelândia', 'nz', '2026-06-15', '16:00:00', 'MetLife Stadium (NY)', NULL, NULL, false),
(39, 'G', 'Bélgica', 'be', 'Irã', 'ir', '2026-06-20', '13:00:00', 'Gillette Stadium (Boston)', NULL, NULL, false),
(40, 'G', 'Nova Zelândia', 'nz', 'Egito', 'eg', '2026-06-20', '16:00:00', 'MetLife Stadium (NY)', NULL, NULL, false),
(41, 'G', 'Nova Zelândia', 'nz', 'Bélgica', 'be', '2026-06-26', '13:00:00', 'Gillette Stadium (Boston)', NULL, NULL, false),
(42, 'G', 'Egito', 'eg', 'Irã', 'ir', '2026-06-26', '16:00:00', 'MetLife Stadium (NY)', NULL, NULL, false),
-- Grupo H
(43, 'H', 'Espanha', 'es', 'Cabo Verde', 'cv', '2026-06-15', '19:00:00', 'Hard Rock Stadium (Miami)', NULL, NULL, false),
(44, 'H', 'Arábia Saudita', 'sa', 'Uruguai', 'uy', '2026-06-15', '22:00:00', 'AT&T Stadium (Dallas)', NULL, NULL, false),
(45, 'H', 'Espanha', 'es', 'Arábia Saudita', 'sa', '2026-06-20', '19:00:00', 'Hard Rock Stadium (Miami)', NULL, NULL, false),
(46, 'H', 'Uruguai', 'uy', 'Cabo Verde', 'cv', '2026-06-21', '22:00:00', 'AT&T Stadium (Dallas)', NULL, NULL, false),
(47, 'H', 'Uruguai', 'uy', 'Espanha', 'es', '2026-06-26', '19:00:00', 'Hard Rock Stadium (Miami)', NULL, NULL, false),
(48, 'H', 'Cabo Verde', 'cv', 'Arábia Saudita', 'sa', '2026-06-26', '22:00:00', 'AT&T Stadium (Dallas)', NULL, NULL, false),
-- Grupo I
(49, 'I', 'França', 'fr', 'Senegal', 'sn', '2026-06-16', '13:00:00', 'Mercedes-Benz Stadium (Atlanta)', NULL, NULL, false),
(50, 'I', 'Iraque', 'iq', 'Noruega', 'no', '2026-06-16', '16:00:00', 'NRG Stadium (Houston)', NULL, NULL, false),
(51, 'I', 'França', 'fr', 'Iraque', 'iq', '2026-06-21', '13:00:00', 'Mercedes-Benz Stadium (Atlanta)', NULL, NULL, false),
(52, 'I', 'Noruega', 'no', 'Senegal', 'sn', '2026-06-22', '16:00:00', 'NRG Stadium (Houston)', NULL, NULL, false),
(53, 'I', 'Noruega', 'no', 'França', 'fr', '2026-06-27', '13:00:00', 'Mercedes-Benz Stadium (Atlanta)', NULL, NULL, false),
(54, 'I', 'Senegal', 'sn', 'Iraque', 'iq', '2026-06-27', '16:00:00', 'NRG Stadium (Houston)', NULL, NULL, false),
-- Grupo J
(55, 'J', 'Argentina', 'ar', 'Argélia', 'dz', '2026-06-16', '19:00:00', 'MetLife Stadium (NY)', NULL, NULL, false),
(56, 'J', 'Áustria', 'at', 'Jordânia', 'jo', '2026-06-16', '22:00:00', 'SoFi Stadium (Los Angeles)', NULL, NULL, false),
(57, 'J', 'Argentina', 'ar', 'Áustria', 'at', '2026-06-21', '19:00:00', 'MetLife Stadium (NY)', NULL, NULL, false),
(58, 'J', 'Jordânia', 'jo', 'Argélia', 'dz', '2026-06-22', '22:00:00', 'SoFi Stadium (Los Angeles)', NULL, NULL, false),
(59, 'J', 'Jordânia', 'jo', 'Argentina', 'ar', '2026-06-27', '19:00:00', 'MetLife Stadium (NY)', NULL, NULL, false),
(60, 'J', 'Argélia', 'dz', 'Áustria', 'at', '2026-06-27', '22:00:00', 'SoFi Stadium (Los Angeles)', NULL, NULL, false),
-- Grupo K
(61, 'K', 'Portugal', 'pt', 'Congo', 'cg', '2026-06-17', '14:00:00', 'BC Place (Vancouver)', NULL, NULL, false),
(62, 'K', 'Uzbequistão', 'uz', 'Colômbia', 'co', '2026-06-17', '17:00:00', 'Lumen Field (Seattle)', NULL, NULL, false),
(63, 'K', 'Portugal', 'pt', 'Uzbequistão', 'uz', '2026-06-22', '14:00:00', 'BC Place (Vancouver)', NULL, NULL, false),
(64, 'K', 'Colômbia', 'co', 'Congo', 'cg', '2026-06-23', '17:00:00', 'Lumen Field (Seattle)', NULL, NULL, false),
(65, 'K', 'Colômbia', 'co', 'Portugal', 'pt', '2026-06-27', '14:00:00', 'BC Place (Vancouver)', NULL, NULL, false),
(66, 'K', 'Congo', 'cg', 'Uzbequistão', 'uz', '2026-06-27', '17:00:00', 'Lumen Field (Seattle)', NULL, NULL, false),
-- Grupo L
(67, 'L', 'Inglaterra', 'gb-eng', 'Croácia', 'hr', '2026-06-17', '20:00:00', 'Hard Rock Stadium (Miami)', NULL, NULL, false),
(68, 'L', 'Gana', 'gh', 'Panamá', 'pa', '2026-06-17', '23:00:00', 'SoFi Stadium (Los Angeles)', NULL, NULL, false),
(69, 'L', 'Inglaterra', 'gb-eng', 'Gana', 'gh', '2026-06-22', '20:00:00', 'Hard Rock Stadium (Miami)', NULL, NULL, false),
(70, 'L', 'Panamá', 'pa', 'Croácia', 'hr', '2026-06-23', '23:00:00', 'SoFi Stadium (Los Angeles)', NULL, NULL, false),
(71, 'L', 'Panamá', 'pa', 'Inglaterra', 'gb-eng', '2026-06-27', '20:00:00', 'Hard Rock Stadium (Miami)', NULL, NULL, false),
(72, 'L', 'Croácia', 'hr', 'Gana', 'gh', '2026-06-27', '23:00:00', 'SoFi Stadium (Los Angeles)', NULL, NULL, false)
ON CONFLICT (id) DO NOTHING;

-- Migration: Adicionar coluna avatar_url na tabela boloes se não existir
ALTER TABLE public.boloes ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
