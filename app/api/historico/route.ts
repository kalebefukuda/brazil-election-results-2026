import { ELEICOES } from "@/lib/eleicao";
import { enxugar, type Foto, type Historico } from "@/lib/historico";
import { ler, podeLer } from "@/lib/servidor/supabase";

const VALIDAS = new Set<string>([ELEICOES[1].presidente, ELEICOES[2].presidente]);
const CACHE = { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" };

// memória curta por instância: um parâmetro inventado na URL fura o CDN, mas não chega no banco
const memoria = new Map<string, { ate: number; corpo: Historico }>();

async function montar(eleicao: string): Promise<Historico> {
  const [fotos, eventos] = await Promise.all([
    ler<{ momento: string; br: Foto; ufs: Record<string, Foto> }>(
      "apuracao_snapshot",
      `eleicao=eq.${eleicao}&order=momento.desc&select=momento,br,ufs&limit=1500`,
    ),
    ler<Historico["eventos"][number]>(
      "apuracao_evento",
      `eleicao=eq.${eleicao}&order=momento.desc&select=momento,tipo,uf,dados&limit=50`,
    ),
  ]);
  fotos.reverse();

  const ultima = fotos.at(-1)?.br.c ?? {};
  const cands = Object.keys(ultima).sort((a, b) => ultima[b] - ultima[a]);
  return {
    eleicao,
    cands,
    fotos: fotos.map((f) => ({
      momento: f.momento,
      br: enxugar(f.br, cands),
      ufs: Object.fromEntries(Object.entries(f.ufs).map(([uf, x]) => [uf, enxugar(x, cands)])),
    })),
    eventos,
  };
}

export async function GET(req: Request) {
  const eleicao = new URL(req.url).searchParams.get("e") || ELEICOES[1].presidente;
  if (!VALIDAS.has(eleicao)) return Response.json({ erro: "Parâmetros inválidos" }, { status: 400 });

  if (!podeLer) {
    if (process.env.NODE_ENV === "development") {
      const { historicoFalso } = await import("@/lib/servidor/historico-falso");
      return Response.json(await historicoFalso(eleicao));
    }
    return Response.json({ eleicao, cands: [], fotos: [], eventos: [] } satisfies Historico);
  }

  try {
    const m = memoria.get(eleicao);
    if (m && Date.now() < m.ate) return Response.json(m.corpo, { headers: CACHE });
    const corpo = await montar(eleicao);
    memoria.set(eleicao, { ate: Date.now() + 15_000, corpo });
    return Response.json(corpo, { headers: CACHE });
  } catch (e) {
    console.error("histórico:", e);
    return Response.json({ erro: "falhou" }, { status: 502 });
  }
}
