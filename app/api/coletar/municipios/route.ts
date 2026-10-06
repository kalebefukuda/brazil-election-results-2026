import { UFS_ESTADOS } from "@/lib/brasil";
import { ELEICOES } from "@/lib/eleicao";
import { coletarUf, type MunUfColeta } from "@/lib/servidor/municipios";
import { autorizado, gravar, ler, podeGravar } from "@/lib/servidor/supabase";
import { Bloqueado, freio, listaMunicipios, turnoNoServidor } from "@/lib/servidor/tse";

// pg_cron chama a cada 5 min. A primeira volta baixa ≈5.570 arquivos (≈4 min a 25 req/s);
// as seguintes só os municípios que ainda não terminaram de apurar.
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!autorizado(req)) return Response.json({ erro: "não autorizado" }, { status: 401 });
  if (!podeGravar) return Response.json({ erro: "Supabase não configurado" }, { status: 500 });

  try {
    const eleicao = ELEICOES[await turnoNoServidor()].presidente;
    const listas = await listaMunicipios(eleicao);
    const antes = await ler<{ uf: string; dados: MunUfColeta }>(
      "apuracao_municipios",
      `eleicao=eq.${eleicao}&select=uf,dados`,
    );
    const anterior = Object.fromEntries(antes.map((l) => [l.uf, l.dados]));
    const vez = freio(25);

    const resumo = await Promise.all(
      UFS_ESTADOS.filter((uf) => listas[uf]).map(async (uf) => {
        const velho = anterior[uf];
        if (velho && velho.fim.length === listas[uf].length) return 0;
        const dados = await coletarUf(eleicao, uf, "0001", listas[uf], vez, velho);
        if (!velho || dados.hora !== velho.hora || dados.fim.length !== velho.fim.length) {
          await gravar("apuracao_municipios", { eleicao, uf, hora: dados.hora, dados }, "eleicao,uf", "atualiza");
        }
        return listas[uf].length - (velho?.fim.length ?? 0);
      }),
    );
    return Response.json({ eleicao, baixados: resumo.reduce((s, n) => s + n, 0) });
  } catch (e) {
    console.error("coletar municípios:", e);
    const bloqueado = e instanceof Bloqueado;
    return Response.json(
      { erro: bloqueado ? "TSE bloqueou, coleta parada" : "coleta falhou" },
      { status: bloqueado ? 503 : 502 },
    );
  }
}
