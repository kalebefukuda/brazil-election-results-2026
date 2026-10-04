"use client";

import { useEffect, useState } from "react";
import type { Resumo } from "@/lib/tse";

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
  const [tema, setTema] = useState("dark");

  useEffect(() => {
    setTema(document.documentElement.dataset.theme || "dark");
  }, []);

  function trocarTema() {
    const novo = tema === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = novo;
    setTema(novo);
    try {
      localStorage.setItem("tema", novo);
    } catch {}
  }

  let status = "conectando…";
  if (p.atualizando) status = "atualizando…";
  else if (p.ultima) status = p.rodando ? `ao vivo · próxima em ${Math.max(p.falta, 0)}s` : "pausado";

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

      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-line px-3 text-[12px] text-ink2"
          aria-live="polite"
        >
          <span
            className={`h-2 w-2 rounded-full ${p.rodando ? "pulso" : ""}`}
            style={{ background: p.rodando ? "var(--ok)" : "var(--ink3)" }}
          />
          <span className="num">{status}</span>
        </span>
        <select
          className="btn"
          value={p.intervalo}
          onChange={(e) => p.onIntervalo(Number(e.target.value))}
          aria-label="Intervalo de atualização"
        >
          <option value={30}>a cada 30s</option>
          <option value={60}>a cada 1 min</option>
          <option value={120}>a cada 2 min</option>
          <option value={300}>a cada 5 min</option>
        </select>
        <button className="btn" onClick={p.onPausar}>
          {p.rodando ? "Pausar" : "Retomar"}
        </button>
        <button className="btn font-semibold" onClick={p.onAtualizar} disabled={p.atualizando}>
          Atualizar
        </button>
        <button className="btn" onClick={trocarTema} aria-label="Trocar tema claro/escuro" title="Tema">
          {tema === "dark" ? "☀" : "☾"}
        </button>
      </div>
    </header>
  );
}
