# Dex Competitiva

App pra organizar o competitivo de Cobblemon do servidor: jogadores registram
torneios, time e pokémons mais vistos; admin mantém a tier list e o meta report
(Singles/Doubles) com dica de como enfrentar cada um.

Stack: React + Vite no front, Supabase (Postgres) como banco/API, deploy em
Netlify ou Vercel.

---

## 1. Criar o projeto no Supabase

1. Crie uma conta em https://supabase.com (dá pra logar com GitHub).
2. Clique em **New Project**. Escolha um nome (ex: `dex-competitiva`), uma
   senha de banco (guarde em algum lugar, mas você não vai precisar dela no
   dia a dia) e a região mais próxima (South America, se disponível).
3. Espere o projeto provisionar (1-2 minutos).

## 2. Rodar o schema do banco

1. No painel do projeto, vá em **SQL Editor** (ícone no menu lateral).
2. Clique em **New query**.
3. Abra o arquivo `schema.sql` (está na raiz deste projeto), copie todo o
   conteúdo e cole no editor.
4. Clique em **Run**. Isso cria as 5 tabelas (`pokemons`, `tier_list`,
   `torneios`, `registros`, `meta_report`), os índices, as políticas de
   segurança (RLS) e insere alguns dados de exemplo.
5. Confirme em **Table Editor** que as tabelas apareceram.

> Se quiser come çar 100% do zero sem os exemplos, abra o `schema.sql`,
> apague o bloco final (a partir do comentário "Dados de exemplo") antes
> de rodar.

## 3. Pegar as chaves de API

1. No painel, vá em **Settings > API**.
2. Copie a **Project URL** (algo como `https://xxxxx.supabase.co`).
3. Copie a chave **anon public** (a chave pública, não a `service_role`).

## 4. Configurar o projeto localmente

```bash
# entre na pasta do projeto
cd cobblemon-competitive

# copie o arquivo de exemplo de variáveis de ambiente
cp .env.example .env
```

Abra o `.env` e cole os valores que você copiou:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
VITE_ADMIN_PASSWORD=escolha-uma-senha-sua
```

`VITE_ADMIN_PASSWORD` é a senha que vai liberar a edição da Tier List e do
Meta Report dentro do próprio app (não tem relação com a senha do banco).

## 5. Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. Teste registrar um torneio, depois confira
se ele aparece em **Histórico**, e entre na área de admin da **Tier list**
com a senha que você definiu.

## 6. Subir pro GitHub

```bash
git init
git add .
git commit -m "primeira versão da dex competitiva"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

(Crie o repositório vazio no GitHub antes do `git remote add`.)

## 7. Deploy (Netlify ou Vercel)

Ambos têm plano free que dá de sobra pra esse projeto.

### Netlify
1. https://app.netlify.com → **Add new site > Import an existing project**.
2. Conecte com GitHub e escolha o repositório.
3. Build command: `npm run build` — Publish directory: `dist`
4. Em **Environment variables**, adicione as 3 mesmas variáveis do seu `.env`
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_PASSWORD`).
5. Deploy. Pronto, você tem uma URL pública.

### Vercel
1. https://vercel.com/new → importe o repositório do GitHub.
2. O Vercel detecta Vite automaticamente.
3. Em **Environment Variables**, adicione as mesmas 3 variáveis.
4. Deploy.

> Importante: o `.env` nunca vai pro Git (está no `.gitignore`). As variáveis
> de produção são configuradas direto no painel do Netlify/Vercel.

---

## Estrutura do projeto

```
schema.sql                       → SQL pra colar no Supabase
src/
  lib/supabase.js                → cliente do Supabase
  components/
    RegistroTorneio.jsx          → aba "Registrar"
    Historico.jsx                → aba "Histórico"
    TierList.jsx                 → aba "Tier list" (leitura livre, edição com senha)
    MetaReport.jsx                → aba "Meta report" (leitura livre, edição com senha)
    TagInput.jsx                  → campo de tags reutilizável (time / mais vistos)
  App.jsx                        → navegação por abas
  index.css                      → todo o visual do app
```

## Sobre a senha de admin

Esse projeto é pra ser rápido de montar, então a "proteção" de admin é uma
senha simples checada no próprio navegador — não é um sistema de login de
verdade. Suficiente pra um servidor de Minecraft entre amigos, mas não
trate isso como segurança forte: qualquer pessoa que abrir o código-fonte
do site no navegador (View Source / DevTools) consegue ver a senha. Se um
dia quiser endurecer isso, o caminho é migrar para o Supabase Auth com um
usuário admin de verdade.

## Próximos passos possíveis (não implementados ainda)

- Calcular automaticamente "mais usados no meta" a partir dos registros dos
  jogadores, em vez de só a curadoria manual do admin.
- Sprites dos pokémons (a tabela `pokemons` já tem a coluna `sprite_url`
  pronta pra isso).
- Ranking de jogador (quantos torneios, melhores colocações).
- Histórico por temporada na tier list (a coluna `temporada` já existe).
