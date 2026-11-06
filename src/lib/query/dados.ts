"use client";

import {
  QueryClient,
  useMutation,
  useQuery,
  type MutationKey,
} from "@tanstack/react-query";
import { useUserId } from "@/lib/auth/session";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import type { Aquario, Condicionador, Definicoes, FaunaEvento, Foto, Medicao, Tpa } from "@/lib/tipos";
import { apagarFotoPendente, chaveThumb, lerFotoPendente, semearCacheFoto } from "./fotos-locais";
import { qk, TABELAS, type Colecao } from "./keys";

export type Linhas = {
  aquarios: Aquario;
  condicionadores: Condicionador;
  tpas: Tpa;
  medicoes: Medicao;
  fauna: FaunaEvento;
  fotos: Foto;
};

type Acao = "guardar" | "apagar";
type VarsApagar = { id: string };

const COLECOES: Colecao[] = ["aquarios", "condicionadores", "tpas", "medicoes", "fauna", "fotos"];

const ordenar: { [C in Colecao]: (a: Linhas[C], b: Linhas[C]) => number } = {
  aquarios: (a, b) => a.criado_em.localeCompare(b.criado_em),
  condicionadores: (a, b) => a.criado_em.localeCompare(b.criado_em),
  tpas: porDataDesc,
  medicoes: porDataDesc,
  fauna: porDataDesc,
  fotos: porDataDesc,
};

function porDataDesc(a: { data: string }, b: { data: string }) {
  return b.data.localeCompare(a.data);
}

// ---------------------------------------------------------------------
//  Leitura
// ---------------------------------------------------------------------
async function buscar<C extends Colecao>(c: C): Promise<Linhas[C][]> {
  const tabela = TABELAS[c];
  const ordem = c === "aquarios" || c === "condicionadores" ? "criado_em" : "data";
  const { data, error } = await supabase()
    .from(tabela)
    .select("*")
    .order(ordem, { ascending: ordem === "criado_em" });
  if (error) throw error;
  return (data ?? []) as Linhas[C][];
}

// ---------------------------------------------------------------------
//  Otimismo: aplicar uma mutação a uma lista em cache
// ---------------------------------------------------------------------
function aplicar<C extends Colecao>(c: C, lista: Linhas[C][], acao: Acao, vars: unknown): Linhas[C][] {
  if (acao === "apagar") {
    const { id } = vars as VarsApagar;
    return lista.filter((r) => r.id !== id);
  }
  const linha = vars as Linhas[C];
  const i = lista.findIndex((r) => r.id === linha.id);
  const nova = i === -1 ? [...lista, linha] : lista.map((r) => (r.id === linha.id ? { ...r, ...linha } : r));
  return nova.sort(ordenar[c] as (a: Linhas[C], b: Linhas[C]) => number);
}

/**
 * Local-first: depois de cada fetch voltamos a aplicar as mutações que
 * ainda não chegaram ao servidor (ex.: feitas offline), para os dados
 * otimistas nunca "desaparecerem" num refetch.
 */
function aplicarPendentes<C extends Colecao>(qc: QueryClient, c: C, linhas: Linhas[C][]) {
  const pendentes = qc
    .getMutationCache()
    .findAll({ mutationKey: [c], status: "pending" })
    .sort((a, b) => a.state.submittedAt - b.state.submittedAt);
  return pendentes.reduce(
    (acc, m) => aplicar(c, acc, (m.options.mutationKey as MutationKey)[1] as Acao, m.state.variables),
    linhas,
  );
}

// ---------------------------------------------------------------------
//  Escrita (servidor)
// ---------------------------------------------------------------------
function semCamposLocais<T extends object>(linha: T) {
  // dose_ml é calculada por trigger; criado_em tem default
  const copia = { ...linha } as Record<string, unknown>;
  delete copia.dose_ml;
  return copia;
}

async function guardarNoServidor<C extends Colecao>(c: C, linha: Linhas[C]) {
  if (c === "fotos") {
    const foto = linha as Foto;
    const blob = await lerFotoPendente(foto.id);
    const thumb = foto.thumb_path ? await lerFotoPendente(chaveThumb(foto.id)) : undefined;
    const enviar = async (path: string, b: Blob) => {
      const { error } = await supabase()
        .storage.from("fotos")
        .upload(path, b, { upsert: true, contentType: b.type || "image/jpeg", cacheControl: "31536000" });
      if (error) throw error;
    };
    if (blob) await enviar(foto.storage_path, blob);
    if (thumb && foto.thumb_path) await enviar(foto.thumb_path, thumb);
    const { error } = await supabase().from("fotos").upsert(semCamposLocais(foto));
    if (error) throw error;
    if (blob) await semearCacheFoto(foto.storage_path, blob);
    if (thumb && foto.thumb_path) await semearCacheFoto(foto.thumb_path, thumb);
    if (blob || thumb) await apagarFotoPendente(foto.id);
    return;
  }
  const { error } = await supabase().from(TABELAS[c]).upsert(semCamposLocais(linha));
  if (error) throw error;
}

async function apagarNoServidor(c: Colecao, { id }: VarsApagar, qc: QueryClient) {
  if (c === "fotos") {
    const foto = qc.getQueryData<Foto[]>([c])?.find((f) => f.id === id);
    await apagarFotoPendente(id);
    const { data, error } = await supabase().from("fotos").delete().eq("id", id).select("storage_path, thumb_path");
    if (error) throw error;
    const linha = data?.[0] ?? foto;
    const paths = [linha?.storage_path, linha?.thumb_path].filter(Boolean) as string[];
    if (paths.length) await supabase().storage.from("fotos").remove(paths);
    return;
  }
  const { error } = await supabase().from(TABELAS[c]).delete().eq("id", id);
  if (error) throw error;
}

function eErroDeRede(e: unknown) {
  const msg = String((e as { message?: string })?.message ?? e);
  return /fetch|network|load failed|offline|timeout/i.test(msg);
}

// ---------------------------------------------------------------------
//  QueryClient com defaults de mutação registados (necessário para
//  retomar mutações persistidas depois de a app reabrir)
// ---------------------------------------------------------------------
export function criarQueryClient() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: "offlineFirst",
        staleTime: 30_000,
        // Infinity: nunca recolher (a idade é limitada pelo maxAge do persister).
        // Atenção: valores > 2^31 ms (~24,8 dias) fazem o setTimeout disparar logo.
        gcTime: Infinity,
        retry: (n, e) => eErroDeRede(e) && n < 2,
        refetchOnWindowFocus: true,
      },
      mutations: {
        networkMode: "online",
        retry: (n, e) => eErroDeRede(e) && n < 3,
      },
    },
  });

  for (const c of COLECOES) {
    qc.setQueryDefaults([c], {
      queryFn: async () => aplicarPendentes(qc, c, await buscar(c)),
    });

    for (const acao of ["guardar", "apagar"] as const) {
      qc.setMutationDefaults([c, acao], {
        mutationFn: async (vars: unknown) =>
          acao === "guardar"
            ? guardarNoServidor(c, vars as Linhas[typeof c])
            : apagarNoServidor(c, vars as VarsApagar, qc),
        onMutate: async (vars: unknown) => {
          await qc.cancelQueries({ queryKey: [c] });
          const anterior = qc.getQueryData<Linhas[typeof c][]>([c]);
          qc.setQueryData<Linhas[typeof c][]>([c], (l) => aplicar(c, l ?? [], acao, vars));
          // Apagar um aquário apaga (em cascata) os seus eventos
          const anteriores: [Colecao, unknown][] = [];
          if (c === "aquarios" && acao === "apagar") {
            const { id } = vars as VarsApagar;
            for (const filho of ["tpas", "medicoes", "fauna", "fotos"] as const) {
              anteriores.push([filho, qc.getQueryData([filho])]);
              qc.setQueryData<{ aquario_id: string }[]>([filho], (l) => l?.filter((r) => r.aquario_id !== id));
            }
          }
          return { anterior, anteriores };
        },
        onError: (erro, _vars, ctx) => {
          const contexto = ctx as { anterior?: unknown; anteriores?: [Colecao, unknown][] } | undefined;
          if (contexto?.anterior !== undefined) qc.setQueryData([c], contexto.anterior);
          contexto?.anteriores?.forEach(([k, v]) => qc.setQueryData([k], v));
          console.error(erro);
          toast("Não foi possível guardar. A alteração foi revertida.", "erro");
        },
        onSettled: () => {
          // Só refaz o fetch quando já não há nada pendente nesta coleção
          if (qc.isMutating({ mutationKey: [c] }) <= 1) void qc.invalidateQueries({ queryKey: [c] });
        },
      });
    }
  }

  qc.setQueryDefaults(qk.definicoes, {
    queryFn: async () => {
      const { data, error } = await supabase().from("definicoes").select("*").maybeSingle();
      if (error) throw error;
      const pendente = qc
        .getMutationCache()
        .findAll({ mutationKey: ["definicoes"], status: "pending" })
        .at(-1)?.state.variables as Partial<Definicoes> | undefined;
      return { ...DEFINICOES_PADRAO, ...(data ?? {}), ...(pendente ?? {}) } as Definicoes;
    },
  });
  qc.setMutationDefaults(["definicoes"], {
    mutationFn: async (vars: Partial<Definicoes>) => {
      const { error } = await supabase()
        .from("definicoes")
        .upsert({ ...vars, atualizado_em: new Date().toISOString() });
      if (error) throw error;
    },
    onMutate: async (vars: Partial<Definicoes>) => {
      await qc.cancelQueries({ queryKey: qk.definicoes });
      const anterior = qc.getQueryData<Definicoes>(qk.definicoes);
      qc.setQueryData<Definicoes>(qk.definicoes, (d) => ({ ...DEFINICOES_PADRAO, ...d, ...vars }) as Definicoes);
      return { anterior };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(qk.definicoes, (ctx as { anterior?: Definicoes })?.anterior);
      toast("Não foi possível guardar as definições.", "erro");
    },
  });

  return qc;
}

export const DEFINICOES_PADRAO: Omit<Definicoes, "user_id"> = {
  intervalo_tpa_dias: 7,
  lembretes_push: false,
  lembretes_email: false,
  lembrete_foto_semanal: true,
};

// ---------------------------------------------------------------------
//  Hooks
// ---------------------------------------------------------------------
export function useColecao<C extends Colecao>(c: C) {
  const userId = useUserId();
  return useQuery<Linhas[C][]>({ queryKey: [c], enabled: !!userId });
}

export function useDefinicoes() {
  const userId = useUserId();
  return useQuery<Definicoes>({ queryKey: qk.definicoes, enabled: !!userId });
}

export function useGuardar<C extends Colecao>(c: C) {
  return useMutation<void, Error, Linhas[C]>({ mutationKey: [c, "guardar"] });
}

export function useApagar(c: Colecao) {
  return useMutation<void, Error, VarsApagar>({ mutationKey: [c, "apagar"] });
}

export function useGuardarDefinicoes() {
  const userId = useUserId();
  const m = useMutation<void, Error, Partial<Definicoes>>({ mutationKey: ["definicoes"] });
  return {
    ...m,
    mutate: (v: Partial<Definicoes>) => m.mutate({ ...v, user_id: userId ?? undefined }),
  };
}

/**
 * URL assinado de uma foto (ou object URL do Blob ainda por enviar).
 * `thumb` usa a miniatura quando existe (galeria); `ativo` permite adiar o
 * pedido até a imagem estar perto do ecrã (lazy loading).
 */
export function useFotoUrl(
  foto: Pick<Foto, "id" | "storage_path"> & { thumb_path?: string | null } | undefined,
  opts: { thumb?: boolean; ativo?: boolean } = {},
) {
  const usarThumb = !!opts.thumb && !!foto?.thumb_path;
  const path = foto ? (usarThumb ? foto.thumb_path! : foto.storage_path) : "";
  return useQuery({
    queryKey: qk.fotoUrl(path),
    enabled: !!foto && opts.ativo !== false,
    staleTime: 1000 * 60 * 50,
    gcTime: 1000 * 60 * 60 * 24,
    networkMode: "always",
    queryFn: async () => {
      const blob = await lerFotoPendente(usarThumb ? chaveThumb(foto!.id) : foto!.id);
      if (blob) return URL.createObjectURL(blob);
      const { data, error } = await supabase().storage.from("fotos").createSignedUrl(path, 60 * 60);
      if (error) {
        // Offline: o SW tem a imagem em cache com a chave sem token
        if (eErroDeRede(error)) return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/sign/fotos/${path}`;
        throw error;
      }
      return data.signedUrl;
    },
  });
}
