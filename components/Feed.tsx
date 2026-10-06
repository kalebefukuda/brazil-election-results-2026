"use client";

import { NOMES, cor } from "@/lib/brasil";
import { fmt, pct } from "@/lib/format";
import { horaBrasilia, type EventoFeed } from "@/lib/historico";
import type { Resumo } from "@/lib/tse";

type Linha = { n: string; nome?: string; partido?: string; pct: number };

export default function Feed({ eventos, br }: { eventos: EventoFeed[]; br: Resumo }) {
  const nome = (l: Linha) => l.nome ?? br.cands.find((c) => c.n === l.n)?.nome ?? l.n;

  return (
    <section className="card flex min-h-0 flex-col p-5" aria-labelledby="t-feed">
      <h2 id="t-feed" className="titulo">
        Últimas atualizações
      </h2>
      {!eventos.length ? (
        <p className="mt-3 text-[12.5px] text-ink3">As novidades da apuração aparecem aqui assim que o TSE publicar.</p>
      ) : (
        <ol className="rolagem -mr-2 mt-2 min-h-0 flex-1 overflow-y-auto pr-2">
          {eventos.map((e, i) => (
            <li
              key={`${e.momento}-${e.tipo}-${e.uf ?? ""}-${i}`}
              className="flex gap-3 border-b border-line2 py-3 last:border-0"
            >
              <span className="num w-[42px] flex-none pt-0.5 text-[12px] text-ink3">{horaBrasilia(e.momento)}</span>
              <span
                aria-hidden
                className="mt-1 h-3 w-3 flex-none rounded-full border-2"
                style={{
                  borderColor:
                    e.tipo === "secoes"
                      ? "var(--ink2)"
                      : cor((e.dados.top as Linha[] | undefined)?.[0]?.n ?? (e.dados.eleito as Linha | undefined)?.n),
                }}
              />
              <div className="min-w-0 text-[13px] leading-snug">
                <Texto e={e} nome={nome} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Texto({ e, nome }: { e: EventoFeed; nome: (l: Linha) => string }) {
  if (e.tipo === "secoes") {
    const top = (e.dados.top as Linha[]) ?? [];
    return (
      <>
        <p className="text-ink2">
          <b className="font-semibold text-ink">+{fmt(e.dados.secoes as number)}</b> seções ·{" "}
          {pct(e.dados.pst as number, 1)} apurado
        </p>
        {top.map((l) => (
          <p key={l.n} className="num flex justify-between gap-3">
            <span className="truncate">{nome(l)}</span>
            <span style={{ color: cor(l.n) }}>{pct(l.pct, 1)}</span>
          </p>
        ))}
      </>
    );
  }
  if (e.tipo === "presidente") {
    const [a, b] = (e.dados.top as Linha[]) ?? [];
    return e.dados.md === "e" ? (
      <p>
        <b style={{ color: cor(a?.n) }}>{a && nome(a)}</b> está eleito presidente.
      </p>
    ) : (
      <p>
        <b style={{ color: cor(a?.n) }}>{a && nome(a)}</b> e <b style={{ color: cor(b?.n) }}>{b && nome(b)}</b> vão ao
        2º turno.
      </p>
    );
  }
  const eleito = e.dados.eleito as Linha;
  return (
    <p>
      <span className="text-ink2">{NOMES[e.uf ?? ""]}:</span> <b>{eleito && nome(eleito)}</b>
      {eleito?.partido && <span className="text-ink3"> ({eleito.partido})</span>} é eleito governador.
    </p>
  );
}
