"use client";

import { useState } from "react";
import type { Resumo } from "@/lib/tse";
import { cor } from "@/lib/brasil";
import { curto, fmt, pct } from "@/lib/format";
import Foto from "./Foto";
import Apurado from "./Apurado";
import { IconeCompartilhar, IconeTelaCheia } from "./Icones";

// placar principal do Presidente: manchete + duelo dos dois primeiros
export default function Manchete({ br }: { br: Resumo }) {
  const [a, b] = br.cands;
  const resto = br.cands.slice(2);
  const dif = a.votos - b.votos;
  const pontos = a.pct - b.pct;
  const comparec = br.comp + br.abst ? (br.comp / (br.comp + br.abst)) * 100 : 0;
  const brancosNulos = br.total ? ((br.brancos + br.nulos) / br.total) * 100 : 0;
  const primeiroNome = (nome: string) => nome.split(" ")[0];
  const [copiado, setCopiado] = useState(false);

  let titulo = (
    <>
      <span style={{ color: cor(a.n) }}>{a.nome}</span> lidera por {curto(dif)} de votos
    </>
  );
  if (br.definido === "e")
    titulo = (
      <>
        <span style={{ color: cor(a.n) }}>{a.nome}</span> está eleito no 1º turno
      </>
    );
  else if (br.definido === "s")
    titulo = (
      <>
        Vai ter 2º turno: <span style={{ color: cor(a.n) }}>{primeiroNome(a.nome)}</span> ×{" "}
        <span style={{ color: cor(b.n) }}>{primeiroNome(b.nome)}</span>
      </>
    );

  // no celular abre o menu de compartilhar do sistema; no computador copia o resumo + link
  async function compartilhar() {
    const texto = `Apuração Presidente 2026 (${pct(br.pst, 1)} das seções): ${a.nome} ${pct(a.pct, 1)} × ${b.nome} ${pct(b.pct, 1)}`;
    const celular = window.matchMedia("(pointer: coarse)").matches;
    try {
      if (celular && navigator.share) {
        await navigator.share({ title: "Apuração Presidente 2026", text: texto, url: location.href });
        return;
      }
      await navigator.clipboard.writeText(`${texto}\n${location.href}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {}
  }

  function telaCheia() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }

  return (
    <section className="card p-5" aria-labelledby="t-manchete">
      <div className="flex items-center justify-between gap-2">
        <p className="kicker">Presidente · Brasil</p>
        <div className="flex gap-1">
          <button
            className={`btn inline-flex !min-h-[30px] items-center gap-1.5 !px-2.5 !text-[12px] ${copiado ? "!border-[var(--ok)] !text-[var(--ok)]" : ""}`}
            onClick={compartilhar}
            title="Copia o resultado e o link do site pra mandar pra alguém"
            aria-live="polite"
          >
            {copiado ? "✓ Link copiado" : (
              <>
                <IconeCompartilhar className="h-3.5 w-3.5" /> Compartilhar
              </>
            )}
          </button>
          <button className="btn hidden !min-h-[30px] !px-2 sm:inline-flex sm:items-center" onClick={telaCheia} title="Tela cheia" aria-label="Tela cheia">
            <IconeTelaCheia />
          </button>
        </div>
      </div>

      <Apurado pst={br.pst} st={br.st} ts={br.ts} esnt={br.esnt} className="mt-3 rounded-xl border border-line2 bg-card2 p-3 sm:p-3.5" />

      <h1 id="t-manchete" className="mt-4 text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[28px]">
        {titulo}
      </h1>

      {/* duelo */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[a, b].map((c, i) => (
          <div key={c.n} className={i === 1 ? "text-right" : ""}>
            <div className={`flex items-center gap-2.5 ${i === 1 ? "flex-row-reverse" : ""}`}>
              <Foto sq={c.sq} nome={c.nome} cor={cor(c.n)} tam={44} />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold leading-tight">{c.nome}</p>
                <p className="text-[12px]" style={{ color: cor(c.n) }}>
                  {c.partido} {c.n}
                </p>
              </div>
            </div>
            <p className="num mt-2 text-[34px] font-extrabold leading-none tracking-[-0.04em]">{pct(c.pct)}</p>
            <p className="num mt-1 text-[12px] text-ink2">{fmt(c.votos)} votos</p>
          </div>
        ))}
      </div>

      {/* barra de duas pontas com a marca dos 50% */}
      <div className="relative mt-4 h-2.5 rounded-full bg-empty">
        <div className="barra absolute left-0 top-0 h-full rounded-l-full" style={{ width: `${a.pct}%`, background: cor(a.n) }} />
        <div className="barra absolute right-0 top-0 h-full rounded-r-full" style={{ width: `${b.pct}%`, background: cor(b.n) }} />
        <span className="absolute -top-1.5 bottom-[-6px] left-1/2 w-0.5 -translate-x-1/2 rounded bg-ink" title="50% dos válidos" />
      </div>
      <div className="num mt-1.5 flex justify-between text-[11.5px] text-ink2">
        <span>{a.pct >= 50 ? "passou dos 50%" : `faltam ${pct(50 - a.pct, 1).replace("%", "")} pontos`}</span>
        <span className="text-ink3">50%</span>
        <span>{b.pct >= 50 ? "passou dos 50%" : `faltam ${pct(50 - b.pct, 1).replace("%", "")} pontos`}</span>
      </div>

      <dl className="num mt-4 space-y-1.5 border-t border-line2 pt-3 text-[13px]">
        <div className="flex justify-between">
          <dt className="text-ink2">Vantagem</dt>
          <dd className="font-semibold">{pontos.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pontos</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink2">Por apurar</dt>
          <dd className="font-semibold">{curto(br.esnt)} de eleitores</dd>
        </div>
      </dl>

      <ul className="mt-3 border-t border-line2 pt-2">
        {resto.slice(0, 3).map((c) => (
          <li key={c.n} className="flex items-center gap-2.5 py-1.5">
            <Foto sq={c.sq} nome={c.nome} cor={cor(c.n)} tam={28} />
            <span className="min-w-0 flex-1 truncate text-[13px]">
              <span className="font-medium">{c.nome}</span> <span className="text-ink3">{c.partido}</span>
            </span>
            <span className="num text-[13px] font-semibold">{pct(c.pct, 1)}</span>
          </li>
        ))}
        {resto.length > 3 && (
          <li className="num pt-1 text-[12px] text-ink3">
            Mais {resto.length - 3} candidaturas somam {pct(resto.slice(3).reduce((s, c) => s + c.pct, 0), 1)}
          </li>
        )}
      </ul>

      <dl className="num mt-3 grid grid-cols-3 gap-2 border-t border-line2 pt-3">
        <div>
          <dt className="text-[11px] text-ink2">Votos válidos</dt>
          <dd className="text-[14px] font-semibold">{curto(br.validos)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-ink2">Comparecimento</dt>
          <dd className="text-[14px] font-semibold">{pct(comparec, 1)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-ink2">Brancos e nulos</dt>
          <dd className="text-[14px] font-semibold">{pct(brancosNulos, 1)}</dd>
        </div>
      </dl>
    </section>
  );
}
