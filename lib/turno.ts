"use client";

import { useSyncExternalStore } from "react";
import { ELEICOES, urlDados, type Turno } from "./eleicao";

// turno que o site está mostrando: vira 2 sozinho quando o TSE publica o arquivo nacional do 2º turno
let turno: Turno = 1;
const ouvintes = new Set<() => void>();

function definir(t: Turno) {
  if (t !== turno) {
    turno = t;
    ouvintes.forEach((f) => f());
  }
  return t;
}

export function turnoAtual() {
  return turno;
}

async function checar(): Promise<Turno> {
  // ?turno=1 ou ?turno=2 na URL fixa o turno (pra rever o 1º depois que o 2º começar)
  const pedido = new URLSearchParams(location.search).get("turno");
  if (pedido === "1" || pedido === "2") return definir(Number(pedido) as Turno);
  if (turno === 2) return 2;

  const p = ELEICOES[2].presidente;
  try {
    const r = await fetch(`${urlDados(p, "br", "0001")}?nocache=${Date.now()}`, { cache: "no-store" });
    if (r.ok) return definir(2);
    if (r.status === 404) return definir(1);
  } catch {
    // rede ou CORS: pergunta pelo proxy
  }
  try {
    const r = await fetch(`/api/tse/br?e=${p}&c=0001`, { cache: "no-store" });
    if (r.ok) return definir(2);
  } catch {}
  return definir(1);
}

// várias páginas pedem o turno na mesma atualização: uma checagem vale por 30s
let checagem: { em: number; p: Promise<Turno> } | null = null;

export function descobrirTurno() {
  if (!checagem || Date.now() - checagem.em > 30_000) checagem = { em: Date.now(), p: checar() };
  return checagem.p;
}

export function useTurno() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => turno,
    () => 1 as Turno
  );
}
