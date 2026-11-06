import type { EtiquetaFoto } from "./tipos";

export const ETIQUETAS: { valor: EtiquetaFoto; texto: string }[] = [
  { valor: "peixes", texto: "Peixes" },
  { valor: "plantas", texto: "Plantas" },
  { valor: "maternidade", texto: "Maternidade" },
  { valor: "outro", texto: "Outro" },
];

export const NOME_ETIQUETA: Record<EtiquetaFoto, string> = {
  peixes: "Peixes",
  plantas: "Plantas",
  maternidade: "Maternidade",
  outro: "Outro",
};

/** {aquario_id}/AAAA/MM/{uuid}.{ext} — e a miniatura ao lado. */
export function caminhosFoto(aquarioId: string, id: string, data: Date, ext: string) {
  const aaaa = data.getFullYear();
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  const base = `${aquarioId}/${aaaa}/${mm}/${id}`;
  return { storage_path: `${base}.${ext}`, thumb_path: `${base}.thumb.${ext}` };
}
