import type { Resumo } from "@/lib/tse";
import { NOMES, UFS, cor } from "@/lib/brasil";
import { saldo, votosDe, type Dados } from "@/lib/calc";
import { curto, pct } from "@/lib/format";

type Props = { dados: Dados; br: Resumo; a: string; b: string; onSelecionar: (uf: string) => void };

// barras divergentes: pra direita o 1º colocado nacional, pra esquerda o 2º
export default function Saldo({ dados, br, a, b, onSelecionar }: Props) {
  const ca = br.cands.find((c) => c.n === a)!;
  const cb = br.cands.find((c) => c.n === b)!;

  const linhas = UFS.filter((uf) => dados[uf]?.validos)
    .map((uf) => ({ uf, s: saldo(votosDe(dados[uf]), a, b), pst: dados[uf].pst }))
    .sort((x, y) => y.s - x.s);
  const maxAbs = Math.max(1, ...linhas.map((l) => Math.abs(l.s)));
  const total = saldo(votosDe(br), a, b);

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="t-saldo">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="t-saldo" className="titulo">
          Saldo de votos por estado
        </h2>
        <span className="kicker">quem puxa o placar</span>
      </div>
      <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-ink2">
        Diferença de votos entre {ca.nome} e {cb.nome} em cada estado, até agora. Somando tudo, {total >= 0 ? ca.nome : cb.nome}{" "}
        está <b className="font-semibold text-ink">{curto(Math.abs(total))} votos</b> na frente no Brasil.
      </p>

      <div className="num mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] text-[12px] font-semibold">
        <span className="inline-flex items-center gap-1.5 justify-self-start" style={{ color: cor(b) }}>
          ← {cb.nome}
        </span>
        <span className="inline-flex items-center gap-1.5 justify-self-end" style={{ color: cor(a) }}>
          {ca.nome} →
        </span>
      </div>

      <ul className="mt-2">
        {linhas.map((l) => {
          const largura = (Math.abs(l.s) / maxAbs) * 100;
          const positivo = l.s >= 0;
          return (
            <li key={l.uf}>
              <button
                className="grid w-full grid-cols-[34px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-2 rounded-md py-[3px] text-left hover:bg-card2"
                onClick={() => onSelecionar(l.uf)}
                title={`${NOMES[l.uf]} · ${pct(l.pst, 1)} apurado`}
              >
                <span className="text-[12px] font-semibold">{l.uf.toUpperCase()}</span>
                <span className="flex h-4 items-center justify-end border-r border-ink3">
                  {!positivo && (
                    <>
                      <span className="num mr-1.5 whitespace-nowrap text-[11px] text-ink2">+{curto(-l.s)}</span>
                      <i
                        className="barra block h-3 rounded-l-[3px]"
                        style={{ width: `${largura * 0.75}%`, background: cor(b) }}
                      />
                    </>
                  )}
                </span>
                <span className="flex h-4 items-center">
                  {positivo && (
                    <>
                      <i
                        className="barra block h-3 rounded-r-[3px]"
                        style={{ width: `${largura * 0.75}%`, background: cor(a) }}
                      />
                      <span className="num ml-1.5 whitespace-nowrap text-[11px] text-ink2">+{curto(l.s)}</span>
                    </>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
