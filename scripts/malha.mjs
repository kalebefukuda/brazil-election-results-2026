// Gera os contornos dos municípios e dos estados (malha do IBGE) já projetados em SVG.
// Roda uma vez: node scripts/malha.mjs  →  public/malha/municipios.json e lib/mapa-paths.ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { geoMercator, geoPath } from "d3-geo";
import { feature, merge } from "topojson-client";
import { presimplify, quantile, simplify } from "topojson-simplify";

const FONTE =
  "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/json&intrarregiao=municipio&qualidade=intermediaria";
const CACHE = ".cache/ibge-mun.json";
const LARGURA = 613;
const ALTURA = 639;
// quanto da malha sobra depois de simplificar (0–1): menos pontos, arquivo menor
const MANTER = Number(process.env.MANTER || 0.15);
// estado não precisa do detalhe de município: simplifica bem mais
const MANTER_UF = 0.02;

// código IBGE da UF (2 primeiros dígitos do município) → sigla
const UF_IBGE = {
  11: "ro", 12: "ac", 13: "am", 14: "rr", 15: "pa", 16: "ap", 17: "to",
  21: "ma", 22: "pi", 23: "ce", 24: "rn", 25: "pb", 26: "pe", 27: "al", 28: "se", 29: "ba",
  31: "mg", 32: "es", 33: "rj", 35: "sp", 41: "pr", 42: "sc", 43: "rs",
  50: "ms", 51: "mt", 52: "go", 53: "df",
};

async function malha() {
  if (!existsSync(CACHE)) {
    const r = await fetch(FONTE);
    if (!r.ok) throw new Error(`IBGE respondeu ${r.status}`);
    await mkdir(".cache", { recursive: true });
    await writeFile(CACHE, await r.text());
  }
  return JSON.parse(await readFile(CACHE, "utf8"));
}

// "M10.5,20L11,21.5…" (absoluto) → "M10.5 20l.5 1.5…" (relativo): quase metade do tamanho
function relativo(d) {
  let x = 0;
  let y = 0;
  let out = "";
  const n = (v) => {
    const s = (Math.round(v * 10) / 10).toString();
    return s.replace(/^(-?)0\./, "$1.");
  };
  const par = (a, b) => {
    const sa = n(a);
    const sb = n(b);
    return sa + (sb.startsWith("-") ? "" : " ") + sb;
  };
  for (const [, cmd, xs, ys] of d.matchAll(/([MLZ])(?:(-?[\d.]+),(-?[\d.]+))?/g)) {
    if (cmd === "Z") {
      out += "z";
      continue;
    }
    const nx = Number(xs);
    const ny = Number(ys);
    const dx = Math.round((nx - x) * 10) / 10;
    const dy = Math.round((ny - y) * 10) / 10;
    if (cmd === "M") out += "M" + par(nx, ny);
    else if (dx || dy) out += "l" + par(dx, dy);
    else continue;
    // acumula o arredondado pra não deixar o erro somar
    if (cmd === "M") {
      x = Math.round(nx * 10) / 10;
      y = Math.round(ny * 10) / 10;
    } else {
      x += dx;
      y += dy;
    }
  }
  return out;
}

// ilhas oceânicas (Fernando de Noronha, Trindade) ficam fora do desenho: viram pontinho e encolhem o mapa
const LESTE_MAX = -34.5;
function semIlhas(f) {
  const g = f.geometry;
  if (!g || g.type !== "MultiPolygon") return f;
  const partes = g.coordinates.filter((poli) => poli[0].some(([lon]) => lon < LESTE_MAX));
  if (!partes.length) return null;
  return { ...f, geometry: { type: "MultiPolygon", coordinates: partes } };
}
const ehIlha = (f) => f.geometry?.type === "Polygon" && f.geometry.coordinates[0].every(([lon]) => lon >= LESTE_MAX);

const topo = await malha();
const nome = Object.keys(topo.objects)[0];
const pre = presimplify(topo);
const simples = simplify(structuredClone(pre), quantile(pre, MANTER));
const obj = simples.objects[nome];
const simplesUf = simplify(structuredClone(pre), quantile(pre, MANTER_UF));

const municipios = feature(simples, obj);
municipios.features = municipios.features.filter((f) => !ehIlha(f)).map(semIlhas).filter(Boolean);
const projecao = geoMercator().fitSize([LARGURA, ALTURA], municipios);
const geo = geoPath(projecao).digits(1);
const caminho = (f) => {
  const d = geo(f);
  return d ? relativo(d) : null;
};

const mun = {};
for (const f of municipios.features) {
  const d = caminho(f);
  if (d) mun[f.properties.codarea] = d;
}

// estado = união dos seus municípios, na mesma projeção (assim borda de estado e de município casam)
const uf = {};
for (const [cod, sigla] of Object.entries(UF_IBGE)) {
  const geoms = simplesUf.objects[nome].geometries.filter((g) => String(g.properties.codarea).startsWith(cod));
  uf[sigla] = caminho(semIlhas({ type: "Feature", geometry: merge(simplesUf, geoms) }));
}

await mkdir("public/malha", { recursive: true });
await writeFile("public/malha/municipios.json", JSON.stringify({ viewBox: `0 0 ${LARGURA} ${ALTURA}`, mun }));

const linhas = Object.keys(uf)
  .sort()
  .map((s) => `  ${s}: "${uf[s]}",`)
  .join("\n");
await writeFile(
  "lib/mapa-paths.ts",
  `// Contornos dos estados, gerados por scripts/malha.mjs a partir da malha municipal do IBGE (servicodados.ibge.gov.br)
export const VIEWBOX = "0 0 ${LARGURA} ${ALTURA}";

export const PATHS: Record<string, string> = {
${linhas}
};
`
);

console.log(`municípios: ${Object.keys(mun).length} · estados: ${Object.keys(uf).length}`);
