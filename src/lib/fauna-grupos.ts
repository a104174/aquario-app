import { faunaAtual } from "./derivados";
import type { FaunaEvento } from "./tipos";

export type GrupoFauna = { especie: string; quantidade: number; origem?: FaunaEvento };
export const chaveEspecie = (especie: string) => especie.trim().toLocaleLowerCase("pt-PT");
export const nomeGrupoFauna = (grupo: Pick<FaunaEvento, "especie" | "variedade" | "nome_personalizado">) =>
  [grupo.especie, grupo.variedade, grupo.nome_personalizado ? `“${grupo.nome_personalizado}”` : null].filter(Boolean).join(" ");

export function gruposFauna(fauna: FaunaEvento[] | undefined, aquarioId: string): GrupoFauna[] {
  const eventos = fauna ?? [];
  const origens = new Map(eventos.filter((e) => e.grupo_proprio).map((e) => [e.id, e]));
  const saldos = new Map<string, number>();
  for (const e of eventos) {
    const id = e.grupo_proprio ? e.id : e.grupo_id;
    if (!id || !origens.has(id)) continue;
    const delta = e.aquario_id === aquarioId
      ? (e.tipo === "morte" || e.tipo === "saida" || e.tipo === "transferencia" ? -1 : 1) * e.quantidade
      : e.tipo === "transferencia" && e.aquario_destino_id === aquarioId ? e.quantidade : 0;
    saldos.set(id, (saldos.get(id) ?? 0) + delta);
  }
  const porEspecie = new Map<string, GrupoFauna[]>();
  for (const [id, quantidade] of saldos) {
    if (quantidade <= 0) continue;
    const origem = origens.get(id)!;
    const chave = chaveEspecie(origem.especie);
    const grupos = porEspecie.get(chave) ?? [];
    grupos.push({ especie: origem.especie, quantidade, origem });
    porEspecie.set(chave, grupos);
  }
  return faunaAtual(fauna, aquarioId).lista.flatMap((e) => {
    const grupos = porEspecie.get(chaveEspecie(e.especie)) ?? [];
    let restante = e.quantidade;
    const identificados = grupos.flatMap((g) => {
      const quantidade = Math.min(restante, g.quantidade);
      restante -= quantidade;
      return quantidade > 0 ? [{ ...g, quantidade }] : [];
    });
    return restante > 0 ? [...identificados, { especie: e.especie, quantidade: restante }] : identificados;
  });
}
