"use client";

import { useEffect, useRef, useState } from "react";
import { PATHS, VIEWBOX } from "@/lib/mapa-paths";
import { NOMES, cor } from "@/lib/brasil";
import { lider, type Dados } from "@/lib/calc";
import type { Resumo } from "@/lib/tse";
import { fmt, pct } from "@/lib/format";

type Modo = "lider" | "a" | "b" | "apurado";

type Props = {
  dados: Dados;
  br: Resumo;
  a: string;
  b: string;
  selecionado: string | null;
  onSelecionar: (uf: string) => void;
};

// estados pequenos: sigla escura, menor e um pouco deslocada pro mar
const AJUSTE: Record<string, [number, number]> = {
  df: [8, -2], go: [-6, 8], rn: [10, -6], pb: [14, 0], pe: [14, 2], al: [12, 4],
  se: [12, 6], es: [12, 4], rj: [6, 8], sc: [4, 0], to: [0, 8], ma: [4, 0],
};
const PEQUENOS = ["df", "rn", "pb", "pe", "al", "se", "es", "rj"];

export default function Mapa({ dados, br, a, b, selecionado, onSelecionar }: Props) {
  const [modo, setModo] = useState<Modo>("lider");
  const [centros, setCentros] = useState<Record<string, [number, number]>>({});
  const [tip, setTip] = useState<{ uf: string; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const ca = br.cands.find((c) => c.n === a)!;
  const cb = br.cands.find((c) => c.n === b)!;

  // calcula o centro de cada estado uma vez pra colocar a sigla
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const c: Record<string, [number, number]> = {};
    svg.querySelectorAll<SVGPathElement>("path[data-uf]").forEach((p) => {
      const bb = p.getBBox();
      const uf = p.dataset.uf!;
      const aj = AJUSTE[uf] || [0, 0];
      c[uf] = [bb.x + bb.width / 2 + aj[0], bb.y + bb.height / 2 + aj[1]];
    });
    setCentros(c);
  }, []);

  function preencher(uf: string) {
    const d = dados[uf];
    if (!d || !d.st) return "var(--empty)";
    if (modo === "apurado") {
      return `color-mix(in srgb, var(--ink) ${Math.round(10 + d.pst * 0.85)}%, var(--empty))`;
    }
    if (modo === "a" || modo === "b") {
      const n = modo === "a" ? a : b;
      const p = d.cands.find((c) => c.n === n)?.pct ?? 0;
      // 20% -> claro, 75% -> forte
      const forca = Math.max(8, Math.min(100, ((p - 20) / 55) * 100));
      return `color-mix(in srgb, ${cor(n)} ${Math.round(forca)}%, var(--empty))`;
    }
    const li = lider(d);
    if (!li) return "var(--empty)";
    const forca = 35 + Math.round((Math.min(li.margem, 30) / 30) * 65);
    return `color-mix(in srgb, ${cor(li.cand.n)} ${forca}%, var(--empty))`;
  }

  const modos: [Modo, string][] = [
    ["lider", "Quem lidera"],
    ["a", ca.nome.split(" ")[0]],
    ["b", cb.nome.split(" ")[0]],
    ["apurado", "% apurado"],
  ];

  const lideres = new Set(Object.values(dados).map((d) => lider(d)?.cand.n).filter(Boolean));
  const dTip = tip ? dados[tip.uf] : null;

  return (
    <section className="card relative p-5 sm:p-6" aria-labelledby="t-mapa">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="t-mapa" className="titulo">
          Mapa por estado
        </h2>
        <span className="text-[12px] text-ink3">toque num estado pra ver detalhes</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="O que o mapa mostra">
        {modos.map(([m, t]) => (
          <button key={m} className="btn !min-h-[32px] !text-[12px]" aria-pressed={modo === m} onClick={() => setModo(m)}>
            {t}
          </button>
        ))}
      </div>

      <svg
        ref={svgRef}
        viewBox={VIEWBOX}
        className="mx-auto mt-3 block h-auto w-full max-w-[560px]"
        role="img"
        aria-label="Mapa do Brasil por estado"
        onMouseLeave={() => setTip(null)}
      >
        {Object.entries(PATHS).map(([uf, d]) => (
          <path
            key={uf}
            d={d}
            data-uf={uf}
            fill={preencher(uf)}
            stroke={selecionado === uf ? "var(--ink)" : "var(--card)"}
            strokeWidth={selecionado === uf ? 2 : 1}
            className="cursor-pointer transition-[fill] duration-500 hover:brightness-110"
            onMouseMove={(e) => setTip({ uf, x: e.clientX, y: e.clientY })}
            onClick={() => onSelecionar(uf)}
          >
            <title>{NOMES[uf]}</title>
          </path>
        ))}
        {Object.entries(centros).map(([uf, [x, y]]) => (
          <text
            key={uf}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            pointerEvents="none"
            fontSize={PEQUENOS.includes(uf) ? 8 : 10}
            fontWeight={650}
            fill={PEQUENOS.includes(uf) ? "var(--ink)" : "#fff"}
            style={PEQUENOS.includes(uf) ? undefined : { paintOrder: "stroke", stroke: "rgba(0,0,0,.25)", strokeWidth: 2 }}
          >
            {uf.toUpperCase()}
          </text>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink2">
        {modo === "lider" && (
          <>
            {[a, b, ...br.cands.slice(2).map((c) => c.n)]
              .filter((n) => lideres.has(n))
              .map((n) => (
                <span key={n} className="inline-flex items-center gap-1.5">
                  <Escala n={n} />
                  {br.cands.find((c) => c.n === n)?.nome} lidera
                </span>
              ))}
            <span className="text-ink3">cor mais forte = vantagem maior</span>
          </>
        )}
        {(modo === "a" || modo === "b") && (
          <span className="inline-flex items-center gap-1.5">
            <Escala n={modo === "a" ? a : b} />% dos válidos de {(modo === "a" ? ca : cb).nome} (20% → 75%+)
          </span>
        )}
        {modo === "apurado" && <span>tom mais forte = mais seções já apuradas</span>}
        <span className="inline-flex items-center gap-1.5">
          <span className="sw" style={{ background: "var(--empty)" }} /> sem apuração
        </span>
      </div>

      {tip && dTip && (
        <div
          className="card pointer-events-none fixed z-20 hidden min-w-[210px] p-3 text-[12.5px] shadow-lg md:block"
          style={{ left: Math.min(tip.x + 14, window.innerWidth - 240), top: tip.y + 14 }}
        >
          <div className="mb-1.5 font-semibold">
            {NOMES[tip.uf]} <span className="font-normal text-ink3">· {pct(dTip.pst, 1)} apurado</span>
          </div>
          {dTip.cands.slice(0, 4).map((c) => (
            <div key={c.n} className="num flex justify-between gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="sw" style={{ background: cor(c.n) }} />
                {c.nome}
              </span>
              <span>{pct(c.pct)}</span>
            </div>
          ))}
          <div className="num mt-1.5 flex justify-between text-ink3">
            <span>faltam</span>
            <span>{fmt(dTip.ts - dTip.st)} seções</span>
          </div>
        </div>
      )}
    </section>
  );
}

function Escala({ n }: { n: string }) {
  return (
    <span className="inline-flex gap-0.5">
      {[35, 68, 100].map((f) => (
        <i
          key={f}
          className="block h-2 w-3.5 rounded-[2px]"
          style={{ background: `color-mix(in srgb, ${cor(n)} ${f}%, var(--empty))` }}
        />
      ))}
    </span>
  );
}
