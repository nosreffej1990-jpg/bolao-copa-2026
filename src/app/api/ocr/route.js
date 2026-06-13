import { NextResponse } from 'next/server';
import { defaultConfrontos } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { image, name } = await req.json();
    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback if Gemini API Key is not configured
    if (!apiKey) {
      console.log('GEMINI_API_KEY não configurada. Usando simulador de OCR.');
      
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

    const promptText = `
Você é um leitor de imagem especialista em extrair dados estruturados de bolões de futebol da Copa do Mundo 2026.
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

O formato de retorno DEVE ser um objeto JSON puro. Não inclua Markdown, blocos de código ou qualquer outro texto explicativo.
`;

    // Make request to Gemini 1.5 Flash
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Erro na API do Gemini:', errText);
      throw new Error(`Gemini API returned status ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const resultText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error('No content returned from Gemini');
    }

    const parsedResult = JSON.parse(resultText.trim());
    
    // Map the simple bets array back to matches array with full details for UI
    const finalBets = defaultConfrontos.map(match => {
      const foundBet = (parsedResult.bets || []).find(b => b.match_id === match.id);
      
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
