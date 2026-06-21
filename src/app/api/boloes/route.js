import { NextResponse } from 'next/server';
import { supabaseServer, isSupabaseServerConfigured } from '@/lib/supabaseServer';

async function validateUser(username, password) {
  if (!isSupabaseServerConfigured) return { valid: true, user: { role: 'Admin' } };
  
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

    const { valid, user } = await validateUser(username, password);
    if (!valid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const isAdminOrMod = user.role === 'Admin' || user.role === 'Moderador';
    const isAdmin = user.role === 'Admin';

    if (!isAdminOrMod) {
      return NextResponse.json({ error: 'Acesso negado. Apenas Admin ou Moderador' }, { status: 403 });
    }

    if (action === 'insertBolao') {
      const { bettorName, photoUrl, betsData, avatarUrl } = body;
      
      const { data, error } = await supabaseServer.from('boloes').insert({
        username,
        bettor_name: bettorName,
        photo_url: photoUrl,
        bets_data: betsData,
        avatar_url: avatarUrl
      }).select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    if (action === 'editPhoto') {
      const { bolaoId, avatarUrl } = body;
      const { error } = await supabaseServer.from('boloes').update({ avatar_url: avatarUrl }).eq('id', bolaoId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'editName') {
      const { bolaoId, bettorName } = body;
      const { error } = await supabaseServer.from('boloes').update({ bettor_name: bettorName }).eq('id', bolaoId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'editBet') {
      if (!isAdmin) {
        return NextResponse.json({ error: '🚫 Moderadores não têm permissão para editar palpites.' }, { status: 403 });
      }
      const { bolaoId, betsData } = body;
      const { error } = await supabaseServer.from('boloes').update({ bets_data: betsData }).eq('id', bolaoId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'deleteBolao') {
      if (!isAdmin) {
        return NextResponse.json({ error: '🚫 Moderadores não têm permissão para excluir bolões.' }, { status: 403 });
      }
      const { bolaoId } = body;
      const { error } = await supabaseServer.from('boloes').delete().eq('id', bolaoId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
