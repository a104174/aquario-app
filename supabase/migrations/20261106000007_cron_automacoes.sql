-- =====================================================================
--  Agendamentos (pg_cron + pg_net) → Edge Function "automacoes".
--  Substitui o job antigo "lembrete-tpa-diario".
--  Usa os segredos do Vault "project_url" e "lembrete_cron_secret".
-- =====================================================================
select cron.unschedule(jobname) from cron.job
where jobname in ('lembrete-tpa-diario', 'automacoes-diaria');

-- Função auxiliar: chama a Edge Function com uma tarefa
create or replace function public.chamar_automacoes(tarefa text)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/automacoes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'lembrete_cron_secret')
    ),
    body := jsonb_build_object('tarefa', tarefa),
    timeout_milliseconds := 60000
  );
$$;
revoke execute on function public.chamar_automacoes(text) from public, anon, authenticated;

-- Regras diárias às 18:00 UTC (18h/19h em Lisboa)
select cron.schedule('automacoes-diaria', '0 18 * * *', $$ select public.chamar_automacoes('diaria'); $$);
