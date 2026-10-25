"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NOMES, cor, ufDoMunicipio } from "@/lib/brasil";
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
import { useZoom, type Vista } from "./useZoom";
import DetalheMunicipio from "../DetalheMunicipio";
import Escolha from "../ui/Escolha";
import Modal from "../ui/Modal";
import { IconeMais, IconeMenos, IconeRestaurar } from "../Icones";

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
const BASE: Vista = { x: 0, y: 0, w: 700, h: 639 };
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
  const [municipio, setMunicipio] = useState<string | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const destaqueRef = useRef<SVGPathElement>(null);
  const zoom = useZoom(svgRef, BASE);
  const { quadro, z } = zoom;
  // traço cresce devagar no zoom (com √z): de perto as divisas aparecem sem virar faixa grossa
  const k = 1 / Math.sqrt(z);
  // ampliado, os estados pequenos já cabem no desenho: o nome vai dentro e as caixinhas saem
  const comCaixas = z < 2;

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
  }, [destaque, malha, modo, mostrarMun, quadro]);

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
    if (e.buttons && zoom.ampliado) return setTip(null);
    const alvo = e.target as SVGElement;
    const r = cardRef.current!.getBoundingClientRect();
    const pos = { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width };
    if (alvo.dataset.cdi) setTip({ ...pos, cdi: alvo.dataset.cdi });
    else if (alvo.dataset.uf) setTip({ ...pos, uf: alvo.dataset.uf });
    else setTip(null);
  }

  function clicar(e: React.MouseEvent<SVGSVGElement>) {
    if (zoom.foiArrasto()) return;
    const alvo = e.target as SVGElement;
    if (alvo.dataset.cdi) setMunicipio(alvo.dataset.cdi);
    else if (alvo.dataset.uf) onSelecionar(alvo.dataset.uf);
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
        <Escolha
          rotulo="Ver o mapa de um candidato"
          valor={modo === "candidato" ? cand : ""}
          opcoes={br.cands.map((c) => ({ valor: c.n, texto: c.nome, cor: cor(c.n), detalhe: c.partido }))}
          onMudar={(n) => {
            setCand(n);
            setModo("candidato");
          }}
          rotuloBotao={modo === "candidato" ? nomeDe(cand)?.nome.split(" ")[0] : "Candidato"}
          ativo={modo === "candidato"}
          className="!min-h-[32px]"
        />
        {mostrarMun && (
          <div className="ml-auto">
            <BuscaCidade porUf={porUf} onEscolher={setDestaque} />
          </div>
        )}
      </div>

      <div className="relative mx-auto mt-3 w-full max-w-[640px] xl:min-h-0 xl:max-w-none xl:flex-1">
        <svg
          ref={svgRef}
          viewBox={`${quadro.x} ${quadro.y} ${quadro.w} ${quadro.h}`}
          className={`block h-auto w-full select-none xl:h-full ${zoom.ampliado ? "cursor-grab active:cursor-grabbing" : ""}`}
          style={{ touchAction: zoom.ampliado ? "none" : "pan-y" }}
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
              strokeWidth={k}
              className="cursor-pointer"
            />
          ))}

          {/* no replay a camada só some: remontar 5.569 caminhos a cada troca trava */}
          {temMunicipios && (
            <g display={mostrarMun ? undefined : "none"}>
              <g strokeWidth={0.2 * k}>
                <CamadaMunicipios malha={malha} porUf={porUf} modo={modoCor} a={a} b={b} cand={cand} />
              </g>
              {Object.entries(PATHS).map(([uf, d]) => (
                <path key={uf} d={d} fill="none" stroke="var(--bg)" strokeWidth={0.9 * k} pointerEvents="none" />
              ))}
            </g>
          )}
          {mostrarMun && destaque && malha.mun[destaque] && (
            <g pointerEvents="none">
              <path ref={destaqueRef} d={malha.mun[destaque]} fill="none" stroke="var(--ink)" strokeWidth={1.6 * k} />
              {posDestaque && <CirculoPulsando el={destaqueRef.current} />}
            </g>
          )}
          {selecionado && PATHS[selecionado] && (
            <path d={PATHS[selecionado]} fill="none" stroke="var(--ink)" strokeWidth={2 * k} pointerEvents="none" />
          )}

          {Object.entries(centros)
            .filter(([uf]) => !comCaixas || !LATERAIS.includes(uf))
            .map(([uf, [x, y]]) => {
              const p = pctEstado(uf);
              const pequeno = uf === "df";
              // o nome mantém o tamanho na tela em qualquer zoom
              return (
                <text
                  key={uf}
                  transform={z > 1 ? `translate(${x} ${y}) scale(${1 / z}) translate(${-x} ${-y})` : undefined}
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

          {comCaixas &&
            caixas.map(({ uf, alvo, y }) => {
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
        <div className="absolute right-0 top-0 flex flex-col gap-1" role="group" aria-label="Zoom do mapa">
          <button
            className="btn grid !min-h-[30px] w-[30px] place-items-center !p-0"
            onClick={() => zoom.zoomEm(2)}
            disabled={z >= 11.9}
            aria-label="Aproximar o mapa"
            title="Aproximar (ou pinça / Ctrl + rolagem)"
          >
            <IconeMais className="h-3.5 w-3.5" />
          </button>
          <button
            className="btn grid !min-h-[30px] w-[30px] place-items-center !p-0"
            onClick={() => zoom.zoomEm(0.5)}
            disabled={!zoom.ampliado}
            aria-label="Afastar o mapa"
            title="Afastar"
          >
            <IconeMenos className="h-3.5 w-3.5" />
          </button>
          {zoom.ampliado && (
            <button
              className="btn grid !min-h-[30px] w-[30px] place-items-center !p-0"
              onClick={zoom.resetar}
              aria-label="Ver o Brasil inteiro"
              title="Ver o Brasil inteiro"
            >
              <IconeRestaurar className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

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

      <Modal
        aberto={!!municipio && !!porUf[ufDoMunicipio(municipio)]}
        onFechar={() => setMunicipio(null)}
        rotulo={
          municipio
            ? `${porUf[ufDoMunicipio(municipio)]?.nomes[municipio] ?? "Município"}, ${NOMES[ufDoMunicipio(municipio)]}`
            : ""
        }
      >
        {municipio && porUf[ufDoMunicipio(municipio)] && (
          <DetalheMunicipio
            d={porUf[ufDoMunicipio(municipio)]}
            cdi={municipio}
            br={br}
            onFechar={() => setMunicipio(null)}
            onVerEstado={(uf) => {
              setMunicipio(null);
              onSelecionar(uf);
            }}
          />
        )}
      </Modal>
    </section>
  );
}
