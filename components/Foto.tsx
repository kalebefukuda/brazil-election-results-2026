"use client";

import { useState } from "react";
import { ELEICOES, TSE_BASE } from "@/lib/eleicao";

// sq: sequencial do TSE ou, em anos passados, caminho de uma foto do próprio site (ver /creditos)
export default function Foto({ sq, nome, cor, tam = 40 }: { sq?: string; nome: string; cor: string; tam?: number }) {
  // guarda QUAL foto falhou: trocando de candidato (ou de ano), tenta de novo
  const [falhou, setFalhou] = useState<string | null>(null);
  const erro = falhou === sq;
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
          src={sq.startsWith("/") ? sq : `${TSE_BASE}/${ELEICOES[1].presidente}/fotos/br/${sq}.jpeg`}
          alt={nome}
          width={tam}
          height={tam}
          loading="lazy"
          className="h-full w-full object-cover object-top"
          onError={() => setFalhou(sq ?? null)}
        />
      ) : (
        iniciais
      )}
    </span>
  );
}
