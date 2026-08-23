import { forwardRef } from "react";
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
  return (
    <div ref={ref} className={`cert-surface ${template.surface}`}>
      {template.id === "modern" && <div className="cert-bar" />}
      <div className="cert-inner">
        <div className="cert-org">{content.organization}</div>
        <div className="cert-title">{content.title}</div>
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
    </div>
  );
});
