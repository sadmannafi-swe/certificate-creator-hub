import type { ReactNode } from "react";

/**
 * Renders a fixed 1000x707 certificate canvas scaled down to fit its parent.
 * Shared by the homepage preview/gallery and the template editor.
 */
export function ScaledCert({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full" style={{ aspectRatio: "1000 / 707" }}>
      <div
        className="absolute left-0 top-0 origin-top-left shadow-lg"
        style={{ width: 1000, height: 707, transform: "scale(var(--cert-scale, 1))" }}
        ref={(el) => {
          if (!el?.parentElement) return;
          const fit = () =>
            el.style.setProperty("--cert-scale", String(el.parentElement!.clientWidth / 1000));
          fit();
          const ro = new ResizeObserver(fit);
          ro.observe(el.parentElement);
        }}
      >
        {children}
      </div>
    </div>
  );
}
