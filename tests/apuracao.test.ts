import assert from "node:assert/strict";
import { test } from "node:test";
import { apuracaoComecou } from "../lib/tse-formato";

test("arquivo publicado antes da eleição (zerado, sem data) não conta como apuração", () => {
  assert.equal(apuracaoComecou({ dt: "", ht: "", s: { ts: "499248", st: "0" } }), false);
});

test("com data mas sem seção totalizada ainda não começou", () => {
  assert.equal(apuracaoComecou({ dt: "25/10/2026", ht: "17:00:01", s: { st: "0" } }), false);
});

test("primeira seção totalizada: começou", () => {
  assert.equal(apuracaoComecou({ dt: "25/10/2026", ht: "17:02:10", s: { st: "12" } }), true);
});
