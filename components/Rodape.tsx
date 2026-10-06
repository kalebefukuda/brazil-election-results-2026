"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { larguraPagina } from "@/lib/brasil";
import { FUKUDA } from "@/lib/fukuda";
import LogoFukuda from "./LogoFukuda";

const link = "underline underline-offset-2 hover:text-ink";

export default function Rodape() {
  const path = usePathname();
  return (
    <div className={`mx-auto ${larguraPagina(path)} px-4 pb-16 pt-6 sm:px-6`}>
      <footer className="card overflow-hidden">
        <div className="grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section aria-labelledby="t-fukuda" className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:p-8">
            <a
              href={FUKUDA.site}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-none text-ink"
              aria-label="FukudaDigital"
            >
              <LogoFukuda className="h-12 w-auto" />
            </a>
            <div className="min-w-0">
              <p className="kicker">Quem fez este painel</p>
              <h2 id="t-fukuda" className="mt-1.5 text-[19px] font-bold tracking-[-0.02em]">
                FukudaDigital
              </h2>
              <p className="mt-1 max-w-[44ch] text-[13.5px] leading-relaxed text-ink2">
                Automação, integrações e sites para empresas. Se você quer algo assim pro seu negócio, fala com a gente.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={FUKUDA.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn inline-flex items-center !bg-ink font-semibold !text-bg hover:opacity-90"
                >
                  Chamar no WhatsApp
                </a>
                <a
                  href={FUKUDA.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn inline-flex items-center"
                >
                  fukudadigital.com.br
                </a>
                <a href={`mailto:${FUKUDA.email}`} className="btn inline-flex items-center">
                  {FUKUDA.email}
                </a>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="t-fontes"
            className="border-t border-line2 p-6 text-[12.5px] leading-relaxed text-ink3 sm:p-8 md:border-l md:border-t-0"
          >
            <h2 id="t-fontes" className="kicker">
              Fontes
            </h2>
            <ul className="mt-3 space-y-2.5">
              <li>
                <b className="font-semibold text-ink2">Resultados:</b>{" "}
                <a className={link} href="https://resultados.tse.jus.br" target="_blank" rel="noopener noreferrer">
                  resultados.tse.jus.br
                </a>
                , arquivos públicos de divulgação do TSE. Percentuais sobre votos válidos, como no TSE.
              </li>
              <li>
                <b className="font-semibold text-ink2">Fotos:</b> TSE (2026) e Wikimedia Commons (2018 e 2022),{" "}
                <Link className={link} href="/creditos">
                  ver créditos
                </Link>
                .
              </li>
              <li>
                <b className="font-semibold text-ink2">Mapa:</b>{" "}
                <a
                  className={link}
                  href="https://servicodados.ibge.gov.br/api/docs/malhas"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  malha municipal do IBGE
                </a>
                .
              </li>
            </ul>
          </section>
        </div>

        <p className="flex flex-col gap-1 border-t border-line2 px-6 py-4 text-[12px] text-ink3 sm:flex-row sm:justify-between sm:px-8">
          <span>Site independente, sem vínculo com o TSE. O resultado oficial é sempre o publicado pelo TSE.</span>
          <span>© 2026 FukudaDigital</span>
        </p>
      </footer>
    </div>
  );
}
