import { UFS } from "@/lib/brasil";
import { urlTSE } from "@/lib/tse";

// reserva: se o navegador não conseguir falar direto com o TSE, a Vercel busca e guarda por 15s (região gru1 no vercel.json)
export async function GET(_req: Request, { params }: { params: Promise<{ uf: string }> }) {
  const { uf } = await params;
  if (uf !== "br" && !UFS.includes(uf)) {
    return Response.json({ erro: "UF inválida" }, { status: 400 });
  }

  try {
    const r = await fetch(urlTSE(uf), { next: { revalidate: 15 } });
    if (!r.ok) return Response.json({ erro: `TSE respondeu ${r.status}` }, { status: 502 });
    const json = await r.json();
    return Response.json(json, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch {
    return Response.json({ erro: "Não foi possível falar com o TSE" }, { status: 502 });
  }
}
