-- =====================================================================
--  Agendamento diário (pg_cron + pg_net) da Edge Function lembrete-tpa.
--
--  Antes (ou depois) de aplicar, cria os dois segredos no Vault — ver
--  README, secção "Lembretes":
--    select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--    select vault.create_secret('<um segredo aleatório>', 'lembrete_cron_secret');
--  e o mesmo segredo na Edge Function:
--    supabase secrets set CRON_SECRET=<o mesmo segredo>
--
--  18:00 UTC = 18h (inverno) / 19h (verão) em Lisboa.
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('lembrete-tpa-diario')
where exists (select 1 from cron.job where jobname = 'lembrete-tpa-diario');

select cron.schedule(
  'lembrete-tpa-diario',
  '0 18 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/lembrete-tpa',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'lembrete_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
