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
  // 2022 e 2018
  "17": "var(--c22)", // Bolsonaro em 2018 (PSL)
  "12": "var(--c70)", // Ciro (PDT)
  "15": "var(--c55)", // Simone Tebet (MDB)
  "45": "var(--c14)", // Alckmin (PSDB)
};

export function cor(n?: string | null) {
  if (!n) return "var(--cx)";
  return CORES[n] ?? "var(--cx)";
}

// código IBGE da UF (2 primeiros dígitos do código do município) → sigla
const UF_IBGE: Record<string, string> = {
  "11": "ro", "12": "ac", "13": "am", "14": "rr", "15": "pa", "16": "ap", "17": "to",
  "21": "ma", "22": "pi", "23": "ce", "24": "rn", "25": "pb", "26": "pe", "27": "al", "28": "se", "29": "ba",
  "31": "mg", "32": "es", "33": "rj", "35": "sp", "41": "pr", "42": "sc", "43": "rs",
  "50": "ms", "51": "mt", "52": "go", "53": "df",
};

export function ufDoMunicipio(cdi: string) {
  return UF_IBGE[cdi.slice(0, 2)];
}

export const UFS_ESTADOS = Object.values(REGIOES).flat();

// a página de Presidente usa a tela toda no desktop grande; as outras ficam em 1240px
export const larguraPagina = (path: string) => `max-w-[1240px] ${path === "/" ? "xl:max-w-[1680px]" : ""}`;
