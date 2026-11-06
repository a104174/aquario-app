"use client";

import { useEffect, useState, type ComponentType } from "react";
import { IconBebe, IconCamara, IconGota, IconPeixe, IconTubo } from "@/components/icons";
import { feedbackTatil } from "@/lib/haptics";
import { abrirRegistar, type TipoRegisto } from "@/lib/ui-store";

const CHAVE = "aquario-atalhos-home-v1";
const MAX_ATALHOS = 4;
const PADRAO: TipoRegisto[] = ["tpa", "medicao", "foto", "fauna"];

const OPCOES: {
  tipo: TipoRegisto;
  titulo: string;
  descricao: string;
  icon: ComponentType<{ size?: number }>;
}[] = [
  { tipo: "tpa", titulo: "TPA", descricao: "Troca de água", icon: IconGota },
  { tipo: "medicao", titulo: "Medição", descricao: "Parâmetros", icon: IconTubo },
  { tipo: "foto", titulo: "Foto", descricao: "Registar evolução", icon: IconCamara },
  { tipo: "fauna", titulo: "Fauna", descricao: "Entrada ou baixa", icon: IconPeixe },
  { tipo: "ninhada", titulo: "Ninhada", descricao: "Novo parto", icon: IconBebe },
];

function lerAtalhos() {
  try {
    const guardados = JSON.parse(localStorage.getItem(CHAVE) ?? "[]") as TipoRegisto[];
    const validos = guardados.filter((tipo) => OPCOES.some((o) => o.tipo === tipo));
    return validos.length ? [...new Set(validos)].slice(0, MAX_ATALHOS) : PADRAO;
  } catch {
    return PADRAO;
  }
}

export function AtalhosRapidos() {
  const [atalhos, setAtalhos] = useState<TipoRegisto[]>(PADRAO);
  const [aEditar, setAEditar] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAtalhos(lerAtalhos()));
    return () => cancelAnimationFrame(id);
  }, []);

  function alternar(tipo: TipoRegisto) {
    feedbackTatil();
    setAtalhos((atuais) => {
      const seguintes = atuais.includes(tipo)
        ? atuais.length > 1
          ? atuais.filter((t) => t !== tipo)
          : atuais
        : atuais.length < MAX_ATALHOS
          ? [...atuais, tipo]
          : [...atuais.slice(1), tipo];
      localStorage.setItem(CHAVE, JSON.stringify(seguintes));
      return seguintes;
    });
  }

  return (
    <section aria-labelledby="inicio-atalhos">
      <div className="flex items-center justify-between">
        <h2 id="inicio-atalhos" className="mare-seccao !mb-0">Registo rápido</h2>
        <button
          type="button"
          onClick={() => setAEditar((v) => !v)}
          className="pressable min-h-11 rounded-lg px-2 text-[13px] font-semibold text-accent"
        >
          {aEditar ? "Concluído" : "Personalizar"}
        </button>
      </div>

      {aEditar ? (
        <div className="grid grid-cols-2 gap-2 rounded-[16px] bg-surface p-2 shadow-[var(--shadow-card)]">
          {OPCOES.map((opcao) => {
            const Icon = opcao.icon;
            const ativa = atalhos.includes(opcao.tipo);
            return (
              <button
                key={opcao.tipo}
                type="button"
                aria-pressed={ativa}
                onClick={() => alternar(opcao.tipo)}
                className={`pressable flex min-h-12 items-center gap-2 rounded-[12px] px-3 text-left text-[14px] font-medium ${
                  ativa ? "bg-accent-soft text-accent" : "bg-surface-2 text-text-2"
                }`}
              >
                <Icon size={20} />
                <span>{opcao.titulo}</span>
                <span className="ml-auto text-[16px]" aria-hidden>{ativa ? "✓" : "+"}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {atalhos.map((tipo) => {
            const opcao = OPCOES.find((o) => o.tipo === tipo)!;
            const Icon = opcao.icon;
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => {
                  feedbackTatil();
                  abrirRegistar({ tipo });
                }}
                className="mare-toque mare-superficie flex min-h-[65px] min-w-0 items-center gap-2.5 rounded-[17px] px-2.5 py-2 text-left"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-accent/20 bg-accent-soft text-accent">
                  <Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight">{opcao.titulo}</span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-text-2">{opcao.descricao}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
