-- Reforço depois do code review. Rodar no SQL Editor (troque SITE e SEGREDO no fim, como no 001).

-- contador de online: índice pro count e limpeza só de vez em quando (não a cada chamada)
create index if not exists apuracao_online_visto on public.apuracao_online (visto);

create or replace function public.apuracao_ping(p_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  total integer;
begin
  if p_id is null or length(p_id) < 8 or length(p_id) > 64 then
    raise exception 'id inválido';
  end if;

  insert into public.apuracao_online (id, visto) values (p_id, now())
  on conflict (id) do update set visto = excluded.visto;

  if random() < 0.05 then
    delete from public.apuracao_online where visto < now() - interval '10 minutes';
  end if;

  select count(*) into total from public.apuracao_online where visto > now() - interval '75 seconds';
  return total;
end;
$$;

revoke all on function public.apuracao_ping(text) from public;
grant execute on function public.apuracao_ping(text) to anon, authenticated;

-- municípios a cada 5 min: a primeira volta leva ≈4 min, então duas nunca rodam juntas
select cron.unschedule('apuracao-municipios') where exists (select 1 from cron.job where jobname = 'apuracao-municipios');
select cron.schedule(
  'apuracao-municipios',
  '*/5 * * * *',
  $$ select net.http_get(
       url := 'https://SITE/api/coletar/municipios',
       headers := jsonb_build_object('x-coletor-segredo', 'SEGREDO'),
       timeout_milliseconds := 300000
     ) $$
);
