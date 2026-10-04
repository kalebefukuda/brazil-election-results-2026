"use client";

import { useEffect, useState } from "react";

// atualização automática: chama `fn` a cada `intervalo` segundos enquanto estiver rodando
export function useAuto(fn: () => void, inicial = 60) {
  const [rodando, setRodando] = useState(true);
  const [intervalo, setIntervalo] = useState(inicial);
  const [falta, setFalta] = useState(inicial);

  useEffect(() => {
    if (!rodando) return;
    const t = setInterval(() => setFalta((f) => f - 1), 1000);
    return () => clearInterval(t);
  }, [rodando]);

  useEffect(() => {
    if (falta <= 0) {
      fn();
      setFalta(intervalo);
    }
  }, [falta, intervalo, fn]);

  useEffect(() => {
    setFalta(intervalo);
  }, [intervalo]);

  useEffect(() => {
    const vis = () => {
      if (!document.hidden && rodando) {
        fn();
        setFalta(intervalo);
      }
    };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [rodando, intervalo, fn]);

  return {
    rodando,
    falta,
    intervalo,
    setIntervalo,
    pausar: () => setRodando((r) => !r),
    agora: () => {
      fn();
      setFalta(intervalo);
    },
  };
}
