/**
 * Tipo de animal para o desenho de fallback (sem fotografia), deduzido
 * apenas do nome da espécie. Sem correspondência clara → indefinido
 * (o fallback usa o desenho genérico, não adivinha).
 */
export function tipoFaunaPorNome(especie: string): "peixe" | "camarao" | "caracol" | undefined {
  const n = especie.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (/camarao|neocaridina|caridina|shrimp|cherry/.test(n)) return "camarao";
  if (/caracol|neritina|planorbis|ampularia|helena|snail|clithon|melanoides/.test(n)) return "caracol";
  if (/peixe|betta|neon|guppy|guppie|corydora|platy|molly|tetra|rasbora|danio|otocinclus|ancistrus|cascudo|endler|kinguio|barbo|gourami|killi|apistogramma|escalar|ramirezi|plecostomus/.test(n)) return "peixe";
  return undefined;
}
