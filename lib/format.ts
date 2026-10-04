export const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");

export const pct = (n: number, d = 2) =>
  (isFinite(n) ? n : 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";

export function curto(n: number) {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " mi";
  if (a >= 1e3) return (n / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " mil";
  return fmt(n);
}

export const pp = (n: number) =>
  (n > 0 ? "+" : "") + n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " p.p.";
