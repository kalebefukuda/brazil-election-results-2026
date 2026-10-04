"use client";

type Props = {
  atualizando: boolean;
  ultima: string;
  rodando: boolean;
  falta: number;
  intervalo: number;
  onIntervalo: (s: number) => void;
  onPausar: () => void;
  onAtualizar: () => void;
};

export default function Controles(p: Props) {
  let status = "conectando…";
  if (p.atualizando) status = "atualizando…";
  else if (p.ultima) status = p.rodando ? `ao vivo · próxima em ${Math.max(p.falta, 0)}s` : "pausado";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-line px-3 text-[12px] text-ink2"
        aria-live="polite"
      >
        <span
          className={`h-2 w-2 rounded-full ${p.rodando ? "pulso" : ""}`}
          style={{ background: p.rodando ? "var(--ok)" : "var(--ink3)" }}
        />
        <span className="num">{status}</span>
      </span>
      <select
        className="btn"
        value={p.intervalo}
        onChange={(e) => p.onIntervalo(Number(e.target.value))}
        aria-label="Intervalo de atualização"
      >
        <option value={30}>a cada 30s</option>
        <option value={60}>a cada 1 min</option>
        <option value={120}>a cada 2 min</option>
        <option value={300}>a cada 5 min</option>
      </select>
      <button className="btn" onClick={p.onPausar}>
        {p.rodando ? "Pausar" : "Retomar"}
      </button>
      <button className="btn font-semibold" onClick={p.onAtualizar} disabled={p.atualizando}>
        Atualizar
      </button>
    </div>
  );
}
