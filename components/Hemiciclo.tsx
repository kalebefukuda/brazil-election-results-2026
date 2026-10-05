"use client";

import { useMemo, useState } from "react";

export type Cadeira = { cor: string; forte: boolean; titulo: string };

// desenha as cadeiras em meia-lua: fileiras de dentro pra fora, preenchidas da esquerda pra direita
export default function Hemiciclo({ cadeiras, rotulo, sub }: { cadeiras: Cadeira[]; rotulo: string; sub: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = cadeiras.length;

  const pontos = useMemo(() => {
    const fileiras = n <= 60 ? 4 : n <= 200 ? 7 : 12;
    const r0 = 0.42;
    const raios = Array.from({ length: fileiras }, (_, i) => r0 + ((1 - r0) * i) / (fileiras - 1));
    const soma = raios.reduce((s, r) => s + r, 0);
    // quantas cadeiras em cada fileira (proporcional ao tamanho do arco)
    const qtd = raios.map((r) => Math.round((n * r) / soma));
    qtd[qtd.length - 1] += n - qtd.reduce((s, q) => s + q, 0);

    const lista: { x: number; y: number; ang: number }[] = [];
    raios.forEach((r, i) => {
      const k = qtd[i];
      for (let j = 0; j < k; j++) {
        const ang = k === 1 ? Math.PI / 2 : Math.PI - (j * Math.PI) / (k - 1);
        lista.push({ x: r * Math.cos(ang), y: -r * Math.sin(ang), ang });
      }
    });
    lista.sort((p, q) => q.ang - p.ang);
    return { lista, tam: ((1 - r0) / (fileiras - 1)) * 0.38 };
  }, [n]);

  const h = hover !== null ? cadeiras[hover] : null;

  return (
    <div className="relative">
      <svg viewBox="-1.08 -1.08 2.16 1.16" className="block h-auto w-full" role="img" aria-label={`${rotulo} ${sub}`}>
        {pontos.lista.map((p, i) => {
          const c = cadeiras[i];
          if (!c) return null;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={pontos.tam}
              fill={c.cor}
              opacity={c.forte ? 1 : 0.45}
              stroke={hover === i ? "var(--ink)" : "none"}
              strokeWidth={pontos.tam * 0.35}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{c.titulo}</title>
            </circle>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center">
        <p className="num text-[34px] font-extrabold leading-none tracking-[-0.04em]">{rotulo}</p>
        <p className="mt-1 text-[12px] text-ink2">{h ? h.titulo : sub}</p>
      </div>
    </div>
  );
}
