-- =====================================================================
--  Aquário — esquema base
--  Todas as tabelas têm user_id (default auth.uid()) e RLS por user_id.
--  As tabelas de eventos referenciam (aquario_id, user_id) em conjunto,
--  o que garante que um evento nunca aponta para um aquário de outro
--  utilizador.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Definições do utilizador
-- ---------------------------------------------------------------------
create table public.definicoes (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  intervalo_tpa_dias integer not null default 7 check (intervalo_tpa_dias between 1 and 60),
  lembretes_push boolean not null default false,
  lembretes_email boolean not null default false,
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  Aquários
-- ---------------------------------------------------------------------
create table public.aquarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  volume_bruto_l numeric(7, 1) check (volume_bruto_l > 0),
  volume_util_l numeric(7, 1) check (volume_util_l > 0),
  notas text,
  criado_em timestamptz not null default now(),
  -- usado pela Edge Function de lembretes para não repetir no mesmo dia
  ultimo_lembrete_em timestamptz,
  unique (id, user_id)
);
create index aquarios_user_idx on public.aquarios (user_id, criado_em);

-- ---------------------------------------------------------------------
--  Condicionadores de água
-- ---------------------------------------------------------------------
create table public.condicionadores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  dose_ml_por_litro numeric(10, 4) not null check (dose_ml_por_litro >= 0),
  criado_em timestamptz not null default now()
);
create index condicionadores_user_idx on public.condicionadores (user_id);

-- ---------------------------------------------------------------------
--  TPAs (trocas parciais de água)
-- ---------------------------------------------------------------------
create table public.tpas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  aquario_id uuid not null,
  data timestamptz not null default now(),
  litros numeric(7, 2) not null check (litros > 0),
  condicionador_id uuid references public.condicionadores (id) on delete set null,
  dose_ml numeric(10, 2),
  notas text,
  foreign key (aquario_id, user_id) references public.aquarios (id, user_id) on delete cascade
);
create index tpas_aquario_data_idx on public.tpas (aquario_id, data desc);
create index tpas_user_data_idx on public.tpas (user_id, data desc);

-- A dose é calculada (litros × dose/L do condicionador) e guardada como
-- fotografia do momento: se a dose do condicionador mudar mais tarde,
-- o histórico não muda.
create function public.calcular_dose_tpa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.condicionador_id is null then
    new.dose_ml := null;
  else
    select round(new.litros * c.dose_ml_por_litro, 2)
      into new.dose_ml
      from public.condicionadores c
     where c.id = new.condicionador_id;
  end if;
  return new;
end;
$$;

create trigger tpas_calcular_dose
before insert or update of litros, condicionador_id on public.tpas
for each row execute function public.calcular_dose_tpa();

-- ---------------------------------------------------------------------
--  Medições (todos os parâmetros são opcionais)
-- ---------------------------------------------------------------------
create table public.medicoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  aquario_id uuid not null,
  data timestamptz not null default now(),
  nh3_nh4 numeric(6, 2) check (nh3_nh4 >= 0),
  no2 numeric(6, 2) check (no2 >= 0),
  no3 numeric(6, 1) check (no3 >= 0),
  ph numeric(4, 2) check (ph between 0 and 14),
  gh numeric(5, 1) check (gh >= 0),
  kh numeric(5, 1) check (kh >= 0),
  temperatura_c numeric(4, 1) check (temperatura_c between -5 and 50),
  metodo text check (metodo in ('gotas', 'tira')),
  notas text,
  foreign key (aquario_id, user_id) references public.aquarios (id, user_id) on delete cascade
);
create index medicoes_aquario_data_idx on public.medicoes (aquario_id, data desc);
create index medicoes_user_data_idx on public.medicoes (user_id, data desc);

-- ---------------------------------------------------------------------
--  Eventos de fauna
--  'transferencia' sai deste aquário; se aquario_destino_id estiver
--  preenchido, conta como entrada no aquário de destino.
-- ---------------------------------------------------------------------
create table public.fauna_eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  aquario_id uuid not null,
  data timestamptz not null default now(),
  tipo text not null check (tipo in ('entrada', 'nascimento', 'morte', 'transferencia', 'saida')),
  especie text not null check (char_length(especie) between 1 and 120),
  quantidade integer not null default 1 check (quantidade > 0),
  aquario_destino_id uuid references public.aquarios (id) on delete set null,
  notas text,
  foreign key (aquario_id, user_id) references public.aquarios (id, user_id) on delete cascade,
  check (aquario_destino_id is null or tipo = 'transferencia'),
  check (aquario_destino_id is null or aquario_destino_id <> aquario_id)
);
create index fauna_aquario_data_idx on public.fauna_eventos (aquario_id, data desc);
create index fauna_user_data_idx on public.fauna_eventos (user_id, data desc);

-- ---------------------------------------------------------------------
--  Fotos (ficheiro no bucket "fotos": {user_id}/{aquario_id}/{id}.jpg)
-- ---------------------------------------------------------------------
create table public.fotos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  aquario_id uuid not null,
  data timestamptz not null default now(),
  storage_path text not null unique,
  legenda text,
  foreign key (aquario_id, user_id) references public.aquarios (id, user_id) on delete cascade
);
create index fotos_aquario_data_idx on public.fotos (aquario_id, data desc);
create index fotos_user_data_idx on public.fotos (user_id, data desc);

-- =====================================================================
--  RLS
-- =====================================================================
alter table public.definicoes enable row level security;
alter table public.aquarios enable row level security;
alter table public.condicionadores enable row level security;
alter table public.tpas enable row level security;
alter table public.medicoes enable row level security;
alter table public.fauna_eventos enable row level security;
alter table public.fotos enable row level security;

create policy "definicoes: dono" on public.definicoes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "aquarios: dono" on public.aquarios
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "condicionadores: dono" on public.condicionadores
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "tpas: dono" on public.tpas
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      condicionador_id is null
      or exists (
        select 1 from public.condicionadores c
         where c.id = condicionador_id and c.user_id = (select auth.uid())
      )
    )
  );

create policy "medicoes: dono" on public.medicoes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "fauna_eventos: dono" on public.fauna_eventos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      aquario_destino_id is null
      or exists (
        select 1 from public.aquarios a
         where a.id = aquario_destino_id and a.user_id = (select auth.uid())
      )
    )
  );

create policy "fotos: dono" on public.fotos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- =====================================================================
--  Novo utilizador: definições por defeito + condicionador AMTRA Care
-- =====================================================================
create function public.ao_criar_utilizador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.definicoes (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.condicionadores (user_id, nome, dose_ml_por_litro)
  values (new.id, 'AMTRA Care', 0.25);

  return new;
end;
$$;

create trigger ao_criar_utilizador
after insert on auth.users
for each row execute function public.ao_criar_utilizador();

-- =====================================================================
--  Seed opcional dos meus aquários (chamado a partir da app, via RPC,
--  quando ainda não há nenhum aquário).
-- =====================================================================
create function public.criar_aquarios_iniciais()
returns setof public.aquarios
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (select 1 from public.aquarios where user_id = (select auth.uid())) then
    return query select * from public.aquarios where user_id = (select auth.uid()) order by criado_em;
    return;
  end if;

  return query
  insert into public.aquarios (nome, volume_bruto_l, volume_util_l, criado_em)
  values
    ('Principal (Aquatlantis Vienna)', 42, 30, now()),
    ('AQUARIUS 20 L', 20, 17, now() + interval '1 millisecond'),
    ('Betta', 5, 5, now() + interval '2 millisecond')
  returning *;
end;
$$;

revoke execute on function public.criar_aquarios_iniciais() from anon, public;
grant execute on function public.criar_aquarios_iniciais() to authenticated;
