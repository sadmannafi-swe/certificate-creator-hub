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
  | "arch"
  | "deco"
  | "laurel"
  | "guilloche"
  | "foil"
  | "marble"
  | "engraved"
  | "ribbon"
  | "medallion"
  | "geometric"
  | "wave"
  | "vintage"
  | "diploma"
  | "monogram"
  | "gradient";

export interface Palette {
  id: string;
  name: string;
  bg: string;
  panel: string;
  ink: string;
  soft: string;
  accent: string;
  foil1: string;
  foil2: string;
  foil3: string;
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
  { id: "deco", name: "Art Deco" },
  { id: "laurel", name: "Laurel" },
  { id: "guilloche", name: "Guilloche" },
  { id: "foil", name: "Foil" },
  { id: "marble", name: "Marble" },
  { id: "engraved", name: "Engraved" },
  { id: "ribbon", name: "Ribbon" },
  { id: "medallion", name: "Medallion" },
  { id: "geometric", name: "Geometric" },
  { id: "wave", name: "Wave" },
  { id: "vintage", name: "Vintage" },
  { id: "diploma", name: "Diploma" },
  { id: "monogram", name: "Monogram" },
  { id: "gradient", name: "Gradient" },
];

const PALETTES: Palette[] = [
  {
    id: "gold",
    foil1: "#8a6a1c",
    foil2: "#e7c86a",
    foil3: "#fff3c9",
    name: "Gold",
    bg: "#fffdf6",
    panel: "#ffffff",
    ink: "#2c2415",
    soft: "#6b6250",
    accent: "#b8912f",
  },
  {
    id: "navy",
    foil1: "#12315f",
    foil2: "#5b8fd6",
    foil3: "#dbe9ff",
    name: "Navy",
    bg: "#f7f9fc",
    panel: "#ffffff",
    ink: "#16233d",
    soft: "#5a6781",
    accent: "#1f4e9c",
  },
  {
    id: "sage",
    foil1: "#2f5238",
    foil2: "#87b18f",
    foil3: "#e2f1e4",
    name: "Sage",
    bg: "#f6faf5",
    panel: "#ffffff",
    ink: "#1f3326",
    soft: "#5c7263",
    accent: "#4f7359",
  },
  {
    id: "burgundy",
    foil1: "#6a1f2b",
    foil2: "#c1697a",
    foil3: "#ffdfe4",
    name: "Burgundy",
    bg: "#fdf7f7",
    panel: "#ffffff",
    ink: "#33161c",
    soft: "#7a5a60",
    accent: "#8c2f3e",
  },
  {
    id: "graphite",
    foil1: "#2a2d33",
    foil2: "#8d939e",
    foil3: "#eceef2",
    name: "Graphite",
    bg: "#f6f6f7",
    panel: "#ffffff",
    ink: "#1d1f24",
    soft: "#63666e",
    accent: "#3d4149",
  },
  {
    id: "teal",
    foil1: "#0b4f50",
    foil2: "#4fb0b1",
    foil3: "#dcf5f5",
    name: "Teal",
    bg: "#f4fbfb",
    panel: "#ffffff",
    ink: "#0f2b2c",
    soft: "#4f7273",
    accent: "#127475",
  },
  {
    id: "plum",
    foil1: "#4a2160",
    foil2: "#a276c4",
    foil3: "#f0e2fa",
    name: "Plum",
    bg: "#faf6fd",
    panel: "#ffffff",
    ink: "#2b1637",
    soft: "#6c5877",
    accent: "#6b3a92",
  },
  {
    id: "copper",
    foil1: "#7a3d19",
    foil2: "#d08a56",
    foil3: "#ffe6d1",
    name: "Copper",
    bg: "#fdf8f4",
    panel: "#ffffff",
    ink: "#32200f",
    soft: "#7a6455",
    accent: "#a45a26",
  },
  {
    id: "midnight",
    foil1: "#1b1f3b",
    foil2: "#7f86c9",
    foil3: "#e3e6ff",
    name: "Midnight",
    bg: "#f5f6fb",
    panel: "#ffffff",
    ink: "#141733",
    soft: "#585d80",
    accent: "#2f3670",
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
