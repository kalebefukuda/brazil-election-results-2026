// Formato do /api/historico, usado pela linha do tempo, pelo gráfico e pelo feed.
// Cada foto é um array enxuto: os campos fixos de CAMPOS e depois os votos de cada candidato na ordem de `cands`.
import type { Candidato, Resumo } from "./tse";

export const CAMPOS = ["st", "ts", "vv", "cp", "ab", "vb", "vn", "tv", "esnt"] as const;
const N = CAMPOS.length;

export type EventoFeed = {
  momento: string;
  tipo: "secoes" | "presidente" | "governador";
  uf: string | null;
  dados: Record<string, unknown>;
};

export type Historico = {
  eleicao: string;
  cands: string[];
  fotos: { momento: string; br: number[]; ufs: Record<string, number[]> }[];
  eventos: EventoFeed[];
};

export function enxugar(f: Record<(typeof CAMPOS)[number], number> & { c: Record<string, number> }, cands: string[]) {
  return [...CAMPOS.map((k) => f[k]), ...cands.map((n) => f.c[n] ?? 0)];
}

// horário de Brasília de um momento ISO: "21h05"
export function horaBrasilia(momento: string) {
  const s = new Date(momento).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  return s.replace(":", "h");
}

// foto do histórico → Resumo (o mesmo tipo do dado ao vivo), com nome/partido/foto vindos do dado ao vivo
export function fotoParaResumo(uf: string, v: number[], cands: string[], momento: string, vivo: Resumo): Resumo {
  const [st, ts, vv, cp, ab, vb, vn, tv, esnt] = v;
  const lista: Candidato[] = cands.map((n, i) => {
    const base = vivo.cands.find((c) => c.n === n);
    const votos = v[N + i] ?? 0;
    return { n, sq: base?.sq ?? "", nome: base?.nome ?? n, partido: base?.partido ?? "", votos, pct: vv ? (votos / vv) * 100 : 0 };
  });
  lista.sort((a, b) => b.votos - a.votos);
  const d = new Date(momento);
  return {
    uf,
    hora: d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    data: d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    ts,
    st,
    pst: ts ? (st / ts) * 100 : 0,
    definido: "n",
    te: vivo.te,
    comp: cp,
    abst: ab,
    esnt,
    validos: vv,
    brancos: vb,
    nulos: vn,
    total: tv,
    cands: lista,
  };
}
