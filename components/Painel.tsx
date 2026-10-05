"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtualizacao } from "@/lib/auto";
import { UFS } from "@/lib/brasil";
import { baixar, type Resumo } from "@/lib/tse";
import type { Dados } from "@/lib/calc";
import Topo from "./Topo";
import Manchete from "./Manchete";
import RegioesCompacto from "./RegioesCompacto";
import Projecao from "./Projecao";
import Mapa from "./Mapa";
import DetalheEstado from "./DetalheEstado";
import PesoRegioes from "./PesoRegioes";
import Saldo from "./Saldo";
import Regioes from "./Regioes";
import Evolucao, { type Ponto } from "./Evolucao";
import Tabela from "./Tabela";

const CHAVE_HIST = "hist-6257";

export default function Painel() {
  const [br, setBr] = useState<Resumo | null>(null);
  const [dados, setDados] = useState<Dados>({});
  const [erro, setErro] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [hist, setHist] = useState<Ponto[]>([]);
  const detalheRef = useRef<HTMLDivElement>(null);

  // histórico salvo no navegador (só pra este visitante)
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_HIST);
      if (salvo) setHist(JSON.parse(salvo));
    } catch {}
  }, []);

  const atualizar = useCallback(async () => {
    const todos = ["br", ...UFS];
    const res = await Promise.allSettled(todos.map((uf) => baixar(uf)));
    const novos: Dados = {};
    const falhas: string[] = [];
    let nacional: Resumo | null = null;

    res.forEach((r, i) => {
      if (r.status === "fulfilled") {
        if (todos[i] === "br") nacional = r.value;
        else novos[todos[i]] = r.value;
      } else falhas.push(todos[i].toUpperCase());
    });

    if (nacional) setBr(nacional);
    setDados((antigos) => ({ ...antigos, ...novos }));

    if (falhas.length === todos.length) {
      setErro("Não consegui falar com o TSE agora. Vou tentar de novo sozinho — ou toque em Atualizar.");
    } else if (falhas.length) {
      setErro(`Alguns estados não vieram (${falhas.join(", ")}). Mostrando o último dado deles.`);
    } else setErro("");

    if (nacional) {
      const n = nacional as Resumo;
      const [a, b] = n.cands;
      setHist((h) => {
        if (h.length && h[h.length - 1].hora === n.hora) return h;
        const novo = [...h, { hora: n.hora, pst: n.pst, a: a.pct, b: b.pct, an: a.n, bn: b.n }].slice(-400);
        try {
          localStorage.setItem(CHAVE_HIST, JSON.stringify(novo));
        } catch {}
        return novo;
      });
    }

  }, []);

  useAtualizacao(atualizar);

  function selecionar(uf: string | null) {
    setSelecionado((atual) => (atual === uf ? null : uf));
    if (uf) setTimeout(() => detalheRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  const a = br?.cands[0]?.n ?? "";
  const b = br?.cands[1]?.n ?? "";

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-12 pt-5 sm:px-6 sm:pt-8 xl:max-w-[1680px] xl:pt-4">
      <div className="xl:hidden">
        <Topo br={br} />
      </div>

      {erro && (
        <p role="status" className="mb-4 rounded-xl border border-line px-4 py-3 text-[13px] text-ink2">
          {erro}
        </p>
      )}

      {!br ? (
        <Carregando />
      ) : (
        <div className="entra flex flex-col gap-4 sm:gap-5">
          {/* painel: no desktop grande vira 3 colunas numa tela só, cada coluna rola sozinha */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:h-[calc(100vh-57px-32px)] xl:grid-cols-[360px_minmax(0,1fr)_360px] xl:gap-4">
            <div className="flex min-h-0 flex-col gap-4 sm:gap-5 xl:gap-4 xl:overflow-y-auto xl:pr-1 rolagem">
              <Manchete br={br} />
              <div className="hidden xl:block">
                <Evolucao hist={hist} br={br} />
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-4 xl:overflow-y-auto rolagem">
              <div className="xl:min-h-0 xl:flex-1">
                <Mapa dados={dados} br={br} a={a} b={b} selecionado={selecionado} onSelecionar={selecionar} />
              </div>
              <div ref={detalheRef}>
                {selecionado && dados[selecionado] && (
                  <DetalheEstado d={dados[selecionado]} br={br} onFechar={() => setSelecionado(null)} />
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-4 sm:gap-5 xl:gap-4 xl:overflow-y-auto xl:pl-1 rolagem">
              <RegioesCompacto dados={dados} br={br} a={a} b={b} />
              <Projecao dados={dados} br={br} />
              <div className="xl:hidden">
                <Evolucao hist={hist} br={br} />
              </div>
            </div>
          </div>

          <h2 className="kicker mt-6">Mais detalhes</h2>
          <PesoRegioes dados={dados} br={br} a={a} b={b} />
          <Saldo dados={dados} br={br} a={a} b={b} onSelecionar={selecionar} />
          <Regioes dados={dados} br={br} a={a} b={b} />
          <Tabela dados={dados} br={br} a={a} b={b} selecionado={selecionado} onSelecionar={selecionar} />
        </div>
      )}
    </main>
  );
}

function Carregando() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Carregando dados do TSE">
      <div className="card flex flex-col gap-4 p-5">
        <div className="skel h-4 w-24" />
        <div className="skel h-10 w-40" />
        <div className="skel h-2 w-full" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skel h-9 w-full" />
        ))}
      </div>
      <div className="card p-5">
        <div className="skel aspect-square w-full" />
      </div>
    </div>
  );
}
