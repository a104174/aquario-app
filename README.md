# Aquário 🐟

Diário pessoal dos meus aquários, em PWA *mobile-first* pensada para o iPhone. Instalada no ecrã principal, abre em ecrã inteiro, arranca instantaneamente a partir da cache e funciona offline.

- **TPAs**: introduzes os litros e a dose de condicionador aparece logo, assim como a % do volume útil.
- **Medições**: NH₃/NH₄, NO₂, NO₃, pH, GH, KH e temperatura, com teste de gotas ou tira. Todos os parâmetros são opcionais.
- **Fauna**: entradas, nascimentos, mortes, transferências entre aquários e saídas, com a população atual calculada.
- **Fotos**: tiradas com a câmara ou escolhidas da galeria, comprimidas no iPhone e enviadas mesmo se as tirares offline.
- **Histórico e gráficos**: tudo por ordem cronológica, com filtro por aquário e um gráfico por parâmetro.
- **Lembretes de TPA**: Web Push, com email (Resend) como alternativa.

## Stack

| | |
|---|---|
| App | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 |
| Dados | Supabase (Auth com código OTP, Postgres com RLS, Storage) |
| Local-first | TanStack Query persistido em IndexedDB, updates otimistas e mutações offline |
| PWA | Serwist (`@serwist/turbopack`): precache, cache de fotos e Web Push |
| UI nativa | vaul (bottom sheets), View Transitions API, safe areas |
| Lembretes | Supabase Edge Function + pg_cron + Web Push (VAPID) + Resend |
| Deploy | Vercel |

## Estrutura

```
supabase/
  migrations/            esquema + RLS, bucket de fotos, lembretes, pg_cron
  functions/lembrete-tpa Edge Function (Web Push + fallback por email)
  templates/codigo.html  email com o código de 6 dígitos
  config.toml            configuração do CLI (OTP de 6 dígitos, etc.)
  seed.sql
scripts/gerar-assets.mjs ícones + splash screens iOS (pwa-asset-generator)
assets/                  SVG de origem do ícone e da splash
public/icons, public/splash
src/
  app/
    layout.tsx           metadata appleWebApp, viewport-fit=cover, splash screens
    manifest.ts          standalone, portrait, ícones maskable
    sw.ts                service worker (Serwist)
    serwist/[path]/      route handler que gera /serwist/sw.js
    login/               email → código OTP
    (app)/               shell com tab bar: Aquários, /aquario, /historico, /definicoes
  components/
    shell/               AppShell, TabBar, Screen (header + large title), navegação
    ui/                  Sheet (vaul), ActionSheet, Button, Toasts, Skeleton, OTP
    forms/               TPA, medição, fauna, foto e campos estilo iOS
    eventos/             timeline e linhas de evento
    charts/              gráfico SVG por parâmetro
  lib/
    query/               QueryClient, persistência IndexedDB, mutações otimistas
    supabase/, auth/     cliente e sessão
    derivados.ts         última TPA, população, séries, timeline
    formato.ts           datas e números em pt-PT
```

---

## 1. Supabase

### 1.1 Criar o projeto

1. Cria um projeto em [supabase.com](https://supabase.com) (região Europa, por exemplo `eu-west-3`, Paris).
2. Em **Project Settings → API**, copia o **Project URL** e a **anon public key**.

### 1.2 Aplicar as migrations

Com o [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <o-teu-project-ref>
```

```bash
npx supabase db push
```

Sem o CLI, também podes colar os ficheiros de `supabase/migrations/` por ordem no **SQL Editor**. A migration `…000004_cron_lembretes.sql` pode ficar para o fim (ver secção 4).

As migrations criam:

- as tabelas `aquarios`, `condicionadores`, `tpas`, `medicoes`, `fauna_eventos`, `fotos`, `definicoes` e `push_subscricoes`, todas com **RLS por `user_id`**;
- um trigger que, quando crias a conta, cria as definições por defeito e o condicionador **AMTRA Care (0,25 ml/L)**;
- um trigger que calcula `tpas.dose_ml` (litros × dose/L) e a guarda como fotografia do momento;
- a função `criar_aquarios_iniciais()`, que cria os três aquários (Principal (Aquatlantis Vienna) 42/30 L, AQUARIUS 20 L 20/17 L, Betta 5/5 L). A app mostra-a como botão quando ainda não há aquários;
- o bucket privado **`fotos`**, em que cada utilizador só acede à sua pasta `{user_id}/…`.

### 1.3 Autenticação por código (OTP de 6 dígitos)

A app usa **email + código de 6 dígitos**, e **não** magic link: no iOS o link abriria no Safari e não na app instalada.

Em **Authentication**:

1. **Sign In / Providers → Email**: ativo, com *Confirm email* desligado.
2. **Email OTP Length**: `6`. Expiração recomendada: 900 s.
3. **Emails → Templates → Magic Link**: troca o corpo pelo conteúdo de `supabase/templates/codigo.html`, que mostra `{{ .Token }}` em vez do link. Faz o mesmo no template **Confirm signup**.
   - Assunto sugerido: `O teu código do Aquário`.
4. **URL Configuration → Site URL**: o URL da Vercel (por exemplo `https://aquario.vercel.app`).
5. Depois de entrares pela primeira vez, desliga **Allow new users to sign up**. A app é só tua.

> O email por defeito do Supabase tem limites baixos. Para uso diário, configura SMTP próprio em **Authentication → Emails → SMTP Settings** (o da Resend serve).

A sessão é persistente: o refresh token fica no `localStorage` da app instalada, que no iOS está separado do Safari e não é apagado ao fim de 7 dias.

---

## 2. Variáveis de ambiente

Copia `.env.example` para `.env.local`:

| Variável | Onde obter |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` (ver secção 4) |

Na Vercel, define as mesmas três em **Settings → Environment Variables**.

## 3. Desenvolvimento e deploy

```bash
npm install
```

```bash
npm run dev
```

Em `dev` o service worker está desativado. Para testar a PWA (precache, offline, push), usa um build de produção:

```bash
npm run build && npm start
```

Outros scripts:

- `npm run lint`
- `npm run typecheck`
- `npm run assets`: regenera os ícones e as splash screens iOS (claras e escuras) a partir de `assets/*.svg` com o **pwa-asset-generator**, e reescreve `src/app/splash-screens.ts`.

**Deploy:** importa o repositório na Vercel (preset Next.js), define as variáveis de ambiente e faz deploy. O service worker é servido em `/serwist/sw.js`, com scope `/`.

---

## 4. Lembretes de TPA (Web Push + email)

Todos os dias às 18:00 UTC, o pg_cron chama a Edge Function `lembrete-tpa`. Esta procura aquários cuja última TPA (ou, se nunca houve nenhuma, a data de criação) passou o intervalo definido (7 dias por defeito) e que ainda não foram lembrados nas últimas 20 h. Depois:

1. envia **Web Push** para todos os dispositivos subscritos e remove subscrições expiradas (404/410);
2. se nenhum push chegou e os lembretes por email estão ativos, envia **email pela Resend**;
3. marca `aquarios.ultimo_lembrete_em`.

### 4.1 Chaves VAPID

```bash
npx web-push generate-vapid-keys
```

A **public key** vai para `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Vercel e `.env.local`) e para o segredo `VAPID_PUBLIC_KEY`. A **private key** fica **só** no segredo da função.

### 4.2 Segredos e deploy da função

Gera um segredo aleatório para o cron (por exemplo com `openssl rand -hex 32`) e define os segredos da função:

```bash
npx supabase secrets set CRON_SECRET=<segredo> VAPID_PUBLIC_KEY=<pública> VAPID_PRIVATE_KEY=<privada> VAPID_SUBJECT=mailto:<o-teu-email> APP_URL=https://<a-tua-app>.vercel.app
```

```bash
npx supabase secrets set RESEND_API_KEY=<chave-resend> "RESEND_FROM=Aquário <lembretes@o-teu-dominio.pt>"
```

```bash
npx supabase functions deploy lembrete-tpa --no-verify-jwt
```

A função valida ela própria quem a chama: o cron usa o header `x-cron-secret`; a app, o JWT do utilizador para enviar a notificação de teste.

### 4.3 Agendamento (pg_cron)

1. Em **Database → Extensions**, ativa `pg_cron` e `pg_net`.
2. No **SQL Editor**, guarda no Vault o URL do projeto e o mesmo segredo do cron:

   ```sql
   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
   select vault.create_secret('<segredo>', 'lembrete_cron_secret');
   ```

3. Aplica `supabase/migrations/20261105000004_cron_lembretes.sql`. Se usaste `db push`, já está aplicada.

Para testar já, sem esperar pelas 18h:

```sql
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/lembrete-tpa',
  headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='lembrete_cron_secret')),
  body := '{}'::jsonb
);
```

### 4.4 Ativar no iPhone

Em **Definições → Notificações**, toca em **Ativar**. A permissão tem de ser pedida a partir de um toque, como o iOS exige, e só existe com a app instalada (iOS 16.4+). Depois usa **Enviar notificação de teste** para confirmares que chega.

---

## 5. Instalar no iPhone

1. Abre o URL da app no **Safari**. Tem de ser o Safari, ou outro browser no iOS 16.4+ que tenha a opção.
2. Toca em **Partilhar** (o quadrado com a seta) e depois em **Adicionar ao ecrã principal** → **Adicionar**.
3. Abre a app **pelo ícone**. Passa a correr em ecrã inteiro, com splash screen, e com sessão e dados próprios, separados do Safari.
4. Entra com o teu email e o código de 6 dígitos. No iOS 17+, o teclado sugere o código diretamente a partir do Mail.
5. Em **Definições → Notificações**, ativa os lembretes.

> Se mudares os ícones ou a splash, apaga o ícone do ecrã principal e volta a adicioná-lo: o iOS só os lê na instalação.

---

## Como funciona o "feeling" nativo

- **Ecrã:** `display: standalone`, `viewport-fit=cover`, `statusBarStyle: black-translucent` e safe areas com `env(safe-area-inset-*)`. O header é sempre "oceano" escuro, porque o texto da status bar é branco nos dois modos.
- **Layout:** `body` fixo a `100dvh` com `overscroll-behavior: none`; só o conteúdo de cada ecrã faz scroll. O header e a tab bar ficam fixos, com large title que colapsa no scroll.
- **Interação:** `-webkit-tap-highlight-color: transparent`, `user-select` e `touch-callout` desligados na UI, inputs com ≥ 16 px (o iOS não faz zoom), feedback de toque com `:active { scale(.97) }` e sem estados de hover.
- **Componentes:** formulários em bottom sheets (vaul, com o fundo a escalar como no iOS) e action sheets próprias, nunca `alert`/`confirm`.
- **Arranque e carregamento:** os dados vêm logo da cache em IndexedDB e o HTML de cada ecrã está pré-cacheado. Os skeletons só aparecem se a cache demorar mais de 150 ms.
- **Offline:** as alterações aplicam-se de imediato (otimistas), ficam em fila e são enviadas quando houver rede, mesmo que a app seja fechada entretanto. As fotos pendentes ficam como Blob no IndexedDB.

### Motion (skill `motion-design`)

Arquétipo **Corporate/iOS**, aplicado em todo o lado:

| | |
|---|---|
| Curva de assinatura | `cubic-bezier(0.2, 0, 0, 1)`: entradas desaceleram |
| Saídas | `cubic-bezier(0.3, 0, 1, 1)`, a ~70% da duração da entrada |
| Durações (mobile 0,8×) | 120 ms (toque) · 280 ms (cartões, controlos) · 420 ms (ecrãs) |
| Navegação | View Transitions: para a frente entra da direita (com parallax de 25% no ecrã que sai), para trás o inverso, e crossfade entre tabs. O header faz crossfade e a tab bar fica ancorada. Sem suporte, o fallback é a mesma animação em CSS. |
| Sheets | curva iOS do vaul (500 ms, `cubic-bezier(.32,.72,0,1)`) |
| Micro-interações | polegar do controlo segmentado e do interruptor desliza, dose da TPA faz *pop* a cada mudança, linhas apagadas desvanecem e colapsam, erros abanam (360 ms, sem overshoot), stagger de 30 ms (< 200 ms no total) |
| Ambient | luz da água a derivar devagar no header (14 s) |
| `prefers-reduced-motion` | sem movimento espacial: só fades e durações reduzidas a metade |
