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
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-text-2">Registo rápido</h2>
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
        <div className="grid grid-cols-4 gap-2">
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
                className="pressable flex min-h-[82px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[16px] bg-surface px-1.5 text-center shadow-[var(--shadow-card)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon size={20} />
                </span>
                <span className="w-full truncate text-[12px] font-semibold">{opcao.titulo}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
