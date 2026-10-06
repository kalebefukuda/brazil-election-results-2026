// Fotos dos candidatos a presidente de 2018 e 2022: o TSE não publica mais as de eleições passadas,
// então usa a foto principal do artigo de cada um na Wikipédia (arquivos da Wikimedia Commons, licença livre).
// Roda antes do historico.mjs: node scripts/fotos-historico.mjs  →  public/historico/fotos/{ano}/{número}.jpg
// e public/historico/fotos/creditos.json (autor e licença de cada foto, mostrados em /creditos).
import { execFileSync } from "node:child_process";
import { mkdir, unlink, writeFile } from "node:fs/promises";

// número de urna → artigo na Wikipédia em português
const CANDIDATOS = {
  2018: {
    17: "Jair Bolsonaro",
    13: "Fernando Haddad",
    12: "Ciro Gomes",
    45: "Geraldo Alckmin",
    30: "João Amoêdo",
    51: "Cabo Daciolo",
    15: "Henrique Meirelles",
    18: "Marina Silva",
    19: "Alvaro Dias",
    50: "Guilherme Boulos",
    16: "Vera Lúcia Salgado",
    27: "José Maria Eymael",
    54: "João Vicente Goulart",
  },
  2022: {
    13: "Luiz Inácio Lula da Silva",
    22: "Jair Bolsonaro",
    15: "Simone Tebet",
    12: "Ciro Gomes",
    44: "Soraya Thronicke",
    30: "Luiz Felipe d'Avila",
    14: "Padre Kelmon",
    80: "Léo Péricles",
    21: "Sofia Manzano",
    16: "Vera Lúcia Salgado",
    27: "José Maria Eymael",
  },
};

const UA = {
  "User-Agent": "apuracao-2026/1.0 (https://brazil-election-results-2026.vercel.app; fukudadigital@gmail.com)",
};
const LIVRES = /^(CC0|CC BY|CC-BY|Public domain|PD|Domínio público|Attribution)/i;
const semTags = (s = "") =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function api(base, params) {
  const url = `${base}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${base}: HTTP ${r.status}`);
  return r.json();
}

async function arquivoDoArtigo(titulo) {
  const j = await api("https://pt.wikipedia.org/w/api.php", {
    action: "query",
    titles: titulo,
    redirects: "1",
    prop: "pageimages",
    piprop: "name",
  });
  return j.query.pages[0]?.pageimage ?? null;
}

// miniatura + autor + licença, direto da Commons (se o arquivo não estiver lá, não é livre: pula)
async function infoCommons(arquivo) {
  const j = await api("https://commons.wikimedia.org/w/api.php", {
    action: "query",
    titles: `File:${arquivo}`,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "160",
  });
  const p = j.query.pages[0];
  if (!p || p.missing) return null;
  const ii = p.imageinfo[0];
  const m = ii.extmetadata ?? {};
  return {
    miniatura: ii.thumburl,
    pagina: ii.descriptionurl,
    autor: semTags(m.Artist?.value) || "Autor não informado",
    licenca: semTags(m.LicenseShortName?.value),
    licencaUrl: m.LicenseUrl?.value ?? "",
  };
}

const creditos = [];
for (const [ano, lista] of Object.entries(CANDIDATOS)) {
  await mkdir(`public/historico/fotos/${ano}`, { recursive: true });
  for (const [nr, titulo] of Object.entries(lista)) {
    const arquivo = await arquivoDoArtigo(titulo);
    const info = arquivo && (await infoCommons(arquivo));
    if (!info || !LIVRES.test(info.licenca)) {
      console.log(`  ${ano} ${nr} ${titulo}: sem foto livre (${info?.licenca ?? "sem arquivo"})`);
      continue;
    }
    const r = await fetch(info.miniatura, { headers: UA });
    if (!r.ok) {
      console.log(`  ${ano} ${nr} ${titulo}: download falhou (${r.status})`);
      continue;
    }
    // tudo vira JPEG de até 200px (sips já vem no macOS); a foto aparece em círculo de 40px
    const bruto = `public/historico/fotos/${ano}/${nr}.orig`;
    const caminho = `/historico/fotos/${ano}/${nr}.jpg`;
    await writeFile(bruto, Buffer.from(await r.arrayBuffer()));
    execFileSync(
      "sips",
      ["-s", "format", "jpeg", "-s", "formatOptions", "75", "-Z", "200", bruto, "--out", `public${caminho}`],
      { stdio: "ignore" },
    );
    await unlink(bruto);
    creditos.push({ ano: Number(ano), numero: nr, candidato: titulo, foto: caminho, arquivo, ...info });
    console.log(`  ${ano} ${nr} ${titulo}: ${info.licenca} · ${info.autor}`);
  }
}

await writeFile("public/historico/fotos/creditos.json", JSON.stringify(creditos, null, 1));
console.log(`${creditos.length} fotos`);
