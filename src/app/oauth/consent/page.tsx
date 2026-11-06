import { Suspense } from "react";
import { Consentimento } from "./consentimento";

export const metadata = { title: "Autorizar acesso · Aquário" };

export default function Page() {
  return (
    <Suspense>
      <Consentimento />
    </Suspense>
  );
}
