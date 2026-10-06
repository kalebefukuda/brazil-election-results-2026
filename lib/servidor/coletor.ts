// Chamado pelo pg_cron a cada minuto: grava uma foto do Brasil e dos estados no horário de totalização
// do TSE e os eventos do feed "Últimas atualizações".
import { UFS } from "../brasil";
import { ELEICOES, definido, urlDados } from "../eleicao";
import type { Foto } from "../historico";
import { int, titulo } from "../texto";
import { candidatosTSE, type ArquivoTSE } from "../tse-formato";
import { gravar, ler, podeGravar, podeLer } from "./supabase";
import { buscarJson, freio, listaMunicipios, momentoTSE, turnoNoServidor, type Vez } from "./tse";

export type Evento = {
  eleicao: string;
  momento: string;
  tipo: "secoes" | "presidente" | "governador";
  uf: string | null;
  chave: string;
  dados: Record<string, unknown>;
};

type Cand = { n: string; nome: string; partido: string; votos: number; st: string };

function candidatos(j: ArquivoTSE): Cand[] {
  return candidatosTSE(j)
    .map(({ k, p }) => ({ n: k.n, nome: titulo(k.nmu), partido: p.sg, votos: int(k.vap), st: k.st || "" }))
    .sort((x, y) => y.votos - x.votos);
}

function foto(j: ArquivoTSE): Foto {
  const cs = candidatos(j);
  return {
    st: int(j.s?.st),
    ts: int(j.s?.ts),
    vv: int(j.v?.vv),
    cp: int(j.e?.c),
    ab: int(j.e?.a),
    vb: int(j.v?.vb),
    vn: int(j.v?.tvn),
    tv: int(j.v?.tv),
    esnt: int(j.e?.esnt),
    c: Object.fromEntries(cs.map((k) => [k.n, k.votos])),
    md: definido(j.md, cs),
  };
}

const top = (cs: Cand[], vv: number) =>
  cs.slice(0, 2).map((k) => ({ n: k.n, nome: k.nome, partido: k.partido, pct: vv ? (k.votos / vv) * 100 : 0 }));

export async function baixarFotos(eleicao: string, vez: Vez) {
  const [brJ, ...ufsJ] = await Promise.all(
    ["br", ...UFS].map((uf) => buscarJson<ArquivoTSE>(urlDados(eleicao, uf, "0001"), vez)),
  );
  if (!brJ) throw new Error("TSE sem o arquivo nacional");
  const ufs: Record<string, Foto> = {};
  const faltando: string[] = [];
  UFS.forEach((uf, i) => {
    const j = ufsJ[i];
    if (j) ufs[uf] = foto(j);
    else faltando.push(uf);
  });
  return { brJ, br: foto(brJ), ufs, faltando };
}

export async function coletar({ seco }: { seco: boolean }) {
  const turno = await turnoNoServidor();
  const { presidente: eleicao, estadual } = ELEICOES[turno];
  const vez = freio(20);

  const { brJ, br, ufs, faltando } = await baixarFotos(eleicao, vez);
  const momento = momentoTSE(brJ.dt, brJ.ht);

  const [ultimo] = podeLer
    ? await ler<{ momento: string; br: Foto }>(
        "apuracao_snapshot",
        `eleicao=eq.${eleicao}&order=momento.desc&limit=1&select=momento,br`,
      )
    : [];
  const novo = !ultimo || new Date(ultimo.momento).getTime() !== new Date(momento).getTime();
  // foto incompleta não é gravada: o próximo minuto tenta de novo com o mesmo horário
  const completa = faltando.length === 0;

  const eventos: Evento[] = [];
  const cands = candidatos(brJ);

  if (ultimo && novo && completa && br.st > ultimo.br.st) {
    eventos.push({
      eleicao,
      momento,
      tipo: "secoes",
      uf: null,
      chave: `${eleicao}-secoes-${momento}`,
      dados: { secoes: br.st - ultimo.br.st, pst: br.ts ? (br.st / br.ts) * 100 : 0, top: top(cands, br.vv) },
    });
  }

  if (br.md === "e" || br.md === "s") {
    eventos.push({
      eleicao,
      momento,
      tipo: "presidente",
      uf: null,
      chave: `${eleicao}-presidente-${br.md}`,
      dados: { md: br.md, top: top(cands, br.vv) },
    });
  }

  // no 2º turno só algumas UFs têm governador; a lista de municípios da eleição diz quais
  const govUfs = Object.keys(await listaMunicipios(estadual).catch(() => ({}))).filter(
    (uf) => uf !== "zz" && uf !== "br",
  );
  const govJ = await Promise.all(govUfs.map((uf) => buscarJson<ArquivoTSE>(urlDados(estadual, uf, "0003"), vez)));
  govUfs.forEach((uf, i) => {
    const j = govJ[i];
    if (!j) return;
    const cs = candidatos(j);
    if (definido(j.md, cs) !== "e") return;
    eventos.push({
      eleicao,
      momento: momentoTSE(j.dt, j.ht),
      tipo: "governador",
      uf,
      chave: `${estadual}-governador-${uf}`, // único: um evento por estado
      dados: { uf, eleito: top([cs[0]], int(j.v?.vv))[0] },
    });
  });

  const gravou = !seco && podeGravar && novo && completa;
  if (gravou) await gravar("apuracao_snapshot", { eleicao, momento, br, ufs }, "eleicao,momento", "ignora");
  if (!seco && podeGravar && eventos.length) await gravar("apuracao_evento", eventos, "chave", "ignora");

  return { turno, eleicao, momento, novo, gravado: gravou, faltando, eventos };
}
