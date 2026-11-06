# Revisão UX mobile — aquario-app

Capturas: `reviews/2026-11-06/ciclo-0` (antes) e `reviews/2026-11-06/final` (depois), com contact sheets por dispositivo e vídeos dos gestos. Críticas por ciclo: `reviews/criticas.md`. Testes: `npm run test:mobile` (WebKit iPhone 15/SE/15 Pro Max + Chromium Pixel 7); Lighthouse: `npm run lighthouse`.

## 1. O que foi corrigido
- **Teclado**: `visualViewport` (--vv-h/--kb), campo focado e Guardar sempre acima do teclado, tab bar esconde-se, sheets sobem; inputmode/decimal com vírgula, enterkeyhint Seguinte/OK com avanço automático, tocar fora fecha, OTP com colar e auto-submit.
- **Scroll**: só o conteúdo faz scroll, restauro por ecrã (instantâneo ao voltar), tocar na tab ativa → topo, puxar para atualizar.
- **Gestos**: swipe da borda para voltar, sheets a arrastar/tocar no fundo, visualizador com pinça, duplo toque, swipe e arrastar para fechar, toque longo com ações; zoom de acessibilidade permitido.
- **Micro-interações/motion**: alvos ≥44 px, proteção contra duplo toque, haptics (Android), curvas e durações da identidade motion, só transform/opacity, "reduzir movimento" só com fades.
- **Layout**: safe areas (incl. paisagem com tab bar compacta), modo escuro, estados vazio/erro com "Tentar de novo"/offline, contraste AA.
- **Permissões**: explicação antes do pedido do sistema (notificações, câmara) e passos úteis se recusadas.
- **Performance**: cliente Supabase mínimo e diferido, sheets/visualizador/gráficos carregados só quando usados, listas diferidas, CLS ≈ 0.

## 2. Notas finais
| Área | Ciclo 0 | Final |
|---|---|---|
| Teclado/formulários | 4 | 8 |
| Scroll | 5 | 9 |
| Gestos/navegação | 3 | 8 |
| Micro-interações | 6 | 8 |
| Motion | 7 | 9 |
| Layout/safe areas | 6 | 9 |
| Performance | — | 8 |
| Sensação nativa | 5 | 8 |

Lighthouse mobile (mediana de 3): Aquários 92 · Detalhe 94 · Histórico 94 · Definições 93; acessibilidade, boas práticas e SEO 100; instalável sem erros. Testes: 174/174 verdes.

Antes/depois (iPhone 15): `reviews/2026-11-06/ciclo-0/contact-sheet-iphone-15.jpg` → `reviews/2026-11-06/final/contact-sheet-iphone-15.jpg`.

## 3. Checklist no iPhone real
1. Instalar pelo Safari (Partilhar → Ecrã principal) e abrir pelo ícone.
2. Registar uma medição: teclado numérico com vírgula, Seguinte avança, Guardar visível.
3. Fechar o teclado: sem espaço em branco no fundo.
4. Swipe da borda esquerda no Detalhe volta atrás.
5. Arrastar uma sheet para baixo fecha-a; tocar no fundo também.
6. Visualizador: pinça, duplo toque, swipe entre fotos, arrastar para baixo.
7. Puxar para atualizar no Histórico; tocar na tab ativa vai ao topo.
8. Câmara: explicação aparece primeiro; tirar foto funciona.
9. Notificações: explicação → pedido do iOS → "Enviar notificação de teste" chega.
10. Rodar para paisagem e ativar "Reduzir movimento": nada cortado, só fades.
