import { cor } from "@/lib/brasil";
import { FAIXAS_APURADO, misturar } from "@/lib/cores";
import { fmt } from "@/lib/format";

export type ModoMapa = "municipios" | "estados" | "vantagem" | "apurado" | "candidato";

type Props = {
  modo: ModoMapa;
  a: string;
  b: string;
  cand: string;
  nomeDe: (n: string) => { nome: string; partido: string } | undefined;
  lideresMun: Record<string, number>;
  lideresUf: string[];
  ufsCarregadas: number;
  replay: boolean;
};

export default function Legenda({ modo, a, b, cand, nomeDe, lideresMun, lideresUf, ufsCarregadas, replay }: Props) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink2">
      {modo === "municipios" && (
        <>
          {Object.entries(lideresMun)
            .sort((p, q) => q[1] - p[1])
            .slice(0, 4)
            .map(([n, qtd]) => (
              <span key={n} className="num inline-flex items-center gap-1.5">
                <span className="sw" style={{ background: cor(n) }} />
                {nomeDe(n)?.partido ?? n} <b className="text-ink">{fmt(qtd)}</b>
              </span>
            ))}
          <span className="text-ink3">
            {ufsCarregadas < 27
              ? `municípios · carregando ${ufsCarregadas}/27 estados`
              : "municípios · cor mais forte = vantagem maior"}
          </span>
        </>
      )}
      {modo === "estados" && (
        <>
          {replay && <span className="text-ink3">no replay o mapa mostra os estados ·</span>}
          {lideresUf.map((n) => (
            <span key={n} className="inline-flex items-center gap-1.5">
              <Escala n={n} />
              {nomeDe(n)?.nome} lidera
            </span>
          ))}
          <span className="text-ink3">cor mais forte = vantagem maior</span>
        </>
      )}
      {modo === "vantagem" && (
        <>
          <span className="inline-flex items-center gap-1.5">
            <Escala n={a} /> {nomeDe(a)?.nome} na frente
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Escala n={b} /> {nomeDe(b)?.nome} na frente
          </span>
          <span className="text-ink3">até 40 pontos de diferença</span>
        </>
      )}
      {modo === "candidato" && (
        <span className="inline-flex items-center gap-1.5">
          <Escala n={cand} />% dos válidos de {nomeDe(cand)?.nome} (20% → 75%+)
        </span>
      )}
      {modo === "apurado" && (
        <>
          <span>seções apuradas:</span>
          {FAIXAS_APURADO.map((f) => (
            <span key={f.ate} className="inline-flex items-center gap-1.5">
              <span className="sw" style={{ background: misturar("var(--ok)", f.forca) }} />
              {f.txt}
            </span>
          ))}
        </>
      )}
    </div>
  );
}

function Escala({ n }: { n: string }) {
  return (
    <span className="inline-flex gap-0.5">
      {[35, 68, 100].map((f) => (
        <i key={f} className="block h-2 w-3.5 rounded-[2px]" style={{ background: misturar(cor(n), f) }} />
      ))}
    </span>
  );
}
