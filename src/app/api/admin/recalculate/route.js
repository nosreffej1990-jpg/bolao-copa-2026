import { NextResponse } from 'next/server';
import { supabaseServer, isSupabaseServerConfigured } from '@/lib/supabaseServer';
import { fetchAllGames } from '@/lib/worldcupApi';
import { CHAMPIONS } from '@/components/ChampionProvider';

async function validateAdmin(username, password) {
  if (!isSupabaseServerConfigured) return { valid: true };
  const { data: users, error } = await supabaseServer
    .from('usuarios')
    .select('*')
    .eq('username', username);

  if (error || !users || users.length === 0) return { valid: false };
  const user = users[0];
  if (user.password !== password) return { valid: false };
  if (user.role !== 'Admin') return { valid: false };
  return { valid: true, user };
}

const normalizeTeamName = (name) => {
  if (!name) return '';
  let n = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace('repblica', 'republica')
    .replace('bsnia', 'bosnia')
    .trim();
    
  if (n === 'democraticrepublicofthecongo' || n === 'rddocongo' || n === 'drcongo' || n === 'congodr') return 'congo';
  if (n === 'unitedstates' || n === 'usa') return 'eua';
  if (n === 'saudiarabia') return 'arabiasaudita';
  if (n === 'southkorea' || n === 'korearepublic') return 'coreiadosul';
  if (n === 'northkorea' || n === 'dprkorea') return 'coreiadonorte';
  if (n === 'costarica') return 'costarica';
  
  return n;
};

const getFlagCode = (name) => {
  if (!name) return null;
  const n = normalizeTeamName(name);
  const found = CHAMPIONS.find(t => normalizeTeamName(t.name) === n);
  return found ? found.code : null;
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const { valid } = await validateAdmin(username, password);
    if (!valid) {
      return NextResponse.json({ error: 'Acesso negado. Credenciais inválidas ou você não é Admin.' }, { status: 403 });
    }

    if (!isSupabaseServerConfigured) {
       return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 500 });
    }

    // Busca dados no Supabase e ESPN
    const { data: currentConfs } = await supabaseServer.from('confrontos').select('*').order('id', { ascending: true });
    if (!currentConfs || currentConfs.length === 0) {
      return NextResponse.json({ error: 'Nenhum confronto encontrado no banco.' }, { status: 404 });
    }

    const allApiGames = await fetchAllGames();
    if (!allApiGames || allApiGames.length === 0) {
      return NextResponse.json({ error: 'Erro ao buscar jogos na ESPN API.' }, { status: 500 });
    }

    const changedConfrontos = [];
    
    // Atualiza confrontos com base na ESPN
    const updatedConfrontos = currentConfs.map(c => {
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
          
        const apiHomeCode = getFlagCode(apiHomeName) || 'placeholder';
        const apiAwayCode = getFlagCode(apiAwayName) || 'placeholder';

        let isDifferent = false;
        let nextHomeScore = c.home_score;
        let nextAwayScore = c.away_score;
        let nextFinished = c.finished;
        let nextHomeTeam = c.home_team;
        let nextAwayTeam = c.away_team;
        let nextHomeCode = c.home_code;
        let nextAwayCode = c.away_code;

        if (c.id >= 73 && (apiHomeName !== c.home_team || apiAwayName !== c.away_team || apiHomeCode !== c.home_code || apiAwayCode !== c.away_code)) {
          nextHomeTeam = apiHomeName;
          nextAwayTeam = apiAwayName;
          nextHomeCode = apiHomeCode;
          nextAwayCode = apiAwayCode;
          isDifferent = true;
        }

        if (apiGame.finished === 'TRUE') {
          const apiHomeScore = apiGame.home_score !== null && apiGame.home_score !== undefined ? parseInt(apiGame.home_score) : null;
          const apiAwayScore = apiGame.away_score !== null && apiGame.away_score !== undefined ? parseInt(apiGame.away_score) : null;
          
          if (apiHomeScore !== null && apiAwayScore !== null && (c.home_score !== apiHomeScore || c.away_score !== apiAwayScore || !c.finished)) {
            nextHomeScore = apiHomeScore;
            nextAwayScore = apiAwayScore;
            nextFinished = true;
            isDifferent = true;
          }
        } else {
          if (c.home_score !== null || c.away_score !== null || c.finished) {
            nextHomeScore = null;
            nextAwayScore = null;
            nextFinished = false;
            isDifferent = true;
          }
        }

        if (isDifferent) {
          const updated = {
            ...c,
            home_team: nextHomeTeam,
            away_team: nextAwayTeam,
            home_code: nextHomeCode,
            away_code: nextAwayCode,
            home_score: nextHomeScore,
            away_score: nextAwayScore,
            finished: nextFinished
          };
          changedConfrontos.push(updated);
          return updated;
        }
      }
      return c;
    });

    if (changedConfrontos.length > 0) {
      for (const uc of changedConfrontos) {
        await supabaseServer.from('confrontos')
          .update({ 
            home_team: uc.home_team,
            away_team: uc.away_team,
            home_code: uc.home_code,
            away_code: uc.away_code,
            home_score: uc.home_score, 
            away_score: uc.away_score,
            finished: uc.finished ?? false
          })
          .eq('id', uc.id);
      }
    }

    return NextResponse.json({ success: true, updatedCount: changedConfrontos.length });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
