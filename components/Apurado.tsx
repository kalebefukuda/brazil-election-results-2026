import { curto, fmt, pct } from "@/lib/format";

export default function Apurado({
  pst,
  st,
  ts,
  esnt,
  className = "",
}: {
  pst: number;
  st: number;
  ts: number;
  esnt?: number;
  className?: string;
}) {
  const acabou = ts > 0 && st >= ts;
  return (
    <div className={className}>
      <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink2">Seções apuradas</p>
      <p className="num mt-1 text-[40px] font-extrabold leading-none tracking-[-0.045em] text-[var(--ok)] sm:text-[44px]">
        {pct(pst, 2)}
      </p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-empty">
        <div className="barra h-full rounded-full bg-[var(--ok)]" style={{ width: `${Math.min(pst, 100)}%` }} />
      </div>
      <div className="num mt-2 flex flex-wrap items-baseline justify-between gap-x-2 text-[12px] sm:text-[12.5px]">
        <span className="whitespace-nowrap text-ink2">
          {fmt(st)} de {fmt(ts)}
        </span>
        {acabou ? (
          <span className="font-semibold text-[var(--ok)]">apuração concluída</span>
        ) : (
          <span className="whitespace-nowrap">
            faltam <b className="text-[14px]">{fmt(ts - st)}</b> seções
          </span>
        )}
      </div>
      {!acabou && esnt !== undefined && esnt > 0 && (
        <p className="num mt-0.5 text-[11.5px] text-ink2 sm:text-right">
          {curto(esnt)} de eleitores ainda não apurados
        </p>
      )}
    </div>
  );
}
