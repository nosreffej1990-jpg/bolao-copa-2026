import React from 'react';
import * as Icons from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function SettingsTab({
  handleRecalcular,
  mataMataPublic, setMataMataPublic,
  allowRegister, setAllowRegister,
  allowGroupUpload, setAllowGroupUpload,
  allowDrawerMenu, setAllowDrawerMenu,
  paquetaTitle, setPaquetaTitle,
  paquetaBody, setPaquetaBody,
  handleRestoreConfrontosOnly,
  handleResetDatabase,
  setActiveTab,
  currentUser,
  showToast,
  sandboxMode, setSandboxMode,
  fetchData, confrontos
}) {
  return (
    <div className="tab-pane active" style={{ animation: 'fadeIn 0.4s ease-out' }}>
<div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem', color: 'var(--text-primary)' }}>Painel de Configurações</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Gerencie o comportamento do bolão, restaures e edições de textos do sistema.
              </p>
            </div>
              <div style={{ marginBottom: '1.5rem' }}>
                {/* Recalcular Pontuação */}
                  <button onClick={handleRecalcular} style={{
                    width: '100%', marginTop: '1.25rem', padding: '0.85rem',
                    background: 'transparent',
                    border: '1px solid var(--accent-gold)', borderRadius: '10px', color: 'var(--accent-gold)', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                  }}>
                    <Icons.RefreshCw size={18} /> Recalcular Pontuação
                  </button>

                  
              </div>

            <button 
              className="btn-upload-bolao" 
              style={{ backgroundColor: 'rgba(251,191,36,0.12)', color: '#D2A74F', border: '1px solid rgba(251,191,36,0.3)', marginBottom: '1.25rem', width: '100%', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => setActiveTab('gerenciar_usuarios')}
            >
              👥 Ir para o Gerenciador de Usuários
            </button>

            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <h4 style={{ fontSize: '0.85rem', color: '#D2A74F', margin: 0, fontWeight: 'bold' }}>⚙️ Painel de Ativações do Admin</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={mataMataPublic}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setMataMataPublic(val);
                      try {
                        if (!isSupabaseConfigured) {
                          await supabase.from('config').upsert({ key: 'mata_mata_public', value: String(val) });
                        } else {
                          const password = localStorage.getItem('copa26_pass') || '';
                          await fetch('/api/usuarios', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'updateConfig',
                              username: currentUser,
                              password,
                              key: 'mata_mata_public',
                              value: String(val)
                            })
                          });
                        }
                        showToast(`Aba do Mata-Mata ${val ? 'Liberada no Menu' : 'Oculta para Jogadores'}`);
                      } catch (err) {
                        console.error(err);
                        showToast('Erro ao atualizar configuração.', 'error');
                      }
                    }}
                  />
                  <span>Liberar Aba de Apostas Mata-Mata para todos os Jogadores</span>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={allowRegister}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setAllowRegister(val);
                      try {
                        if (!isSupabaseConfigured) {
                          await supabase.from('config').upsert({ key: 'allow_register', value: String(val) });
                        } else {
                          const password = localStorage.getItem('copa26_pass') || '';
                          await fetch('/api/usuarios', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'updateConfig',
                              username: currentUser,
                              password,
                              key: 'allow_register',
                              value: String(val)
                            })
                          });
                        }
                        showToast(`Novos cadastros ${val ? 'Ativados' : 'Desativados'}`);
                      } catch (err) {
                        console.error(err);
                        showToast('Erro ao atualizar configuração.', 'error');
                      }
                    }}
                  />
                  <span>Permitir Novos Cadastros de Jogadores</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={allowGroupUpload}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setAllowGroupUpload(val);
                      try {
                        if (!isSupabaseConfigured) {
                          await supabase.from('config').upsert({ key: 'allow_group_upload', value: String(val) });
                        } else {
                          const password = localStorage.getItem('copa26_pass') || '';
                          await fetch('/api/usuarios', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'updateConfig',
                              username: currentUser,
                              password,
                              key: 'allow_group_upload',
                              value: String(val)
                            })
                          });
                        }
                        showToast(`Upload da Fase de Grupos ${val ? 'Ativado' : 'Desativado'}`);
                      } catch (err) {
                        console.error(err);
                        showToast('Erro ao atualizar configuração.', 'error');
                      }
                    }}
                  />
                  <span>Permitir Upload/Cadastro de Bolões da Fase de Grupos</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={allowDrawerMenu}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setAllowDrawerMenu(val);
                      try {
                        if (!isSupabaseConfigured) {
                          await supabase.from('config').upsert({ key: 'allow_drawer_menu', value: String(val) });
                        } else {
                          const password = localStorage.getItem('copa26_pass') || '';
                          await fetch('/api/usuarios', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'updateConfig',
                              username: currentUser,
                              password,
                              key: 'allow_drawer_menu',
                              value: String(val)
                            })
                          });
                        }
                        showToast(`Menu Hamburger ${val ? 'Ativado' : 'Desativado'}`);
                      } catch (err) {
                        console.error(err);
                        showToast('Erro ao atualizar configuração.', 'error');
                      }
                    }}
                  />
                  <span>Exibir Botão de Menu Superior (Hamburger)</span>
                </label>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>✏️ Editar Textos do Popup de Confirmação (Paquetá)</span>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Título do Popup</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.6rem', marginTop: '0.2rem' }}
                    value={paquetaTitle}
                    onChange={(e) => setPaquetaTitle(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Mensagem (Corpo)</label>
                  <textarea
                    className="form-control"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.6rem', minHeight: '60px', marginTop: '0.2rem', fontFamily: 'inherit', resize: 'vertical' }}
                    value={paquetaBody}
                    onChange={(e) => setPaquetaBody(e.target.value)}
                  />
                </div>
                <button
                  onClick={async () => {
                    try {
                      const password = localStorage.getItem('copa26_pass') || '';
                      await Promise.all([
                        fetch('/api/usuarios', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'updateConfig',
                            username: currentUser,
                            password,
                            key: 'paqueta_title',
                            value: paquetaTitle
                          })
                        }),
                        fetch('/api/usuarios', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'updateConfig',
                            username: currentUser,
                            password,
                            key: 'paqueta_body',
                            value: paquetaBody
                          })
                        })
                      ]);
                      showToast('Textos do popup salvos com sucesso!');
                    } catch (err) {
                      console.error(err);
                      showToast('Erro ao salvar textos do popup.', 'error');
                    }
                  }}
                  style={{
                    background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)',
                    color: '#D2A74F', padding: '0.4rem 1rem', borderRadius: '8px',
                    fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start'
                  }}
                >
                  Salvar Textos do Popup
                </button>
              </div>

              {currentUser === 'Jefferson' && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>⚠ Ações do Desenvolvedor (Jefferson)</span>
                  
                  {/* Sandbox Mode Toggle */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', cursor: 'pointer', margin: '0.25rem 0' }}>
                    <input
                      type="checkbox"
                      checked={sandboxMode}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setSandboxMode(val);
                        localStorage.setItem('copa26_sandbox', String(val));
                        if (val) {
                          localStorage.setItem('copa26_confrontos_sandbox', JSON.stringify(confrontos));
                        } else {
                          localStorage.removeItem('copa26_confrontos_sandbox');
                        }
                        fetchData();
                        showToast(val ? '🧪 Modo Sandbox Ativado! (Alterações locais apenas)' : 'Modo Sandbox Desativado.');
                      }}
                    />
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>Ativar Modo Sandbox (Apenas Local)</span>
                  </label>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    <button className="btn-upload-bolao" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }} onClick={handleRestoreConfrontosOnly}>
                      🔄 Restaurar Confrontos
                    </button>
                    <button className="btn-upload-bolao" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }} onClick={handleResetDatabase}>
                      🗑️ Reiniciar Dados
                    </button>
                  </div>
                </div>
              )}
            </div>
     
    </div>
  );
}
