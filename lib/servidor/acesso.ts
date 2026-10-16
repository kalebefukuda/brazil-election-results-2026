// Quem pode disparar a coleta e se ela está ligada.
import { timingSafeEqual } from "node:crypto";

function segredo() {
  return process.env.CRON_SECRET || process.env.COLETOR_SEGREDO || "";
}

// aceita "Authorization: Bearer <segredo>" e, durante a transição, o header antigo x-coletor-segredo
export function autorizado(req: Request) {
  const s = segredo();
  if (s.length < 24) return false;
  const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const veio = bearer ?? req.headers.get("x-coletor-segredo");
  if (!veio) return false;
  const a = Buffer.from(veio);
  const b = Buffer.from(s);
  return a.length === b.length && timingSafeEqual(a, b);
}

// chave geral: fora da apuração a coleta não faz nada, mesmo que algum agendador chame
export const coletaAtiva = () => process.env.COLETA_ATIVA === "1";

export const DESLIGADA = { pulou: "COLETA_ATIVA desligada" };
