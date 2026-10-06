"use client";

import { useSyncExternalStore } from "react";
import { ANO_ATUAL, ANOS, codigos, ELEICOES, urlDados, type Ano, type Turno } from "./eleicao";

// Qual eleição o site está mostrando: ano + turno.
// Em 2026 o 2º turno entra sozinho quando o TSE publica o arquivo nacional dele; anos passados abrem no 2º turno
// (o resultado final). Quem está vendo escolhe no cabeçalho, ou com ?ano=2022&turno=1 na URL.
type Estado = { ano: Ano; turno: Turno; tem2: boolean; escolhido: Turno | null };

let estado: Estado = { ano: ANO_ATUAL, turno: 1, tem2: false, escolhido: null };
const ouvintes = new Set<() => void>();

function mudar(parcial: Partial<Estado>) {
  const novo = { ...estado, ...parcial };
  const tem2 = novo.ano === ANO_ATUAL ? novo.tem2 : true;
  novo.turno = novo.escolhido ?? (novo.ano === ANO_ATUAL ? (tem2 ? 2 : 1) : 2);
  if (novo.ano === estado.ano && novo.turno === estado.turno && novo.tem2 === estado.tem2 && novo.escolhido === estado.escolhido) return;
  estado = novo;
  ouvintes.forEach((f) => f());
}

export function turnoAtual() {
  return estado.turno;
}

export function eleicaoAtual() {
  return codigos(estado.ano, estado.turno);
}

function lerUrl() {
  const q = new URLSearchParams(location.search);
  const t = q.get("turno");
  const a = Number(q.get("ano"));
  return {
    turno: t === "1" || t === "2" ? (Number(t) as Turno) : null,
    ano: ANOS.includes(a as Ano) ? (a as Ano) : null,
  };
}

async function existe2(): Promise<boolean> {
  const p = ELEICOES[2].presidente;
  try {
    const r = await fetch(`${urlDados(p, "br", "0001")}?nocache=${Date.now()}`, { cache: "no-store" });
    if (r.ok) return true;
    if (r.status === 404) return false;
  } catch {
    // rede ou CORS: pergunta pelo proxy
  }
  try {
    const r = await fetch(`/api/tse/br?e=${p}&c=0001`, { cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}

let leuUrl = false;

async function checar() {
  if (!leuUrl) {
    leuUrl = true;
    const u = lerUrl();
    if (u.ano || u.turno) mudar({ ano: u.ano ?? estado.ano, escolhido: u.turno });
  }
  // depois que o 2º turno de 2026 aparece ele não some: não precisa perguntar de novo
  if (!estado.tem2 && (await existe2())) mudar({ tem2: true });
}

// várias páginas pedem a eleição na mesma atualização: uma checagem vale por 30s
let checagem: { em: number; p: Promise<void> } | null = null;

export function descobrirTurno() {
  if (!checagem || Date.now() - checagem.em > 30_000) checagem = { em: Date.now(), p: checar() };
  return checagem.p.then(() => estado);
}

function gravarUrl() {
  const url = new URL(location.href);
  if (estado.ano === ANO_ATUAL) url.searchParams.delete("ano");
  else url.searchParams.set("ano", String(estado.ano));
  if (estado.escolhido) url.searchParams.set("turno", String(estado.escolhido));
  else url.searchParams.delete("turno");
  history.replaceState(null, "", url);
}

// seletores do cabeçalho: a escolha vai pra URL, pra quem compartilhar o link ver a mesma eleição
export function escolherTurno(t: Turno) {
  mudar({ escolhido: t });
  gravarUrl();
}

export function escolherAno(ano: Ano) {
  mudar({ ano, escolhido: null });
  gravarUrl();
}

export function useTurno() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => estado,
    () => estado
  );
}
