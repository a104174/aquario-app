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
