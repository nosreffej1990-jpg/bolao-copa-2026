import React, { useState } from 'react';

export default function MatchesTab({
  mode, // 'results' | 'upcoming'
  confrontos = [],
  apiLive = [],
  apiLoading,
  getFlagCode,
  formatMatchDate,
  setShowMatchModal,
  setMatchModalTab
}) {
  const [selectedStage, setSelectedStage] = useState('grupos');

  // Normaliza os confrontos do banco para o formato esperado pelo layout
  const formattedMatches = (confrontos || []).map(c => {
    const isFinished = c.finished === true || c.finished === 'TRUE';
    return {
      id: String(c.id),
      group: c.grupo,
      home_team_name_en: c.home_team,
      away_team_name_en: c.away_team,
      home_score: c.home_score !== null && c.home_score !== undefined ? String(c.home_score) : '',
      away_score: c.away_score !== null && c.away_score !== undefined ? String(c.away_score) : '',
      finished: isFinished,
      local_date: `${c.match_date} ${c.match_time}`,
      home_code: c.home_code,
      away_code: c.away_code,
      stadium: c.stadium
    };
  });

  if (mode === 'results') {
    const finishedMatches = formattedMatches
      .filter(g => g.finished)
      .sort((a, b) => {
        const timeA = new Date(a.local_date).getTime();
        const timeB = new Date(b.local_date).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return parseInt(b.id) - parseInt(a.id);
      }); // Mais recentes no topo

    return (
      <div>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>Resultados dos Jogos</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Placares oficiais e consolidados do torneio</p>
        </div>

        {/* Partidas finalizadas */}
        {apiLoading && finishedMatches.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1rem' }}>
            <div className="skeleton" style={{ height: '80px', width: '100%', borderRadius: '12px' }}></div>
            <div className="skeleton" style={{ height: '80px', width: '100%', borderRadius: '12px' }}></div>
            <div className="skeleton" style={{ height: '80px', width: '100%', borderRadius: '12px' }}></div>
          </div>
        ) : finishedMatches.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '2rem' }}>
            Nenhum jogo finalizado ainda no banco de dados. Clique em "Recalcular" nas Configurações para sincronizar os resultados oficiais.
          </p>
        ) : (
          <div className="matchup-list">
            {finishedMatches.map(g => {
              const hFlag = g.home_code && g.home_code !== 'placeholder' ? g.home_code : getFlagCode(g.home_team_name_en);
              const aFlag = g.away_code && g.away_code !== 'placeholder' ? g.away_code : getFlagCode(g.away_team_name_en);
              const { date, time } = formatMatchDate(g.local_date);
              return (
                <div
                  className="matchup-card"
                  key={g.id}
                  style={{ borderColor: 'rgba(16,185,129,0.3)', cursor: 'pointer', position: 'relative' }}
                  onClick={() => { setShowMatchModal(g); setMatchModalTab('detalhes'); }}
                >
                  <div className="matchup-meta">
                    <span>Fase {g.group} • Encerrado (Jogo #{g.id})</span>
                    <span>{date} {time}</span>
                  </div>
                  <div className="matchup-teams-row">
                    <div className="matchup-team-item">
                      <img src={`https://flagcdn.com/w80/${hFlag}.png`} className="team-flag" alt={g.home_team_name_en} />
                      <span>{g.home_team_name_en}</span>
                    </div>
                    <div className="matchup-scores-center">
                      <input type="number" className="score-field" value={g.home_score} readOnly />
                      <span className="score-sep">x</span>
                      <input type="number" className="score-field" value={g.away_score} readOnly />
                    </div>
                    <div className="matchup-team-item">
                      <img src={`https://flagcdn.com/w80/${aFlag}.png`} className="team-flag" alt={g.away_team_name_en} />
                      <span>{g.away_team_name_en}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>Toque para ver detalhes</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (mode === 'upcoming') {
    // Filtra confrontos pela fase selecionada
    const filteredMatches = formattedMatches.filter(g => {
      if (g.finished) return false;
      const matchId = parseInt(g.id);
      if (selectedStage === 'grupos') return matchId <= 72;
      if (selectedStage === 'r32') return g.group === 'R32';
      if (selectedStage === 'r16') return g.group === 'R16';
      if (selectedStage === 'qf') return g.group === 'QF';
      if (selectedStage === 'sf') return g.group === 'SF';
      if (selectedStage === 'final') return g.group === 'FINAL' || g.group === 'THIRD';
      return false;
    });

    const stages = [
      { id: 'grupos', label: 'Grupos' },
      { id: 'r32', label: '1/16' },
      { id: 'r16', label: 'Oitavas' },
      { id: 'qf', label: 'Quartas' },
      { id: 'sf', label: 'Semifinal' },
      { id: 'final', label: 'Finais' }
    ];

    return (
      <div>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>Confrontos da Copa</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Calendário de todos os confrontos oficiais do torneio</p>
        </div>

        {/* Partidas ao vivo no topo dos confrontos */}
        {apiLive.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ 
                background: '#ef4444', 
                color: 'var(--text-primary)', 
                fontSize: '0.65rem', 
                fontWeight: 'bold', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '999px', 
                animation: 'pulse 1.5s infinite' 
              }}>🔴 AO VIVO</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Acompanhe em tempo real</span>
            </div>
            <div className="matchup-list">
              {apiLive.map(g => {
                const hFlag = g.home_code && g.home_code !== 'placeholder' ? g.home_code : getFlagCode(g.home_team_name_en);
                const aFlag = g.away_code && g.away_code !== 'placeholder' ? g.away_code : getFlagCode(g.away_team_name_en);
                return (
                  <div
                    className="matchup-card"
                    key={`live-${g.id}`}
                    style={{ borderColor: '#ef4444', boxShadow: '0 0 12px rgba(239,68,68,0.25)', cursor: 'pointer' }}
                    onClick={() => { setShowMatchModal(g); setMatchModalTab('palpites'); }}
                  >
                    <div className="matchup-meta">
                      <span style={{ color: '#ef4444', fontWeight: 'bold' }}>🔴 AO VIVO • Grupo {g.group}</span>
                      <span>{g.time_elapsed}</span>
                    </div>
                    <div className="matchup-teams-row">
                      <div className="matchup-team-item">
                        <img src={`https://flagcdn.com/w80/${hFlag}.png`} className="team-flag" alt={g.home_team_name_en} />
                        <span>{g.home_team_name_en}</span>
                      </div>
                      <div className="matchup-scores-center">
                        <input type="number" className="score-field" value={g.home_score} readOnly style={{ width: '30px', textAlign: 'center' }} />
                        <span className="score-sep">x</span>
                        <input type="number" className="score-field" value={g.away_score} readOnly style={{ width: '30px', textAlign: 'center' }} />
                      </div>
                      <div className="matchup-team-item">
                        <img src={`https://flagcdn.com/w80/${aFlag}.png`} className="team-flag" alt={g.away_team_name_en} />
                        <span>{g.away_team_name_en}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <hr style={{ border: '0', height: '1px', background: 'rgba(255,255,255,0.08)', marginTop: '1.5rem', marginBottom: '1.5rem' }} />
          </div>
        )}

        {/* Seletor de Fases (Scroll horizontal) */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.75rem',
          marginBottom: '1rem',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }}>
          {stages.map(st => (
            <button
              key={st.id}
              onClick={() => setSelectedStage(st.id)}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '999px',
                border: selectedStage === st.id ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.08)',
                background: selectedStage === st.id ? 'var(--btn-primary-bg)' : 'rgba(255,255,255,0.03)',
                color: selectedStage === st.id ? '#000' : 'var(--text-primary)',
                fontSize: '0.72rem',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: selectedStage === st.id ? '0 0 10px rgba(225, 182, 79, 0.3)' : 'none'
              }}
            >
              {st.label}
            </button>
          ))}
        </div>

        {apiLoading && filteredMatches.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '2rem' }}>Carregando calendário...</p>
        ) : filteredMatches.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '2rem' }}>Nenhum confronto nesta fase.</p>
        ) : (
          <div className="matchup-list">
            {filteredMatches.map(g => {
              const hFlag = g.home_code && g.home_code !== 'placeholder' ? g.home_code : getFlagCode(g.home_team_name_en);
              const aFlag = g.away_code && g.away_code !== 'placeholder' ? g.away_code : getFlagCode(g.away_team_name_en);
              const { date, time } = formatMatchDate(g.local_date);
              return (
                <div
                  className="matchup-card"
                  key={g.id}
                  style={{ 
                    cursor: 'pointer',
                    borderColor: g.finished ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                    background: g.finished ? 'rgba(16,185,129,0.02)' : 'var(--bg-card)'
                  }}
                  onClick={() => { 
                    setShowMatchModal(g); 
                    setMatchModalTab(g.finished ? 'detalhes' : 'palpites'); 
                  }}
                >
                  <div className="matchup-meta">
                    <span>Fase {g.group} • Jogo #{g.id} {g.finished && '• Encerrado'}</span>
                    <span>{date} às {time}</span>
                  </div>
                  <div className="matchup-teams-row">
                    <div className="matchup-team-item">
                      {hFlag !== 'placeholder' ? (
                        <img src={`https://flagcdn.com/w80/${hFlag}.png`} className="team-flag" alt={g.home_team_name_en} />
                      ) : (
                        <div style={{ width: '32px', height: '22px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 'bold' }}>TBD</div>
                      )}
                      <span style={{ fontWeight: g.finished && parseInt(g.home_score) > parseInt(g.away_score) ? 'bold' : 'normal' }}>
                        {g.home_team_name_en}
                      </span>
                    </div>
                    {g.finished ? (
                      <div className="matchup-scores-center">
                        <input type="number" className="score-field" value={g.home_score} readOnly style={{ width: '30px', textAlign: 'center' }} />
                        <span className="score-sep">x</span>
                        <input type="number" className="score-field" value={g.away_score} readOnly style={{ width: '30px', textAlign: 'center' }} />
                      </div>
                    ) : (
                      <div className="matchup-scores-center">
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>vs</span>
                      </div>
                    )}
                    <div className="matchup-team-item">
                      {aFlag !== 'placeholder' ? (
                        <img src={`https://flagcdn.com/w80/${aFlag}.png`} className="team-flag" alt={g.away_team_name_en} />
                      ) : (
                        <div style={{ width: '32px', height: '22px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 'bold' }}>TBD</div>
                      )}
                      <span style={{ fontWeight: g.finished && parseInt(g.away_score) > parseInt(g.home_score) ? 'bold' : 'normal' }}>
                        {g.away_team_name_en}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}
