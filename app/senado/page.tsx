import type { Metadata } from "next";
import PaginaSenado from "@/components/senado/PaginaSenado";

export const metadata: Metadata = {
  title: "Senado 2026 · ao vivo",
  description: "As 54 cadeiras do Senado em disputa, por partido e por estado, com dados oficiais do TSE.",
};

export default function Senado() {
  return <PaginaSenado />;
}
