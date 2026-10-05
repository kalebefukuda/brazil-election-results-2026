// Arquivos públicos de divulgação do TSE — eleição 6257 (Presidente, 1º turno 2026), cargo 0001
const TSE = "https://resultados.tse.jus.br/oficial/ele2026/6257/dados";

export type Candidato = {
  n: string;
  sq: string; // sequencial do TSE, usado na foto
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
  definido: string; // "e" = eleito no 1º turno, "s" = 2º turno garantido, "n" = aberto
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

const int = (s?: string) => parseInt(s || "0", 10);

function titulo(s: string) {
  return s
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
    .replace(/\b(Da|De|Do|Dos|Das)\b/g, (m) => m.toLowerCase());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parse(uf: string, j: any): Resumo {
  const cands: Candidato[] = [];
  for (const a of j.carg[0].agr)
    for (const p of a.par)
      for (const k of p.cand)
        cands.push({ n: k.n, sq: k.sqcand, nome: titulo(k.nmu), partido: p.sg, votos: int(k.vap), pct: 0 });

  const validos = int(j.v.vv);
  for (const c of cands) c.pct = validos ? (c.votos / validos) * 100 : 0;
  cands.sort((a, b) => b.votos - a.votos);

  const ts = int(j.s.ts);
  const st = int(j.s.st);
  return {
    uf,
    hora: j.ht,
    data: j.dt,
    ts,
    st,
    pst: ts ? (st / ts) * 100 : 0,
    definido: j.md || "n",
    te: int(j.e.te),
    comp: int(j.e.c),
    abst: int(j.e.a),
    esnt: int(j.e.esnt),
    validos,
    brancos: int(j.v.vb),
    nulos: int(j.v.tvn),
    total: int(j.v.tv),
    cands,
  };
}

export function urlTSE(uf: string) {
  return `${TSE}/${uf}/${uf}-c0001-e006257-u.json`;
}

// tenta direto no TSE (navegador do visitante); se falhar, usa a rota /api como reserva
let usarProxy = false;

export async function baixar(uf: string): Promise<Resumo> {
  if (!usarProxy) {
    try {
      const r = await fetch(`${urlTSE(uf)}?nocache=${Date.now()}`, { cache: "no-store" });
      if (r.ok) return parse(uf, await r.json());
    } catch {
      // CORS ou rede: cai pro proxy
    }
    usarProxy = true;
  }
  const r = await fetch(`/api/tse/${uf}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${uf}: HTTP ${r.status}`);
  return parse(uf, await r.json());
}
