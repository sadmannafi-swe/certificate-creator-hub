import { forwardRef, type CSSProperties } from "react";
import type { CertContent, CertTemplate } from "@/lib/templates";

interface Props {
  template: CertTemplate;
  content: CertContent;
  name: string;
}

export const Certificate = forwardRef<HTMLDivElement, Props>(function Certificate(
  { template, content, name },
  ref,
) {
  const p = template.palette;
  const style = {
    "--c-bg": p.bg,
    "--c-panel": p.panel,
    "--c-ink": p.ink,
    "--c-soft": p.soft,
    "--c-accent": p.accent,
  } as CSSProperties;

  const isModern = template.frame === "modern";

  return (
    <div ref={ref} className={`cert-surface cert-${template.frame}`} style={style}>
      {template.frame === "duotone" && <div className="cert-duotone-bg" />}
      {template.frame === "arch" && <div className="cert-arch-shape" />}
      {isModern && <div className="cert-bar" />}
      {template.frame === "stripe" && <div className="cert-stripe-top" />}
      <div className="cert-inner">
        {template.frame === "corners" && (
          <>
            <span className="cert-corner cert-corner-tl" />
            <span className="cert-corner cert-corner-tr" />
            <span className="cert-corner cert-corner-bl" />
            <span className="cert-corner cert-corner-br" />
          </>
        )}
        {template.frame === "banner" && <div className="cert-banner">{content.title}</div>}
        <div className="cert-org">{content.organization}</div>
        {template.frame !== "banner" && <div className="cert-title">{content.title}</div>}
        {template.frame === "ornate" && <div className="cert-flourish">❦</div>}
        <div className="cert-intro">{content.intro}</div>
        <div className="cert-name">{name}</div>
        <div className="cert-rule" />
        <div className="cert-reason">{content.reason}</div>
        <div className="cert-footer">
          <div className="cert-sig-line">
            <div>{content.date}</div>
            <div>Date</div>
          </div>
          <div className="cert-sig-line" style={{ textAlign: "right" }}>
            <div className="cert-sig-name">{content.signatoryName}</div>
            <div>{content.signatoryRole}</div>
          </div>
        </div>
      </div>
      {template.frame === "stripe" && <div className="cert-stripe-bottom" />}
    </div>
  );
});
