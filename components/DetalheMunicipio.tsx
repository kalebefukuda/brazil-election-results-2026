import { NOMES, cor, ufDoMunicipio } from "@/lib/brasil";
import { fmt, pct } from "@/lib/format";
import type { MunUf } from "@/lib/municipios";
import type { Resumo } from "@/lib/tse";

type Props = { d: MunUf; cdi: string; br: Resumo; onVerEstado: (uf: string) => void; onFechar: () => void };

export default function DetalheMunicipio({ d, cdi, br, onVerEstado, onFechar }: Props) {
  const v = d.mun[cdi];
  const uf = ufDoMunicipio(cdi);
  if (!v) return null;
  const [st, ts, validos] = v;
  const pst = ts ? (st / ts) * 100 : 0;
  const cands = d.cands
    .map((n, i) => {
      const votos = v[3 + i] ?? 0;
      const base = br.cands.find((c) => c.n === n);
      return {
        n,
        votos,
        pct: validos ? (votos / validos) * 100 : 0,
        nome: base?.nome ?? n,
        partido: base?.partido ?? "",
      };
    })
    .sort((x, y) => y.votos - x.votos);

  return (
    <section aria-labelledby="t-municipio">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="kicker">Município · {NOMES[uf]}</p>
          <h2 id="t-municipio" className="mt-1 text-[22px] font-bold tracking-[-0.025em]">
            {d.nomes[cdi] ?? "Município"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button className="btn inline-flex items-center font-semibold" onClick={() => onVerEstado(uf)}>
            Ver {NOMES[uf]} →
          </button>
          <button className="btn" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>

      <p className="num mt-2 text-[13px] text-ink2">
        {pct(pst, 1)} apurado · {fmt(st)} de {fmt(ts)} seções · {fmt(validos)} votos válidos
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-empty">
        <div className="barra h-full rounded-full bg-[var(--ok)]" style={{ width: `${pst}%` }} />
      </div>

      <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
        {cands.map((c) => (
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
    </section>
  );
}
