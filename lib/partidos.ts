// cores por partido (só pra diferenciar no gráfico, não é a cor oficial de nenhum deles)
const CORES_PARTIDO: Record<string, string> = {
  PL: "#3d6be0",
  PT: "#e24b4b",
  PSD: "#7cc94f",
  MDB: "#2e9c7a",
  PP: "#6fd0ef",
  UNIÃO: "#8f9cff",
  REPUBLICANOS: "#2f7fb8",
  PSB: "#f0a43a",
  PDT: "#d36ab0",
  PSDB: "#4fb3a0",
  PSOL: "#f5d142",
  NOVO: "#f07e2a",
  PODE: "#9b6ad6",
  AVANTE: "#33b5c6",
  MISSÃO: "#c9a23a",
  "PC DO B": "#b83a5e",
  PV: "#3f9e5a",
  CIDADANIA: "#e07fa0",
  SOLIDARIEDADE: "#c77b3a",
  PTB: "#7d8fa8",
  PATRIOTA: "#5c7fa3",
  PSC: "#8aa64a",
  PROS: "#d98b5f",
};

// siglas de 2018/2022 que mudaram de nome ou se fundiram: herdam cor e campo do partido de hoje
const SUCESSOR: Record<string, string> = {
  PSL: "UNIÃO",
  DEM: "UNIÃO",
  PR: "PL",
  PRB: "REPUBLICANOS",
  PPS: "CIDADANIA",
  PHS: "PODE",
  PATRI: "PATRIOTA",
  PRP: "PATRIOTA",
  PPL: "PC DO B",
};

// federação ("PC do B/PT/PV", "PCDOB / PT / PV") é pintada e classificada pelo maior partido dela
const MAIORES = [
  "PL",
  "PT",
  "UNIÃO",
  "PP",
  "PSD",
  "MDB",
  "REPUBLICANOS",
  "PSDB",
  "PSB",
  "PSOL",
  "PDT",
  "PODE",
  "SOLIDARIEDADE",
];
const peso = (p: string) => (MAIORES.includes(p) ? MAIORES.indexOf(p) : MAIORES.length);

export function partidoPrincipal(sigla: string) {
  const partes = sigla.split("/").map((p) => {
    const x = p
      .trim()
      .toUpperCase()
      .replace(/^PCDOB$/, "PC DO B");
    return SUCESSOR[x] ?? x;
  });
  return partes.sort((a, b) => peso(a) - peso(b))[0];
}

export function corPartido(sigla: string) {
  return CORES_PARTIDO[partidoPrincipal(sigla)] ?? "#6b6f78";
}

// agrupamento aproximado por campo político, no estilo do que a imprensa costuma usar
const ESQUERDA = ["PT", "PSOL", "PC DO B", "PCDOB", "PV", "REDE", "PSB", "PDT", "UP", "PCB", "PSTU", "PCO"];
const CENTRO = [
  "MDB",
  "PSD",
  "PSDB",
  "CIDADANIA",
  "SOLIDARIEDADE",
  "AVANTE",
  "PODE",
  "PRD",
  "PMB",
  "AGIR",
  "PROS",
  "PMN",
  "PTC",
];

export type Campo = "esquerda" | "centro" | "direita";

export function campo(sigla: string): Campo {
  const p = partidoPrincipal(sigla);
  if (ESQUERDA.includes(p)) return "esquerda";
  if (CENTRO.includes(p)) return "centro";
  return "direita";
}
