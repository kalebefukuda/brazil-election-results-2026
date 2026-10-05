"use client";

import { useState } from "react";

// foto oficial do candidato (divulgação do TSE); se não carregar, mostra as iniciais
export default function Foto({ sq, nome, cor, tam = 40 }: { sq?: string; nome: string; cor: string; tam?: number }) {
  const [erro, setErro] = useState(false);
  const iniciais = nome
    .split(" ")
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  return (
    <span
      className="relative inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-empty font-semibold text-ink2"
      style={{ width: tam, height: tam, boxShadow: `0 0 0 2px ${cor}`, fontSize: tam * 0.36 }}
    >
      {sq && !erro ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://resultados.tse.jus.br/oficial/ele2026/6257/fotos/br/${sq}.jpeg`}
          alt={nome}
          width={tam}
          height={tam}
          loading="lazy"
          className="h-full w-full object-cover object-top"
          onError={() => setErro(true)}
        />
      ) : (
        iniciais
      )}
    </span>
  );
}
