-- =====================================================================
--  Fotografias v2
--  • etiqueta (plantas | peixes | maternidade | outro)
--  • ligação opcional a um evento (TPA, medição, fauna)
--  • miniatura (gerada no cliente) para a galeria gastar menos dados
--  • caminho novo no Storage: {aquario_id}/AAAA/MM/{uuid}.webp
--  • lembrete semanal (domingo) para tirar foto, desligável
-- =====================================================================

alter table public.fotos
  add column etiqueta text not null default 'outro'
    check (etiqueta in ('plantas', 'peixes', 'maternidade', 'outro')),
  add column evento_tipo text check (evento_tipo in ('tpa', 'medicao', 'fauna')),
  add column evento_id uuid,
  add column thumb_path text,
  add constraint fotos_evento_completo check ((evento_tipo is null) = (evento_id is null));

create index fotos_evento_idx on public.fotos (evento_tipo, evento_id) where evento_id is not null;
create index fotos_etiqueta_idx on public.fotos (aquario_id, etiqueta, data desc);

alter table public.definicoes
  add column lembrete_foto_semanal boolean not null default true;

-- ---------------------------------------------------------------------
--  Storage: o 1.º segmento do caminho pode ser
--   • o id de um aquário do utilizador  (novo: {aquario_id}/AAAA/MM/…)
--   • o próprio user_id                  (antigo e lista de desejos)
-- ---------------------------------------------------------------------
create function public.pode_aceder_foto(caminho text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (storage.foldername(caminho))[1] = (select auth.uid())::text
    or exists (
      select 1 from public.aquarios a
      where a.id::text = (storage.foldername(caminho))[1]
        and a.user_id = (select auth.uid())
    );
$$;

drop policy if exists "fotos: ler as minhas" on storage.objects;
drop policy if exists "fotos: enviar para a minha pasta" on storage.objects;
drop policy if exists "fotos: atualizar as minhas" on storage.objects;
drop policy if exists "fotos: apagar as minhas" on storage.objects;

create policy "fotos: ler" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos' and public.pode_aceder_foto(name));

create policy "fotos: enviar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and public.pode_aceder_foto(name));

create policy "fotos: atualizar" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and public.pode_aceder_foto(name));

create policy "fotos: apagar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and public.pode_aceder_foto(name));

update storage.buckets
   set allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'image/heic']
 where id = 'fotos';

-- ---------------------------------------------------------------------
--  Lembrete semanal de foto: aquários sem fotos nos últimos 7 dias,
--  de utilizadores com o lembrete ligado. Só a service_role executa.
-- ---------------------------------------------------------------------
create function public.lembretes_foto_pendentes()
returns table (user_id uuid, email text, aquario_id uuid, aquario_nome text, lembretes_push boolean, lembretes_email boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select a.user_id, u.email::text, a.id, a.nome, d.lembretes_push, d.lembretes_email
  from public.aquarios a
  join public.definicoes d on d.user_id = a.user_id
  join auth.users u on u.id = a.user_id
  where d.lembrete_foto_semanal
    and (d.lembretes_push or d.lembretes_email)
    and not exists (
      select 1 from public.fotos f
      where f.aquario_id = a.id and f.data > now() - interval '7 days'
    )
  order by a.user_id, a.criado_em;
$$;

revoke execute on function public.lembretes_foto_pendentes() from public, anon, authenticated;
grant execute on function public.lembretes_foto_pendentes() to service_role;
