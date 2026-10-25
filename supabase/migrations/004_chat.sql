-- Chat ao vivo: a mensagem é pública (só leitura); quem escreveu, denúncias e bloqueios ficam fechados no banco.
-- Toda escrita passa por apuracao_chat_enviar, que valida texto, apelido e ritmo de envio.
-- Rodar no SQL Editor.
--
-- Desligar o chat:   insert into apuracao_estado (chave) values ('chat-desligado') on conflict do nothing;
-- Religar:           delete from apuracao_estado where chave = 'chat-desligado';
-- Apagar mensagem:   delete from apuracao_chat where id = 123;
-- Bloquear o autor:  insert into apuracao_chat_bloqueio (quem)
--                      select unnest(array[autor, origem]) from apuracao_chat_autoria where msg_id = 123
--                      on conflict do nothing;

create table if not exists public.apuracao_chat (
  id bigint generated always as identity primary key,
  apelido text not null,
  texto text not null,
  criado_em timestamptz not null default now()
);
create index if not exists apuracao_chat_criado on public.apuracao_chat (criado_em);

alter table public.apuracao_chat enable row level security;
drop policy if exists "leitura publica" on public.apuracao_chat;
create policy "leitura publica" on public.apuracao_chat for select to anon, authenticated using (true);

-- autoria: id aleatório do navegador e hash da origem (o IP nunca é guardado)
create table if not exists public.apuracao_chat_autoria (
  msg_id bigint primary key references public.apuracao_chat (id) on delete cascade,
  autor text not null,
  origem text,
  texto text not null,
  criado_em timestamptz not null default now()
);
create index if not exists apuracao_chat_autoria_autor on public.apuracao_chat_autoria (autor, criado_em);
create index if not exists apuracao_chat_autoria_origem on public.apuracao_chat_autoria (origem, criado_em);

create table if not exists public.apuracao_chat_denuncia (
  msg_id bigint not null references public.apuracao_chat (id) on delete cascade,
  quem text not null,
  primary key (msg_id, quem)
);

create table if not exists public.apuracao_chat_bloqueio (
  quem text primary key,
  criado_em timestamptz not null default now()
);

create table if not exists public.apuracao_chat_sal (sal text not null);
insert into public.apuracao_chat_sal (sal)
select gen_random_uuid()::text || gen_random_uuid()::text
where not exists (select 1 from public.apuracao_chat_sal);

-- sem política: ninguém de fora lê nem escreve, só as funções abaixo
alter table public.apuracao_chat_autoria enable row level security;
alter table public.apuracao_chat_denuncia enable row level security;
alter table public.apuracao_chat_bloqueio enable row level security;
alter table public.apuracao_chat_sal enable row level security;

-- hash da origem da requisição, com sal secreto: serve pra limitar e bloquear sem guardar o IP
create or replace function public.apuracao_chat_origem()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  h json := nullif(current_setting('request.headers', true), '')::json;
  v_ip text;
begin
  v_ip := coalesce(h ->> 'cf-connecting-ip', h ->> 'x-real-ip', split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1));
  v_ip := nullif(trim(v_ip), '');
  if v_ip is null then
    return null;
  end if;
  return encode(sha256(convert_to(v_ip || (select s.sal from apuracao_chat_sal s limit 1), 'UTF8')), 'hex');
end;
$$;

-- minúsculas, sem acento e sem troca de letra por número: "P0rr@" vira "porra"
create or replace function public.apuracao_chat_normalizar(t text)
returns text
language sql
immutable
as $$
  select translate(lower(t), 'áàâãäéèêëíìîïóòôõöúùûüç0134578@$', 'aaaaaeeeeiiiiooooouuuucoieastbas')
$$;

create or replace function public.apuracao_chat_proibido(t text)
returns text
language plpgsql
immutable
as $$
declare
  n text := public.apuracao_chat_normalizar(t);
begin
  if n ~ '(https?:|www\.|[a-z0-9-]+\.(com|br|net|org|io|ly|me|gg|xyz|info|app|site|link)(\M|/))' then
    return 'link';
  end if;
  -- CPF, telefone, e-mail ou sequência longa de números: dado pessoal não entra (LGPD)
  if t ~ '\d{3}\.?\d{3}\.?\d{3}-?\d{2}' or t ~ '\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}' or t ~ '\S+@\S+\.\S+'
    or t ~ '\d{8,}' then
    return 'pessoal';
  end if;
  if n ~ ('\m(porra|caralh\w*|puta\w*|put[ao]s?|fdp|pqp|vsf|tnc|foda\w*|fod[ei]\w*|fud[ei]\w*|buc[ei]t\w*|xoxot\w*|'
      || 'cuzao|arromb\w*|viad\w*|bichinh\w*|sapatao|travec\w*|macac[oa]s?|crioul\w*|nazi\w*|hitler|estupr\w*|'
      || 'retardad\w*|piranh\w*|vagabund\w*|desgraca\w*|merda|bosta|kys|se mat[ae]|vou te matar)\M') then
    return 'palavra';
  end if;
  return null;
end;
$$;

create or replace function public.apuracao_chat_enviar(p_autor text, p_apelido text, p_texto text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origem text := apuracao_chat_origem();
  v_apelido text := regexp_replace(trim(coalesce(p_apelido, '')), '\s+', ' ', 'g');
  v_texto text := regexp_replace(trim(coalesce(p_texto, '')), '\s+', ' ', 'g');
  v_motivo text;
  v_nova apuracao_chat;
begin
  if exists (select 1 from apuracao_estado where chave = 'chat-desligado') then
    raise exception 'chat-fechado';
  end if;
  if p_autor is null or p_autor !~ '^[0-9a-f-]{36}$' then
    raise exception 'autor';
  end if;
  if exists (select 1 from apuracao_chat_bloqueio b where b.quem in (p_autor, v_origem)) then
    raise exception 'bloqueado';
  end if;
  if length(v_apelido) not between 2 and 20 or v_apelido !~ '^[[:alnum:] _.-]+$'
    or apuracao_chat_normalizar(v_apelido) ~ '(admin|moderad|suporte|oficial|\mtse\M|fukuda|sistema)'
    or apuracao_chat_proibido(v_apelido) is not null then
    raise exception 'apelido';
  end if;
  if length(v_texto) not between 1 and 280 then
    raise exception 'texto';
  end if;
  v_motivo := apuracao_chat_proibido(v_texto);
  if v_motivo is not null then
    raise exception '%', v_motivo;
  end if;

  -- ritmo: 1 mensagem a cada 5s e no máximo 20 a cada 10 min, por navegador e por origem
  if exists (
    select 1 from apuracao_chat_autoria a
    where (a.autor = p_autor or a.origem = v_origem) and a.criado_em > now() - interval '5 seconds'
  ) or (
    select count(*) from apuracao_chat_autoria a
    where (a.autor = p_autor or a.origem = v_origem) and a.criado_em > now() - interval '10 minutes'
  ) >= 20 then
    raise exception 'rapido';
  end if;
  if exists (
    select 1 from apuracao_chat_autoria a
    where a.autor = p_autor and a.texto = v_texto and a.criado_em > now() - interval '2 minutes'
  ) then
    raise exception 'repetida';
  end if;

  insert into apuracao_chat (apelido, texto) values (v_apelido, v_texto) returning * into v_nova;
  insert into apuracao_chat_autoria (msg_id, autor, origem, texto) values (v_nova.id, p_autor, v_origem, v_texto);
  return json_build_object('id', v_nova.id, 'apelido', v_nova.apelido, 'texto', v_nova.texto, 'criado_em', v_nova.criado_em);
end;
$$;

-- 3 denúncias de pessoas diferentes tiram a mensagem do ar
create or replace function public.apuracao_chat_denunciar(p_autor text, p_msg bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem text := coalesce(apuracao_chat_origem(), 'a:' || p_autor);
begin
  if p_autor is null or p_autor !~ '^[0-9a-f-]{36}$' then
    raise exception 'autor';
  end if;
  insert into apuracao_chat_denuncia (msg_id, quem)
  select p_msg, v_quem where exists (select 1 from apuracao_chat c where c.id = p_msg)
  on conflict do nothing;
  if (select count(*) from apuracao_chat_denuncia d where d.msg_id = p_msg) >= 3 then
    delete from apuracao_chat c where c.id = p_msg;
  end if;
end;
$$;

-- o Supabase dá acesso ao anon em tudo que é criado no schema public: aqui fica só o necessário
revoke all on public.apuracao_chat_autoria, public.apuracao_chat_denuncia, public.apuracao_chat_bloqueio,
  public.apuracao_chat_sal from anon, authenticated;
revoke all on public.apuracao_chat from anon, authenticated;
grant select on public.apuracao_chat to anon, authenticated;
revoke all on function public.apuracao_chat_origem() from public, anon, authenticated;
revoke all on function public.apuracao_chat_normalizar(text) from public, anon, authenticated;
revoke all on function public.apuracao_chat_proibido(text) from public, anon, authenticated;
revoke all on function public.apuracao_chat_enviar(text, text, text) from public, anon, authenticated;
revoke all on function public.apuracao_chat_denunciar(text, bigint) from public, anon, authenticated;
grant execute on function public.apuracao_chat_enviar(text, text, text) to anon, authenticated;
grant execute on function public.apuracao_chat_denunciar(text, bigint) to anon, authenticated;

-- mensagem nova e mensagem apagada chegam na hora pra quem está com o chat aberto
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'apuracao_chat'
  ) then
    alter publication supabase_realtime add table public.apuracao_chat;
  end if;
end;
$$;

-- guarda por 7 dias (o nome não começa com "apuracao-" pra não cair no unschedule pós-eleição)
select cron.unschedule('chat-limpeza') where exists (select 1 from cron.job where jobname = 'chat-limpeza');
select cron.schedule('chat-limpeza', '17 * * * *', $$
  delete from public.apuracao_chat where criado_em < now() - interval '7 days';
  delete from public.apuracao_chat_bloqueio where criado_em < now() - interval '7 days';
$$);
