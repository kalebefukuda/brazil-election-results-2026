"use client";

import { NOMES, cor, ufDoMunicipio } from "@/lib/brasil";
import type { Dados } from "@/lib/calc";
import { fmt, pct } from "@/lib/format";
import { lerMunicipio, type MunUf } from "@/lib/municipios";

export type Tip = { x: number; y: number; w: number } & (
  { uf: string; cdi?: undefined } | { cdi: string; uf?: undefined }
);

type Props = {
  tip: Tip;
  dados: Dados;
  porUf: Record<string, MunUf>;
  nomeDe: (n: string) => { nome: string } | undefined;
  fixo?: boolean; // cidade buscada: aparece também no celular
};

export default function Dica({ tip, dados, porUf, nomeDe, fixo = false }: Props) {
  let titulo = "";
  let apurado = 0;
  let linhas: { n: string; pct: number }[] = [];
  let faltam: number | null = null;

  if (tip.cdi) {
    const uf = ufDoMunicipio(tip.cdi);
    const d = porUf[uf];
    const m = d && lerMunicipio(d, tip.cdi);
    if (!d || !m) return null;
    titulo = `${d.nomes[tip.cdi] ?? "Município"} · ${uf.toUpperCase()}`;
    apurado = m.pst;
    linhas = m.cands.slice(0, 3);
  } else if (tip.uf) {
    const d = dados[tip.uf];
    if (!d) return null;
    titulo = NOMES[tip.uf];
    apurado = d.pst;
    linhas = d.cands.slice(0, 4);
    faltam = d.ts - d.st;
  }

  return (
    <div
      className={`card pointer-events-none absolute z-20 w-[230px] p-3 text-[12.5px] shadow-lg ${fixo ? "block" : "hidden md:block"}`}
      style={{ left: tip.x + 246 > tip.w ? tip.x - 242 : tip.x + 12, top: tip.y + 12 }}
    >
      <div className="mb-1.5 font-semibold">
        {titulo} <span className="font-normal text-ink3">· {pct(apurado, 1)} apurado</span>
      </div>
      {linhas.map((c) => (
        <div key={c.n} className="num flex justify-between gap-4">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="sw" style={{ background: cor(c.n) }} />
            <span className="truncate">{nomeDe(c.n)?.nome ?? c.n}</span>
          </span>
          <span>{pct(c.pct)}</span>
        </div>
      ))}
      {faltam !== null && (
        <div className="num mt-1.5 flex justify-between text-ink3">
          <span>faltam</span>
          <span>{fmt(faltam)} seções</span>
        </div>
      )}
    </div>
  );
}

export function CirculoPulsando({ el }: { el: SVGPathElement | null }) {
  if (!el) return null;
  const bb = el.getBBox();
  return (
    <circle cx={bb.x + bb.width / 2} cy={bb.y + bb.height / 2} r={6} fill="none" stroke="var(--ink)" strokeWidth={1.2}>
      <animate attributeName="r" values="4;12;4" dur="1.8s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="1;0;1" dur="1.8s" repeatCount="indefinite" />
    </circle>
  );
}
