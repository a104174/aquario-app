import type { SupabaseClient } from "@supabase/supabase-js";
import type { EtiquetaFoto, Foto } from "@/lib/tipos";
import { aquarios, COL_FOTO, ErroConsulta, pagina, paginar, q, textoDado, type Cursor, type Periodo } from "./consultas";

type FotoMeta = Omit<Foto, "storage_path" | "thumb_path">;
const URL_MINUTOS = 10;
const MAX_ORIGEM = 5 * 1024 * 1024;
const MAX_JPEG = 512 * 1024;

export function metadadosFoto(foto: FotoMeta) {
  const { id, aquario_id, data, etiqueta, legenda, evento_tipo, evento_id } = foto;
  return { id, aquario_id, data, etiqueta, legenda: textoDado(legenda), ligada_a: evento_tipo, evento_id };
}

export async function listarFotos(sb: SupabaseClient, args: {
  aquario?: string; periodo: Periodo; limite: number; cursor?: Cursor;
  etiqueta?: EtiquetaFoto; evento_id?: string; modo: "urls" | "metadados"; ordem: "asc" | "desc";
}) {
  const aqs = await aquarios(sb, args.aquario);
  const colunas = args.modo === "urls" ? `${COL_FOTO},storage_path` : COL_FOTO;
  const fotos = aqs.length ? await pagina<Foto>(sb, "fotos", colunas, {
    ...args,
    filtrar: (consulta) => {
      consulta = consulta.in("aquario_id", aqs.map((a) => a.id));
      if (args.etiqueta) consulta = consulta.eq("etiqueta", args.etiqueta);
      if (args.evento_id) consulta = consulta.eq("evento_id", args.evento_id);
      return consulta;
    },
  }) : [];
  const paginaFotos = paginar(fotos, args.limite, args.periodo);
  const nomes = new Map(aqs.map((a) => [a.id, a.nome]));
  const itens = paginaFotos.itens.map((f) => ({ ...metadadosFoto(f), aquario: nomes.get(f.aquario_id) ?? null }));
  if (args.modo === "metadados") return { ...paginaFotos, itens };

  if (!itens.length) return [];
  const { data: urls } = await sb.storage.from("fotos")
    .createSignedUrls(paginaFotos.itens.map((f) => f.storage_path), URL_MINUTOS * 60);
  const porCaminho = new Map(urls?.map((url) => [url.path, url.signedUrl]));
  return itens.map((item, i) => ({
    ...item, url: porCaminho.get(paginaFotos.itens[i].storage_path) ?? null, url_expira_em_minutos: URL_MINUTOS,
  }));
}

function caminhoPermitido(caminho: string, foto: Foto, utilizador: string) {
  const segmentos = caminho.split("/");
  return segmentos.length > 1 && [foto.aquario_id, utilizador].includes(segmentos[0])
    && segmentos.every((parte) => /^[a-z0-9._-]+$/i.test(parte) && parte !== "." && parte !== "..");
}

async function descarregar(sb: SupabaseClient, caminho: string) {
  const { data, error } = await sb.storage.from("fotos").download(caminho).asStream();
  if (error || !data) throw new Error("Objeto indisponível");
  const leitor = data.getReader();
  const partes: Uint8Array[] = [];
  let tamanho = 0;
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      tamanho += value.byteLength;
      if (tamanho > MAX_ORIGEM) {
        await leitor.cancel();
        throw new Error("Objeto demasiado grande");
      }
      partes.push(value);
    }
  } finally {
    leitor.releaseLock();
  }
  return Buffer.concat(partes, tamanho);
}

async function prepararJpeg(bytes: Buffer, lado: number) {
  const { default: sharp } = await import("sharp");
  const imagem = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "error" });
  const { format } = await imagem.metadata();
  if (!format || !["jpeg", "png", "webp", "heif"].includes(format)) throw new Error("Formato indisponível");

  for (const [dimensao, qualidade] of [[lado, 82], [Math.min(lado, 800), 65]] as const) {
    const resultado = await imagem.clone().autoOrient()
      .resize(dimensao, dimensao, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: qualidade })
      .toBuffer({ resolveWithObject: true });
    if (resultado.data.length <= MAX_JPEG) return resultado;
  }
  throw new Error("Imagem demasiado grande");
}

export async function conteudoFoto(sb: SupabaseClient, utilizador: string, id: string, tamanho: "analise" | "miniatura") {
  const foto = await q<Foto | null>(sb.from("fotos").select(`${COL_FOTO},storage_path,thumb_path`).eq("id", id).maybeSingle());
  if (!foto) throw new ErroConsulta("Fotografia não encontrada ou sem acesso.");

  const caminhos = tamanho === "miniatura"
    ? [foto.thumb_path, foto.storage_path]
    : [foto.storage_path, foto.thumb_path];
  for (const caminho of new Set(caminhos)) {
    if (!caminho || !caminhoPermitido(caminho, foto, utilizador)) continue;
    try {
      const imagem = await prepararJpeg(await descarregar(sb, caminho), tamanho === "miniatura" ? 480 : 1280);
      return {
        foto: { ...metadadosFoto(foto), largura: imagem.info.width, altura: imagem.info.height, bytes: imagem.data.length,
          versao_origem: caminho === foto.thumb_path ? "miniatura" : "foto" },
        imagem: { type: "image" as const, mimeType: "image/jpeg", data: imagem.data.toString("base64") },
      };
    } catch {
      // Fotos antigas podem estar indisponíveis ou num formato que o servidor não decodifica.
    }
  }
  throw new ErroConsulta("Conteúdo visual indisponível para esta fotografia.");
}
