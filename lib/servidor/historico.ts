// Histórico pronto pra servir: o coletor monta depois de gravar uma foto nova e /api/historico só repassa.
import { enxugar, type Foto, type Historico } from "../historico";
import { gravar, ler } from "./supabase";

type Linha = { momento: string; br: Foto; ufs: Record<string, Foto> };

const chave = (eleicao: string) => `historico-${eleicao}`;

async function eventosRecentes(eleicao: string) {
  return ler<Historico["eventos"][number]>(
    "apuracao_evento",
    `eleicao=eq.${eleicao}&order=momento.desc&select=momento,tipo,uf,dados&limit=50`,
  );
}

function comFoto(h: Historico, f: Linha): Historico {
  // candidato novo vai pro fim: as fotos antigas ficam mais curtas e quem lê usa 0
  const cands = [...h.cands];
  for (const n of Object.keys(f.br.c)) if (!cands.includes(n)) cands.push(n);
  const foto = {
    momento: f.momento,
    br: enxugar(f.br, cands),
    ufs: Object.fromEntries(Object.entries(f.ufs).map(([uf, x]) => [uf, enxugar(x, cands)])),
  };
  return { ...h, cands, fotos: [...h.fotos, foto] };
}

// do zero, a partir de todas as fotos gravadas (primeira vez de cada eleição)
async function montar(eleicao: string): Promise<Historico> {
  const fotos = await ler<Linha>("apuracao_snapshot", `eleicao=eq.${eleicao}&order=momento.asc&select=momento,br,ufs`);
  const ultima = fotos.at(-1)?.br.c ?? {};
  const vazio: Historico = {
    eleicao,
    cands: Object.keys(ultima).sort((a, b) => ultima[b] - ultima[a]),
    fotos: [],
    eventos: [],
  };
  return fotos.reduce(comFoto, vazio);
}

export async function publicarHistorico(eleicao: string, nova: Linha) {
  const [linha] = await ler<{ valor: Historico }>("apuracao_estado", `chave=eq.${chave(eleicao)}&select=valor`).catch(
    () => [],
  );
  const base = linha?.valor;
  const mesmo = (m: string) => new Date(m).getTime() === new Date(nova.momento).getTime();
  const h = !base ? await montar(eleicao) : base.fotos.some((f) => mesmo(f.momento)) ? base : comFoto(base, nova);
  h.eventos = await eventosRecentes(eleicao);
  await gravar("apuracao_estado", { chave: chave(eleicao), valor: h }, "chave", "atualiza").catch((e) =>
    console.error("histórico (gravação):", e),
  );
}

// sem histórico pronto (ex.: 1º turno, fechado antes do coletor publicar), monta na hora só pra leitura
export async function lerHistorico(eleicao: string): Promise<Historico> {
  const pronto = await ler<{ valor: Historico }>("apuracao_estado", `chave=eq.${chave(eleicao)}&select=valor`).catch(
    () => [],
  );
  if (pronto[0]?.valor) return pronto[0].valor;
  const h = await montar(eleicao);
  h.eventos = await eventosRecentes(eleicao);
  return h;
}
