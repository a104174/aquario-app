-- As fotos continuam privadas. Remover uma referência nunca apaga a foto.
alter table public.fotos add constraint fotos_id_aquario_dono unique (id, aquario_id, user_id);
alter table public.aquarios
  add column foto_capa_id uuid,
  add constraint aquarios_foto_capa_fk foreign key (foto_capa_id, id, user_id)
    references public.fotos (id, aquario_id, user_id) on delete set null (foto_capa_id);

alter table public.fauna_eventos
  add column variedade text check (char_length(variedade) between 1 and 120),
  add column nome_personalizado text check (char_length(nome_personalizado) between 1 and 120),
  add column foto_destaque_id uuid,
  add column grupo_proprio boolean not null default false,
  add column grupo_id uuid,
  add constraint fauna_id_dono unique (id, user_id),
  add constraint fauna_foto_destaque_fk foreign key (foto_destaque_id, aquario_id, user_id)
    references public.fotos (id, aquario_id, user_id) on delete set null (foto_destaque_id),
  add constraint fauna_grupo_fk foreign key (grupo_id, user_id)
    references public.fauna_eventos (id, user_id) on delete set null (grupo_id),
  add constraint fauna_grupo_origem_check check (
    (not grupo_proprio or (grupo_id is null and tipo in ('entrada', 'nascimento', 'detalhe')))
    and (tipo <> 'detalhe' or grupo_proprio)
    and (grupo_proprio or (variedade is null and nome_personalizado is null and foto_destaque_id is null))
    and (nome_personalizado is null or quantidade = 1)
    and (grupo_id is null or (grupo_id <> id and tipo in ('morte', 'transferencia', 'saida')))
  );

alter table public.fauna_eventos drop constraint fauna_eventos_tipo_check;
alter table public.fauna_eventos add constraint fauna_eventos_tipo_check
  check (tipo in ('entrada', 'nascimento', 'morte', 'transferencia', 'saida', 'detalhe'));

create index fauna_grupo_idx on public.fauna_eventos (grupo_id) where grupo_id is not null;
create index fauna_foto_destaque_idx on public.fauna_eventos (foto_destaque_id) where foto_destaque_id is not null;
create index aquarios_foto_capa_idx on public.aquarios (foto_capa_id) where foto_capa_id is not null;

-- Serializa as escritas de fauna do mesmo dono, incluindo escritas de
-- clientes antigos. A validação adiada vê o saldo final da transação.
create function public.bloquear_saldo_fauna() returns trigger
language plpgsql set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('fauna:' || coalesce(new.user_id, old.user_id)::text, 0));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create function public.validar_saldo_fauna() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  dono uuid := coalesce(new.user_id, old.user_id);
begin
  if exists (
    select 1 from public.fauna_eventos e
    join public.fauna_eventos g on g.id = e.grupo_id and g.user_id = e.user_id
    where e.user_id = dono and
      (not g.grupo_proprio or lower(btrim(g.especie)) <> lower(btrim(e.especie)))
  ) then
    raise exception using errcode = '23514', message = 'O grupo tem de pertencer à mesma espécie.';
  end if;

  if exists (
    with movimentos as (
      select e.aquario_id aq, lower(btrim(e.especie)) especie,
        case when e.grupo_proprio then e.id else e.grupo_id end grupo,
        case when e.tipo in ('entrada', 'nascimento', 'detalhe') then e.quantidade else -e.quantidade end delta,
        case when e.tipo = 'detalhe' then 0 when e.tipo in ('entrada', 'nascimento') then e.quantidade else -e.quantidade end total
      from public.fauna_eventos e where e.user_id = dono
      union all
      select e.aquario_destino_id, lower(btrim(e.especie)), e.grupo_id, e.quantidade, e.quantidade
      from public.fauna_eventos e
      where e.user_id = dono and e.tipo = 'transferencia' and e.aquario_destino_id is not null
    ), saldos as (
      select aq, especie, grupo, sum(delta) saldo, sum(total) total
      from movimentos group by aq, especie, grupo
    )
    select 1 from saldos
    group by aq, especie
    having coalesce(bool_or(saldo < 0) filter (where grupo is not null), false)
      or coalesce(sum(saldo) filter (where grupo is not null), 0) > greatest(sum(total), 0)
  ) then
    raise exception using errcode = '23514', message = 'A quantidade excede os animais disponíveis neste grupo ou aquário.';
  end if;
  return null;
end;
$$;

revoke all on function public.bloquear_saldo_fauna() from public, anon, authenticated;
revoke all on function public.validar_saldo_fauna() from public, anon, authenticated;
create trigger fauna_bloquear_saldo before insert or update or delete on public.fauna_eventos
  for each row execute function public.bloquear_saldo_fauna();
create constraint trigger fauna_validar_saldo after insert or update or delete on public.fauna_eventos
  deferrable initially deferred for each row execute function public.validar_saldo_fauna();
