// Só em desenvolvimento, sem Supabase: baixa os municípios direto do TSE.
// Um freio e uma memória de 60s pro processo inteiro, pra as 27 UFs não somarem mais que 40 req/s.
import type { MunUf } from "../municipios";
import { coletarUf } from "./municipios";
import { freio, listaMunicipios } from "./tse";

const vez = freio(40);
const memoria = new Map<string, { ate: number; p: Promise<MunUf | null> }>();

async function buscar(eleicao: string, uf: string): Promise<MunUf | null> {
  const lista = (await listaMunicipios(eleicao))[uf];
  if (!lista) return null;
  const { fim: _, ...dados } = await coletarUf(eleicao, uf, "0001", lista, vez);
  return dados;
}

export function municipiosDireto(eleicao: string, uf: string) {
  const chave = `${eleicao}-${uf}`;
  const m = memoria.get(chave);
  if (m && Date.now() < m.ate) return m.p;
  const p = buscar(eleicao, uf);
  const novo = { ate: Infinity, p };
  memoria.set(chave, novo);
  p.then(
    () => (novo.ate = Date.now() + 60_000),
    () => memoria.get(chave) === novo && memoria.delete(chave),
  );
  return p;
}
