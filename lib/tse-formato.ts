// Arquivo de divulgação do TSE (dados/{uf}/...-u.json): só os campos que o site usa.
// Os de 2022 e 2018 são gerados no mesmo formato por scripts/historico.mjs.
export type CandTSE = { n: string; sqcand?: string; nmu: string; vap?: string; e?: string; st?: string };
export type ParTSE = { sg: string; tvan?: string; tvtn?: string; cand: CandTSE[] };
export type AgrTSE = { nm: string; com?: string; vag?: string; par: ParTSE[] };

export type ArquivoTSE = {
  dt: string;
  ht: string;
  md?: string;
  and?: string;
  s?: { ts?: string; st?: string };
  e?: { te?: string; c?: string; a?: string; esnt?: string };
  v?: { vv?: string; vb?: string; tvn?: string; tv?: string };
  carg: { nv?: string; qe?: string; agr: AgrTSE[] }[];
};

export function candidatosTSE(j: ArquivoTSE) {
  return j.carg[0].agr.flatMap((a) => a.par.flatMap((p) => p.cand.map((k) => ({ k, p, a }))));
}

// o TSE publica os arquivos de um turno dias antes, zerados e sem data: só vale quando tem seção totalizada
export function apuracaoComecou(j: Pick<ArquivoTSE, "dt" | "ht" | "s">) {
  return Boolean(j.dt && j.ht) && parseInt(j.s?.st ?? "0", 10) > 0;
}
