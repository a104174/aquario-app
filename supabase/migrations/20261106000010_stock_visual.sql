-- =====================================================================
--  Stock visual
--  Uma correção rápida (cheio/metade/pouco) torna-se o novo ponto de
--  partida. Nas doses de condicionador, as TPAs posteriores continuam a
--  ser descontadas normalmente.
-- =====================================================================

alter table public.produtos
  add column stock_manual_fracao numeric(4, 3)
    check (stock_manual_fracao between 0 and 1),
  add column stock_atualizado_em timestamptz,
  add constraint produtos_stock_manual_completo check (
    (stock_manual_fracao is null) = (stock_atualizado_em is null)
  );

comment on column public.produtos.stock_manual_fracao is
  'Estimativa manual do stock: 1 cheio, 0.5 metade, 0.2 pouco.';
comment on column public.produtos.stock_atualizado_em is
  'Momento da estimativa; TPAs posteriores são descontadas deste ponto.';

create or replace function public.gerar_alertas()
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
    '/produtos', 'produto:' || s.id || ':' || coalesce(s.stock_atualizado_em::text, s.data_abertura::text, '-') || ':baixo'
  from (
    select p.*,
      (p.volume_inicial * coalesce(p.stock_manual_fracao, 1)) - coalesce((
        select sum(t.dose_ml) from public.tpas t
        where t.condicionador_id = p.id
          and t.data >= greatest(
            coalesce(p.data_abertura::timestamptz, '-infinity'::timestamptz),
            coalesce(p.stock_atualizado_em, '-infinity'::timestamptz)
          )
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
    and p.stock_manual_fracao is null
    and p.data_abertura is not null and p.duracao_dias is not null
    and c.hoje >= p.data_abertura + p.duracao_dias - 5
  on conflict (user_id, chave) do nothing;
  get diagnostics c = row_count; n := n + c;

  -- Uma correção visual substitui a estimativa por duração.
  insert into public.alertas (user_id, tipo, titulo, mensagem, url, chave)
  select p.user_id, 'produto', p.nome || ' quase no fim',
    'Marcaste o stock como pouco. Confirma se precisas de comprar outra embalagem.',
    '/produtos',
    'produto:' || p.id || ':' || coalesce(p.stock_atualizado_em::text, '-') || ':manual'
  from public.produtos p
  where p.tipo <> 'condicionador' and p.ativo
    and p.stock_manual_fracao is not null
    and p.stock_manual_fracao <= 0.25
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

