// Gera os resultados de eleições passadas (2022, 2018) a partir dos CSVs do Portal de Dados Abertos do TSE,
// no MESMO formato JSON da divulgação ao vivo, pra todas as telas funcionarem sem mudança.
// Roda uma vez: node scripts/historico.mjs  →  public/historico/{ano}/{eleição}/...
//
// Fontes (baixadas pra .cache/tse/):
//   votacao_candidato_munzona_{ano}.zip  votos por candidato, município e zona (≈1 GB os dois anos)
//   detalhe_votacao_munzona_{ano}.zip    eleitorado, seções, comparecimento, brancos e nulos
import { spawn, execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const ANOS = [2022, 2018];
const CACHE = ".cache/tse";
const SAIDA = "public/historico";
const CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele";
const CARGOS_ESTADUAIS = { 3: "0003", 5: "0005", 6: "0006", 7: "0007", 8: "0008" };
const PROPORCIONAIS = new Set([6, 7, 8]);

async function baixar(nome, url) {
  const destino = `${CACHE}/${nome}`;
  if (existsSync(destino)) return destino;
  await mkdir(CACHE, { recursive: true });
  execFileSync("curl", ["-sSf", "-o", destino, url]);
  return destino;
}

const membros = (zip) =>
  execFileSync("unzip", ["-Z1", zip], { encoding: "utf8", maxBuffer: 1 << 24 })
    .split("\n")
    .filter((n) => n.endsWith(".csv"));

// lê um CSV de dentro do zip linha a linha (os do TSE são latin1, separados por ;)
async function* linhas(zip, membro) {
  const p = spawn("unzip", ["-p", zip, membro]);
  p.stdout.setEncoding("latin1");
  let cab = null;
  for await (const linha of createInterface({ input: p.stdout, crlfDelay: Infinity })) {
    const v = linha.split(";").map((x) => (x.startsWith('"') ? x.slice(1, -1) : x));
    if (!cab) {
      cab = v;
      continue;
    }
    const o = {};
    cab.forEach((k, i) => (o[k] = v[i]));
    yield o;
  }
}

const n = (s) => parseInt(s || "0", 10) || 0;

function situacao(ds) {
  const s = (ds || "").toUpperCase();
  if (s === "ELEITO") return "Eleito";
  if (s === "ELEITO POR QP") return "Eleito por QP";
  if (s.startsWith("ELEITO POR M")) return "Eleito por média";
  if (s.startsWith("2")) return "2º turno";
  if (s === "SUPLENTE") return "Suplente";
  if (s.startsWith("N")) return "Não eleito";
  return "";
}

// ---- comparecimento, seções, brancos e nulos -------------------------------------------------------
function novoDet() {
  return { te: 0, ts: 0, c: 0, a: 0, vv: 0, vb: 0, vn: 0, dt: "", ht: "" };
}
function somarDet(d, r) {
  d.te += n(r.QT_APTOS);
  d.ts += n(r.QT_TOTAL_SECOES);
  d.c += n(r.QT_COMPARECIMENTO);
  d.a += n(r.QT_ABSTENCOES);
  d.vv += n(r.QT_TOTAL_VOTOS_VALIDOS);
  d.vb += n(r.QT_VOTOS_BRANCOS);
  d.vn += n(r.QT_TOTAL_VOTOS_NULOS);
  const dt = r.DT_ULTIMA_TOTALIZACAO || r.DT_ELEICAO || "";
  const ht = r.HH_ULTIMA_TOTALIZACAO || "";
  // guarda a totalização mais recente (dd/mm/aaaa → compara como aaaammdd)
  const k = (x, h) => x.split("/").reverse().join("") + h;
  if (k(dt, ht) > k(d.dt, d.ht)) {
    d.dt = dt;
    d.ht = ht;
  }
}

// ---- formato da divulgação do TSE ------------------------------------------------------------------
// fotos dos candidatos a presidente baixadas antes por scripts/fotos-historico.mjs
const fotos = new Map();
let anoAtual = 0;

function cargoJson(cd, nv, grupos) {
  cd = Number(cd);
  return {
    cd: String(cd),
    nv: String(nv),
    qe: "0",
    agr: grupos.map((g) => ({
      n: g.chave,
      nm: g.nome,
      com: g.sigla,
      vag: String(g.vagas),
      par: g.partidos.map((p) => ({
        sg: p.sg,
        tvan: String(p.votos),
        cand: p.cands.map((k) => ({
          n: k.n,
          // o TSE não publica mais fotos de eleições passadas: presidente usa a da Wikimedia (scripts/fotos-historico.mjs)
          sqcand: (cd === 1 && fotos.get(`${anoAtual}|${k.n}`)) || "",
          nmu: k.nome,
          vap: String(k.votos),
          e: k.st.startsWith("Eleito") ? "s" : "n",
          st: k.st,
        })),
      })),
    })),
  };
}

function arquivo(ele, turno, uf, det, cargo) {
  return {
    ele: String(ele),
    t: String(turno),
    tpabr: uf === "br" ? "br" : "uf",
    cdabr: uf,
    dt: det.dt,
    ht: det.ht || "23:59:59",
    and: "f",
    s: { ts: String(det.ts), st: String(det.ts) },
    e: { te: String(det.te), c: String(det.c), a: String(det.a), esnt: "0" },
    v: { vv: String(det.vv), vb: String(det.vb), tvn: String(det.vn), tv: String(det.c) },
    carg: [cargo],
  };
}

// votos de cada partido no país (deputados), pra ordenar as federações do mesmo jeito em todo estado
let votosNacionais = new Map();

// agrupa candidatos: majoritário por partido; proporcional por federação (2022) ou partido
function agrupar(cands, proporcional) {
  const grupos = new Map();
  for (const k of cands) {
    const chave = proporcional && k.federacao ? k.federacao : k.partido;
    let g = grupos.get(chave);
    if (!g) {
      g = { chave, nome: proporcional && k.federacao ? k.nomeFederacao : k.nomePartido, sigla: chave, vagas: 0, partidos: new Map() };
      grupos.set(chave, g);
    }
    let p = g.partidos.get(k.partido);
    if (!p) g.partidos.set(k.partido, (p = { sg: k.partido, votos: 0, cands: [] }));
    p.votos += k.votos;
    p.cands.push(k);
    if (k.st.startsWith("Eleito")) g.vagas++;
  }
  return [...grupos.values()].map((g) => {
    const partidos = [...g.partidos.values()]
      .map((p) => ({ ...p, cands: p.cands.sort((a, b) => b.votos - a.votos) }))
      .sort((a, b) => (votosNacionais.get(b.sg) ?? 0) - (votosNacionais.get(a.sg) ?? 0) || b.votos - a.votos);
    // federação: o TSE lista em ordem alfabética ("PC do B / PT / PV"); o maior partido do país vai na frente
    const ordenar = (siglas) =>
      siglas.sort((a, b) => (votosNacionais.get(b) ?? 0) - (votosNacionais.get(a) ?? 0)).join(" / ");
    const sigla = g.sigla.includes("/") ? ordenar(g.sigla.split("/").map((x) => x.trim())) : g.sigla;
    return { ...g, sigla, chave: sigla, partidos };
  });
}

async function salvar(caminho, obj) {
  await mkdir(caminho.slice(0, caminho.lastIndexOf("/")), { recursive: true });
  await writeFile(caminho, JSON.stringify(obj));
}

// TSE (UF + código do município) → IBGE, pela lista de municípios da divulgação de 2026.
// A chave precisa da UF: códigos de cidades do exterior (zz) repetem os de outros estados.
async function tseParaIbge() {
  const destino = await baixar("mun-2026.json", "https://resultados.tse.jus.br/oficial/ele2026/6257/config/mun-e006257-cm.json");
  const j = JSON.parse(await readFile(destino, "utf8"));
  const m = new Map();
  for (const a of j.abr) for (const mu of a.mu) m.set(`${a.cd}|${mu.cd}`, { cdi: mu.cdi, nm: mu.nm });
  return m;
}

function titulo(s) {
  return s
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
    .replace(/\b(Da|De|Do|Dos|Das|E)\b/g, (m) => m.toLowerCase());
}

async function processarAno(ano, ibge) {
  anoAtual = ano;
  const det = await baixar(`detalhe_${ano}.zip`, `${CDN}/detalhe_votacao_munzona/detalhe_votacao_munzona_${ano}.zip`);
  const cand = await baixar(`cand_${ano}.zip`, `${CDN}/votacao_candidato_munzona/votacao_candidato_munzona_${ano}.zip`);
  const codigos = {}; // turno → { presidente, estadual }

  // ---- detalhe: presidente (arquivo BR) e cargos estaduais (arquivos por UF) ----
  const detPres = new Map(); // `${turno}|${uf}` → det  (uf "br" = Brasil)
  const detPresMun = new Map(); // `${turno}|${uf}|${mun}` → det
  const detEst = new Map(); // `${turno}|${cargo}|${uf}` → det
  for (const membro of membros(det)) {
    const ehBr = /_BR\.csv$/.test(membro);
    if (/_BRASIL\.csv$/.test(membro)) continue;
    for await (const r of linhas(det, membro)) {
      const cargo = n(r.CD_CARGO);
      const turno = n(r.NR_TURNO);
      const uf = r.SG_UF.toLowerCase();
      if (cargo === 1) {
        if (!ehBr) continue;
        (codigos[turno] ??= {}).presidente = r.CD_ELEICAO;
        for (const k of [`${turno}|br`, `${turno}|${uf}`]) {
          if (!detPres.has(k)) detPres.set(k, novoDet());
          somarDet(detPres.get(k), r);
        }
        const km = `${turno}|${uf}|${r.CD_MUNICIPIO.padStart(5, "0")}`;
        if (!detPresMun.has(km)) detPresMun.set(km, novoDet());
        somarDet(detPresMun.get(km), r);
      } else if (CARGOS_ESTADUAIS[cargo] && !ehBr) {
        (codigos[turno] ??= {}).estadual = r.CD_ELEICAO;
        const k = `${turno}|${cargo}|${uf}`;
        if (!detEst.has(k)) detEst.set(k, novoDet());
        somarDet(detEst.get(k), r);
      }
    }
  }

  // ---- candidatos ----
  const presUf = new Map(); // `${turno}|${uf}` → Map(nr → cand)
  const presMun = new Map(); // `${turno}|${uf}|${mun}` → Map(nr → votos)
  const est = new Map(); // `${turno}|${cargo}|${uf}` → Map(sq → cand)
  const colVotos = (r) => (r.QT_VOTOS_NOMINAIS_VALIDOS !== undefined ? r.QT_VOTOS_NOMINAIS_VALIDOS : r.QT_VOTOS_NOMINAIS);

  for (const membro of membros(cand)) {
    if (/_BRASIL\.csv$/.test(membro)) continue;
    const ehBr = /_BR\.csv$/.test(membro);
    process.stdout.write(`  ${membro}\n`);
    for await (const r of linhas(cand, membro)) {
      const cargo = n(r.CD_CARGO);
      const turno = n(r.NR_TURNO);
      const uf = r.SG_UF.toLowerCase();
      const votos = n(colVotos(r));
      const base = {
        n: r.NR_CANDIDATO,
        sq: r.SQ_CANDIDATO,
        nome: r.NM_URNA_CANDIDATO,
        partido: r.SG_PARTIDO,
        nomePartido: r.NM_PARTIDO,
        federacao: r.NR_FEDERACAO && r.NR_FEDERACAO !== "-1" ? r.DS_COMPOSICAO_FEDERACAO : "",
        nomeFederacao: r.NM_FEDERACAO,
        st: situacao(r.DS_SIT_TOT_TURNO),
        votos: 0,
      };
      if (cargo === 1 && ehBr) {
        for (const k of [`${turno}|br`, `${turno}|${uf}`]) {
          if (!presUf.has(k)) presUf.set(k, new Map());
          const m = presUf.get(k);
          if (!m.has(base.n)) m.set(base.n, { ...base });
          m.get(base.n).votos += votos;
        }
        const km = `${turno}|${uf}|${r.CD_MUNICIPIO.padStart(5, "0")}`;
        if (!presMun.has(km)) presMun.set(km, new Map());
        const mm = presMun.get(km);
        mm.set(base.n, (mm.get(base.n) ?? 0) + votos);
      } else if (CARGOS_ESTADUAIS[cargo] && !ehBr) {
        const k = `${turno}|${cargo}|${uf}`;
        if (!est.has(k)) est.set(k, new Map());
        const m = est.get(k);
        if (!m.has(base.sq)) m.set(base.sq, { ...base });
        m.get(base.sq).votos += votos;
      }
    }
  }

  // ---- escreve: presidente ----
  for (const [chave, mapa] of presUf) {
    const [turno, uf] = chave.split("|");
    const ele = codigos[turno].presidente;
    const cands = [...mapa.values()].filter((k) => k.votos > 0 || k.st.startsWith("Eleito"));
    const d = detPres.get(chave) ?? novoDet();
    await salvar(`${SAIDA}/${ano}/${ele}/${uf}-c0001.json`, arquivo(ele, turno, uf, d, cargoJson(1, 1, agrupar(cands, false))));
  }

  // municípios do presidente, no formato do coletor (lib/municipios.ts → MunUf)
  for (const turno of Object.keys(codigos)) {
    const ele = codigos[turno].presidente;
    const br = presUf.get(`${turno}|br`);
    if (!br) continue;
    const ordem = [...br.values()].sort((a, b) => b.votos - a.votos).map((k) => k.n);
    const porUf = {};
    for (const [chave, votos] of presMun) {
      const [t, uf, mun] = chave.split("|");
      if (t !== turno || uf === "zz") continue;
      const ib = ibge.get(`${uf}|${mun}`);
      if (!ib) continue;
      const d = detPresMun.get(chave) ?? novoDet();
      porUf[uf] ??= { eleicao: ele, uf, hora: d.ht, cands: ordem, nomes: {}, mun: {} };
      porUf[uf].nomes[ib.cdi] = titulo(ib.nm);
      porUf[uf].mun[ib.cdi] = [d.ts, d.ts, d.vv, ...ordem.map((nr) => votos.get(nr) ?? 0)];
    }
    for (const [uf, dados] of Object.entries(porUf)) await salvar(`${SAIDA}/${ano}/${ele}/mun/${uf}.json`, dados);
  }

  // ---- escreve: governador, senador e deputados ----
  votosNacionais = new Map();
  for (const [chave, mapa] of est) {
    if (chave.split("|")[1] !== "6") continue;
    for (const k of mapa.values()) votosNacionais.set(k.partido, (votosNacionais.get(k.partido) ?? 0) + k.votos);
  }
  for (const [chave, mapa] of est) {
    const [turno, cargo, uf] = chave.split("|");
    const ele = codigos[turno].estadual;
    const cands = [...mapa.values()].filter((k) => k.votos > 0 || k.st.startsWith("Eleito"));
    const eleitos = cands.filter((k) => k.st.startsWith("Eleito")).length;
    const nv = Number(cargo) === 3 ? 1 : eleitos || 1;
    const d = detEst.get(chave) ?? novoDet();
    const json = arquivo(ele, turno, uf, d, cargoJson(cargo, nv, agrupar(cands, PROPORCIONAIS.has(Number(cargo)))));
    await salvar(`${SAIDA}/${ano}/${ele}/${uf}-c${CARGOS_ESTADUAIS[cargo]}.json`, json);
  }

  return codigos;
}

if (existsSync(`${SAIDA}/fotos/creditos.json`)) {
  for (const c of JSON.parse(await readFile(`${SAIDA}/fotos/creditos.json`, "utf8"))) fotos.set(`${c.ano}|${c.numero}`, c.foto);
}
const ibge = await tseParaIbge();
const resumo = {};
for (const ano of ANOS) {
  console.log(`${ano}…`);
  resumo[ano] = await processarAno(ano, ibge);
}
await salvar(`${SAIDA}/codigos.json`, resumo);
console.log(JSON.stringify(resumo));
