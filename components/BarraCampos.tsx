import type { Campo } from "@/lib/partidos";

// barra esquerda / centro / direita com o número de cadeiras de cada lado
export default function BarraCampos({ cont, total, maioria }: { cont: Record<Campo, number>; total: number; maioria?: number }) {
  const w = (n: number) => `${(n / total) * 100}%`;
  return (
    <div>
      <div className="num flex items-end justify-between text-[13px]">
        <span>
          Esquerda <b className="text-[20px] font-extrabold">{cont.esquerda}</b>
        </span>
        <span className="text-ink2">
          Centro <b className="text-ink">{cont.centro}</b>
        </span>
        <span>
          <b className="text-[20px] font-extrabold">{cont.direita}</b> Direita
        </span>
      </div>
      <div className="relative mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full bg-empty">
        <i className="barra block h-full" style={{ width: w(cont.esquerda), background: "var(--c13)" }} />
        <i className="barra block h-full" style={{ width: w(cont.centro), background: "var(--cx)" }} />
        <i className="ml-auto block h-full" />
        <i className="barra block h-full" style={{ width: w(cont.direita), background: "var(--c22)" }} />
      </div>
      {maioria && (
        <div className="relative h-4">
          <span className="num absolute -translate-x-1/2 text-[11px] text-ink3" style={{ left: w(maioria) }}>
            maioria {maioria}
          </span>
        </div>
      )}
    </div>
  );
}
