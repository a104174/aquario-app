"use client";

import { useState, type ComponentType } from "react";
import { FaunaForm } from "@/components/forms/fauna-form";
import { FotoForm } from "@/components/forms/foto-form";
import { MedicaoForm } from "@/components/forms/medicao-form";
import { TpaForm } from "@/components/forms/tpa-form";
import { IconBebe, IconCamara, IconChevronEsquerda, IconGota, IconPeixe, IconTubo } from "@/components/icons";
import { NinhadaForm } from "@/components/forms/ninhada-form";
import { Button } from "@/components/ui/button";
import { BotaoSheet, Sheet } from "@/components/ui/sheet";
import { useColecao } from "@/lib/query/dados";
import { toast } from "@/lib/toast";
import { escolherTipoRegisto, fecharRegistar, useUI, type TipoRegisto } from "@/lib/ui-store";
import type { FaunaEvento, Foto, Medicao, Tpa } from "@/lib/tipos";

export const TIPOS_REGISTO: {
  tipo: TipoRegisto;
  titulo: string;
  descricao: string;
  icon: ComponentType<{ size?: number }>;
}[] = [
  { tipo: "tpa", titulo: "TPA", descricao: "Troca parcial de água", icon: IconGota },
  { tipo: "medicao", titulo: "Medição", descricao: "Parâmetros da água", icon: IconTubo },
  { tipo: "fauna", titulo: "Fauna", descricao: "Entradas, nascimentos, mortes…", icon: IconPeixe },
  { tipo: "foto", titulo: "Foto", descricao: "Tirar, escolher ou colar", icon: IconCamara },
  { tipo: "ninhada", titulo: "Ninhada", descricao: "Parto de uma fêmea", icon: IconBebe },
];

const FORM_ID = "form-registo";

export function RegistarSheet() {
  const { aberto, tipo, aquarioId, editarId, evento, faunaContexto } = useUI((e) => e.registar);
  const { data: aquarios } = useColecao("aquarios");
  const tpas = useColecao("tpas").data;
  const medicoes = useColecao("medicoes").data;
  const fauna = useColecao("fauna").data;
  const fotos = useColecao("fotos").data;
  const ninhadas = useColecao("ninhadas").data;
  const [direcao, setDirecao] = useState<"forward" | "back">("forward");
  const [sessao, setSessao] = useState(0);
  const [aGuardarFauna, setAGuardarFauna] = useState(false);

  const info = TIPOS_REGISTO.find((t) => t.tipo === tipo);
  const editando = !!editarId;
  const semAquarios = aquarios !== undefined && aquarios.length === 0;

  function feito(msg: string) {
    fecharRegistar();
    toast(`✓ ${msg}`, "ok");
  }

  const props = { formId: FORM_ID, aquarioId, onFeito: feito };
  let form = null;
  if (tipo === "tpa") form = <TpaForm {...props} inicial={tpas?.find((x) => x.id === editarId) as Tpa | undefined} />;
  if (tipo === "medicao")
    form = <MedicaoForm {...props} inicial={medicoes?.find((x) => x.id === editarId) as Medicao | undefined} />;
  if (tipo === "fauna")
    form = <FaunaForm key={editarId ?? "nova-fauna"} {...props} inicial={fauna?.find((x) => x.id === editarId) as FaunaEvento | undefined} contexto={faunaContexto} editarId={editarId} onGuardar={setAGuardarFauna} />;
  if (tipo === "ninhada") form = <NinhadaForm {...props} inicial={ninhadas?.find((x) => x.id === editarId)} />;
  if (tipo === "foto") form = <FotoForm {...props} evento={evento} inicial={fotos?.find((x) => x.id === editarId) as Foto | undefined} />;

  return (
    <Sheet
      open={aberto}
      onOpenChange={(o) => !o && !aGuardarFauna && fecharRegistar()}
      onAnimationEnd={(o) => {
        if (!o) {
          // Depois de fechar, a próxima abertura começa do zero
          escolherTipoRegisto(null);
          setDirecao("forward");
          setSessao((s) => s + 1);
        }
      }}
      titulo={info ? (tipo === "fauna" && faunaContexto?.detalhar ? "Detalhar grupo" : editando ? `Editar ${info.titulo.toLowerCase()}` : info.titulo) : "Registar"}
      esquerda={
        info && !editando && !faunaContexto ? (
          <BotaoSheet
            onClick={() => {
              if (aGuardarFauna) return;
              setDirecao("back");
              escolherTipoRegisto(null);
            }}
          >
            <span className="flex items-center">
              <IconChevronEsquerda size={22} strokeWidth={2.2} /> Voltar
            </span>
          </BotaoSheet>
        ) : (
          <BotaoSheet onClick={() => { if (!aGuardarFauna) fecharRegistar(); }}>Cancelar</BotaoSheet>
        )
      }
      rodape={
        form ? (
          <Button type="submit" form={FORM_ID} block loading={aGuardarFauna}>
            Guardar
          </Button>
        ) : undefined
      }
    >
      <div key={`${sessao}-${tipo ?? "escolha"}`} className={tipo ? "step-forward" : direcao === "back" ? "step-back" : ""}>
        {semAquarios ? (
          <div className="py-10 text-center">
            <p className="text-body font-semibold">Ainda não tens aquários</p>
            <p className="mt-1 text-text-2">Cria um aquário no ecrã Aquários para começares a registar.</p>
          </div>
        ) : form ? (
          form
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-2 pt-1">
            {TIPOS_REGISTO.map((t, i) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.tipo}
                  type="button"
                  onClick={() => {
                    setDirecao("forward");
                    escolherTipoRegisto(t.tipo);
                  }}
                  style={{ ["--i" as string]: i }}
                  className={`pressable ${direcao === "back" ? "" : "enter-up"} ${i === 4 ? "col-span-2 !flex-row items-center" : ""} flex flex-col items-start gap-3 rounded-[18px] bg-surface p-4 text-left`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Icon size={24} />
                  </span>
                  <span>
                    <span className="block text-body font-semibold">{t.titulo}</span>
                    <span className="block text-footnote leading-snug text-text-2">{t.descricao}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}
