import type { Resumo } from "@/lib/tse";
import { REGIOES, cor } from "@/lib/brasil";
import { agregar, saldo, type Dados } from "@/lib/calc";
import { curto, pct } from "@/lib/format";

type Props = { dados: Dados; br: Resumo; a: string; b: string };

export default function PesoRegioes({ dados, br, a, b }: Props) {
  const grupos = [...Object.entries(REGIOES), ["Exterior", ["zz"]] as [string, string[]]]
    .map(([nome, ufs]) => ({ nome, ag: agregar(dados, ufs) }))
    .sort((x, y) => y.ag.te - x.ag.te);
  const maior = grupos[0].ag.te || 1;
  const ca = br.cands.find((c) => c.n === a)!;
  const cb = br.cands.find((c) => c.n === b)!;

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="t-peso">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="t-peso" className="titulo">
          Peso de cada região
        </h2>
        <span className="kicker">por tamanho do eleitorado</span>
      </div>
      <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-ink2">
        O tamanho da barra é quanto a região pesa no Brasil. Dentro dela, a parte colorida é o que já foi apurado; a
        listrada é o que ainda falta contar. O saldo é quantos votos a mais o líder tem ali.
      </p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink2">
        <span className="inline-flex items-center gap-1.5">
          <span className="sw" style={{ background: cor(a) }} />
          {ca.nome}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="sw" style={{ background: cor(b) }} />
          {cb.nome}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="sw" style={{ background: "var(--cx)" }} />
          demais
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="sw listra" />
          falta apurar
        </span>
      </div>

      <ul className="mt-2">
        {grupos.map(({ nome, ag }) => {
          const peso = br.te ? (ag.te / br.te) * 100 : 0;
          const s = saldo(ag.votos, a, b);
          const share = (n: string) => (ag.validos ? (ag.votos[n] || 0) / ag.validos : 0);
          const outros = Math.max(1 - share(a) - share(b), 0);
          const quem = s >= 0 ? ca : cb;
          return (
            <li key={nome} className="grid grid-cols-[92px_minmax(0,1fr)_56px] items-center gap-x-3 gap-y-1 border-b border-line2 py-3 last:border-0 sm:grid-cols-[120px_minmax(0,1fr)_64px]">
              <span className="font-semibold">{nome}</span>
              <div className="h-3.5">
                <div
                  className="flex h-full gap-0.5 overflow-hidden rounded"
                  style={{ width: `${(ag.te / maior) * 100}%` }}
                  title={`${nome}: ${pct(peso, 1)} dos eleitores · ${pct(ag.pst, 1)} apurado`}
                >
                  {ag.validos > 0 &&
                    [
                      [a, share(a)],
                      [b, share(b)],
                      [null, outros],
                    ].map(([n, f], i) => (
                      <i
                        key={i}
                        className="barra block h-full flex-none"
                        style={{ width: `${ag.pst * (f as number)}%`, background: n ? cor(n as string) : "var(--cx)" }}
                      />
                    ))}
                  <i className="listra block h-full flex-1" />
                </div>
              </div>
              <span className="num text-right font-bold">{pct(peso, 1)}</span>
              <div className="num col-start-2 col-end-4 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-ink2">
                <span>
                  <b className="font-semibold text-ink">{curto(ag.te)}</b> eleitores
                </span>
                {s !== 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    saldo <span className="sw" style={{ background: cor(quem.n) }} />
                    <b className="font-semibold text-ink">
                      {quem.nome.split(" ")[0]} +{curto(Math.abs(s))}
                    </b>
                  </span>
                )}
                <span>
                  falta apurar <b className="font-semibold text-ink">{curto(ag.esnt)}</b> ({pct(100 - ag.pst, 0)})
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
