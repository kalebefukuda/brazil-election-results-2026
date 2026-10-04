"use client";

import { useEffect, useRef, useState } from "react";
import type { Resumo } from "@/lib/tse";
import { cor } from "@/lib/brasil";
import { pct } from "@/lib/format";

export type Ponto = { hora: string; pst: number; a: number; b: number; an: string; bn: string };

const ALTURA = 240;
const M = { t: 12, r: 14, b: 30, l: 40 };

export default function Evolucao({ hist, br }: { hist: Ponto[]; br: Resumo }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(500);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [ca, cb] = br.cands;
  // só pontos com os mesmos dois primeiros de agora
  const pts = hist.filter((p) => p.an === ca.n && p.bn === cb.n).sort((x, y) => x.pst - y.pst);

  const w = largura - M.l - M.r;
  const h = ALTURA - M.t - M.b;
  const valores = pts.flatMap((p) => [p.a, p.b]).concat(50);
  const yMin = Math.floor(Math.min(...valores) / 5) * 5 - 2;
  const yMax = Math.ceil(Math.max(...valores) / 5) * 5 + 2;
  const xMax = Math.max(10, Math.ceil(Math.max(...pts.map((p) => p.pst), 0) / 10) * 10);

  const x = (v: number) => M.l + (v / xMax) * w;
  const y = (v: number) => M.t + (1 - (v - yMin) / (yMax - yMin)) * h;
  const linha = (k: "a" | "b") => pts.map((p, i) => `${i ? "L" : "M"}${x(p.pst).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");

  const ticksY: number[] = [];
  for (let v = Math.ceil(yMin / 5) * 5; v <= yMax; v += 5) ticksY.push(v);
  const passoX = xMax <= 20 ? 5 : xMax <= 50 ? 10 : 20;
  const ticksX: number[] = [];
  for (let v = 0; v <= xMax; v += passoX) ticksX.push(v);

  function mover(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let melhor = 0;
    pts.forEach((p, i) => {
      if (Math.abs(x(p.pst) - px) < Math.abs(x(pts[melhor].pst) - px)) melhor = i;
    });
    setHover(melhor);
  }

  const ph = hover !== null ? pts[hover] : null;

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="t-evo">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="t-evo" className="titulo">
          Evolução na apuração
        </h2>
        <span className="kicker hidden sm:inline">% válidos × % apurado</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink2">
        {[ca, cb].map((c) => (
          <span key={c.n} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: cor(c.n) }} />
            {c.nome}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-ink3">
          <span className="w-4 border-t border-dashed border-ink3" />
          50% (vence no 1º turno)
        </span>
      </div>

      <div ref={boxRef} className="relative mt-3">
        {pts.length < 2 ? (
          <div className="flex h-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line px-6 text-center">
            <p className="font-semibold">O gráfico vai se desenhando sozinho</p>
            <p className="max-w-[340px] text-[12.5px] text-ink2">
              A cada nova totalização do TSE entra um ponto. Deixa a página aberta e volta daqui a pouco pra ver a
              curva.
            </p>
          </div>
        ) : (
          <svg
            width={largura}
            height={ALTURA}
            className="block touch-none"
            onPointerMove={mover}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label="Evolução da porcentagem dos dois primeiros conforme a apuração avança"
          >
            {ticksY.map((v) => (
              <g key={v}>
                <line x1={M.l} x2={M.l + w} y1={y(v)} y2={y(v)} stroke="var(--line2)" />
                <text x={M.l - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--ink3)">
                  {v}%
                </text>
              </g>
            ))}
            {ticksX.map((v) => (
              <text key={v} x={x(v)} y={ALTURA - 8} textAnchor="middle" fontSize={11} fill="var(--ink3)">
                {v}%
              </text>
            ))}
            <line
              x1={M.l}
              x2={M.l + w}
              y1={y(50)}
              y2={y(50)}
              stroke="var(--ink3)"
              strokeDasharray="4 4"
            />
            <path d={linha("a")} fill="none" stroke={cor(ca.n)} strokeWidth={2} strokeLinejoin="round" />
            <path d={linha("b")} fill="none" stroke={cor(cb.n)} strokeWidth={2} strokeLinejoin="round" />
            {ph && (
              <g>
                <line x1={x(ph.pst)} x2={x(ph.pst)} y1={M.t} y2={M.t + h} stroke="var(--ink3)" />
                <circle cx={x(ph.pst)} cy={y(ph.a)} r={4.5} fill={cor(ca.n)} stroke="var(--card)" strokeWidth={2} />
                <circle cx={x(ph.pst)} cy={y(ph.b)} r={4.5} fill={cor(cb.n)} stroke="var(--card)" strokeWidth={2} />
              </g>
            )}
          </svg>
        )}

        {ph && (
          <div
            className="card pointer-events-none absolute top-0 z-10 min-w-[180px] p-3 text-[12.5px] shadow-lg"
            style={{ left: Math.min(Math.max(x(ph.pst) - 90, 0), largura - 190) }}
          >
            <div className="num mb-1 font-semibold">
              {pct(ph.pst, 1)} apurado <span className="font-normal text-ink3">· {ph.hora}</span>
            </div>
            <div className="num flex justify-between gap-3">
              <span>{ca.nome}</span>
              <b>{pct(ph.a)}</b>
            </div>
            <div className="num flex justify-between gap-3">
              <span>{cb.nome}</span>
              <b>{pct(ph.b)}</b>
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11.5px] text-ink3">
        Os pontos ficam salvos no seu navegador, a partir de quando você abriu a página.
      </p>
    </section>
  );
}
