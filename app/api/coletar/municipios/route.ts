import { UFS_ESTADOS } from "@/lib/brasil";
import { ELEICOES, urlDados } from "@/lib/eleicao";
import { autorizado, coletaAtiva, DESLIGADA } from "@/lib/servidor/acesso";
import { encerrada, gravarEtags, lerEtags, marcarEncerrada } from "@/lib/servidor/estado";
import { coletarUf, type MunUfColeta } from "@/lib/servidor/municipios";
import { gravar, ler, podeGravar } from "@/lib/servidor/supabase";
import { Bloqueado, buscarSeMudou, freio, listaMunicipios, turnoNoServidor } from "@/lib/servidor/tse";
import { apuracaoComecou, type ArquivoTSE } from "@/lib/tse-formato";

// pg_cron chama a cada 5 min. Só baixa as cidades das UFs cujo arquivo mudou desde a última volta
// (ETag do TSE) e, dentro delas, só as que ainda não terminaram de apurar.
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!autorizado(req)) return Response.json({ erro: "não autorizado" }, { status: 401 });
  if (!coletaAtiva()) return Response.json(DESLIGADA);
  if (!podeGravar) return Response.json({ erro: "Supabase não configurado" }, { status: 500 });

  try {
    if (await encerrada(`fim-${ELEICOES[2].presidente}-mun`)) return Response.json({ pulou: "apuração encerrada" });
    const eleicao = ELEICOES[await turnoNoServidor()].presidente;
    const fim = `fim-${eleicao}-mun`;
    if (await encerrada(fim)) return Response.json({ eleicao, pulou: "apuração encerrada" });
    const vez = freio(25);
    const prefixo = `etag-${eleicao}-mun-`;
    const etags = await lerEtags(prefixo);

    const nacional = await buscarSeMudou<ArquivoTSE>(urlDados(eleicao, "br", "0001"), etags.get(`${prefixo}br`), vez);
    if (!nacional.mudou) return Response.json({ eleicao, mudou: false });
    if (!nacional.json || !apuracaoComecou(nacional.json)) {
      return Response.json({ eleicao, pulou: "apuração não começou" });
    }

    const porUf = await Promise.all(
      UFS_ESTADOS.map(async (uf) => ({
        uf,
        r: await buscarSeMudou<ArquivoTSE>(urlDados(eleicao, uf, "0001"), etags.get(prefixo + uf), vez),
      })),
    );
    const mudaram = porUf.filter((x) => x.r.mudou);
    const listas = mudaram.length ? await listaMunicipios(eleicao) : {};
    const antes = mudaram.length
      ? await ler<{ uf: string; dados: MunUfColeta }>(
          "apuracao_municipios",
          `eleicao=eq.${eleicao}&uf=in.(${mudaram.map((x) => x.uf).join(",")})&select=uf,dados`,
        )
      : [];
    const anterior = Object.fromEntries(antes.map((l) => [l.uf, l.dados]));

    const novasEtags: Record<string, string | null> = {};
    let baixados = 0;
    let tudoTerminado = true;
    for (const { uf, r } of mudaram) {
      if (!r.mudou || !listas[uf]) continue;
      const velho = anterior[uf];
      const dados = await coletarUf(eleicao, uf, "0001", listas[uf], vez, velho);
      baixados += listas[uf].length - (velho?.fim.length ?? 0);
      if (dados.fim.length < listas[uf].length) tudoTerminado = false;
      await gravar("apuracao_municipios", { eleicao, uf, hora: dados.hora, dados }, "eleicao,uf", "atualiza");
      novasEtags[prefixo + uf] = r.etag;
    }
    // o nacional só fica marcado como visto se todas as UFs que mudaram vieram certas; senão a próxima volta repete
    if (mudaram.every((x) => x.r.mudou && x.r.etag)) novasEtags[`${prefixo}br`] = nacional.etag;
    await gravarEtags(novasEtags);
    const todasCertas = mudaram.every((x) => x.r.mudou && x.r.etag);
    if (nacional.json.and === "f" && todasCertas && tudoTerminado) await marcarEncerrada(fim);

    return Response.json({ eleicao, ufsQueMudaram: mudaram.length, baixados });
  } catch (e) {
    console.error("coletar municípios:", e);
    const bloqueado = e instanceof Bloqueado;
    return Response.json(
      { erro: bloqueado ? "TSE bloqueou, coleta parada" : "coleta falhou" },
      { status: bloqueado ? 503 : 502 },
    );
  }
}
