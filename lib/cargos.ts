// Eleição estadual: governador, senador e deputados, por UF (só governador tem 2º turno)
import { codigos, ehPassada, urlDados } from "./eleicao";
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

const int = (s?: string) => parseInt(s || "0", 10);

function titulo(s: string) {
  return s
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
    .replace(/\b(Da|De|Do|Dos|Das|E)\b/g, (m) => m.toLowerCase());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseCargo(uf: string, cargo: CodCargo, j: any): ResultadoCargo {
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
    grupos.push({ nome: a.nm, sigla: a.com || a.par.map((p: { sg: string }) => p.sg).join("/"), votos: votosGrupo, vagas: int(a.vag) });
  }

  const validos = int(j.v?.vv);
  for (const k of cands) k.pct = validos ? (k.votos / validos) * 100 : 0;
  cands.sort((a, b) => b.votos - a.votos);
  grupos.sort((a, b) => b.votos - a.votos);

  // o TSE avisa no campo "md" quando o resultado já não muda mais, antes de marcar o candidato
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
    definido: j.md || "n",
    vagas,
    quociente: int(c.qe),
    validos,
    cands,
    grupos,
  };
}

export function urlCargo(uf: string, cargo: CodCargo, eleicao: string) {
  return urlDados(eleicao, uf, CARGOS[cargo].arquivo);
}

let usarProxy = false;

async function baixarDe(eleicao: string, uf: string, cargo: CodCargo): Promise<ResultadoCargo> {
  // ano passado: arquivo estático do próprio site
  if (ehPassada(eleicao)) {
    const r = await fetch(urlCargo(uf, cargo, eleicao));
    if (!r.ok) throw new Error("sem dados");
    return parseCargo(uf, cargo, await r.json());
  }
  if (!usarProxy) {
    try {
      const r = await fetch(`${urlCargo(uf, cargo, eleicao)}?nocache=${Date.now()}`, { cache: "no-store" });
      if (r.ok) return parseCargo(uf, cargo, await r.json());
      if (r.status === 404) throw new Error("sem dados");
    } catch (e) {
      if (e instanceof Error && e.message === "sem dados") throw e;
    }
    usarProxy = true;
  }
  const r = await fetch(`/api/tse/${uf}?e=${eleicao}&c=${CARGOS[cargo].arquivo}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${uf}: HTTP ${r.status}`);
  return parseCargo(uf, cargo, await r.json());
}

export async function baixarCargo(uf: string, cargo: CodCargo): Promise<ResultadoCargo> {
  // no 2º turno, só os estados que tiverem disputa de governador ganham arquivo novo; o resto segue no 1º
  const { ano, turno } = await descobrirTurno();
  if (cargo === "3" && turno === 2) {
    try {
      return await baixarDe(codigos(ano, 2).estadual, uf, cargo);
    } catch {}
  }
  return baixarDe(codigos(ano, 1).estadual, uf, cargo);
}

// texto curto da situação de quem tá na frente
export function situacaoGovernador(r: ResultadoCargo) {
  const [a] = r.cands;
  if (!a) return "";
  if (a.situacao) return a.situacao;
  if (r.final) return a.pct > 50 ? "Eleito" : "2º turno";
  return a.pct > 50 ? "tendência de vitória no 1º turno" : "tendência de 2º turno";
}

// soma a apuração de vários estados (pra mostrar o total do país nas páginas de Senado/Deputados)
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
