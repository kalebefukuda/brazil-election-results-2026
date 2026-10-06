"use client";

import { useEffect, useRef } from "react";

type Props = {
  aberto: boolean;
  onFechar: () => void;
  rotulo: string;
  children: React.ReactNode;
};

// <dialog> nativo: foco preso dentro, Esc fecha e o fundo fica inerte sem código extra
export default function Modal({ aberto, onFechar, rotulo, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      aria-label={rotulo}
      className="modal card m-auto w-[calc(100%-24px)] max-w-[780px] p-0 text-ink"
      onClose={onFechar}
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      {aberto && <div className="rolagem max-h-[85vh] overflow-y-auto p-5 sm:p-6">{children}</div>}
    </dialog>
  );
}
