import { ELEICOES } from "@/lib/eleicao";
import type { Historico } from "@/lib/historico";
import { lerHistorico } from "@/lib/servidor/historico";
import { podeLer } from "@/lib/servidor/supabase";

// Linha do tempo e feed já montados pelo coletor: aqui só repassa (nada é calculado por visita).
const VALIDAS = new Set<string>([ELEICOES[1].presidente, ELEICOES[2].presidente]);
const CACHE = { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" };

// memória curta por instância: um parâmetro inventado na URL fura o CDN, mas não chega no banco
const memoria = new Map<string, { ate: number; corpo: Historico }>();

export async function GET(req: Request) {
  const eleicao = new URL(req.url).searchParams.get("e") || ELEICOES[1].presidente;
  if (!VALIDAS.has(eleicao)) return Response.json({ erro: "Parâmetros inválidos" }, { status: 400 });
  const vazio: Historico = { eleicao, cands: [], fotos: [], eventos: [] };

  if (!podeLer) {
    if (process.env.NODE_ENV === "development") {
      const { historicoFalso } = await import("@/lib/servidor/historico-falso");
      return Response.json(await historicoFalso(eleicao));
    }
    return Response.json(vazio);
  }

  try {
    const m = memoria.get(eleicao);
    if (m && Date.now() < m.ate) return Response.json(m.corpo, { headers: CACHE });
    const corpo = await lerHistorico(eleicao);
    memoria.set(eleicao, { ate: Date.now() + 15_000, corpo });
    return Response.json(corpo, { headers: CACHE });
  } catch (e) {
    console.error("histórico:", e);
    return Response.json({ erro: "falhou" }, { status: 502 });
  }
}
