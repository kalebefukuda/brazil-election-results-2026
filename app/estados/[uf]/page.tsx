import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NOMES, UFS_ESTADOS } from "@/lib/brasil";
import PaginaEstado from "@/components/estados/PaginaEstado";

export function generateStaticParams() {
  return UFS_ESTADOS.map((uf) => ({ uf }));
}

export async function generateMetadata({ params }: { params: Promise<{ uf: string }> }): Promise<Metadata> {
  const { uf } = await params;
  const nome = NOMES[uf] ?? "Estado";
  return {
    title: `${nome} · Governador, Senado e deputados 2026`,
    description: `Apuração ao vivo em ${nome}: governador, senado, deputados federais e estaduais, com dados do TSE.`,
  };
}

export default async function Estado({ params }: { params: Promise<{ uf: string }> }) {
  const { uf } = await params;
  if (!UFS_ESTADOS.includes(uf)) notFound();
  return (
    <Suspense>
      <PaginaEstado uf={uf} />
    </Suspense>
  );
}
