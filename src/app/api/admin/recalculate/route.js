import { NextResponse } from 'next/server';
import { supabaseServer, isSupabaseServerConfigured } from '@/lib/supabaseServer';
import { fetchAllGames, getFlagCode } from '@/lib/worldcupApi';
import { defaultConfrontos } from '@/lib/supabase';

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
    const { data: dbConfs } = await supabaseServer.from('confrontos').select('*').order('id', { ascending: true });
    let currentConfs = dbConfs || [];

    // Se houver confrontos faltando no banco de dados (ex: por falha no insert do VARCHAR do grupo), insere-os automaticamente
    if (currentConfs.length < 104) {
      console.log(`Recalculate: detectados confrontos em falta no banco. Banco tem ${currentConfs.length}/104. Inserindo os que faltam...`);
      const missingConfs = defaultConfrontos.filter(d => !currentConfs.some(c => c.id === d.id));
      if (missingConfs.length > 0) {
        const { error: insertErr } = await supabaseServer.from('confrontos').insert(missingConfs);
        if (insertErr) {
          console.error('Recalculate: erro ao auto-inserir confrontos ausentes:', insertErr);
        } else {
          // Re-busca os confrontos para ter a lista completa
          const { data: reloaded } = await supabaseServer.from('confrontos').select('*').order('id', { ascending: true });
          currentConfs = reloaded || [];
        }
      }
    }

    if (!currentConfs || currentConfs.length === 0) {
      return NextResponse.json({ error: 'Nenhum confronto encontrado no banco.' }, { status: 404 });
    }

    const allApiGames = await fetchAllGames(true); // Cronograma completo
    let espnGames = [];
    try {
      espnGames = await fetchAllGames(false); // Jogos de hoje da ESPN com placares
    } catch (e) {
      console.error('Recalculate: erro ao carregar jogos da ESPN:', e);
    }

    if (!allApiGames || allApiGames.length === 0) {
      return NextResponse.json({ error: 'Erro ao buscar dados na API do cronograma.' }, { status: 500 });
    }

    // Mescla os placares da ESPN no cronograma completo (allApiGames)
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

    const changedConfrontos = [];
    
    // Atualiza confrontos com base no cronograma mesclado
    const updatedConfrontos = currentConfs.map(c => {
      const defConf = defaultConfrontos.find(d => d.id === c.id);
      let isDifferent = false;
      let nextDate = c.match_date;
      let nextTime = c.match_time;

      if (defConf && (c.match_date !== defConf.match_date || c.match_time !== defConf.match_time)) {
        nextDate = defConf.match_date;
        nextTime = defConf.match_time;
        isDifferent = true;
      }

      let apiGame = null;
      if (c.id <= 72) {
        apiGame = allApiGames.find(g =>
          normalizeTeamName(g.home_team_name_en) === normalizeTeamName(c.home_team) &&
          normalizeTeamName(g.away_team_name_en) === normalizeTeamName(c.away_team)
        );
      } else {
        apiGame = allApiGames.find(g => String(g.id) === String(c.id));
      }

      let nextHomeScore = c.home_score;
      let nextAwayScore = c.away_score;
      let nextFinished = c.finished;
      let nextHomeTeam = c.home_team;
      let nextAwayTeam = c.away_team;
      let nextHomeCode = c.home_code;
      let nextAwayCode = c.away_code;

      if (apiGame) {
        const apiHomeName = apiGame.home_team_name_en && apiGame.home_team_name_en !== '0' && apiGame.home_team_name_en !== '' 
          ? apiGame.home_team_name_en 
          : (apiGame.home_team_label || c.home_team);
        const apiAwayName = apiGame.away_team_name_en && apiGame.away_team_name_en !== '0' && apiGame.away_team_name_en !== '' 
          ? apiGame.away_team_name_en 
          : (apiGame.away_team_label || c.away_team);
          
        const apiHomeCode = getFlagCode(apiHomeName) || 'placeholder';
        const apiAwayCode = getFlagCode(apiAwayName) || 'placeholder';

        if (c.id >= 73 && (apiHomeName !== c.home_team || apiAwayName !== c.away_team || apiHomeCode !== c.home_code || apiAwayCode !== c.away_code)) {
          nextHomeTeam = apiHomeName;
          nextAwayTeam = apiAwayName;
          nextHomeCode = apiHomeCode;
          nextAwayCode = apiAwayCode;
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
          // Se o jogo não está finalizado na API mas já está finalizado no banco, NÃO reverte!
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
              // Limpa se o placar ainda não foi registrado e a API também não tem placar
              if (c.home_score !== null || c.away_score !== null) {
                nextHomeScore = null;
                nextAwayScore = null;
                isDifferent = true;
              }
            }
          }
        }
      }

      if (isDifferent) {
        const updated = {
          ...c,
          match_date: nextDate,
          match_time: nextTime,
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
      return c;
    });

    if (changedConfrontos.length > 0) {
      for (const uc of changedConfrontos) {
        await supabaseServer.from('confrontos')
          .update({ 
            match_date: uc.match_date,
            match_time: uc.match_time,
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
