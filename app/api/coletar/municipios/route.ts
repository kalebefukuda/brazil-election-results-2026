import { turnoNoServidor } from "@/lib/coletor";
import { ELEICOES } from "@/lib/eleicao";
import { coletarUf, freio, listaMunicipios, type MunUf } from "@/lib/municipios";
import { autorizado, gravar, ler, temSupabase } from "@/lib/supabase";
import { UFS_ESTADOS } from "@/lib/brasil";

// chamado pelo pg_cron a cada 3 min: baixa os ≈5.570 municípios a 30 req/s e grava um registro por UF.
// Município que já terminou de apurar (and = "f") não é baixado de novo.
export const maxDuration = 300;

type Linha = { uf: string; hora: string; dados: MunUf & { fim: string[] } };

export async function GET(req: Request) {
  if (!autorizado(req)) return Response.json({ erro: "não autorizado" }, { status: 401 });
  if (!temSupabase) return Response.json({ erro: "Supabase não configurado" }, { status: 500 });

  try {
    const eleicao = ELEICOES[await turnoNoServidor()].presidente;
    const listas = await listaMunicipios(eleicao);
    const antes = await ler<Linha>("apuracao_municipios", `eleicao=eq.${eleicao}&select=uf,hora,dados`);
    const anterior = Object.fromEntries(antes.map((l) => [l.uf, l.dados]));
    const vez = freio(30);

    const resumo = await Promise.all(
      UFS_ESTADOS.filter((uf) => listas[uf]).map(async (uf) => {
        const velho = anterior[uf];
        if (velho && velho.fim.length === listas[uf].length) return { uf, baixados: 0 };
        const dados = await coletarUf(eleicao, uf, "0001", listas[uf], vez, velho);
        if (!velho || dados.hora !== velho.hora || dados.fim.length !== velho.fim.length) {
          await gravar("apuracao_municipios", { eleicao, uf, hora: dados.hora, dados }, "eleicao,uf", "atualiza");
        }
        return { uf, baixados: listas[uf].length - (velho?.fim.length ?? 0) };
      })
    );
    return Response.json({ eleicao, baixados: resumo.reduce((s, r) => s + r.baixados, 0), resumo });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "falhou" }, { status: 502 });
  }
}
