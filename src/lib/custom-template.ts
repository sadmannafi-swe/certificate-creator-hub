import { BODY_FONTS, HEADING_FONTS } from "@/lib/brand";

export type CustomFieldKey =
  | "organization"
  | "title"
  | "intro"
  | "name"
  | "reason"
  | "date"
  | "signatory";

export interface CustomFieldStyle {
  /** Horizontal center/edge anchor in px on the 1000x707 canvas. */
  x: number;
  /** Top edge in px on the 1000x707 canvas. */
  y: number;
  /** Font size in px at full 1000px-wide resolution. */
  size: number;
  font: string;
  color: string;
  align: "left" | "center" | "right";
  bold?: boolean;
  italic?: boolean;
  uppercase?: boolean;
  /** Letter spacing in px. */
  spacing?: number;
}

export interface PlacedItem {
  x: number;
  y: number;
  width: number;
}

export interface CustomTemplateConfig {
  fields: Record<CustomFieldKey, CustomFieldStyle>;
  logo: PlacedItem | null;
  /** Data URL of the uploaded logo image (stored with the template). */
  logoSrc: string | null;
  qr: PlacedItem | null;
  seal: PlacedItem | null;
  ink: string;
  accent: string;
  ornaments: { border: boolean; corners: boolean };
  showTexture: boolean;
}

export const CUSTOM_FIELD_LABELS: Record<CustomFieldKey, string> = {
  organization: "Organization",
  title: "Certificate title",
  intro: "Intro line",
  name: "Recipient name",
  reason: "Achievement line",
  date: "Date",
  signatory: "Signatory",
};

const FONT_OPTIONS = [...HEADING_FONTS, ...BODY_FONTS.filter((f) => !HEADING_FONTS.some((h) => h.id === f.id))];

export const TEMPLATE_FONT_OPTIONS = FONT_OPTIONS;

export const INK = "#2c2415";
export const SOFT = "#6b6250";
export const ACCENT = "#b8912f";

export function cloneDefaultConfig(): CustomTemplateConfig {
  const body = BODY_FONTS[0]!.id;
  const heading = HEADING_FONTS[0]!.id;
  return {
    fields: {
      organization: { x: 500, y: 76, size: 24, font: heading, color: ACCENT, align: "center", bold: true, uppercase: true, spacing: 4 },
      title: { x: 500, y: 124, size: 58, font: heading, color: INK, align: "center", bold: true },
      intro: { x: 500, y: 246, size: 20, font: body, color: SOFT, align: "center", spacing: 1 },
      name: { x: 500, y: 292, size: 64, font: heading, color: INK, align: "center", italic: true, bold: true },
      reason: { x: 500, y: 402, size: 20, font: body, color: SOFT, align: "center" },
      date: { x: 250, y: 590, size: 18, font: body, color: SOFT, align: "center" },
      signatory: { x: 750, y: 584, size: 24, font: heading, color: INK, align: "center" },
    },
    logo: { x: 64, y: 44, width: 150 },
    logoSrc: null,
    qr: { x: 66, y: 584, width: 88 },
    seal: { x: 500, y: 590, width: 108 },
    ink: INK,
    accent: ACCENT,
    ornaments: { border: true, corners: false },
    showTexture: true,
  };
}

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value.trim()) ? value.trim() : fallback;
}

function normalizeFont(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length <= 120 ? value : fallback;
}

function normalizeAlign(value: unknown): "left" | "center" | "right" {
  return value === "left" || value === "right" ? value : "center";
}

function normalizePlaced(value: unknown, fallback: PlacedItem | null): PlacedItem | null {
  if (!value || typeof value !== "object") return fallback;
  const v = value as Record<string, unknown>;
  return {
    x: clampNum(v.x, 0, 1000, fallback?.x ?? 0),
    y: clampNum(v.y, 0, 707, fallback?.y ?? 0),
    width: clampNum(v.width, 20, 500, fallback?.width ?? 100),
  };
}

/** Fills missing/invalid keys so older or partial configs always render. */
export function normalizeConfig(raw: unknown): CustomTemplateConfig {
  const base = cloneDefaultConfig();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const fields = (r.fields ?? {}) as Record<string, unknown>;
  (Object.keys(base.fields) as CustomFieldKey[]).forEach((key) => {
    const f = fields[key];
    const d = base.fields[key]!;
    if (!f || typeof f !== "object") return;
    const v = f as Record<string, unknown>;
    base.fields[key] = {
      x: clampNum(v.x, 0, 1000, d.x),
      y: clampNum(v.y, 0, 707, d.y),
      size: clampNum(v.size, 6, 200, d.size),
      font: normalizeFont(v.font, d.font),
      color: normalizeColor(v.color, d.color),
      align: normalizeAlign(v.align),
      bold: typeof v.bold === "boolean" ? v.bold : d.bold,
      italic: typeof v.italic === "boolean" ? v.italic : d.italic,
      uppercase: typeof v.uppercase === "boolean" ? v.uppercase : d.uppercase,
      spacing: clampNum(v.spacing, -5, 24, d.spacing ?? 0),
    };
  });
  const ornaments = (r.ornaments ?? {}) as Record<string, unknown>;
  return {
    fields: base.fields,
    logo: normalizePlaced(r.logo, base.logo),
    qr: normalizePlaced(r.qr, base.qr),
    seal: normalizePlaced(r.seal, base.seal),
    ink: normalizeColor(r.ink, INK),
    accent: normalizeColor(r.accent, ACCENT),
    ornaments: {
      border: typeof ornaments.border === "boolean" ? ornaments.border : true,
      corners: typeof ornaments.corners === "boolean" ? ornaments.corners : false,
    },
    showTexture: typeof r.showTexture === "boolean" ? r.showTexture : true,
  };
}

export const LIBRARY_KEY_STORAGE = "gencert-library-key";
