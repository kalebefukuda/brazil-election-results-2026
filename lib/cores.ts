import { cor } from "./brasil";

export const misturar = (c: string, forca: number) => `color-mix(in srgb, ${c} ${Math.round(forca)}%, var(--empty))`;

export const FAIXAS_APURADO = [
  { ate: 25, forca: 30, txt: "até 25%" },
  { ate: 50, forca: 50, txt: "25–50%" },
  { ate: 75, forca: 68, txt: "50–75%" },
  { ate: 95, forca: 84, txt: "75–95%" },
  { ate: 101, forca: 100, txt: "95%+" },
];

export type ModoCor = "lider" | "vantagem" | "candidato" | "apurado";

// estado (Resumo) ou município (lerMunicipio): % apurado e candidatos do mais pro menos votado
type Leitura = { pst: number; cands: { n: string; pct: number }[] };

export function corDoMapa(m: Leitura | null, modo: ModoCor, a: string, b: string, cand: string) {
  if (!m || !m.cands[0]) return "var(--empty)";
  const pct = (n: string) => m.cands.find((c) => c.n === n)?.pct ?? 0;
  if (modo === "apurado") {
    const faixa = FAIXAS_APURADO.find((f) => m.pst < f.ate) ?? FAIXAS_APURADO[FAIXAS_APURADO.length - 1];
    return misturar("var(--ok)", faixa.forca);
  }
  // 20% dos válidos = bem claro, 75% = cor cheia
  if (modo === "candidato") return misturar(cor(cand), Math.max(8, Math.min(100, ((pct(cand) - 20) / 55) * 100)));
  if (modo === "vantagem") {
    const dif = pct(a) - pct(b);
    return misturar(cor(dif >= 0 ? a : b), 20 + (Math.min(Math.abs(dif), 40) / 40) * 80);
  }
  const [p1, p2] = m.cands;
  return misturar(cor(p1.n), 35 + (Math.min(p1.pct - (p2?.pct ?? 0), 30) / 30) * 65);
}
