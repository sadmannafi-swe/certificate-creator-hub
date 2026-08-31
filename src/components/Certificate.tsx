import { forwardRef, type CSSProperties } from "react";
import type { CertContent, CertTemplate } from "@/lib/templates";
import { DEFAULT_BRAND, foilFromAccent, shade, type Brand } from "@/lib/brand";

interface Props {
  template: CertTemplate;
  content: CertContent;
  name: string;
  brand?: Brand;
  qr?: string | null;
  code?: string | null;
  verifyUrl?: string | null;
}

function Filigree({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path
        d="M4 116C4 62 30 22 116 4"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.9"
      />
      <path
        d="M14 116C14 70 40 34 116 16"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.55"
      />
      <path
        d="M22 104c14-6 22-16 26-30 3 16 12 24 26 26-16 2-24 10-27 26-3-14-11-21-25-22Z"
        fill="currentColor"
        opacity="0.32"
      />
      <circle cx="96" cy="24" r="3.2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function Seal({ gid }: { gid: string }) {
  return (
    <svg className="cert-seal" viewBox="0 0 140 140" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--c-foil-1)" />
          <stop offset="42%" stopColor="var(--c-foil-2)" />
          <stop offset="60%" stopColor="var(--c-foil-3)" />
          <stop offset="100%" stopColor="var(--c-foil-1)" />
        </linearGradient>
      </defs>
      <circle cx="70" cy="70" r="46" fill={`url(#${gid})`} opacity="0.95" />
      <circle cx="70" cy="70" r="46" fill="none" stroke="var(--c-ink)" strokeWidth="0.6" opacity="0.25" />
      <circle cx="70" cy="70" r="37" fill="none" stroke="var(--c-panel)" strokeWidth="1.2" opacity="0.7" />
      <circle cx="70" cy="70" r="31" fill="none" stroke="var(--c-panel)" strokeWidth="0.6" opacity="0.5" />
      {Array.from({ length: 36 }).map((_, i) => (
        <rect
          key={i}
          x="69.4"
          y="20"
          width="1.2"
          height="7"
          fill={`url(#${gid})`}
          transform={`rotate(${i * 10} 70 70)`}
        />
      ))}
      <path
        d="M70 52l4.6 11.3L86 64l-8.6 7.7 2.6 11.6L70 77.4 59.9 83.3l2.6-11.6L54 64l11.4-.7L70 52Z"
        fill="var(--c-panel)"
        opacity="0.85"
      />
    </svg>
  );
}

export const Certificate = forwardRef<HTMLDivElement, Props>(function Certificate(
  { template, content, name, brand = DEFAULT_BRAND, qr = null, code = null, verifyUrl = null },
  ref,
) {
  const base = template.palette;
  const accent = brand.useCustomAccent ? brand.accent : base.accent;
  const foil = brand.useCustomAccent ? foilFromAccent(brand.accent) : {
    foil1: base.foil1,
    foil2: base.foil2,
    foil3: base.foil3,
  };
  const ink = brand.useCustomInk ? brand.ink : base.ink;
  const soft = brand.useCustomInk ? shade(brand.ink, 0.42) : base.soft;

  const style = {
    "--c-bg": base.bg,
    "--c-panel": base.panel,
    "--c-ink": ink,
    "--c-soft": soft,
    "--c-accent": accent,
    "--c-foil-1": foil.foil1,
    "--c-foil-2": foil.foil2,
    "--c-foil-3": foil.foil3,
    "--font-serif-display": brand.headingFont,
    "--font-body": brand.bodyFont,
  } as CSSProperties;

  const f = template.frame;
  const isModern = f === "modern";

  return (
    <div ref={ref} className={`cert-surface cert-${f}`} style={style}>
      {f === "duotone" && <div className="cert-duotone-bg" />}
      {f === "arch" && <div className="cert-arch-shape" />}
      {f === "marble" && <div className="cert-marble-bg" />}
      {f === "guilloche" && <div className="cert-guilloche-bg" />}
      {f === "deco" && <div className="cert-deco-bg" />}
      {f === "foil" && <div className="cert-foil-bg" />}

      {/* luxury texture stack — present on every template */}
      <div className="cert-tex-weave" />
      <div className="cert-tex-grain" />
      <div className="cert-tex-sheen" />
      <div className="cert-watermark">{content.organization.charAt(0)}</div>

      {isModern && <div className="cert-bar" />}
      {f === "stripe" && <div className="cert-stripe-top" />}

      <div className="cert-inner">
        {(f === "corners" || f === "deco") && (
          <>
            <span className="cert-corner cert-corner-tl" />
            <span className="cert-corner cert-corner-tr" />
            <span className="cert-corner cert-corner-bl" />
            <span className="cert-corner cert-corner-br" />
          </>
        )}
        {(f === "ornate" || f === "laurel" || f === "engraved") && (
          <>
            <Filigree className="cert-filigree cert-filigree-tl" />
            <Filigree className="cert-filigree cert-filigree-tr" />
            <Filigree className="cert-filigree cert-filigree-bl" />
            <Filigree className="cert-filigree cert-filigree-br" />
          </>
        )}
        {f === "banner" && <div className="cert-banner">{content.title}</div>}
        {brand.logo && <img className="cert-logo" src={brand.logo} alt="" />}
        <div className="cert-org">{content.organization}</div>
        {f !== "banner" && <div className="cert-title">{content.title}</div>}
        {(f === "ornate" || f === "laurel") && <div className="cert-flourish">❦</div>}
        <div className="cert-intro">{content.intro}</div>
        <div className="cert-name">{name}</div>
        <div className="cert-rule" />
        <div className="cert-reason">{content.reason}</div>
        <div className="cert-footer">
          <div className="cert-sig-line">
            <div>{content.date}</div>
            <div>Date</div>
          </div>
          <Seal gid={`seal-${template.id}`} />
          <div className="cert-sig-line" style={{ textAlign: "right" }}>
            <div className="cert-sig-name">{content.signatoryName}</div>
            <div>{content.signatoryRole}</div>
          </div>
        </div>
        {qr && (
          <div className="cert-verify">
            <img className="cert-qr" src={qr} alt="" />
            <div className="cert-verify-meta">
              <div className="cert-verify-label">Scan to verify</div>
              {code && <div className="cert-verify-code">{code}</div>}
              {verifyUrl && <div className="cert-verify-url">{verifyUrl}</div>}
            </div>
          </div>
        )}
      </div>
      {f === "stripe" && <div className="cert-stripe-bottom" />}
    </div>
  );
});
