"use client";

import type { Resumo } from "@/lib/tse";
import Controles from "./Controles";

type Props = {
  br: Resumo | null;
  ultima: string;
  atualizando: boolean;
  rodando: boolean;
  falta: number;
  intervalo: number;
  onIntervalo: (s: number) => void;
  onPausar: () => void;
  onAtualizar: () => void;
};

export default function Topo(p: Props) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="kicker mb-2">Eleições 2026 · 1º turno</p>
        <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[36px]">
          Apuração para Presidente
        </h1>
        <p className="mt-2 text-[13px] text-ink2">
          Dados oficiais do TSE
          {p.br && (
            <>
              {" "}
              · totalização de <span className="num">{p.br.data}</span> às{" "}
              <span className="num font-semibold text-ink">{p.br.hora}</span>
            </>
          )}
        </p>
      </div>
      <Controles {...p} />
    </header>
  );
}
