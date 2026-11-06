-- Seed para desenvolvimento local (supabase db reset).
--
-- Os dados pertencem a um utilizador, por isso só fazem sentido depois do
-- primeiro login. Na app, o ecrã "Aquários" vazio tem um botão que chama
-- public.criar_aquarios_iniciais(). Em alternativa, depois de fazeres login
-- pela primeira vez, corre isto no SQL Editor (substitui o email):
--
--   do $$
--   declare uid uuid := (select id from auth.users where email = 'eu@exemplo.pt');
--   begin
--     insert into public.aquarios (user_id, nome, volume_bruto_l, volume_util_l) values
--       (uid, 'Principal (Aquatlantis Vienna)', 42, 30),
--       (uid, 'AQUARIUS 20 L', 20, 17),
--       (uid, 'Betta', 5, 5);
--   end $$;
--
-- O condicionador "AMTRA Care" (0,25 ml/L) e as definições por defeito são
-- criados automaticamente pelo trigger public.ao_criar_utilizador().

-- Garante o condicionador e as definições para utilizadores que já existiam
-- antes das migrations.
insert into public.definicoes (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.condicionadores (user_id, nome, dose_ml_por_litro)
select u.id, 'AMTRA Care', 0.25
from auth.users u
where not exists (select 1 from public.condicionadores c where c.user_id = u.id);
