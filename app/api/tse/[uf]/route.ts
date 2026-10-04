import { UFS } from "@/lib/brasil";

// reserva: se o navegador não conseguir falar direto com o TSE, a Vercel busca e guarda por 15s (região gru1 no vercel.json)
const ELEICOES: Record<string, string[]> = {
  "6257": ["0001"], // presidente
  "6259": ["0003", "0005", "0006", "0007", "0008"], // governador, senador, deputados
};

export async function GET(req: Request, { params }: { params: Promise<{ uf: string }> }) {
  const { uf } = await params;
  const url = new URL(req.url);
  const eleicao = url.searchParams.get("e") || "6257";
  const cargo = url.searchParams.get("c") || "0001";

  if ((uf !== "br" && !UFS.includes(uf)) || !ELEICOES[eleicao]?.includes(cargo)) {
    return Response.json({ erro: "Parâmetros inválidos" }, { status: 400 });
  }

  const tse = `https://resultados.tse.jus.br/oficial/ele2026/${eleicao}/dados/${uf}/${uf}-c${cargo}-e00${eleicao}-u.json`;
  try {
    const r = await fetch(tse, { next: { revalidate: 15 } });
    if (!r.ok) return Response.json({ erro: `TSE respondeu ${r.status}` }, { status: r.status === 404 ? 404 : 502 });
    const json = await r.json();
    return Response.json(json, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch {
    return Response.json({ erro: "Não foi possível falar com o TSE" }, { status: 502 });
  }
}
