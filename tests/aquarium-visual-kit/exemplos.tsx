import { createRoot } from "react-dom/client";
import { CicloTrocaAgua } from "../../src/components/aquarium-visual-kit/ciclo-troca-agua";
import { FaunaSemFoto, IconeAquario, type TipoIconeAquario } from "../../src/components/aquarium-visual-kit/icone-aquario";
import { MiniGrafico } from "../../src/components/aquarium-visual-kit/mini-grafico";
import { ParametroAgua } from "../../src/components/aquarium-visual-kit/parametro-agua";

const agora = "2026-11-06T12:00:00Z";
const ultimaTpa = "2026-11-02T11:00:00Z";
const medicoes = [
  { data: "2026-10-29T14:00:00Z", valor: 7.2 },
  { data: "2026-11-01T19:20:00Z", valor: 7.15 },
  { data: "2026-11-02T20:00:00Z", valor: 7.24 },
  { data: "2026-11-06T08:30:00Z", valor: 7.27 },
];
const iconografia: ReadonlyArray<readonly [TipoIconeAquario, string]> = [
  ["aquario", "Aquário"], ["peixe", "Peixe"], ["camarao", "Camarão"], ["caracol", "Caracol"],
  ["planta", "Planta"], ["gota", "Gota"], ["filtro", "Filtro"], ["termometro", "Temperatura"],
  ["manutencao", "Manutenção"], ["fotografia", "Fotografia"],
];

// Fixture sintética, carregada apenas pelo Playwright.
createRoot(document.getElementById("raiz")!).render(
  <main>
    <header><p>Interface de aquariofilia</p><h1>Aquarium Visual Kit</h1></header>
    <h2>Leituras da água</h2>
    <div className="grelha">
      <ParametroAgua parametro="ph" medicoes={medicoes} />
      <ParametroAgua parametro="temperatura_c" medicoes={medicoes.map(({ data }, i) => ({ data, valor: [24.4, 24.9, 24.6, 25.2][i] }))} referencia={[24, 26]} />
      <ParametroAgua parametro="no2" medicoes={[{ data: medicoes[3].data, valor: 0 }]} referencia={[0, 0.1]} />
      <ParametroAgua parametro="gh" medicoes={[]} />
    </div>
    <h2>Manutenção</h2>
    <div className="grelha">
      <CicloTrocaAgua agora={agora} ultimaTpa={ultimaTpa} intervaloDias={7} />
      <CicloTrocaAgua agora={agora} />
    </div>
    <h2>Histórico da água</h2>
    <MiniGrafico rotulo="Evolução do pH" medicoes={medicoes} amplitudeMinima={1} modo="expandido" />
    <h2>Fauna e iconografia</h2>
    <div className="fauna">
      <FaunaSemFoto tipo="peixe" />
      <FaunaSemFoto tipo="camarao" />
      <FaunaSemFoto tipo="caracol" />
    </div>
    <ul className="icones">
      {iconografia.map(([tipo, nome]) => <li key={tipo}><IconeAquario tipo={tipo} tamanho={20} />{nome}</li>)}
    </ul>
  </main>,
);
