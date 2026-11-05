// Formatação em português de Portugal.

const fmtMesCurto = new Intl.DateTimeFormat("pt-PT", { month: "short" });
const fmtHora = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" });
const fmtDiaLongo = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" });
const fmtMesAno = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" });

function inicioDoDia(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Dias de calendário entre a data e hoje (0 = hoje). */
export function diasDesde(iso: string, agora = new Date()) {
  const ms = inicioDoDia(agora).getTime() - inicioDoDia(new Date(iso)).getTime();
  return Math.round(ms / 86_400_000);
}

export function textoHaDias(dias: number) {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

/** "5 nov" ou "5 nov 2025" (se não for deste ano). */
export function dataCurta(iso: string) {
  const d = new Date(iso);
  const mes = fmtMesCurto.format(d).replace(".", "");
  const base = `${d.getDate()} ${mes}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export function hora(iso: string) {
  return fmtHora.format(new Date(iso));
}

export function cabecalhoDia(iso: string) {
  const dias = diasDesde(iso);
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Ontem";
  const d = new Date(iso);
  const t = fmtDiaLongo.format(d);
  const txt = d.getFullYear() === new Date().getFullYear() ? t : `${t} de ${d.getFullYear()}`;
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export function mesAno(iso: string) {
  const t = fmtMesAno.format(new Date(iso));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const nf = new Map<number, Intl.NumberFormat>();
export function num(n: number | null | undefined, maxDecimais = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  let f = nf.get(maxDecimais);
  if (!f) {
    f = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: maxDecimais });
    nf.set(maxDecimais, f);
  }
  return f.format(n);
}

/** Aceita "7,2" ou "7.2". Devolve null para vazio/inválido. */
export function lerNumero(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Valor para <input type="datetime-local"> na hora local. */
export function paraInputLocal(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function deInputLocal(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function plural(n: number, um: string, varios: string) {
  return `${num(n, 0)} ${n === 1 ? um : varios}`;
}
