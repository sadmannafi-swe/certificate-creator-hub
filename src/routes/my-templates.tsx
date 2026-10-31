import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { CustomCertificate } from "@/components/CustomCertificate";
import { ScaledCert } from "@/components/ScaledCert";
import { DEFAULT_CONTENT } from "@/lib/templates";
import { downscaleImage, prepareBackground } from "@/lib/image";
import {
  cloneDefaultConfig,
  CUSTOM_FIELD_LABELS,
  LIBRARY_KEY_STORAGE,
  TEMPLATE_FONT_OPTIONS,
  type CustomFieldKey,
  type CustomFieldStyle,
  type PlacedItem,
} from "@/lib/custom-template";
import {
  deleteCustomTemplate,
  listCustomTemplates,
  saveCustomTemplate,
  type CustomTemplateDto,
} from "@/lib/custom-templates.functions";

export const Route = createFileRoute("/my-templates")({
  head: () => ({
    meta: [
      { title: "Template Studio — GenCertificates" },
      {
        name: "description",
        content:
          "Upload your own certificate design, set fonts, colors, logo and text positions, and save it to your private template library.",
      },
      { property: "og:title", content: "Template Studio — GenCertificates" },
      {
        property: "og:description",
        content:
          "Turn your own certificate design into a reusable GenCertificates template with QR verification built in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TemplateStudio,
});

type SelectedElement =
  | { kind: "field"; key: CustomFieldKey }
  | { kind: "logo" }
  | { kind: "qr" }
  | { kind: "seal" };

interface Draft {
  id: string | null;
  name: string;
  background: string | null;
  config: ReturnType<typeof cloneDefaultConfig>;
}

const PLACED_DEFAULTS: Record<"logo" | "qr" | "seal", PlacedItem> = {
  logo: { x: 64, y: 44, width: 150 },
  qr: { x: 66, y: 584, width: 88 },
  seal: { x: 500, y: 590, width: 108 },
};

function TemplateStudio() {
  const navigate = useNavigate();
  const listFn = useServerFn(listCustomTemplates);
  const saveFn = useServerFn(saveCustomTemplate);
  const deleteFn = useServerFn(deleteCustomTemplate);

  const [ownerToken, setOwnerToken] = useState("");
  const [templates, setTemplates] = useState<CustomTemplateDto[] | null>(null);
  const [backendOk, setBackendOk] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<SelectedElement>({ kind: "field", key: "name" });
  const [importKey, setImportKey] = useState("");
  const [scale, setScale] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    target: SelectedElement;
  } | null>(null);

  const refresh = useCallback(
    async (token: string) => {
      try {
        const res = await listFn({ data: { ownerToken: token } });
        setTemplates(res.templates);
        setBackendOk(res.ok);
      } catch {
        setTemplates([]);
        setBackendOk(false);
      }
    },
    [listFn],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("key");
    let token = fromUrl || localStorage.getItem(LIBRARY_KEY_STORAGE) || "";
    if (!token) token = crypto.randomUUID();
    localStorage.setItem(LIBRARY_KEY_STORAGE, token);
    setOwnerToken(token);
    void refresh(token);
  }, [refresh]);

  useEffect(() => {
    const fit = () => {
      if (wrapRef.current) setScale(wrapRef.current.clientWidth / 1000);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  function newDraft() {
    setSelected({ kind: "field", key: "name" });
    setDraft({ id: null, name: "My design", background: null, config: cloneDefaultConfig() });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editDraft(t: CustomTemplateDto) {
    setSelected({ kind: "field", key: "name" });
    setDraft({ id: t.id, name: t.name, background: t.backgroundUrl, config: t.config });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateField(key: CustomFieldKey, patch: Partial<CustomFieldStyle>) {
    setDraft((d) => {
      if (!d) return d;
      const f = d.config.fields[key]!;
      return {
        ...d,
        config: { ...d.config, fields: { ...d.config.fields, [key]: { ...f, ...patch } } },
      };
    });
  }

  function updatePlaced(kind: "logo" | "qr" | "seal", patch: Partial<PlacedItem>) {
    setDraft((d) => {
      if (!d) return d;
      const cur = d.config[kind];
      if (!cur) return d;
      return { ...d, config: { ...d.config, [kind]: { ...cur, ...patch } } };
    });
  }

  function selectElement(kind: "logo" | "qr" | "seal") {
    setSelected({ kind });
    setDraft((d) => {
      if (!d || d.config[kind]) return d;
      return { ...d, config: { ...d.config, [kind]: PLACED_DEFAULTS[kind] } };
    });
  }

  function onHandleDown(e: React.PointerEvent<HTMLDivElement>, target: SelectedElement) {
    if (!draft) return;
    e.preventDefault();
    e.stopPropagation();
    const pos =
      target.kind === "field" ? draft.config.fields[target.key]! : draft.config[target.kind];
    if (!pos) return;
    dragRef.current = {
      pointerId: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      ox: pos.x,
      oy: pos.y,
      target,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(target);
  }

  function onHandleMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId || scale <= 0) return;
    const nx = Math.max(0, Math.min(1000, d.ox + (e.clientX - d.sx) / scale));
    const ny = Math.max(0, Math.min(707, d.oy + (e.clientY - d.sy) / scale));
    if (d.target.kind === "field") updateField(d.target.key, { x: Math.round(nx), y: Math.round(ny) });
    else updatePlaced(d.target.kind, { x: Math.round(nx), y: Math.round(ny) });
  }

  function onHandleUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }

  async function onBackgroundFile(file: File) {
    try {
      const dataUrl = await prepareBackground(file);
      setDraft((d) => (d ? { ...d, background: dataUrl } : d));
      toast.success("Design uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Could not read that file. Use a JPG, PNG, WebP, SVG or one-page PDF.");
    }
  }

  async function onStudioLogoFile(file: File) {
    try {
      const dataUrl = await downscaleImage(file, 520);
      setDraft((d) =>
        d
          ? {
              ...d,
              config: {
                ...d.config,
                logoSrc: dataUrl,
                logo: d.config.logo ?? PLACED_DEFAULTS.logo,
              },
            }
          : d,
      );
      toast.success("Logo added");
    } catch {
      toast.error("Could not read that image");
    }
  }

  async function onSave(): Promise<string | null> {
    if (!draft || !ownerToken) return null;
    if (!draft.name.trim()) {
      toast.error("Give your template a name first");
      return null;
    }
    setSaving(true);
    try {
      const res = await saveFn({
        data: {
          id: draft.id ?? undefined,
          ownerToken,
          name: draft.name.trim(),
          backgroundUrl: draft.background,
          config: draft.config,
        },
      });
      setDraft({ ...draft, id: res.id });
      toast.success("Template saved to your library");
      void refresh(ownerToken);
      return res.id;
    } catch (err) {
      console.error(err);
      toast.error(errText(err));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveAndUse() {
    const id = draft?.id ? draft.id : await onSave();
    if (id) navigate({ to: "/", search: { template: id } });
  }

  async function onDelete(t: CustomTemplateDto) {
    if (!window.confirm(`Delete "${t.name}" from your library?`)) return;
    try {
      await deleteFn({ data: { ownerToken, id: t.id } });
      toast.success("Template deleted");
      if (draft?.id === t.id) setDraft(null);
      void refresh(ownerToken);
    } catch (err) {
      toast.error(errText(err));
    }
  }

  function importLibraryKey() {
    const raw = importKey.trim();
    if (!raw) return;
    const match = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const key = (match ? match[0]! : raw).toLowerCase();
    if (key.length < 8) {
      toast.error("That doesn't look like a library key");
      return;
    }
    localStorage.setItem(LIBRARY_KEY_STORAGE, key);
    setOwnerToken(key);
    setTemplates(null);
    setDraft(null);
    setImportKey("");
    void refresh(key);
    toast.success("Library unlocked");
  }

  const privateLink = ownerToken
    ? `${window.location.origin}/my-templates?key=${ownerToken}`
    : "";

  if (draft) {
    const selField = selected.kind === "field" ? draft.config.fields[selected.key]! : null;
    const selPlaced = selected.kind !== "field" ? draft.config[selected.kind] : null;
    return (
      <div className="min-h-screen bg-background">
        <StudioHeader />

        <main className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Template name"
              className="min-w-0 flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
              aria-label="Template name"
            />
            <button
              onClick={() => void onSave()}
              disabled={saving}
              className="rounded-md border border-gold bg-accent/40 px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              {saving ? "Saving…" : draft.id ? "Save changes" : "Save template"}
            </button>
            <button
              onClick={() => void saveAndUse()}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Save &amp; use on homepage
            </button>
            <button
              onClick={() => setDraft(null)}
              className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              Back to library
            </button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <div className="rounded-lg border border-border bg-secondary p-4">
                <div ref={wrapRef} className="relative w-full" style={{ aspectRatio: "1000 / 707" }}>
                  <div
                    className="absolute left-0 top-0 origin-top-left shadow-lg"
                    style={{
                      width: 1000,
                      height: 707,
                      transform: `scale(${scale})`,
                    }}
                  >
                    <CustomCertificate
                      config={draft.config}
                      background={draft.background}
                      logo={draft.config.logoSrc}
                      content={DEFAULT_CONTENT}
                      name="Participant Name"
                      qr={previewQr()}
                      code="XXXXXXXXXX"
                      verifyUrl="verify.gencertificates.app"
                    />

                    {/* Drag handles overlay */}
                    {(Object.keys(draft.config.fields) as CustomFieldKey[]).map((key) => {
                      const f = draft.config.fields[key]!;
                      const active = selected.kind === "field" && selected.key === key;
                      const transform =
                        f.align === "center"
                          ? "translate(-50%, -10px)"
                          : f.align === "right"
                            ? "translate(-100%, -10px)"
                            : "translateY(-10px)";
                      return (
                        <div
                          key={key}
                          onPointerDown={(e) => onHandleDown(e, { kind: "field", key })}
                          onPointerMove={onHandleMove}
                          onPointerUp={onHandleUp}
                          className={`absolute cursor-move rounded ${active ? "border-2 border-dashed border-gold bg-accent/10" : "border-2 border-dashed border-transparent"}`}
                          style={{
                            left: f.x,
                            top: f.y,
                            transform,
                            padding: "2px 8px",
                            minWidth: 36,
                            minHeight: 20,
                            touchAction: "none",
                            fontSize: 11,
                            color: "#b8912f",
                          }}
                          title={CUSTOM_FIELD_LABELS[key]}
                        >
                          {active ? CUSTOM_FIELD_LABELS[key] : ""}
                        </div>
                      );
                    })}
                    {(["logo", "qr", "seal"] as const).map((kind) => {
                      const p = draft.config[kind];
                      if (!p) return null;
                      const active = selected.kind === kind;
                      return (
                        <div
                          key={kind}
                          onPointerDown={(e) => onHandleDown(e, { kind })}
                          onPointerMove={onHandleMove}
                          onPointerUp={onHandleUp}
                          className={`absolute cursor-move rounded ${active ? "border-2 border-dashed border-gold bg-accent/10" : "border-2 border-dashed border-transparent"}`}
                          style={{
                            left: p.x,
                            top: p.y,
                            width: p.width,
                            height: kind === "qr" ? p.width : kind === "seal" ? p.width : Math.round(p.width * 0.45),
                            transform: "translate(-50%, -50%)",
                            touchAction: "none",
                          }}
                          title={kind === "qr" ? "QR code" : kind === "seal" ? "Seal" : "Logo"}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Drag the dashed boxes on the design to move the text, logo, QR code and seal. Pick an
                element on the right to fine-tune its font, size and color.
              </p>
            </div>

            <aside className="space-y-4">
              {/* Elements */}
              <section className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold">Elements</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(Object.keys(CUSTOM_FIELD_LABELS) as CustomFieldKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelected({ kind: "field", key })}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        selected.kind === "field" && selected.key === key
                          ? "border-gold bg-accent/50"
                          : "border-border bg-background hover:bg-secondary"
                      }`}
                    >
                      {CUSTOM_FIELD_LABELS[key]}
                    </button>
                  ))}
                  {(["logo", "qr", "seal"] as const).map((kind) => (
                    <button
                      key={kind}
                      onClick={() => selectElement(kind)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                        selected.kind === kind
                          ? "border-gold bg-accent/50"
                          : "border-border bg-background hover:bg-secondary"
                      }`}
                    >
                      {kind}
                      {!draft.config[kind] && "+"}
                    </button>
                  ))}
                </div>

                {selField && selected.kind === "field" && (
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Font
                      </span>
                      <select
                        value={selField.font}
                        onChange={(e) => updateField(selected.key, { font: e.target.value })}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        style={{ fontFamily: selField.font }}
                      >
                        {TEMPLATE_FONT_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id} style={{ fontFamily: o.id }}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex gap-3">
                      <label className="block flex-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Size (px)
                        </span>
                        <input
                          type="number"
                          min={6}
                          max={200}
                          value={selField.size}
                          onChange={(e) =>
                            updateField(selected.key, { size: Number(e.target.value) || 6 })
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block flex-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Color
                        </span>
                        <input
                          type="color"
                          value={selField.color}
                          onChange={(e) => updateField(selected.key, { color: e.target.value })}
                          className="mt-1 h-9 w-full cursor-pointer rounded border border-input bg-background"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      {(["left", "center", "right"] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => updateField(selected.key, { align: a })}
                          className={`rounded-md border px-2.5 py-1 text-xs capitalize ${
                            selField.align === a
                              ? "border-gold bg-accent/50"
                              : "border-border bg-background hover:bg-secondary"
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                      <label className="ml-auto flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={!!selField.bold}
                          onChange={(e) => updateField(selected.key, { bold: e.target.checked })}
                        />
                        Bold
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={!!selField.italic}
                          onChange={(e) => updateField(selected.key, { italic: e.target.checked })}
                        />
                        Italic
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={!!selField.uppercase}
                          onChange={(e) =>
                            updateField(selected.key, { uppercase: e.target.checked })
                          }
                        />
                        Caps
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <label className="block flex-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          X
                        </span>
                        <input
                          type="number"
                          value={selField.x}
                          onChange={(e) => updateField(selected.key, { x: Number(e.target.value) || 0 })}
                          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block flex-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Y
                        </span>
                        <input
                          type="number"
                          value={selField.y}
                          onChange={(e) => updateField(selected.key, { y: Number(e.target.value) || 0 })}
                          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {selected.kind !== "field" && selPlaced && (
                  <div className="mt-4 space-y-3">
                    <div className="flex gap-3">
                      <label className="block flex-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Width (px)
                        </span>
                        <input
                          type="number"
                          min={16}
                          max={600}
                          value={selPlaced.width}
                          onChange={(e) =>
                            updatePlaced(selected.kind, { width: Number(e.target.value) || 16 })
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block flex-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          X
                        </span>
                        <input
                          type="number"
                          value={selPlaced.x}
                          onChange={(e) => updatePlaced(selected.kind, { x: Number(e.target.value) || 0 })}
                          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block flex-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Y
                        </span>
                        <input
                          type="number"
                          value={selPlaced.y}
                          onChange={(e) => updatePlaced(selected.kind, { y: Number(e.target.value) || 0 })}
                          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        />
                      </label>
                    </div>
                    {selected.kind === "logo" && (
                      <div className="space-y-2">
                        <label className="inline-block cursor-pointer rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                          {draft.config.logoSrc ? "Replace logo image" : "Upload logo image"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void onStudioLogoFile(f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {draft.config.logoSrc && (
                          <button
                            onClick={() =>
                              setDraft((d) =>
                                d ? { ...d, config: { ...d.config, logoSrc: null } } : d,
                              )
                            }
                            className="block text-xs text-muted-foreground underline"
                          >
                            Remove logo image
                          </button>
                        )}
                      </div>
                    )}
                    {selected.kind !== "logo" && (
                      <button
                        onClick={() =>
                          setDraft((d) => {
                            if (!d) return d;
                            const next = { ...d.config };
                            next[selected.kind] = null;
                            return { ...d, config: next };
                          })
                        }
                        className="text-xs text-muted-foreground underline"
                      >
                        Remove {selected.kind} from design
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Background */}
              <section className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold">Your design (background)</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload a JPG, PNG, WebP, SVG or one-page PDF of your certificate. It fills the
                  whole certificate; text sits on top.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  {draft.background ? (
                    <img
                      src={draft.background}
                      alt="Uploaded design"
                      className="h-16 w-24 rounded border border-border bg-secondary object-contain"
                    />
                  ) : (
                    <div className="flex h-16 w-24 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
                      None
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="inline-block cursor-pointer rounded-md border border-gold bg-accent/40 px-3 py-1.5 text-xs font-medium hover:bg-accent">
                      {draft.background ? "Replace design" : "Upload design"}
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.svg,.pdf,image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void onBackgroundFile(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {draft.background && (
                      <button
                        onClick={() => setDraft({ ...draft, background: null })}
                        className="block text-xs text-muted-foreground underline"
                      >
                        Remove design
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* Colors & ornaments */}
              <section className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold">Colors &amp; decorations</h3>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-28 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Text color
                    </span>
                    <input
                      type="color"
                      value={draft.config.ink}
                      onChange={(e) =>
                        setDraft((d) => d && { ...d, config: { ...d.config, ink: e.target.value } })
                      }
                      className="h-8 w-12 cursor-pointer rounded border border-input bg-background"
                      aria-label="Text color"
                    />
                    <span className="w-20 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Accent
                    </span>
                    <input
                      type="color"
                      value={draft.config.accent}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, config: { ...d.config, accent: e.target.value } } : d,
                        )
                      }
                      className="h-8 w-12 cursor-pointer rounded border border-input bg-background"
                      aria-label="Accent color"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={draft.config.ornaments.border}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  config: {
                                    ...d.config,
                                    ornaments: { ...d.config.ornaments, border: e.target.checked },
                                  },
                                }
                              : d,
                          )
                        }
                      />
                      Accent border
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={draft.config.ornaments.corners}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  config: {
                                    ...d.config,
                                    ornaments: { ...d.config.ornaments, corners: e.target.checked },
                                  },
                                }
                              : d,
                          )
                        }
                      />
                      Corner marks
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={draft.config.showTexture}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? { ...d, config: { ...d.config, showTexture: e.target.checked } }
                              : d,
                          )
                        }
                      />
                      Paper texture (no design)
                    </label>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudioHeader />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-4xl font-semibold leading-tight">Template Studio</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Upload your own certificate design — or build one from fonts, colors and ornaments — and
          save it to your private library. Saved templates appear next to the 216 built-in examples
          on the generator page.
        </p>

        {!backendOk && (
          <p className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            The template library service isn&apos;t reachable right now. You can still design, but
            saving needs the backend to be configured.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={newDraft}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            + New template
          </button>
          <span className="text-sm text-muted-foreground">
            {templates === null
              ? "Loading your library…"
              : `${templates.length} saved template${templates.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {templates !== null && templates.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div key={t.id} className="overflow-hidden rounded-lg border border-border bg-card">
                <ScaledCert>
                  <CustomCertificate
                    config={t.config}
                    background={t.backgroundUrl}
                    logo={t.config.logoSrc}
                    content={DEFAULT_CONTENT}
                    name="Participant Name"
                  />
                </ScaledCert>
                <div className="border-t border-border p-3">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Updated {new Date(t.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => editDraft(t)}
                      className="rounded-md border border-gold bg-accent/40 px-3 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => navigate({ to: "/", search: { template: t.id } })}
                      className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => void onDelete(t)}
                      className="rounded-md border border-input px-3 py-1.5 text-xs font-medium text-destructive hover:bg-secondary"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {templates !== null && templates.length === 0 && (
          <div className="mt-6 rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No custom templates yet. Click <strong>New template</strong> to upload your own
              certificate design.
            </p>
          </div>
        )}

        <div className="mt-10 rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold">Your private library key</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your templates are locked to this key. Copy the private link to open this library on
            another device, or paste a key or link below to unlock a library here.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded bg-secondary px-3 py-2 text-xs">
              {ownerToken || "…"}
            </code>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(privateLink);
                toast.success("Private library link copied");
              }}
              disabled={!ownerToken}
              className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
            >
              Copy private link
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={importKey}
              onChange={(e) => setImportKey(e.target.value)}
              placeholder="Paste a library key or link"
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              aria-label="Import library key"
            />
            <button
              onClick={importLibraryKey}
              className="rounded-md border border-gold bg-accent/40 px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Unlock
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function StudioHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold tracking-tight">
            Gen<span className="text-gold">Certificates</span>
          </span>
          <span className="text-sm text-muted-foreground">Template Studio</span>
        </Link>
        <Link
          to="/"
          className="rounded-md border border-gold px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-accent"
        >
          Back to generator
        </Link>
      </div>
    </header>
  );
}

/** Placeholder QR used by the editor preview — real codes are added on generate. */
function previewQr(): string {
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#fff"/><g fill="#111">${Array.from(
        { length: 100 },
        (_, i) =>
          (i * 7) % 3 === 0
            ? `<rect x="${(i % 10) * 12}" y="${Math.floor(i / 10) * 12}" width="12" height="12"/>`
            : "",
      ).join("")}</g></svg>`,
    )
  );
}

function errText(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Unexpected error.";
  if (/Missing Supabase environment|Failed to fetch|NetworkError|502|503|500|TEMPLATE_NOT_FOUND/i.test(raw)) {
    if (/TEMPLATE_NOT_FOUND/i.test(raw)) return "That template no longer exists in your library.";
    return "The template library service isn't configured on this deployment.";
  }
  return raw;
}
