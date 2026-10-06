"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuto } from "@/lib/auto";
import { useOnline } from "@/lib/online";
import { larguraPagina } from "@/lib/brasil";
import { escolherAno, escolherTurno, useTurno } from "@/lib/turno";
import { ANO_ATUAL, ANOS, type Ano } from "@/lib/eleicao";
import { IconePausa, IconePessoas, IconePlay } from "./Icones";
import Escolha from "./ui/Escolha";

export default function Nav() {
  const path = usePathname();
  const auto = useAuto();
  const online = useOnline();
  const turno = useTurno();
  // só presidente e governador têm 2º turno
  const comTurno = path === "/" || path.startsWith("/estados");
  const passado = turno.ano !== ANO_ATUAL;
  // página sem dados (créditos): só o tema
  const estatica = path === "/creditos";
  // links levam o ano/turno junto, pra URL mostrar o que está na tela
  const q = new URLSearchParams();
  if (passado) q.set("ano", String(turno.ano));
  if (turno.escolhido) q.set("turno", String(turno.escolhido));
  const sufixo = q.size ? `?${q}` : "";
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

  let status = "conectando…";
  let statusCurto = "…";
  if (auto.atualizando) {
    status = "atualizando…";
    statusCurto = "…";
  } else if (passado && auto.ultima) {
    status = "resultado final";
    statusCurto = "final";
  } else if (auto.ultima) {
    status = auto.rodando ? `ao vivo · ${Math.max(auto.falta, 0)}s` : "pausado";
    statusCurto = auto.rodando ? `${Math.max(auto.falta, 0)}s` : "pausado";
  }

  const botaoTema = (
    <button
      className="btn !min-h-[34px] !px-2.5"
      onClick={trocarTema}
      aria-label="Trocar tema claro/escuro"
      title="Tema"
    >
      {tema === "dark" ? "☀" : "☾"}
    </button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--bg)_90%,transparent)] backdrop-blur">
      <div
        className={`mx-auto flex ${larguraPagina(path)} flex-col px-4 sm:px-6 lg:h-[56px] lg:flex-row lg:items-center lg:gap-4`}
      >
        <div className="flex h-[48px] items-center gap-1 lg:h-auto">
          <nav className="flex min-w-0 gap-1 overflow-x-auto" aria-label="Seções">
            {links.map((l) => (
              <Link
                key={l.href}
                href={`${l.href}${sufixo}`}
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

        {/* no celular os controles quebram linha em vez de sair da tela */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2.5 lg:ml-auto lg:flex-nowrap lg:pb-0">
          {estatica ? (
            botaoTema
          ) : (
            <>
              <Escolha
                rotulo="Ano da eleição"
                valor={String(turno.ano)}
                opcoes={ANOS.map((a) => ({ valor: String(a), texto: String(a) }))}
                onMudar={(a) => {
                  escolherAno(Number(a) as Ano);
                  auto.agora();
                }}
                className="num font-semibold"
              />
              {comTurno && (
                <div
                  className="inline-flex h-[34px] flex-none rounded-full border border-line p-0.5"
                  role="group"
                  aria-label="Turno"
                >
                  {([1, 2] as const).map((t) => {
                    const bloqueado = t === 2 && !passado && !turno.tem2;
                    return (
                      <button
                        key={t}
                        className={`whitespace-nowrap rounded-full px-3 text-[12px] font-medium transition-colors ${
                          turno.turno === t ? "bg-ink text-bg" : "text-ink2 hover:text-ink"
                        } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink2`}
                        aria-pressed={turno.turno === t}
                        disabled={bloqueado}
                        title={
                          bloqueado
                            ? "O 2º turno é em 25/10. Aparece aqui quando o TSE publicar os primeiros dados."
                            : undefined
                        }
                        onClick={() => {
                          if (turno.turno === t) return;
                          escolherTurno(t);
                          auto.agora();
                        }}
                      >
                        {t}º turno
                      </button>
                    );
                  })}
                </div>
              )}
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
                className="num inline-flex h-[34px] items-center gap-2 whitespace-nowrap rounded-full border border-line px-3 text-[12px] text-ink2 sm:min-w-[128px]"
                aria-live="polite"
                title={auto.ultima ? `Última atualização às ${auto.ultima}` : undefined}
              >
                <span
                  className={`h-2 w-2 flex-none rounded-full ${auto.rodando && !passado ? "pulso" : ""}`}
                  style={{ background: auto.rodando && !passado ? "var(--ok)" : "var(--ink3)" }}
                />
                <span className="sm:hidden">{statusCurto}</span>
                <span className="hidden sm:inline">{status}</span>
              </span>
              {/* ano passado: intervalo e pausa somem mas guardam o lugar, pra nada pular */}
              <div className={`flex items-center gap-1.5 ${passado ? "invisible" : ""}`} aria-hidden={passado}>
                <Escolha
                  rotulo="Intervalo de atualização"
                  valor={String(auto.intervalo)}
                  opcoes={[
                    { valor: "60", texto: "1 min" },
                    { valor: "120", texto: "2 min" },
                    { valor: "300", texto: "5 min" },
                  ]}
                  alinhar="direita"
                  onMudar={(v) => auto.setIntervalo(Number(v))}
                  desligado={passado}
                />
                <button
                  className="btn !min-h-[34px] !px-2.5"
                  onClick={auto.pausar}
                  aria-label={auto.rodando ? "Pausar atualização" : "Retomar atualização"}
                  title={auto.rodando ? "Pausar" : "Retomar"}
                  disabled={passado}
                  tabIndex={passado ? -1 : undefined}
                >
                  {auto.rodando ? <IconePausa /> : <IconePlay />}
                </button>
              </div>
              {botaoTema}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
