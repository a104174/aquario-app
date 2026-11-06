import type { EstadoNinhada, Ninhada } from "./tipos";

export const NOME_ESTADO: Record<EstadoNinhada, string> = {
  ativa: "Ativa",
  separada: "Machos separados",
  encerrada: "Encerrada",
};

const dia = (iso: string, mais: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + mais);
  return d;
};

/** Marcos de uma ninhada (mesmas regras das notificações). */
export function marcos(n: Ninhada) {
  return [
    { quando: dia(n.data_parto, 25), texto: "Prepara a maternidade (novo parto possível)" },
    { quando: dia(n.data_parto, 28), texto: "Separa os machos jovens (4 semanas)", soAtiva: true },
    { quando: dia(n.data_parto, 42), texto: "Confirma a separação (6 semanas)", soAtiva: true },
  ].filter((m) => !m.soAtiva || n.estado === "ativa");
}

/** O próximo marco ainda por chegar (ou o atual, se for hoje). */
export function proximoMarco(n: Ninhada) {
  if (n.estado === "encerrada") return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return marcos(n).find((m) => m.quando >= hoje) ?? null;
}
