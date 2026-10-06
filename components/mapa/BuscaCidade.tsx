"use client";

import { useId, useMemo, useState } from "react";
import { ufDoMunicipio } from "@/lib/brasil";
import type { MunUf } from "@/lib/municipios";

// "São José" acha "sao jose"
const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

type Props = {
  porUf: Record<string, MunUf>;
  onEscolher: (cdi: string | null) => void;
};

export default function BuscaCidade({ porUf, onEscolher }: Props) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const id = useId();

  const todos = useMemo(() => {
    const lista: { cdi: string; nome: string; uf: string; chave: string }[] = [];
    for (const d of Object.values(porUf))
      for (const [cdi, nome] of Object.entries(d.nomes))
        lista.push({ cdi, nome, uf: ufDoMunicipio(cdi), chave: normal(nome) });
    return lista;
  }, [porUf]);

  const achados = useMemo(() => {
    const q = normal(texto);
    if (q.length < 2) return [];
    const comeca = todos.filter((m) => m.chave.startsWith(q));
    const contem = todos.filter((m) => !m.chave.startsWith(q) && m.chave.includes(q));
    return [...comeca, ...contem].slice(0, 8);
  }, [texto, todos]);

  function escolher(i: number) {
    const m = achados[i];
    if (!m) return;
    setTexto(`${m.nome} · ${m.uf.toUpperCase()}`);
    setAberto(false);
    onEscolher(m.cdi);
  }

  return (
    <div className="relative">
      <input
        type="search"
        role="combobox"
        aria-expanded={aberto && achados.length > 0}
        aria-controls={id}
        aria-autocomplete="list"
        aria-activedescendant={aberto && achados[ativo] ? `${id}-${achados[ativo].cdi}` : undefined}
        aria-label="Buscar cidade no mapa"
        placeholder={todos.length ? "Buscar cidade…" : "Carregando cidades…"}
        disabled={!todos.length}
        className="btn !min-h-[32px] w-[170px] !text-[16px] placeholder:text-ink3 focus:w-[220px] sm:w-[190px] sm:!text-[12px]"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
          setAtivo(0);
          if (!e.target.value) onEscolher(null);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setAtivo((a) => Math.min(a + 1, achados.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setAtivo((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            escolher(ativo);
          } else if (e.key === "Escape") {
            setAberto(false);
          }
        }}
      />
      {aberto && achados.length > 0 && (
        <ul id={id} role="listbox" className="card absolute right-0 z-30 mt-1 w-[240px] overflow-hidden p-1 shadow-lg">
          {achados.map((m, i) => (
            <li
              key={m.cdi}
              id={`${id}-${m.cdi}`}
              role="option"
              aria-selected={i === ativo}
              className={`flex cursor-pointer justify-between gap-3 rounded-md px-2.5 py-1.5 text-[12.5px] ${
                i === ativo ? "bg-card2 text-ink" : "text-ink2"
              }`}
              onMouseEnter={() => setAtivo(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(i);
              }}
            >
              <span className="truncate">{m.nome}</span>
              <span className="text-ink3">{m.uf.toUpperCase()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
