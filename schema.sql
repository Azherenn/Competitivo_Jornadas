-- =========================================================
-- Cobblemon Competitivo — Schema do banco (Supabase/Postgres)
-- Cole esse arquivo inteiro no SQL Editor do Supabase e rode.
-- =========================================================

-- Extensão pra gerar UUID automaticamente
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- TABELA: pokemons
-- Catálogo base dos monstrinhos (nome, sprite, geração etc).
-- Serve pra alimentar autocomplete e a Tier List.
-- ---------------------------------------------------------
create table pokemons (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  sprite_url text,
  tipo_1 text,
  tipo_2 text,
  criado_em timestamptz default now()
);

-- ---------------------------------------------------------
-- TABELA: tier_list
-- Uma linha por pokémon por formato (singles/doubles).
-- Editável só por admin.
-- ---------------------------------------------------------
create table tier_list (
  id uuid primary key default gen_random_uuid(),
  pokemon_id uuid references pokemons(id) on delete cascade,
  formato text not null check (formato in ('singles', 'doubles')),
  tier text not null check (tier in ('S', 'A', 'B', 'C', 'D')),
  temporada text not null default 'atual',
  atualizado_em timestamptz default now(),
  unique (pokemon_id, formato, temporada)
);

-- ---------------------------------------------------------
-- TABELA: torneios
-- Registro de um torneio que aconteceu no servidor.
-- ---------------------------------------------------------
create table torneios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data date not null,
  formato text not null check (formato in ('singles', 'doubles')),
  criado_em timestamptz default now()
);

-- ---------------------------------------------------------
-- TABELA: registros
-- Cada submissão de um jogador: qual torneio, time usado,
-- pokémons mais vistos. Sem login — só nick.
-- ---------------------------------------------------------
create table registros (
  id uuid primary key default gen_random_uuid(),
  torneio_id uuid references torneios(id) on delete cascade,
  nick_jogador text not null,
  time_usado text[] not null default '{}',        -- array de nomes de pokémon
  mais_vistos text[] not null default '{}',         -- pokémons mais vistos no torneio
  colocacao text,                                   -- ex: "Top 4", "Campeão", "Fase de grupos"
  observacoes text,
  criado_em timestamptz default now()
);

-- ---------------------------------------------------------
-- TABELA: meta_report
-- Curadoria de "como enfrentar" cada pokémon do meta.
-- Editável só por admin.
-- ---------------------------------------------------------
create table meta_report (
  id uuid primary key default gen_random_uuid(),
  pokemon_id uuid references pokemons(id) on delete cascade,
  formato text not null check (formato in ('singles', 'doubles')),
  set_comum text,           -- itens/moves/EVs comuns observados
  como_enfrentar text,      -- estratégia/dica de counter
  popularidade int default 0, -- % ou contagem de uso, ajustável manualmente
  atualizado_em timestamptz default now(),
  unique (pokemon_id, formato)
);

-- ---------------------------------------------------------
-- Índices úteis
-- ---------------------------------------------------------
create index idx_registros_torneio on registros(torneio_id);
create index idx_tier_formato on tier_list(formato, temporada);
create index idx_meta_formato on meta_report(formato);

-- ---------------------------------------------------------
-- RLS (Row Level Security)
-- Jogadores podem LER tudo e CRIAR registros/torneios.
-- Só admin (via senha verificada no app) edita tier_list e meta_report.
-- Como não tem login de usuário, a "proteção" de admin é feita
-- no app com uma senha simples checada antes de liberar o formulário,
-- e aqui no banco com uma policy mais aberta (já que o Supabase
-- anon key não diferencia "quem" está mandando).
-- Para um projeto rápido isso é aceitável; se quiser endurecer depois,
-- dá pra migrar pra Supabase Auth com um usuário admin de verdade.
-- ---------------------------------------------------------

alter table pokemons enable row level security;
alter table tier_list enable row level security;
alter table torneios enable row level security;
alter table registros enable row level security;
alter table meta_report enable row level security;

-- Leitura pública em tudo
create policy "leitura publica pokemons" on pokemons for select using (true);
create policy "leitura publica tier_list" on tier_list for select using (true);
create policy "leitura publica torneios" on torneios for select using (true);
create policy "leitura publica registros" on registros for select using (true);
create policy "leitura publica meta_report" on meta_report for select using (true);

-- Jogadores podem inserir torneios e registros livremente
create policy "insercao publica torneios" on torneios for insert with check (true);
create policy "insercao publica registros" on registros for insert with check (true);

-- Tier list e meta report: insert/update/delete liberado via anon key,
-- mas o app só mostra esses formulários depois da senha de admin.
create policy "escrita tier_list" on tier_list for all using (true) with check (true);
create policy "escrita meta_report" on meta_report for all using (true) with check (true);
create policy "escrita pokemons" on pokemons for all using (true) with check (true);

-- =========================================================
-- Dados de exemplo (opcional — pode deletar essas linhas se quiser
-- começar do zero). Ajuda a ver o app funcionando na hora.
-- =========================================================
insert into pokemons (nome, tipo_1, tipo_2) values
  ('Garchomp', 'Dragon', 'Ground'),
  ('Dragapult', 'Dragon', 'Ghost'),
  ('Toxapex', 'Poison', 'Water'),
  ('Landorus-Therian', 'Ground', 'Flying'),
  ('Rillaboom', 'Grass', null);

insert into tier_list (pokemon_id, formato, tier, temporada)
select id, 'singles', 'S', 'temporada-1' from pokemons where nome = 'Garchomp';

insert into tier_list (pokemon_id, formato, tier, temporada)
select id, 'singles', 'A', 'temporada-1' from pokemons where nome = 'Dragapult';
