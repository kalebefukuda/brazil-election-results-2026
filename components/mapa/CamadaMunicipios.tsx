"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useAuto } from "@/lib/auto";
import { UFS_ESTADOS, ufDoMunicipio } from "@/lib/brasil";
import { corDoMapa, type ModoCor } from "@/lib/cores";
import { urlMunicipiosUf } from "@/lib/eleicao";
import { concluida, lerMunicipio, type MunUf } from "@/lib/municipios";

export type Malha = { viewBox: string; mun: Record<string, string> };

// a malha (≈250 KB) só é baixada quando alguém abre um modo por município
let malhaP: Promise<Malha> | null = null;
function carregarMalha() {
  malhaP ??= fetch("/malha/municipios.json").then((r) => {
    if (!r.ok) throw new Error(`malha: HTTP ${r.status}`);
    return r.json();
  });
  malhaP.catch(() => (malhaP = null));
  return malhaP;
}

export function useMunicipios(ativo: boolean, eleicao: string) {
  const { ultima } = useAuto();
  const [malha, setMalha] = useState<Malha | null>(null);
  const [porUf, setPorUf] = useState<Record<string, MunUf>>({});
  const [semDados, setSemDados] = useState(false);
  const atual = useRef({ eleicao, porUf, buscando: "" });
  atual.current.eleicao = eleicao;
  atual.current.porUf = porUf;

  useEffect(() => {
    if (ativo && !malha) carregarMalha().then(setMalha, () => {});
  }, [ativo, malha, ultima]);

  useEffect(() => {
    setPorUf({});
    setSemDados(false);
  }, [eleicao]);

  useEffect(() => {
    const ref = atual.current;
    if (!ativo || ref.buscando === eleicao) return;
    const faltam = UFS_ESTADOS.filter((uf) => {
      const d = ref.porUf[uf];
      return !(d?.eleicao === eleicao && concluida(d));
    });
    if (!faltam.length) return;

    ref.buscando = eleicao;
    Promise.all(
      faltam.map((uf) =>
        fetch(urlMunicipiosUf(eleicao, uf))
          .then((r) => (r.ok ? (r.json() as Promise<MunUf>) : null))
          .catch(() => null),
      ),
    ).then((res) => {
      if (ref.buscando === eleicao) ref.buscando = "";
      if (ref.eleicao !== eleicao) return;
      const novos: Record<string, MunUf> = {};
      res.forEach((d, i) => d && (novos[faltam[i]] = d));
      // tudo de uma vez: um redesenho dos 5.569 municípios em vez de um por UF
      setPorUf((p) => ({ ...p, ...novos }));
      setSemDados(Object.keys(novos).length === 0 && Object.keys(ref.porUf).length === 0);
    });
  }, [ativo, eleicao, ultima]);

  return { malha, porUf, indisponivel: semDados };
}

type Props = { malha: Malha; porUf: Record<string, MunUf>; modo: ModoCor; a: string; b: string; cand: string };

// 5.569 caminhos: memo pra não redesenhar quando só o tooltip mexe
export const CamadaMunicipios = memo(function CamadaMunicipios({ malha, porUf, modo, a, b, cand }: Props) {
  return (
    <g>
      {Object.entries(malha.mun).map(([cdi, d]) => {
        const dados = porUf[ufDoMunicipio(cdi)];
        // UF ainda sem dados: o estado aparece por baixo
        if (!dados) return null;
        return (
          <path
            key={cdi}
            d={d}
            data-cdi={cdi}
            fill={corDoMapa(lerMunicipio(dados, cdi), modo, a, b, cand)}
            stroke="var(--bg)"
            strokeWidth={0.2}
          />
        );
      })}
    </g>
  );
});

export function contarLideres(porUf: Record<string, MunUf>) {
  const n: Record<string, number> = {};
  for (const d of Object.values(porUf)) {
    for (const cdi of Object.keys(d.mun)) {
      const lider = lerMunicipio(d, cdi)?.cands[0];
      if (lider?.pct) n[lider.n] = (n[lider.n] || 0) + 1;
    }
  }
  return n;
}
