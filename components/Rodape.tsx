import { FUKUDA } from "@/lib/fukuda";

export default function Rodape() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-16 sm:px-6">
      <footer className="border-t border-line pt-6 text-[12px] leading-relaxed text-ink3">
        <p>
          Fonte:{" "}
          <a
            className="underline underline-offset-2 hover:text-ink2"
            href="https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6257/uf/br/cargo/1/vis/nominal/rguf/br/resumo-geral"
            target="_blank"
            rel="noopener noreferrer"
          >
            resultados.tse.jus.br
          </a>{" "}
          (arquivos públicos de divulgação). Percentuais sobre votos válidos, como no TSE. Site independente, sem
          vínculo com o TSE — o resultado oficial é sempre o do TSE.
        </p>
        <p className="mt-2">
          Mapa:{" "}
          <a
            className="underline underline-offset-2 hover:text-ink2"
            href="https://github.com/VictorCazanave/svg-maps"
            target="_blank"
            rel="noopener noreferrer"
          >
            svg-maps/brazil
          </a>{" "}
          (CC BY 4.0).
        </p>
        <p className="mt-4 text-ink2">
          Feito pela{" "}
          <a className="font-semibold text-ink underline-offset-2 hover:underline" href={FUKUDA.site} target="_blank" rel="noopener noreferrer">
            FukudaDigital
          </a>
          , {FUKUDA.slogan}. Fale com a gente pelo{" "}
          <a className="underline underline-offset-2 hover:text-ink" href={FUKUDA.whatsapp} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>{" "}
          ou{" "}
          <a className="underline underline-offset-2 hover:text-ink" href={`mailto:${FUKUDA.email}`}>
            {FUKUDA.email}
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
