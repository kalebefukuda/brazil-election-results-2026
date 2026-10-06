import { UFS } from "@/lib/brasil";
import { ELEICOES } from "@/lib/eleicao";
import { coletarUf, freio, listaMunicipios, type MunUf } from "@/lib/municipios";
import { ler, temSupabase } from "@/lib/supabase";

// Resultado por município de uma UF. Em produção quem baixa do TSE é o coletor (que grava no Supabase);
// sem Supabase configurado (dev local), baixa direto com freio de 40 req/s.
const PRESIDENTE = new Set<string>([ELEICOES[1].presidente, ELEICOES[2].presidente]);

// um freio só pro processo inteiro (as 27 UFs dividem os mesmos 40 req/s) e 60s de memória por UF
const vez = freio(40);
const memoria = new Map<string, { em: number; p: Promise<unknown> }>();

async function buscar(eleicao: string, uf: string) {
  const lista = (await listaMunicipios(eleicao))[uf];
  if (!lista) return null;
  const { fim: _fim, ...dados } = await coletarUf(eleicao, uf, "0001", lista, vez);
  return dados;
}

export async function GET(req: Request, { params }: { params: Promise<{ uf: string }> }) {
  const { uf } = await params;
  const eleicao = new URL(req.url).searchParams.get("e") || ELEICOES[1].presidente;
  if (!UFS.includes(uf) || !PRESIDENTE.has(eleicao)) {
    return Response.json({ erro: "Parâmetros inválidos" }, { status: 400 });
  }

  // produção: lê o que o coletor gravou (o visitante nunca dispara requisição pro TSE)
  if (temSupabase) {
    try {
      const [linha] = await ler<{ dados: MunUf & { fim?: string[] } }>(
        "apuracao_municipios",
        `eleicao=eq.${eleicao}&uf=eq.${uf}&select=dados`
      );
      if (!linha) return Response.json({ erro: "ainda sem dados" }, { status: 404 });
      const { fim: _fim, ...dados } = linha.dados;
      return Response.json(dados, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
    } catch (e) {
      return Response.json({ erro: e instanceof Error ? e.message : "falhou" }, { status: 502 });
    }
  }

  // sem Supabase em produção não busca no TSE: é o coletor que tem freio, não o visitante
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ erro: "coletor não configurado" }, { status: 503 });
  }

  try {
    const chave = `${eleicao}-${uf}`;
    let m = memoria.get(chave);
    if (!m || Date.now() - m.em > 60_000) {
      m = { em: Date.now(), p: buscar(eleicao, uf) };
      memoria.set(chave, m);
      m.p.catch(() => memoria.delete(chave));
    }
    const dados = await m.p;
    if (!dados) return Response.json({ erro: "UF sem municípios nessa eleição" }, { status: 404 });
    return Response.json(dados, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "falhou" }, { status: 502 });
  }
}
