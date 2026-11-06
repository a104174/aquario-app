-- =====================================================================
--  Parte 3 — Integrações externas (sem IA)
--  fontes_externas: o que verificar e como (configuracao), com o último
--  estado (para comparar) e o último resultado (para mostrar na app).
--  novidades_externas: só é criada uma linha quando algo muda (hash único).
-- =====================================================================
create table public.fontes_externas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('meteo', 'eredes', 'agere_avisos', 'agere_qualidade', 'loja')),
  nome text not null check (char_length(nome) between 1 and 80),
  url text,
  configuracao jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  -- geridos pelo servidor (Edge Function)
  ultima_verificacao timestamptz,
  ultimo_erro text,
  estado jsonb,
  resultado jsonb,
  criado_em timestamptz not null default now()
);
create index fontes_externas_user_idx on public.fontes_externas (user_id, criado_em);

create table public.novidades_externas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fonte_id uuid not null references public.fontes_externas (id) on delete cascade,
  titulo text not null,
  url text,
  resumo text,
  dados jsonb,
  hash text not null,
  detectado_em timestamptz not null default now(),
  unique (fonte_id, hash)
);
create index novidades_externas_user_idx on public.novidades_externas (user_id, detectado_em desc);

alter table public.fontes_externas enable row level security;
alter table public.novidades_externas enable row level security;

create policy "fontes: dono" on public.fontes_externas for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "novidades: ler" on public.novidades_externas for select to authenticated
  using (user_id = (select auth.uid()));
create policy "novidades: apagar" on public.novidades_externas for delete to authenticated
  using (user_id = (select auth.uid()));

-- O utilizador só configura; estado/resultado/erros são escritos pelo servidor.
-- (Um REVOKE por coluna não anula o GRANT da tabela: revoga-se o UPDATE da
--  tabela e concede-se só às colunas editáveis.)
revoke update on public.fontes_externas from authenticated, anon;
grant update (tipo, nome, url, configuracao, ativo) on public.fontes_externas to authenticated;

-- ---------------------------------------------------------------------
--  Fontes predefinidas (Braga)
-- ---------------------------------------------------------------------
create function public.criar_fontes_padrao(uid uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.fontes_externas (user_id, tipo, nome, url, configuracao, ativo)
  select uid, f.tipo, f.nome, f.url, f.cfg, f.ativo
  from (values
    ('meteo', 'Meteorologia Braga', 'https://open-meteo.com',
      '{"latitude": 41.5454, "longitude": -8.4265, "max_alerta": 30, "min_alerta": 5, "intervalo_horas": 24}'::jsonb, true),
    ('eredes', 'Cortes de luz (E-REDES)', 'https://www.e-redes.pt/pt-pt/o-que-fazemos/qualidade-de-servico/consulte-interrupcoes-agendadas',
      '{"concelho": "Braga", "codigos_postais": []}'::jsonb, true),
    ('agere_avisos', 'Cortes de água (AGERE)', 'https://www.agere.pt/avisos/',
      '{"termos": []}'::jsonb, true),
    ('agere_qualidade', 'Qualidade da água (AGERE)', 'https://agere.pt/agua-de-consumo/',
      '{"intervalo_horas": 24}'::jsonb, true),
    ('loja', 'Aquaralândia (Braga)', 'https://aquaralandia.pt',
      '{"plataforma": "woocommerce", "palavras": ["guppy", "camarão", "neocaridina", "black rose", "red cherry", "betta"]}'::jsonb, true),
    ('loja', 'ExoticLand (Barcelos)', 'https://www.exoticland.pt',
      '{"plataforma": "nenhuma", "nota": "Sem loja online (só contactos)."}'::jsonb, false)
  ) as f(tipo, nome, url, cfg, ativo)
  where not exists (select 1 from public.fontes_externas e where e.user_id = uid);
$$;
revoke execute on function public.criar_fontes_padrao(uuid) from public, anon, authenticated;

select public.criar_fontes_padrao(id) from auth.users;

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
  perform public.criar_fontes_padrao(new.id);
  return new;
end;
$$;

-- ---------------------------------------------------------------------
--  Agendamento: de 3 em 3 horas a Edge Function vê que fontes estão
--  "vencidas" (intervalo_horas, 6 h por defeito; meteo 24 h).
-- ---------------------------------------------------------------------
select cron.unschedule(jobname) from cron.job where jobname = 'automacoes-fontes';
select cron.schedule('automacoes-fontes', '15 */3 * * *', $$ select public.chamar_automacoes('fontes'); $$);
