import type { Resumo } from "@/lib/tse";
import { UFS, cor } from "@/lib/brasil";
import { projetar, type Dados } from "@/lib/calc";
import { curto, pct, pp } from "@/lib/format";

export default function Projecao({ dados, br }: { dados: Dados; br: Resumo }) {
  const proj = projetar(dados, UFS);
  const lista = br.cands
    .map((c) => ({ ...c, final: proj.pcts[c.n] ?? 0, votosFinal: proj.votos[c.n] ?? 0 }))
    .sort((x, y) => y.final - x.final);
  const principais = lista.slice(0, 5);
  const primeiro = lista[0];
  const segundo = lista[1];

  // quanto mais apurado, mais confiável
  let confianca = "baixa";
  if (br.pst >= 60) confianca = "alta";
  else if (br.pst >= 30) confianca = "média";

  let veredito: string;
  if (br.pst >= 99.9) veredito = "Apuração encerrada.";
  else if (primeiro.final > 50) veredito = `Nesse ritmo, ${primeiro.nome} venceria no 1º turno.`;
  else veredito = `Nesse ritmo, teria 2º turno entre ${primeiro.nome} e ${segundo.nome}.`;

  const perto = Math.abs(primeiro.final - 50) < 1.5 && br.pst < 99.9;

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="t-proj">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="t-proj" className="titulo">
          Projeção do resultado
        </h2>
        <span className="kicker">estimativa · não oficial</span>
      </div>

      <p className="mt-3 text-[20px] font-bold leading-snug tracking-[-0.02em]">{veredito}</p>
      {perto && (
        <p className="mt-1 text-[13px] text-ink2">
          Está perto da linha de 50% — dá pra virar com pouca diferença. Vale esperar mais apuração.
        </p>
      )}

      <ul className="mt-4">
        {principais.map((c) => {
          const muda = c.final - c.pct;
          return (
            <li key={c.n} className="py-2">
              <div className="flex items-center gap-2.5">
                <span className="sw" style={{ background: cor(c.n) }} />
                <span className="min-w-0 flex-1 truncate font-medium">{c.nome}</span>
                <span className="num text-[12px] text-ink3">agora {pct(c.pct, 1)}</span>
                <span className="num w-[64px] text-right font-bold">{pct(c.final, 1)}</span>
              </div>
              <div className="relative mt-1.5 h-1.5 rounded-full bg-empty">
                <div className="barra h-full rounded-full" style={{ width: `${c.final}%`, background: cor(c.n) }} />
                <span
                  className="absolute -top-1 bottom-[-4px] w-0.5 rounded bg-ink"
                  style={{ left: `${c.pct}%` }}
                  title="% atual"
                />
              </div>
              <div className="num mt-1 flex justify-between text-[11.5px] text-ink3">
                <span>≈ {curto(c.votosFinal)} votos no final</span>
                <span>{Math.abs(muda) >= 0.05 ? pp(muda) : "estável"}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 border-t border-line2 pt-3 text-[12px] leading-relaxed text-ink2">
        Como é calculado: em cada estado, supõe que as seções que faltam votam igual às já apuradas ali. Confiança{" "}
        <b className="font-semibold text-ink">{confianca}</b> com {pct(br.pst, 1)} apurado — capital e interior
        costumam entrar em horários diferentes, então a projeção oscila no começo. O resultado oficial é o do TSE.
      </p>
    </section>
  );
}
