// Supabase direto do navegador, só com a chave pública: tudo que escreve passa por função validada no banco
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;

export function cabecalhos(): Record<string, string> {
  // chave anon antiga (JWT) vai também no Authorization; a publishable nova (sb_publishable_…) só no apikey
  return {
    apikey: SUPABASE_KEY!,
    "Content-Type": "application/json",
    ...(SUPABASE_KEY!.startsWith("eyJ") ? { Authorization: `Bearer ${SUPABASE_KEY}` } : {}),
  };
}
