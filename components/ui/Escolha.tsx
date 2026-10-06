"use client";

import { useEffect, useId, useRef, useState } from "react";

export type Opcao = { valor: string; texto: string; cor?: string; detalhe?: string };

type Props = {
  rotulo: string;
  valor: string;
  opcoes: Opcao[];
  onMudar: (valor: string) => void;
  // texto do botão; sem ele, mostra o texto da opção escolhida
  rotuloBotao?: React.ReactNode;
  ativo?: boolean;
  desligado?: boolean;
  alinhar?: "esquerda" | "direita";
  className?: string;
};

// lista no tema do site: o <select> nativo abre branco e ilegível no tema escuro
export default function Escolha({
  rotulo,
  valor,
  opcoes,
  onMudar,
  rotuloBotao,
  ativo = false,
  desligado = false,
  alinhar = "esquerda",
  className = "",
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [foco, setFoco] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const id = useId();
  const atual = opcoes.find((o) => o.valor === valor);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false);
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  useEffect(() => {
    if (aberto) lista.current?.querySelector(`[data-i="${foco}"]`)?.scrollIntoView({ block: "nearest" });
  }, [aberto, foco]);

  function abrir() {
    setFoco(
      Math.max(
        0,
        opcoes.findIndex((o) => o.valor === valor),
      ),
    );
    setAberto(true);
  }

  function escolher(i: number) {
    const o = opcoes[i];
    if (!o) return;
    onMudar(o.valor);
    setAberto(false);
    botao.current?.focus();
  }

  function teclado(e: React.KeyboardEvent) {
    if (!aberto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    const mover: Record<string, number> = { ArrowDown: foco + 1, ArrowUp: foco - 1, Home: 0, End: opcoes.length - 1 };
    if (e.key in mover) {
      e.preventDefault();
      setFoco(Math.min(opcoes.length - 1, Math.max(0, mover[e.key])));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      escolher(foco);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setAberto(false);
    }
  }

  return (
    <div ref={caixa} className="relative flex-none" onKeyDown={teclado}>
      <button
        ref={botao}
        type="button"
        role="combobox"
        className={`btn inline-flex !min-h-[34px] items-center gap-2 !pl-3 !pr-2.5 !text-[12px] ${ativo ? "ativo" : ""} ${className}`}
        aria-label={rotulo}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={id}
        aria-activedescendant={aberto ? `${id}-${foco}` : undefined}
        disabled={desligado}
        tabIndex={desligado ? -1 : undefined}
        onClick={() => (aberto ? setAberto(false) : abrir())}
      >
        {rotuloBotao ?? atual?.texto}
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 opacity-60 transition-transform ${aberto ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M3 4.5 6 7.5l3-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {aberto && (
        <ul
          ref={lista}
          id={id}
          role="listbox"
          aria-label={rotulo}
          tabIndex={-1}
          className={`card rolagem absolute z-40 mt-1.5 max-h-[320px] min-w-full overflow-y-auto p-1 shadow-xl ${
            alinhar === "direita" ? "right-0" : "left-0"
          }`}
        >
          {opcoes.map((o, i) => (
            <li
              key={o.valor}
              id={`${id}-${i}`}
              data-i={i}
              role="option"
              aria-selected={o.valor === valor}
              className={`flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-2 text-[13px] ${
                i === foco ? "bg-card2 text-ink" : "text-ink2"
              }`}
              onPointerEnter={() => setFoco(i)}
              onClick={() => escolher(i)}
            >
              {o.cor && <span className="sw" style={{ background: o.cor }} />}
              <span className="flex-1">{o.texto}</span>
              {o.detalhe && <span className="text-[11.5px] text-ink3">{o.detalhe}</span>}
              <svg
                viewBox="0 0 12 12"
                className={`h-3 w-3 ${o.valor === valor ? "text-ink" : "invisible"}`}
                aria-hidden
              >
                <path
                  d="m2.5 6.5 2.2 2.2L9.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
