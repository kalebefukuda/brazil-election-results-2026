export type Turno = 1 | 2;
export type Ano = 2026 | 2022 | 2018;

export const ANO_ATUAL: Ano = 2026;
export const ANOS: Ano[] = [2026, 2022, 2018];

// códigos das eleições nos arquivos do TSE: cada turno tem o seu (2026 vem de comum/config/ele-c.json;
// 2022 e 2018 vêm dos CSVs de dados abertos, convertidos por scripts/historico.mjs)
const CODIGOS: Record<Ano, Record<Turno, { presidente: string; estadual: string }>> = {
  2026: { 1: { presidente: "6257", estadual: "6259" }, 2: { presidente: "6258", estadual: "6260" } },
  2022: { 1: { presidente: "544", estadual: "546" }, 2: { presidente: "545", estadual: "547" } },
  2018: { 1: { presidente: "295", estadual: "297" }, 2: { presidente: "296", estadual: "298" } },
};

// 2026, o ano ao vivo (o coletor e as rotas de servidor só lidam com ele)
export const ELEICOES = CODIGOS[ANO_ATUAL];

export function codigos(ano: Ano, turno: Turno) {
  return CODIGOS[ano][turno];
}

// eleição de ano passado → ano (os arquivos dela ficam no próprio site, em /historico)
const PASSADAS: Record<string, Ano> = {};
for (const ano of ANOS)
  if (ano !== ANO_ATUAL) for (const t of [1, 2] as const) for (const e of Object.values(CODIGOS[ano][t])) PASSADAS[e] = ano;

export const ehPassada = (eleicao: string) => eleicao in PASSADAS;

export const TSE_BASE = "https://resultados.tse.jus.br/oficial/ele2026";

export function urlDados(eleicao: string, uf: string, cargo: string) {
  const ano = PASSADAS[eleicao];
  if (ano) return `/historico/${ano}/${eleicao}/${uf}-c${cargo}.json`;
  return `${TSE_BASE}/${eleicao}/dados/${uf}/${uf}-c${cargo}-e00${eleicao}-u.json`;
}

// municípios do presidente: ano passado é arquivo estático; 2026 vem do que o coletor gravou
export function urlMunicipiosUf(eleicao: string, uf: string) {
  const ano = PASSADAS[eleicao];
  if (ano) return `/historico/${ano}/${eleicao}/mun/${uf}.json`;
  return `/api/municipios/${uf}?e=${eleicao}`;
}

// arquivo de um município: fica na pasta da UF, com o código TSE do município colado na sigla
export function urlMunicipio(eleicao: string, uf: string, codTse: string, cargo: string) {
  return `${TSE_BASE}/${eleicao}/dados/${uf}/${uf}${codTse}-c${cargo}-e00${eleicao}-u.json`;
}

// resultado definido: durante a apuração o TSE avisa em "md"; depois de totalizar, tira o "md" e marca o candidato
export function definido(md: string | undefined, cands: { st?: string }[]): "e" | "s" | "n" {
  if (md === "e" || md === "s") return md;
  if (cands.some((c) => c.st?.startsWith("Eleito"))) return "e";
  if (cands.some((c) => c.st === "2º turno")) return "s";
  return "n";
}
