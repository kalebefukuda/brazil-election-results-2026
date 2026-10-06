-- Contador "N pessoas online": cada aba aberta chama apuracao_ping a cada 30s (lib/online.ts)
-- e recebe quantas abas deram sinal nos últimos 75s.

create table if not exists public.apuracao_online (
  id text primary key,
  visto timestamptz not null default now()
);

-- ninguém lê nem escreve direto: só pela função abaixo
alter table public.apuracao_online enable row level security;

create or replace function public.apuracao_ping(p_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  total integer;
begin
  if p_id is null or length(p_id) > 64 then
    raise exception 'id inválido';
  end if;

  insert into apuracao_online (id, visto) values (p_id, now())
  on conflict (id) do update set visto = excluded.visto;

  -- limpa quem sumiu há mais de 10 min pra tabela não crescer
  delete from apuracao_online where visto < now() - interval '10 minutes';

  select count(*) into total from apuracao_online where visto > now() - interval '75 seconds';
  return total;
end;
$$;

revoke all on function public.apuracao_ping(text) from public;
grant execute on function public.apuracao_ping(text) to anon, authenticated;
