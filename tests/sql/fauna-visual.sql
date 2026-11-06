-- Executar numa base descartável vazia: psql -X -v ON_ERROR_STOP=1 -f tests/sql/fauna-visual.sql
create role anon;
create role authenticated;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
\ir ../../supabase/migrations/20261105000001_schema.sql

insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
insert into public.aquarios (id, user_id, nome) values
 ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Principal'),
 ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Segundo'),
 ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'Privado');
insert into public.fauna_eventos (user_id, aquario_id, tipo, especie, quantidade) values
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'entrada', 'Guppy', 9);
insert into public.fotos (id, user_id, aquario_id, storage_path) values
 ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'foto-existente'),
 ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'outro-aquario'),
 ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000021', 'foto-privada');

\ir ../../supabase/migrations/20261106000011_fauna_visual.sql
grant select, insert, update, delete on public.aquarios, public.fauna_eventos, public.fotos to authenticated;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-000000000011';
  b constant uuid := '00000000-0000-0000-0000-000000000012';
  g constant uuid := '00000000-0000-0000-0000-000000000102';
  f constant uuid := '00000000-0000-0000-0000-000000000201';
begin
  set constraints all immediate;
  if (select sum(quantidade) from public.fauna_eventos where aquario_id = a and not grupo_proprio) is distinct from 9::bigint then
    raise exception 'Migração alterou o registo legado';
  end if;
  insert into public.fauna_eventos (id, aquario_id, tipo, especie, quantidade, grupo_proprio, variedade, foto_destaque_id)
    values (g, a, 'detalhe', 'guppy', 1, true, 'King Cobra', f);
  update public.aquarios set foto_capa_id = f where id = a;
  if (select count(*) from public.fotos) <> 2 then raise exception 'Foto duplicada ou RLS incorreto'; end if;
  begin
    insert into public.fauna_eventos (aquario_id, tipo, especie, quantidade, grupo_proprio)
      values (a, 'detalhe', 'Guppy', 9, true);
    raise exception 'Aceitou classificar mais de 9';
  exception when check_violation then null;
  end;
  begin
    insert into public.fauna_eventos (aquario_id, tipo, especie, quantidade) values (a, 'saida', 'Guppy', 9);
    raise exception 'Aceitou retirar mais do que os 8 genéricos';
  exception when check_violation then null;
  end;
  begin
    update public.fauna_eventos set foto_destaque_id = '00000000-0000-0000-0000-000000000202' where id = g;
    raise exception 'Aceitou foto de outro aquário';
  exception when foreign_key_violation then null;
  end;
  begin
    update public.aquarios set foto_capa_id = '00000000-0000-0000-0000-000000000203' where id = a;
    raise exception 'Aceitou foto de outro dono';
  exception when foreign_key_violation then null;
  end;
  insert into public.fauna_eventos (aquario_id, aquario_destino_id, tipo, especie, quantidade, grupo_id)
    values (a, b, 'transferencia', 'Guppy', 1, g);
  begin
    insert into public.fauna_eventos (aquario_id, tipo, especie, quantidade, grupo_id) values (a, 'morte', 'Guppy', 1, g);
    raise exception 'Aceitou movimentar o mesmo grupo duas vezes';
  exception when check_violation then null;
  end;
  update public.fauna_eventos set foto_destaque_id = null where id = g;
  if not exists (select 1 from public.fotos where id = f) then raise exception 'Desassociar apagou a foto'; end if;
  update public.fauna_eventos set foto_destaque_id = f where id = g;
  delete from public.fotos where id = f;
  if exists (select 1 from public.fauna_eventos where id = g and foto_destaque_id is not null)
     or exists (select 1 from public.aquarios where id = a and foto_capa_id is not null) then
    raise exception 'Referência ficou pendurada';
  end if;
  delete from public.aquarios where id = a;
  if exists (select 1 from public.fauna_eventos where aquario_id = a) then raise exception 'Cascade do aquário falhou'; end if;
end;
$$;
