import type { Resumo } from "./tse";

export type Dados = Record<string, Resumo>;

export type Agregado = {
  ts: number;
  st: number;
  pst: number;
  te: number;
  esnt: number;
  validos: number;
  votos: Record<string, number>;
};

export function agregar(dados: Dados, ufs: string[]): Agregado {
  const ag: Agregado = { ts: 0, st: 0, pst: 0, te: 0, esnt: 0, validos: 0, votos: {} };
  for (const uf of ufs) {
    const d = dados[uf];
    if (!d) continue;
    ag.ts += d.ts;
    ag.st += d.st;
    ag.te += d.te;
    ag.esnt += d.esnt;
    ag.validos += d.validos;
    for (const c of d.cands) ag.votos[c.n] = (ag.votos[c.n] || 0) + c.votos;
  }
  ag.pst = ag.ts ? (ag.st / ag.ts) * 100 : 0;
  return ag;
}

export function votosDe(d: Resumo) {
  const v: Record<string, number> = {};
  for (const c of d.cands) v[c.n] = c.votos;
  return v;
}

// diferença de votos entre os dois primeiros do Brasil (positivo = 1º colocado na frente)
export function saldo(votos: Record<string, number>, a: string, b: string) {
  return (votos[a] || 0) - (votos[b] || 0);
}

export function lider(d?: Resumo) {
  if (!d || !d.st || !d.validos) return null;
  const [a, b] = d.cands;
  return { cand: a, margem: a.pct - (b ? b.pct : 0) };
}

/*
  Projeção simples: em cada estado, supõe que as seções que faltam votam igual às já apuradas.
  Eleitores restantes x taxa de comparecimento x taxa de válidos = válidos que ainda vão entrar,
  distribuídos pela % atual de cada candidato naquele estado.
*/
export function projetar(dados: Dados, ufs: string[]) {
  const votos: Record<string, number> = {};
  let restantes = 0;
  for (const uf of ufs) {
    const d = dados[uf];
    if (!d) continue;
    const comparec = d.comp + d.abst ? d.comp / (d.comp + d.abst) : 0.78;
    const taxaValidos = d.total ? d.validos / d.total : 0.95;
    const novos = d.esnt * comparec * taxaValidos;
    restantes += novos;
    for (const c of d.cands) {
      const extra = d.validos ? (c.votos / d.validos) * novos : 0;
      votos[c.n] = (votos[c.n] || 0) + c.votos + extra;
    }
  }
  const total = Object.values(votos).reduce((s, v) => s + v, 0);
  const pcts: Record<string, number> = {};
  for (const n in votos) pcts[n] = total ? (votos[n] / total) * 100 : 0;
  return { votos, pcts, total, restantes };
}
