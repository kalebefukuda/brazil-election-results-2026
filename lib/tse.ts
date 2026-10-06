// Presidente (cargo 0001): Brasil, UFs e exterior
import { baixarArquivo } from "./arquivo";
import { definido } from "./eleicao";
import { int, titulo } from "./texto";
import { candidatosTSE, type ArquivoTSE } from "./tse-formato";
import { eleicaoAtual } from "./turno";

export type Candidato = {
  n: string;
  st?: string; // situação depois de totalizar: "Eleito", "2º turno", "Não eleito"
  sq: string; // sequencial do TSE (foto) ou caminho de foto do próprio site
  nome: string;
  partido: string;
  votos: number;
  pct: number; // % dos válidos
};

export type Resumo = {
  uf: string;
  hora: string;
  data: string;
  ts: number; // seções totais
  st: number; // seções totalizadas
  pst: number; // % apurado
  definido: string; // "e" eleito, "s" 2º turno garantido, "n" aberto
  te: number; // eleitorado
  comp: number; // comparecimento (nas seções apuradas)
  abst: number;
  esnt: number; // eleitores em seções não totalizadas
  validos: number;
  brancos: number;
  nulos: number;
  total: number;
  cands: Candidato[];
};

export function parse(uf: string, j: ArquivoTSE): Resumo {
  const validos = int(j.v?.vv);
  const cands: Candidato[] = candidatosTSE(j).map(({ k, p }) => {
    const votos = int(k.vap);
    return {
      n: k.n,
      sq: k.sqcand ?? "",
      nome: titulo(k.nmu),
      partido: p.sg,
      votos,
      pct: validos ? (votos / validos) * 100 : 0,
      st: k.st || "",
    };
  });
  cands.sort((a, b) => b.votos - a.votos);

  const ts = int(j.s?.ts);
  const st = int(j.s?.st);
  return {
    uf,
    hora: j.ht,
    data: j.dt,
    ts,
    st,
    pst: ts ? (st / ts) * 100 : 0,
    definido: definido(j.md, cands),
    te: int(j.e?.te),
    comp: int(j.e?.c),
    abst: int(j.e?.a),
    esnt: int(j.e?.esnt),
    validos,
    brancos: int(j.v?.vb),
    nulos: int(j.v?.tvn),
    total: int(j.v?.tv),
    cands,
  };
}

export async function baixar(uf: string, eleicao = eleicaoAtual().presidente): Promise<Resumo> {
  return parse(uf, await baixarArquivo(eleicao, uf, "0001"));
}
