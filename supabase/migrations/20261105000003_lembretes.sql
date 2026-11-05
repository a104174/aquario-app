-- =====================================================================
--  Lembretes de TPA: subscrições Web Push + função usada pela Edge
--  Function "lembrete-tpa" (chamada diariamente pelo pg_cron).
-- =====================================================================

alter table public.definicoes
  add column fuso_horario text not null default 'Europe/Lisbon';

create table public.push_subscricoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  criado_em timestamptz not null default now()
);
create index push_subscricoes_user_idx on public.push_subscricoes (user_id);

alter table public.push_subscricoes enable row level security;

create policy "push_subscricoes: dono" on public.push_subscricoes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
--  Aquários com TPA em atraso que ainda não foram lembrados hoje.
--  "Dias" contam-se em dias de calendário no fuso do utilizador; um
--  aquário sem TPAs conta desde a sua criação.
--  Só a service_role (Edge Function) pode executar.
-- ---------------------------------------------------------------------
create function public.lembretes_tpa_pendentes()
returns table (
  user_id uuid,
  email text,
  aquario_id uuid,
  aquario_nome text,
  dias integer,
  intervalo integer,
  lembretes_push boolean,
  lembretes_email boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.user_id,
    u.email::text,
    a.id,
    a.nome,
    x.dias,
    d.intervalo_tpa_dias,
    d.lembretes_push,
    d.lembretes_email
  from public.aquarios a
  join public.definicoes d on d.user_id = a.user_id
  join auth.users u on u.id = a.user_id
  left join lateral (
    select max(t.data) as ultima from public.tpas t where t.aquario_id = a.id
  ) t on true
  cross join lateral (
    select (
      (now() at time zone d.fuso_horario)::date
      - (coalesce(t.ultima, a.criado_em) at time zone d.fuso_horario)::date
    )::integer as dias
  ) x
  where (d.lembretes_push or d.lembretes_email)
    and x.dias >= d.intervalo_tpa_dias
    and (a.ultimo_lembrete_em is null or a.ultimo_lembrete_em < now() - interval '20 hours')
  order by a.user_id, x.dias desc;
$$;

revoke execute on function public.lembretes_tpa_pendentes() from public, anon, authenticated;
grant execute on function public.lembretes_tpa_pendentes() to service_role;
