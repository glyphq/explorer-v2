import { ImageResponse } from "next/og";

export const OG_ALT_SUFFIX = "Glyph Explorer";
export const OG_CONTENT_TYPE = "image/png";
export const OG_SIZE = { width: 1200, height: 630 } as const;

const logoSource = `data:image/svg+xml;base64,${btoa(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2560 2560"><g transform="translate(0 2560) scale(1 -1)"><path fill="#090909" d="M194 2355 c-3 -8 -4 -283 -1 -612 4 -556 5 -604 24 -688 46 -202 136 -373 275 -520 143 -151 323 -259 523 -312 88 -23 119 -26 260 -26 115 -1 181 4 233 16 515 119 862 556 862 1087 0 361 -167 688 -451 881 -86 58 -231 125 -323 148 -86 23 -289 46 -306 36 -6 -4 -10 -103 -10 -274 l0 -268 63 -6 c225 -22 418 -185 493 -417 15 -47 18 -104 22 -392 l4 -338 -39 0 c-106 1 -255 62 -350 145 -87 76 -159 203 -183 320 -5 25 -8 -56 -9 -212 l-1 -253 -48 0 c-221 0 -439 174 -508 405 -24 81 -24 239 0 320 54 182 201 341 362 392 30 9 54 20 54 24 0 24 -111 167 -187 240 -198 192 -410 287 -696 313 -44 3 -59 1 -63 -9z"/></g></svg>`,
)}`;

export function createOgImage(title: string, description: string) {
  const fontSize = title.length > 38 ? 58 : title.length > 24 ? 70 : 84;

  return new ImageResponse(
    <div
      style={{
        alignItems: "flex-start",
        backgroundColor: "#f6f4ef",
        color: "#090909",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: "64px 72px 72px",
        width: "100%",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", gap: 22 }}>
        <img alt="" height={104} src={logoSource} width={104} />
        <div
          style={{
            display: "flex",
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: "-0.035em",
          }}
        >
          Glyph Explorer
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            fontSize,
            fontWeight: 600,
            letterSpacing: "-0.045em",
            lineHeight: 1.05,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: "#615d56",
            display: "flex",
            fontSize: 30,
            letterSpacing: "-0.02em",
            lineHeight: 1.35,
            maxWidth: 900,
          }}
        >
          {description}
        </div>
      </div>
    </div>,
    OG_SIZE,
  );
}
