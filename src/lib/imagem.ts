"use client";

/**
 * Reduz a foto (as do iPhone têm 12–48 MP) para no máximo 2048 px no lado
 * maior, em JPEG 0,85. Mantém a orientação EXIF (createImageBitmap aplica-a).
 */
export async function comprimirImagem(ficheiro: File, maxLado = 2048, qualidade = 0.85): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(ficheiro, { imageOrientation: "from-image" });
    const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * escala);
    const h = Math.round(bmp.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return ficheiro;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", qualidade));
    return blob ?? ficheiro;
  } catch {
    return ficheiro;
  }
}
