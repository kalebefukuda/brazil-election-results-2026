import type { Metadata } from "next";
import VisaoEstados from "@/components/estados/VisaoEstados";

export const metadata: Metadata = {
  title: "Governadores e Senado 2026 · ao vivo",
  description: "Quem lidera para governador e senador em cada estado, com dados oficiais do TSE.",
};

export default function Estados() {
  return <VisaoEstados />;
}
