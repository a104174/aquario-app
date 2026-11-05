import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Aquário — diário dos aquários",
    short_name: "Aquário",
    description: "Diário pessoal dos meus aquários: TPAs, medições, fauna e fotos.",
    lang: "pt-PT",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Iguais ao fundo da app (modo escuro, que é também o do header),
    // para não haver flash entre a splash e o primeiro frame.
    background_color: "#071219",
    theme_color: "#071219",
    categories: ["lifestyle", "utilities"],
    icons: [
      { src: "/icons/manifest-icon-192.maskable.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/manifest-icon-192.maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/manifest-icon-512.maskable.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/manifest-icon-512.maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
