# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Uma única pessoa (o dono, em Braga) que mantém três aquários de água doce em casa: "Principal (Aquatlantis Vienna)", "AQUARIUS 20 L" e "Betta". Usa a app no iPhone 16 Pro Max (440×956), instalada no ecrã principal (PWA standalone), quase sempre com uma mão, muitas vezes ao lado do aquário, com as mãos molhadas ou a segurar um balde ou um kit de testes.

## Product Purpose
Diário dos aquários: registar trocas parciais de água (TPA), medições de parâmetros, fauna (grupos, variedades, animais individuais), ninhadas, fotografias e produtos, e lembrar o que está em atraso. Sucesso = registar em segundos (1 toque para a TPA habitual), perceber o estado de cada aquário num relance e nunca perder histórico.

## Positioning
Ferramenta pessoal, local-first e gratuita, feita à medida destes aquários: sabe o volume útil de cada um, o condicionador usado e a dose, a água da torneira de Braga, a meteorologia e os cortes de luz da zona, e liga cada foto ao registo e ao animal a que pertence.

## Operating Context
- iPhone, PWA standalone, pt-PT, tema do sistema (claro/escuro automático).
- Uso com uma mão: ações principais no terço inferior do ecrã.
- Registos feitos durante a manutenção (balde, kit de gotas/tiras); consultas rápidas ao passar pelo aquário.
- Lembretes por Web Push e email; fontes externas (Open-Meteo, E-REDES, AGERE, loja Aquaralândia).
- Conector MCP (só leitura) para consultar os dados a partir do Claude.

## Capabilities and Constraints
- Next.js App Router + TypeScript + Tailwind 4; Supabase (Auth OTP, Postgres com RLS, Storage); TanStack Query persistido em IndexedDB (offline); Serwist (service worker); vaul (sheets); Vercel Hobby + Supabase Free (tudo gratuito).
- Já resolvido e a não regredir: teclado/visualViewport nas sheets, safe areas, scroll/restauro, pull-to-refresh, atualização da PWA.
- Apagar é definitivo (sem backups no plano Free): ações destrutivas precisam de confirmação clara.
- Termos: TPA, medição, fauna, grupo, variedade, detalhe (identificar animais de um grupo), ninhada, condicionador, volume útil/bruto.

## Brand Commitments
- Nome: "Aquário"; logótipo: peixe estilizado dentro de um círculo com ondas (ícones em `public/icons/`).
- Tem de parecer uma app iOS nativa (convenções Apple: tipografia do sistema, materiais, listas, navegação, sheets).
- Personalidade expressiva inspirada no Duolingo em toda a app (botões com relevo, celebrações, mascote), com tema aquático e identidade própria — inspiração de energia, não cópia de componentes ou personagens.
- Mascote: peixe original a criar (decisão confirmada em 2026-11-07), derivado da marca; ainda não existe.
- Língua: português de Portugal.

## Evidence on Hand
Dados reais dos três aquários (TPAs, medições, 17+ animais no Principal com fotos por grupo), fotografias reais em Supabase Storage. Não existem testemunhos, utilizadores externos nem métricas públicas — não inventar.

## Product Principles
1. Registar mais depressa do que escrever num papel: a TPA habitual num toque, formulários curtos, teclado certo.
2. O estado de cada aquário lê-se num relance; o que está em atraso salta à vista.
3. Nunca perder dados: confirmações em ações destrutivas, offline-first, histórico fiel.
4. Nativo primeiro, expressivo por cima: a alegria nunca atrasa nem esconde uma tarefa.

## Accessibility & Inclusion
Contraste WCAG AA, alvos ≥ 44 px, texto ≥ 16 px nos campos, respeito por "Reduzir movimento" e pelo tamanho de texto do sistema sempre que possível.
