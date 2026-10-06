// Eleição estadual: governador, senador e deputados, por UF (só governador tem 2º turno)
import { baixarArquivo, SemArquivo } from "./arquivo";
import { codigos, definido } from "./eleicao";
import { int, titulo } from "./texto";
import type { ArquivoTSE } from "./tse-formato";
import { descobrirTurno } from "./turno";

export const CARGOS = {
  "3": { nome: "Governador", curto: "Governador", arquivo: "0003" },
  "5": { nome: "Senador", curto: "Senado", arquivo: "0005" },
  "6": { nome: "Deputado Federal", curto: "Dep. Federal", arquivo: "0006" },
  "7": { nome: "Deputado Estadual", curto: "Dep. Estadual", arquivo: "0007" },
  "8": { nome: "Deputado Distrital", curto: "Dep. Distrital", arquivo: "0008" },
} as const;

export type CodCargo = keyof typeof CARGOS;

// no DF não tem deputado estadual, tem distrital
export function cargosDaUf(uf: string): CodCargo[] {
  return uf === "df" ? ["3", "5", "6", "8"] : ["3", "5", "6", "7"];
}

export type CandCargo = {
  n: string;
  nome: string;
  partido: string;
  votos: number;
  pct: number;
  eleito: boolean;
  situacao: string; // texto do TSE: "Eleito", "2º turno", "Eleito por QP"...
};

export type Grupo = {
  nome: string; // partido ou federação
  sigla: string;
  votos: number;
  vagas: number;
};

export type ResultadoCargo = {
  uf: string;
  cargo: CodCargo;
  hora: string;
  data: string;
  pst: number;
  st: number; // seções totalizadas
  ts: number; // total de seções
  esnt: number; // eleitores em seções ainda não totalizadas
  final: boolean;
  definido: string; // md do TSE: "e" = eleito matematicamente, "s" = 2º turno garantido, "n" = ainda aberto
  vagas: number; // nv
  quociente: number; // qe (só proporcional)
  validos: number;
  cands: CandCargo[];
  grupos: Grupo[];
};

export function parseCargo(uf: string, cargo: CodCargo, j: ArquivoTSE): ResultadoCargo {
  const c = j.carg[0];
  const cands: CandCargo[] = [];
  const grupos: Grupo[] = [];

  for (const a of c.agr) {
    let votosGrupo = 0;
    for (const p of a.par) {
      votosGrupo += int(p.tvan || p.tvtn);
      for (const k of p.cand) {
        cands.push({
          n: k.n,
          nome: titulo(k.nmu),
          partido: p.sg,
          votos: int(k.vap),
          pct: 0,
          eleito: k.e === "s",
          situacao: k.st || "",
        });
      }
    }
    grupos.push({ nome: a.nm, sigla: a.com || a.par.map((p) => p.sg).join("/"), votos: votosGrupo, vagas: int(a.vag) });
  }

  const validos = int(j.v?.vv);
  for (const k of cands) k.pct = validos ? (k.votos / validos) * 100 : 0;
  cands.sort((a, b) => b.votos - a.votos);
  grupos.sort((a, b) => b.votos - a.votos);

  // durante a apuração o TSE avisa em "md" que o resultado não muda mais, antes de marcar o candidato
  const vagas = int(c.nv) || 1;
  if (cargo === "3" || cargo === "5") {
    if (j.md === "e") {
      cands.slice(0, vagas).forEach((k) => {
        k.eleito = true;
        if (!k.situacao) k.situacao = "Eleito";
      });
    } else if (j.md === "s" && cargo === "3") {
      cands.slice(0, 2).forEach((k) => {
        if (!k.situacao) k.situacao = "2º turno";
      });
    }
  }

  const ts = int(j.s?.ts);
  const st = int(j.s?.st);
  return {
    uf,
    cargo,
    hora: j.ht,
    data: j.dt,
    pst: ts ? (st / ts) * 100 : 0,
    st,
    ts,
    esnt: int(j.e?.esnt),
    final: j.and === "f",
    definido: definido(
      j.md,
      cands.map((k) => ({ st: k.situacao })),
    ),
    vagas,
    quociente: int(c.qe),
    validos,
    cands,
    grupos,
  };
}

export async function baixarCargo(uf: string, cargo: CodCargo): Promise<ResultadoCargo> {
  const { ano, turno } = await descobrirTurno();
  // no 2º turno só os estados com disputa de governador têm arquivo novo; os outros seguem no 1º
  if (cargo === "3" && turno === 2) {
    try {
      return parseCargo(uf, cargo, await baixarArquivo(codigos(ano, 2).estadual, uf, CARGOS[cargo].arquivo));
    } catch (e) {
      if (!(e instanceof SemArquivo)) throw e;
    }
  }
  return parseCargo(uf, cargo, await baixarArquivo(codigos(ano, 1).estadual, uf, CARGOS[cargo].arquivo));
}

export function situacaoGovernador(r: ResultadoCargo) {
  const [a] = r.cands;
  if (!a) return "";
  if (a.situacao) return a.situacao;
  if (r.final) return a.pct > 50 ? "Eleito" : "2º turno";
  return a.pct > 50 ? "tendência de vitória no 1º turno" : "tendência de 2º turno";
}

export function somaApuracao(lista: (ResultadoCargo | undefined)[]) {
  let st = 0;
  let ts = 0;
  let esnt = 0;
  for (const r of lista) {
    if (!r) continue;
    st += r.st;
    ts += r.ts;
    esnt += r.esnt;
  }
  return { st, ts, esnt, pst: ts ? (st / ts) * 100 : 0 };
}
