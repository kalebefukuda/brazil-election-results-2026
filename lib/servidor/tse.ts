// Acesso do servidor ao TSE. O TSE bloqueia por 10 min o IP que passa de 100 req/s,
// então toda coleta passa pelo freio e para de vez no primeiro 403/429.
import { ELEICOES, TSE_BASE, urlDados, type Turno } from "../eleicao";
import { apuracaoComecou } from "../tse-formato";

export class Bloqueado extends Error {}

export type Vez = (() => Promise<void>) & { parar: () => void };

export function freio(porSegundo: number): Vez {
  const intervalo = 1000 / porSegundo;
  let proximo = 0;
  let parado = false;
  const vez = (async () => {
    if (parado) throw new Bloqueado("coleta interrompida");
    const agora = Date.now();
    const espera = Math.max(0, proximo - agora);
    proximo = Math.max(agora, proximo) + intervalo;
    if (espera) await new Promise((ok) => setTimeout(ok, espera));
    if (parado) throw new Bloqueado("coleta interrompida");
  }) as Vez;
  vez.parar = () => {
    parado = true;
  };
  return vez;
}

export async function buscarJson<T>(url: string, vez: Vez): Promise<T | null> {
  await vez();
  const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!r) return null;
  if (r.status === 403 || r.status === 429) {
    vez.parar();
    throw new Bloqueado(`TSE respondeu ${r.status}`);
  }
  return r.ok ? ((await r.json()) as T) : null;
}

export type Condicional<T> = { mudou: false } | { mudou: true; json: T | null; etag: string | null };

// pede com o ETag da última vez: se o TSE responder 304, nada mudou e nem o corpo vem
export async function buscarSeMudou<T>(url: string, etag: string | undefined, vez: Vez): Promise<Condicional<T>> {
  await vez();
  const r = await fetch(url, {
    cache: "no-store",
    headers: etag ? { "If-None-Match": etag } : {},
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (r?.status === 304) return { mudou: false };
  if (r?.status === 403 || r?.status === 429) {
    vez.parar();
    throw new Bloqueado(`TSE respondeu ${r.status}`);
  }
  if (!r?.ok) return { mudou: true, json: null, etag: null };
  return { mudou: true, json: (await r.json()) as T, etag: r.headers.get("etag") };
}

export async function turnoNoServidor(): Promise<Turno> {
  const r = await fetch(urlDados(ELEICOES[2].presidente, "br", "0001"), { cache: "no-store" }).catch(() => null);
  if (!r?.ok) return 1;
  return apuracaoComecou(await r.json()) ? 2 : 1;
}

export type MunConfig = { cd: string; cdi: string; nm: string };

export async function listaMunicipios(eleicao: string): Promise<Record<string, MunConfig[]>> {
  const r = await fetch(`${TSE_BASE}/${eleicao}/config/mun-e00${eleicao}-cm.json`, { next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`config de municípios: HTTP ${r.status}`);
  const j: { abr: { cd: string; mu: MunConfig[] }[] } = await r.json();
  const porUf: Record<string, MunConfig[]> = {};
  for (const a of j.abr) porUf[a.cd] = a.mu.map(({ cd, cdi, nm }) => ({ cd, cdi, nm }));
  return porUf;
}

// "05/10/2026" + "12:51:05" (Brasília) → ISO, que também ordena como texto
export function momentoTSE(dt: string, ht: string) {
  const [d, m, a] = dt.split("/");
  return `${a}-${m}-${d}T${ht}-03:00`;
}
