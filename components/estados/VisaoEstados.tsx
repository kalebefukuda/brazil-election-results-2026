"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { NOMES, REGIAO_DE, REGIOES } from "@/lib/brasil";
import { baixarCargo, situacaoGovernador, somaApuracao, type ResultadoCargo } from "@/lib/cargos";
import { pct } from "@/lib/format";
import { useAtualizacao } from "@/lib/auto";
import { useTurno } from "@/lib/turno";
import Situacao from "./Situacao";
import MapaSelecao from "./MapaSelecao";
import { IconeBusca } from "../Icones";
import Apurado from "../Apurado";

const UFS_ESTADOS = Object.values(REGIOES).flat();

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

type PorUf = Record<string, { gov?: ResultadoCargo; sen?: ResultadoCargo }>;

export default function VisaoEstados() {
  const { ano, turno } = useTurno();
  const [dados, setDados] = useState<PorUf>({});
  const [erro, setErro] = useState("");
  const [regiao, setRegiao] = useState("Todas");
  const [busca, setBusca] = useState("");
  const router = useRouter();

  const atualizar = useCallback(async () => {
    const pedidos = UFS_ESTADOS.flatMap((uf) => [
      baixarCargo(uf, "3").then((r) => ({ uf, tipo: "gov" as const, r })),
      baixarCargo(uf, "5").then((r) => ({ uf, tipo: "sen" as const, r })),
    ]);
    const res = await Promise.allSettled(pedidos);
    let falhas = 0;
    setDados((antigo) => {
      const novo: PorUf = { ...antigo };
      for (const r of res) {
        if (r.status === "fulfilled") {
          novo[r.value.uf] = { ...novo[r.value.uf], [r.value.tipo]: r.value.r };
        } else falhas++;
      }
      return novo;
    });
    setErro(
      falhas === pedidos.length
        ? "Não consegui falar com o TSE agora. Vou tentar de novo sozinho na próxima atualização."
        : falhas
          ? "Alguns estados não vieram nessa rodada; mostrando o último dado deles."
          : ""
    );
  }, []);

  useAtualizacao(atualizar);

  // quantos estados cada partido lidera pra governador
  const placar: Record<string, number> = {};
  for (const uf of UFS_ESTADOS) {
    const g = dados[uf]?.gov;
    if (g?.cands[0] && g.validos) placar[g.cands[0].partido] = (placar[g.cands[0].partido] || 0) + 1;
  }
  const placarLista = Object.entries(placar).sort((a, b) => b[1] - a[1]);
  const govEleitos = UFS_ESTADOS.filter((uf) => dados[uf]?.gov?.definido === "e").length;
  const govSegundo = UFS_ESTADOS.filter((uf) => dados[uf]?.gov?.definido === "s").length;
  const totalLiderando = placarLista.reduce((s, [, n]) => s + n, 0);
  const carregou = Object.keys(dados).length > 0;
  const apur = somaApuracao(UFS_ESTADOS.map((uf) => dados[uf]?.gov));

  // filtro por região + busca por nome/sigla
  const termo = semAcento(busca.trim());
  const visiveis = UFS_ESTADOS.filter(
    (uf) =>
      (regiao === "Todas" || REGIAO_DE[uf] === regiao) &&
      (!termo || semAcento(NOMES[uf]).includes(termo) || uf === termo)
  );

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-12 pt-5 sm:px-6 sm:pt-8">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="kicker mb-2">Eleições {ano} · {turno}º turno</p>
          <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[36px]">
            Governadores e Senado
          </h1>
          <p className="mt-2 max-w-[60ch] text-[13px] text-ink2">
            Quem está na frente em cada estado. Toque num estado pra ver todos os candidatos e os deputados.
          </p>
        </div>
        {carregou && <Apurado {...apur} className="card w-full p-4 md:w-[360px] md:flex-none" />}
      </header>

      {erro && <p className="mb-4 rounded-xl border border-line px-4 py-3 text-[13px] text-ink2">{erro}</p>}

      <div className="sticky top-[93px] z-20 lg:top-[57px] -mx-4 mb-5 border-b border-line bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
          <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filtrar por região">
            {["Todas", ...Object.keys(REGIOES)].map((r) => (
              <button
                key={r}
                className="btn whitespace-nowrap"
                aria-pressed={regiao === r}
                onClick={() => setRegiao(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <label className="relative md:ml-auto md:w-[280px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink3">
              <IconeBusca />
            </span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && visiveis[0]) router.push(`/estados/${visiveis[0]}`);
              }}
              placeholder="Buscar estado (ex.: SC, Bahia)"
              className="h-10 w-full rounded-xl border border-line bg-card pl-9 pr-3 text-[14px] text-ink placeholder:text-ink3"
              aria-label="Buscar estado"
            />
          </label>
        </div>
      </div>

      {!carregou ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card flex flex-col gap-3 p-5">
              <div className="skel h-4 w-28" />
              <div className="skel h-6 w-48" />
              <div className="skel h-2 w-full" />
              <div className="skel h-4 w-40" />
            </div>
          ))}
        </div>
      ) : (
        <div className="entra flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="card p-5 sm:p-6" aria-labelledby="t-escolha">
            <h2 id="t-escolha" className="titulo">
              Escolha o estado
            </h2>
            <p className="mt-1 text-[13px] text-ink2">Toque no mapa ou na sigla pra abrir governador, senado e deputados.</p>
            <div className="mt-4 grid grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
              <MapaSelecao regiao={regiao} />
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-4 xl:grid-cols-5">
                {UFS_ESTADOS.filter((uf) => regiao === "Todas" || REGIAO_DE[uf] === regiao).map((uf) => (
                  <Link
                    key={uf}
                    href={`/estados/${uf}`}
                    title={NOMES[uf]}
                    className="flex h-10 items-center justify-center rounded-lg border border-line text-[13px] font-semibold transition-colors hover:border-ink3 hover:bg-card2"
                  >
                    {uf.toUpperCase()}
                  </Link>
                ))}
              </div>
            </div>
          </section>
          {placarLista.length > 0 && (
            <section className="card p-5 sm:p-6" aria-labelledby="t-placar">
              <h2 id="t-placar" className="titulo">
                Partidos na frente para governador
              </h2>
              <p className="mt-1 text-[13px] text-ink2">Em quantos estados cada partido lidera agora.</p>
              <div className="num mt-3 flex flex-wrap gap-2 text-[12.5px]">
                <span className="rounded-full bg-[color-mix(in_srgb,var(--ok)_18%,transparent)] px-2.5 py-1 font-semibold text-[var(--ok)]">
                  {govEleitos} já eleitos
                </span>
                <span className="rounded-full bg-[color-mix(in_srgb,var(--c70)_18%,transparent)] px-2.5 py-1 font-semibold text-[var(--c70)]">
                  {govSegundo} com 2º turno garantido
                </span>
                <span className="rounded-full border border-line px-2.5 py-1 text-ink2">
                  {27 - govEleitos - govSegundo} ainda em aberto
                </span>
              </div>
              <ul className="num mt-4 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                {placarLista.map(([partido, n]) => (
                  <li key={partido} className="grid grid-cols-[84px_minmax(0,1fr)_28px] items-center gap-3">
                    <span className="truncate text-[13px] font-semibold">{partido}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-empty">
                      <span className="barra block h-full rounded-full bg-ink2" style={{ width: `${(n / totalLiderando) * 100}%` }} />
                    </span>
                    <span className="text-right font-bold">{n}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          </div>

          {visiveis.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
              <p className="font-semibold">Nenhum estado com “{busca}”</p>
              <p className="mt-1 text-[13px] text-ink2">Tenta o nome ou a sigla, tipo “Paraná” ou “PR”.</p>
              <button className="btn mt-4" onClick={() => setBusca("")}>
                Limpar busca
              </button>
            </div>
          )}

          {Object.entries(REGIOES)
            .filter(([, ufs]) => ufs.some((uf) => visiveis.includes(uf)))
            .map(([nomeRegiao, ufs]) => (
            <section key={nomeRegiao} aria-labelledby={`t-${nomeRegiao}`}>
              <h2 id={`t-${nomeRegiao}`} className="titulo mb-3">
                {nomeRegiao}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ufs.filter((uf) => visiveis.includes(uf)).map((uf) => (
                  <CardEstado key={uf} uf={uf} gov={dados[uf]?.gov} sen={dados[uf]?.sen} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function CardEstado({ uf, gov, sen }: { uf: string; gov?: ResultadoCargo; sen?: ResultadoCargo }) {
  const [g1, g2] = gov?.cands ?? [];
  const vagasSen = sen?.vagas ?? 2;
  const temVotos = !!gov?.validos;

  return (
    <Link
      href={`/estados/${uf}`}
      className="card group flex flex-col p-5 transition-colors hover:border-ink3"
      aria-label={`Ver resultados de ${NOMES[uf]}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[16px] font-bold tracking-[-0.02em]">
          {NOMES[uf]} <span className="text-[12px] font-medium text-ink3">{uf.toUpperCase()}</span>
        </h3>
        <span className="num text-[12px] text-ink2">{gov ? `${pct(gov.pst, 0)} apurado` : "—"}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-empty">
        <div className="barra h-full bg-[var(--ok)]" style={{ width: `${gov?.pst ?? 0}%` }} />
      </div>

      <p className="kicker mt-4">Governador</p>
      {!temVotos ? (
        <p className="mt-1 text-[13px] text-ink3">Sem votos apurados ainda.</p>
      ) : (
        <>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate font-semibold">
              {g1.nome} <span className="text-[12px] font-normal text-ink3">{g1.partido}</span>
            </span>
            <span className="num font-bold">{pct(g1.pct, 1)}</span>
          </div>
          <div className="relative mt-1.5 h-1.5 rounded-full bg-empty">
            <div className="barra h-full rounded-full bg-ink" style={{ width: `${g1.pct}%` }} />
            <span className="absolute -top-1 bottom-[-4px] left-1/2 w-px bg-ink3" title="50% dos válidos" />
          </div>
          {g2 && (
            <div className="num mt-1.5 flex justify-between gap-2 text-[12.5px] text-ink2">
              <span className="min-w-0 truncate">
                {g2.nome} <span className="text-ink3">{g2.partido}</span>
              </span>
              <span>{pct(g2.pct, 1)}</span>
            </div>
          )}
          <div className="mt-2">
            <Situacao texto={situacaoGovernador(gov!)} eleito={g1.eleito} />
          </div>
        </>
      )}

      <p className="kicker mt-4">
        Senado · {vagasSen} {vagasSen > 1 ? "vagas" : "vaga"}
      </p>
      {!sen?.validos ? (
        <p className="mt-1 text-[13px] text-ink3">Sem votos apurados ainda.</p>
      ) : (
        <ul className="num mt-1.5 space-y-1 text-[13px]">
          {sen.cands.slice(0, vagasSen + 1).map((c, i) => (
            <li key={c.n} className={`flex items-center justify-between gap-2 ${i >= vagasSen ? "text-ink3" : ""}`}>
              <span className="min-w-0 truncate">
                <span className={i < vagasSen ? "font-semibold" : ""}>{c.nome}</span>{" "}
                <span className="text-[12px] text-ink3">{c.partido}</span>
              </span>
              <span className="flex items-center gap-2">
                {c.eleito && <Situacao texto="Eleito" eleito />}
                {pct(c.pct, 1)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <span className="mt-4 text-[12.5px] font-semibold text-ink2 group-hover:text-ink">
        Ver todos e deputados →
      </span>
    </Link>
  );
}
