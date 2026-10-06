import type { Foto } from "@/lib/coletor";
import { ELEICOES } from "@/lib/eleicao";
import { enxugar, type Historico } from "@/lib/historico";
import { historicoFalso } from "@/lib/historico-falso";
import { ler, temSupabase } from "@/lib/supabase";

// Fotos da apuração (pra linha do tempo e o gráfico) e os últimos eventos (pro feed).
// Formato enxuto: cada foto vira [st, ts, vv, votos de cada candidato na ordem de `cands`].
const VALIDAS = new Set<string>([ELEICOES[1].presidente, ELEICOES[2].presidente]);

export async function GET(req: Request) {
  const eleicao = new URL(req.url).searchParams.get("e") || ELEICOES[1].presidente;
  if (!VALIDAS.has(eleicao)) return Response.json({ erro: "Parâmetros inválidos" }, { status: 400 });

  if (!temSupabase) {
    // dev local sem Supabase: apuração simulada a partir do resultado real, pra montar a interface
    if (process.env.NODE_ENV === "development") return Response.json(await historicoFalso(eleicao));
    return Response.json({ eleicao, cands: [], fotos: [], eventos: [] } satisfies Historico);
  }

  try {
    const [fotos, eventos] = await Promise.all([
      ler<{ momento: string; br: Foto; ufs: Record<string, Foto> }>(
        "apuracao_snapshot",
        `eleicao=eq.${eleicao}&order=momento.asc&select=momento,br,ufs&limit=2000`
      ),
      ler<Historico["eventos"][number]>(
        "apuracao_evento",
        `eleicao=eq.${eleicao}&order=momento.desc&select=momento,tipo,uf,dados&limit=50`
      ),
    ]);

    // ordem dos candidatos = votos na foto mais recente
    const ultima = fotos.at(-1)?.br.c ?? {};
    const cands = Object.keys(ultima).sort((a, b) => ultima[b] - ultima[a]);
    const enxuto = (f: Foto) => enxugar(f, cands);

    const corpo: Historico = {
      eleicao,
      cands,
      fotos: fotos.map((f) => ({
        momento: f.momento,
        br: enxuto(f.br),
        ufs: Object.fromEntries(Object.entries(f.ufs).map(([uf, x]) => [uf, enxuto(x)])),
      })),
      eventos,
    };
    return Response.json(corpo, { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "falhou" }, { status: 502 });
  }
}
