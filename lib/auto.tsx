"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// atualização automática global: o header controla, a página atual registra o que atualizar
type Auto = {
  rodando: boolean;
  intervalo: number;
  falta: number;
  atualizando: boolean;
  ultima: string;
  setIntervalo: (s: number) => void;
  pausar: () => void;
  agora: () => void;
  registrar: (fn: (() => Promise<void>) | null) => void;
};

const Ctx = createContext<Auto | null>(null);

export function AutoProvider({ children }: { children: React.ReactNode }) {
  const [rodando, setRodando] = useState(true);
  const [intervalo, setIntervalo] = useState(60);
  const [falta, setFalta] = useState(60);
  const [atualizando, setAtualizando] = useState(false);
  const [ultima, setUltima] = useState("");
  const fnRef = useRef<(() => Promise<void>) | null>(null);
  const ultimaVez = useRef(0);
  const intervaloRef = useRef(intervalo);
  intervaloRef.current = intervalo;

  const agora = useCallback(async () => {
    setFalta(intervaloRef.current);
    if (!fnRef.current) return;
    ultimaVez.current = Date.now();
    setAtualizando(true);
    try {
      await fnRef.current();
    } finally {
      setAtualizando(false);
      setUltima(new Date().toLocaleTimeString("pt-BR"));
    }
  }, []);

  const registrar = useCallback(
    (fn: (() => Promise<void>) | null) => {
      fnRef.current = fn;
      if (fn) agora();
    },
    [agora],
  );

  useEffect(() => {
    if (!rodando) return;
    const t = setInterval(() => setFalta((f) => f - 1), 1000);
    return () => clearInterval(t);
  }, [rodando]);

  useEffect(() => {
    if (falta <= 0) agora();
  }, [falta, agora]);

  useEffect(() => {
    setFalta(intervalo);
  }, [intervalo]);

  // voltou pra aba: atualiza na hora, se a última busca já tiver mais de 1 min
  useEffect(() => {
    const vis = () => {
      if (!document.hidden && rodando && Date.now() - ultimaVez.current > 60_000) agora();
    };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [rodando, agora]);

  return (
    <Ctx.Provider
      value={{
        rodando,
        intervalo,
        falta,
        atualizando,
        ultima,
        setIntervalo,
        pausar: () => setRodando((r) => !r),
        agora,
        registrar,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuto() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuto fora do AutoProvider");
  return c;
}

export function useAtualizacao(fn: () => Promise<void>) {
  const { registrar } = useAuto();
  useEffect(() => {
    registrar(fn);
    return () => registrar(null);
  }, [fn, registrar]);
}
