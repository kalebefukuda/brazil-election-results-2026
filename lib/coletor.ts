// Coletor: roda no servidor a cada minuto (pg_cron → /api/coletar). Tira uma "foto" do Brasil e dos
// estados no horário de totalização do TSE e gera os eventos do feed "Últimas atualizações".
import { UFS } from "./brasil";
import { ELEICOES, TSE_BASE, definido, urlDados, type Turno } from "./eleicao";
import { freio } from "./municipios";
import { gravar, ler, temSupabase } from "./supabase";

// st/ts seções, vv válidos, cp comparecimento, ab abstenção, vb brancos, vn nulos, tv total de votos,
// esnt eleitores em seções não totalizadas, c votos por candidato
export type Foto = {
  st: number;
  ts: number;
  vv: number;
  cp: number;
  ab: number;
  vb: number;
  vn: number;
  tv: number;
  esnt: number;
  c: Record<string, number>;
  md?: string;
};
export type Snapshot = { eleicao: string; momento: string; br: Foto; ufs: Record<string, Foto> };
export type Evento = {
  eleicao: string;
  momento: string;
  tipo: "secoes" | "presidente" | "governador";
  uf: string | null;
  chave: string;
  dados: Record<string, unknown>;
};

type Cand = { n: string; nome: string; partido: string; votos: number; st: string };

const int = (s?: string) => parseInt(s || "0", 10);

function titulo(s: string) {
  return s
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
    .replace(/\b(Da|De|Do|Dos|Das|E)\b/g, (m) => m.toLowerCase());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function candidatos(j: any): Cand[] {
  const out: Cand[] = [];
  for (const a of j.carg[0].agr)
    for (const p of a.par) for (const k of p.cand) out.push({ n: k.n, nome: titulo(k.nmu), partido: p.sg, votos: int(k.vap), st: k.st || "" });
  return out.sort((x, y) => y.votos - x.votos);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function foto(j: any): Foto {
  const cs = candidatos(j);
  const c: Record<string, number> = {};
  for (const k of cs) c[k.n] = k.votos;
  return {
    st: int(j.s?.st),
    ts: int(j.s?.ts),
    vv: int(j.v?.vv),
    cp: int(j.e?.c),
    ab: int(j.e?.a),
    vb: int(j.v?.vb),
    vn: int(j.v?.tvn),
    tv: int(j.v?.tv),
    esnt: int(j.e?.esnt),
    c,
    md: definido(j.md, cs),
  };
}

// "05/10/2026" + "12:51:05" (horário de Brasília) → ISO
function momentoTSE(dt: string, ht: string) {
  const [d, m, a] = dt.split("/");
  return `${a}-${m}-${d}T${ht}-03:00`;
}

const mesmoMomento = (a: string, b: string) => new Date(a).getTime() === new Date(b).getTime();

export async function turnoNoServidor(): Promise<Turno> {
  const r = await fetch(urlDados(ELEICOES[2].presidente, "br", "0001"), { cache: "no-store" });
  return r.ok ? 2 : 1;
}

async function baixar(url: string, vez: () => Promise<void>) {
  await vez();
  try {
    const r = await fetch(url, { cache: "no-store" });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

// UFs que têm governador nessa eleição estadual (no 2º turno são só algumas)
async function ufsComGovernador(eleicao: string) {
  const r = await fetch(`${TSE_BASE}/${eleicao}/config/mun-e00${eleicao}-cm.json`, { next: { revalidate: 3600 } });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.abr as { cd: string }[]).map((a) => a.cd).filter((uf) => uf !== "zz" && uf !== "br");
}

const top = (cs: Cand[], vv: number) =>
  cs.slice(0, 2).map((k) => ({ n: k.n, nome: k.nome, partido: k.partido, pct: vv ? (k.votos / vv) * 100 : 0 }));

// Brasil + 27 UFs + exterior do presidente, já no formato de foto
export async function baixarFotos(eleicao: string, vez: () => Promise<void>) {
  const [brJ, ...ufsJ] = await Promise.all(["br", ...UFS].map((uf) => baixar(urlDados(eleicao, uf, "0001"), vez)));
  if (!brJ) throw new Error("TSE sem o arquivo nacional");
  const ufs: Record<string, Foto> = {};
  UFS.forEach((uf, i) => {
    if (ufsJ[i]) ufs[uf] = foto(ufsJ[i]);
  });
  return { brJ, br: foto(brJ), ufs };
}

export async function coletar({ seco }: { seco: boolean }) {
  const turno = await turnoNoServidor();
  const eleicao = ELEICOES[turno].presidente;
  const vez = freio(20);

  const { brJ, br, ufs } = await baixarFotos(eleicao, vez);
  const snap: Snapshot = { eleicao, momento: momentoTSE(brJ.dt, brJ.ht), br, ufs };

  const [ultimo] = temSupabase
    ? await ler<{ momento: string; br: Foto }>(
        "apuracao_snapshot",
        `eleicao=eq.${eleicao}&order=momento.desc&limit=1&select=momento,br`
      )
    : [];
  const novo = !ultimo || !mesmoMomento(ultimo.momento, snap.momento);

  const eventos: Evento[] = [];
  const cands = candidatos(brJ);

  // mais seções apuradas desde a última foto
  if (ultimo && novo && snap.br.st > ultimo.br.st) {
    eventos.push({
      eleicao,
      momento: snap.momento,
      tipo: "secoes",
      uf: null,
      chave: `${eleicao}-secoes-${snap.momento}`,
      dados: { secoes: snap.br.st - ultimo.br.st, pst: snap.br.ts ? (snap.br.st / snap.br.ts) * 100 : 0, top: top(cands, snap.br.vv) },
    });
  }

  // presidente definido: "e" = eleito, "s" = vai pro 2º turno (o TSE marca quando não muda mais)
  if (snap.br.md === "e" || snap.br.md === "s") {
    eventos.push({
      eleicao,
      momento: snap.momento,
      tipo: "presidente",
      uf: null,
      chave: `${eleicao}-presidente-${snap.br.md}`,
      dados: { md: snap.br.md, top: top(cands, snap.br.vv) },
    });
  }

  // governador eleito (a chave única garante um evento por estado)
  const estadual = ELEICOES[turno].estadual;
  const govUfs = await ufsComGovernador(estadual);
  const govJ = await Promise.all(govUfs.map((uf) => baixar(urlDados(estadual, uf, "0003"), vez)));
  govUfs.forEach((uf, i) => {
    const j = govJ[i];
    if (!j) return;
    const cs = candidatos(j);
    if (definido(j.md, cs) !== "e") return;
    const [eleito] = cs;
    eventos.push({
      eleicao,
      momento: momentoTSE(j.dt, j.ht),
      tipo: "governador",
      uf,
      chave: `${estadual}-governador-${uf}`,
      dados: { uf, eleito: top([eleito], int(j.v?.vv))[0] },
    });
  });

  if (!seco && temSupabase) {
    if (novo) await gravar("apuracao_snapshot", snap, "eleicao,momento", "ignora");
    if (eventos.length) await gravar("apuracao_evento", eventos, "chave", "ignora");
  }

  return { turno, eleicao, momento: snap.momento, novo, gravado: novo && !seco && temSupabase, ufs: Object.keys(ufs).length, eventos };
}
