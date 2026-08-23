export type FrameId =
  | "classic"
  | "modern"
  | "botanical"
  | "corners"
  | "banner"
  | "minimal"
  | "duotone"
  | "stripe"
  | "ornate"
  | "arch";

export interface Palette {
  id: string;
  name: string;
  bg: string;
  panel: string;
  ink: string;
  soft: string;
  accent: string;
}

export interface CertTemplate {
  id: string;
  name: string;
  frame: FrameId;
  palette: Palette;
}

const FRAMES: { id: FrameId; name: string }[] = [
  { id: "classic", name: "Classic" },
  { id: "modern", name: "Modern" },
  { id: "botanical", name: "Rounded" },
  { id: "corners", name: "Corner Marks" },
  { id: "banner", name: "Banner" },
  { id: "minimal", name: "Minimal" },
  { id: "duotone", name: "Duotone" },
  { id: "stripe", name: "Stripe" },
  { id: "ornate", name: "Ornate" },
  { id: "arch", name: "Arch" },
];

const PALETTES: Palette[] = [
  {
    id: "gold",
    name: "Gold",
    bg: "#fffdf6",
    panel: "#ffffff",
    ink: "#2c2415",
    soft: "#6b6250",
    accent: "#b8912f",
  },
  {
    id: "navy",
    name: "Navy",
    bg: "#f7f9fc",
    panel: "#ffffff",
    ink: "#16233d",
    soft: "#5a6781",
    accent: "#1f4e9c",
  },
  {
    id: "sage",
    name: "Sage",
    bg: "#f6faf5",
    panel: "#ffffff",
    ink: "#1f3326",
    soft: "#5c7263",
    accent: "#4f7359",
  },
  {
    id: "burgundy",
    name: "Burgundy",
    bg: "#fdf7f7",
    panel: "#ffffff",
    ink: "#33161c",
    soft: "#7a5a60",
    accent: "#8c2f3e",
  },
  {
    id: "graphite",
    name: "Graphite",
    bg: "#f6f6f7",
    panel: "#ffffff",
    ink: "#1d1f24",
    soft: "#63666e",
    accent: "#3d4149",
  },
  {
    id: "teal",
    name: "Teal",
    bg: "#f4fbfb",
    panel: "#ffffff",
    ink: "#0f2b2c",
    soft: "#4f7273",
    accent: "#127475",
  },
];

export const TEMPLATES: CertTemplate[] = FRAMES.flatMap((frame) =>
  PALETTES.map((palette) => ({
    id: `${frame.id}-${palette.id}`,
    name: `${frame.name} ${palette.name}`,
    frame: frame.id,
    palette,
  })),
);

export const FRAME_FILTERS = FRAMES;
export const PALETTE_FILTERS = PALETTES;

export interface CertContent {
  organization: string;
  title: string;
  intro: string;
  reason: string;
  date: string;
  signatoryName: string;
  signatoryRole: string;
}

export const DEFAULT_CONTENT: CertContent = {
  organization: "Northwind Academy",
  title: "Certificate of Completion",
  intro: "This is to certify that",
  reason: "has successfully completed the Advanced Web Development seminar",
  date: new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
  signatoryName: "Dr. Amara Hale",
  signatoryRole: "Program Director",
};

export function parseNames(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "certificate"
  );
}
