"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Nav() {
  const path = usePathname();
  const [tema, setTema] = useState("dark");

  useEffect(() => {
    setTema(document.documentElement.dataset.theme || "dark");
  }, []);

  function trocarTema() {
    const novo = tema === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = novo;
    setTema(novo);
    try {
      localStorage.setItem("tema", novo);
    } catch {}
  }

  const links = [
    { href: "/", txt: "Presidente", ativo: path === "/" },
    { href: "/estados", txt: "Governadores e Congresso", ativo: path.startsWith("/estados") },
  ];

  return (
    <nav className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-[1240px] items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
              l.ativo ? "bg-card text-ink" : "text-ink2 hover:text-ink"
            }`}
            aria-current={l.ativo ? "page" : undefined}
          >
            {l.txt}
          </Link>
        ))}
        <button className="btn ml-auto !min-h-[34px]" onClick={trocarTema} aria-label="Trocar tema claro/escuro" title="Tema">
          {tema === "dark" ? "☀" : "☾"}
        </button>
      </div>
    </nav>
  );
}
