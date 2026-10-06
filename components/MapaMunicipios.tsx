"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useAuto } from "@/lib/auto";
import { UFS_ESTADOS, cor, ufDoMunicipio } from "@/lib/brasil";
import type { MunUf } from "@/lib/municipios";

export type Malha = { viewBox: string; mun: Record<string, string> };
export type ModoMun = "lider" | "vantagem" | "candidato" | "apurado";

// a malha (≈250 KB) só é baixada quando alguém abre um modo que usa município
let malhaP: Promise<Malha> | null = null;
function carregarMalha() {
  malhaP ??= fetch("/malha/municipios.json").then((r) => {
    if (!r.ok) throw new Error(`malha: HTTP ${r.status}`);
    return r.json();
  });
  malhaP.catch(() => (malhaP = null));
  return malhaP;
}

// busca as 27 UFs e vai mostrando conforme cada uma chega; atualiza junto com o resto do site
export function useMunicipios(ativo: boolean, eleicao: string) {
  const { ultima } = useAuto();
  const [malha, setMalha] = useState<Malha | null>(null);
  const [porUf, setPorUf] = useState<Record<string, MunUf>>({});
  const [falhas, setFalhas] = useState(0);
  const atual = useRef(porUf);
  atual.current = porUf;

  useEffect(() => {
    if (ativo) carregarMalha().then(setMalha, () => {});
  }, [ativo]);

  useEffect(() => {
    setPorUf((p) => (Object.values(p).some((d) => d.eleicao !== eleicao) ? {} : p));
  }, [eleicao]);

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    for (const uf of UFS_ESTADOS) {
      // estado que já terminou de apurar não muda mais: não busca de novo
      const tem = atual.current[uf];
      if (tem?.eleicao === eleicao && concluida(tem)) continue;
      fetch(`/api/municipios/${uf}?e=${eleicao}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: MunUf | null) => {
          if (!vivo) return;
          if (d) setPorUf((p) => ({ ...p, [uf]: d }));
          else setFalhas((f) => f + 1);
        })
        .catch(() => vivo && setFalhas((f) => f + 1));
    }
    return () => {
      vivo = false;
    };
  }, [ativo, eleicao, ultima]);

  // nenhuma UF veio (coletor fora do ar): o mapa volta pra visão por estado
  const indisponivel = falhas >= UFS_ESTADOS.length && !Object.keys(porUf).length;
  return { malha, porUf, indisponivel };
}

function concluida(d: MunUf) {
  return Object.values(d.mun).every((v) => v[1] > 0 && v[0] === v[1]);
}

// valores de um município já em %: [% apurado, % dos válidos de cada candidato na ordem de `cands`]
export function lerMunicipio(d: MunUf, cdi: string) {
  const v = d.mun[cdi];
  if (!v || !v[0]) return null;
  const [st, ts, validos] = v;
  const pcts = d.cands.map((n, i) => ({ n, pct: validos ? ((v[3 + i] ?? 0) / validos) * 100 : 0 }));
  pcts.sort((x, y) => y.pct - x.pct);
  return { pst: ts ? (st / ts) * 100 : 0, cands: pcts };
}

const FAIXAS = [25, 50, 75, 95];
const misturar = (c: string, forca: number) => `color-mix(in srgb, ${c} ${Math.round(forca)}%, var(--empty))`;

function pintar(d: MunUf | undefined, cdi: string, modo: ModoMun, a: string, b: string, cand: string) {
  if (!d) return null; // UF ainda não chegou: aparece o estado por baixo
  const m = lerMunicipio(d, cdi);
  if (!m) return "var(--empty)";
  if (modo === "apurado") {
    const i = FAIXAS.findIndex((f) => m.pst < f);
    return misturar("var(--ok)", [30, 50, 68, 84, 100][i === -1 ? 4 : i]);
  }
  if (modo === "candidato") {
    const p = m.cands.find((c) => c.n === cand)?.pct ?? 0;
    return misturar(cor(cand), Math.max(8, Math.min(100, ((p - 20) / 55) * 100)));
  }
  if (modo === "vantagem") {
    const pa = m.cands.find((c) => c.n === a)?.pct ?? 0;
    const pb = m.cands.find((c) => c.n === b)?.pct ?? 0;
    const dif = pa - pb;
    return misturar(cor(dif >= 0 ? a : b), 20 + (Math.min(Math.abs(dif), 40) / 40) * 80);
  }
  const [p1, p2] = m.cands;
  const margem = p1.pct - (p2?.pct ?? 0);
  return misturar(cor(p1.n), 35 + (Math.min(margem, 30) / 30) * 65);
}

type Props = {
  malha: Malha;
  porUf: Record<string, MunUf>;
  modo: ModoMun;
  a: string;
  b: string;
  cand: string;
};

// 5.569 caminhos: memo pra não redesenhar tudo quando só o tooltip mexe
export const CamadaMunicipios = memo(function CamadaMunicipios({ malha, porUf, modo, a, b, cand }: Props) {
  return (
    <g>
      {Object.entries(malha.mun).map(([cdi, d]) => {
        const fill = pintar(porUf[ufDoMunicipio(cdi)], cdi, modo, a, b, cand);
        if (!fill) return null;
        return <path key={cdi} d={d} data-cdi={cdi} fill={fill} stroke="var(--bg)" strokeWidth={0.2} />;
      })}
    </g>
  );
});

// quantos municípios cada candidato lidera (legenda do modo Municípios)
export function contarLideres(porUf: Record<string, MunUf>) {
  const n: Record<string, number> = {};
  for (const d of Object.values(porUf)) {
    for (const cdi of Object.keys(d.mun)) {
      const m = lerMunicipio(d, cdi);
      if (m?.cands[0]?.pct) n[m.cands[0].n] = (n[m.cands[0].n] || 0) + 1;
    }
  }
  return n;
}
