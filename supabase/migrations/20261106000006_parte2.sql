-- =====================================================================
--  Parte 2 — produtos, ninhadas, férias, lista de desejos, alertas
-- =====================================================================

-- ---------------------------------------------------------------------
--  Produtos (substitui "condicionadores")
--  O stock não é guardado: é volume_inicial − soma das doses das TPAs
--  feitas desde a abertura. Assim cada TPA "desconta" automaticamente e
--  editar/apagar uma TPA corrige o stock sem estados inconsistentes.
-- ---------------------------------------------------------------------
alter table public.condicionadores rename to produtos;
alter table public.produtos rename column dose_ml_por_litro to dose_por_litro;
alter table public.produtos alter column dose_por_litro drop not null;
alter table public.produtos
  add column tipo text not null default 'condicionador'
    check (tipo in ('condicionador', 'comida', 'bacterias', 'outro')),
  add column volume_inicial numeric(10, 2) check (volume_inicial > 0),
  add column unidade text not null default 'ml' check (unidade in ('ml', 'g', 'unid')),
  add column data_abertura date,
  add column duracao_dias integer check (duracao_dias > 0),
  add column ativo boolean not null default true;
alter index public.condicionadores_user_idx rename to produtos_user_idx;
alter policy "condicionadores: dono" on public.produtos rename to "produtos: dono";

-- Compatibilidade com versões antigas da app que ainda leem "condicionadores"
create view public.condicionadores with (security_invoker = true) as
  select id, user_id, nome, dose_por_litro as dose_ml_por_litro, criado_em
  from public.produtos
  where tipo = 'condicionador';
grant select, insert, update, delete on public.condicionadores to authenticated;

create or replace function public.calcular_dose_tpa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.condicionador_id is null then
    new.dose_ml := null;
  else
    select round(new.litros * p.dose_por_litro, 2)
      into new.dose_ml
      from public.produtos p
     where p.id = new.condicionador_id;
  end if;
  return new;
end;
$$;

create or replace function public.ao_criar_utilizador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.definicoes (user_id) values (new.id)
  on conflict (user_id) do nothing;
  insert into public.produtos (user_id, nome, tipo, dose_por_litro, unidade)
  values (new.id, 'AMTRA Care', 'condicionador', 0.25, 'ml');
  return new;
end;
$$;

-- ---------------------------------------------------------------------
--  Ninhadas (sem contar alevins individualmente)
-- ---------------------------------------------------------------------
create table public.ninhadas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  aquario_id uuid not null,
  mae text not null check (char_length(mae) between 1 and 120),
  data_parto date not null,
  notas text,
  estado text not null default 'ativa' check (estado in ('ativa', 'separada', 'encerrada')),
  criado_em timestamptz not null default now(),
  foreign key (aquario_id, user_id) references public.aquarios (id, user_id) on delete cascade
);
create index ninhadas_user_idx on public.ninhadas (user_id, data_parto desc);

-- ---------------------------------------------------------------------
--  Modo férias
--  checklist: [{ "texto": "TPA feita", "feito": false }, …]
-- ---------------------------------------------------------------------
create table public.ferias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ida date not null,
  regresso date not null,
  quem_alimenta text,
  notas text,
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  criado_em timestamptz not null default now(),
  check (regresso >= ida)
);
create index ferias_user_idx on public.ferias (user_id, ida desc);

-- ---------------------------------------------------------------------
--  Lista de desejos (print no bucket "fotos": {user_id}/desejos/…)
-- ---------------------------------------------------------------------
create table public.desejos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item text not null check (char_length(item) between 1 and 160),
  foto_path text,
  thumb_path text,
  link text check (link is null or link ~* '^https?://'),
  loja text,
  preco numeric(10, 2) check (preco >= 0),
  notas text,
  estado text not null default 'quero' check (estado in ('quero', 'comprado')),
  criado_em timestamptz not null default now()
);
create index desejos_user_idx on public.desejos (user_id, criado_em desc);

-- ---------------------------------------------------------------------
--  Alertas: histórico de tudo o que foi notificado.
--  "chave" torna cada alerta idempotente (o cron pode correr várias vezes).
--  Só o servidor (service_role) cria alertas; o utilizador lê/marca/apaga.
-- ---------------------------------------------------------------------
create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensagem text not null,
  url text,
  chave text not null,
  lido boolean not null default false,
  criado_em timestamptz not null default now(),
  notificado_em timestamptz,
  canal text check (canal in ('push', 'email', 'app')),
  unique (user_id, chave)
);
create index alertas_user_idx on public.alertas (user_id, criado_em desc);
create index alertas_por_notificar_idx on public.alertas (criado_em) where notificado_em is null;

-- ---------------------------------------------------------------------
--  Definições novas
-- ---------------------------------------------------------------------
alter table public.definicoes
  add column aviso_tpa_urgente_dias integer not null default 10 check (aviso_tpa_urgente_dias between 1 and 90),
  add column lembrete_esponja boolean not null default true;

-- ---------------------------------------------------------------------
--  RLS
-- ---------------------------------------------------------------------
alter table public.ninhadas enable row level security;
alter table public.ferias enable row level security;
alter table public.desejos enable row level security;
alter table public.alertas enable row level security;

create policy "ninhadas: dono" on public.ninhadas for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "ferias: dono" on public.ferias for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "desejos: dono" on public.desejos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "alertas: ler" on public.alertas for select to authenticated
  using (user_id = (select auth.uid()));
create policy "alertas: marcar" on public.alertas for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "alertas: apagar" on public.alertas for delete to authenticated
  using (user_id = (select auth.uid()));

-- =====================================================================
--  Regras de alerta (sem IA). Corre diariamente via Edge Function.
--  Cada regra insere com uma chave única → nunca repete o mesmo alerta.
--  Se está tudo bem, não insere nada.
-- =====================================================================
create function public.gerar_alertas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  c integer;
begin
  -- Contexto por utilizador: "hoje" no fuso dele e se está de férias
  create temporary table if not exists _ctx on commit drop as
    select d.*, (now() at time zone d.fuso_horario)::date as hoje,
      exists (
        select 1 from public.ferias f
        where f.user_id = d.user_id
          and (now() at time zone d.fuso_horario)::date between f.ida and f.regresso
      ) as de_ferias
    from public.definicoes d;

  -- 1) TPA: aviso ao fim de "intervalo" dias e de novo (urgente) ao fim de
  --    "aviso_tpa_urgente_dias". Suspenso durante as férias.
  insert into public.alertas (user_id, tipo, titulo, mensagem, url, chave)
  select x.user_id, 'tpa',
    case when x.dias >= x.aviso_tpa_urgente_dias then 'TPA urgente · ' else 'TPA · ' end || x.nome,
    'Já passaram ' || x.dias || ' dias desde a última troca de água.',
    '/aquario?id=' || x.aquario_id,
    'tpa:' || x.aquario_id || ':' || coalesce(x.tpa_id::text, 'inicio') || ':' ||
      case when x.dias >= x.aviso_tpa_urgente_dias then 'urgente' else 'aviso' end
  from (
    select a.id as aquario_id, a.user_id, a.nome, t.id as tpa_id, c.intervalo_tpa_dias, c.aviso_tpa_urgente_dias,
      c.hoje - (coalesce(t.data, a.criado_em) at time zone c.fuso_horario)::date as dias
    from public.aquarios a
    join _ctx c on c.user_id = a.user_id and not c.de_ferias
    left join lateral (
      select id, data from public.tpas where aquario_id = a.id order by data desc limit 1
    ) t on true
  ) x
  where x.dias >= least(x.intervalo_tpa_dias, x.aviso_tpa_urgente_dias)
  on conflict (user_id, chave) do nothing;
  get diagnostics c = row_count; n := n + c;

  -- 2) Esponja do filtro: uma vez por mês
  insert into public.alertas (user_id, tipo, titulo, mensagem, url, chave)
  select c.user_id, 'manutencao', 'Lavar a esponja do filtro',
    'Este mês, na próxima TPA, lava a esponja do filtro na água que retiraste do aquário (nunca na torneira).',
    '/', 'esponja:' || to_char(c.hoje, 'YYYY-MM')
  from _ctx c
  where c.lembrete_esponja and not c.de_ferias
    and exists (select 1 from public.aquarios a where a.user_id = c.user_id)
  on conflict (user_id, chave) do nothing;
  get diagnostics c = row_count; n := n + c;

  -- 3) Condicionador a acabar: restam ~3 TPAs (média das últimas 3 doses)
  insert into public.alertas (user_id, tipo, titulo, mensagem, url, chave)
  select s.user_id, 'produto', s.nome || ' quase no fim',
    'Restam cerca de ' || greatest(0, round(s.restante))::text || ' ' || s.unidade ||
      ' (≈ ' || greatest(0, floor(s.restante / s.media))::text ||
      case when floor(s.restante / s.media) = 1 then ' TPA' else ' TPAs' end || '). Compra outra embalagem.',
    '/produtos', 'produto:' || s.id || ':' || coalesce(s.data_abertura::text, '-') || ':baixo'
  from (
    select p.*,
      p.volume_inicial - coalesce((
        select sum(t.dose_ml) from public.tpas t
        where t.condicionador_id = p.id
          and (p.data_abertura is null or t.data >= p.data_abertura)
      ), 0) as restante,
      (select avg(u.dose_ml) from (
        select dose_ml from public.tpas t
        where t.condicionador_id = p.id and t.dose_ml > 0
        order by t.data desc limit 3
      ) u) as media
    from public.produtos p
    where p.tipo = 'condicionador' and p.ativo and p.volume_inicial is not null
  ) s
  where s.media > 0 and s.restante <= 3 * s.media
  on conflict (user_id, chave) do nothing;
  get diagnostics c = row_count; n := n + c;

  -- 4) Comida/bactérias/outros: fim estimado (abertura + duração), 5 dias antes
  insert into public.alertas (user_id, tipo, titulo, mensagem, url, chave)
  select p.user_id, 'produto', p.nome || ' a acabar',
    'Pela data de abertura, deve acabar por volta de ' ||
      to_char(p.data_abertura + p.duracao_dias, 'DD/MM') || '.',
    '/produtos', 'produto:' || p.id || ':' || p.data_abertura || ':fim'
  from public.produtos p
  join _ctx c on c.user_id = p.user_id
  where p.tipo <> 'condicionador' and p.ativo
    and p.data_abertura is not null and p.duracao_dias is not null
    and c.hoje >= p.data_abertura + p.duracao_dias - 5
  on conflict (user_id, chave) do nothing;
  get diagnostics c = row_count; n := n + c;

  -- 5) Ninhadas: novo parto previsto (+25 dias) e separar machos (+4 e +6 semanas)
  insert into public.alertas (user_id, tipo, titulo, mensagem, url, chave)
  select n.user_id, 'ninhada', 'Prepara a maternidade',
    'A ' || n.mae || ' pode voltar a parir nos próximos dias (último parto a ' || to_char(n.data_parto, 'DD/MM') || ').',
    '/aquario?id=' || n.aquario_id, 'ninhada:' || n.id || ':parto'
  from public.ninhadas n
  join _ctx c on c.user_id = n.user_id
  where n.estado <> 'encerrada'
    and c.hoje between n.data_parto + 25 and n.data_parto + 40
    and not exists (
      select 1 from public.ninhadas m
      where m.aquario_id = n.aquario_id and lower(m.mae) = lower(n.mae) and m.data_parto > n.data_parto
    )
  on conflict (user_id, chave) do nothing;
  get diagnostics c = row_count; n := n + c;

  insert into public.alertas (user_id, tipo, titulo, mensagem, url, chave)
  select n.user_id, 'ninhada', 'Separa os machos jovens',
    'A ninhada da ' || n.mae || ' faz ' || s.semanas || ' semanas: separa os machos jovens.',
    '/aquario?id=' || n.aquario_id, 'ninhada:' || n.id || ':' || s.semanas || 'sem'
  from public.ninhadas n
  join _ctx c on c.user_id = n.user_id
  cross join (values (4), (6)) s(semanas)
  where n.estado = 'ativa'
    and c.hoje between n.data_parto + s.semanas * 7 and n.data_parto + s.semanas * 7 + 6
  on conflict (user_id, chave) do nothing;
  get diagnostics c = row_count; n := n + c;

  -- 6) Férias: checklist incompleta 2 dias antes; verificação no regresso
  insert into public.alertas (user_id, tipo, titulo, mensagem, url, chave)
  select f.user_id, 'ferias', 'Férias a ' || to_char(f.ida, 'DD/MM'),
    case when q.falta = 1 then 'Falta 1 item' else 'Faltam ' || q.falta || ' itens' end || ' da checklist antes de ires.',
    '/ferias', 'ferias:' || f.id || ':antes'
  from public.ferias f
  join _ctx c on c.user_id = f.user_id
  cross join lateral (
    select count(*) as falta from jsonb_array_elements(f.checklist) e
    where coalesce((e ->> 'feito')::boolean, false) = false
  ) q
  where c.hoje between f.ida - 2 and f.ida - 1 and q.falta > 0
  on conflict (user_id, chave) do nothing;
  get diagnostics c = row_count; n := n + c;

  insert into public.alertas (user_id, tipo, titulo, mensagem, url, chave)
  select f.user_id, 'ferias', 'Bem-vindo de volta',
    'Verifica a temperatura, o filtro e se há baixas, e faz uma TPA.',
    '/', 'ferias:' || f.id || ':regresso'
  from public.ferias f
  join _ctx c on c.user_id = f.user_id
  where c.hoje between f.regresso and f.regresso + 2
  on conflict (user_id, chave) do nothing;
  get diagnostics c = row_count; n := n + c;

  -- 7) Foto da semana (domingo), só para aquários sem fotos há 7 dias
  insert into public.alertas (user_id, tipo, titulo, mensagem, url, chave)
  select a.user_id, 'foto', 'Foto da semana · ' || a.nome,
    'Ainda não há fotos desta semana.', '/aquario?id=' || a.id,
    'foto:' || a.id || ':' || to_char(c.hoje, 'IYYY-IW')
  from public.aquarios a
  join _ctx c on c.user_id = a.user_id
  where c.lembrete_foto_semanal and not c.de_ferias
    and extract(isodow from c.hoje) = 7
    and not exists (
      select 1 from public.fotos f where f.aquario_id = a.id and f.data > now() - interval '7 days'
    )
  on conflict (user_id, chave) do nothing;
  get diagnostics c = row_count; n := n + c;

  drop table if exists _ctx;
  return n;
end;
$$;

revoke execute on function public.gerar_alertas() from public, anon, authenticated;
grant execute on function public.gerar_alertas() to service_role;
