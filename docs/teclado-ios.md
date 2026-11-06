# Teclado no iPhone — verificação manual

O motor de teclado é único (`src/lib/teclado.ts`, hook `useKeyboardViewport`) e publica
`--vvh`, `--vv-topo`, `--vv-fundo` e `--kb-height`. As sheets ancoram ao fundo da zona
visível (`--vv-fundo`), por isso ficam coladas ao topo do teclado mesmo quando o iOS
desloca o viewport ao focar um campo. Os testes automáticos estão em
`tests/mobile/teclado-sheets.spec.ts` (WebKit, iPhone 16 Pro Max 440×956 e SE), mas o
WebKit do Playwright não reproduz o deslocamento real do iOS — confirma no Simulador e no iPhone.

## Simulador do Xcode (iPhone 16 Pro Max)
1. `npm run build && npx next start -p 3000` no Mac (ou usa https://aquario-delta.vercel.app).
2. Simulador → Safari → abre o endereço → Partilhar → *Adicionar ao ecrã principal* → abre pelo ícone.
3. I/O → Keyboard → desliga *Connect Hardware Keyboard* (⇧⌘K) e usa *Toggle Software Keyboard* (⌘K).
4. Em cada sheet abaixo: toca no primeiro campo e depois percorre com as setas ↑/↓ da barra do teclado.
   Em cada campo confirma: o campo e o botão Guardar estão acima do teclado; a navegação inferior desapareceu.
5. Toca em ✓ (ou fora de um campo): a sheet volta ao fundo sem salto nem espaço em branco.

## iPhone real
Remove a app do ecrã principal, volta a instalá-la pelo Safari e repete o passo 4–5.
Testa também com a app rodada e com "Reduzir movimento" ativo (Definições → Acessibilidade).

## Sheets e ecrãs a testar
| Onde | Como abrir |
|---|---|
| TPA, Medição, Fauna, Foto (legenda), Ninhada | botão + da navegação → tipo |
| **Detalhar grupo** | Aquário → separador Fauna → toca num grupo → *Detalhar animais deste grupo* |
| Novo aquário | Aquários → + |
| Produto | Definições → Produtos → + |
| Desejo | Definições → Lista de desejos → + |
| Férias (sheet) | Definições → Modo férias → + |
| Férias (adicionar item) | Modo férias → campo *Adicionar item* |
| Loja | Definições → Fontes externas → + |
| Login (email e código) | terminar sessão → ecrã de login |

Na Medição confirma ainda: "Seguinte" nos campos intermédios, "OK" no último, Enter no último guarda.
