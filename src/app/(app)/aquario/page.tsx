import { Suspense } from "react";
import { DetalheAquario, DetalheSkeleton } from "./detalhe";

// /aquario?id=… — uma única página estática (pré-cacheada pelo SW), por isso
// abre offline para qualquer aquário.
export default function AquarioPage() {
  return (
    <Suspense fallback={<DetalheSkeleton />}>
      <DetalheAquario />
    </Suspense>
  );
}
