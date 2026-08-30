import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { Certificate } from "@/components/Certificate";
import {
  DEFAULT_CONTENT,
  FRAME_FILTERS,
  PALETTE_FILTERS,
  TEMPLATES,
  parseNames,
  slugify,
  type CertContent,
} from "@/lib/templates";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GenCertificates — Bulk Certificate Generator for Courses" },
      {
        name: "description",
        content:
          "Pick a certificate template, edit the wording, paste your list of names, and generate and download every certificate at once.",
      },
      { property: "og:title", content: "GenCertificates — Bulk Certificate Generator" },
      {
        property: "og:description",
        content:
          "Design a certificate once, add your participant names, and download all certificates as PNG files in a single ZIP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Generated = { name: string; dataUrl: string };

function Home() {
  const [templateId, setTemplateId] = useState<string>(TEMPLATES[0]!.id);
  const [frameFilter, setFrameFilter] = useState<string>("all");
  const [paletteFilter, setPaletteFilter] = useState<string>("all");
  const [content, setContent] = useState<CertContent>(DEFAULT_CONTENT);
  const [rawNames, setRawNames] = useState("1. Ayesha Rahman\n2. Daniel Okafor\n3. Mei Lin Chen");
  const [generated, setGenerated] = useState<Generated[]>([]);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "pdf-zip" | null>(null);

  const [progress, setProgress] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const template = TEMPLATES.find((t) => t.id === templateId)!;
  const names = useMemo(() => parseNames(rawNames), [rawNames]);
  const visibleTemplates = useMemo(
    () =>
      TEMPLATES.filter(
        (t) =>
          (frameFilter === "all" || t.frame === frameFilter) &&
          (paletteFilter === "all" || t.palette.id === paletteFilter),
      ),
    [frameFilter, paletteFilter],
  );

  const set = (key: keyof CertContent) => (e: { target: { value: string } }) =>
    setContent((c) => ({ ...c, [key]: e.target.value }));

  async function generate() {
    if (!names.length || !stageRef.current) return;
    setBusy(true);
    setProgress(0);
    setGenerated([]);
    const out: Generated[] = [];
    try {
      const nodes = Array.from(
        stageRef.current.querySelectorAll<HTMLDivElement>("[data-cert]"),
      );
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]!;
        const dataUrl = await toPng(node, {
          width: 1000,
          height: 707,
          pixelRatio: 2,
          cacheBust: true,
        });
        out.push({ name: names[i]!, dataUrl });
        setProgress(i + 1);
      }
      setGenerated(out);
    } finally {
      setBusy(false);
    }
  }

  function downloadOne(item: Generated) {
    const a = document.createElement("a");
    a.href = item.dataUrl;
    a.download = `${slugify(item.name)}-certificate.png`;
    a.click();
  }

  async function downloadZip() {
    const zip = new JSZip();
    const folder = zip.folder(slugify(content.organization) || "certificates")!;
    generated.forEach((g, i) => {
      folder.file(
        `${String(i + 1).padStart(2, "0")}-${slugify(g.name)}.png`,
        g.dataUrl.split(",")[1]!,
        { base64: true },
      );
    });
    const blob = await zip.generateAsync({ type: "blob" });
    saveBlob(blob, "gencertificates.zip");
  }

  function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function makePdf(items: Generated[]) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [1000, 707] });
    items.forEach((item, i) => {
      if (i > 0) doc.addPage([1000, 707], "landscape");
      doc.addImage(item.dataUrl, "PNG", 0, 0, 1000, 707, undefined, "FAST");
    });
    return doc.output("blob");
  }

  async function downloadCombinedPdf() {
    if (!generated.length) return;
    setExporting("pdf");
    try {
      const blob = await makePdf(generated);
      saveBlob(blob, `${slugify(content.organization) || "gencertificates"}-certificates.pdf`);
    } finally {
      setExporting(null);
    }
  }

  async function downloadPdfZip() {
    if (!generated.length) return;
    setExporting("pdf-zip");
    try {
      const zip = new JSZip();
      const folder = zip.folder(slugify(content.organization) || "certificates")!;
      for (let i = 0; i < generated.length; i++) {
        const g = generated[i]!;
        const blob = await makePdf([g]);
        folder.file(
          `${String(i + 1).padStart(2, "0")}-${slugify(g.name)}.pdf`,
          await blob.arrayBuffer(),
        );
      }
      const out = await zip.generateAsync({ type: "blob" });
      saveBlob(out, "gencertificates-pdfs.zip");
    } finally {
      setExporting(null);
    }
  }

  async function downloadOnePdf(item: Generated) {
    const blob = await makePdf([item]);
    saveBlob(blob, `${slugify(item.name)}-certificate.pdf`);
  }


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tracking-tight">
              Gen<span className="text-gold">Certificates</span>
            </span>
          </div>
          <span className="hidden text-sm text-muted-foreground sm:block">
            Bulk certificates for courses, seminars & workshops
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
          Design one certificate. Generate them for everyone.
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Choose a template, edit the wording, paste your participant list, and download every
          certificate as a high-resolution PNG.
        </p>

        {/* Step 1 — templates */}
        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">1. Choose a template</h2>
            <span className="text-sm text-muted-foreground">
              {visibleTemplates.length} of {TEMPLATES.length} designs
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <FilterRow
              label="Style"
              value={frameFilter}
              onChange={setFrameFilter}
              options={FRAME_FILTERS.map((f) => ({ id: f.id, name: f.name }))}
            />
            <FilterRow
              label="Color"
              value={paletteFilter}
              onChange={setPaletteFilter}
              options={PALETTE_FILTERS.map((p) => ({ id: p.id, name: p.name, swatch: p.accent }))}
            />
          </div>

          <div className="mt-5 grid max-h-[560px] gap-4 overflow-y-auto rounded-lg border border-border bg-secondary/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={`overflow-hidden rounded-lg border bg-card text-left transition-all ${
                  t.id === templateId
                    ? "border-gold ring-2 ring-gold/50"
                    : "border-border hover:border-gold/60"
                }`}
              >
                <ScaledCert>
                  <Certificate template={t} content={content} name={names[0] ?? "Participant"} />
                </ScaledCert>
                <div className="border-t border-border px-3 py-2 text-sm font-medium">{t.name}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2 — edit */}
        <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,340px)_1fr]">
          <div>
            <h2 className="text-lg font-semibold">2. Edit the certificate</h2>
            <div className="mt-4 space-y-3 rounded-lg border border-border bg-card p-5">
              <Field label="Organization" value={content.organization} onChange={set("organization")} />
              <Field label="Certificate title" value={content.title} onChange={set("title")} />
              <Field label="Intro line" value={content.intro} onChange={set("intro")} />
              <Field label="Reason / achievement" value={content.reason} onChange={set("reason")} textarea />
              <Field label="Date" value={content.date} onChange={set("date")} />
              <Field label="Signatory name" value={content.signatoryName} onChange={set("signatoryName")} />
              <Field label="Signatory role" value={content.signatoryRole} onChange={set("signatoryRole")} />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Live preview</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-border bg-secondary p-4">
              <ScaledCert>
                <Certificate
                  template={template}
                  content={content}
                  name={names[0] ?? "Participant Name"}
                />
              </ScaledCert>
            </div>
          </div>
        </section>

        {/* Step 3 — names */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">3. Add participant names</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One per line — numbering like “1.” or “2)” is stripped automatically. Commas work too.
          </p>
          <textarea
            value={rawNames}
            onChange={(e) => setRawNames(e.target.value)}
            rows={8}
            className="mt-3 w-full rounded-lg border border-input bg-card p-4 font-mono text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              onClick={generate}
              disabled={busy || !names.length}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy
                ? `Generating ${progress}/${names.length}…`
                : `Generate ${names.length} certificate${names.length === 1 ? "" : "s"}`}
            </button>
            <span className="text-sm text-muted-foreground">
              {names.length} name{names.length === 1 ? "" : "s"} detected
            </span>
          </div>
        </section>

        {/* Step 4 — results */}
        {generated.length > 0 && (
          <section className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">4. Your certificates</h2>
              <button
                onClick={downloadZip}
                className="rounded-md border border-gold bg-accent/40 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                Download all ({generated.length}) as ZIP
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Tip: the ZIP can be dropped straight into a Google Drive folder — or ask to have
              Google Drive connected for one-click uploads.
            </p>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              {generated.map((g) => (
                <figure key={g.name} className="rounded-lg border border-border bg-card p-3">
                  <img
                    src={g.dataUrl}
                    alt={`Certificate for ${g.name}`}
                    className="w-full rounded"
                    loading="lazy"
                  />
                  <figcaption className="mt-3 flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">{g.name}</span>
                    <button
                      onClick={() => downloadOne(g)}
                      className="shrink-0 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      Download PNG
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="mt-16 border-t border-border py-8 text-center text-sm text-muted-foreground">
        GenCertificates — everything is generated in your browser.
      </footer>

      {/* Offscreen render stage at full resolution */}
      <div
        ref={stageRef}
        aria-hidden
        style={{ position: "fixed", top: 0, left: -20000, width: 1000, pointerEvents: "none" }}
      >
        {names.map((n) => (
          <div key={n} data-cert>
            <Certificate template={template} content={content} name={n} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScaledCert({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full" style={{ aspectRatio: "1000 / 707" }}>
      <div
        className="absolute left-0 top-0 origin-top-left shadow-lg"
        style={{ width: 1000, height: 707, transform: "scale(var(--cert-scale, 1))" }}
        ref={(el) => {
          if (!el?.parentElement) return;
          const fit = () =>
            el.style.setProperty(
              "--cert-scale",
              String(el.parentElement!.clientWidth / 1000),
            );
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

function FilterRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string; swatch?: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-12 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {[{ id: "all", name: "All" }, ...options].map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            value === o.id
              ? "border-gold bg-accent/50"
              : "border-border bg-card hover:bg-secondary"
          }`}
        >
          {"swatch" in o && o.swatch && (
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: o.swatch as string }}
            />
          )}
          {o.name}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  textarea?: boolean;
}) {
  const cls =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30";
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {textarea ? (
        <textarea value={value} onChange={onChange} rows={3} className={cls} />
      ) : (
        <input value={value} onChange={onChange} className={cls} />
      )}
    </label>
  );
}
