// códigos das eleições de 2026 nos arquivos do TSE (comum/config/ele-c.json): o 2º turno ganha código próprio
export const ELEICOES = {
  1: { presidente: "6257", estadual: "6259" },
  2: { presidente: "6258", estadual: "6260" },
} as const;

export type Turno = 1 | 2;

export const TSE_BASE = "https://resultados.tse.jus.br/oficial/ele2026";

export function urlDados(eleicao: string, uf: string, cargo: string) {
  return `${TSE_BASE}/${eleicao}/dados/${uf}/${uf}-c${cargo}-e00${eleicao}-u.json`;
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
