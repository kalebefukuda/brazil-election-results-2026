import type { Metadata } from "next";
import PaginaDeputados from "@/components/deputados/PaginaDeputados";

export const metadata: Metadata = {
  title: "Câmara dos Deputados 2026 · ao vivo",
  description: "As 513 cadeiras da Câmara por partido e federação, somando os 27 estados, com dados oficiais do TSE.",
};

export default function Deputados() {
  return <PaginaDeputados />;
}
