export const NOMES: Record<string, string> = {
  ac: "Acre", al: "Alagoas", ap: "Amapá", am: "Amazonas", ba: "Bahia", ce: "Ceará",
  df: "Distrito Federal", es: "Espírito Santo", go: "Goiás", ma: "Maranhão", mt: "Mato Grosso",
  ms: "Mato Grosso do Sul", mg: "Minas Gerais", pa: "Pará", pb: "Paraíba", pr: "Paraná",
  pe: "Pernambuco", pi: "Piauí", rj: "Rio de Janeiro", rn: "Rio Grande do Norte",
  rs: "Rio Grande do Sul", ro: "Rondônia", rr: "Roraima", sc: "Santa Catarina",
  sp: "São Paulo", se: "Sergipe", to: "Tocantins", zz: "Exterior",
};

export const REGIOES: Record<string, string[]> = {
  Norte: ["ac", "ap", "am", "pa", "ro", "rr", "to"],
  Nordeste: ["al", "ba", "ce", "ma", "pb", "pe", "pi", "rn", "se"],
  "Centro-Oeste": ["df", "go", "mt", "ms"],
  Sudeste: ["es", "mg", "rj", "sp"],
  Sul: ["pr", "rs", "sc"],
};

export const REGIAO_DE: Record<string, string> = { zz: "Exterior" };
for (const r in REGIOES) for (const uf of REGIOES[r]) REGIAO_DE[uf] = r;

export const UFS = [...Object.values(REGIOES).flat(), "zz"];

// candidatos com cor própria (pelo número de urna); o resto fica cinza
export const CORES: Record<string, string> = {
  "22": "var(--c22)",
  "13": "var(--c13)",
  "70": "var(--c70)",
  "55": "var(--c55)",
  "14": "var(--c14)",
};

export function cor(n?: string | null) {
  if (!n) return "var(--cx)";
  return CORES[n] ?? "var(--cx)";
}
