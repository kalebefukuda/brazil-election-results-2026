import type { Resumo } from "@/lib/tse";
import { REGIOES, cor } from "@/lib/brasil";
import { agregar, type Dados } from "@/lib/calc";
import { fmt, pct } from "@/lib/format";

type Props = { dados: Dados; br: Resumo; a: string; b: string };

export default function Regioes({ dados, br, a, b }: Props) {
  const ordem = br.cands.slice(0, 4).map((c) => c.n);

  return (
    <section aria-labelledby="t-reg">
      <h2 id="t-reg" className="titulo mb-3 mt-2">
        Por região
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(REGIOES).map(([nome, ufs]) => {
          const ag = agregar(dados, ufs);
          const p = (n: string) => (ag.validos ? ((ag.votos[n] || 0) / ag.validos) * 100 : 0);
          const outros = Math.max(100 - p(a) - p(b), 0);
          return (
            <div key={nome} className="card p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{nome}</h3>
                <span className="num text-[12px] text-ink3">{pct(br.te ? (ag.te / br.te) * 100 : 0, 1)} do BR</span>
              </div>
              <p className="num mt-0.5 text-[12px] text-ink2">
                {pct(ag.pst, 1)} apurado · faltam {fmt(ag.ts - ag.st)} seções
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-empty">
                <div className="barra h-full bg-ink" style={{ width: `${ag.pst}%` }} />
              </div>
              <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-empty">
                {ag.validos > 0 && (
                  <>
                    <i className="barra block h-full" style={{ width: `${p(a)}%`, background: cor(a) }} />
                    <i className="barra block h-full" style={{ width: `${p(b)}%`, background: cor(b) }} />
                    <i className="barra block h-full" style={{ width: `${outros}%`, background: "var(--cx)" }} />
                  </>
                )}
              </div>
              <ul className="num mt-3 space-y-1 text-[12.5px]">
                {ordem.map((n) => (
                  <li key={n} className="flex justify-between gap-2">
                    <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                      <span className="sw" style={{ background: cor(n) }} />
                      {br.cands.find((c) => c.n === n)?.nome}
                    </span>
                    <span className={n === a || n === b ? "font-semibold" : "text-ink2"}>{pct(p(n))}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
