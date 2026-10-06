import { urlMunicipio } from "../eleicao";
import type { MunUf } from "../municipios";
import { int, titulo } from "../texto";
import { candidatosTSE, type ArquivoTSE } from "../tse-formato";
import { Bloqueado, buscarJson, momentoTSE, type MunConfig, type Vez } from "./tse";

// `fim`: municípios que já terminaram de apurar; não são baixados de novo
export type MunUfColeta = MunUf & { fim: string[] };

export async function coletarUf(
  eleicao: string,
  uf: string,
  cargo: string,
  lista: MunConfig[],
  vez: Vez,
  anterior?: MunUfColeta,
): Promise<MunUfColeta> {
  const votos = new Map<string, Map<string, number>>();
  const mun: Record<string, number[]> = {};
  const nomes: Record<string, string> = {};
  const fim = new Set(anterior?.fim ?? []);
  let hora = anterior?.hora ?? "";

  await Promise.all(
    lista.map(async (m) => {
      nomes[m.cdi] = titulo(m.nm);
      const antes = anterior?.mun[m.cdi];
      if (fim.has(m.cdi) && antes) {
        mun[m.cdi] = antes;
        return;
      }
      let j: ArquivoTSE | null = null;
      try {
        j = await buscarJson<ArquivoTSE>(urlMunicipio(eleicao, uf, m.cd, cargo), vez);
      } catch (e) {
        if (e instanceof Bloqueado) throw e;
      }
      if (!j) {
        if (antes) mun[m.cdi] = antes;
        return;
      }
      votos.set(m.cdi, new Map(candidatosTSE(j).map(({ k }) => [k.n, int(k.vap)])));
      mun[m.cdi] = [int(j.s?.st), int(j.s?.ts), int(j.v?.vv)];
      if (j.and === "f") fim.add(m.cdi);
      const momento = momentoTSE(j.dt, j.ht);
      if (momento > hora) hora = momento;
    }),
  );

  // candidato que aparecer pela primeira vez vai pro fim, pra não embaralhar as colunas já gravadas
  const cands = [...(anterior?.cands ?? [])];
  for (const v of votos.values()) for (const n of v.keys()) if (!cands.includes(n)) cands.push(n);
  for (const [cdi, v] of votos) mun[cdi] = [...mun[cdi], ...cands.map((n) => v.get(n) ?? 0)];

  return { eleicao, uf, hora, cands, nomes, mun, fim: [...fim] };
}
