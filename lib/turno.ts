"use client";

import { useSyncExternalStore } from "react";
import { baixarArquivo } from "./arquivo";
import { ANO_ATUAL, ANOS, codigos, ELEICOES, type Ano, type Turno } from "./eleicao";

// Eleição na tela: em 2026 o 2º turno entra sozinho quando o TSE publica o arquivo nacional;
// anos passados abrem no 2º turno (resultado final). ?ano=&turno= na URL fixa a escolha.
type Estado = { ano: Ano; turno: Turno; tem2: boolean; escolhido: Turno | null };

let estado: Estado = { ano: ANO_ATUAL, turno: 1, tem2: false, escolhido: null };
const ouvintes = new Set<() => void>();

function mudar(parcial: Partial<Estado>) {
  const novo = { ...estado, ...parcial };
  const tem2 = novo.ano === ANO_ATUAL ? novo.tem2 : true;
  // um link com ?turno=2 antes do TSE publicar o 2º turno não pode forçar uma eleição sem dados
  const escolhido = novo.escolhido === 2 && !tem2 ? null : novo.escolhido;
  novo.turno = escolhido ?? (novo.ano === ANO_ATUAL ? (tem2 ? 2 : 1) : 2);
  if (
    novo.ano === estado.ano &&
    novo.turno === estado.turno &&
    novo.tem2 === estado.tem2 &&
    novo.escolhido === estado.escolhido
  )
    return;
  estado = novo;
  ouvintes.forEach((f) => f());
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

async function existe2() {
  return baixarArquivo(ELEICOES[2].presidente, "br", "0001").then(
    () => true,
    () => false,
  );
}

// muda a cada troca de ano/turno: quem buscou dados de outra eleição descarta a resposta
export function chaveEleicao() {
  return `${estado.ano}-${estado.turno}`;
}

let leuUrl = false;

async function checar() {
  if (!leuUrl) {
    leuUrl = true;
    const u = lerUrl();
    if (u.ano || u.turno) mudar({ ano: u.ano ?? estado.ano, escolhido: u.turno });
  }
  // depois que o 2º turno aparece ele não some: não precisa perguntar de novo
  if (!estado.tem2 && (await existe2())) mudar({ tem2: true });
}

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

// a escolha vai pra URL: quem recebe o link vê a mesma eleição
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
    () => estado,
  );
}
