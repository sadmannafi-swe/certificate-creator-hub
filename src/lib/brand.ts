export interface Brand {
  logo: string | null;
  useCustomAccent: boolean;
  accent: string;
  ink: string;
  useCustomInk: boolean;
  headingFont: string;
  bodyFont: string;
}

export const HEADING_FONTS = [
  { id: "'Cormorant Garamond', serif", name: "Cormorant (serif)" },
  { id: "'Playfair Display', serif", name: "Playfair Display" },
  { id: "'Cinzel', serif", name: "Cinzel (engraved)" },
  { id: "'Libre Baskerville', serif", name: "Libre Baskerville" },
  { id: "'Marcellus', serif", name: "Marcellus" },
  { id: "'Great Vibes', cursive", name: "Great Vibes (script)" },
  { id: "'Montserrat', sans-serif", name: "Montserrat" },
  { id: "'Oswald', sans-serif", name: "Oswald" },
];

export const BODY_FONTS = [
  { id: "'Karla', sans-serif", name: "Karla" },
  { id: "'Montserrat', sans-serif", name: "Montserrat" },
  { id: "'Lato', sans-serif", name: "Lato" },
  { id: "'Lora', serif", name: "Lora" },
  { id: "'Libre Baskerville', serif", name: "Libre Baskerville" },
  { id: "'Source Sans 3', sans-serif", name: "Source Sans" },
];

export const DEFAULT_BRAND: Brand = {
  logo: null,
  useCustomAccent: false,
  accent: "#b8912f",
  useCustomInk: false,
  ink: "#2c2415",
  headingFont: HEADING_FONTS[0]!.id,
  bodyFont: BODY_FONTS[0]!.id,
};

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.padEnd(6, "0").slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

function toHex(rgb: [number, number, number]) {
  return "#" + rgb.map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
}

export function shade(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  if (amount >= 0) {
    return toHex([r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount]);
  }
  const k = 1 + amount;
  return toHex([r * k, g * k, b * k]);
}

/** Derives the metallic foil triple used by seals and borders from one accent color. */
export function foilFromAccent(accent: string) {
  return {
    foil1: shade(accent, -0.4),
    foil2: shade(accent, 0.35),
    foil3: shade(accent, 0.8),
  };
}
