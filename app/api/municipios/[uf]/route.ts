import { UFS } from "@/lib/brasil";
import { ELEICOES } from "@/lib/eleicao";
import type { MunUfColeta } from "@/lib/servidor/municipios";
import { ler, podeLer } from "@/lib/servidor/supabase";

// Municípios de uma UF (presidente, 2026). Lê o que o coletor gravou: o visitante nunca fala com o TSE.
const PRESIDENTE = new Set<string>([ELEICOES[1].presidente, ELEICOES[2].presidente]);

export async function GET(req: Request, { params }: { params: Promise<{ uf: string }> }) {
  const { uf } = await params;
  const eleicao = new URL(req.url).searchParams.get("e") || ELEICOES[1].presidente;
  if (!UFS.includes(uf) || uf === "zz" || !PRESIDENTE.has(eleicao)) {
    return Response.json({ erro: "Parâmetros inválidos" }, { status: 400 });
  }

  if (!podeLer) {
    if (process.env.NODE_ENV === "development") {
      const { municipiosDireto } = await import("@/lib/servidor/municipios-dev");
      const dados = await municipiosDireto(eleicao, uf);
      return dados ? Response.json(dados) : Response.json({ erro: "UF sem municípios" }, { status: 404 });
    }
    return Response.json({ erro: "coletor não configurado" }, { status: 503 });
  }

  try {
    const [linha] = await ler<{ dados: MunUfColeta }>(
      "apuracao_municipios",
      `eleicao=eq.${eleicao}&uf=eq.${uf}&select=dados`,
    );
    if (!linha) return Response.json({ erro: "ainda sem dados" }, { status: 404 });
    const { fim: _, ...dados } = linha.dados;
    return Response.json(dados, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch (e) {
    console.error(`municípios ${uf}:`, e);
    return Response.json({ erro: "falhou" }, { status: 502 });
  }
}
