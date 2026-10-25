"use client";

import { cabecalhos, SUPABASE_KEY, SUPABASE_URL } from "./supabase-publico";

export type Mensagem = { id: number; apelido: string; texto: string; criado_em: string };

export const chatDisponivel = Boolean(SUPABASE_URL && SUPABASE_KEY);
export const LIMITE_TEXTO = 280;

// o banco recusa com um código curto; aqui vira frase pra quem escreveu
const MOTIVOS: Record<string, string> = {
  "chat-fechado": "O chat está pausado agora.",
  bloqueado: "Você não pode mais enviar mensagens.",
  apelido: "Escolha outro apelido (2 a 20 letras, sem palavrão).",
  texto: `A mensagem precisa ter de 1 a ${LIMITE_TEXTO} caracteres.`,
  link: "Links não são permitidos.",
  pessoal: "Não compartilhe CPF, telefone, e-mail ou números longos.",
  palavra: "Essa mensagem tem palavras que não são permitidas.",
  rapido: "Calma! Espere alguns segundos para enviar de novo.",
  repetida: "Você acabou de enviar essa mesma mensagem.",
};

// id aleatório do navegador: o banco usa pra limitar o ritmo de envio, nunca aparece na tela
export function idDoAutor() {
  try {
    let id = localStorage.getItem("chat-autor");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("chat-autor", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export async function ultimas(): Promise<Mensagem[]> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/apuracao_chat?select=id,apelido,texto,criado_em&order=id.desc&limit=60`,
    { headers: cabecalhos(), cache: "no-store" },
  );
  if (!r.ok) throw new Error(`chat: HTTP ${r.status}`);
  return ((await r.json()) as Mensagem[]).reverse();
}

async function rpc(nome: string, corpo: object) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: cabecalhos(),
    body: JSON.stringify(corpo),
  });
  if (r.ok) return r.status === 204 ? null : r.json();
  const erro = (await r.json().catch(() => null)) as { message?: string } | null;
  throw new Error(MOTIVOS[erro?.message ?? ""] ?? "Não deu para enviar. Tente de novo.");
}

export async function enviar(apelido: string, texto: string): Promise<Mensagem> {
  return rpc("apuracao_chat_enviar", { p_autor: idDoAutor(), p_apelido: apelido, p_texto: texto });
}

export async function denunciar(id: number) {
  await rpc("apuracao_chat_denunciar", { p_autor: idDoAutor(), p_msg: id });
}

type Ouvintes = { nova: (m: Mensagem) => void; apagada: (id: number) => void; recarregar: () => void };

// mensagens na hora pelo Realtime; se ele não conectar (limite de conexões, rede), recarrega a cada 8s
export function assinar({ nova, apagada, recarregar }: Ouvintes) {
  let parado = false;
  let reserva: ReturnType<typeof setInterval> | null = null;
  let fechar: (() => void) | null = null;

  const usarReserva = () => {
    if (parado || reserva) return;
    reserva = setInterval(recarregar, 8000);
  };
  const largarReserva = () => {
    if (reserva) clearInterval(reserva);
    reserva = null;
  };

  import("@supabase/realtime-js")
    .then(({ RealtimeClient }) => {
      if (parado) return;
      const cliente = new RealtimeClient(`${SUPABASE_URL!.replace(/^http/, "ws")}/realtime/v1`, {
        params: { apikey: SUPABASE_KEY },
      });
      const canal = cliente
        .channel("apuracao-chat")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "apuracao_chat" }, (p) =>
          nova(p.new as Mensagem),
        )
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "apuracao_chat" }, (p) =>
          apagada(Number((p.old as { id?: number }).id)),
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            largarReserva();
            // o que chegou enquanto conectava
            recarregar();
          } else usarReserva();
        });
      fechar = () => {
        cliente.removeChannel(canal);
        cliente.disconnect();
      };
    })
    .catch(usarReserva);

  return () => {
    parado = true;
    largarReserva();
    fechar?.();
  };
}
