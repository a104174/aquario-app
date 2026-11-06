"use client";

import { novoId, ultimaTpa } from "./derivados";
import { num } from "./formato";
import { estadoStock } from "./produtos";
import { useApagar, useColecao, useGuardar } from "./query/dados";
import { vibrar } from "./haptic";
import { toast } from "./toast";
import { abrirRegistar } from "./ui-store";

/**
 * "Fiz TPA" de 1 toque: repete os litros da última TPA desse aquário com o
 * mesmo condicionador (ou o primeiro em uso). Toast com "Anular" durante 6 s.
 * Sem TPA anterior, abre o formulário.
 */
const ultimoRegisto = new Map<string, number>();

export function useFizTpa() {
  const { data: tpas } = useColecao("tpas");
  const { data: produtos } = useColecao("produtos");
  const guardar = useGuardar("tpas");
  const apagar = useApagar("tpas");

  function sugestao(aquarioId: string) {
    const ultima = ultimaTpa(tpas, aquarioId);
    if (!ultima) return null;
    const condicionadores = (produtos ?? []).filter((p) => p.tipo === "condicionador" && p.ativo && p.dose_por_litro != null);
    const cond = condicionadores.find((c) => c.id === ultima.condicionador_id) ?? (ultima.condicionador_id ? null : condicionadores[0]) ?? null;
    const dose = cond ? Math.round(ultima.litros * (cond.dose_por_litro ?? 0) * 100) / 100 : null;
    return { litros: Number(ultima.litros), cond, dose };
  }

  function registar(aquarioId: string) {
    const agora = Date.now();
    if (agora - (ultimoRegisto.get(aquarioId) ?? 0) < 1500) return; // toque repetido
    ultimoRegisto.set(aquarioId, agora);
    const s = sugestao(aquarioId);
    if (!s) return abrirRegistar({ tipo: "tpa", aquarioId });
    const id = novoId();
    guardar.mutate({
      id,
      aquario_id: aquarioId,
      data: new Date().toISOString(),
      litros: s.litros,
      condicionador_id: s.cond?.id ?? null,
      dose_ml: s.dose,
      notas: null,
    });
    const doseTxt = s.cond && s.dose != null ? ` · ${num(s.dose, 2)} ml ${s.cond.nome}` : "";
    vibrar("sucesso");
    toast(`✓ TPA de ${num(s.litros, 1)} L${doseTxt}`, "ok", 6000, { texto: "Anular", onClick: () => apagar.mutate({ id }) });
    if (s.cond) {
      const futuro = [{ id, aquario_id: aquarioId, data: new Date().toISOString(), litros: s.litros, condicionador_id: s.cond.id, dose_ml: s.dose, notas: null }, ...(tpas ?? [])];
      const e = estadoStock(s.cond, futuro);
      if (e.nivel === "baixo" || e.nivel === "vazio") setTimeout(() => toast(`⚠︎ ${s.cond!.nome}: ${e.resumo}`, "erro", 5000), 600);
    }
  }

  return { sugestao, registar };
}
