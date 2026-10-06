"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { NOMES, REGIOES } from "@/lib/brasil";
import { baixarCargo, somaApuracao, type ResultadoCargo } from "@/lib/cargos";
import { campo, corPartido, partidoPrincipal, type Campo } from "@/lib/partidos";
import { pct } from "@/lib/format";
import { useAtualizacao } from "@/lib/auto";
import { useTurno } from "@/lib/turno";
import Hemiciclo, { type Cadeira } from "../Hemiciclo";
import BarraCampos from "../BarraCampos";
import Apurado from "../Apurado";

const UFS_ESTADOS = Object.values(REGIOES).flat();

export default function PaginaSenado() {
  const { ano } = useTurno();
  const [dados, setDados] = useState<Record<string, ResultadoCargo>>({});
  const [erro, setErro] = useState("");
  const [pagina, setPagina] = useState(0);

  const atualizar = useCallback(async () => {
    const res = await Promise.allSettled(UFS_ESTADOS.map((uf) => baixarCargo(uf, "5")));
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

  // cada estado tem N vagas: quem está nas N primeiras posições ocupa a cadeira agora
  const ocupantes = UFS_ESTADOS.flatMap((uf) => {
    const r = dados[uf];
    if (!r || !r.validos) return [];
    return r.cands.slice(0, r.vagas).map((c) => ({ uf, c }));
  });
  const totalVagas = UFS_ESTADOS.reduce((s, uf) => s + (dados[uf]?.vagas ?? 2), 0);
  const definidas = ocupantes.filter((o) => o.c.eleito).length;

  const porPartido: Record<string, { lider: number; eleitos: number }> = {};
  for (const o of ocupantes) {
    const p = partidoPrincipal(o.c.partido);
    porPartido[p] = porPartido[p] || { lider: 0, eleitos: 0 };
    porPartido[p].lider++;
    if (o.c.eleito) porPartido[p].eleitos++;
  }
  const partidos = Object.entries(porPartido).sort((a, b) => b[1].lider - a[1].lider);

  const cont: Record<Campo, number> = { esquerda: 0, centro: 0, direita: 0 };
  for (const o of ocupantes) cont[campo(o.c.partido)]++;

  // hemiciclo: esquerda à esquerda, direita à direita, e partido junto de partido
  const ordemCampo: Campo[] = ["esquerda", "centro", "direita"];
  const cadeiras: Cadeira[] = [...ocupantes]
    .sort(
      (x, y) =>
        ordemCampo.indexOf(campo(x.c.partido)) - ordemCampo.indexOf(campo(y.c.partido)) ||
        (porPartido[partidoPrincipal(y.c.partido)].lider - porPartido[partidoPrincipal(x.c.partido)].lider) ||
        partidoPrincipal(x.c.partido).localeCompare(partidoPrincipal(y.c.partido))
    )
    .map((o) => ({
      cor: corPartido(o.c.partido),
      forte: o.c.eleito,
      titulo: `${o.c.nome} (${o.c.partido}) · ${o.uf.toUpperCase()} · ${o.c.eleito ? "eleito" : "liderando"}`,
    }));
  while (cadeiras.length < totalVagas) cadeiras.push({ cor: "var(--line)", forte: true, titulo: "sem votos ainda" });

  // disputa pela última vaga: diferença entre o último que entra e o primeiro que fica de fora
  const disputas = UFS_ESTADOS.map((uf) => {
    const r = dados[uf];
    if (!r || !r.validos || r.cands.length <= r.vagas) return null;
    const dentro = r.cands[r.vagas - 1];
    const fora = r.cands[r.vagas];
    return { uf, dentro, fora, dif: dentro.pct - fora.pct, pst: r.pst };
  })
    .filter((d): d is NonNullable<typeof d> => !!d && !d.dentro.eleito)
    .sort((a, b) => a.dif - b.dif);
  const porPagina = 6;
  const paginas = Math.max(1, Math.ceil(disputas.length / porPagina));
  const pag = Math.min(pagina, paginas - 1);

  const carregou = Object.keys(dados).length > 0;
  const apur = somaApuracao(UFS_ESTADOS.map((uf) => dados[uf]));

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-12 pt-5 sm:px-6 sm:pt-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="kicker mb-2">Eleições {ano}</p>
          <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[36px]">Senado</h1>
          <p className="mt-2 max-w-[62ch] text-[13px] text-ink2">
            {totalVagas} cadeiras em disputa, {totalVagas / 27} por estado. Os mais votados de cada estado ficam com as
            vagas.
          </p>
        </div>
        {carregou && <Apurado {...apur} className="card w-full p-4 md:w-[360px] md:flex-none" />}
      </header>

      {erro && <p className="mb-4 rounded-xl border border-line px-4 py-3 text-[13px] text-ink2">{erro}</p>}

      {!carregou ? (
        <div className="card flex flex-col gap-3 p-5">
          <div className="skel mx-auto aspect-[2/1] w-full max-w-[520px]" />
          <div className="skel h-4 w-48" />
        </div>
      ) : (
        <div className="entra grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section className="card p-5 sm:p-6" aria-labelledby="t-cadeiras">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="t-cadeiras" className="titulo">
                Cadeiras em disputa
              </h2>
              <span className="text-[12px] text-ink3">claro: liderando · forte: eleito</span>
            </div>
            <div className="mt-4">
              <BarraCampos cont={cont} total={totalVagas} />
            </div>
            <div className="mx-auto mt-4 max-w-[560px]">
              <Hemiciclo cadeiras={cadeiras} rotulo={String(definidas)} sub={`de ${totalVagas} definidas`} />
            </div>
            <ul className="num mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]">
              {partidos.map(([p, v]) => (
                <li key={p} className="inline-flex items-center gap-1.5">
                  <span className="sw" style={{ background: corPartido(p) }} />
                  <span className="text-ink2">{p}</span>
                  <b>{v.lider}</b>
                  {v.eleitos > 0 && <span className="text-[11px] text-[var(--ok)]">({v.eleitos} eleitos)</span>}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] text-ink3">
              Esquerda, centro e direita é um agrupamento aproximado por partido, do jeito que a imprensa costuma
              classificar.
            </p>
          </section>

          <div className="flex flex-col gap-4 sm:gap-5">
            <section className="card p-5 sm:p-6" aria-labelledby="t-ufs">
              <h2 id="t-ufs" className="titulo">
                Por estado
              </h2>
              <p className="mt-1 text-[13px] text-ink2">
                Cada sigla mostra o partido de quem ocupa as {totalVagas / 27} vagas agora. Toque pra ver todos.
              </p>
              <div className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-7 lg:grid-cols-5 xl:grid-cols-7">
                {UFS_ESTADOS.map((uf) => {
                  const r = dados[uf];
                  const ocup = r?.validos ? r.cands.slice(0, r.vagas) : [];
                  const duas = ocup.length > 0 && ocup.every((c) => c.eleito);
                  return (
                    <Link
                      key={uf}
                      href={`/estados/${uf}?cargo=5`}
                      title={`${NOMES[uf]}: ${ocup.map((c) => `${c.nome} (${c.partido})`).join(", ") || "sem votos"}`}
                      className={`flex h-11 flex-col overflow-hidden rounded-lg border text-[12px] font-bold transition-colors hover:border-ink3 ${
                        duas ? "border-[var(--ok)]" : "border-line"
                      }`}
                    >
                      <span className="flex flex-1 items-center justify-center">{uf.toUpperCase()}</span>
                      <span className="flex h-1.5">
                        {ocup.map((c) => (
                          <i
                            key={c.n}
                            className="block h-full flex-1"
                            style={{ background: corPartido(c.partido), opacity: c.eleito ? 1 : 0.55 }}
                          />
                        ))}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="card p-5 sm:p-6" aria-labelledby="t-disp">
              <div className="flex items-center justify-between gap-2">
                <h2 id="t-disp" className="titulo">
                  Disputas pela última vaga
                </h2>
                <div className="flex items-center gap-1">
                  <button className="btn !min-h-[30px] !px-2" disabled={pag === 0} onClick={() => setPagina(pag - 1)} aria-label="Anteriores">
                    ‹
                  </button>
                  <span className="num w-10 text-center text-[12px] text-ink2">
                    {pag + 1}/{paginas}
                  </span>
                  <button className="btn !min-h-[30px] !px-2" disabled={pag >= paginas - 1} onClick={() => setPagina(pag + 1)} aria-label="Próximas">
                    ›
                  </button>
                </div>
              </div>
              <p className="mt-1 text-[13px] text-ink2">As mais apertadas primeiro: quem está entrando × quem está logo atrás.</p>
              {disputas.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-ink2">Nenhuma disputa em aberto.</p>
              ) : (
                <ul className="mt-3">
                  {disputas.slice(pag * porPagina, pag * porPagina + porPagina).map((d) => (
                    <li key={d.uf}>
                      <Link
                        href={`/estados/${d.uf}?cargo=5`}
                        className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line2 py-2.5 hover:bg-card2"
                      >
                        <span className="row-span-2 flex h-9 items-center justify-center rounded-md bg-card2 text-[12px] font-bold">
                          {d.uf.toUpperCase()}
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5 truncate text-[13px]">
                          <span className="sw" style={{ background: corPartido(d.dentro.partido) }} />
                          <span className="truncate font-semibold">{d.dentro.nome}</span>
                          <span className="text-ink3">{d.dentro.partido}</span>
                        </span>
                        <span className="num text-[13px] font-semibold">{pct(d.dentro.pct)}</span>
                        <span className="flex min-w-0 items-center gap-1.5 truncate text-[13px] text-ink2">
                          <span className="sw" style={{ background: corPartido(d.fora.partido) }} />
                          <span className="truncate">{d.fora.nome}</span>
                          <span className="text-ink3">{d.fora.partido}</span>
                        </span>
                        <span className="num text-[13px] text-ink2">{pct(d.fora.pct)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
