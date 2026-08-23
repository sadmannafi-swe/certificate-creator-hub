export type TemplateId = "classic" | "modern" | "botanical";

export interface CertTemplate {
  id: TemplateId;
  name: string;
  blurb: string;
  /** css class applied to the certificate surface */
  surface: string;
  accent: string;
}

export const TEMPLATES: CertTemplate[] = [
  {
    id: "classic",
    name: "Classic Gold",
    blurb: "Formal double border with gilded flourishes.",
    surface: "cert-classic",
    accent: "var(--gold)",
  },
  {
    id: "modern",
    name: "Modern Slate",
    blurb: "Clean typographic layout with a bold side bar.",
    surface: "cert-modern",
    accent: "var(--ink)",
  },
  {
    id: "botanical",
    name: "Botanical Sage",
    blurb: "Soft rounded frame with a calm herbal palette.",
    surface: "cert-botanical",
    accent: "var(--sage)",
  },
];

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
