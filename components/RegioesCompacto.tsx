import type { Resumo } from "@/lib/tse";
import { REGIOES, cor } from "@/lib/brasil";
import { agregar, type Dados } from "@/lib/calc";
import { curto, pct } from "@/lib/format";

type Props = { dados: Dados; br: Resumo; a: string; b: string };

export default function RegioesCompacto({ dados, br, a, b }: Props) {
  const grupos: [string, string[]][] = [...Object.entries(REGIOES), ["Exterior", ["zz"]]];
  const nome = (n: string) => br.cands.find((c) => c.n === n)?.nome.split(" ")[0] ?? "";

  return (
    <section className="card p-5" aria-labelledby="t-regc">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="t-regc" className="titulo">
          Por região
        </h2>
        <span className="text-[12px] text-ink3">quem lidera</span>
      </div>
      <ul className="mt-2">
        {grupos.map(([regiao, ufs]) => {
          const ag = agregar(dados, ufs);
          const pa = ag.validos ? ((ag.votos[a] || 0) / ag.validos) * 100 : 0;
          const pb = ag.validos ? ((ag.votos[b] || 0) / ag.validos) * 100 : 0;
          const lider = pa >= pb ? a : b;
          const margem = Math.abs(pa - pb);
          return (
            <li key={regiao} className="border-b border-line2 py-2.5 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{regiao}</span>
                <span className="num flex items-center gap-2 text-[13px]">
                  <span className="sw" style={{ background: cor(lider) }} />
                  <span className="text-ink2">{nome(lider)}</span>
                  <b>{pct(Math.max(pa, pb), 1)}</b>
                  <span className="w-12 text-right text-[12px] text-ink3">
                    +{margem.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  </span>
                </span>
              </div>
              <div className="num mt-0.5 flex justify-between text-[11.5px] text-ink3">
                <span>
                  {pct(ag.pst, 1)} apurado · faltam {curto(ag.esnt)} eleitores
                </span>
              </div>
              <div className="relative mt-1.5 h-1 rounded-full bg-empty">
                <div
                  className="barra absolute left-0 top-0 h-full rounded-l-full"
                  style={{ width: `${pa}%`, background: cor(a) }}
                />
                <div
                  className="barra absolute right-0 top-0 h-full rounded-r-full"
                  style={{ width: `${pb}%`, background: cor(b) }}
                />
                <span className="absolute -top-1 bottom-[-4px] left-1/2 w-px bg-ink3" />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
