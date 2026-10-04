import type { Resumo } from "@/lib/tse";
import { cor } from "@/lib/brasil";
import { curto, fmt, pct } from "@/lib/format";

export default function Nacional({ br }: { br: Resumo }) {
  const top = br.cands.slice(0, 4);
  const resto = br.cands.slice(4);
  const comparec = br.comp + br.abst ? (br.comp / (br.comp + br.abst)) * 100 : 0;
  const lider = br.cands[0];

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="t-brasil">
      <div className="flex items-baseline justify-between">
        <h2 id="t-brasil" className="titulo">
          Brasil
        </h2>
        <span className="kicker">seções apuradas</span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="num text-[44px] font-extrabold leading-none tracking-[-0.04em] sm:text-[52px]">
          {pct(br.pst)}
        </div>
        <div className="num pb-1 text-right text-[12px] text-ink2">
          {fmt(br.st)} de {fmt(br.ts)}
          <br />
          faltam <b className="font-semibold text-ink">{fmt(br.ts - br.st)}</b>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-empty">
        <div className="barra h-full rounded-full bg-[var(--ok)]" style={{ width: `${br.pst}%` }} />
      </div>

      <ul className="mt-5">
        {top.map((c, i) => (
          <li key={c.n} className="border-b border-line2 py-3 last:border-0">
            <div className="flex items-center gap-2.5">
              <span className="sw" style={{ background: cor(c.n) }} />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{c.nome}</span>{" "}
                <span className="text-[12px] text-ink3">
                  {c.partido} · {c.n}
                </span>
              </span>
              <span className="num text-[19px] font-bold tracking-[-0.02em]">{pct(c.pct)}</span>
            </div>
            <div className="relative mt-2 h-1.5 rounded-full bg-empty">
              <div className="barra h-full rounded-full" style={{ width: `${c.pct}%`, background: cor(c.n) }} />
              {i === 0 && (
                <span className="absolute -top-1 bottom-[-4px] left-1/2 w-px bg-ink3" title="50% dos válidos" />
              )}
            </div>
            <div className="num mt-1.5 flex justify-between text-[12px] text-ink2">
              <span>{fmt(c.votos)} votos</span>
              {i === 0 && (
                <span>
                  {c.pct > 50 ? "acima de 50% dos válidos" : `faltam ${pct(50 - c.pct)} p/ 50%`}
                </span>
              )}
              {i === 1 && <span>{curto(lider.votos - c.votos)} atrás do 1º</span>}
            </div>
          </li>
        ))}
      </ul>

      {resto.length > 0 && (
        <div className="num mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-[12.5px] text-ink2 sm:grid-cols-2">
          {resto.map((c) => (
            <div key={c.n} className="flex justify-between gap-2">
              <span className="truncate">
                {c.nome} <span className="text-ink3">{c.partido}</span>
              </span>
              <span>{pct(c.pct)}</span>
            </div>
          ))}
        </div>
      )}

      <dl className="num mt-5 grid grid-cols-3 gap-3 border-t border-line2 pt-4">
        <div>
          <dt className="text-[11.5px] text-ink2">comparecimento</dt>
          <dd className="text-[16px] font-semibold">{pct(comparec, 1)}</dd>
        </div>
        <div>
          <dt className="text-[11.5px] text-ink2">válidos contados</dt>
          <dd className="text-[16px] font-semibold">{curto(br.validos)}</dd>
        </div>
        <div>
          <dt className="text-[11.5px] text-ink2">eleitores a apurar</dt>
          <dd className="text-[16px] font-semibold">{curto(br.esnt)}</dd>
        </div>
      </dl>
    </section>
  );
}
