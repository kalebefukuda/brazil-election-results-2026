import type { Metadata } from "next";
import Link from "next/link";
import creditos from "@/public/historico/fotos/creditos.json";

export const metadata: Metadata = {
  title: "Créditos das fotos · Apuração 2026",
  description: "Autores e licenças das fotos dos candidatos a presidente de 2018 e 2022.",
};

// fotos de 2018 e 2022 vêm da Wikimedia Commons; a licença (CC BY, CC BY-SA…) pede autor, licença e link
export default function Creditos() {
  const anos = [...new Set(creditos.map((c) => c.ano))].sort((a, b) => b - a);
  return (
    <main className="mx-auto max-w-[860px] px-4 pb-12 pt-8 sm:px-6">
      <p className="kicker mb-2">
        <Link href="/" className="hover:text-ink">
          ← Apuração 2026
        </Link>
      </p>
      <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[36px]">
        Créditos das fotos
      </h1>
      <p className="mt-3 max-w-[62ch] text-[13.5px] leading-relaxed text-ink2">
        As fotos dos candidatos de 2026 são as da divulgação oficial do TSE. O TSE não publica mais as de eleições
        passadas, então as de 2018 e 2022 vêm da{" "}
        <a
          className="underline underline-offset-2 hover:text-ink"
          href="https://commons.wikimedia.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Wikimedia Commons
        </a>
        , reduzidas para miniatura, com a licença de cada uma abaixo.
      </p>

      {anos.map((ano) => (
        <section key={ano} className="card mt-6 p-5 sm:p-6" aria-labelledby={`t-${ano}`}>
          <h2 id={`t-${ano}`} className="titulo">
            Presidente {ano}
          </h2>
          <ul className="mt-3">
            {creditos
              .filter((c) => c.ano === ano)
              .map((c) => (
                <li
                  key={c.numero}
                  className="flex items-center gap-3 border-b border-line2 py-2.5 text-[13px] last:border-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.foto}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 flex-none rounded-full object-cover object-top"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold">{c.candidato}</span>
                    <span className="text-ink3">
                      Foto:{" "}
                      <a
                        className="underline underline-offset-2 hover:text-ink"
                        href={c.pagina}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {c.autor}
                      </a>
                      ,{" "}
                      {c.licencaUrl ? (
                        <a
                          className="underline underline-offset-2 hover:text-ink"
                          href={c.licencaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {c.licenca}
                        </a>
                      ) : (
                        c.licenca
                      )}
                      , via Wikimedia Commons
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
