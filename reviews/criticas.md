# Crítica por ciclo (UX mobile)

## Ciclo 0 — linha de base

| Área | Nota | Evidência |
|---|---|---|
| Teclado/formulários | 4 | login tapado pelo teclado; campo Temperatura escondido na medição; tab bar visível com teclado (Android); Enter não avança; colar OTP falha |
| Scroll | 5 | header/tab bar fixos OK; sem restauro de scroll, sem "tocar na tab → topo", sem pull-to-refresh |
| Gestos/navegação | 3 | sem swipe da borda, sem zoom no visualizador, sem toque longo; sheets OK |
| Micro-interações | 6 | :active OK; muitos alvos < 44 px (chips 36, stepper 40×32, interruptor 31, segmentado 30, "Fiz TPA" 32) |
| Motion | 7 | tokens consistentes, transições fluidas; não medido sob CPU 4× |
| Layout/safe areas | 6 | safe areas OK; estado de erro mostra "Ainda não há aquários" + CTA de criar (enganador) |
| Performance | — | não medida |
| Sensação nativa | 5 | — |

Piores defeitos: (1) teclado tapa campos/botões; (2) estado de erro enganador; (3) Enter/OTP/alvos pequenos.
Também: `SerwistProvider` lança erro na consola quando não há service worker (`_registration.waiting`).

## Ciclo 1 — teclado, inputs, erros, alvos de toque, contraste

Corrigido:
- `lib/teclado.ts`: `visualViewport` → `--vv-h`/`--kb`, `html[data-teclado]`; raiz da app e sheets com a altura visível; tab bar esconde-se (sai 200 ms ease-in, volta 280 ms ease-out); toasts acima do teclado; campo focado com scroll para a zona visível; tocar fora fecha o teclado; Enter → campo seguinte (`enterkeyhint` next/done automático).
- `interactive-widget=resizes-content` só fora do iOS (no WebKit gerava aviso na consola).
- OTP: colar "123 456" preenche e submete.
- `EstadoErro` com "Tentar de novo" (e variante offline) em todos os ecrãs de lista — antes mostrava o estado vazio.
- Registo do service worker tolerante (o `SerwistProvider` lançava erro sem SW).
- Alvos ≥ 44 px: chips, segmentado, stepper, interruptor (pista 51×31 numa área de 44), botões das sheets, "Fiz TPA", "Anular".
- Contraste AA: accent `#07758b`, warning `#9a5b00`, danger `#c0352e`, text-3 `#6a7884` (escuro `#7e94a2`), `--accent-forte` para texto sobre accent-soft.

| Área | Nota | Evidência (capturas ciclo-1) |
|---|---|---|
| Teclado/formulários | 8 | Temperatura visível acima do teclado com Guardar por cima; login acima do teclado; SE e Pixel sem nada tapado; testes de teclado a passar nos 3 dispositivos |
| Scroll | 5 | inalterado (ciclo 2) |
| Gestos/navegação | 3 | inalterado (ciclo 2) |
| Micro-interações | 7 | alvos ≥ 44 px; falta haptics e proteção contra toques repetidos |
| Motion | 7 | tab bar com teclado animada; falta medir CPU 4× (4 frames longos na navegação) |
| Layout/safe areas | 8 | erro com ação clara, offline discreto |
| Performance | 6 | Pixel CPU 4×: navegação 31 fps, pior frame 217 ms |
| Sensação nativa | 6 | falta gestos |

Piores defeitos para o ciclo 2: (1) sem swipe da borda nem gestos no visualizador; (2) scroll não restaurado / tocar na tab não vai ao topo / sem pull-to-refresh; (3) sem toque longo nem proteção contra toques repetidos (risco de TPA duplicada).

## Ciclo 2 — gestos, scroll e micro-interações

Corrigido:
- `lib/gestos.ts`: memória de scroll por rota (restaura ao voltar a uma tab/ecrã), tocar na tab ativa → topo (scroll suave), puxar para atualizar (listeners passivos; funciona com o bounce do iOS e no Android; indicador com resistência, "pop" e haptic no limiar), swipe a partir da borda esquerda para voltar (o ecrã segue o dedo; ≥ 35% da largura ou rápido → sai e volta atrás; senão assenta), toque longo (antecipação: a linha "levanta"; abre a action sheet).
- Timeline: toque = editar (fotos: visualizador); toque longo = menu (Editar / Adicionar foto / Apagar).
- Visualizador: pinça 1–4× mantendo o ponto debaixo dos dedos, duplo toque 2,5× no ponto, arrastar com zoom (com limites), swipe nativo entre fotos e arrastar para baixo para fechar só sem zoom; retirado `touch-none` da raiz (podia impedir o swipe entre fotos no iPhone).
- Zoom de acessibilidade: retirado `user-scalable=no`; `touch-action: manipulation` na interface.
- Botões ignoram toques repetidos (800 ms); "Fiz TPA" 1×/1,5 s por aquário.
- Haptics (Android): sucesso, aviso, seleção (stepper, segmentado, interruptor), limiares de gestos, toque longo.

| Área | Nota | Evidência |
|---|---|---|
| Teclado/formulários | 8 | testes de teclado verdes nos 3 dispositivos; Enter avança |
| Scroll | 8 | tocar na tab → topo; pull-to-refresh com pedido de dados; restauro corrigido no fim do ciclo (cleanup do React 19 lia scrollTop 0) |
| Gestos/navegação | 8 | swipe da borda volta atrás; duplo toque e pinça fazem zoom; arrastar para baixo fecha; toque longo abre ações; sheets fecham a arrastar/tocar no fundo |
| Micro-interações | 8 | 0 alvos < 44 px; proteção contra duplos toques; haptics |
| Motion | 8 | Pixel CPU 4×: navegação 37 fps (2 frames > 50 ms), sheet 35 fps (pior 233 ms) |
| Layout/safe areas | 8 | — |
| Performance | 7 | falta Lighthouse |
| Sensação nativa | 8 | — |

Piores defeitos para o ciclo 3: (1) performance não medida com Lighthouse, frame de 233 ms ao abrir a sheet; (2) permissões (câmara/notificações) sem explicação prévia nem ecrã útil se negadas; (3) landscape, reduced-motion e snap points das sheets não verificados.

## Ciclo 3 — performance, permissões, paisagem e "reduzir movimento"

Corrigido:
- **Performance** (Lighthouse mobile): cliente Supabase mínimo (auth/postgrest/storage/functions, sem Realtime) carregado a pedido; sheets (vaul), action sheet, visualizador, gráficos e galeria fora do bundle inicial e montados só na 1.ª utilização (o 1.º toque no ecrã pré-carrega o código das sheets); listas longas com `useDeferredValue` (a timeline monta vazia e enche num render interrompível); uma só subscrição às fotos na timeline (era uma por linha); cáusticas do header animadas só com `transform`; CLS: cartão "Instalar" no fim das Definições, altura reservada para os filtros do Histórico, Aquários espera pelas fontes externas antes de sair do skeleton; contraste AA e ordem de títulos (h1 → h2).
- **Permissões**: notificações — folha "Lembretes na hora certa" com o que vai ser enviado ANTES do pedido do iOS ("Permitir notificações" / "Agora não"); se recusadas, passos para voltar a permitir + "Usar email entretanto"; se a app não estiver instalada, passos para a instalar. Câmara — explicação antes do 1.º pedido (só uma vez), e se bloqueada: passos + "Usar a galeria".
- **Paisagem**: conteúdo, título, barra do header, tab bar e toasts afastados do notch/Dynamic Island (`safe-area-inset-left/right`); tab bar compacta do iOS (ícone ao lado do rótulo, 44 px); largura de leitura máx. 680 px; sheets cabem (Guardar visível).
- **Reduzir movimento**: o grupo da View Transition do header deixou de fazer morph de posição; teste novo confirma que navegação, separadores e voltar só usam fades.
- Restauro de scroll mais robusto (tenta até 3 s enquanto o conteúdo diferido chega, desiste ao primeiro toque/roda).
- Testes novos (`estados.spec.ts`): permissões (4), paisagem (4 × 2 dispositivos), reduzir movimento.

Lighthouse mobile (desempenho / acessibilidade / boas práticas / SEO): Aquários 92/100/100/100 · Detalhe 91/100/100/100 · Histórico 93/100/100/100 · Definições 92/100/100/100 (antes: 95/100/81, 87/98/81, 86/98/81, 85/95/81). Instalável: 0 erros. CLS ≤ 0,032.

`npm run test:mobile`: 174 passados, 0 falhados (WebKit: iPhone 15, SE, 15 Pro Max; Chromium: Pixel 7).

| Área | Nota | Evidência (capturas ciclo-3) |
|---|---|---|
| Teclado/formulários | 8 | teclado-* nos 3 iPhones e Pixel: campo e Guardar acima do teclado, tab bar escondida |
| Scroll | 8 | restauro, topo, pull-to-refresh verdes; fim-de-scroll sem conteúdo tapado |
| Gestos/navegação | 8 | swipe da borda, sheets a arrastar, visualizador (zoom/pinça/swipe), toque longo |
| Micro-interações | 8 | 0 alvos < 44 px (incl. paisagem); explicações de permissão com botões claros |
| Motion | 9 | reduzir movimento só com fades; CPU 4×: navegação 46 fps, sheet 47 fps |
| Layout/safe areas | 9 | paisagem com notch respeitado, tab bar compacta, SE/Pro Max sem cortes, modo escuro |
| Performance | 8 | Lighthouse ≥ 90 nos 4 ecrãs; TBT 310–370 ms |
| Sensação nativa | 8 | permissões ao estilo iOS, sheets e transições consistentes |

Piores defeitos que restam (ciclo final): (1) navegação para o Detalhe com CPU 4× ainda tem 3 frames > 50 ms (pior 150 ms) — montagem do ecrã; (2) sheets de formulários longos sem "detents" (meia altura/altura total) — decidido manter altura ajustada ao conteúdo, como as sheets de formulário do iOS, e documentar; (3) campos de data mostram segundos no WebKit de testes (Linux) — no iPhone o seletor é nativo; confirmar no aparelho.
