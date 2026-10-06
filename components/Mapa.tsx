"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PATHS } from "@/lib/mapa-paths";
import { NOMES, cor, ufDoMunicipio } from "@/lib/brasil";
import { lider, type Dados } from "@/lib/calc";
import { codigos } from "@/lib/eleicao";
import { useTurno } from "@/lib/turno";
import type { Resumo } from "@/lib/tse";
import { fmt, pct } from "@/lib/format";
import { CamadaMunicipios, contarLideres, lerMunicipio, useMunicipios, type ModoMun } from "./MapaMunicipios";
import BuscaCidade from "./BuscaCidade";

type Modo = "municipios" | "estados" | "vantagem" | "apurado" | "candidato";

type Props = {
  dados: Dados;
  br: Resumo;
  a: string;
  b: string;
  selecionado: string | null;
  onSelecionar: (uf: string) => void;
  soEstados?: boolean; // replay da linha do tempo: só tem foto por estado
};

// o mapa ocupa 613 de largura; a coluna da direita guarda as caixinhas dos estados pequenos
const VIEWBOX = "0 0 700 639";
const CAIXA_X = 630;
const LATERAIS = ["rn", "pb", "pe", "al", "se", "es", "rj"];

// rótulo do estado: centro da caixa nem sempre cai bem no desenho
const AJUSTE: Record<string, [number, number]> = {
  df: [10, -4], go: [-8, 10], ma: [6, 6], pi: [2, 10], ba: [-6, 0], mg: [-4, 4], sc: [4, 2],
  am: [0, 6], pa: [4, 8], mt: [0, 6], rs: [6, 4], ce: [-2, -2], to: [0, 6],
};

const FAIXAS = [
  { ate: 25, forca: 30, txt: "até 25%" },
  { ate: 50, forca: 50, txt: "25–50%" },
  { ate: 75, forca: 68, txt: "50–75%" },
  { ate: 95, forca: 84, txt: "75–95%" },
  { ate: 101, forca: 100, txt: "95%+" },
];
const misturar = (c: string, forca: number) => `color-mix(in srgb, ${c} ${Math.round(forca)}%, var(--empty))`;

type Tip = { x: number; y: number; w: number } & ({ uf: string; cdi?: undefined } | { cdi: string; uf?: undefined });

export default function Mapa({ dados, br, a, b, selecionado, onSelecionar, soEstados = false }: Props) {
  const [modo, setModo] = useState<Modo>("municipios");
  const [cand, setCand] = useState(a);
  const [centros, setCentros] = useState<Record<string, [number, number]>>({});
  const [tip, setTip] = useState<Tip | null>(null);
  const [destaque, setDestaque] = useState<string | null>(null);
  const [posDestaque, setPosDestaque] = useState<Tip | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const destaqueRef = useRef<SVGPathElement>(null);

  const eleicaoVista = useTurno();
  const usaMunicipio = modo !== "estados" && !soEstados;
  const { malha, porUf, indisponivel } = useMunicipios(usaMunicipio, codigos(eleicaoVista.ano, eleicaoVista.turno).presidente);
  // no replay (ou sem coletor) o modo Municípios vira Estados; os outros modos funcionam por estado
  const legenda: Modo = (soEstados || indisponivel) && modo === "municipios" ? "estados" : modo;
  const lideresMun = useMemo(() => contarLideres(porUf), [porUf]);
  const ufsCarregadas = Object.keys(porUf).length;

  const nomeDe = (n: string) => br.cands.find((c) => c.n === n);
  const modoMun: ModoMun = modo === "municipios" ? "lider" : modo === "estados" ? "lider" : modo;

  // centro de cada estado, uma vez, pra colocar a sigla
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const c: Record<string, [number, number]> = {};
    svg.querySelectorAll<SVGPathElement>("path[data-uf]").forEach((p) => {
      const bb = p.getBBox();
      const uf = p.dataset.uf!;
      const aj = AJUSTE[uf] || [0, 0];
      c[uf] = [bb.x + bb.width / 2 + aj[0], bb.y + bb.height / 2 + aj[1]];
    });
    setCentros(c);
  }, []);

  // cidade buscada: acha o centro dela no desenho e converte pra posição dentro do card
  useEffect(() => {
    const el = destaqueRef.current;
    const svg = svgRef.current;
    if (!destaque || !el || !svg || !cardRef.current) return setPosDestaque(null);
    const bb = el.getBBox();
    const p = new DOMPoint(bb.x + bb.width / 2, bb.y + bb.height / 2).matrixTransform(svg.getScreenCTM()!);
    const r = cardRef.current.getBoundingClientRect();
    setPosDestaque({ x: p.x - r.left, y: p.y - r.top, w: r.width, cdi: destaque });
  }, [destaque, malha, modo]);

  // caixinhas laterais em ordem de altura, sem encavalar
  const caixas = useMemo(() => {
    const lista = LATERAIS.filter((uf) => centros[uf]).map((uf) => ({ uf, alvo: centros[uf][1], y: centros[uf][1] }));
    lista.sort((p, q) => p.alvo - q.alvo);
    for (let i = 1; i < lista.length; i++) lista[i].y = Math.max(lista[i].y, lista[i - 1].y + 24);
    return lista;
  }, [centros]);

  function pctEstado(uf: string) {
    const d = dados[uf];
    if (!d || !d.st) return null;
    if (modo === "apurado") return d.pst;
    if (modo === "candidato") return d.cands.find((c) => c.n === cand)?.pct ?? 0;
    return d.cands[0]?.pct ?? 0;
  }

  function preencher(uf: string) {
    const d = dados[uf];
    if (!d || !d.st) return "var(--empty)";
    if (modo === "apurado") {
      const faixa = FAIXAS.find((f) => d.pst < f.ate) ?? FAIXAS[FAIXAS.length - 1];
      return misturar("var(--ok)", faixa.forca);
    }
    if (modo === "candidato") {
      const p = d.cands.find((c) => c.n === cand)?.pct ?? 0;
      return misturar(cor(cand), Math.max(8, Math.min(100, ((p - 20) / 55) * 100)));
    }
    if (modo === "vantagem") {
      const pa = d.cands.find((c) => c.n === a)?.pct ?? 0;
      const pb = d.cands.find((c) => c.n === b)?.pct ?? 0;
      return misturar(cor(pa >= pb ? a : b), 20 + (Math.min(Math.abs(pa - pb), 40) / 40) * 80);
    }
    const li = lider(d);
    if (!li) return "var(--empty)";
    return misturar(cor(li.cand.n), 35 + (Math.min(li.margem, 30) / 30) * 65);
  }

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

  const abas: [Modo, string][] = [
    ["municipios", "Municípios"],
    ["estados", "Estados"],
    ["vantagem", "Vantagem"],
    ["apurado", "Apurado"],
  ];

  const lideresUf = new Set(Object.values(dados).map((d) => lider(d)?.cand.n).filter(Boolean));
  const mostrarMun = usaMunicipio && !indisponivel && malha;

  return (
    <section ref={cardRef} className="card relative p-5 sm:p-6 xl:flex xl:h-full xl:flex-col" aria-labelledby="t-mapa">
      <h2 id="t-mapa" className="sr-only">
        Mapa
      </h2>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="O que o mapa mostra">
        {abas.map(([m, t]) => (
          <button key={m} className="btn !min-h-[32px] !text-[12px]" aria-pressed={modo === m} onClick={() => setModo(m)}>
            {t}
          </button>
        ))}
        {/* select invisível por cima: o botão mostra só "Candidato" ou o nome escolhido */}
        <label
          className="btn relative inline-flex !min-h-[32px] cursor-pointer items-center gap-1.5 !text-[12px]"
          aria-pressed={modo === "candidato"}
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
        {usaMunicipio && !indisponivel && (
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
        {/* estados: por baixo dos municípios (aparecem enquanto a UF não carrega) */}
        {Object.entries(PATHS).map(([uf, d]) => (
          <path key={uf} d={d} data-uf={uf} fill={preencher(uf)} stroke="var(--card)" strokeWidth={1} className="cursor-pointer" />
        ))}

        {mostrarMun && <CamadaMunicipios malha={malha} porUf={porUf} modo={modoMun} a={a} b={b} cand={cand} />}

        {/* contorno dos estados por cima, sem pegar o mouse */}
        {mostrarMun &&
          Object.entries(PATHS).map(([uf, d]) => (
            <path key={uf} d={d} fill="none" stroke="var(--bg)" strokeWidth={0.9} pointerEvents="none" />
          ))}
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
          const [cx] = centros[uf];
          const p = pctEstado(uf);
          return (
            <g key={uf} data-uf={uf} className="cursor-pointer">
              <path d={`M${cx},${alvo} L${CAIXA_X - 6},${y}`} stroke="var(--ink3)" strokeWidth={0.6} fill="none" pointerEvents="none" />
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

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink2">
        {legenda === "municipios" && (
          <>
            {Object.entries(lideresMun)
              .sort((p, q) => q[1] - p[1])
              .slice(0, 4)
              .map(([n, qtd]) => (
                <span key={n} className="num inline-flex items-center gap-1.5">
                  <span className="sw" style={{ background: cor(n) }} />
                  {nomeDe(n)?.partido ?? n} <b className="text-ink">{fmt(qtd)}</b>
                </span>
              ))}
            <span className="text-ink3">
              {ufsCarregadas < 27 ? `municípios · carregando ${ufsCarregadas}/27 estados` : "municípios · cor mais forte = vantagem maior"}
            </span>
          </>
        )}
        {legenda === "estados" && (
          <>
            {soEstados && <span className="text-ink3">no replay o mapa mostra os estados ·</span>}
            {[a, b, ...br.cands.slice(2).map((c) => c.n)]
              .filter((n) => lideresUf.has(n))
              .map((n) => (
                <span key={n} className="inline-flex items-center gap-1.5">
                  <Escala n={n} />
                  {nomeDe(n)?.nome} lidera
                </span>
              ))}
            <span className="text-ink3">cor mais forte = vantagem maior</span>
          </>
        )}
        {modo === "vantagem" && (
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Escala n={a} /> {nomeDe(a)?.nome} na frente
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Escala n={b} /> {nomeDe(b)?.nome} na frente
            </span>
            <span className="text-ink3">até 40 pontos de diferença</span>
          </span>
        )}
        {modo === "candidato" && (
          <span className="inline-flex items-center gap-1.5">
            <Escala n={cand} />% dos válidos de {nomeDe(cand)?.nome} (20% → 75%+)
          </span>
        )}
        {modo === "apurado" && (
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>seções apuradas:</span>
            {FAIXAS.map((f) => (
              <span key={f.ate} className="inline-flex items-center gap-1.5">
                <span className="sw" style={{ background: misturar("var(--ok)", f.forca) }} />
                {f.txt}
              </span>
            ))}
          </span>
        )}
      </div>

      {tip ? (
        <Dica tip={tip} dados={dados} porUf={porUf} nomeDe={nomeDe} />
      ) : (
        mostrarMun && posDestaque && <Dica tip={posDestaque} dados={dados} porUf={porUf} nomeDe={nomeDe} fixo />
      )}
    </section>
  );
}

function CirculoPulsando({ el }: { el: SVGPathElement | null }) {
  if (!el) return null;
  const bb = el.getBBox();
  return (
    <circle cx={bb.x + bb.width / 2} cy={bb.y + bb.height / 2} r={6} fill="none" stroke="var(--ink)" strokeWidth={1.2}>
      <animate attributeName="r" values="4;12;4" dur="1.8s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="1;0;1" dur="1.8s" repeatCount="indefinite" />
    </circle>
  );
}

function Dica({
  tip,
  dados,
  porUf,
  nomeDe,
  fixo = false,
}: {
  fixo?: boolean;
  tip: Tip;
  dados: Dados;
  porUf: ReturnType<typeof useMunicipios>["porUf"];
  nomeDe: (n: string) => { nome: string } | undefined;
}) {
  let titulo = "";
  let apurado = 0;
  let linhas: { n: string; pct: number }[] = [];
  let rodape: React.ReactNode = null;

  if (tip.cdi) {
    const uf = ufDoMunicipio(tip.cdi);
    const d = porUf[uf];
    const m = d && lerMunicipio(d, tip.cdi);
    if (!d || !m) return null;
    titulo = `${d.nomes[tip.cdi] ?? "Município"} · ${uf.toUpperCase()}`;
    apurado = m.pst;
    linhas = m.cands.slice(0, 3);
  } else if (tip.uf) {
    const d = dados[tip.uf];
    if (!d) return null;
    titulo = NOMES[tip.uf];
    apurado = d.pst;
    linhas = d.cands.slice(0, 4);
    rodape = (
      <div className="num mt-1.5 flex justify-between text-ink3">
        <span>faltam</span>
        <span>{fmt(d.ts - d.st)} seções</span>
      </div>
    );
  }

  return (
    <div
      className={`card pointer-events-none absolute z-20 w-[230px] p-3 text-[12.5px] shadow-lg ${fixo ? "block" : "hidden md:block"}`}
      style={{ left: tip.x + 246 > tip.w ? tip.x - 242 : tip.x + 12, top: tip.y + 12 }}
    >
      <div className="mb-1.5 font-semibold">
        {titulo} <span className="font-normal text-ink3">· {pct(apurado, 1)} apurado</span>
      </div>
      {linhas.map((c) => (
        <div key={c.n} className="num flex justify-between gap-4">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="sw" style={{ background: cor(c.n) }} />
            <span className="truncate">{nomeDe(c.n)?.nome ?? c.n}</span>
          </span>
          <span>{pct(c.pct)}</span>
        </div>
      ))}
      {rodape}
    </div>
  );
}

function Escala({ n }: { n: string }) {
  return (
    <span className="inline-flex gap-0.5">
      {[35, 68, 100].map((f) => (
        <i key={f} className="block h-2 w-3.5 rounded-[2px]" style={{ background: misturar(cor(n), f) }} />
      ))}
    </span>
  );
}
