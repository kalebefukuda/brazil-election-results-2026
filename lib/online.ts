"use client";

import { useEffect, useState } from "react";
import { cabecalhos, SUPABASE_KEY as KEY, SUPABASE_URL as URL } from "./supabase-publico";

// quantas pessoas estão com o site aberto: cada aba manda um "tô aqui" a cada 30s
// e a função no Supabase devolve quantos mandaram nos últimos ~75s

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
          headers: cabecalhos(),
          body: JSON.stringify({ p_id: id }),
        });
        if (r.ok && !parado) setN(await r.json());
      } catch {}
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
