# Aquário 🐟

Diário pessoal dos meus aquários, em PWA *mobile-first* pensada para o iPhone. Instalada no ecrã principal, abre em ecrã inteiro, arranca instantaneamente a partir da cache e funciona offline. Tudo corre nos planos gratuitos da **Vercel (Hobby)** e da **Supabase (Free)**.

- **TPAs:** "Fiz TPA" com **1 toque** (repete os litros da última TPA desse aquário). A dose de condicionador é calculada e descontada do stock.
- **Medições:** NH₃/NH₄, NO₂, NO₃, pH, GH, KH e temperatura, com teste de gotas ou tira, e gráficos por parâmetro.
- **Fauna e ninhadas:** população por espécie e transferências; ninhadas por mãe, com avisos de novo parto (+25 dias) e de separação dos machos (4 e 6 semanas).
- **Fotografias:**
  - câmara, galeria ou print colado; comprimidas no iPhone (WebP 0,8, máx. 1600 px);
  - etiquetas, ligação a um registo, galeria por aquário com visualizador em ecrã inteiro;
  - lembrete de foto ao domingo.
- **Produtos:** condicionador (stock por TPA, aviso quando restam ~3 TPAs), comida e bactérias (fim estimado).
  O stock pode ser corrigido rapidamente como cheio, metade ou pouco; as TPAs seguintes continuam a descontar o condicionador.
- **Modo férias:** checklist, quem alimenta; os avisos de TPA ficam em pausa e há um lembrete no regresso.
- **Lista de desejos:** com print, link, loja e preço.
- **Alertas:**
  - histórico de tudo o que foi avisado;
  - ações rápidas para tratar, ignorar ou lembrar amanhã;
  - mensagens push curtas, com identidade visual por categoria e atalho para o contexto;
  - Web Push com email como alternativa;
  - se está tudo bem, não notifica.
- **Fontes externas:**
  - meteorologia de Braga (calor/frio);
  - cortes de luz (E-REDES) e de água (AGERE);
  - qualidade da água da torneira (dureza, pH, cloro);
  - lojas: produtos novos, regresso de stock e mudanças de preço.
- **Servidor MCP:** o Claude (claude.ai ou Claude Code) lê os dados, só em leitura e com OAuth.

## Stack

| | |
|---|---|
| App | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 |
| Dados | Supabase: Auth com código OTP e servidor OAuth 2.1, Postgres com RLS, Storage |
| Local-first | TanStack Query persistido em IndexedDB, updates otimistas e mutações offline |
| PWA | Serwist (`@serwist/turbopack`): precache, cache de fotos e Web Push |
| UI nativa | vaul (bottom sheets), View Transitions API, safe areas |
| Automações | Edge Function `automacoes` + pg_cron + Web Push (VAPID) + Resend |
| MCP | `mcp-handler` (Streamable HTTP) em `/api/mcp` |
| Deploy | Vercel (Git: cada merge no `main` publica) |

## Estrutura

```
supabase/
  migrations/                 esquema + RLS (ver lista abaixo)
  functions/automacoes/       Edge Function (regras diárias + fontes externas)
  functions/_shared/          notificar.ts (push/email), fontes.ts, verificadores.ts
  templates/codigo.html       email com o código de 6 dígitos
  config.toml, seed.sql
src/
  app/
    (app)/                    ecrãs com tab bar: Aquários, /aquario, /historico,
                              /definicoes, /alertas, /produtos, /desejos, /ferias, /fontes
    login/                    email → código OTP (aceita ?voltar=)
    oauth/consent/            consentimento OAuth (conector MCP)
    api/mcp/                  servidor MCP
    .well-known/              metadados OAuth (RFC 9728 / RFC 8414)
    sw.ts, serwist/[path]/    service worker
  components/                 shell, ui, forms, fotos, fauna, produtos, fontes, …
  lib/
    query/                    QueryClient, IndexedDB, mutações otimistas
    mcp/dados.ts              consultas do MCP (com o token do utilizador → RLS)
    derivados.ts, produtos.ts, ninhadas.ts, imagem.ts, formato.ts
```

### Migrations

| Ficheiro | O quê |
|---|---|
| `…0001_schema` | aquários, TPAs, medições, fauna, fotos, definições; RLS; dose por trigger; seed dos 3 aquários |
| `…0002_storage_fotos` | bucket privado `fotos` |
| `…0003_lembretes` | `push_subscricoes`, fuso horário |
| `…0004_cron_lembretes` | primeiro agendamento (substituído pela 0007) |
| `…0005_fotos_v2` | etiquetas, ligação a eventos, miniaturas, caminho `{aquario_id}/AAAA/MM/{uuid}.webp`, lembrete semanal |
| `…0006_parte2` | `produtos` (substitui `condicionadores`, com view de compatibilidade), `ninhadas`, `ferias`, `desejos`, `alertas`, função `gerar_alertas()` |
| `…0007_cron_automacoes` | `chamar_automacoes()` + job diário |
| `…0008_fontes_externas` | `fontes_externas`, `novidades_externas`, fontes predefinidas de Braga, job de 3 em 3 h |
| `…0009_alertas_interativos` | estados, adiamento e tentativas de entrega dos alertas |
| `…0010_stock_visual` | correção rápida do stock e alertas coerentes com essa estimativa |

---

## 1. Supabase

### 1.1 Projeto e migrations

1. Cria um projeto (região Europa) e copia, em **Project Settings → API**, o URL e a chave *publishable*/*anon*.
2. Aplica as migrations:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <ref>
```

```bash
npx supabase db push
```

### 1.2 Login por código (OTP de 6 dígitos)

A app usa email + código de 6 dígitos, e **não** magic link, porque no iOS o link abriria no Safari e não na app instalada. Em **Authentication**:

1. **SMTP próprio (obrigatório no plano gratuito):** sem ele não se podem mudar os templates, e o email padrão só traz o link. Em **Emails → SMTP Settings**, configura a Resend:

   | Campo | Valor |
   |---|---|
   | Sender | `onboarding@resend.dev` (ou um domínio teu verificado) |
   | Host / Port | `smtp.resend.com` / `465` |
   | Username / Password | `resend` / API key da Resend |

   Sem domínio verificado, a Resend só envia para o email da própria conta Resend. Usa esse email para entrares na app.
2. **Email OTP Length:** `6` (em projetos novos vem a 8). Expiração: 900 s.
3. **Templates Magic Link e Confirm signup:** conteúdo de `supabase/templates/codigo.html` (usa `{{ .Token }}`).
4. **URL Configuration → Site URL:** o URL da Vercel.
5. Depois de criares a tua conta, desliga **Allow new users to sign up**. A app (e o conector MCP) fica só para ti.

### 1.3 Servidor OAuth (para o conector MCP)

Em **Authentication → OAuth Server**:

- **Enable OAuth server:** ligado
- **Allow dynamic client registration:** ligado (o claude.ai regista-se sozinho)
- **Authorization path:** `/oauth/consent`

Confirma em `https://<ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1`.

---

## 2. Variáveis de ambiente (Vercel e `.env.local`)

| Variável | Onde obter |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave *publishable* (ou *anon*) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` |
| `MCP_EMAILS_PERMITIDOS` | opcional: emails (separados por vírgulas) que podem usar o MCP |

## 3. Desenvolvimento e deploy

```bash
npm install
```

```bash
npm run dev
```

O service worker está desligado em `dev`. Para testar a PWA (offline, push), usa `npm run build && npm start`. Outros comandos: `npm run lint`, `npm run typecheck` e `npm run assets` (ícones e splash screens com o pwa-asset-generator).

A Vercel está ligada ao GitHub: cada merge no `main` publica em produção e cada pull request gera um link de pré-visualização.

---

## 4. Automações, cron e notificações

### 4.1 Como funciona

| Job (pg_cron) | Quando | O quê |
|---|---|---|
| `automacoes-diaria` | 18:00 UTC | `gerar_alertas()` + envio |
| `automacoes-fontes` | de 3 em 3 h, ao minuto 15 | verifica as fontes externas "vencidas" (meteorologia 1×/dia, restantes de 6 em 6 h) + envio |

O job diário (`gerar_alertas()`, em SQL e idempotente por chave) cria alertas para:
- **TPA:** aviso aos 7 dias e urgente aos 10 (configurável); em pausa durante as férias;
- **esponja do filtro:** 1× por mês;
- **produtos a acabar;**
- **ninhadas:** +25 dias, 4 e 6 semanas;
- **férias:** checklist incompleta 2 dias antes; verificação no regresso;
- **foto da semana:** ao domingo.

**Envio** (`_shared/notificar.ts`):
- Web Push para todos os dispositivos (até 3 alertas: um push cada; mais do que isso: um resumo);
- se o push não chegar a nenhum dispositivo e o email estiver ativo: um email pela Resend;
- fica registado em `alertas.canal` e em `notificado_em`.

O cron da Vercel Hobby não é usado: só corre 1× por dia.

### 4.2 Segredos da Edge Function

```bash
npx supabase secrets set CRON_SECRET=<aleatório> VAPID_PUBLIC_KEY=<pública> VAPID_PRIVATE_KEY=<privada> VAPID_SUBJECT=mailto:<email> APP_URL=https://<app>.vercel.app
```

```bash
npx supabase secrets set RESEND_API_KEY=<chave> "RESEND_FROM=Aquário <onboarding@resend.dev>"
```

```bash
npx supabase functions deploy automacoes --no-verify-jwt
```

No **SQL Editor**, guarda no Vault o URL do projeto e o mesmo `CRON_SECRET`:

```sql
select vault.create_secret('https://<ref>.supabase.co', 'project_url');
select vault.create_secret('<o mesmo CRON_SECRET>', 'lembrete_cron_secret');
```

Para testar sem esperar pelo cron: `select public.chamar_automacoes('diaria');` ou `('fontes')`. A resposta fica em `net._http_response`.

### 4.3 Push no iPhone

Em **Definições → Notificações → Ativar** (o iOS só pede permissão a partir de um toque, e só com a app instalada, iOS 16.4+). Depois usa **Enviar notificação de teste**.

---

## 5. Fontes externas (Definições → Fontes externas)

| Fonte | Como | Configurar |
|---|---|---|
| Meteorologia Braga | Open-Meteo (sem chave), 1×/dia. Alerta se a máx. for ≥ 30 °C (tampa aberta, ventoinha, luz mais cedo) ou a mín. ≤ 5 °C (confirmar o aquecedor) | coordenadas e limites |
| Cortes de luz | Dados abertos da E-REDES (`network-scheduling-work`), filtrados por concelho e **código postal** | **o teu código postal** (ex.: `4710-057` ou só `4710`) |
| Cortes de água | Página "Avisos e Informações" da AGERE; avisa se o aviso mencionar a tua freguesia/rua, com o conselho "não faças TPA nesse período" | **freguesia e/ou rua** |
| Qualidade da água | Deteta um relatório trimestral novo da AGERE (rede de distribuição) e extrai dureza (mg/L CaCO₃ e °dGH), pH, cloro e condutividade | — |
| Aquaralândia | Store API do WooCommerce (pesquisa por palavra-chave); plano B: sitemap de produtos. Deteta produtos novos, regresso de stock e mudanças de preço | palavras-chave |
| ExoticLand | Sem loja online: entrada desativada | — |
| Outras lojas (+) | WooCommerce, ou **página + seletores CSS** | URL, seletores, palavras |

Cada verificação compara com a anterior. Só cria uma novidade (e um alerta) quando algo muda: há um `hash` único por fonte. A primeira verificação de lojas e da qualidade da água é só linha de base, sem alertas. O botão **Verificar agora** corre já as tuas fontes. Facebook, Instagram e WhatsApp não são suportados.

---

## 6. Conector MCP (Claude)

O endpoint `https://<app>.vercel.app/api/mcp` é Streamable HTTP, com autenticação OAuth 2.1 obrigatória. O servidor de autorização é o Supabase Auth, com registo dinâmico de clientes, e o consentimento fica em `/oauth/consent`. As consultas correm com o teu token, por isso a RLS garante que só os teus dados são lidos.

Ferramentas, todas só de leitura:
- `resumo_aquarios`
- `ultimas_tpas(aquario, dias)`
- `medicoes(aquario, dias)`
- `fauna_e_ninhadas(aquario)`
- `fotos_recentes(aquario, dias)`: URLs assinados, válidos 60 min
- `alertas_recentes(dias)`
- `lista_desejos`
- `novidades_externas(dias)`
- `resumo_semanal`

**claude.ai:**
1. Em **Definições → Conectores → Adicionar conector personalizado**, usa o nome `Aquário` e o URL `https://aquario-delta.vercel.app/api/mcp`.
2. Ao ligar, abre-se a página de login da app: entra com o código e carrega em **Autorizar**.

**Claude Code:**

```bash
claude mcp add --transport http aquario https://aquario-delta.vercel.app/api/mcp
```

Depois corre `/mcp` dentro do Claude Code para autenticar no browser.

Para revogar o acesso, desliga o conector no Claude ou remove o cliente em **Authentication → OAuth Server** na Supabase.

---

## 7. Instalar no iPhone

1. Abre o URL da app no **Safari** → **Partilhar** → **Adicionar ao ecrã principal**.
2. Abre a app pelo ícone e entra com o email e o código de 6 dígitos (o iOS 17+ sugere o código do Mail).
3. Em **Definições → Notificações**, toca em **Ativar**.

---

## Feeling nativo e motion

- **Ecrã:** `standalone`, `viewport-fit=cover`, status bar `black-translucent`, safe areas, `body` fixo a `100dvh`; só o conteúdo de cada ecrã faz scroll.
- **Componentes:** bottom sheets (vaul) e action sheets próprias, nunca `alert`/`confirm`.
- **Toque:** `:active` com `scale(.97)` e sem hover; inputs com 16 px ou mais.
- **Carregamento:** skeletons em vez de spinners; arranque a partir da cache.
- **Motion** (skill `motion-design`, arquétipo Corporate/iOS):
  - curva de assinatura `cubic-bezier(0.2,0,0,1)`; durações 120/280/420 ms; saídas a ~70% da duração da entrada;
  - View Transitions com deslize lateral e fallback em CSS;
  - visualizador de fotos: escala com fade e arrastar para baixo para fechar;
  - toasts sobem de baixo; `prefers-reduced-motion` passa a só fades.
