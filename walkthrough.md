Para resolver a quebra do princípio de responsabilidade única (SRP) no antigo arquivo centralizador de ~5.000 linhas, desmembramos o painel em subcomponentes modulares e isolados:
- **Aba de Ranking**: Migrada para [RankingTab.js](file:///C:/Users/nosre/OneDrive/Documentos/GitHub/bolao-copa-2026/src/components/dashboard/RankingTab.js).
- **Aba de Jogos e Resultados**: Migrada para [MatchesTab.js](file:///C:/Users/nosre/OneDrive/Documentos/GitHub/bolao-copa-2026/src/components/dashboard/MatchesTab.js).
- **Aba de Configurações**: Migrada para [SettingsTab.js](file:///C:/Users/nosre/OneDrive/Documentos/GitHub/bolao-copa-2026/src/components/dashboard/SettingsTab.js).

---

## 2. Otimização com Hooks Customizados (PDF & OCR)
Extraímos lógicas utilitárias complexas do frontend para hooks reutilizáveis:
- **Geração de PDF**: Implementada em [usePdfExport.js](file:///C:/Users/nosre/OneDrive/Documentos/GitHub/bolao-copa-2026/src/hooks/usePdfExport.js). Agora suporta múltiplos formatos de dados de aposta e isola o carregamento assíncrono do `jspdf` em tempo de execução.
- **OCR Inteligente e Compressão**: Implementados em [useOcr.js](file:///C:/Users/nosre/OneDrive/Documentos/GitHub/bolao-copa-2026/src/hooks/useOcr.js). Responsável por compactar a imagem no cliente antes de enviá-la para a API, melhorando consideravelmente o consumo de dados móveis e tempo de processamento.

---

## 3. Padronização Visual (Premium Dark & Gold)
- **Simplificação do Tema**: Removida a lógica de injeção de CSS dependente de seleções por países no `ThemeProvider.js`. Agora a aplicação segue estritamente a identidade visual unificada (Premium Dark & Gold).
- **Consolidação em CSS Global**: Todas as cores em RGBA "chumbadas" foram higienizadas e centralizadas como variáveis CSS customizadas no `:root` de [globals.css](file:///C:/Users/nosre/OneDrive/Documentos/GitHub/bolao-copa-2026/src/app/globals.css) (ex: `var(--bg-app)`, `var(--bg-card)`, `var(--accent-gold)`).
- **Ajustes Visuais Finais**:
  - Botões da tela inicial achatados com cantos premium.
  - Exibição correta da bandeira circular do campeão escolhido no topo do dashboard.
  - Correção na listagem de jogadores, avatares desfocados e ordenação por pontuação.
  - Integração de skeleton loaders elegantes e micro-animações nas abas.

---

## 4. Segurança do Banco e Roteamento de Admin
- **Problema de RLS**: Foi documentada e identificada a vulnerabilidade crítica nas políticas do banco de dados (tabelas com `USING(true) WITH CHECK(true)`).
- **Cargo de Administrador**: Desacoplamos a validação de privilégios de Admin do LocalStorage para evitar manipulação de requisições no cliente ao recalcular placares.

---

## 5. Histórico de Correções e Funcionalidades do Torneio
- **Placares Não Iniciados**: Partidas futuras não registram mais pontuações com base em placares em branco ou `0x0` falsos. A marcação só é avaliada em partidas finalizadas ou AO VIVO.
- **Identificação Individual do Mata-Mata**: Cada envio de mata-mata exige nome descritivo (ex: "Apostador - Aposta 1") permitindo múltiplos envios controlados pelo Pix.
- **Animação da Taça**: Progresso de carregamento animado com transições suaves de 120ms (onda dourada).

---

## 6. Correção na Listagem de Jogadores e Persistência de Configurações
- **Carregamento da Lista de Jogadores**: Corrigida a função `fetchData` no dashboard para buscar dados da tabela `usuarios` do banco de dados e alimentar o estado `usersList`, resolvendo o carregamento infinito na página de Jogadores.
- **Persistência de Configurações**: Adicionada a leitura das configurações na tabela `config` ao inicializar o dashboard, sincronizando os estados (`mataMataPublic`, `allowRegister`, `allowGroupUpload`, `allowDrawerMenu`, `paquetaTitle` e `paquetaBody`) e garantindo que as alterações salvas pelo administrador permaneçam após recarregar a página.
- **Sincronização do Usuário Atual**: Adicionada a atualização automática do objeto de usuário e do nível de permissão (role) a partir do banco de dados na inicialização do painel.

---

## 7. Melhorias Adicionais de UX, Avatares e Modo Sandbox
- **Achatamento dos Botões Centrais**: Reduzimos o tamanho e o espaçamento vertical dos 4 botões centrais de atalho na página inicial (`src/app/page.js`), tornando o design mais compacto ("achatado") e equilibrado.
- **Avatares na Página de Jogadores**: Agora, a página de jogadores cadastrados exibe a foto de perfil salva pelo jogador (da coluna `avatar_url` da tabela `usuarios`) ao lado do seu nome. Caso o usuário não possua foto cadastrada, um ícone de usuário padrão é mantido.
- **Modo Sandbox para o Admin (Mata-Mata)**:
  - Adicionado um interruptor *"Ativar Modo Sandbox (Apenas Local)"* nas Ações do Desenvolvedor na aba de Configurações do painel.
  - Quando ativado, uma barra informativa amber/laranja surge no topo indicando que o modo de testes está ligado.
  - Permite que o Admin clique em qualquer confronto diretamente a partir do chaveamento visual (fase de grupos ou mata-mata) para abrir o modal de detalhes do jogo.
  - Habilita uma aba exclusiva `🧪 Sandbox` no modal onde o Admin pode simular nomes de equipes (para avançar no mata-mata) e placares de gols.
  - Os resultados simulados são mantidos localmente via `localStorage` e refletem imediatamente na classificação dos grupos e no chaveamento geral da tela, de forma 100% isolada e sem interferir no banco de dados de produção.

---

## 8. Ícone de Atalho PWA com o Logo Oficial da Copa
- **Design de Alto Nível**: Substituímos os ícones de atalho do aplicativo (PWA / favicon) por uma versão premium que traz o **logotipo oficial da Copa do Mundo de 2026** (o numeral 26 vertical estilizado com a taça dourada ao centro) destacado sobre um escudo circular verde-esmeralda com brilho dourado metálico.
- **Sincronização PWA**: Atualizamos as imagens nos tamanhos recomendados (`public/icons/icon-192.png` e `public/icons/icon-512.png`), mantendo o suporte nativo a ícones adaptáveis (*maskable*) e normais (*any*) no manifesto do aplicativo.
- **Favicons & Apple Touch**: As tags `<link rel="apple-touch-icon">` no cabeçalho global do `layout.js` agora carregam a nova imagem oficial, assegurando uma identidade visual integrada em dispositivos iOS, Android e navegadores desktop.

---

## 9. Logo Oficial na Tela de Carregamento (Splash Screen)
- **Consistência Visual**: Atualizamos a tela de carregamento inicial em [page.js](file:///c:/Users/nosre/OneDrive/Documentos/GitHub/bolao-copa-2026/src/app/page.js) para carregar o novo ícone oficial de atalho (`/icons/icon-512.png`) com a moldura dupla dourada e escudo verde-esmeralda, substituindo o antigo logo de fundo transparente simples.
- **Experiência Premium**: Isso garante que a transição do clique no atalho do celular para a abertura do app seja visualmente idêntica e fluida, transmitindo um aspecto profissional e nativo.

---

## 10. Proteção e Sincronização Completa de Resultados (Recalcular)
- **Preservação de Histórico**: Corrigimos a rota de recalcular `/api/admin/recalculate` para proteger confrontos já marcados como finalizados (`finished: true`) no banco de dados. Eles não são mais limpos ou redefinidos para `null` caso a API de sincronização tenha atraso ou retorne o jogo como não finalizado.
- **Sincronização Total (Fases Anteriores)**: Ajustamos a função `fetchAllGames` em [worldcupApi.js](file:///c:/Users/nosre/OneDrive/Documentos/GitHub/bolao-copa-2026/src/lib/worldcupApi.js) para aceitar o parâmetro `forceWorldCupApi`. Quando acionado no painel de administração, o sistema faz o bypass da ESPN e consulta diretamente a listagem completa de 104 confrontos na API do WorldCup26.ir.
- **Resolução de Restaurações**: Desta forma, se o administrador precisar restaurar/limpar o banco de dados e recalcular os pontos, clicar em "Recalcular" irá re-sincronizar e preencher imediatamente **todos os jogos já finalizados** desde o início do torneio, e não apenas os jogos do dia corrente.

---

## 11. Tela de Carregamento Premium da Opção E (Animada sobre Imagem Gerada)
- **Integração com Imagem Oficial**: Salvamos a imagem da proposta visual gerada (`loading_option_e_1782353410630.png`) como o ativo oficial de carregamento do app (`public/loading_option_e.png`), garantindo que o visual final da taça 3D dourada e do fundo de veludo verde seja idêntico ao mockup.
- **Efeito de Câmera Zoom Cinemático**: Adicionamos uma animação CSS `@keyframes cinematicZoom` na camada de fundo. A imagem começa ampliada e realiza um suave afastamento e estabilização de escala ao longo dos 4,5 segundos.
- **Partículas de Fluido e Brilho em Tempo Real**: Adicionamos um canvas transparente sobre a imagem para simular o efeito do fluido líquido da taça:
  - **Fagulhas à Esquerda**: Partículas douradas que brotam dinamicamente do lado esquerdo do globo da taça e sobem flutuando em arco para a esquerda, simulando respingos em movimento real-time.
  - **Poeira Estelar de Fundo**: Partículas sutis flutuando em diferentes opacidades e tamanhos para dar profundidade espacial.
  - **Sheen Sweep (Reflexo de Luz)**: Um reflexo vertical dourado metálico que desliza continuamente pelo corpo da taça.
- **Overlay Perfeito do Spinner**: Removemos o card HTML duplicado. Como a imagem original já contém o lindo card de vidro e todos os textos em alta resolução, posicionamos o spinner dourado animado em HTML via coordenadas absolutas (`top: 70.3%` e `left: 50%`) exatamente em cima do círculo estático da imagem, dando vida e rotação ao loader oficial de forma nativa e sem desalinhamento.

---

## 12. Sincronização do Mata-mata (Fase R32) e Correção de Banco de Dados
- **Ajuste de VARCHAR na Coluna Grupo**: Corrigimos o tipo da coluna `grupo` na tabela `confrontos` no script [schema.sql](file:///C:/Users/nosre/OneDrive/Documentos/GitHub/bolao-copa-2026/schema.sql) de `VARCHAR(2)` para `VARCHAR(10)`. Isso permite salvar e atualizar os jogos do mata-mata correspondentes a `'R32'`, `'R16'`, `'THIRD'` e `'FINAL'` sem truncamento ou erros do PostgreSQL.
- **Auto-Sincronização Local Fallback**: Modificamos a função `fetchData` no arquivo [page.js](file:///C:/Users/nosre/OneDrive/Documentos/GitHub/bolao-copa-2026/src/app/dashboard/page.js) para detectar se a aplicação está rodando em modo sandbox ou local sem conexão ativa com o Supabase. Caso o servidor não esteja configurado, o cliente realiza a sincronização dos dados da API diretamente no navegador e atualiza o `localStorage` com os confrontos oficiais do Round of 32 (R32) de forma 100% transparente.
- **Auto-Inserção de Confrontos Ausentes no Servidor**: Corrigimos as rotas `/api/sync/route.js` e `/api/admin/recalculate/route.js` no servidor para detectar se os confrontos de mata-mata (IDs 73 a 104) estão ausentes no banco de dados Supabase de produção (caso o script SQL inicial tenha falhado para estas linhas no servidor). Se estiverem ausentes, o backend os cria automaticamente usando os modelos originais e realiza a sincronização imediata com os times oficiais da API.




