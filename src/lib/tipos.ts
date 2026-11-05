// Tipos de domínio (espelham supabase/migrations).

export type UUID = string;

export interface Definicoes {
  user_id: UUID;
  intervalo_tpa_dias: number;
  lembretes_push: boolean;
  lembretes_email: boolean;
}

export interface Aquario {
  id: UUID;
  nome: string;
  volume_bruto_l: number | null;
  volume_util_l: number | null;
  notas: string | null;
  criado_em: string;
}

export interface Condicionador {
  id: UUID;
  nome: string;
  dose_ml_por_litro: number;
  criado_em: string;
}

export interface Tpa {
  id: UUID;
  aquario_id: UUID;
  data: string;
  litros: number;
  condicionador_id: UUID | null;
  dose_ml: number | null;
  notas: string | null;
}

export type MetodoMedicao = "gotas" | "tira";

export const PARAMETROS = ["nh3_nh4", "no2", "no3", "ph", "gh", "kh", "temperatura_c"] as const;
export type Parametro = (typeof PARAMETROS)[number];

export interface Medicao extends Partial<Record<Parametro, number | null>> {
  id: UUID;
  aquario_id: UUID;
  data: string;
  metodo: MetodoMedicao | null;
  notas: string | null;
}

export type TipoFauna = "entrada" | "nascimento" | "morte" | "transferencia" | "saida";

export interface FaunaEvento {
  id: UUID;
  aquario_id: UUID;
  data: string;
  tipo: TipoFauna;
  especie: string;
  quantidade: number;
  aquario_destino_id: UUID | null;
  notas: string | null;
}

export interface Foto {
  id: UUID;
  aquario_id: UUID;
  data: string;
  storage_path: string;
  legenda: string | null;
}

/** Evento unificado para timelines e histórico. */
export type Evento =
  | { tipo: "tpa"; id: UUID; aquario_id: UUID; data: string; item: Tpa }
  | { tipo: "medicao"; id: UUID; aquario_id: UUID; data: string; item: Medicao }
  | { tipo: "fauna"; id: UUID; aquario_id: UUID; data: string; item: FaunaEvento }
  | { tipo: "foto"; id: UUID; aquario_id: UUID; data: string; item: Foto };
