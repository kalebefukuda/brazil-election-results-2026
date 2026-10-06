"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ufDoMunicipio } from "@/lib/brasil";
import { lider, type Dados } from "@/lib/calc";
import { corDoMapa, type ModoCor } from "@/lib/cores";
import { codigos } from "@/lib/eleicao";
import { PATHS } from "@/lib/mapa-paths";
import type { Resumo } from "@/lib/tse";
import { useTurno } from "@/lib/turno";
import BuscaCidade from "./BuscaCidade";
import { CamadaMunicipios, contarLideres, useMunicipios } from "./CamadaMunicipios";
import Dica, { CirculoPulsando, type Tip } from "./Dica";
import Legenda, { type ModoMapa } from "./Legenda";

type Props = {
  dados: Dados;
  br: Resumo;
  a: string;
  b: string;
  selecionado: string | null;
  onSelecionar: (uf: string) => void;
  soEstados?: boolean; // replay: as fotos antigas só têm estados
};

// o desenho ocupa 613 de largura; a faixa da direita guarda as caixinhas dos estados pequenos
const VIEWBOX = "0 0 700 639";
const CAIXA_X = 630;
const LATERAIS = ["rn", "pb", "pe", "al", "se", "es", "rj"];

// o centro do retângulo nem sempre cai dentro do estado
const AJUSTE: Record<string, [number, number]> = {
  df: [10, -4],
  go: [-8, 10],
  ma: [6, 6],
  pi: [2, 10],
  ba: [-6, 0],
  mg: [-4, 4],
  sc: [4, 2],
  am: [0, 6],
  pa: [4, 8],
  mt: [0, 6],
  rs: [6, 4],
  ce: [-2, -2],
  to: [0, 6],
};

const ABAS: [ModoMapa, string][] = [
  ["municipios", "Municípios"],
  ["estados", "Estados"],
  ["vantagem", "Vantagem"],
  ["apurado", "Apurado"],
];

export default function Mapa({ dados, br, a, b, selecionado, onSelecionar, soEstados = false }: Props) {
  const [modo, setModo] = useState<ModoMapa>("municipios");
  const [cand, setCand] = useState(a);
  const [centros, setCentros] = useState<Record<string, [number, number]>>({});
  const [tip, setTip] = useState<Tip | null>(null);
  const [destaque, setDestaque] = useState<string | null>(null);
  const [posDestaque, setPosDestaque] = useState<Tip | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const destaqueRef = useRef<SVGPathElement>(null);

  const vista = useTurno();
  const usaMunicipio = modo !== "estados";
  const { malha, porUf, indisponivel } = useMunicipios(usaMunicipio, codigos(vista.ano, vista.turno).presidente);
  const temMunicipios = usaMunicipio && !indisponivel && malha;
  const mostrarMun = temMunicipios && !soEstados;
  const legenda: ModoMapa = modo === "municipios" && !mostrarMun ? "estados" : modo;
  const modoCor: ModoCor = modo === "municipios" || modo === "estados" ? "lider" : modo;

  const lideresMun = useMemo(() => contarLideres(porUf), [porUf]);
  const nomeDe = (n: string) => br.cands.find((c) => c.n === n);
  const lideresUf = useMemo(() => {
    const ns = new Set(Object.values(dados).map((d) => lider(d)?.cand.n));
    return br.cands.map((c) => c.n).filter((n) => ns.has(n));
  }, [dados, br]);

  // trocou de eleição e o candidato escolhido não existe nela
  useEffect(() => {
    if (!br.cands.some((c) => c.n === cand)) setCand(a);
  }, [br, a, cand]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const c: Record<string, [number, number]> = {};
    svg.querySelectorAll<SVGPathElement>("path[data-uf]").forEach((p) => {
      const bb = p.getBBox();
      const uf = p.dataset.uf!;
      const [dx, dy] = AJUSTE[uf] ?? [0, 0];
      c[uf] = [bb.x + bb.width / 2 + dx, bb.y + bb.height / 2 + dy];
    });
    setCentros(c);
  }, []);

  // cidade buscada: centro dela no desenho → posição dentro do card
  useEffect(() => {
    const el = destaqueRef.current;
    const svg = svgRef.current;
    if (!destaque || !el || !svg || !cardRef.current) return setPosDestaque(null);
    const bb = el.getBBox();
    const p = new DOMPoint(bb.x + bb.width / 2, bb.y + bb.height / 2).matrixTransform(svg.getScreenCTM()!);
    const r = cardRef.current.getBoundingClientRect();
    setPosDestaque({ x: p.x - r.left, y: p.y - r.top, w: r.width, cdi: destaque });
  }, [destaque, malha, modo, mostrarMun]);

  // caixinhas laterais na altura do estado, com pelo menos 24px entre elas
  const caixas = useMemo(() => {
    const lista = LATERAIS.filter((uf) => centros[uf]).map((uf) => ({ uf, alvo: centros[uf][1], y: centros[uf][1] }));
    lista.sort((p, q) => p.alvo - q.alvo);
    for (let i = 1; i < lista.length; i++) lista[i].y = Math.max(lista[i].y, lista[i - 1].y + 24);
    return lista;
  }, [centros]);

  function pctEstado(uf: string) {
    const d = dados[uf];
    if (!d?.st) return null;
    if (modo === "apurado") return d.pst;
    if (modo === "candidato") return d.cands.find((c) => c.n === cand)?.pct ?? 0;
    return d.cands[0]?.pct ?? 0;
  }

  const preencher = (uf: string) => {
    const d = dados[uf];
    return corDoMapa(d?.st ? d : null, modoCor, a, b, cand);
  };

  function mover(e: React.PointerEvent<SVGSVGElement>) {
    const alvo = e.target as SVGElement;
    const r = cardRef.current!.getBoundingClientRect();
    const pos = { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width };
    if (alvo.dataset.cdi) setTip({ ...pos, cdi: alvo.dataset.cdi });
    else if (alvo.dataset.uf) setTip({ ...pos, uf: alvo.dataset.uf });
    else setTip(null);
  }

  function clicar(e: React.MouseEvent<SVGSVGElement>) {
    const alvo = e.target as SVGElement;
    const uf = alvo.dataset.uf ?? (alvo.dataset.cdi ? ufDoMunicipio(alvo.dataset.cdi) : undefined);
    if (uf) onSelecionar(uf);
  }

  return (
    <section ref={cardRef} className="card relative p-5 sm:p-6 xl:flex xl:h-full xl:flex-col" aria-labelledby="t-mapa">
      <h2 id="t-mapa" className="sr-only">
        Mapa
      </h2>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="O que o mapa mostra">
        {ABAS.map(([m, t]) => (
          <button
            key={m}
            className="btn !min-h-[32px] !text-[12px]"
            aria-pressed={modo === m}
            onClick={() => setModo(m)}
          >
            {t}
          </button>
        ))}
        <label
          className={`btn relative inline-flex !min-h-[32px] cursor-pointer items-center gap-1.5 !text-[12px] ${modo === "candidato" ? "ativo" : ""}`}
        >
          {modo === "candidato" ? nomeDe(cand)?.nome.split(" ")[0] : "Candidato"}
          <span aria-hidden className="text-[9px] opacity-60">
            ▼
          </span>
          <select
            aria-label="Ver o mapa de um candidato"
            className="absolute inset-0 cursor-pointer opacity-0"
            value={modo === "candidato" ? cand : ""}
            onChange={(e) => {
              setCand(e.target.value);
              setModo("candidato");
            }}
          >
            <option value="" disabled>
              Candidato
            </option>
            {br.cands.map((c) => (
              <option key={c.n} value={c.n}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        {mostrarMun && (
          <div className="ml-auto">
            <BuscaCidade porUf={porUf} onEscolher={setDestaque} />
          </div>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={VIEWBOX}
        className="mx-auto mt-3 block h-auto w-full max-w-[640px] xl:min-h-0 xl:max-w-none xl:flex-1"
        role="img"
        aria-label={mostrarMun ? "Mapa do Brasil por município" : "Mapa do Brasil por estado"}
        onPointerMove={mover}
        onPointerLeave={() => setTip(null)}
        onClick={clicar}
      >
        {/* estados por baixo: aparecem enquanto a UF não tem municípios */}
        {Object.entries(PATHS).map(([uf, d]) => (
          <path
            key={uf}
            d={d}
            data-uf={uf}
            fill={preencher(uf)}
            stroke="var(--card)"
            strokeWidth={1}
            className="cursor-pointer"
          />
        ))}

        {/* no replay a camada só some: remontar 5.569 caminhos a cada troca trava */}
        {temMunicipios && (
          <g display={mostrarMun ? undefined : "none"}>
            <CamadaMunicipios malha={malha} porUf={porUf} modo={modoCor} a={a} b={b} cand={cand} />
            {Object.entries(PATHS).map(([uf, d]) => (
              <path key={uf} d={d} fill="none" stroke="var(--bg)" strokeWidth={0.9} pointerEvents="none" />
            ))}
          </g>
        )}
        {mostrarMun && destaque && malha.mun[destaque] && (
          <g pointerEvents="none">
            <path ref={destaqueRef} d={malha.mun[destaque]} fill="none" stroke="var(--ink)" strokeWidth={1.6} />
            {posDestaque && <CirculoPulsando el={destaqueRef.current} />}
          </g>
        )}
        {selecionado && PATHS[selecionado] && (
          <path d={PATHS[selecionado]} fill="none" stroke="var(--ink)" strokeWidth={2} pointerEvents="none" />
        )}

        {Object.entries(centros)
          .filter(([uf]) => !LATERAIS.includes(uf))
          .map(([uf, [x, y]]) => {
            const p = pctEstado(uf);
            const pequeno = uf === "df";
            return (
              <text
                key={uf}
                x={x}
                y={y - 5}
                textAnchor="middle"
                pointerEvents="none"
                fontSize={pequeno ? 8 : 10}
                fontWeight={650}
                fill="#fff"
                style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.45)", strokeWidth: 2.5 }}
              >
                {uf.toUpperCase()}
                {p !== null && !pequeno && (
                  <tspan x={x} dy={11} fontSize={9} fontWeight={500}>
                    {Math.round(p)}%
                  </tspan>
                )}
              </text>
            );
          })}

        {caixas.map(({ uf, alvo, y }) => {
          const p = pctEstado(uf);
          return (
            <g key={uf} data-uf={uf} className="cursor-pointer">
              <path
                d={`M${centros[uf][0]},${alvo} L${CAIXA_X - 6},${y}`}
                stroke="var(--ink3)"
                strokeWidth={0.6}
                fill="none"
                pointerEvents="none"
              />
              <rect data-uf={uf} x={CAIXA_X} y={y - 9.5} width={66} height={19} rx={4} fill={preencher(uf)} />
              <text x={CAIXA_X + 7} y={y + 3.5} fontSize={9.5} fontWeight={700} fill="#fff" pointerEvents="none">
                {uf.toUpperCase()}
              </text>
              {p !== null && (
                <text x={CAIXA_X + 59} y={y + 3.5} fontSize={9.5} textAnchor="end" fill="#fff" pointerEvents="none">
                  {Math.round(p)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <Legenda
        modo={legenda}
        a={a}
        b={b}
        cand={cand}
        nomeDe={nomeDe}
        lideresMun={lideresMun}
        lideresUf={lideresUf}
        ufsCarregadas={Object.keys(porUf).length}
        replay={soEstados}
      />

      {tip ? (
        <Dica tip={tip} dados={dados} porUf={porUf} nomeDe={nomeDe} />
      ) : (
        mostrarMun && posDestaque && <Dica tip={posDestaque} dados={dados} porUf={porUf} nomeDe={nomeDe} fixo />
      )}
    </section>
  );
}
