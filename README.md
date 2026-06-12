# BOLÃO COPA 2026 (Next.js + Supabase)

Este é um projeto completo de bolão para a Copa do Mundo de 2026 estruturado em **Next.js (App Router)** e integrado ao **Supabase**, feito sob medida para dispositivos móveis (Mobile-First).

---

## 🚀 Como Executar o Projeto

Como o ambiente local não possui Node.js instalado no momento, o projeto está estruturado e pronto para ser publicado diretamente no seu **GitHub** e publicado na **Vercel** com poucos cliques!

### Passo 1: Configurar o Supabase
1. Crie um projeto gratuito no [Supabase](https://supabase.com).
2. Acesse a aba **SQL Editor** no painel do Supabase.
3. Copie todo o conteúdo do arquivo `schema.sql` (que está na raiz do seu projeto) e clique em **Run** para criar a estrutura das tabelas e carregar os jogos reais da Copa.

### Passo 2: Publicar no GitHub
Crie um repositório no seu GitHub e suba os arquivos gerados nesta pasta:
```bash
git init
git add .
git commit -m "feat: bolao copa 2026 setup"
git remote add origin <link-do-seu-repositorio>
git branch -M main
git push -u origin main
```

### Passo 3: Deploy na Vercel
1. Crie uma conta ou faça login na [Vercel](https://vercel.com).
2. Importe o repositório do GitHub recém-criado.
3. Na seção de **Environment Variables** (Variáveis de Ambiente), adicione as seguintes chaves obtidas nas configurações de API do seu painel do Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL` = (URL do seu projeto Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Chave anônima do seu projeto Supabase)
4. Clique em **Deploy**. O seu aplicativo estará no ar e pronto para ser acessado por qualquer celular!

---

## 🛠️ Funcionamento Sem Banco (Modo Híbrido)

Para facilitar os testes, o aplicativo possui um **mecanismo de fallback inteligente**. Caso as chaves do Supabase não estejam preenchidas, o aplicativo ativa automaticamente um **Mock Database via LocalStorage**.
- Os logins pré-cadastrados funcionam localmente:
  - **Jefferson** (Senha: `060199`)
  - **Junior** (Senha: `062026`)
- Você poderá simular palpites por grupos, salvar, criar e ler bolões via simulação de foto OCR e ver a pontuação atualizar o ranking em tempo real no seu próprio navegador!

---

## 📂 Estrutura de Arquivos Criados

- `package.json` / `next.config.mjs` / `jsconfig.json`: Arquivos de configuração do Next.js.
- `schema.sql`: Script SQL para gerar suas tabelas do Supabase.
- `.env.local.example`: Modelo para configuração de chaves do banco de dados.
- `src/lib/supabase.js`: Inicializador da conexão com Supabase e Mock LocalStorage DB.
- `src/components/Icons.js`: Biblioteca centralizada de ícones vetoriais em React.
- `src/app/layout.js` / `globals.css`: Estrutura base de visual, com CSS premium e layout mobile-first.
- `src/app/page.js`: Splash Screen de carregamento e Tela Inicial (Login, Ranking, Resultados, Próximos jogos).
- `src/app/dashboard/page.js`: Área interna do painel com abas, simulador de câmera para OCR de bolões e pódio interativo.
