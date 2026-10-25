"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Vista = { x: number; y: number; w: number; h: number };
type Ponto = { x: number; y: number };

const MAX = 12;

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const meio = (a: Touch, b: Touch) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });
const distancia = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);
const ponto = (t: Touch | PointerEvent) => ({ x: t.clientX, y: t.clientY });

// o SVG encaixa o desenho centralizado sem distorcer ("meet"): escala e sobra de cada lado
function encaixe(v: Vista, r: DOMRect) {
  const s = Math.min(r.width / v.w, r.height / v.h);
  return { s, ox: r.left + (r.width - v.w * s) / 2, oy: r.top + (r.height - v.h * s) / 2 };
}

// zoom no viewBox (continua vetor, sem borrar): pinça e arrasto no celular, Ctrl/⌘ + rolagem e arrasto no mouse
export function useZoom(svgRef: React.RefObject<SVGSVGElement | null>, base: Vista) {
  const [quadro, setQuadro] = useState(base);
  const atual = useRef(quadro);
  const arrastou = useRef(false);

  const paraDesenho = useCallback(
    (t: Ponto) => {
      const v = atual.current;
      const { s, ox, oy } = encaixe(v, svgRef.current!.getBoundingClientRect());
      return { x: v.x + (t.x - ox) / s, y: v.y + (t.y - oy) / s };
    },
    [svgRef],
  );

  // largura w nova, mantendo o ponto p do desenho embaixo do ponto t da tela
  const posicionar = useCallback(
    (w: number, p: Ponto, t: Ponto) => {
      w = limitar(w, base.w / MAX, base.w);
      const h = (w * base.h) / base.w;
      const { s, ox, oy } = encaixe({ ...base, w, h }, svgRef.current!.getBoundingClientRect());
      const v = {
        x: limitar(p.x - (t.x - ox) / s, base.x, base.x + base.w - w),
        y: limitar(p.y - (t.y - oy) / s, base.y, base.y + base.h - h),
        w,
        h,
      };
      atual.current = v;
      setQuadro(v);
    },
    [base, svgRef],
  );

  const zoomEm = useCallback(
    (fator: number, t?: Ponto) => {
      const r = svgRef.current!.getBoundingClientRect();
      t ??= { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      posicionar(atual.current.w / fator, paraDesenho(t), t);
    },
    [posicionar, paraDesenho, svgRef],
  );

  const resetar = useCallback(() => {
    atual.current = base;
    setQuadro(base);
  }, [base]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ampliado = () => atual.current.w < base.w * 0.99;
    // gesto em andamento: p é o ponto do desenho que acompanha o dedo (ou o meio dos dois dedos)
    let gesto: { p: Ponto; t0: Ponto; dist: number; w: number } | null = null;

    function comecar(ts: TouchList) {
      if (ts.length >= 2) {
        const m = meio(ts[0], ts[1]);
        gesto = { p: paraDesenho(m), t0: m, dist: distancia(ponto(ts[0]), ponto(ts[1])), w: atual.current.w };
      } else if (ts.length === 1 && ampliado()) {
        const t = ponto(ts[0]);
        gesto = { p: paraDesenho(t), t0: t, dist: 0, w: atual.current.w };
      } else gesto = null;
    }

    function tocar(e: TouchEvent) {
      if (e.touches.length === 1) arrastou.current = false;
      if (e.touches.length >= 2) e.preventDefault();
      comecar(e.touches);
    }

    function moverDedo(e: TouchEvent) {
      if (!gesto) return;
      const ts = e.touches;
      if (ts.length >= 2 && gesto.dist) {
        e.preventDefault();
        arrastou.current = true;
        posicionar((gesto.w * gesto.dist) / distancia(ponto(ts[0]), ponto(ts[1])), gesto.p, meio(ts[0], ts[1]));
      } else if (ts.length === 1 && !gesto.dist) {
        const t = ponto(ts[0]);
        if (distancia(t, gesto.t0) > 6) arrastou.current = true;
        if (!arrastou.current) return;
        e.preventDefault();
        posicionar(atual.current.w, gesto.p, t);
      }
    }

    // tirou um dos dois dedos: o que ficou continua arrastando
    const soltar = (e: TouchEvent) => comecar(e.touches);

    function rolar(e: WheelEvent) {
      // rolagem sozinha continua rolando a página; a pinça do trackpad chega como Ctrl + rolagem
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomEm(Math.exp(-limitar(e.deltaY, -50, 50) * 0.01), ponto(e as unknown as PointerEvent));
    }

    let mouse: { p: Ponto; t0: Ponto } | null = null;
    function apertar(e: PointerEvent) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      arrastou.current = false;
      mouse = ampliado() ? { p: paraDesenho(ponto(e)), t0: ponto(e) } : null;
    }
    function moverMouse(e: PointerEvent) {
      if (!mouse || !(e.buttons & 1)) return;
      if (!arrastou.current && distancia(ponto(e), mouse.t0) <= 4) return;
      if (!arrastou.current) {
        arrastou.current = true;
        svg!.setPointerCapture(e.pointerId);
      }
      posicionar(atual.current.w, mouse.p, ponto(e));
    }
    const largar = () => (mouse = null);

    const ativo = { passive: false };
    svg.addEventListener("touchstart", tocar, ativo);
    svg.addEventListener("touchmove", moverDedo, ativo);
    svg.addEventListener("touchend", soltar);
    svg.addEventListener("touchcancel", soltar);
    svg.addEventListener("wheel", rolar, ativo);
    svg.addEventListener("pointerdown", apertar);
    svg.addEventListener("pointermove", moverMouse);
    svg.addEventListener("pointerup", largar);
    svg.addEventListener("pointercancel", largar);
    return () => {
      svg.removeEventListener("touchstart", tocar);
      svg.removeEventListener("touchmove", moverDedo);
      svg.removeEventListener("touchend", soltar);
      svg.removeEventListener("touchcancel", soltar);
      svg.removeEventListener("wheel", rolar);
      svg.removeEventListener("pointerdown", apertar);
      svg.removeEventListener("pointermove", moverMouse);
      svg.removeEventListener("pointerup", largar);
      svg.removeEventListener("pointercancel", largar);
    };
  }, [base, svgRef, paraDesenho, posicionar, zoomEm]);

  const z = base.w / quadro.w;
  return {
    quadro,
    z,
    ampliado: z > 1.01,
    zoomEm,
    resetar,
    // clique que terminou um arrasto não abre município nem estado
    foiArrasto: () => arrastou.current,
  };
}
