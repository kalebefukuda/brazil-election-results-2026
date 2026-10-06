// Resultado por município: o TSE publica um arquivo por cidade (≈5.570 por eleição).
// Só o servidor baixa isso, com freio, porque o TSE bloqueia por 10 min quem passa de 100 req/s por IP.
import { TSE_BASE, urlMunicipio } from "./eleicao";

export type MunUf = {
  eleicao: string;
  uf: string;
  hora: string; // horário de totalização mais recente entre os municípios
  cands: string[]; // números dos candidatos, na ordem dos votos em `mun`
  nomes: Record<string, string>; // código IBGE → nome
  // código IBGE → [seções totalizadas, total de seções, votos válidos, votos de cada candidato em `cands`]
  mun: Record<string, number[]>;
};

type MunConfig = { cd: string; cdi: string; nm: string };

const int = (s?: string) => parseInt(s || "0", 10);

function titulo(s: string) {
  return s
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
    .replace(/\b(Da|De|Do|Dos|Das|E)\b/g, (m) => m.toLowerCase())
    .replace(/D'\S/g, (m) => m.slice(0, 2) + m[2].toUpperCase());
}

// lista de municípios da eleição (muda raramente): uma hora de cache
export async function listaMunicipios(eleicao: string): Promise<Record<string, MunConfig[]>> {
  const r = await fetch(`${TSE_BASE}/${eleicao}/config/mun-e00${eleicao}-cm.json`, { next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`config de municípios: HTTP ${r.status}`);
  const j = await r.json();
  const porUf: Record<string, MunConfig[]> = {};
  for (const a of j.abr) porUf[a.cd] = a.mu.map((m: MunConfig) => ({ cd: m.cd, cdi: m.cdi, nm: m.nm }));
  return porUf;
}

// fila com teto de requisições por segundo, compartilhada por toda a coleta
export function freio(porSegundo: number) {
  const intervalo = 1000 / porSegundo;
  let proximo = 0;
  return async function vez() {
    const agora = Date.now();
    const espera = Math.max(0, proximo - agora);
    proximo = Math.max(agora, proximo) + intervalo;
    if (espera) await new Promise((ok) => setTimeout(ok, espera));
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function votos(j: any): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of j.carg[0].agr) for (const p of a.par) for (const k of p.cand) m.set(k.n, int(k.vap));
  return m;
}

// `anterior` permite pular municípios que já terminaram de apurar (and = "f") na rodada passada
export async function coletarUf(
  eleicao: string,
  uf: string,
  cargo: string,
  lista: MunConfig[],
  vez: () => Promise<void>,
  anterior?: MunUf & { fim?: string[] }
): Promise<MunUf & { fim: string[] }> {
  const brutos = new Map<string, Map<string, number>>();
  const mun: Record<string, number[]> = {};
  const nomes: Record<string, string> = {};
  const fim = new Set(anterior?.fim ?? []);
  let hora = anterior?.hora ?? "";
  const ordem = anterior?.cands ?? [];

  await Promise.all(
    lista.map(async (m) => {
      nomes[m.cdi] = titulo(m.nm);
      if (fim.has(m.cdi) && anterior?.mun[m.cdi]) {
        mun[m.cdi] = anterior.mun[m.cdi];
        return;
      }
      await vez();
      try {
        const r = await fetch(urlMunicipio(eleicao, uf, m.cd, cargo), { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        brutos.set(m.cdi, votos(j));
        mun[m.cdi] = [int(j.s?.st), int(j.s?.ts), int(j.v?.vv)];
        if (j.and === "f") fim.add(m.cdi);
        if (j.ht && j.ht > hora) hora = j.ht;
      } catch {
        // falhou: fica o dado anterior, se tiver
        if (anterior?.mun[m.cdi]) mun[m.cdi] = anterior.mun[m.cdi];
      }
    })
  );

  // ordem dos candidatos: a da rodada anterior; quem aparecer novo vai pro fim
  const cands = [...ordem];
  for (const v of brutos.values()) for (const n of v.keys()) if (!cands.includes(n)) cands.push(n);
  for (const [cdi, v] of brutos) mun[cdi] = [...mun[cdi], ...cands.map((n) => v.get(n) ?? 0)];

  return { eleicao, uf, hora, cands, nomes, mun, fim: [...fim] };
}
