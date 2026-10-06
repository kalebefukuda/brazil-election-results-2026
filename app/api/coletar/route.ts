import { coletar } from "@/lib/coletor";
import { autorizado } from "@/lib/supabase";

// chamado pelo pg_cron do Supabase a cada minuto; ?seco=1 monta tudo sem gravar (pra testar)
export const maxDuration = 60;

export async function GET(req: Request) {
  const seco = new URL(req.url).searchParams.get("seco") === "1";
  const local = process.env.NODE_ENV === "development";
  if (!autorizado(req) && !(seco && local)) return Response.json({ erro: "não autorizado" }, { status: 401 });

  try {
    return Response.json(await coletar({ seco }), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "falhou" }, { status: 502 });
  }
}
