"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FotoImg } from "@/components/eventos/foto-img";
import { BotaoSheet, Sheet } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase/client";
import { dataCurta } from "@/lib/formato";
import type { Aquario, Foto } from "@/lib/tipos";

export function CapaAquarioSheet({ aquario, fotos, onFechar }: { aquario: Aquario; fotos: Foto[]; onFechar: () => void }) {
  const qc = useQueryClient();
  const [erro, setErro] = useState(false);
  const guardar = useMutation({
    networkMode: "always",
    retry: false,
    mutationFn: async (fotoId: string | null) => {
      const { error } = await (await supabase()).from("aquarios").update({ foto_capa_id: fotoId }).eq("id", aquario.id).select("id").single();
      if (error) throw error;
      return fotoId;
    },
    onSuccess: async (fotoId) => {
      await qc.cancelQueries({ queryKey: ["aquarios"] });
      qc.setQueryData<Aquario[]>(["aquarios"], (lista) => lista?.map((a) => a.id === aquario.id ? { ...a, foto_capa_id: fotoId } : a));
      void qc.invalidateQueries({ queryKey: ["aquarios"] });
      onFechar();
    },
    onError: () => setErro(true),
  });

  function escolher(fotoId: string | null) {
    if (guardar.isPending) return;
    setErro(false);
    guardar.mutate(fotoId);
  }

  return (
    <Sheet open onOpenChange={(aberto) => { if (!aberto && !guardar.isPending) onFechar(); }} titulo="Capa do aquário"
      esquerda={<BotaoSheet onClick={() => { if (!guardar.isPending) onFechar(); }}>Cancelar</BotaoSheet>}>
      <p className="mb-3 px-1 text-subhead text-text-2">Escolhe uma foto da galeria ou usa sempre a mais recente.</p>
      {guardar.isPending && <p role="status" className="mb-2 text-accent">A guardar a capa…</p>}
      {erro && <p role="alert" className="mb-2 text-danger">Não foi possível guardar a capa. Verifica a ligação e tenta novamente.</p>}
      <button type="button" onClick={() => escolher(null)} disabled={guardar.isPending}
        aria-pressed={!aquario.foto_capa_id} className="pressable mb-3 min-h-11 w-full rounded-xl bg-surface px-3 text-left text-subhead font-semibold aria-pressed:text-accent">
        Usar a fotografia mais recente {!aquario.foto_capa_id && "✓"}
      </button>
      <div className="grid grid-cols-3 gap-2">
        {fotos.map((foto, i) => (
          <button key={foto.id} type="button" disabled={guardar.isPending} aria-label={`Usar fotografia ${i + 1} como capa · ${foto.legenda ?? dataCurta(foto.data)}`}
            aria-pressed={foto.id === aquario.foto_capa_id} onClick={() => escolher(foto.id)}
            className="pressable relative aspect-square overflow-hidden rounded-xl aria-pressed:ring-2 aria-pressed:ring-accent">
            <FotoImg foto={foto} thumb className="h-full w-full" />
            {foto.id === aquario.foto_capa_id && <span aria-hidden="true" className="absolute bottom-1 right-1 rounded-md bg-[#0b2533] px-1.5 text-white">✓</span>}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
