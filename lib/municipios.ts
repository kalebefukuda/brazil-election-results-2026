// Resultado do presidente por município, uma UF por arquivo (gerado pelo coletor ou por scripts/historico.mjs).
export type MunUf = {
  eleicao: string;
  uf: string;
  hora: string;
  cands: string[]; // números dos candidatos, na ordem dos votos em `mun`
  nomes: Record<string, string>; // código IBGE → nome
  mun: Record<string, number[]>; // código IBGE → [seções totalizadas, total de seções, válidos, ...votos de cada um de `cands`]
};

export function lerMunicipio(d: MunUf, cdi: string) {
  const v = d.mun[cdi];
  if (!v || !v[0]) return null;
  const [st, ts, validos] = v;
  const cands = d.cands.map((n, i) => ({ n, pct: validos ? ((v[3 + i] ?? 0) / validos) * 100 : 0 }));
  cands.sort((x, y) => y.pct - x.pct);
  return { pst: ts ? (st / ts) * 100 : 0, cands };
}

export function concluida(d: MunUf) {
  return Object.values(d.mun).every((v) => v[1] > 0 && v[0] === v[1]);
}
