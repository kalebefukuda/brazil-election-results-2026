"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PATHS, VIEWBOX } from "@/lib/mapa-paths";
import { NOMES, REGIAO_DE } from "@/lib/brasil";

// mapa pequeno só pra escolher o estado: a região filtrada fica em destaque
export default function MapaSelecao({ regiao }: { regiao: string }) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);

  function cor(uf: string) {
    if (uf === hover) return "var(--ink)";
    if (regiao === "Todas" || REGIAO_DE[uf] === regiao) return "color-mix(in srgb, var(--ink) 34%, var(--empty))";
    return "var(--empty)";
  }

  return (
    <div className="relative">
      <svg viewBox={VIEWBOX} className="mx-auto block h-auto w-full max-w-[300px]" role="group" aria-label="Escolha um estado no mapa">
        {Object.entries(PATHS).map(([uf, d]) => (
          <path
            key={uf}
            d={d}
            fill={cor(uf)}
            stroke="var(--card)"
            strokeWidth={1}
            className="cursor-pointer transition-[fill] duration-150"
            onMouseEnter={() => setHover(uf)}
            onMouseLeave={() => setHover(null)}
            onClick={() => router.push(`/estados/${uf}`)}
            role="link"
            aria-label={NOMES[uf]}
          >
            <title>{NOMES[uf]}</title>
          </path>
        ))}
      </svg>
      <p className="mt-2 h-5 text-center text-[13px] font-semibold">
        {hover ? NOMES[hover] : <span className="font-normal text-ink3">toque num estado</span>}
      </p>
    </div>
  );
}
