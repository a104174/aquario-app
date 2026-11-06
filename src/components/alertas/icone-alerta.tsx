import type { ReactNode } from "react";
import { IconBebe, IconCaixa, IconCamara, IconEstrela, IconGlobo, IconGota, IconMala, IconSino, IconTermometro } from "@/components/icons";

const MAPA: Record<string, ReactNode> = {
  tpa: <IconGota size={20} />,
  manutencao: <IconGota size={20} />,
  produto: <IconCaixa size={20} />,
  ninhada: <IconBebe size={20} />,
  ferias: <IconMala size={20} />,
  foto: <IconCamara size={20} />,
  meteo: <IconTermometro size={20} />,
  luz: <IconSino size={20} />,
  agua: <IconGota size={20} />,
  qualidade: <IconGota size={20} />,
  loja: <IconEstrela size={20} />,
  externo: <IconGlobo size={20} />,
};

export function IconeAlerta({ tipo }: { tipo: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
      {MAPA[tipo] ?? <IconSino size={20} />}
    </span>
  );
}
