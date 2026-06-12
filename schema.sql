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
    photo_url TEXT, -- Link da imagem salva no Storage do Supabase
    bets_data JSONB, -- Lista de apostas lidas por OCR
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.boloes ENABLE ROW LEVEL SECURITY;

-- Permissões para bolões
CREATE POLICY "Acesso total de boloes" ON public.boloes FOR ALL USING (true);

-- 4. Inserção de dados dos confrontos oficiais (Primeira Rodada dos Grupos da Copa 2026)
INSERT INTO public.confrontos (grupo, home_team, home_code, away_team, away_code, match_date, match_time, stadium, home_score, away_score, finished) VALUES
-- Grupo A
('A', 'México', 'mx', 'África do Sul', 'za', '2026-06-11', '17:00:00', 'Estádio Azteca (CDMX)', 2, 1, true),
('A', 'Coreia do Sul', 'kr', 'Itália', 'it', '2026-06-12', '14:00:00', 'BC Place (Vancouver)', NULL, NULL, false),
-- Grupo B
('B', 'Canadá', 'ca', 'Catar', 'qa', '2026-06-12', '16:00:00', 'BMO Field (Toronto)', 3, 0, true),
('B', 'Suíça', 'ch', 'Suécia', 'se', '2026-06-13', '13:00:00', 'Gillette Stadium (Boston)', NULL, NULL, false),
-- Grupo C
('C', 'Brasil', 'br', 'Marrocos', 'ma', '2026-06-13', '15:00:00', 'MetLife Stadium (NY)', NULL, NULL, false),
('C', 'Haiti', 'ht', 'Escócia', 'gb-sct', '2026-06-13', '18:00:00', 'Hard Rock Stadium (Miami)', NULL, NULL, false),
-- Grupo D
('D', 'EUA', 'us', 'Paraguai', 'py', '2026-06-12', '19:00:00', 'SoFi Stadium (Los Angeles)', NULL, NULL, false),
('D', 'Austrália', 'au', 'Ucrânia', 'ua', '2026-06-13', '21:00:00', 'Levi''s Stadium (San Francisco)', NULL, NULL, false),
-- Grupo E
('E', 'Alemanha', 'de', 'Curaçao', 'cw', '2026-06-14', '13:00:00', 'Mercedes-Benz Stadium (Atlanta)', NULL, NULL, false),
('E', 'Costa do Marfim', 'ci', 'Equador', 'ec', '2026-06-14', '16:00:00', 'Lincoln Financial Field (Philadelphia)', NULL, NULL, false),
-- Grupo F
('F', 'Holanda', 'nl', 'Japão', 'jp', '2026-06-14', '19:00:00', 'Arrowhead Stadium (Kansas City)', NULL, NULL, false),
('F', 'Tunísia', 'tn', 'Polônia', 'pl', '2026-06-14', '22:00:00', 'Lumen Field (Seattle)', NULL, NULL, false),
-- Grupo G
('G', 'Bélgica', 'be', 'Egito', 'eg', '2026-06-15', '13:00:00', 'Gillette Stadium (Boston)', NULL, NULL, false),
('G', 'Irã', 'ir', 'Nova Zelândia', 'nz', '2026-06-15', '16:00:00', 'MetLife Stadium (NY)', NULL, NULL, false),
-- Grupo H
('H', 'Espanha', 'es', 'Cabo Verde', 'cv', '2026-06-15', '19:00:00', 'Hard Rock Stadium (Miami)', NULL, NULL, false),
('H', 'Arábia Saudita', 'sa', 'Uruguai', 'uy', '2026-06-15', '22:00:00', 'AT&T Stadium (Dallas)', NULL, NULL, false),
-- Grupo I
('I', 'França', 'fr', 'Senegal', 'sn', '2026-06-16', '13:00:00', 'Mercedes-Benz Stadium (Atlanta)', NULL, NULL, false),
('I', 'Noruega', 'no', 'Honduras', 'hn', '2026-06-16', '16:00:00', 'NRG Stadium (Houston)', NULL, NULL, false),
-- Grupo J
('J', 'Argentina', 'ar', 'Argélia', 'dz', '2026-06-16', '19:00:00', 'MetLife Stadium (NY)', NULL, NULL, false),
('J', 'Áustria', 'at', 'Jordânia', 'jo', '2026-06-16', '22:00:00', 'SoFi Stadium (Los Angeles)', NULL, NULL, false),
-- Grupo K
('K', 'Portugal', 'pt', 'Uzbequistão', 'uz', '2026-06-17', '14:00:00', 'BC Place (Vancouver)', NULL, NULL, false),
('K', 'Colômbia', 'co', 'Chile', 'cl', '2026-06-17', '17:00:00', 'Lumen Field (Seattle)', NULL, NULL, false),
-- Grupo L
('L', 'Inglaterra', 'gb', 'Croácia', 'hr', '2026-06-17', '20:00:00', 'Hard Rock Stadium (Miami)', NULL, NULL, false),
('L', 'Gana', 'gh', 'Panamá', 'pa', '2026-06-17', '23:00:00', 'SoFi Stadium (Los Angeles)', NULL, NULL, false)
ON CONFLICT DO NOTHING;
