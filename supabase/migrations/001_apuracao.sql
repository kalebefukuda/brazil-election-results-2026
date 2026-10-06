-- Histórico da apuração: o coletor (/api/coletar) grava aqui, o site só lê.
-- Rodar no SQL Editor do Supabase. Antes, troque SITE e SEGREDO no fim do arquivo.

-- uma foto por horário de totalização do TSE (só grava quando o TSE publica algo novo)
create table if not exists public.apuracao_snapshot (
  eleicao text not null,
  momento timestamptz not null,
  br jsonb not null,  -- { st, ts, vv, c: { "13": votos, "22": votos, ... }, md }
  ufs jsonb not null, -- { "sp": { st, ts, vv, c: {...} }, ... }
  coletado_em timestamptz not null default now(),
  primary key (eleicao, momento)
);

-- o que vira linha no "Últimas atualizações"
create table if not exists public.apuracao_evento (
  id bigint generated always as identity primary key,
  eleicao text not null,
  momento timestamptz not null,
  tipo text not null, -- secoes | presidente | governador
  uf text,
  chave text not null unique, -- evita repetir o mesmo evento se o coletor rodar duas vezes
  dados jsonb not null
);
create index if not exists apuracao_evento_eleicao_momento on public.apuracao_evento (eleicao, momento desc);

-- último resultado por município de cada UF (só presidente)
create table if not exists public.apuracao_municipios (
  eleicao text not null,
  uf text not null,
  hora text not null,
  dados jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (eleicao, uf)
);

-- leitura pública, escrita só com a service role (que ignora RLS)
alter table public.apuracao_snapshot enable row level security;
alter table public.apuracao_evento enable row level security;
alter table public.apuracao_municipios enable row level security;

drop policy if exists "leitura publica" on public.apuracao_snapshot;
create policy "leitura publica" on public.apuracao_snapshot for select to anon, authenticated using (true);
drop policy if exists "leitura publica" on public.apuracao_evento;
create policy "leitura publica" on public.apuracao_evento for select to anon, authenticated using (true);
drop policy if exists "leitura publica" on public.apuracao_municipios;
create policy "leitura publica" on public.apuracao_municipios for select to anon, authenticated using (true);

-- agendamento: o próprio Supabase chama o coletor
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobname) from cron.job where jobname in ('apuracao-coletar', 'apuracao-municipios');

-- Brasil + estados + eventos: a cada minuto
select cron.schedule(
  'apuracao-coletar',
  '* * * * *',
  $$ select net.http_get(
       url := 'https://SITE/api/coletar',
       headers := jsonb_build_object('x-coletor-segredo', 'SEGREDO'),
       timeout_milliseconds := 60000
     ) $$
);

-- municípios (≈5.570 arquivos, com freio): a cada 3 minutos
select cron.schedule(
  'apuracao-municipios',
  '*/3 * * * *',
  $$ select net.http_get(
       url := 'https://SITE/api/coletar/municipios',
       headers := jsonb_build_object('x-coletor-segredo', 'SEGREDO'),
       timeout_milliseconds := 300000
     ) $$
);

-- conferência: select jobname, schedule from cron.job;
-- desligar depois da eleição: select cron.unschedule('apuracao-coletar'); select cron.unschedule('apuracao-municipios');
