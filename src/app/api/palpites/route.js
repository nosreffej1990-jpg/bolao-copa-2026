import { NextResponse } from 'next/server';
import { supabaseServer, isSupabaseServerConfigured } from '@/lib/supabaseServer';

// Helper to validate user credentials
async function validateUser(username, password) {
  if (!isSupabaseServerConfigured) return { valid: true }; // Skip validation if server DB is offline

  const { data: users, error } = await supabaseServer
    .from('usuarios')
    .select('*')
    .eq('username', username);

  if (error || !users || users.length === 0) return { valid: false };
  const user = users[0];
  return { valid: user.password === password, user };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, username, password } = body;

    // Validate credentials
    const { valid, user } = await validateUser(username, password);
    if (!valid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    if (action === 'savePalpite') {
      const { matchId, homeScore, awayScore } = body;

      // Se o Supabase estiver configurado, validar se o palpite já existe
      if (isSupabaseServerConfigured) {
        const { data: existingPalpite } = await supabaseServer
          .from('palpites')
          .select('id')
          .eq('username', username)
          .eq('match_id', parseInt(matchId))
          .maybeSingle();

        // Se já existe e o usuário NÃO for Admin ou Moderador, bloquear alteração
        if (existingPalpite) {
          const userRole = user?.role || 'Jogador';
          if (userRole !== 'Admin' && userRole !== 'Moderador') {
            return NextResponse.json({ 
              error: '🚫 Alteração bloqueada: Seus palpites para este jogo já foram salvos e não podem ser modificados.' 
            }, { status: 403 });
          }
        }
      }

      const { error } = await supabaseServer.from('palpites').upsert({
        username,
        match_id: parseInt(matchId),
        home_score: parseInt(homeScore),
        away_score: parseInt(awayScore)
      }, { onConflict: 'username,match_id' });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
