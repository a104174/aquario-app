import { Suspense } from "react";
import { LoginFlow } from "./login-flow";

export const metadata = { title: "Entrar · Aquário" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginFlow />
    </Suspense>
  );
}
