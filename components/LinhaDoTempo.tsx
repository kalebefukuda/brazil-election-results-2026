"use client";

import { useEffect, useState } from "react";
import { horaBrasilia } from "@/lib/historico";

type Props = {
  momentos: string[];
  indice: number | null; // null = ao vivo
  onMudar: (i: number | null) => void;
};

// barra embaixo do mapa: arrasta pra rever a apuração em qualquer momento; "Ao vivo" volta pro agora
export default function LinhaDoTempo({ momentos, indice, onMudar }: Props) {
  const [tocando, setTocando] = useState(false);
  const ultimo = momentos.length - 1;
  const valor = indice ?? ultimo;

  useEffect(() => {
    if (!tocando) return;
    const t = setInterval(() => {
      const prox = (indice ?? -1) + 1;
      if (prox >= ultimo) {
        setTocando(false);
        onMudar(null);
      } else onMudar(prox);
    }, 350);
    return () => clearInterval(t);
  }, [tocando, indice, ultimo, onMudar]);

  if (momentos.length < 2) return null;

  // uma marca a cada 2 horas cheias, posicionada pelo índice da foto mais próxima
  const marcas: { i: number; txt: string }[] = [];
  let ultimaHora = "";
  momentos.forEach((m, i) => {
    const h = horaBrasilia(m).slice(0, 2);
    if (h !== ultimaHora && Number(h) % 2 === 1) marcas.push({ i, txt: `${Number(h)}h` });
    ultimaHora = h;
  });

  return (
    <div className="card flex items-center gap-3 px-4 py-3 sm:gap-4">
      <button
        className="btn !min-h-[32px] !px-2.5"
        onClick={() => {
          if (!tocando && indice === null) onMudar(0);
          setTocando((t) => !t);
        }}
        aria-label={tocando ? "Pausar replay" : "Rever a apuração do começo"}
        title={tocando ? "Pausar" : "Rever do começo"}
      >
        {tocando ? "❚❚" : "▶"}
      </button>
      <span className="num w-[52px] flex-none text-[15px] font-semibold">{horaBrasilia(momentos[valor])}</span>

      <div className="relative min-w-0 flex-1 pb-4">
        <input
          type="range"
          min={0}
          max={ultimo}
          value={valor}
          onChange={(e) => {
            setTocando(false);
            const i = Number(e.target.value);
            onMudar(i === ultimo ? null : i);
          }}
          aria-label="Momento da apuração"
          aria-valuetext={horaBrasilia(momentos[valor])}
          className="tempo w-full"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 text-[11px] text-ink3">
          {marcas.map((m) => (
            <span key={m.i} className="num absolute -translate-x-1/2" style={{ left: `${(m.i / ultimo) * 100}%` }}>
              {m.txt}
            </span>
          ))}
        </div>
      </div>

      <button
        className="btn inline-flex !min-h-[32px] items-center gap-1.5 !text-[12px]"
        aria-pressed={indice === null}
        onClick={() => {
          setTocando(false);
          onMudar(null);
        }}
      >
        <span className={`h-2 w-2 rounded-full ${indice === null ? "pulso" : ""}`} style={{ background: "var(--ok)" }} />
        Ao vivo
      </button>
    </div>
  );
}
