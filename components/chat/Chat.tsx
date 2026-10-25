"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { assinar, chatDisponivel, denunciar, enviar, LIMITE_TEXTO, ultimas, type Mensagem } from "@/lib/chat";
import { IconeChat, IconeEnviar } from "../Icones";

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function lerApelido() {
  try {
    return localStorage.getItem("chat-apelido") ?? "";
  } catch {
    return "";
  }
}

// botão no canto que abre o chat: painel no desktop, tela cheia no celular.
// a conexão só existe enquanto o painel está aberto
export default function Chat() {
  const [aberto, setAberto] = useState(false);
  if (!chatDisponivel) return null;
  return (
    <>
      {!aberto && (
        <button
          className="fixed bottom-4 right-4 z-40 inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-[13px] font-semibold text-ink shadow-lg transition-colors hover:border-ink3"
          onClick={() => setAberto(true)}
          aria-label="Abrir o chat ao vivo"
        >
          <span className="pulso h-2 w-2 rounded-full" style={{ background: "var(--ok)" }} />
          <IconeChat />
          Chat ao vivo
        </button>
      )}
      {aberto && <Painel onFechar={() => setAberto(false)} />}
    </>
  );
}

function Painel({ onFechar }: { onFechar: () => void }) {
  const [msgs, setMsgs] = useState<Mensagem[]>([]);
  const [carregou, setCarregou] = useState(false);
  const [apelido, setApelido] = useState(lerApelido);
  const [rascunhoApelido, setRascunhoApelido] = useState(apelido);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [minhas, setMinhas] = useState<Set<number>>(() => new Set());
  const [escondidas, setEscondidas] = useState<Set<number>>(() => new Set());
  const lista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const noFim = useRef(true);

  const recarregar = useCallback(() => {
    ultimas().then(
      (m) => {
        setMsgs(m);
        setCarregou(true);
      },
      () => setCarregou(true),
    );
  }, []);

  useEffect(() => {
    recarregar();
    return assinar({
      nova: (m) => setMsgs((xs) => (xs.some((x) => x.id === m.id) ? xs : [...xs, m].slice(-200))),
      apagada: (id) => setMsgs((xs) => xs.filter((x) => x.id !== id)),
      recarregar,
    });
  }, [recarregar]);

  // desce sozinho só se a pessoa já estava lendo o fim
  useEffect(() => {
    const el = lista.current;
    if (el && noFim.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    campo.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", esc);
    // no celular o painel cobre a tela: a página atrás não rola
    const celular = matchMedia("(max-width: 639px)").matches;
    if (celular) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      if (celular) document.body.style.overflow = "";
    };
  }, [onFechar]);

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    const a = rascunhoApelido.trim().replace(/\s+/g, " ");
    if (a.length < 2 || a.length > 20) return setErro("O apelido precisa ter de 2 a 20 caracteres.");
    setErro("");
    setApelido(a);
    try {
      localStorage.setItem("chat-apelido", a);
    } catch {}
    setTimeout(() => campo.current?.focus());
  }

  async function mandar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      const m = await enviar(apelido, t);
      noFim.current = true;
      setMinhas((s) => new Set(s).add(m.id));
      setMsgs((xs) => (xs.some((x) => x.id === m.id) ? xs : [...xs, m].slice(-200)));
      setTexto("");
    } catch (err) {
      const msg = (err as Error).message;
      setErro(msg);
      // apelido recusado pelo banco: volta pra escolher outro
      if (msg.startsWith("Escolha outro apelido")) setApelido("");
    } finally {
      setEnviando(false);
      campo.current?.focus();
    }
  }

  async function reportar(m: Mensagem) {
    if (!confirm(`Denunciar a mensagem de ${m.apelido}? Ela some para você e sai do ar com mais denúncias.`)) return;
    setEscondidas((s) => new Set(s).add(m.id));
    await denunciar(m.id).catch(() => {});
  }

  const visiveis = msgs.filter((m) => !escondidas.has(m.id));

  return (
    <section
      className="card fixed inset-0 z-50 flex h-[100dvh] flex-col !rounded-none shadow-2xl sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[min(560px,calc(100dvh-32px))] sm:w-[380px] sm:!rounded-2xl"
      aria-label="Chat ao vivo"
    >
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="pulso h-2 w-2 flex-none rounded-full" style={{ background: "var(--ok)" }} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold">Chat ao vivo</h2>
          <p className="truncate text-[11.5px] text-ink3">Respeito sempre. Sem links nem dados pessoais.</p>
        </div>
        <button className="btn !min-h-[32px] !text-[12px]" onClick={onFechar}>
          Fechar
        </button>
      </header>

      <div
        ref={lista}
        className="rolagem min-h-0 flex-1 overflow-y-auto px-4 py-3"
        onScroll={(e) => {
          const el = e.currentTarget;
          noFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        aria-live="polite"
      >
        {!carregou ? (
          <p className="py-8 text-center text-[13px] text-ink3">Carregando…</p>
        ) : visiveis.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-ink3">Ninguém falou ainda. Comece a conversa!</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {visiveis.map((m) => (
              <li key={m.id} className="group text-[13.5px] leading-snug">
                <div className="flex items-baseline gap-2">
                  <b className={`font-semibold ${minhas.has(m.id) ? "text-ink" : "text-ink2"}`}>{m.apelido}</b>
                  <span className="num text-[11px] text-ink3">{hora(m.criado_em)}</span>
                  {!minhas.has(m.id) && (
                    <button
                      className="ml-auto text-[11px] text-ink3 underline-offset-2 hover:text-ink hover:underline sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                      onClick={() => reportar(m)}
                    >
                      denunciar
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-ink">{m.texto}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        {erro && (
          <p className="mb-2 text-[12px]" style={{ color: "var(--c13)" }} role="alert">
            {erro}
          </p>
        )}
        {!apelido ? (
          <form onSubmit={entrar} className="flex gap-2">
            <input
              ref={campo}
              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-[14px] outline-none focus:border-ink3"
              placeholder="Escolha um apelido"
              value={rascunhoApelido}
              onChange={(e) => setRascunhoApelido(e.target.value)}
              maxLength={20}
              aria-label="Seu apelido no chat"
              autoComplete="off"
            />
            <button className="btn !min-h-[40px] font-semibold" type="submit">
              Entrar
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={mandar} className="flex gap-2">
              <input
                ref={campo}
                className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-[14px] outline-none focus:border-ink3"
                placeholder="Escreva uma mensagem"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                maxLength={LIMITE_TEXTO}
                aria-label="Mensagem"
                autoComplete="off"
              />
              <button
                className="btn grid !min-h-[40px] w-10 place-items-center !p-0"
                type="submit"
                disabled={!texto.trim() || enviando}
                aria-label="Enviar"
              >
                <IconeEnviar />
              </button>
            </form>
            <p className="mt-1.5 flex justify-between text-[11px] text-ink3">
              <span>
                como <b className="font-semibold text-ink2">{apelido}</b> ·{" "}
                <button className="underline-offset-2 hover:text-ink hover:underline" onClick={() => setApelido("")}>
                  trocar
                </button>
              </span>
              <span className="num">
                {texto.length}/{LIMITE_TEXTO}
              </span>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
