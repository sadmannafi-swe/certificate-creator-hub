import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
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
import { BODY_FONTS, DEFAULT_BRAND, HEADING_FONTS, type Brand } from "@/lib/brand";
import { guessNameColumn, readSheet, type SheetData } from "@/lib/import-names";
import { createCertificateBatch } from "@/lib/verification.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GenCertificates — Bulk Certificate Generator for Courses" },
      {
        name: "description",
        content:
          "Pick a certificate template, add your logo, fonts and brand colors, import names from CSV or Excel, and generate verifiable certificates with QR codes.",
      },
      { property: "og:title", content: "GenCertificates — Bulk Certificate Generator" },
      {
        property: "og:description",
        content:
          "Design a certificate once, import your participant list, and download every certificate as PDF or PNG with a QR verification code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Job = { name: string; code: string | null; qr: string | null; url: string | null };
type Generated = { name: string; dataUrl: string; code: string | null };

function Home() {
  const [templateId, setTemplateId] = useState<string>(TEMPLATES[0]!.id);
  const [frameFilter, setFrameFilter] = useState<string>("all");
  const [paletteFilter, setPaletteFilter] = useState<string>("all");
  const [content, setContent] = useState<CertContent>(DEFAULT_CONTENT);
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [rawNames, setRawNames] = useState("1. Ayesha Rahman\n2. Daniel Okafor\n3. Mei Lin Chen");
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [nameColumn, setNameColumn] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [generated, setGenerated] = useState<Generated[]>([]);
  const [manageLink, setManageLink] = useState<string | null>(null);
  const [verifyWarning, setVerifyWarning] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "pdf-zip" | null>(null);
  const [progress, setProgress] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(0);


  const stageRef = useRef<HTMLDivElement>(null);
  const template = TEMPLATES.find((t) => t.id === templateId)!;
  const createBatch = useServerFn(createCertificateBatch);

  const names = useMemo(() => {
    if (sheet) {
      return sheet.rows.map((r) => (r[nameColumn] ?? "").trim()).filter(Boolean);
    }
    return parseNames(rawNames);
  }, [sheet, nameColumn, rawNames]);

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

  async function onLogoFile(file: File) {
    const dataUrl = await downscaleImage(file, 520);
    setBrand((b) => ({ ...b, logo: dataUrl }));
  }

  async function onSheetFile(file: File) {
    try {
      const parsed = await readSheet(file);
      if (!parsed.rows.length) {
        toast.error("That file didn't contain any rows");
        return;
      }
      setSheet(parsed);
      setNameColumn(guessNameColumn(parsed.headers, parsed.rows));
      toast.success(`Imported ${parsed.rows.length} rows from ${file.name}`);
    } catch {
      toast.error("Could not read that file. Use a .csv, .xlsx or .xls file.");
    }
  }

  async function generate() {
    if (!names.length || !stageRef.current) return;
    setBusy(true);
    setProgress(0);
    setGenerated([]);
    setGenError(null);
    setVerifyWarning(null);
    setManageLink(null);
    const origin = window.location.origin;

    // 1. Try to register the batch so every certificate gets a permanent verification code.
    //    If the verification backend is unreachable (e.g. a self-hosted deploy without the
    //    backend env vars), we still generate every certificate — just without QR codes.
    let issued: { name: string; code: string }[] | null = null;
    try {
      const res = await createBatch({
        data: {
          organization: content.organization,
          title: content.title,
          reason: content.reason,
          issueDate: content.date,
          signatoryName: content.signatoryName,
          signatoryRole: content.signatoryRole,
          names,
        },
      });
      issued = res.certificates;
      setManageLink(`${origin}/manage/${res.batchId}?token=${res.editToken}`);
    } catch (err) {
      console.error("[GenCertificates] verification backend unavailable", err);
      setVerifyWarning(
        `${errorText(err)} Certificates were still generated, but without QR verification codes.`,
      );
    }

    try {
      const QRCode = await import("qrcode");
      const nextJobs: Job[] = [];
      if (issued) {
        for (const c of issued) {
          const url = `${origin}/verify/${c.code}`;
          const qr = await QRCode.toDataURL(url, {
            margin: 0,
            width: 240,
            errorCorrectionLevel: "M",
            color: { dark: "#111111", light: "#ffffff" },
          });
          nextJobs.push({ name: c.name, code: c.code, qr, url });
        }
      } else {
        for (const name of names) {
          nextJobs.push({ name, code: null, qr: null, url: null });
        }
      }
      setJobs(nextJobs);

      // 2. Let React paint the offscreen stage with the QR codes before capturing.
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

      const nodes = Array.from(
        stageRef.current.querySelectorAll<HTMLDivElement>("[data-cert]"),
      );
      const out: Generated[] = [];
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]!;
        const dataUrl = await toPng(node, {
          width: 1000,
          height: 707,
          pixelRatio: 2,
          cacheBust: true,
        });
        out.push({ name: nextJobs[i]!.name, dataUrl, code: nextJobs[i]!.code });
        setProgress(i + 1);
      }
      setGenerated(out);
      if (issued) toast.success(`Generated ${out.length} certificates`);
      else toast.warning("Generated without QR verification — backend unavailable");
    } catch (err) {
      console.error(err);
      const message = errorText(err);
      setGenError(message);
      toast.error(message);
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

  const previewQr =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#fff"/><g fill="#111">${Array.from(
        { length: 100 },
        (_, i) =>
          (i * 7) % 3 === 0
            ? `<rect x="${(i % 10) * 12}" y="${Math.floor(i / 10) * 12}" width="12" height="12"/>`
            : "",
      ).join("")}</g></svg>`,
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tracking-tight">
              Gen<span className="text-gold">Certificates</span>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden text-sm text-muted-foreground sm:block">
              Bulk certificates for courses, seminars &amp; workshops
            </span>
            <Link
              to="/verify"
              className="rounded-md border border-gold px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-accent"
            >
              Verify a certificate
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
          Design one certificate. Generate them for everyone.
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Add your logo, brand colors and fonts, import names from a spreadsheet, and download
          verifiable certificates with a scannable QR code.
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
                  <Certificate
                    template={t}
                    content={content}
                    brand={brand}
                    name={names[0] ?? "Participant"}
                  />
                </ScaledCert>
                <div className="border-t border-border px-3 py-2 text-sm font-medium">{t.name}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2 — brand */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold">2. Brand it</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your logo, accent color and fonts apply to every template.
          </p>
          <div className="mt-4 grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-3">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Logo
              </span>
              <div className="mt-2 flex items-center gap-3">
                {brand.logo ? (
                  <img
                    src={brand.logo}
                    alt="Your uploaded logo"
                    className="h-14 w-24 rounded border border-border bg-secondary object-contain p-1"
                  />
                ) : (
                  <div className="flex h-14 w-24 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
                    None
                  </div>
                )}
                <div className="space-y-1">
                  <label className="inline-block cursor-pointer rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                    Upload
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onLogoFile(f);
                      }}
                    />
                  </label>
                  {brand.logo && (
                    <button
                      onClick={() => setBrand((b) => ({ ...b, logo: null }))}
                      className="block text-xs text-muted-foreground underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <ColorControl
                label="Accent color"
                enabled={brand.useCustomAccent}
                onToggle={(v) => setBrand((b) => ({ ...b, useCustomAccent: v }))}
                value={brand.accent}
                onChange={(v) => setBrand((b) => ({ ...b, accent: v, useCustomAccent: true }))}
              />
              <ColorControl
                label="Text color"
                enabled={brand.useCustomInk}
                onToggle={(v) => setBrand((b) => ({ ...b, useCustomInk: v }))}
                value={brand.ink}
                onChange={(v) => setBrand((b) => ({ ...b, ink: v, useCustomInk: true }))}
              />
            </div>

            <div className="space-y-3">
              <SelectControl
                label="Heading font"
                value={brand.headingFont}
                onChange={(v) => setBrand((b) => ({ ...b, headingFont: v }))}
                options={HEADING_FONTS}
              />
              <SelectControl
                label="Body font"
                value={brand.bodyFont}
                onChange={(v) => setBrand((b) => ({ ...b, bodyFont: v }))}
                options={BODY_FONTS}
              />
            </div>
          </div>
        </section>

        {/* Step 3 — edit */}
        <section className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,340px)_1fr]">
          <div>
            <h2 className="text-lg font-semibold">3. Edit the wording</h2>
            <div className="mt-4 space-y-3 rounded-lg border border-border bg-card p-5">
              <Field label="Organization" value={content.organization} onChange={set("organization")} />
              <Field label="Certificate title" value={content.title} onChange={set("title")} />
              <Field label="Intro line" value={content.intro} onChange={set("intro")} />
              <Field label="Achievement" value={content.reason} onChange={set("reason")} textarea />
              <Field label="Date" value={content.date} onChange={set("date")} />
              <Field label="Signatory name" value={content.signatoryName} onChange={set("signatoryName")} />
              <Field label="Signatory role" value={content.signatoryRole} onChange={set("signatoryRole")} />
            </div>
          </div>

          <div>
            <div className="sticky top-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">
                  Live preview
                  <span className="ml-2 align-middle text-xs font-medium uppercase tracking-wide text-gold">
                    updates as you type
                  </span>
                </h2>
                {names.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewIndex((i) => (i - 1 + names.length) % names.length)}
                      className="rounded-md border border-input px-2 py-1 text-sm hover:bg-secondary"
                      aria-label="Previous recipient"
                    >
                      ‹
                    </button>
                    <select
                      value={Math.min(previewIndex, names.length - 1)}
                      onChange={(e) => setPreviewIndex(Number(e.target.value))}
                      className="max-w-[190px] rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      aria-label="Preview recipient"
                    >
                      {names.map((n, i) => (
                        <option key={`${n}-${i}`} value={i}>
                          {i + 1}. {n}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setPreviewIndex((i) => (i + 1) % names.length)}
                      className="rounded-md border border-input px-2 py-1 text-sm hover:bg-secondary"
                      aria-label="Next recipient"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-secondary p-4">
                <ScaledCert>
                  <Certificate
                    template={template}
                    content={content}
                    brand={brand}
                    name={previewName}
                    qr={previewQr}
                    code="XXXXXXXXXX"
                    verifyUrl="preview — real code added on generate"
                  />
                </ScaledCert>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Showing recipient {names.length ? Math.min(previewIndex, names.length - 1) + 1 : 0}{" "}
                of {names.length} — names, date and signature update instantly.
              </p>
            </div>
          </div>

        </section>

        {/* Step 4 — names */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold">4. Add participant names</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a list, or import a CSV / Excel file and pick the column that holds the names.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-block cursor-pointer rounded-md border border-gold bg-accent/40 px-4 py-2 text-sm font-medium hover:bg-accent">
              Import CSV / Excel
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onSheetFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            {sheet && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Name column</span>
                  <select
                    value={nameColumn}
                    onChange={(e) => setNameColumn(Number(e.target.value))}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  >
                    {sheet.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() => setSheet(null)}
                  className="text-sm text-muted-foreground underline"
                >
                  Clear import
                </button>
              </>
            )}
          </div>

          {sheet ? (
            <div className="mt-4 max-h-56 overflow-y-auto rounded-lg border border-border bg-card p-4 text-sm">
              <ol className="list-inside list-decimal space-y-1">
                {names.map((n, i) => (
                  <li key={`${n}-${i}`}>{n}</li>
                ))}
              </ol>
            </div>
          ) : (
            <textarea
              value={rawNames}
              onChange={(e) => setRawNames(e.target.value)}
              rows={8}
              className="mt-4 w-full rounded-lg border border-input bg-card p-4 font-mono text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              onClick={generate}
              disabled={busy || !names.length}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy
                ? progress
                  ? `Generating ${progress}/${names.length}…`
                  : "Creating verification codes…"
                : `Generate ${names.length} certificate${names.length === 1 ? "" : "s"}`}
            </button>
            <span className="text-sm text-muted-foreground">
              {names.length} name{names.length === 1 ? "" : "s"} detected
            </span>
          </div>

          {genError && (
            <p className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {genError}
            </p>
          )}
          {verifyWarning && (
            <p className="mt-4 rounded-lg border border-gold/50 bg-accent/30 p-4 text-sm text-muted-foreground">
              {verifyWarning}
            </p>
          )}
        </section>

        {/* Step 5 — results */}
        {generated.length > 0 && (
          <section className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">5. Your certificates</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={downloadCombinedPdf}
                  disabled={exporting !== null}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {exporting === "pdf"
                    ? "Building PDF…"
                    : `Download one PDF (${generated.length} pages)`}
                </button>
                <button
                  onClick={downloadPdfZip}
                  disabled={exporting !== null}
                  className="rounded-md border border-gold bg-accent/40 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {exporting === "pdf-zip" ? "Building PDFs…" : "Separate PDFs (ZIP)"}
                </button>
                <button
                  onClick={downloadZip}
                  className="rounded-md border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  PNG ZIP
                </button>
              </div>
            </div>

            {manageLink && (
              <div className="mt-4 rounded-lg border border-gold bg-accent/20 p-5">
                <h3 className="font-semibold">Your private verification-page editor</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Save this link. It lets you edit the page people see when they scan a QR code, and
                  revoke certificates. Anyone with the link can edit, so keep it private.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code className="max-w-full truncate rounded bg-card px-3 py-2 text-xs">
                    {manageLink}
                  </code>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(manageLink);
                      toast.success("Editor link copied");
                    }}
                    className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                  >
                    Copy
                  </button>
                  <a
                    href={manageLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-md border border-gold bg-accent/40 px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    Open editor
                  </a>
                </div>
              </div>
            )}

            <p className="mt-3 text-sm text-muted-foreground">
              Each certificate carries a unique QR code linking to its public verification page. The
              ZIPs can be dropped straight into a Google Drive folder.
            </p>

            <div className="mt-5 grid gap-6 md:grid-cols-2">
              {generated.map((g, gi) => (
                <figure key={`${g.code ?? "nocode"}-${gi}`} className="rounded-lg border border-border bg-card p-3">
                  <img
                    src={g.dataUrl}
                    alt={`Certificate for ${g.name}`}
                    className="w-full rounded"
                    loading="lazy"
                  />
                  <figcaption className="mt-3 flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{g.name}</span>
                      {g.code ? (
                        <a
                          href={`/verify/${g.code}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="font-mono text-xs text-gold underline"
                        >
                          {g.code}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">no verification code</span>
                      )}
                    </span>

                    <span className="flex shrink-0 gap-2">
                      <button
                        onClick={() => downloadOnePdf(g)}
                        className="rounded-md border border-gold bg-accent/40 px-3 py-1.5 text-xs font-medium hover:bg-accent"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => downloadOne(g)}
                        className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                      >
                        PNG
                      </button>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="mt-16 border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>GenCertificates — certificates render in your browser; only verification details are stored.</p>
        <p className="mt-2">
          Developed by{" "}
          <a
            href="https://www.linkedin.com/in/sadman-nahial-nafi/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gold underline underline-offset-2 hover:text-foreground"
          >
            Sadman Nahial Nafi
          </a>
        </p>
      </footer>

      {/* Offscreen render stage at full resolution */}
      <div
        ref={stageRef}
        aria-hidden
        style={{ position: "fixed", top: 0, left: -20000, width: 1000, pointerEvents: "none" }}
      >
        {jobs.map((j, ji) => (
          <div key={`${j.code ?? "nocode"}-${ji}`} data-cert>
            <Certificate
              template={template}
              content={content}
              brand={brand}
              name={j.name}
              qr={j.qr}
              code={j.code}
              verifyUrl={j.url ? j.url.replace(/^https?:\/\//, "") : null}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

async function downscaleImage(file: File, maxWidth: number): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  if (file.type === "image/svg+xml") return dataUrl;

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxWidth) return resolve(dataUrl);
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = Math.round((img.height / img.width) * maxWidth);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
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

function ColorControl({
  label,
  enabled,
  onToggle,
  value,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="size-4 accent-[var(--gold,#b8912f)]"
          aria-label={`Use custom ${label.toLowerCase()}`}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 cursor-pointer rounded border border-input bg-background"
          aria-label={label}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 rounded-md border border-input bg-background px-2 py-1 font-mono text-xs"
          aria-label={`${label} hex value`}
        />
      </div>
      {!enabled && (
        <span className="text-[11px] text-muted-foreground">Using the template color</span>
      )}
    </div>
  );
}

function SelectControl({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        style={{ fontFamily: value }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id} style={{ fontFamily: o.id }}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
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

function errorText(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Unexpected error.";
  if (/Missing Supabase environment|VERIFICATION_BACKEND_UNAVAILABLE|Failed to fetch|NetworkError|502|503|500/i.test(raw)) {
    return "The verification service is not configured on this deployment.";
  }
  return raw;
}
