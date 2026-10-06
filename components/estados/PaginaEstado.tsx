"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { NOMES, REGIAO_DE, REGIOES } from "@/lib/brasil";
import { CARGOS, baixarCargo, cargosDaUf, situacaoGovernador, type CodCargo, type ResultadoCargo } from "@/lib/cargos";
import { fmt, pct } from "@/lib/format";
import { useAtualizacao } from "@/lib/auto";
import Situacao from "./Situacao";
import { IconeMapa, IconeVoltar } from "../Icones";

const UFS_ESTADOS = Object.values(REGIOES).flat().sort((a, b) => NOMES[a].localeCompare(NOMES[b], "pt-BR"));

export default function PaginaEstado({ uf }: { uf: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const cargos = cargosDaUf(uf);
  const pedido = params.get("cargo") as CodCargo | null;
  const cargo: CodCargo = pedido && cargos.includes(pedido) ? pedido : "3";

  const [res, setRes] = useState<Partial<Record<CodCargo, ResultadoCargo>>>({});
  const [erro, setErro] = useState("");

  const atualizar = useCallback(async () => {
    try {
      const r = await baixarCargo(uf, cargo);
      setRes((antigo) => ({ ...antigo, [cargo]: r }));
      setErro("");
    } catch (e) {
      setErro(
        e instanceof Error && e.message === "sem dados"
          ? "O TSE ainda não publicou esse cargo pra esse estado."
          : "Não consegui falar com o TSE agora. Vou tentar de novo sozinho na próxima atualização."
      );
    }
  }, [uf, cargo]);

  useAtualizacao(atualizar);
  const r = res[cargo];

  function trocarCargo(c: CodCargo) {
    router.replace(`/estados/${uf}?cargo=${c}`, { scroll: false });
  }

  return (
    <main className="mx-auto max-w-[1000px] px-4 pb-12 pt-5 sm:px-6 sm:pt-8">
      <Link
        href="/estados"
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line pl-2.5 pr-3.5 text-[13px] font-medium text-ink2 transition-colors hover:border-ink3 hover:text-ink"
      >
        <IconeVoltar />
        Todos os estados
      </Link>

      <header className="mb-6 mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="kicker mb-2">{REGIAO_DE[uf]} · Eleições 2026</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[36px]">{NOMES[uf]}</h1>
            <label className="relative inline-flex items-center">
              <span className="pointer-events-none absolute left-3 text-ink3">
                <IconeMapa />
              </span>
            <select
              className="btn !pl-9"
              value={uf}
              onChange={(e) => router.push(`/estados/${e.target.value}?cargo=${cargo}`)}
              aria-label="Trocar de estado"
            >
              {UFS_ESTADOS.map((u) => (
                <option key={u} value={u}>
                  {NOMES[u]}
                </option>
              ))}
            </select>
            </label>
          </div>
          {r && (
            <p className="num mt-2 text-[13px] text-ink2">
              Totalização de {r.data} às <b className="font-semibold text-ink">{r.hora}</b>
            </p>
          )}
        </div>
      </header>

      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Cargo">
        {cargos.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={c === cargo}
            aria-pressed={c === cargo}
            className="btn whitespace-nowrap"
            onClick={() => trocarCargo(c)}
          >
            {CARGOS[c].curto}
          </button>
        ))}
      </div>

      {erro && <p className="mb-4 rounded-xl border border-line px-4 py-3 text-[13px] text-ink2">{erro}</p>}

      {!r ? (
        !erro && (
          <div className="card flex flex-col gap-3 p-5">
            <div className="skel h-4 w-32" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skel h-10 w-full" />
            ))}
          </div>
        )
      ) : cargo === "3" || cargo === "5" ? (
        <Majoritario r={r} />
      ) : (
        <Proporcional r={r} />
      )}
    </main>
  );
}

function Apuracao({ r }: { r: ResultadoCargo }) {
  return (
    <div>
      <div className="num flex items-baseline justify-between text-[13px]">
        <span className="text-ink2">Seções apuradas</span>
        <b>{pct(r.pst, 1)}</b>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-empty">
        <div className="barra h-full rounded-full bg-[var(--ok)]" style={{ width: `${r.pst}%` }} />
      </div>
    </div>
  );
}

function Majoritario({ r }: { r: ResultadoCargo }) {
  const gov = r.cargo === "3";
  const regra = gov
    ? "Vence no 1º turno quem passar de 50% dos votos válidos. Se ninguém passar, os dois primeiros vão pro 2º turno."
    : `${r.vagas} ${r.vagas > 1 ? "vagas" : "vaga"} — ${r.vagas > 1 ? `os ${r.vagas} mais votados são eleitos` : "o mais votado é eleito"}. Cada eleitor vota em ${r.vagas > 1 ? r.vagas + " candidatos" : "1 candidato"}.`;

  return (
    <section className="card entra p-5 sm:p-6" aria-labelledby="t-maj">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="t-maj" className="titulo">
          {CARGOS[r.cargo].nome}
        </h2>
        {gov && <Situacao texto={situacaoGovernador(r)} eleito={r.cands[0]?.eleito} />}
      </div>
      <p className="mt-1 max-w-[70ch] text-[13px] text-ink2">{regra}</p>
      <div className="mt-4">
        <Apuracao r={r} />
      </div>

      <ul className="mt-4">
        {r.cands.map((c, i) => {
          const dentro = !gov && i < r.vagas;
          return (
            <li key={c.n} className="border-b border-line2 py-3 last:border-0">
              <div className="flex items-center gap-3">
                <span className="num w-5 text-[12px] text-ink3">{i + 1}º</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{c.nome}</span>{" "}
                  <span className="text-[12px] text-ink3">
                    {c.partido} · {c.n}
                  </span>
                </span>
                {(c.eleito || c.situacao) && <Situacao texto={c.situacao} eleito={c.eleito} />}
                <span className="num w-[64px] text-right text-[17px] font-bold">{pct(c.pct, 1)}</span>
              </div>
              <div className="relative ml-8 mt-2 h-1.5 rounded-full bg-empty">
                <div
                  className="barra h-full rounded-full"
                  style={{ width: `${c.pct}%`, background: i === 0 || dentro ? "var(--ink)" : "var(--ink3)" }}
                />
                {gov && i === 0 && <span className="absolute -top-1 bottom-[-4px] left-1/2 w-px bg-ink3" />}
              </div>
              <div className="num ml-8 mt-1 text-[12px] text-ink2">{fmt(c.votos)} votos</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Proporcional({ r }: { r: ResultadoCargo }) {
  const [busca, setBusca] = useState("");
  const [mostrar, setMostrar] = useState(30);
  const temVagas = r.grupos.some((g) => g.vagas > 0);
  const maiorGrupo = r.grupos[0]?.votos || 1;
  const eleitos = r.cands.filter((c) => c.eleito).length;

  const termo = busca
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const filtrados = r.cands
    .map((c, i) => ({ ...c, pos: i + 1 }))
    .filter((c) =>
      !termo
        ? true
        : (c.nome + " " + c.partido + " " + c.n)
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .toLowerCase()
            .includes(termo)
    );

  return (
    <div className="entra flex flex-col gap-4 sm:gap-5">
      <section className="card p-5 sm:p-6">
        <h2 className="titulo">{CARGOS[r.cargo].nome}</h2>
        <p className="mt-1 max-w-[70ch] text-[13px] text-ink2">
          Eleição proporcional: primeiro os votos de cada partido/federação definem quantas cadeiras ele leva, depois
          entram os mais votados dentro de cada um. Por isso nem sempre o mais votado da lista geral é eleito.
        </p>
        <dl className="num mt-4 grid grid-cols-3 gap-3">
          <div>
            <dt className="text-[11.5px] text-ink2">vagas</dt>
            <dd className="text-[20px] font-bold">{r.vagas}</dd>
          </div>
          <div>
            <dt className="text-[11.5px] text-ink2">quociente eleitoral</dt>
            <dd className="text-[20px] font-bold">{r.quociente ? fmt(r.quociente) : "—"}</dd>
          </div>
          <div>
            <dt className="text-[11.5px] text-ink2">eleitos definidos</dt>
            <dd className="text-[20px] font-bold">
              {eleitos}
              <span className="text-[13px] font-normal text-ink3"> / {r.vagas}</span>
            </dd>
          </div>
        </dl>
        <div className="mt-4">
          <Apuracao r={r} />
        </div>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="t-part">
        <h2 id="t-part" className="titulo">
          Votos por partido / federação
        </h2>
        <p className="mt-1 text-[13px] text-ink2">
          {temVagas ? "Cadeiras conforme o TSE vai definindo." : "As cadeiras aparecem aqui quando o TSE começar a definir."}
        </p>
        <ul className="num mt-3">
          {r.grupos
            .filter((g) => g.votos > 0)
            .slice(0, 20)
            .map((g) => (
              <li key={g.nome} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2">
                <span className="min-w-0 truncate text-[13px] font-semibold" title={g.nome}>
                  {g.sigla}
                </span>
                <span className="text-right text-[13px]">
                  {fmt(g.votos)}
                  {temVagas && <b className="ml-3 inline-block w-14 text-right">{g.vagas} cad.</b>}
                </span>
                <span className="col-span-2 mt-1 block h-1.5 overflow-hidden rounded-full bg-empty">
                  <span className="barra block h-full rounded-full bg-ink2" style={{ width: `${(g.votos / maiorGrupo) * 100}%` }} />
                </span>
              </li>
            ))}
        </ul>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="t-cand">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="t-cand" className="titulo">
            Candidatos mais votados
          </h2>
          <span className="num text-[12px] text-ink3">{fmt(r.cands.length)} candidatos</span>
        </div>
        <input
          type="search"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setMostrar(30);
          }}
          placeholder="Buscar por nome, partido ou número"
          className="mt-3 w-full rounded-xl border border-line bg-card2 px-4 py-3 text-[14px] text-ink placeholder:text-ink3"
          aria-label="Buscar candidato"
        />
        {filtrados.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-ink2">Nenhum candidato encontrado com “{busca}”.</p>
        ) : (
          <ul className="mt-2">
            {filtrados.slice(0, mostrar).map((c) => (
              <li key={c.n + c.partido} className="flex items-center gap-3 border-b border-line2 py-2.5 last:border-0">
                <span className="num w-8 text-[12px] text-ink3">{c.pos}º</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{c.nome}</span>{" "}
                  <span className="text-[12px] text-ink3">
                    {c.partido} · {c.n}
                  </span>
                </span>
                {(c.eleito || c.situacao) && <Situacao texto={c.situacao} eleito={c.eleito} />}
                <span className="num text-right">
                  <b className="block text-[13.5px]">{fmt(c.votos)}</b>
                  <span className="text-[11.5px] text-ink3">{pct(c.pct)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {filtrados.length > mostrar && (
          <button className="btn mt-3 w-full" onClick={() => setMostrar((m) => m + 50)}>
            Ver mais ({fmt(filtrados.length - mostrar)} restantes)
          </button>
        )}
      </section>
    </div>
  );
}
