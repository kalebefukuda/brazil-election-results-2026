// Acesso ao Supabase pelo servidor (REST direto, sem SDK). A service role nunca vai pro navegador.
const URL_SB = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const temSupabase = Boolean(URL_SB && CHAVE);

// aceita a service_role antiga (JWT, "eyJ…") e a chave secreta nova ("sb_secret_…", que não vai no Authorization)
function cabecalhos(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { apikey: CHAVE!, "Content-Type": "application/json", ...extra };
  if (CHAVE!.startsWith("eyJ")) h.Authorization = `Bearer ${CHAVE}`;
  return h;
}

export async function ler<T>(tabela: string, consulta: string): Promise<T[]> {
  const r = await fetch(`${URL_SB}/rest/v1/${tabela}?${consulta}`, { headers: cabecalhos(), cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${tabela}: HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

// upsert pela coluna `conflito`: atualiza a linha que já existe, ou só ignora (eventos repetidos)
export async function gravar(tabela: string, linhas: object | object[], conflito: string, seRepetir: "atualiza" | "ignora") {
  const r = await fetch(`${URL_SB}/rest/v1/${tabela}?on_conflict=${conflito}`, {
    method: "POST",
    headers: cabecalhos({
      Prefer: `resolution=${seRepetir === "atualiza" ? "merge" : "ignore"}-duplicates,return=minimal`,
    }),
    body: JSON.stringify(linhas),
  });
  if (!r.ok) throw new Error(`Supabase ${tabela}: HTTP ${r.status} ${await r.text()}`);
}

export function autorizado(req: Request) {
  const segredo = process.env.COLETOR_SEGREDO;
  return Boolean(segredo) && req.headers.get("x-coletor-segredo") === segredo;
}
