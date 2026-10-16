import assert from "node:assert/strict";
import { test } from "node:test";
import { N_CAMPOS, type Foto, type Historico } from "../lib/historico";
import { acrescentarFoto } from "../lib/servidor/historico";

const foto = (c: Record<string, number>): Foto => ({
  st: 1,
  ts: 2,
  vv: 10,
  cp: 0,
  ab: 0,
  vb: 0,
  vn: 0,
  tv: 0,
  esnt: 0,
  c,
});

test("acrescenta a foto na ordem de candidatos já existente", () => {
  const h: Historico = { eleicao: "6258", cands: ["22", "13"], fotos: [], eventos: [] };
  const novo = acrescentarFoto(h, { momento: "2026-10-25T20:05:00Z", br: foto({ "13": 6, "22": 4 }), ufs: {} });
  assert.deepEqual(novo.cands, ["22", "13"]);
  assert.deepEqual(novo.fotos[0].br.slice(N_CAMPOS), [4, 6]);
  assert.equal(h.fotos.length, 0, "não altera o histórico original");
});

test("candidato que aparece depois vai pro fim sem mexer nas colunas antigas", () => {
  const h: Historico = { eleicao: "6258", cands: ["22"], fotos: [], eventos: [] };
  const novo = acrescentarFoto(h, { momento: "2026-10-25T20:05:00Z", br: foto({ "22": 4, "13": 6 }), ufs: {} });
  assert.deepEqual(novo.cands, ["22", "13"]);
  assert.deepEqual(novo.fotos[0].br.slice(N_CAMPOS), [4, 6]);
});
