"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UFS } from "@/lib/brasil";
import { baixar, type Resumo } from "@/lib/tse";
import type { Dados } from "@/lib/calc";
import Topo from "./Topo";
import Nacional from "./Nacional";
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
  const [atualizando, setAtualizando] = useState(false);
  const [ultima, setUltima] = useState("");
  const [rodando, setRodando] = useState(true);
  const [intervalo, setIntervalo] = useState(60);
  const [falta, setFalta] = useState(60);
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
    setAtualizando(true);
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

    setUltima(new Date().toLocaleTimeString("pt-BR"));
    setAtualizando(false);
  }, []);

  useEffect(() => {
    atualizar();
  }, [atualizar]);

  // contagem regressiva
  useEffect(() => {
    if (!rodando) return;
    const t = setInterval(() => setFalta((f) => f - 1), 1000);
    return () => clearInterval(t);
  }, [rodando]);

  useEffect(() => {
    if (falta <= 0) {
      atualizar();
      setFalta(intervalo);
    }
  }, [falta, intervalo, atualizar]);

  useEffect(() => {
    setFalta(intervalo);
  }, [intervalo]);

  // voltou pra aba: atualiza na hora
  useEffect(() => {
    const fn = () => {
      if (!document.hidden && rodando) {
        atualizar();
        setFalta(intervalo);
      }
    };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, [rodando, intervalo, atualizar]);

  function selecionar(uf: string | null) {
    setSelecionado((atual) => (atual === uf ? null : uf));
    if (uf) setTimeout(() => detalheRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  const a = br?.cands[0]?.n ?? "";
  const b = br?.cands[1]?.n ?? "";

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
      <Topo
        br={br}
        ultima={ultima}
        atualizando={atualizando}
        rodando={rodando}
        falta={falta}
        intervalo={intervalo}
        onIntervalo={setIntervalo}
        onPausar={() => setRodando((r) => !r)}
        onAtualizar={() => {
          atualizar();
          setFalta(intervalo);
        }}
      />

      {erro && (
        <p role="status" className="mb-4 rounded-xl border border-line px-4 py-3 text-[13px] text-ink2">
          {erro}
        </p>
      )}

      {!br ? (
        <Carregando />
      ) : (
        <div className="entra flex flex-col gap-4 sm:gap-5">
          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <Nacional br={br} />
            <Mapa dados={dados} br={br} a={a} b={b} selecionado={selecionado} onSelecionar={selecionar} />
          </div>

          <div ref={detalheRef}>
            {selecionado && dados[selecionado] && (
              <DetalheEstado d={dados[selecionado]} br={br} onFechar={() => setSelecionado(null)} />
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            <Projecao dados={dados} br={br} />
            <Evolucao hist={hist} br={br} />
          </div>

          <PesoRegioes dados={dados} br={br} a={a} b={b} />
          <Saldo dados={dados} br={br} a={a} b={b} onSelecionar={selecionar} />
          <Regioes dados={dados} br={br} a={a} b={b} />
          <Tabela dados={dados} br={br} a={a} b={b} selecionado={selecionado} onSelecionar={selecionar} />
        </div>
      )}

      <footer className="mt-12 border-t border-line pt-6 text-[12px] leading-relaxed text-ink3">
        <p>
          Fonte:{" "}
          <a
            className="underline underline-offset-2 hover:text-ink2"
            href="https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6257/uf/br/cargo/1/vis/nominal/rguf/br/resumo-geral"
            target="_blank"
            rel="noopener noreferrer"
          >
            resultados.tse.jus.br
          </a>{" "}
          (arquivos públicos de divulgação). Percentuais sobre votos válidos, como no TSE. Site independente, sem
          vínculo com o TSE — o resultado oficial é sempre o do TSE.
        </p>
        <p className="mt-2">
          Mapa:{" "}
          <a
            className="underline underline-offset-2 hover:text-ink2"
            href="https://github.com/VictorCazanave/svg-maps"
            target="_blank"
            rel="noopener noreferrer"
          >
            svg-maps/brazil
          </a>{" "}
          (CC BY 4.0).
        </p>
      </footer>
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
