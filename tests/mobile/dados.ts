// Dados fictícios para os testes (datas relativas a "agora").
const D = (dias: number, hora = 10) => new Date(Date.now() - dias * 864e5 + (hora - 12) * 36e5).toISOString();
const dia = (dias: number) => D(dias).slice(0, 10);

export type Cenario = "cheio" | "vazio";

export function criarDados(cenario: Cenario) {
  const definicoes = [{ user_id: "u1", intervalo_tpa_dias: 7, aviso_tpa_urgente_dias: 10, lembretes_push: false, lembretes_email: false, lembrete_foto_semanal: true, lembrete_esponja: true }];
  const produtos = [
    { id: "c1", nome: "AMTRA Care", tipo: "condicionador", dose_por_litro: 0.25, volume_inicial: 15, unidade: "ml", data_abertura: dia(40), duracao_dias: null, ativo: true, criado_em: D(90) },
  ];
  const fontes_externas = [
    { id: "fx1", tipo: "meteo", nome: "Meteorologia Braga", url: null, configuracao: { max_alerta: 30, min_alerta: 5 }, ativo: true, ultima_verificacao: D(0, 8), ultimo_erro: null, resultado: { dias: [{ data: dia(0), max: 14, min: 4.5 }, { data: dia(-1), max: 20, min: 13 }, { data: dia(-2), max: 21, min: 15 }], limites: { max: 30, min: 5 } }, criado_em: D(5) },
    { id: "fx2", tipo: "eredes", nome: "Cortes de luz (E-REDES)", url: null, configuracao: { concelho: "Braga", codigos_postais: [] }, ativo: true, ultima_verificacao: D(0, 8), ultimo_erro: null, resultado: { sem_codigo_postal: true, afetam_os_meus_cp: 0 }, criado_em: D(5) },
    { id: "fx3", tipo: "agere_qualidade", nome: "Qualidade da água (AGERE)", url: null, configuracao: {}, ativo: true, ultima_verificacao: D(0, 8), ultimo_erro: null, resultado: { ph: { min: 6.5, max: 8 }, cloro_mg_l: { min: 0.24, max: 1.52 }, dureza_dgh: { min: 1.9, max: 1.9 }, dureza_mg_caco3: { min: 33.9, max: 33.9 } }, criado_em: D(5) },
  ];
  if (cenario === "vazio") {
    return { aquarios: [], produtos, tpas: [], medicoes: [], fauna_eventos: [], fotos: [], ninhadas: [], ferias: [], desejos: [], alertas: [], definicoes, fontes_externas, novidades_externas: [] };
  }
  const aquarios = [
    { id: "a1", nome: "Principal (Aquatlantis Vienna)", volume_bruto_l: 42, volume_util_l: 30, notas: null, criado_em: D(90) },
    { id: "a2", nome: "AQUARIUS 20 L", volume_bruto_l: 20, volume_util_l: 17, notas: null, criado_em: D(89) },
    { id: "a3", nome: "Betta", volume_bruto_l: 5, volume_util_l: 5, notas: null, criado_em: D(88) },
  ];
  const tpas = [
    { id: "t1", aquario_id: "a1", data: D(3, 18), litros: 9, condicionador_id: "c1", dose_ml: 2.25, notas: null },
    { id: "t2", aquario_id: "a2", data: D(9, 19), litros: 5, condicionador_id: "c1", dose_ml: 1.25, notas: "Aspirei o substrato" },
    { id: "t3", aquario_id: "a3", data: D(6, 20), litros: 2, condicionador_id: "c1", dose_ml: 0.5, notas: null },
    ...Array.from({ length: 14 }, (_, i) => ({ id: `tt${i}`, aquario_id: "a1", data: D(10 + i * 7, 18), litros: 9, condicionador_id: "c1", dose_ml: 2.25, notas: null })),
  ];
  const medicoes = Array.from({ length: 20 }, (_, i) => ({
    id: "m" + i, aquario_id: i % 4 === 3 ? "a3" : "a1", data: D(i * 4 + 1, 21), metodo: i % 2 ? "tira" : "gotas", notas: null,
    nh3_nh4: 0, no2: i === 5 ? 0.3 : 0, no3: [10, 15, 20, 25, 30, 12, 18, 22][i % 8], ph: 7 + (i % 3) / 10, gh: 8, kh: 5, temperatura_c: 25 + (i % 2) / 2,
  }));
  const fauna_eventos = [
    { id: "f1", aquario_id: "a1", data: D(60), tipo: "entrada", especie: "Neon", quantidade: 12, aquario_destino_id: null, notas: null },
    { id: "f2", aquario_id: "a1", data: D(30), tipo: "morte", especie: "Neon", quantidade: 1, aquario_destino_id: null, notas: null },
    { id: "f3", aquario_id: "a1", data: D(1, 9), tipo: "entrada", especie: "Corydora panda", quantidade: 6, aquario_destino_id: null, notas: null },
    { id: "f4", aquario_id: "a2", data: D(20), tipo: "nascimento", especie: "Camarão Red Cherry", quantidade: 15, aquario_destino_id: null, notas: null },
    { id: "f5", aquario_id: "a2", data: D(0, 11), tipo: "transferencia", especie: "Camarão Red Cherry", quantidade: 5, aquario_destino_id: "a1", notas: null },
    { id: "f6", aquario_id: "a3", data: D(80), tipo: "entrada", especie: "Betta splendens", quantidade: 1, aquario_destino_id: null, notas: null },
  ];
  const fotos = Array.from({ length: 9 }, (_, i) => ({
    id: "p" + i, aquario_id: "a1", data: D(Math.floor(i / 3) * 4, 9 + i), storage_path: `a1/2026/11/p${i}.webp`, thumb_path: null,
    etiqueta: ["peixes", "plantas", "maternidade"][i % 3], legenda: i === 0 ? "Neons a comer" : null, evento_tipo: null, evento_id: null,
  }));
  const ninhadas = [{ id: "n1", aquario_id: "a1", mae: "fêmea cauda amarela/preta", data_parto: dia(27), notas: null, estado: "ativa", criado_em: D(27) }];
  const ferias = [{ id: "v1", ida: dia(-5), regresso: dia(-12), quem_alimenta: "Mãe", notas: "Uma pitada de flocos dia sim, dia não.", checklist: [{ texto: "Fazer uma TPA 1–2 dias antes", feito: true }, { texto: "Comida preparada", feito: false }], criado_em: D(2) }];
  const desejos = [
    { id: "w1", item: "Guppy black rose (casal)", foto_path: "u1/desejos/w1.webp", thumb_path: null, link: "https://aquaralandia.pt", loja: "Aquaralândia", preco: 12.5, notas: "Perguntar se têm machos", estado: "quero", criado_em: D(3) },
    { id: "w2", item: "Neocaridina blue dream", foto_path: null, thumb_path: null, link: null, loja: null, preco: null, notas: null, estado: "quero", criado_em: D(6) },
  ];
  const alertas = [
    { id: "al1", tipo: "ninhada", titulo: "Prepara a maternidade", mensagem: "A fêmea cauda amarela/preta pode voltar a parir nos próximos dias.", url: "/aquario?id=a1", lido: false, criado_em: D(0, 19), canal: "push" },
    { id: "al2", tipo: "meteo", titulo: "Frio em Braga: 4,5 °C", mensagem: "Confirma que o aquecedor está ligado.", url: "/fontes", lido: true, criado_em: D(1, 19), canal: "push" },
  ];
  const novidades_externas = [{ id: "nx1", fonte_id: "fx3", titulo: "Qualidade da água: 2.º trimestre 2026", url: null, resumo: "Dureza 33,9 mg/L CaCO₃ (≈ 1,9 °dGH) · pH 6,5–8", detectado_em: D(0, 8) }];
  for (const k of [tpas, medicoes, fauna_eventos, fotos] as { data: string }[][]) k.sort((a, b) => b.data.localeCompare(a.data));
  return { aquarios, produtos, tpas, medicoes, fauna_eventos, fotos, ninhadas, ferias, desejos, alertas, definicoes, fontes_externas, novidades_externas };
}
