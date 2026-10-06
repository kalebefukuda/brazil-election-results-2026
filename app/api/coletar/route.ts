import { coletar } from "@/lib/servidor/coletor";
import { autorizado } from "@/lib/servidor/supabase";

// pg_cron do Supabase chama a cada minuto; ?seco=1 (só em dev) monta tudo sem gravar
export const maxDuration = 60;

export async function GET(req: Request) {
  const seco = new URL(req.url).searchParams.get("seco") === "1";
  const local = process.env.NODE_ENV === "development";
  if (!autorizado(req) && !(seco && local)) return Response.json({ erro: "não autorizado" }, { status: 401 });

  try {
    return Response.json(await coletar({ seco }), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("coletar:", e);
    return Response.json({ erro: "coleta falhou" }, { status: 502 });
  }
}
