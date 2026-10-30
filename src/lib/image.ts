/** Client-side image helpers for logos and uploaded certificate designs. */

export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function downscaleImage(file: File, maxWidth: number): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
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

/** Flattens onto white and re-encodes so a JPEG never turns transparency black. */
function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.86): string {
  const flat = document.createElement("canvas");
  flat.width = canvas.width;
  flat.height = canvas.height;
  const ctx = flat.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, flat.width, flat.height);
  ctx.drawImage(canvas, 0, 0);
  return flat.toDataURL("image/jpeg", quality);
}

async function renderPdfFirstPage(dataUrl: string, targetWidth = 1600): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const response = await fetch(dataUrl);
  const buffer = await response.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(3, targetWidth / base.width);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  const out = canvasToJpeg(canvas, 0.88);
  await doc.destroy();
  return out;
}

/**
 * Prepares an uploaded certificate design for storage: rasterizes PDF page 1,
 * downscales to a max width and re-encodes large images as JPEG to keep the
 * saved template small enough for the database row.
 */
export async function prepareBackground(file: File): Promise<string> {
  const MAX_CHARS = 3_800_000;

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const dataUrl = await fileToDataUrl(file);
    return renderPdfFirstPage(dataUrl);
  }

  const dataUrl = await fileToDataUrl(file);
  if (file.type === "image/svg+xml") {
    return dataUrl.length <= MAX_CHARS ? dataUrl : canvasToJpeg(await rasterize(dataUrl));
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const scale = Math.min(1, 1600 / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (file.type === "image/png" && dataUrl.length <= 700_000) {
    // Small PNG keeps its crisp edges and any flat colors exactly.
    return canvas.toDataURL("image/png");
  }
  const jpeg = canvasToJpeg(canvas);
  return jpeg.length <= MAX_CHARS ? jpeg : canvas.toDataURL("image/webp", 0.8);
}

async function rasterize(dataUrl: string): Promise<HTMLCanvasElement> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  return canvas;
}
