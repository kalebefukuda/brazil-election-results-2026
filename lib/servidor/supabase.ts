// Supabase pelo REST, sem SDK. Leitura usa a chave pública (as tabelas têm RLS de leitura);
// a service role só escreve e nunca vai pro navegador.
const URL_SB = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const SECRETA = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const podeLer = Boolean(URL_SB && PUBLICA);
export const podeGravar = Boolean(URL_SB && SECRETA);

// chave antiga (JWT, "eyJ…") vai também no Authorization; as novas (sb_publishable_/sb_secret_) só no apikey
function cabecalhos(chave: string, extra?: Record<string, string>) {
  const h: Record<string, string> = { apikey: chave, "Content-Type": "application/json", ...extra };
  if (chave.startsWith("eyJ")) h.Authorization = `Bearer ${chave}`;
  return h;
}

export async function ler<T>(tabela: string, consulta: string): Promise<T[]> {
  const r = await fetch(`${URL_SB}/rest/v1/${tabela}?${consulta}`, {
    headers: cabecalhos(PUBLICA!),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${tabela}: HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

export async function gravar(
  tabela: string,
  linhas: object | object[],
  conflito: string,
  seRepetir: "atualiza" | "ignora",
) {
  const r = await fetch(`${URL_SB}/rest/v1/${tabela}?on_conflict=${conflito}`, {
    method: "POST",
    headers: cabecalhos(SECRETA!, {
      Prefer: `resolution=${seRepetir === "atualiza" ? "merge" : "ignore"}-duplicates,return=minimal`,
    }),
    body: JSON.stringify(linhas),
  });
  if (!r.ok) throw new Error(`Supabase ${tabela}: HTTP ${r.status} ${await r.text()}`);
}
