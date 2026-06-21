import { NextResponse } from 'next/server';
import { defaultConfrontos } from '@/lib/supabase';

const normalizeTeamName = (name) => {
  if (!name) return '';
  let n = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace('repblica', 'republica')
    .replace('bsnia', 'bosnia')
    .trim();
    
  // Aliases globais para cruzamento de dados API x Supabase
  if (n === 'democraticrepublicofthecongo' || n === 'rddocongo' || n === 'drcongo' || n === 'congodr') return 'congo';
  if (n === 'unitedstates' || n === 'usa') return 'eua';
  if (n === 'saudiarabia') return 'arabiasaudita';
  if (n === 'southkorea' || n === 'korearepublic') return 'coreiadosul';
  if (n === 'northkorea' || n === 'dprkorea') return 'coreiadonorte';
  if (n === 'costarica') return 'costarica';
  
  return n;
};

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { image, name } = await req.json();
    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback if Gemini API Key is not configured or is the default placeholder
    if (!apiKey || apiKey === 'sua_chave_do_gemini_aqui' || apiKey.trim() === '') {
      console.log('GEMINI_API_KEY não configurada ou com placeholder. Usando simulador de OCR.');
      
      const prefilledBets = defaultConfrontos.map(match => {
        const hasOcr = Math.random() > 0.3;
        return {
          match_id: match.id,
          home: match.home_team,
          away: match.away_team,
          bet_home: hasOcr ? String(Math.floor(Math.random() * 3)) : '',
          bet_away: hasOcr ? String(Math.floor(Math.random() * 2)) : '',
          grupo: match.grupo
        };
      });

      return NextResponse.json({
        bettor_name: name || 'Apostador Simulado',
        bets: prefilledBets
      });
    }

    // Prepare Base64 data for Gemini
    // Expecting image to be: "data:image/png;base64,iVBORw0KGgoAAAANS..."
    const matches = image.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'Invalid base64 image format' }, { status: 400 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Build the list of games to send to Gemini in the prompt
    const gamesListText = defaultConfrontos.map(g => 
      `ID: ${g.id} | Grupo: ${g.grupo} | ${g.home_team} x ${g.away_team}`
    ).join('\n');

    const promptText = `Você é um leitor de imagem especialista em extrair dados estruturados de bolões de futebol da Copa do Mundo 2026.
O usuário enviou uma foto de uma folha física de bolão.

Instruções importantes:
1. Identifique o "Nome do Apostador" que está escrito no campo 'NOME' (no topo da folha).
2. Extraia os placares escritos à mão para todas as partidas.
3. Para cada partida, identifique o número do time da esquerda (casa) e do time da direita (fora).
4. Mapeie os placares para os jogos correspondentes listados abaixo. Use o ID correto do jogo.

Aqui está a lista oficial de jogos da Copa 2026 com seus IDs:
${gamesListText}

Regras adicionais:
- Se você não conseguir ler o placar de algum jogo por estar rasurado, ilegível ou em branco, retorne os campos "bet_home" e "bet_away" correspondentes como string vazia "".
- Retorne obrigatoriamente um objeto JSON válido contendo exatamente as seguintes chaves:
  - "bettor_name": O nome do apostador extraído (string)
  - "bets": Um array de objetos, onde cada objeto tem:
    - "match_id": O ID do jogo mapeado (número)
    - "bet_home": O placar do time da casa (número ou string vazia "")
    - "bet_away": O placar do time de fora (número ou string vazia "")

MUITO IMPORTANTE: Retorne APENAS o objeto JSON puro, sem Markdown, sem blocos de código, sem explicações.`;

    // NOTE: generation_config / responseMimeType is intentionally omitted here.
    // Both camelCase and snake_case variants cause 400 errors in the v1 REST endpoint.
    // The model is instructed via the prompt to return pure JSON instead.
    const requestBody = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ]
    };

    let geminiRes;
    let usedVersion = 'v1beta';
    
    // Use v1beta endpoint which has broader model support
    try {
      console.log('Chamando API do Gemini via endpoint v1beta...');
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );
    } catch (e) {
      console.error('Falha de rede ao tentar v1beta:', e.message);
    }

    // Fallback to v1 if v1beta failed or returned 404
    if (!geminiRes || geminiRes.status === 404) {
      console.log('Endpoint v1beta indisponível. Tentando endpoint v1...');
      usedVersion = 'v1';
      try {
        geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          }
        );
      } catch (e) {
        console.error('Falha de rede ao tentar v1:', e.message);
      }
    }

    if (!geminiRes) {
      throw new Error('Não foi possível estabelecer conexão com os servidores da API do Gemini.');
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error(`Erro na API do Gemini (${usedVersion}):`, errText);
      
      let friendlyError = `Gemini API (${usedVersion}) retornou status ${geminiRes.status}`;
      if (geminiRes.status === 404) {
        friendlyError = `Erro 404: Modelo não encontrado no endpoint ${usedVersion}. Verifique se a Generative Language API está ativada no Google Cloud Console.`;
      } else if (geminiRes.status === 400) {
        friendlyError = `Erro 400: Requisição inválida. Detalhes: ${errText}`;
      } else if (geminiRes.status === 403) {
        friendlyError = `Erro 403: Acesso negado. Chave API do Gemini inválida ou sem permissões.`;
      }
      
      throw new Error(friendlyError);
    }

    const geminiData = await geminiRes.json();
    const resultText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error('Nenhum conteúdo retornado pelo Gemini.');
    }

    // Strip any Markdown code fences if the model included them
    let cleanJson = resultText.trim();
    cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');

    const parsedResult = JSON.parse(cleanJson);
    
    // Map the simple bets array back to matches array with full details for UI
    const finalBets = defaultConfrontos.map(match => {
      const foundBet = (parsedResult.bets || []).find(b =>
        String(b.match_id) === String(match.id) ||
        (normalizeTeamName(b.home) === normalizeTeamName(match.home_team) && normalizeTeamName(b.away) === normalizeTeamName(match.away_team))
      );
      
      let betHome = '';
      let betAway = '';
      
      if (foundBet) {
        betHome = foundBet.bet_home !== undefined && foundBet.bet_home !== null ? String(foundBet.bet_home) : '';
        betAway = foundBet.bet_away !== undefined && foundBet.bet_away !== null ? String(foundBet.bet_away) : '';
      }

      return {
        match_id: match.id,
        home: match.home_team,
        away: match.away_team,
        bet_home: betHome,
        bet_away: betAway,
        grupo: match.grupo
      };
    });

    return NextResponse.json({
      bettor_name: parsedResult.bettor_name || name || 'Apostador Desconhecido',
      bets: finalBets
    });

  } catch (error) {
    console.error('Erro no processamento da imagem / Gemini:', error);
    return NextResponse.json({ error: error.message, bets: [] }, { status: 500 });
  }
}
