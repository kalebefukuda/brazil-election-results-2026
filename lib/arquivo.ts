// Baixa um arquivo de resultado no navegador: ano passado vem do próprio site; 2026 tenta o TSE direto
// e, se o navegador não conseguir (CORS/rede), passa a usar o /api/tse pelo resto da sessão.
import { ehPassada, urlDados } from "./eleicao";
import type { ArquivoTSE } from "./tse-formato";

export class SemArquivo extends Error {}

let usarProxy = false;

export async function baixarArquivo(eleicao: string, uf: string, cargo: string): Promise<ArquivoTSE> {
  if (ehPassada(eleicao)) {
    const r = await fetch(urlDados(eleicao, uf, cargo));
    if (!r.ok) throw new SemArquivo(`${uf}: HTTP ${r.status}`);
    return r.json();
  }
  if (!usarProxy) {
    try {
      const r = await fetch(`${urlDados(eleicao, uf, cargo)}?nocache=${Date.now()}`, { cache: "no-store" });
      if (r.ok) return await r.json();
      if (r.status === 404) throw new SemArquivo(`${uf}: sem arquivo`);
    } catch (e) {
      if (e instanceof SemArquivo) throw e;
    }
    usarProxy = true;
  }
  const r = await fetch(`/api/tse/${uf}?e=${eleicao}&c=${cargo}`, { cache: "no-store" });
  if (r.status === 404) throw new SemArquivo(`${uf}: sem arquivo`);
  if (!r.ok) throw new Error(`${uf}: HTTP ${r.status}`);
  return r.json();
}
