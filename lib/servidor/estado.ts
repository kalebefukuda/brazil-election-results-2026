// apuracao_estado: o que a coleta já processou (ETag de cada arquivo do TSE) e o histórico pronto pra servir.
// Se a tabela não existir (migração 003 não rodada), a coleta segue funcionando, só sem a economia.
import { gravar, ler, podeGravar, podeLer } from "./supabase";

export async function lerEtags(prefixo: string) {
  if (!podeLer) return new Map<string, string>();
  try {
    const linhas = await ler<{ chave: string; etag: string | null }>(
      "apuracao_estado",
      `chave=like.${encodeURIComponent(prefixo)}*&select=chave,etag`,
    );
    return new Map(linhas.filter((l) => l.etag).map((l) => [l.chave, l.etag!]));
  } catch (e) {
    console.error("apuracao_estado (leitura):", e);
    return new Map<string, string>();
  }
}

export async function gravarEtags(etags: Record<string, string | null>) {
  const linhas = Object.entries(etags)
    .filter(([, etag]) => etag)
    .map(([chave, etag]) => ({ chave, etag }));
  if (!podeGravar || !linhas.length) return;
  try {
    await gravar("apuracao_estado", linhas, "chave", "atualiza");
  } catch (e) {
    console.error("apuracao_estado (gravação):", e);
  }
}
