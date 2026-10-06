import { FUKUDA } from "@/lib/fukuda";

// faixa fina acima do menu: quem fez o site e como falar com a gente
export default function Faixa() {
  return (
    <div className="border-b border-line2 px-4 py-2 text-center text-[12px] leading-snug text-ink2 sm:text-[13px]">
      Feito pela{" "}
      <a
        className="font-semibold text-ink underline-offset-2 hover:underline"
        href={FUKUDA.site}
        target="_blank"
        rel="noopener noreferrer"
      >
        FukudaDigital
      </a>
      <span className="hidden sm:inline">, {FUKUDA.slogan}</span>.{" "}
      <a
        className="whitespace-nowrap font-medium text-ink underline underline-offset-2"
        href={FUKUDA.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
      >
        Fale com a gente →
      </a>
    </div>
  );
}
