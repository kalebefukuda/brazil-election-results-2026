import Link from "next/link";
import type { Resumo } from "@/lib/tse";
import { NOMES, REGIAO_DE, cor } from "@/lib/brasil";
import { curto, fmt, pct } from "@/lib/format";

export default function DetalheEstado({ d, br, onFechar }: { d: Resumo; br: Resumo; onFechar: () => void }) {
  const peso = br.te ? (d.te / br.te) * 100 : 0;

  return (
    <section className="card entra p-5 sm:p-6" aria-labelledby="t-detalhe">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="kicker">{REGIAO_DE[d.uf]}</p>
          <h2 id="t-detalhe" className="mt-1 text-[22px] font-bold tracking-[-0.025em]">
            {NOMES[d.uf]}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {d.uf !== "zz" && (
            <Link href={`/estados/${d.uf}`} className="btn inline-flex items-center font-semibold">
              Governador, Senado e deputados →
            </Link>
          )}
          <button className="btn" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>

      <p className="num mt-2 text-[13px] text-ink2">
        {pct(d.pst, 1)} apurado · faltam {fmt(d.ts - d.st)} de {fmt(d.ts)} seções · {pct(peso, 1)} dos eleitores do
        Brasil · TSE {d.hora}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-empty">
        <div className="barra h-full rounded-full bg-[var(--ok)]" style={{ width: `${d.pst}%` }} />
      </div>

      <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
        {d.cands.map((c) => (
          <li key={c.n} className="border-b border-line2 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="sw" style={{ background: cor(c.n) }} />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{c.nome}</span>{" "}
                <span className="text-[12px] text-ink3">{c.partido}</span>
              </span>
              <span className="num font-bold">{pct(c.pct)}</span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-empty">
              <div className="barra h-full rounded-full" style={{ width: `${c.pct}%`, background: cor(c.n) }} />
            </div>
            <div className="num mt-1 text-[12px] text-ink2">{fmt(c.votos)} votos</div>
          </li>
        ))}
      </ul>

      <dl className="num mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-[11.5px] text-ink2">válidos</dt>
          <dd className="font-semibold">{fmt(d.validos)}</dd>
        </div>
        <div>
          <dt className="text-[11.5px] text-ink2">brancos / nulos</dt>
          <dd className="font-semibold">
            {fmt(d.brancos)} / {fmt(d.nulos)}
          </dd>
        </div>
        <div>
          <dt className="text-[11.5px] text-ink2">eleitorado</dt>
          <dd className="font-semibold">{curto(d.te)}</dd>
        </div>
        <div>
          <dt className="text-[11.5px] text-ink2">eleitores a apurar</dt>
          <dd className="font-semibold">{curto(d.esnt)}</dd>
        </div>
      </dl>
    </section>
  );
}
