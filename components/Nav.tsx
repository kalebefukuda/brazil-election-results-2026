"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuto } from "@/lib/auto";
import { useOnline } from "@/lib/online";
import { IconeAtualizar, IconePausa, IconePessoas, IconePlay } from "./Icones";

export default function Nav() {
  const path = usePathname();
  const auto = useAuto();
  const online = useOnline();
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

  const links = [
    { href: "/", txt: "Presidente", ativo: path === "/" },
    { href: "/estados", txt: "Governadores", ativo: path.startsWith("/estados") },
    { href: "/senado", txt: "Senado", ativo: path === "/senado" },
    { href: "/deputados", txt: "Deputados", ativo: path === "/deputados" },
  ];

  // no celular o texto fica mais curto pra caber tudo numa linha
  let status = "conectando…";
  let statusCurto = "…";
  if (auto.atualizando) {
    status = "atualizando…";
    statusCurto = "…";
  } else if (auto.ultima) {
    status = auto.rodando ? `ao vivo · ${Math.max(auto.falta, 0)}s` : "pausado";
    statusCurto = auto.rodando ? `${Math.max(auto.falta, 0)}s` : "pausado";
  }

  const botaoTema = (
    <button className="btn !min-h-[34px] !px-2.5" onClick={trocarTema} aria-label="Trocar tema claro/escuro" title="Tema">
      {tema === "dark" ? "☀" : "☾"}
    </button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--bg)_90%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-[1240px] flex-col px-4 sm:px-6 lg:h-[56px] lg:flex-row lg:items-center lg:gap-4">
        {/* linha 1: navegação */}
        <div className="flex h-[48px] items-center gap-1 lg:h-auto">
          <nav className="flex min-w-0 gap-1 overflow-x-auto" aria-label="Seções">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-lg px-2 py-2 text-[12.5px] font-medium transition-colors sm:px-3 sm:text-[13px] ${
                  l.ativo ? "bg-card text-ink" : "text-ink2 hover:text-ink"
                }`}
                aria-current={l.ativo ? "page" : undefined}
              >
                {l.txt}
              </Link>
            ))}
          </nav>
        </div>

        {/* linha 2 (no celular) / direita (no desktop): ao vivo + controles */}
        <div className="flex h-[44px] items-center gap-1.5 overflow-x-auto lg:ml-auto lg:h-auto">
          {online !== null && (
            <span
              className="num inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-3 text-[12px] text-ink2"
              title="Pessoas com o site aberto agora"
            >
              <IconePessoas className="h-3.5 w-3.5" />
              <b className="font-semibold text-ink">{online.toLocaleString("pt-BR")}</b>
              <span className="hidden sm:inline">online</span>
            </span>
          )}
          <span
            className="num inline-flex h-[34px] items-center gap-2 whitespace-nowrap rounded-full border border-line px-3 text-[12px] text-ink2"
            aria-live="polite"
            title={auto.ultima ? `Última atualização às ${auto.ultima}` : undefined}
          >
            <span
              className={`h-2 w-2 flex-none rounded-full ${auto.rodando ? "pulso" : ""}`}
              style={{ background: auto.rodando ? "var(--ok)" : "var(--ink3)" }}
            />
            <span className="sm:hidden">{statusCurto}</span>
            <span className="hidden sm:inline">{status}</span>
          </span>
          <select
            className="btn !min-h-[34px] !px-2 !text-[12px]"
            value={auto.intervalo}
            onChange={(e) => auto.setIntervalo(Number(e.target.value))}
            aria-label="Intervalo de atualização"
          >
            <option value={30}>30s</option>
            <option value={60}>1 min</option>
            <option value={120}>2 min</option>
            <option value={300}>5 min</option>
          </select>
          <button
            className="btn !min-h-[34px] !px-2.5"
            onClick={auto.pausar}
            aria-label={auto.rodando ? "Pausar atualização" : "Retomar atualização"}
            title={auto.rodando ? "Pausar" : "Retomar"}
          >
            {auto.rodando ? <IconePausa /> : <IconePlay />}
          </button>
          <button
            className="btn inline-flex !min-h-[34px] items-center gap-1.5 !px-2.5 font-semibold"
            onClick={auto.agora}
            disabled={auto.atualizando}
            title="Atualizar agora"
          >
            <IconeAtualizar className={`h-4 w-4 ${auto.atualizando ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          {botaoTema}
        </div>
      </div>
    </header>
  );
}
