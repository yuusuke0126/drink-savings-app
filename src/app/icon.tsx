import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon: simple mark (ASCII only for reliable font rendering in OG pipeline). */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #1e40af 0%, #0f172a 100%)",
          color: "#f1f5f9",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "-0.05em",
        }}
      >
        500
      </div>
    ),
    { ...size },
  );
}
