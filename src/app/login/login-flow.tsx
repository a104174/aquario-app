"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { IconChevronEsquerda, IconVisto } from "@/components/icons";
import { useSession } from "@/lib/auth/session";
import { supabase } from "@/lib/supabase/client";

type Passo = "email" | "codigo" | "ok";

const EMAIL_KEY = "aquario-ultimo-email";

export function LoginFlow() {
  const router = useRouter();
  const voltarParam = useSearchParams().get("voltar");
  // Só caminhos internos (evita redirecionamentos abertos)
  const destino = voltarParam && voltarParam.startsWith("/") && !voltarParam.startsWith("//") ? voltarParam : "/";
  const { session, pronto } = useSession();
  const [passo, setPasso] = useState<Passo>("email");
  const [direcao, setDirecao] = useState<"forward" | "back">("forward");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroKey, setErroKey] = useState(0);

  useEffect(() => {
    try {
      const e = localStorage.getItem(EMAIL_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (e) setEmail(e);
    } catch {}
  }, []);

  useEffect(() => {
    if (pronto && session && passo !== "ok") router.replace(destino);
  }, [pronto, session, passo, router, destino]);

  function falhar(msg: string) {
    setErro(msg);
    setErroKey((k) => k + 1);
  }

  async function enviarCodigo(e?: React.FormEvent) {
    e?.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(em)) return falhar("Escreve um email válido.");
    setAEnviar(true);
    setErro(null);
    const { error } = await supabase().auth.signInWithOtp({ email: em, options: { shouldCreateUser: true } });
    setAEnviar(false);
    if (error) return falhar(traduzirErro(error.message));
    try {
      localStorage.setItem(EMAIL_KEY, em);
    } catch {}
    setDirecao("forward");
    setCodigo("");
    setPasso("codigo");
  }

  async function verificar(token: string) {
    setAEnviar(true);
    setErro(null);
    const { error } = await supabase().auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "email" });
    setAEnviar(false);
    if (error) {
      setCodigo("");
      return falhar("Código inválido ou expirado.");
    }
    setPasso("ok");
    // Deixa o "visto" assentar (pop 280ms) antes de entrar na app.
    setTimeout(() => router.replace(destino, { transitionTypes: ["nav-forward"] }), 520);
  }

  return (
    <div className="altura-app flex flex-col">
      {/* Hero: zona por trás da status bar sempre escura (texto branco) */}
      <div className="header-ambient relative flex min-h-0 flex-1 flex-col items-center justify-end overflow-hidden px-6 pb-10 pt-[calc(var(--safe-top)+24px)] text-white">
        <svg viewBox="0 0 520 300" className="hero-login-icone enter-up mb-5 w-24" aria-hidden>
          <path
            d="M20 150 C 100 0, 320 -20, 420 110 L 500 40 C 488 110, 488 190, 500 260 L 420 190 C 320 320, 100 300, 20 150 Z"
            fill="#5fd6e6"
          />
          <circle cx="130" cy="125" r="22" fill="#05141d" />
        </svg>
        <h1 className="enter-up text-[34px] font-bold tracking-tight" style={{ ["--i" as string]: 1 }}>
          Aquário
        </h1>
        <p className="enter-up mt-1 text-[15px] text-white/70" style={{ ["--i" as string]: 2 }}>
          O diário dos teus aquários
        </p>
      </div>

      <div className="relative bg-bg px-5 pb-[calc(var(--safe-bottom)+24px)] pt-6">
        {passo === "email" && (
          <form key="email" onSubmit={enviarCodigo} className={direcao === "forward" ? "step-forward" : "step-back"}>
            <label htmlFor="email" className="mb-2 block text-[13px] font-medium uppercase tracking-wide text-text-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              enterKeyHint="send"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="eu@exemplo.pt"
              className="h-[52px] w-full rounded-[14px] bg-surface px-4 text-[17px] outline-none ring-accent focus:ring-2"
            />
            <MensagemErro key={erroKey} texto={erro} />
            <Button type="submit" block loading={aEnviar} className="mt-4">
              {aEnviar ? "A enviar…" : "Enviar código"}
            </Button>
            <p className="mt-3 text-center text-[13px] text-text-3">
              Vais receber um código de 6 dígitos por email.
            </p>
          </form>
        )}

        {passo === "codigo" && (
          <div key="codigo" className="step-forward">
            <button
              type="button"
              onClick={() => {
                setDirecao("back");
                setErro(null);
                setPasso("email");
              }}
              className="pressable -ml-2 mb-2 flex min-h-11 items-center gap-1 rounded-lg px-2 text-[15px] text-accent"
            >
              <IconChevronEsquerda size={18} /> Alterar email
            </button>
            <p className="mb-4 text-[15px] text-text-2">
              Enviámos um código para <span className="font-semibold text-text">{email}</span>.
            </p>
            <OtpInput
              key={erroKey}
              value={codigo}
              onChange={setCodigo}
              onComplete={verificar}
              erro={!!erro}
              disabled={aEnviar}
            />
            <MensagemErro texto={erro} />
            <Button variant="ghost" block className="mt-3" onClick={() => enviarCodigo()} disabled={aEnviar}>
              Reenviar código
            </Button>
          </div>
        )}

        {passo === "ok" && (
          <div key="ok" className="flex h-[188px] flex-col items-center justify-center">
            <div className="pop-in flex h-16 w-16 items-center justify-center rounded-full bg-ok text-white">
              <IconVisto size={34} strokeWidth={2.6} />
            </div>
            <p className="enter-up mt-3 font-semibold" style={{ ["--i" as string]: 2 }}>
              Sessão iniciada
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MensagemErro({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="enter-up mt-2 text-[14px] text-danger">
      {texto}
    </p>
  );
}

function traduzirErro(msg: string) {
  if (/rate limit|security purposes|seconds/i.test(msg)) return "Espera uns segundos antes de pedir outro código.";
  if (/signups not allowed/i.test(msg)) return "Este email não tem acesso.";
  if (/fetch|network/i.test(msg)) return "Sem ligação. Tenta outra vez quando estiveres online.";
  return "Não foi possível enviar o código.";
}
