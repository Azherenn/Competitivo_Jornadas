-- =========================================================
-- Dex Competitiva — Migração 2: Time estruturado (item + golpes),
-- edição/exclusão de admin, ajuste manual de ranking
--
-- IMPORTANTE: rode esse arquivo DEPOIS do schema.sql original.
-- Esse arquivo assume que a migração de temporadas/ranking/meta
-- automático (rodada anteriormente no painel do Supabase) já existe.
-- Se você está montando o banco do ZERO, rode antes a migração
-- "migracao_features.sql" (temporadas, ranking, meta automático)
-- e só depois esse arquivo.
--
-- Esse arquivo é escrito para ser seguro de rodar mais de uma vez
-- (usa "if not exists" / "on conflict" sempre que possível).
-- =========================================================

-- ---------------------------------------------------------
-- 1) TIME ESTRUTURADO: cada pokémon do time agora carrega
-- nome + item + até 4 golpes, em vez de só o nome (texto solto).
--
-- Trocamos o array de texto "time_usado" por uma coluna jsonb,
-- onde cada entrada é: { "nome": "Garchomp", "item": "Choice Scarf",
-- "golpes": ["Earthquake", "Outrage", "Stone Edge", "Swords Dance"] }
--
-- Por que jsonb e não uma tabela separada: o time de um registro
-- nunca é consultado fora do contexto daquele registro (não
-- precisamos buscar "todo mundo que usou Earthquake" direto no banco
-- — isso já é resolvido pela view de meta automático, que só olha
-- o nome). jsonb mantém a leitura/escrita simples no app sem joins
-- extras, e ainda é totalmente consultável se precisar no futuro.
-- ---------------------------------------------------------

alter table registros add column if not exists time_estruturado jsonb not null default '[]'::jsonb;

-- Se você já tinha registros de teste com a coluna antiga (time_usado,
-- array de texto), essa migração converte cada nome solto em uma
-- entrada estruturada sem item/golpes — só pra não perder o que já
-- existia. Pode rodar mesmo se a tabela estiver vazia.
update registros
set time_estruturado = (
  select coalesce(
    jsonb_agg(jsonb_build_object('nome', nome, 'item', null, 'golpes', '[]'::jsonb)),
    '[]'::jsonb
  )
  from unnest(time_usado) as nome
)
where time_estruturado = '[]'::jsonb and array_length(time_usado, 1) > 0;

-- A coluna antiga "time_usado" (array de texto) fica mantida só pela
-- view de meta automático (que extrai nomes pra calcular % de uso).
-- Vamos recriar essa view pra ler de time_estruturado em vez disso,
-- e então a coluna antiga pode ser ignorada (mas não vamos apagar
-- ela agora, por segurança).

create or replace view meta_uso_calculado as
select
  pokemon_nome,
  t.formato,
  count(*) as vezes_usado,
  round(
    100.0 * count(*) / sum(count(*)) over (partition by t.formato),
    1
  ) as percentual_uso
from registros r
join torneios t on t.id = r.torneio_id
cross join lateral jsonb_array_elements(r.time_estruturado) as elem
cross join lateral (select elem->>'nome' as pokemon_nome) as extraido
group by pokemon_nome, t.formato
order by t.formato, vezes_usado desc;

-- ---------------------------------------------------------
-- 2) RANKING: ajuste manual de pontos por admin.
-- Em vez de mexer na pontuação calculada automaticamente,
-- guardamos um "ajuste" (positivo ou negativo) por jogador+temporada,
-- que soma em cima do cálculo normal. Isso preserva o cálculo
-- automático como fonte da verdade e deixa o ajuste auditável
-- (sempre dá pra ver o que foi ajuste manual vs. automático).
-- ---------------------------------------------------------

create table if not exists ajustes_ranking (
  id uuid primary key default gen_random_uuid(),
  nick_jogador text not null,
  temporada_id uuid references temporadas(id) on delete cascade,
  pontos_ajuste int not null default 0,
  motivo text,
  criado_em timestamptz default now(),
  unique (nick_jogador, temporada_id)
);

alter table ajustes_ranking enable row level security;
drop policy if exists "leitura publica ajustes_ranking" on ajustes_ranking;
create policy "leitura publica ajustes_ranking" on ajustes_ranking for select using (true);
drop policy if exists "escrita ajustes_ranking" on ajustes_ranking;
create policy "escrita ajustes_ranking" on ajustes_ranking for all using (true) with check (true);

-- Recria a view de ranking somando o ajuste manual ao cálculo automático.
create or replace view ranking_jogadores as
select
  base.nick_jogador,
  base.temporada_id,
  base.temporada_nome,
  base.total_torneios,
  base.pontos_calculados + coalesce(aj.pontos_ajuste, 0) as pontos_totais,
  base.pontos_calculados,
  coalesce(aj.pontos_ajuste, 0) as pontos_ajuste,
  base.campeoes,
  base.vices,
  base.tops
from (
  select
    r.nick_jogador,
    t.temporada_id,
    temp.nome as temporada_nome,
    count(*) as total_torneios,
    coalesce(sum(pc.pontos), 0) as pontos_calculados,
    count(*) filter (where r.colocacao = 'Campeão') as campeoes,
    count(*) filter (where r.colocacao = 'Vice') as vices,
    count(*) filter (where r.colocacao in ('Top 4', 'Top 8')) as tops
  from registros r
  join torneios t on t.id = r.torneio_id
  join temporadas temp on temp.id = t.temporada_id
  left join pontuacao_colocacao pc on pc.colocacao = r.colocacao
  group by r.nick_jogador, t.temporada_id, temp.nome
) base
left join ajustes_ranking aj
  on aj.nick_jogador = base.nick_jogador and aj.temporada_id = base.temporada_id;

-- ---------------------------------------------------------
-- 3) GOLPES: cache local de dados de golpe (nome, tipo, categoria)
-- vindos da PokeAPI, pra não precisar buscar de novo toda vez que
-- o mesmo golpe aparecer em outro registro.
-- ---------------------------------------------------------

create table if not exists golpes_cache (
  nome text primary key,
  tipo text,
  categoria text, -- 'physical' | 'special' | 'status'
  atualizado_em timestamptz default now()
);

alter table golpes_cache enable row level security;
drop policy if exists "leitura publica golpes_cache" on golpes_cache;
create policy "leitura publica golpes_cache" on golpes_cache for select using (true);
drop policy if exists "escrita golpes_cache" on golpes_cache;
create policy "escrita golpes_cache" on golpes_cache for all using (true) with check (true);

-- ---------------------------------------------------------
-- 4) PERMISSÕES DE ADMIN: editar/apagar registros e torneios.
-- O schema original só permitia leitura + inserção (jogadores
-- registrando). Agora o admin também precisa editar/apagar
-- registros incorretos no Histórico.
-- ---------------------------------------------------------

drop policy if exists "atualizacao publica registros" on registros;
create policy "atualizacao publica registros" on registros for update using (true) with check (true);
drop policy if exists "remocao publica registros" on registros;
create policy "remocao publica registros" on registros for delete using (true);

drop policy if exists "atualizacao publica torneios" on torneios;
create policy "atualizacao publica torneios" on torneios for update using (true) with check (true);
drop policy if exists "remocao publica torneios" on torneios;
create policy "remocao publica torneios" on torneios for delete using (true);

-- =========================================================
-- Fim da migração 2.
-- =========================================================
