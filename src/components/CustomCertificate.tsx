import { forwardRef, type CSSProperties } from "react";
import type { CustomFieldKey, CustomTemplateConfig } from "@/lib/custom-template";
import type { CertContent } from "@/lib/templates";
import { foilFromAccent } from "@/lib/brand";
import { Seal } from "./Certificate";

interface Props {
  config: CustomTemplateConfig;
  background: string | null;
  content: CertContent;
  name: string;
  qr?: string | null;
  code?: string | null;
  verifyUrl?: string | null;
}

function fieldText(key: CustomFieldKey, content: CertContent, name: string): string {
  switch (key) {
    case "organization":
      return content.organization;
    case "title":
      return content.title;
    case "intro":
      return content.intro;
    case "name":
      return name;
    case "reason":
      return content.reason;
    case "date":
      return content.date;
    case "signatory":
      return content.signatoryName;
  }
}

export const CustomCertificate = forwardRef<HTMLDivElement, Props>(function CustomCertificate(
  { config, background, content, name, qr = null, code = null, verifyUrl = null },
  ref,
) {
  const foil = foilFromAccent(config.accent);
  const soft = config.ink;

  const style = {
    "--c-bg": "#fffdf6",
    "--c-panel": "#ffffff",
    "--c-ink": config.ink,
    "--c-soft": soft,
    "--c-accent": config.accent,
    "--c-foil-1": foil.foil1,
    "--c-foil-2": foil.foil2,
    "--c-foil-3": foil.foil3,
  } as CSSProperties;

  return (
    <div ref={ref} className="cert-surface cert-custom" style={style}>
      {background ? (
        <img className="cert-custom-bg" src={background} alt="" />
      ) : (
        <>
          <div className="cert-custom-blankbg" />
          {config.showTexture && (
            <>
              <div className="cert-tex-weave" />
              <div className="cert-tex-grain" />
            </>
          )}
        </>
      )}

      {config.ornaments.border && <div className="cert-custom-border" />}
      {config.ornaments.corners && (
        <>
          <span className="cert-corner cert-corner-tl" />
          <span className="cert-corner cert-corner-tr" />
          <span className="cert-corner cert-corner-bl" />
          <span className="cert-corner cert-corner-br" />
        </>
      )}

      {config.logo && (
        <img
          className="cert-custom-logo"
          src={config.logo && (config as { logoSrc?: string }).logoSrc}
          alt=""
          style={{
            left: config.logo.x,
            top: config.logo.y,
            width: config.logo.width,
          }}
        />
      )}

      {(Object.keys(config.fields) as CustomFieldKey[]).map((key) => {
        const f = config.fields[key]!;
        const transform =
          f.align === "center" ? "translateX(-50%)" : f.align === "right" ? "translateX(-100%)" : undefined;
        return (
          <div
            key={key}
            className="cert-custom-field"
            style={{
              left: f.x,
              top: f.y,
              transform,
              fontSize: f.size,
              fontFamily: f.font,
              color: f.color,
              fontWeight: f.bold ? 700 : 400,
              fontStyle: f.italic ? "italic" : "normal",
              textTransform: f.uppercase ? "uppercase" : "none",
              letterSpacing: f.spacing ? `${f.spacing}px` : undefined,
              textAlign: f.align,
            }}
          >
            {fieldText(key, content, name)}
            {key === "signatory" && (
              <div
                style={{
                  fontSize: Math.max(10, f.size * 0.6),
                  fontFamily: "var(--font-body, sans-serif)",
                  color: soft,
                  opacity: 0.75,
                  marginTop: 2,
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                {content.signatoryRole}
              </div>
            )}
          </div>
        );
      })}

      {config.seal && (
        <div
          className="cert-custom-seal"
          style={{
            left: config.seal.x,
            top: config.seal.y,
            width: config.seal.width,
            transform: "translate(-50%, -50%)",
          }}
        >
          <Seal gid="seal-custom" />
        </div>
      )}

      {qr && config.qr && (
        <div
          className="cert-custom-qr"
          style={{ left: config.qr.x, top: config.qr.y, width: config.qr.width }}
        >
          <img className="cert-qr" src={qr} alt="" />
          <div className="cert-custom-qr-meta">
            <div className="cert-custom-qr-label">Scan to verify</div>
            {code && <div className="cert-verify-code">{code}</div>}
            {verifyUrl && <div className="cert-custom-qr-url">{verifyUrl}</div>}
          </div>
        </div>
      )}
    </div>
  );
});
