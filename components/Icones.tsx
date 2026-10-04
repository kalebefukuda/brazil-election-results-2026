// ícones de traço simples (estilo lucide), herdam a cor do texto
type P = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconeVoltar({ className = "h-4 w-4" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function IconeBusca({ className = "h-4 w-4" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconeMapa({ className = "h-4 w-4" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function IconeSeta({ className = "h-4 w-4" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function IconePausa({ className = "h-4 w-4" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M8 5v14" />
      <path d="M16 5v14" />
    </svg>
  );
}

export function IconePlay({ className = "h-4 w-4" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M7 4.5v15l12-7.5-12-7.5Z" />
    </svg>
  );
}

export function IconeAtualizar({ className = "h-4 w-4" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

export function IconePessoas({ className = "h-4 w-4" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18.5 14.2A6.5 6.5 0 0 1 21.5 20" />
    </svg>
  );
}
