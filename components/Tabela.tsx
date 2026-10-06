"use client";

import { useState } from "react";
import type { Resumo } from "@/lib/tse";
import { NOMES, REGIAO_DE, REGIOES, UFS, cor } from "@/lib/brasil";
import { lider, saldo, votosDe, type Dados } from "@/lib/calc";
import { fmt, pct, pp } from "@/lib/format";

type Props = {
  dados: Dados;
  br: Resumo;
  a: string;
  b: string;
  selecionado: string | null;
  onSelecionar: (uf: string) => void;
};

type Linha = {
  uf: string;
  nome: string;
  peso: number;
  pst: number;
  falta: number;
  pa: number;
  va: number;
  pb: number;
  vb: number;
  po: number;
  liderN: string | null;
  liderNome: string;
  margem: number;
  saldo: number;
};

export default function Tabela({ dados, br, a, b, selecionado, onSelecionar }: Props) {
  const [ordem, setOrdem] = useState<keyof Linha>("peso");
  const [dir, setDir] = useState(-1);
  const [regiao, setRegiao] = useState("Todas");

  const ca = br.cands.find((c) => c.n === a)!;
  const cb = br.cands.find((c) => c.n === b)!;

  const linhas: Linha[] = UFS.filter((uf) => dados[uf])
    .filter((uf) => regiao === "Todas" || REGIAO_DE[uf] === regiao)
    .map((uf) => {
      const d = dados[uf];
      const A = d.cands.find((c) => c.n === a);
      const B = d.cands.find((c) => c.n === b);
      const li = lider(d);
      return {
        uf,
        nome: NOMES[uf],
        peso: br.te ? (d.te / br.te) * 100 : 0,
        pst: d.pst,
        falta: d.ts - d.st,
        pa: A?.pct ?? 0,
        va: A?.votos ?? 0,
        pb: B?.pct ?? 0,
        vb: B?.votos ?? 0,
        po: d.validos ? 100 - (A?.pct ?? 0) - (B?.pct ?? 0) : 0,
        liderN: li?.cand.n ?? null,
        liderNome: li?.cand.nome ?? "",
        margem: li?.margem ?? 0,
        saldo: saldo(votosDe(d), a, b),
      };
    });

  linhas.sort((x, y) => {
    const vx = x[ordem];
    const vy = y[ordem];
    if (typeof vx === "string" && typeof vy === "string") return vx.localeCompare(vy, "pt-BR") * dir;
    return ((vx as number) - (vy as number)) * dir;
  });

  function ordenar(k: keyof Linha) {
    if (k === ordem) setDir(-dir);
    else {
      setOrdem(k);
      setDir(k === "nome" || k === "liderNome" ? 1 : -1);
    }
  }

  const cols: [keyof Linha, string][] = [
    ["nome", "Estado"],
    ["peso", "Peso no BR"],
    ["pst", "% apurado"],
    ["falta", "Seções faltando"],
    ["pa", `${ca.nome.split(" ")[0]} %`],
    ["va", "votos"],
    ["pb", `${cb.nome.split(" ")[0]} %`],
    ["vb", "votos"],
    ["po", "Demais %"],
    ["liderNome", "Lidera"],
    ["margem", "Vantagem"],
    ["saldo", `Saldo (${ca.nome.split(" ")[0]} − ${cb.nome.split(" ")[0]})`],
  ];

  return (
    <section className="card overflow-hidden" aria-labelledby="t-tab">
      <div className="p-5 pb-3 sm:p-6 sm:pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="t-tab" className="titulo">
            Todos os estados
          </h2>
          <span className="text-[12px] text-ink3">toque no cabeçalho pra ordenar</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por região">
          {["Todas", ...Object.keys(REGIOES), "Exterior"].map((r) => (
            <button
              key={r}
              className="btn !min-h-[32px] !text-[12px]"
              aria-pressed={regiao === r}
              onClick={() => setRegiao(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="num w-full min-w-[980px] border-collapse text-[13px]">
          <thead>
            <tr>
              {cols.map(([k, t], i) => (
                <th
                  key={k}
                  scope="col"
                  className={`cursor-pointer select-none whitespace-nowrap border-b border-line px-3 py-2.5 text-[12px] font-semibold text-ink2 hover:text-ink ${
                    i === 0 ? "sticky left-0 z-10 bg-card pl-5 text-left sm:pl-6" : i === 9 ? "text-left" : "text-right"
                  }`}
                  onClick={() => ordenar(k)}
                  aria-sort={ordem === k ? (dir < 0 ? "descending" : "ascending") : "none"}
                >
                  {t}
                  {ordem === k ? (dir < 0 ? " ↓" : " ↑") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((r) => (
              <tr
                key={r.uf}
                onClick={() => onSelecionar(r.uf)}
                className={`group cursor-pointer ${r.uf === selecionado ? "bg-card2" : ""}`}
              >
                <td
                  className={`sticky left-0 z-10 whitespace-nowrap border-b border-line2 py-2.5 ${r.uf === selecionado ? "bg-card2" : "bg-card"} pl-5 pr-3 group-hover:bg-card2 sm:pl-6`}
                >
                  <b>{r.uf.toUpperCase()}</b> <span className="hidden text-ink2 sm:inline">{r.nome}</span>
                </td>
                <Td bold>{pct(r.peso, 1)}</Td>
                <Td>
                  <span className="mr-2 inline-block h-1 w-12 overflow-hidden rounded-full bg-empty align-middle">
                    <span className="block h-full bg-[var(--ok)]" style={{ width: `${r.pst}%` }} />
                  </span>
                  {pct(r.pst, 1)}
                </Td>
                <Td>{fmt(r.falta)}</Td>
                <Td bold>{pct(r.pa)}</Td>
                <Td muted>{fmt(r.va)}</Td>
                <Td bold>{pct(r.pb)}</Td>
                <Td muted>{fmt(r.vb)}</Td>
                <Td muted>{pct(r.po)}</Td>
                <td className="whitespace-nowrap border-b border-line2 px-3 py-2.5 group-hover:bg-card2">
                  {r.liderN ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="sw" style={{ background: cor(r.liderN) }} />
                      {r.liderNome}
                    </span>
                  ) : (
                    <span className="text-ink3">—</span>
                  )}
                </td>
                <Td>{r.liderN ? pp(r.margem) : "—"}</Td>
                <Td>
                  {r.saldo === 0 ? (
                    "—"
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="sw" style={{ background: cor(r.saldo > 0 ? a : b) }} />
                      {r.saldo > 0 ? "+" : "−"}
                      {fmt(Math.abs(r.saldo))}
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-4 text-[12px] leading-relaxed text-ink3 sm:px-6">
        Peso no BR = % dos eleitores do país naquele estado. Demais = soma de todos os outros candidatos. Saldo positivo
        = {ca.nome} na frente; negativo = {cb.nome}.
      </p>
    </section>
  );
}

function Td({ children, bold, muted }: { children: React.ReactNode; bold?: boolean; muted?: boolean }) {
  return (
    <td
      className={`whitespace-nowrap border-b border-line2 px-3 py-2.5 text-right group-hover:bg-card2 ${
        bold ? "font-semibold" : ""
      } ${muted ? "text-ink2" : ""}`}
    >
      {children}
    </td>
  );
}
