export const int = (s?: string | number) => parseInt(String(s ?? "0"), 10) || 0;

// "MARIA DA SILVA E SOUZA" → "Maria da Silva e Souza"
export function titulo(s: string) {
  return s
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
    .replace(/\b(Da|De|Do|Dos|Das|E)\b/g, (m) => m.toLowerCase())
    .replace(/D'\S/g, (m) => m.slice(0, 2) + m[2].toUpperCase());
}
