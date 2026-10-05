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
};

// federação vem como "PT/PC do B/PV" ou "PRD / SOLIDARIEDADE": usa o primeiro partido
export function partidoPrincipal(sigla: string) {
  return sigla.split("/")[0].trim().toUpperCase();
}

export function corPartido(sigla: string) {
  return CORES_PARTIDO[partidoPrincipal(sigla)] ?? "#6b6f78";
}

// agrupamento aproximado por campo político, no estilo do que a imprensa costuma usar
const ESQUERDA = ["PT", "PSOL", "PC DO B", "PCDOB", "PV", "REDE", "PSB", "PDT", "UP", "PCB", "PSTU", "PCO"];
const CENTRO = ["MDB", "PSD", "PSDB", "CIDADANIA", "SOLIDARIEDADE", "AVANTE", "PODE", "PRD", "PMB", "AGIR"];

export type Campo = "esquerda" | "centro" | "direita";

export function campo(sigla: string): Campo {
  const p = partidoPrincipal(sigla);
  if (ESQUERDA.includes(p)) return "esquerda";
  if (CENTRO.includes(p)) return "centro";
  return "direita";
}
