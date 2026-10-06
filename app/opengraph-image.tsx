import { ImageResponse } from "next/og";

export const alt = "Apuração Presidente 2026 ao vivo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0f1012",
        color: "#ededeb",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: "#a8aab0" }}>
        <div style={{ width: 14, height: 14, borderRadius: 7, background: "#45b878" }} />
        AO VIVO · DADOS OFICIAIS DO TSE
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>Apuração</div>
        <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>Presidente 2026</div>
        <div style={{ fontSize: 30, color: "#a8aab0", marginTop: 24 }}>
          Mapa por estado, peso das regiões, saldo de votos e projeção
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 420, height: 16, borderRadius: 8, background: "#5b86ef" }} />
        <div style={{ width: 360, height: 16, borderRadius: 8, background: "#ec6060" }} />
        <div style={{ width: 80, height: 16, borderRadius: 8, background: "#7b7f87" }} />
      </div>
    </div>,
    size,
  );
}
