// selo com a situação que o TSE devolve (ou a tendência, enquanto apura)
export default function Situacao({ texto, eleito }: { texto: string; eleito?: boolean }) {
  if (!texto && !eleito) return null;
  const t = texto || "Eleito";
  const low = t.toLowerCase();

  let estilo = "border-line text-ink2";
  if (eleito || low.startsWith("eleit")) estilo = "border-transparent bg-[color-mix(in_srgb,var(--ok)_18%,transparent)] text-[var(--ok)]";
  else if (low.includes("tendência")) estilo = "border-line text-ink2";
  else if (low.includes("2º turno") || low.includes("2o turno")) estilo = "border-transparent bg-[color-mix(in_srgb,var(--c70)_18%,transparent)] text-[var(--c70)]";

  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${estilo}`}>
      {t}
    </span>
  );
}
