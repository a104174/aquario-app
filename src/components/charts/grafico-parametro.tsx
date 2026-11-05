"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { dataCurta, num } from "@/lib/formato";
import type { InfoParametro } from "@/lib/parametros";

type Ponto = { t: number; v: number; data: string };

const ALTURA = 200;
const M = { top: 28, right: 44, bottom: 26, left: 12 };

/** Escala "bonita": 3–4 ticks redondos. */
function ticks(min: number, max: number, n = 3) {
  if (min === max) {
    const d = Math.abs(min) * 0.1 || 1;
    min -= d;
    max += d;
  }
  const passoBruto = (max - min) / n;
  const mag = 10 ** Math.floor(Math.log10(passoBruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= passoBruto) ?? passoBruto;
  const ini = Math.floor(min / passo) * passo;
  const fim = Math.ceil(max / passo) * passo;
  const r: number[] = [];
  for (let x = ini; x <= fim + passo / 2; x += passo) r.push(Math.round(x * 1e6) / 1e6);
  return r;
}

/** Parâmetros de água nunca são negativos: o eixo começa no máximo em 0. */
function ticksNaoNegativos(min: number, max: number) {
  const t = ticks(Math.max(0, min), max);
  return t[0] < 0 ? t.filter((x) => x >= 0) : t;
}

/**
 * Uma série (sem legenda — o título nomeia o parâmetro). Linha 2px, área
 * a 10%, ponto final r=4 com anel de 2px da cor da superfície, rótulo só
 * no último valor, grelha hairline recessiva, banda de referência neutra.
 * Toque/arrasto: crosshair que encaixa no ponto mais próximo + tooltip.
 */
export function GraficoParametro({ pontos, info }: { pontos: Ponto[]; info: InfoParametro }) {
  const ref = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  const [ativo, setAtivo] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    if (!largura || pontos.length === 0) return null;
    const vs = pontos.map((p) => p.v);
    const [r0, r1] = info.referencia;
    const yt = ticksNaoNegativos(Math.min(...vs, r0), Math.max(...vs, Math.min(r1, Math.max(...vs) * 1.5)));
    const yMin = yt[0];
    const yMax = yt.at(-1)!;
    const t0 = pontos[0].t;
    const t1 = pontos.at(-1)!.t;
    const w = largura - M.left - M.right;
    const h = ALTURA - M.top - M.bottom;
    const x = (t: number) => M.left + (t1 === t0 ? w / 2 : ((t - t0) / (t1 - t0)) * w);
    const y = (v: number) => M.top + h - ((v - yMin) / (yMax - yMin || 1)) * h;
    const xy = pontos.map((p) => [x(p.t), y(p.v)] as const);
    const linha = xy.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join("");
    const area = `${linha}L${xy.at(-1)![0].toFixed(1)},${M.top + h}L${xy[0][0].toFixed(1)},${M.top + h}Z`;
    const banda = { y: y(Math.min(r1, yMax)), h: Math.max(0, y(Math.max(r0, yMin)) - y(Math.min(r1, yMax))) };
    return { yt, x, y, xy, linha, area, banda, w, h };
  }, [largura, pontos, info.referencia]);

  function tocar(clientX: number) {
    if (!geo || !ref.current) return;
    const px = clientX - ref.current.getBoundingClientRect().left;
    let melhor = 0;
    geo.xy.forEach(([x], i) => {
      if (Math.abs(x - px) < Math.abs(geo.xy[melhor][0] - px)) melhor = i;
    });
    setAtivo(melhor);
  }

  const ultimo = pontos.at(-1);
  const sel = ativo !== null ? pontos[ativo] : null;
  const fmt = (v: number) => `${num(v, info.decimais)}${info.unidade ? ` ${info.unidade}` : ""}`;

  return (
    <div
      ref={ref}
      className="relative touch-pan-y select-none"
      style={{ height: ALTURA }}
      onPointerDown={(e) => tocar(e.clientX)}
      onPointerMove={(e) => (e.pointerType !== "mouse" || e.buttons || ativo !== null) && tocar(e.clientX)}
      onPointerLeave={() => setAtivo(null)}
      onPointerUp={(e) => e.pointerType !== "mouse" && setTimeout(() => setAtivo(null), 1600)}
      role="img"
      aria-label={`${info.nome}: ${pontos.length} medições, última ${ultimo ? fmt(ultimo.v) : "—"}.`}
    >
      {geo && (
        <svg width={largura} height={ALTURA} className="block overflow-visible">
          {/* banda de referência (neutra, nunca cor de estado) */}
          <rect x={M.left} width={geo.w} y={geo.banda.y} height={geo.banda.h} fill="var(--chart-band)" rx={4} />
          {/* grelha + eixo Y à direita */}
          {geo.yt.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={M.left + geo.w} y1={geo.y(t)} y2={geo.y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={M.left + geo.w + 6} y={geo.y(t)} dy="0.32em" fontSize={11} fill="var(--text-3)" className="tabular-nums">
                {num(t, 2)}
              </text>
            </g>
          ))}
          {/* eixo X: primeira e última data */}
          <text x={M.left} y={ALTURA - 6} fontSize={11} fill="var(--text-3)">
            {dataCurta(pontos[0].data)}
          </text>
          {pontos.length > 1 && (
            <text x={M.left + geo.w} y={ALTURA - 6} fontSize={11} fill="var(--text-3)" textAnchor="end">
              {dataCurta(pontos.at(-1)!.data)}
            </text>
          )}
          <path d={geo.area} fill="var(--chart-wash)" className="grafico-area" />
          <path
            d={geo.linha}
            fill="none"
            stroke="var(--chart-series)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            className="grafico-linha"
          />
          {/* pontos pequenos quando há poucas medições */}
          {pontos.length <= 16 &&
            geo.xy.slice(0, -1).map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={3} fill="var(--chart-series)" stroke="var(--surface)" strokeWidth={2} />
            ))}
          {/* ponto final + rótulo do último valor (texto em token de texto) */}
          <circle cx={geo.xy.at(-1)![0]} cy={geo.xy.at(-1)![1]} r={4.5} fill="var(--chart-series)" stroke="var(--surface)" strokeWidth={2} />
          {ultimo && ativo === null && (
            <text
              x={Math.min(geo.xy.at(-1)![0], M.left + geo.w)}
              y={geo.xy.at(-1)![1] - 12}
              textAnchor={pontos.length > 1 ? "end" : "middle"}
              fontSize={13}
              fontWeight={600}
              fill="var(--text)"
              className="tabular-nums"
            >
              {num(ultimo.v, info.decimais)}
            </text>
          )}
          {/* crosshair */}
          {ativo !== null && (
            <g>
              <line
                x1={geo.xy[ativo][0]}
                x2={geo.xy[ativo][0]}
                y1={M.top - 8}
                y2={M.top + geo.h}
                stroke="var(--text-3)"
                strokeWidth={1}
              />
              <circle cx={geo.xy[ativo][0]} cy={geo.xy[ativo][1]} r={5} fill="var(--chart-series)" stroke="var(--surface)" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {sel && geo && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-text px-2.5 py-1 text-[13px] text-bg shadow-lg transition-[left] duration-[var(--dur-quick)] ease-[var(--ease-out)]"
          style={{ left: Math.max(56, Math.min(largura - 56, geo.xy[ativo!][0])) }}
        >
          <span className="font-semibold tabular-nums">{fmt(sel.v)}</span>
          <span className="ml-1.5 opacity-70">{dataCurta(sel.data)}</span>
        </div>
      )}
    </div>
  );
}
