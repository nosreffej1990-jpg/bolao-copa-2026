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
    const { action } = body;

    // Handle public registration action
    if (action === 'register') {
      const { regUsername, regPassword, regWhatsapp } = body;

      // Check config table if registration is allowed
      if (isSupabaseServerConfigured) {
        const { data: configData } = await supabaseServer.from('config').select('*').eq('key', 'allow_register');
        if (configData && configData.length > 0 && configData[0].value !== 'true') {
          return NextResponse.json({ error: 'Novos cadastros de jogadores estão temporariamente desativados pelo administrador.' }, { status: 403 });
        }
      }

      // Check if username already exists
      if (isSupabaseServerConfigured) {
        const { data: existing } = await supabaseServer.from('usuarios').select('id').eq('username', regUsername);
        if (existing && existing.length > 0) {
          return NextResponse.json({ error: 'Nome de usuário já está em uso.' }, { status: 409 });
        }
      }

      const newUser = {
        username: regUsername,
        password: regPassword,
        whatsapp: regWhatsapp,
        role: 'Jogador',
        approved: false
      };

      const { data, error } = await supabaseServer.from('usuarios').insert(newUser).select();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    // Authenticated actions
    const { username, password } = body;
    const { valid, user } = await validateUser(username, password);
    if (!valid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: 'Erro no Servidor: SUPABASE_SERVICE_ROLE_KEY não configurada nas variáveis de ambiente. Verifique o painel da Vercel.' }, { status: 500 });
    }

    if (action === 'updateChampion') {
      const { champion } = body;
      const { error } = await supabaseServer.from('usuarios').update({ campeao: champion }).eq('username', username);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'updateProfile') {
      const { avatarUrl, statusMsg } = body;
      const { error } = await supabaseServer.from('usuarios').update({ avatar_url: avatarUrl, status: statusMsg }).eq('username', username);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    const isAdminOrMod = user.role === 'Admin' || user.role === 'Moderador';
    if (!isAdminOrMod) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (action === 'linkBolao') {
      const { bolaoId, targetUsername } = body;
      const { error } = await supabaseServer.from('boloes').update({ username: targetUsername }).eq('id', bolaoId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'approveUser') {
      const { targetUserId, phaseField } = body;
      const { error } = await supabaseServer.from('usuarios').update({ [phaseField]: true }).eq('id', targetUserId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'revokeUser') {
      const { targetUserId, phaseField } = body;
      const { error } = await supabaseServer.from('usuarios').update({ [phaseField]: false }).eq('id', targetUserId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'updateConfig') {
      const { key, value } = body;
      const { error } = await supabaseServer.from('config').upsert({ key, value }, { onConflict: 'key' });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
