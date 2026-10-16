import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { autorizado, coletaAtiva } from "../lib/servidor/acesso";

const SEGREDO = "um-segredo-de-teste-com-mais-de-24-caracteres";
const pedido = (headers: Record<string, string>) => new Request("https://site/api/coletar", { headers });

afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.COLETOR_SEGREDO;
  delete process.env.COLETA_ATIVA;
});

test("aceita Authorization: Bearer com o segredo certo", () => {
  process.env.CRON_SECRET = SEGREDO;
  assert.equal(autorizado(pedido({ authorization: `Bearer ${SEGREDO}` })), true);
});

test("aceita o header antigo durante a transição", () => {
  process.env.CRON_SECRET = SEGREDO;
  assert.equal(autorizado(pedido({ "x-coletor-segredo": SEGREDO })), true);
});

test("recusa sem header, com segredo errado ou com segredo curto configurado", () => {
  process.env.CRON_SECRET = SEGREDO;
  assert.equal(autorizado(pedido({})), false);
  assert.equal(autorizado(pedido({ authorization: "Bearer errado" })), false);
  process.env.CRON_SECRET = "curto";
  assert.equal(autorizado(pedido({ authorization: "Bearer curto" })), false);
});

test("coleta só fica ligada com COLETA_ATIVA=1", () => {
  assert.equal(coletaAtiva(), false);
  process.env.COLETA_ATIVA = "1";
  assert.equal(coletaAtiva(), true);
});
