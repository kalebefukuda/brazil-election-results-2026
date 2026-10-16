-- Coleta econômica: guarda o ETag de cada arquivo do TSE já processado e o histórico pronto pra servir.
-- Rodar no SQL Editor. Antes, troque SITE e SEGREDO (o valor de CRON_SECRET na Vercel) no fim do arquivo.

create table if not exists public.apuracao_estado (
  chave text primary key,  -- etag-{eleição}-br, etag-{eleição}-mun-{uf}, historico-{eleição}
  etag text,
  valor jsonb,
  atualizado_em timestamptz not null default now()
);

alter table public.apuracao_estado enable row level security;
drop policy if exists "leitura publica" on public.apuracao_estado;
create policy "leitura publica" on public.apuracao_estado for select to anon, authenticated using (true);

-- desliga qualquer agendamento antigo (o passo 0 já fez isso; aqui fica idempotente)
select cron.unschedule(jobname) from cron.job where jobname like 'apuracao-%';

-- 2º turno: 25/10, das 17h à 0h59 de Brasília (o pg_cron do Supabase roda em UTC: 25/10 20h até 26/10 3h59)
select cron.schedule('apuracao-coletar-25', '*/2 20-23 25 10 *', $$ select net.http_get(
  url := 'https://SITE/api/coletar',
  headers := jsonb_build_object('Authorization', 'Bearer SEGREDO'),
  timeout_milliseconds := 60000) $$);
select cron.schedule('apuracao-coletar-26', '*/2 0-3 26 10 *', $$ select net.http_get(
  url := 'https://SITE/api/coletar',
  headers := jsonb_build_object('Authorization', 'Bearer SEGREDO'),
  timeout_milliseconds := 60000) $$);
select cron.schedule('apuracao-municipios-25', '*/5 20-23 25 10 *', $$ select net.http_get(
  url := 'https://SITE/api/coletar/municipios',
  headers := jsonb_build_object('Authorization', 'Bearer SEGREDO'),
  timeout_milliseconds := 300000) $$);
select cron.schedule('apuracao-municipios-26', '*/5 0-3 26 10 *', $$ select net.http_get(
  url := 'https://SITE/api/coletar/municipios',
  headers := jsonb_build_object('Authorization', 'Bearer SEGREDO'),
  timeout_milliseconds := 300000) $$);

-- conferência: select jobname, schedule from cron.job;
-- depois da eleição: select cron.unschedule(jobname) from cron.job where jobname like 'apuracao-%';
