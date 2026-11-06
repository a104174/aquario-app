# Aquarium Visual Kit

Componentes para integrar na Home, nos aquários e no histórico. Cada cartão ocupa a largura que o layout lhe atribui. Os estilos são locais, herdam a tipografia e usam os tokens semânticos de superfície, texto e acento da aplicação, com valores neutros quando esses tokens faltam.

| Ficheiro | O que exporta |
| --- | --- |
| `parametro-agua.tsx` | `ParametroAgua` para pH, temperatura, NO₂, NO₃, GH e KH |
| `mini-grafico.tsx` | `MiniGrafico` em modo compacto ou expandido |
| `ciclo-troca-agua.tsx` | `CicloTrocaAgua` com datas e progresso do ciclo configurado |
| `icone-aquario.tsx` | `IconeAquario` com dez desenhos e `FaunaSemFoto` |
| `dados.ts` e `visual-kit.module.css` | Transformações puras e estilos dos componentes |

## Exemplos de integração

```tsx
import { CicloTrocaAgua } from "@/components/aquarium-visual-kit/ciclo-troca-agua";
import { FaunaSemFoto, IconeAquario } from "@/components/aquarium-visual-kit/icone-aquario";
import { MiniGrafico } from "@/components/aquarium-visual-kit/mini-grafico";
import { ParametroAgua } from "@/components/aquarium-visual-kit/parametro-agua";

// A página seleciona os registos do aquário e os limites que o utilizador configurou.
const leiturasPh = medicoes.map(({ data, ph }) => ({ data, valor: ph }));

<ParametroAgua parametro="ph" medicoes={leiturasPh} referencia={referenciaPh} />;

<MiniGrafico
  rotulo="Evolução do pH"
  medicoes={leiturasPh}
  amplitudeMinima={1}
  modo="expandido"
/>;

<CicloTrocaAgua
  ultimaTpa={ultimaTpa?.data}
  intervaloDias={periodicidadeConfigurada}
  agora={instanteDaPagina}
/>;

<FaunaSemFoto tipo="camarao" />;
<IconeAquario tipo="filtro" tamanho={20} rotulo="Filtro" />;
```

`referenciaPh` é um par opcional `[mínimo, máximo]`. Passar `undefined` omite a faixa. `instanteDaPagina` é um timestamp ISO com fuso, obtido pelo chamador e partilhado entre o servidor e o cliente quando aplicável. O ícone é decorativo sem `rotulo`. Usar `decorativo` no fallback se o texto adjacente já transmitir a mesma informação.

## Dados e comportamento

- As medições usam ISO 8601 com fuso explícito. Entradas inválidas ou nulas são omitidas, e zero é uma leitura. Duplicados iguais são contados uma vez. Valores em conflito no mesmo instante são omitidos.
- A tendência compara a primeira e a última leitura válida da janela recebida. A distância no eixo horizontal corresponde ao tempo real. A curva passa pelos valores e fica entre os extremos de cada segmento.
- A amplitude mínima limita a amplificação visual de pequenas oscilações. A faixa de referência é uma sobreposição separada, fornecida pelo chamador.
- A manutenção conta dias de calendário em Lisboa. O chamador decide qual é a última TPA e fornece a periodicidade em dias inteiros positivos. Sem periodicidade, aparecem apenas a última TPA e o tempo decorrido.
- A biblioteca usa SVG e CSS Modules. A animação de entrada é breve e respeita a preferência de movimento reduzido. Os cartões mostram estados vazios e são de leitura. A página gere a janela de histórico, o carregamento e as ações.

## Verificação isolada

```sh
npx playwright test -c tests/aquarium-visual-kit/playwright.config.ts
```

O teste usa os browsers Playwright do projeto e a fixture em `tests/aquarium-visual-kit/exemplos.tsx`. Gera capturas dos temas claro e escuro no WebKit em `test-results/aquarium-visual-kit`, sem criar uma rota na aplicação.
