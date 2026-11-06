// Tipos de domínio (espelham supabase/migrations).

export type UUID = string;

export interface Definicoes {
  user_id: UUID;
  intervalo_tpa_dias: number;
  lembretes_push: boolean;
  lembretes_email: boolean;
  lembrete_foto_semanal: boolean;
  aviso_tpa_urgente_dias: number;
  lembrete_esponja: boolean;
}

export interface Aquario {
  id: UUID;
  nome: string;
  volume_bruto_l: number | null;
  volume_util_l: number | null;
  notas: string | null;
  criado_em: string;
}

export type TipoProduto = "condicionador" | "comida" | "bacterias" | "outro";
export type Unidade = "ml" | "g" | "unid";

export interface Produto {
  id: UUID;
  nome: string;
  tipo: TipoProduto;
  /** ml (ou g) por litro de água — usado nos condicionadores */
  dose_por_litro: number | null;
  volume_inicial: number | null;
  unidade: Unidade;
  data_abertura: string | null; // AAAA-MM-DD
  duracao_dias: number | null;
  ativo: boolean;
  criado_em: string;
}

/** @deprecated usar Produto (tipo "condicionador") */
export type Condicionador = Produto;

export type EstadoNinhada = "ativa" | "separada" | "encerrada";
export interface Ninhada {
  id: UUID;
  aquario_id: UUID;
  mae: string;
  data_parto: string; // AAAA-MM-DD
  notas: string | null;
  estado: EstadoNinhada;
  criado_em: string;
}

export type ItemChecklist = { texto: string; feito: boolean };
export interface Ferias {
  id: UUID;
  ida: string; // AAAA-MM-DD
  regresso: string;
  quem_alimenta: string | null;
  notas: string | null;
  checklist: ItemChecklist[];
  criado_em: string;
}

export interface Desejo {
  id: UUID;
  item: string;
  foto_path: string | null;
  thumb_path: string | null;
  link: string | null;
  loja: string | null;
  preco: number | null;
  notas: string | null;
  estado: "quero" | "comprado";
  criado_em: string;
}

export interface Alerta {
  id: UUID;
  tipo: string;
  titulo: string;
  mensagem: string;
  url: string | null;
  lido: boolean;
  criado_em: string;
  canal: "push" | "email" | "app" | null;
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

export type EtiquetaFoto = "plantas" | "peixes" | "maternidade" | "outro";
export type TipoEventoFoto = "tpa" | "medicao" | "fauna";

export interface Foto {
  id: UUID;
  aquario_id: UUID;
  data: string;
  storage_path: string;
  thumb_path: string | null;
  etiqueta: EtiquetaFoto;
  legenda: string | null;
  evento_tipo: TipoEventoFoto | null;
  evento_id: UUID | null;
}

/** Evento unificado para timelines e histórico. */
export type Evento =
  | { tipo: "tpa"; id: UUID; aquario_id: UUID; data: string; item: Tpa }
  | { tipo: "medicao"; id: UUID; aquario_id: UUID; data: string; item: Medicao }
  | { tipo: "fauna"; id: UUID; aquario_id: UUID; data: string; item: FaunaEvento }
  | { tipo: "foto"; id: UUID; aquario_id: UUID; data: string; item: Foto };

export type TipoFonte = "meteo" | "eredes" | "agere_avisos" | "agere_qualidade" | "loja";
export interface FonteExterna {
  id: UUID;
  tipo: TipoFonte;
  nome: string;
  url: string | null;
  configuracao: Record<string, unknown>;
  ativo: boolean;
  ultima_verificacao: string | null;
  ultimo_erro: string | null;
  resultado: Record<string, unknown> | null;
  criado_em: string;
}

export interface NovidadeExterna {
  id: UUID;
  fonte_id: UUID;
  titulo: string;
  url: string | null;
  resumo: string | null;
  detectado_em: string;
}
