"use client";

export type ImagemProcessada = { foto: Blob; thumb: Blob; ext: "webp" | "jpg" };

async function paraBlob(canvas: HTMLCanvasElement, tipo: string, qualidade: number) {
  return new Promise<Blob | null>((r) => canvas.toBlob(r, tipo, qualidade));
}

/**
 * Redimensiona para caber em `maxLado` e codifica em WebP (~0,8).
 * O Safari (iOS) não codifica WebP no canvas — devolve PNG —, por isso
 * nesse caso caímos para JPEG 0,8, que é quase tão leve.
 */
async function codificar(bmp: ImageBitmap, maxLado: number, qualidade: number, forcarJpeg: boolean) {
  const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * escala);
  canvas.height = Math.round(bmp.height * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  if (!forcarJpeg) {
    const webp = await paraBlob(canvas, "image/webp", qualidade);
    if (webp?.type === "image/webp") return webp;
  }
  const jpg = await paraBlob(canvas, "image/jpeg", qualidade);
  if (!jpg) throw new Error("toBlob");
  return jpg;
}

/** Foto (máx. 1600 px) + miniatura (480 px) para a galeria. */
export async function processarImagem(ficheiro: Blob): Promise<ImagemProcessada> {
  const bmp = await createImageBitmap(ficheiro, { imageOrientation: "from-image" });
  try {
    const foto = await codificar(bmp, 1600, 0.8, false);
    const jpeg = foto.type !== "image/webp";
    const thumb = await codificar(bmp, 480, 0.72, jpeg);
    return { foto, thumb, ext: jpeg ? "jpg" : "webp" };
  } finally {
    bmp.close();
  }
}

/** Lê uma imagem da área de transferência (botão "Colar print"). */
export async function lerImagemColada(): Promise<Blob | null> {
  if (!navigator.clipboard?.read) return null;
  const itens = await navigator.clipboard.read();
  for (const item of itens) {
    const tipo = item.types.find((t) => t.startsWith("image/"));
    if (tipo) return item.getType(tipo);
  }
  return null;
}
