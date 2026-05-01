import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon (home screen). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #1e40af 0%, #0f172a 100%)",
          color: "#f1f5f9",
        }}
      >
        <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1 }}>500</div>
        <div style={{ fontSize: 22, fontWeight: 600, opacity: 0.9, marginTop: 8 }}>
          / cup
        </div>
      </div>
    ),
    { ...size },
  );
}
