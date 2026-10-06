"use client";

import { useEffect, useState } from "react";

// quantas pessoas estão com o site aberto: cada aba manda um "tô aqui" a cada 30s
// e a função no Supabase devolve quantos mandaram nos últimos ~75s
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;

function idDaAba() {
  try {
    let id = sessionStorage.getItem("online-id");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("online-id", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function useOnline() {
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    if (!URL || !KEY) return;
    const id = idDaAba();
    let parado = false;

    async function ping() {
      if (document.hidden) return;
      try {
        const r = await fetch(`${URL}/rest/v1/rpc/apuracao_ping`, {
          method: "POST",
          // chave anon antiga (JWT) vai também no Authorization; a publishable nova (sb_publishable_…) só no apikey
          headers: {
            apikey: KEY!,
            "Content-Type": "application/json",
            ...(KEY!.startsWith("eyJ") ? { Authorization: `Bearer ${KEY}` } : {}),
          },
          body: JSON.stringify({ p_id: id }),
        });
        if (r.ok && !parado) setN(await r.json());
      } catch {
        // sem contador, sem drama
      }
    }

    ping();
    const t = setInterval(ping, 30000);
    const vis = () => !document.hidden && ping();
    document.addEventListener("visibilitychange", vis);
    return () => {
      parado = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  return n;
}
