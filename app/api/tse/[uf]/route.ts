import { UFS } from "@/lib/brasil";
import { ELEICOES, urlDados } from "@/lib/eleicao";

// Reserva pro navegador que não consegue falar direto com o TSE: a Vercel (gru1) busca e guarda 15s.
const PERMITIDOS = new Map<string, string[]>([
  [ELEICOES[1].presidente, ["0001"]],
  [ELEICOES[2].presidente, ["0001"]],
  [ELEICOES[1].estadual, ["0003", "0005", "0006", "0007", "0008"]],
  [ELEICOES[2].estadual, ["0003"]],
]);

export async function GET(req: Request, { params }: { params: Promise<{ uf: string }> }) {
  const { uf } = await params;
  const url = new URL(req.url);
  const eleicao = url.searchParams.get("e") || ELEICOES[1].presidente;
  const cargo = url.searchParams.get("c") || "0001";

  if ((uf !== "br" && !UFS.includes(uf)) || !PERMITIDOS.get(eleicao)?.includes(cargo)) {
    return Response.json({ erro: "Parâmetros inválidos" }, { status: 400 });
  }

  try {
    const r = await fetch(urlDados(eleicao, uf, cargo), { next: { revalidate: 15 } });
    if (!r.ok) return Response.json({ erro: `TSE respondeu ${r.status}` }, { status: r.status === 404 ? 404 : 502 });
    return Response.json(await r.json(), {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch {
    return Response.json({ erro: "Não foi possível falar com o TSE" }, { status: 502 });
  }
}
