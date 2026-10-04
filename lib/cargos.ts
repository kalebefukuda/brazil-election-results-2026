// Eleição estadual (6259): governador, senador e deputados, por UF
export const ELEICAO_ESTADUAL = "6259";

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
  final: boolean;
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

  const ts = int(j.s?.ts);
  const st = int(j.s?.st);
  return {
    uf,
    cargo,
    hora: j.ht,
    data: j.dt,
    pst: ts ? (st / ts) * 100 : 0,
    final: j.and === "f",
    vagas: int(c.nv) || 1,
    quociente: int(c.qe),
    validos,
    cands,
    grupos,
  };
}

const TSE = `https://resultados.tse.jus.br/oficial/ele2026/${ELEICAO_ESTADUAL}/dados`;

export function urlCargo(uf: string, cargo: CodCargo) {
  return `${TSE}/${uf}/${uf}-c${CARGOS[cargo].arquivo}-e00${ELEICAO_ESTADUAL}-u.json`;
}

let usarProxy = false;

export async function baixarCargo(uf: string, cargo: CodCargo): Promise<ResultadoCargo> {
  if (!usarProxy) {
    try {
      const r = await fetch(`${urlCargo(uf, cargo)}?nocache=${Date.now()}`, { cache: "no-store" });
      if (r.ok) return parseCargo(uf, cargo, await r.json());
      if (r.status === 404) throw new Error("sem dados");
    } catch (e) {
      if (e instanceof Error && e.message === "sem dados") throw e;
    }
    usarProxy = true;
  }
  const r = await fetch(`/api/tse/${uf}?e=${ELEICAO_ESTADUAL}&c=${CARGOS[cargo].arquivo}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${uf}: HTTP ${r.status}`);
  return parseCargo(uf, cargo, await r.json());
}

// texto curto da situação de quem tá na frente
export function situacaoGovernador(r: ResultadoCargo) {
  const [a] = r.cands;
  if (!a) return "";
  if (a.situacao) return a.situacao;
  if (r.final) return a.pct > 50 ? "Eleito" : "2º turno";
  return a.pct > 50 ? "tendência de vitória no 1º turno" : "tendência de 2º turno";
}
