"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { NOMES, REGIOES } from "@/lib/brasil";
import { baixarCargo, somaApuracao, type ResultadoCargo } from "@/lib/cargos";
import { campo, corPartido, type Campo } from "@/lib/partidos";
import { fmt, pct } from "@/lib/format";
import { useAtualizacao } from "@/lib/auto";
import { useTurno } from "@/lib/turno";
import Hemiciclo, { type Cadeira } from "../Hemiciclo";
import BarraCampos from "../BarraCampos";
import Apurado from "../Apurado";

const UFS_ESTADOS = Object.values(REGIOES).flat();

export default function PaginaDeputados() {
  const { ano } = useTurno();
  const [dados, setDados] = useState<Record<string, ResultadoCargo>>({});
  const [erro, setErro] = useState("");

  const atualizar = useCallback(async () => {
    const res = await Promise.allSettled(UFS_ESTADOS.map((uf) => baixarCargo(uf, "6")));
    let falhas = 0;
    setDados((antigo) => {
      const novo = { ...antigo };
      res.forEach((r, i) => {
        if (r.status === "fulfilled") novo[UFS_ESTADOS[i]] = r.value;
        else falhas++;
      });
      return novo;
    });
    setErro(falhas === UFS_ESTADOS.length ? "Não consegui falar com o TSE agora. Vou tentar de novo sozinho." : "");
  }, []);

  useAtualizacao(atualizar);

  const totalVagas = UFS_ESTADOS.reduce((s, uf) => s + (dados[uf]?.vagas ?? 0), 0) || 513;

  // soma as cadeiras de cada partido/federação nos 27 estados
  const porGrupo: Record<string, { vagas: number; votos: number }> = {};
  let eleitos = 0;
  let votosTotal = 0;
  for (const uf of UFS_ESTADOS) {
    const r = dados[uf];
    if (!r) continue;
    eleitos += r.cands.filter((c) => c.eleito).length;
    for (const g of r.grupos) {
      porGrupo[g.sigla] = porGrupo[g.sigla] || { vagas: 0, votos: 0 };
      porGrupo[g.sigla].vagas += g.vagas;
      porGrupo[g.sigla].votos += g.votos;
      votosTotal += g.votos;
    }
  }
  const grupos = Object.entries(porGrupo).sort((a, b) => b[1].vagas - a[1].vagas || b[1].votos - a[1].votos);
  const distribuidas = grupos.reduce((s, [, g]) => s + g.vagas, 0);

  const cont: Record<Campo, number> = { esquerda: 0, centro: 0, direita: 0 };
  for (const [sigla, g] of grupos) cont[campo(sigla)] += g.vagas;

  const ordemCampo: Campo[] = ["esquerda", "centro", "direita"];
  const cadeiras: Cadeira[] = [...grupos]
    .sort((x, y) => ordemCampo.indexOf(campo(x[0])) - ordemCampo.indexOf(campo(y[0])) || y[1].vagas - x[1].vagas)
    .flatMap(([sigla, g]) =>
      Array.from({ length: g.vagas }, () => ({ cor: corPartido(sigla), forte: true, titulo: `${sigla} · ${g.vagas} cadeiras` }))
    );
  // cadeiras que o TSE ainda não distribuiu ficam no meio, apagadas
  const vazias = Math.max(totalVagas - cadeiras.length, 0);
  const posMeio = cont.esquerda + Math.floor(cont.centro / 2);
  cadeiras.splice(posMeio, 0, ...Array.from({ length: vazias }, () => ({ cor: "var(--line)", forte: true, titulo: "ainda não distribuída" })));

  // os mais votados do país, juntando as 27 listas estaduais
  const maisVotados = UFS_ESTADOS.flatMap((uf) => (dados[uf]?.cands ?? []).map((c) => ({ ...c, uf })))
    .sort((x, y) => y.votos - x.votos)
    .slice(0, 15);

  const carregou = Object.keys(dados).length > 0;
  const apur = somaApuracao(UFS_ESTADOS.map((uf) => dados[uf]));

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-12 pt-5 sm:px-6 sm:pt-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="kicker mb-2">Eleições {ano}</p>
          <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[36px]">
            Câmara dos Deputados
          </h1>
          <p className="mt-2 max-w-[62ch] text-[13px] text-ink2">
            {totalVagas} cadeiras. Cada partido ou federação leva cadeiras pelos votos que somou em cada estado; o TSE
            vai distribuindo conforme a apuração avança.
          </p>
        </div>
        {carregou && <Apurado {...apur} className="card w-full p-4 md:w-[360px] md:flex-none" />}
      </header>

      {erro && <p className="mb-4 rounded-xl border border-line px-4 py-3 text-[13px] text-ink2">{erro}</p>}

      {!carregou ? (
        <div className="card flex flex-col gap-3 p-5">
          <div className="skel mx-auto aspect-[2/1] w-full max-w-[620px]" />
          <div className="skel h-4 w-48" />
        </div>
      ) : (
        <div className="entra grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* coluna das cadeiras: fica parada enquanto a da direita rola */}
          <div className="flex flex-col gap-4 sm:gap-5 lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:self-start">
          <section className="card flex-none p-5 sm:p-6" aria-labelledby="t-camara">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="t-camara" className="titulo">
                Cadeiras distribuídas
              </h2>
              <span className="text-[12px] text-ink3">apagado: ainda não distribuída</span>
            </div>
            <div className="mt-4">
              <BarraCampos cont={cont} total={totalVagas} maioria={257} />
            </div>
            <div className="mx-auto mt-2 max-w-[640px]">
              <Hemiciclo cadeiras={cadeiras} rotulo={String(distribuidas)} sub={`de ${totalVagas} distribuídas · ${eleitos} eleitos definidos`} />
            </div>
            <p className="mt-4 text-[11.5px] text-ink3">
              Esquerda, centro e direita é um agrupamento aproximado por partido, do jeito que a imprensa costuma
              classificar. Federação conta pelo primeiro partido.
            </p>
          </section>

          <section className="card flex min-h-0 flex-col p-5 sm:p-6 lg:flex-1" aria-labelledby="t-maisvotados">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="t-maisvotados" className="titulo">
                Mais votados do Brasil
              </h2>
              <span className="num text-[12px] text-ink3">{fmt(apur.pst)}% das seções</span>
            </div>
            <ol className="num rolagem mt-3 min-h-0 lg:-mr-2 lg:overflow-y-auto lg:pr-2">
              {maisVotados.map((c, i) => (
                <li key={`${c.uf}-${c.n}`}>
                  <Link
                    href={`/estados/${c.uf}?cargo=6`}
                    className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line2 py-2 last:border-0 hover:bg-card2"
                  >
                    <span className="text-right text-[12px] text-ink3">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold">{c.nome}</span>
                      <span className="text-[11.5px]" style={{ color: corPartido(c.partido) }}>
                        {c.partido} · {c.uf.toUpperCase()}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="text-[13px]">{fmt(c.votos)}</span>
                      {c.eleito && (
                        <span className="rounded border border-line px-1.5 text-[10.5px] font-semibold leading-[16px] text-ink2">
                          eleito
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12px] text-ink3">Toque num nome, ou num estado ao lado, pra ver todos os candidatos dele.</p>
          </section>
          </div>

          <div className="flex flex-col gap-4 sm:gap-5">
            <section className="card p-5 sm:p-6" aria-labelledby="t-bancadas">
              <h2 id="t-bancadas" className="titulo">
                Bancadas
              </h2>
              <ul className="num mt-3">
                {grupos
                  .filter(([, g]) => g.vagas > 0 || g.votos > 0)
                  .slice(0, 14)
                  .map(([sigla, g]) => (
                    <li key={sigla} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 border-b border-line2 py-2 last:border-0">
                      <span className="flex min-w-0 items-center gap-2 truncate text-[13px] font-semibold">
                        <span className="sw" style={{ background: corPartido(sigla) }} />
                        <span className="truncate">{sigla}</span>
                      </span>
                      <span className="text-[12px] text-ink3">{pct(votosTotal ? (g.votos / votosTotal) * 100 : 0, 1)} dos votos</span>
                      <b className="w-16 text-right text-[14px]">{g.vagas} cad.</b>
                    </li>
                  ))}
              </ul>
            </section>

            <section className="card p-5 sm:p-6" aria-labelledby="t-depuf">
              <h2 id="t-depuf" className="titulo">
                Por estado
              </h2>
              <p className="mt-1 text-[13px] text-ink2">Cadeiras já distribuídas de cada bancada estadual. Toque pra ver os candidatos.</p>
              <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                {UFS_ESTADOS.map((uf) => {
                  const r = dados[uf];
                  const dist = r ? r.grupos.reduce((s, g) => s + g.vagas, 0) : 0;
                  return (
                    <Link
                      key={uf}
                      href={`/estados/${uf}?cargo=6`}
                      title={NOMES[uf]}
                      className="rounded-lg border border-line px-2.5 py-2 transition-colors hover:border-ink3"
                    >
                      <div className="flex items-baseline justify-between">
                        <b className="text-[13px]">{uf.toUpperCase()}</b>
                        <span className="num text-[11.5px] text-ink2">
                          {dist}/{r?.vagas ?? "–"}
                        </span>
                      </div>
                      <div className="mt-1.5 flex h-1.5 gap-px overflow-hidden rounded-full bg-empty">
                        {r?.grupos
                          .filter((g) => g.vagas > 0)
                          .map((g) => (
                            <i key={g.sigla} className="block h-full" style={{ width: `${(g.vagas / r.vagas) * 100}%`, background: corPartido(g.sigla) }} />
                          ))}
                      </div>
                      <p className="num mt-1 text-[11px] text-ink3">{r ? `${fmt(Math.round(r.pst))}% apurado` : ""}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
