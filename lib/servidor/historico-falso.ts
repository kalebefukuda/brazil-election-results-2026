// Só em desenvolvimento, sem Supabase: simula a apuração de 0% a 100% a partir do resultado final real.
import { REGIAO_DE } from "../brasil";
import { enxugar, type EventoFeed, type Foto, type Historico } from "../historico";
import { baixarFotos } from "./coletor";
import { freio } from "./tse";

// minutos até cada região começar a aparecer
const ATRASO: Record<string, number> = {
  Sul: 0,
  Sudeste: 5,
  "Centro-Oeste": 10,
  Nordeste: 20,
  Norte: 35,
  Exterior: 60,
};
const QUADROS = 84; // de 5 em 5 min, das 17h à meia-noite

let guardado: Historico | null = null;

function escalar(f: Foto, frac: number, vies: Record<string, number>): Foto {
  const r = (x: number) => Math.round(x * frac);
  // no começo, as primeiras urnas puxam um pouco pra um lado; no fim volta ao resultado real
  const bruto: Record<string, number> = {};
  let soma = 0;
  for (const [n, v] of Object.entries(f.c)) {
    bruto[n] = v * (1 + (vies[n] ?? 0) * (1 - frac));
    soma += bruto[n];
  }
  const vv = r(f.vv);
  const c: Record<string, number> = {};
  for (const n of Object.keys(bruto)) c[n] = soma ? Math.round((bruto[n] / soma) * vv) : 0;
  return {
    st: r(f.st),
    ts: f.ts,
    vv,
    cp: r(f.cp),
    ab: r(f.ab),
    vb: r(f.vb),
    vn: r(f.vn),
    tv: r(f.tv),
    esnt: Math.round((f.cp + f.ab) * (1 - frac)),
    c,
  };
}

function somar(fotos: Foto[], ts: number): Foto {
  const t: Foto = { st: 0, ts, vv: 0, cp: 0, ab: 0, vb: 0, vn: 0, tv: 0, esnt: 0, c: {} };
  for (const f of fotos) {
    for (const k of ["st", "vv", "cp", "ab", "vb", "vn", "tv", "esnt"] as const) t[k] += f[k];
    for (const [n, v] of Object.entries(f.c)) t.c[n] = (t.c[n] ?? 0) + v;
  }
  return t;
}

export async function historicoFalso(eleicao: string): Promise<Historico> {
  if (guardado?.eleicao === eleicao) return guardado;
  const { br, ufs } = await baixarFotos(eleicao, freio(20));
  const cands = Object.keys(br.c).sort((a, b) => br.c[b] - br.c[a]);
  const vies = { [cands[0]]: 0.08, [cands[1]]: -0.06 };
  const inicio = new Date("2026-10-04T17:00:00-03:00").getTime();

  const fotos: Historico["fotos"] = [];
  const eventos: EventoFeed[] = [];
  let stAntes = 0;

  for (let i = 1; i <= QUADROS; i++) {
    const minuto = i * 5;
    const parciais: Record<string, Foto> = {};
    for (const [uf, f] of Object.entries(ufs)) {
      const t = Math.max(0, minuto - (ATRASO[REGIAO_DE[uf]] ?? 0));
      parciais[uf] = escalar(f, i === QUADROS ? 1 : 1 - Math.exp(-t / 75), vies);
    }
    const total = somar(Object.values(parciais), br.ts);
    if (total.st === stAntes) continue;
    const momento = new Date(inicio + minuto * 60_000).toISOString();
    fotos.push({
      momento,
      br: enxugar(total, cands),
      ufs: Object.fromEntries(Object.entries(parciais).map(([uf, f]) => [uf, enxugar(f, cands)])),
    });
    eventos.push({
      momento,
      tipo: "secoes",
      uf: null,
      dados: {
        secoes: total.st - stAntes,
        pst: (total.st / total.ts) * 100,
        top: cands.slice(0, 2).map((n) => ({ n, pct: total.vv ? (total.c[n] / total.vv) * 100 : 0 })),
      },
    });
    stAntes = total.st;
  }

  guardado = { eleicao, cands, fotos, eventos: eventos.reverse().slice(0, 50) };
  return guardado;
}
