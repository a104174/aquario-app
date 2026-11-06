import { IconChevronDireita, IconGota } from "@/components/icons";
import { NavLink } from "@/components/shell/nav";
import { dataCurta, diasDesde } from "@/lib/formato";
import type { Aquario, Tpa } from "@/lib/tipos";

export function CicloTpa({ aquarios, tpas, intervalo }: { aquarios?: Aquario[]; tpas?: Tpa[]; intervalo: number }) {
  const ciclos = aquarios?.map((aquario) => {
    const ultima = tpas?.find((tpa) => tpa.aquario_id === aquario.id);
    return { aquario, ultima, dias: ultima ? diasDesde(ultima.data) : null };
  });
  const ciclo = ciclos?.reduce<NonNullable<typeof ciclos>[number] | undefined>(
    (escolhido, atual) => !escolhido || (atual.dias ?? Infinity) > (escolhido.dias ?? Infinity) ? atual : escolhido,
    undefined,
  );
  const dias = ciclo?.dias;
  const prazo = Math.max(intervalo, 1);
  const resto = dias == null ? null : prazo - dias;
  const estado = resto == null ? "Sem registo" : resto < 0 ? "Em atraso" : resto === 0 ? "Prevista para hoje" : "Dentro do prazo";
  const titulo = !aquarios || !tpas ? "Ciclo de manutenção" : !ciclo ? "Adiciona um aquário" : resto == null ? "Primeira troca de água" : resto < 0 ? `${-resto} ${resto === -1 ? "dia" : "dias"} de atraso` : resto === 0 ? "Troca de água hoje" : `Troca em ${resto} ${resto === 1 ? "dia" : "dias"}`;
  const progresso = dias == null ? 0 : Math.max(0, Math.min(100, dias / prazo * 100));
  const tom = resto != null && resto <= 0 ? "text-[#ffd18a]" : "text-[#8ce4e6]";
  const destino = ciclo ? `/aquario?id=${ciclo.aquario.id}` : "/aquarios";

  return (
    <NavLink href={destino} className="mare-hero mare-toque relative isolate block overflow-hidden rounded-[26px] p-5 text-[#edfafd]">
      <svg viewBox="0 0 200 170" fill="none" className="pointer-events-none absolute -right-8 -top-4 -z-10 h-[195px] w-[230px] text-[#74dadd]/20" aria-hidden="true">
        <path stroke="currentColor" d="M21 2c23 14 28 27 46 32 31 9 62-25 96-11 24 10 29 38 59 42M8 11c24 13 36 38 59 42 35 7 65-23 93-12 25 10 31 43 63 49M-1 28c22 12 43 43 71 46 31 4 58-21 86-10 25 10 35 44 69 50M-9 52c24 10 53 43 82 44 29 1 56-15 80-4 25 11 38 43 74 49M-13 76c30 11 59 39 89 42 28 3 51-13 73-3 27 12 44 42 79 49" />
      </svg>

      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.15em] text-[#b6dce4]">
          <IconGota size={17} /> Ciclo de TPA
        </span>
        {ciclo && tpas ? <span className={`rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold ${tom}`}>{estado}</span> : null}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div>
          <p className="text-[26px] font-semibold leading-[1.08] tracking-[-.045em]">{titulo}</p>
          <p className="mt-2 text-[14px] leading-snug text-[#b6dce4]">{ciclo?.aquario.nome ?? "Manutenção dos teus aquários"}</p>
        </div>
        <div className={`relative grid size-[84px] shrink-0 place-items-center ${tom}`}>
          <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="40" cy="40" r="34" fill="#26282b" fillOpacity=".9" stroke="white" strokeOpacity=".16" strokeWidth="4" />
            {progresso > 0 && <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" pathLength="100" strokeDasharray={`${progresso} 100`} />}
          </svg>
          {dias == null ? <IconGota size={26} className="relative" /> : (
            <span className="relative text-center tabular-nums" aria-label={`${dias} de ${prazo} dias desde a última troca`}>
              <span className="block text-[23px] font-semibold leading-none">{dias}<span className="text-[13px] opacity-75">/{prazo}</span></span>
              <span className="text-[10px] uppercase tracking-wider">dias</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/15 pt-3 text-[12px] text-[#b6dce4]">
        <span>{ciclo?.ultima ? `Última troca · ${dataCurta(ciclo.ultima.data)}` : ciclo ? "Histórico da água" : "Ver aquários"}</span>
        <IconChevronDireita size={18} className="shrink-0 text-[#8ce4e6]" />
      </div>
    </NavLink>
  );
}
