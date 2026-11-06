-- =====================================================================
--  Alertas interativos
--  Permite resolver, ignorar ou adiar um alerta sem criar notificações
--  repetidas. As tentativas de envio ficam visíveis para diagnóstico.
-- =====================================================================

alter table public.alertas
  add column estado text not null default 'pendente'
    check (estado in ('pendente', 'adiado', 'resolvido', 'ignorado')),
  add column adiado_ate timestamptz,
  add column resolvido_em timestamptz,
  add column tentativas_envio integer not null default 0
    check (tentativas_envio >= 0),
  add column ultimo_erro text;

alter table public.alertas
  add constraint alertas_adiamento_valido check (
    (estado = 'adiado' and adiado_ate is not null)
    or (estado <> 'adiado' and adiado_ate is null)
  );

create index alertas_ativos_user_idx
  on public.alertas (user_id, criado_em desc)
  where estado in ('pendente', 'adiado');

create index alertas_para_relembrar_idx
  on public.alertas (adiado_ate)
  where estado = 'adiado' and notificado_em is null;

comment on column public.alertas.estado is
  'Ciclo de vida na app: pendente, adiado, resolvido ou ignorado.';
comment on column public.alertas.adiado_ate is
  'Data a partir da qual um alerta adiado pode voltar a ser enviado.';
comment on column public.alertas.tentativas_envio is
  'Número de execuções em que push/email estavam ativos mas falharam.';
