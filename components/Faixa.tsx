import { FUKUDA } from "@/lib/fukuda";
import LogoFukuda from "./LogoFukuda";

export default function Faixa() {
  return (
    <a
      href={FUKUDA.site}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-center gap-1.5 border-b border-line2 py-1.5 text-[11.5px] text-ink3 transition-colors hover:text-ink2"
    >
      <LogoFukuda className="h-3 w-auto text-ink2" />
      Feito pela <span className="font-semibold text-ink2 group-hover:text-ink">FukudaDigital</span>
      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </a>
  );
}
