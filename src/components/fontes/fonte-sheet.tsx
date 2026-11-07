"use client";

import { useState } from "react";
import { ErroForm, Grupo, InputLinha, InputNumero, Interruptor, Linha, Segmentado } from "@/components/forms/campos";
import { confirmar } from "@/components/ui/action-sheet";
import { Button } from "@/components/ui/button";
import { BotaoSheet, Sheet } from "@/components/ui/sheet";
import { novoId } from "@/lib/derivados";
import { lerNumero } from "@/lib/formato";
import { useApagar, useGuardar } from "@/lib/query/dados";
import { toast } from "@/lib/toast";
import type { FonteExterna } from "@/lib/tipos";

const lista = (v: unknown) => (Array.isArray(v) ? (v as string[]).join(", ") : "");
const paraLista = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const txt = (v: unknown, padrao = "") => (v == null ? padrao : String(v).replace(".", ","));

export function FonteSheet({ open, onOpenChange, inicial }: { open: boolean; onOpenChange: (o: boolean) => void; inicial?: FonteExterna }) {
  const [k, setK] = useState(0);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onAnimationEnd={(o) => !o && setK((x) => x + 1)}
      titulo={inicial?.nome ?? "Nova loja"}
      esquerda={<BotaoSheet onClick={() => onOpenChange(false)}>Cancelar</BotaoSheet>}
      rodape={
        <Button type="submit" form="form-fonte" block>
          Guardar
        </Button>
      }
    >
      <Form key={`${k}-${inicial?.id}`} inicial={inicial} onFeito={() => onOpenChange(false)} />
    </Sheet>
  );
}

function Form({ inicial, onFeito }: { inicial?: FonteExterna; onFeito: () => void }) {
  const guardar = useGuardar("fontes");
  const apagar = useApagar("fontes");
  const tipo = inicial?.tipo ?? "loja";
  const c = inicial?.configuracao ?? { plataforma: "woocommerce", palavras: ["guppy", "camarão", "neocaridina", "black rose", "red cherry", "betta"] };
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [url, setUrl] = useState(inicial?.url ?? "");
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true);
  // meteo
  const [lat, setLat] = useState(txt(c.latitude, "41,5454"));
  const [lon, setLon] = useState(txt(c.longitude, "-8,4265"));
  const [max, setMax] = useState(txt(c.max_alerta, "30"));
  const [min, setMin] = useState(txt(c.min_alerta, "5"));
  // e-redes / agere
  const [concelho, setConcelho] = useState(String(c.concelho ?? "Braga"));
  const [cps, setCps] = useState(lista(c.codigos_postais));
  const [termos, setTermos] = useState(lista(c.termos));
  // loja
  const [plataforma, setPlataforma] = useState(String(c.plataforma ?? "woocommerce"));
  const [palavras, setPalavras] = useState(lista(c.palavras));
  const [listagem, setListagem] = useState(String(c.url_listagem ?? ""));
  const [selItem, setSelItem] = useState(String(c.seletor_item ?? "li.product"));
  const [selNome, setSelNome] = useState(String(c.seletor_nome ?? ""));
  const [selPreco, setSelPreco] = useState(String(c.seletor_preco ?? ""));
  const [erro, setErro] = useState<string | null>(null);

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    let configuracao: Record<string, unknown> = { ...c };
    if (tipo === "meteo") {
      const v = [lerNumero(lat), lerNumero(lon), lerNumero(max), lerNumero(min)];
      if (v.some((x) => x === null)) return setErro("Preenche coordenadas e limites.");
      configuracao = { ...configuracao, latitude: v[0], longitude: v[1], max_alerta: v[2], min_alerta: v[3] };
    }
    if (tipo === "eredes") configuracao = { ...configuracao, concelho: concelho.trim(), codigos_postais: paraLista(cps) };
    if (tipo === "agere_avisos") configuracao = { ...configuracao, termos: paraLista(termos) };
    if (tipo === "loja") {
      if (!nome.trim()) return setErro("Dá um nome à loja.");
      if (plataforma !== "nenhuma" && !/^https?:\/\//i.test(url.trim())) return setErro("Indica o endereço da loja (https://…).");
      configuracao = {
        ...configuracao,
        plataforma,
        palavras: paraLista(palavras),
        ...(plataforma === "html" ? { url_listagem: listagem.trim() || url.trim(), seletor_item: selItem.trim(), seletor_nome: selNome.trim() || null, seletor_preco: selPreco.trim() || null } : {}),
      };
    }
    guardar.mutate({
      id: inicial?.id ?? novoId(),
      tipo,
      nome: nome.trim() || inicial?.nome || "Loja",
      url: url.trim() || null,
      configuracao,
      ativo: plataforma === "nenhuma" && tipo === "loja" ? false : ativo,
      ultima_verificacao: inicial?.ultima_verificacao ?? null,
      ultimo_erro: inicial?.ultimo_erro ?? null,
      resultado: inicial?.resultado ?? null,
      criado_em: inicial?.criado_em ?? new Date().toISOString(),
    });
    toast("✓ Fonte guardada", "ok");
    onFeito();
  }

  async function remover() {
    if (await confirmar({ titulo: `Remover “${inicial!.nome}”?`, acao: "Remover fonte", destrutivo: true })) {
      apagar.mutate({ id: inicial!.id });
      onFeito();
    }
  }

  return (
    <form id="form-fonte" onSubmit={submeter} noValidate>
      <ErroForm key={erro} texto={erro} />

      {tipo === "meteo" && (
        <Grupo titulo="Open-Meteo" rodape="Verifica 1× por dia os próximos 3 dias. Aviso de calor (tampa aberta, ventoinha, luz mais cedo) ou de frio (confirmar o aquecedor).">
          <Linha rotulo="Latitude"><InputNumero valor={lat} onValor={setLat} /></Linha>
          <Linha rotulo="Longitude"><InputLinha inputMode="text" value={lon} onChange={(e) => setLon(e.target.value)} /></Linha>
          <Linha rotulo="Aviso se máx. ≥"><InputNumero valor={max} onValor={setMax} unidade="°C" /></Linha>
          <Linha rotulo="Aviso se mín. ≤"><InputNumero valor={min} onValor={setMin} unidade="°C" /></Linha>
        </Grupo>
      )}

      {tipo === "eredes" && (
        <Grupo titulo="Interrupções agendadas" rodape="Separa vários códigos postais por vírgulas. Podes usar só os 4 primeiros dígitos (ex.: 4710) para uma zona maior. Sem código postal não há avisos.">
          <Linha rotulo="Concelho"><InputLinha value={concelho} onChange={(e) => setConcelho(e.target.value)} /></Linha>
          <Linha rotulo="Código postal"><InputLinha value={cps} onChange={(e) => setCps(e.target.value)} placeholder="4710-057" inputMode="text" /></Linha>
        </Grupo>
      )}

      {tipo === "agere_avisos" && (
        <Grupo titulo="Avisos da AGERE" rodape="Avisa quando um corte de água mencionar a tua freguesia ou rua. Separa por vírgulas (ex.: São Vicente, Rua de Santa Margarida).">
          <Linha rotulo="Freguesia / rua"><InputLinha value={termos} onChange={(e) => setTermos(e.target.value)} placeholder="ex.: São Vicente" /></Linha>
        </Grupo>
      )}

      {tipo === "agere_qualidade" && (
        <p className="mb-5 rounded-[14px] bg-surface px-4 py-3 text-subhead text-text-2">
          Deteta um novo relatório trimestral da qualidade da água da rede de Braga e extrai dureza, pH e cloro. Não precisa de configuração.
        </p>
      )}

      {tipo === "loja" && (
        <>
          <Grupo>
            <Linha rotulo="Nome"><InputLinha value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Aquaralândia" /></Linha>
            <Linha rotulo="Endereço"><InputLinha value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" autoCapitalize="none" placeholder="https://" /></Linha>
          </Grupo>
          <Segmentado
            className="mb-5"
            opcoes={[
              { valor: "woocommerce", texto: "WooCommerce" },
              { valor: "html", texto: "Página + CSS" },
              { valor: "nenhuma", texto: "Sem loja" },
            ]}
            valor={plataforma}
            onValor={setPlataforma}
          />
          {plataforma !== "nenhuma" && (
            <Grupo titulo="Palavras-chave" rodape="Produtos novos, regresso de stock e mudanças de preço que contenham estas palavras.">
              <Linha rotulo="Palavras"><InputLinha value={palavras} onChange={(e) => setPalavras(e.target.value)} placeholder="guppy, betta" /></Linha>
            </Grupo>
          )}
          {plataforma === "html" && (
            <Grupo titulo="Seletores CSS" rodape="Para lojas sem API: a página com a lista de produtos e os seletores de cada produto.">
              <Linha rotulo="Página"><InputLinha value={listagem} onChange={(e) => setListagem(e.target.value)} inputMode="url" autoCapitalize="none" placeholder="https://…/loja/" /></Linha>
              <Linha rotulo="Produto"><InputLinha value={selItem} onChange={(e) => setSelItem(e.target.value)} autoCapitalize="none" /></Linha>
              <Linha rotulo="Nome"><InputLinha value={selNome} onChange={(e) => setSelNome(e.target.value)} autoCapitalize="none" placeholder="h2" /></Linha>
              <Linha rotulo="Preço"><InputLinha value={selPreco} onChange={(e) => setSelPreco(e.target.value)} autoCapitalize="none" placeholder=".price" /></Linha>
            </Grupo>
          )}
        </>
      )}

      {!(tipo === "loja" && plataforma === "nenhuma") && (
        <Grupo>
          <div className="flex min-h-[48px] items-center justify-between px-4">
            <span className="text-body">Ativa</span>
            <Interruptor ligado={ativo} onMudar={setAtivo} label="Fonte ativa" />
          </div>
        </Grupo>
      )}

      {inicial && tipo === "loja" && (
        <Button type="button" variant="danger" block onClick={remover}>
          Remover loja
        </Button>
      )}
    </form>
  );
}
