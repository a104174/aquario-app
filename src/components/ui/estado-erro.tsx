"use client";

import { IconNuvemOff } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/query/sincronizacao";

/**
 * Erro ao carregar (sem dados em cache): explica e oferece "Tentar de novo".
 * Offline mostra uma variante própria (não é um erro, é falta de rede).
 */
export function EstadoErro({ onRetry, aTentar }: { onRetry: () => void; aTentar?: boolean }) {
  const online = useOnline();
  return (
    <div role="alert" className="enter-up flex flex-col items-center rounded-[18px] bg-surface px-6 py-10 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-warning">
        <IconNuvemOff size={28} />
      </span>
      <p className="text-[17px] font-semibold">{online ? "Não foi possível carregar" : "Sem ligação"}</p>
      <p className="mt-1 max-w-xs text-[15px] text-text-2">
        {online ? "Verifica a ligação e tenta de novo." : "Os dados aparecem quando voltares a estar online."}
      </p>
      <Button variant="secondary" className="mt-5" onClick={onRetry} loading={aTentar}>
        {aTentar ? "A tentar…" : "Tentar de novo"}
      </Button>
    </div>
  );
}
