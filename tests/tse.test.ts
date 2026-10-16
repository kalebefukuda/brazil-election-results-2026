import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Bloqueado, buscarSeMudou, freio } from "../lib/servidor/tse";

const original = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = original;
});

function responder(status: number, corpo?: unknown, etag?: string) {
  const pedidos: RequestInit[] = [];
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    pedidos.push(init);
    return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
      status,
      headers: etag ? { etag } : {},
    });
  }) as typeof fetch;
  return pedidos;
}

test("304 do TSE: não mudou e manda o ETag guardado", async () => {
  const pedidos = responder(304);
  const r = await buscarSeMudou("https://tse/br.json", '"abc"', freio(1000));
  assert.deepEqual(r, { mudou: false });
  assert.equal((pedidos[0].headers as Record<string, string>)["If-None-Match"], '"abc"');
});

test("200: devolve o corpo e o ETag novo", async () => {
  responder(200, { dt: "25/10/2026" }, '"novo"');
  const r = await buscarSeMudou<{ dt: string }>("https://tse/br.json", undefined, freio(1000));
  assert.ok(r.mudou);
  assert.equal(r.json?.dt, "25/10/2026");
  assert.equal(r.etag, '"novo"');
});

test("429: para a coleta inteira em vez de insistir", async () => {
  responder(429);
  const vez = freio(1000);
  await assert.rejects(buscarSeMudou("https://tse/br.json", undefined, vez), Bloqueado);
  await assert.rejects(vez(), Bloqueado);
});
