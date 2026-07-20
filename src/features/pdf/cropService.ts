import { PDFDocument } from "pdf-lib";

/** Crop region in PDF user-space points (bottom-left origin). */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/**
 * Crop a PDF page-by-page. `crops` is keyed by 1-based page number; pages
 * without an entry are left untouched. Each region is set as both the
 * MediaBox and CropBox so the visible page size actually shrinks.
 */
export const cropPdf = async (
  file: File,
  crops: Map<number, CropRect>,
): Promise<void> => {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });

  pdf.getPages().forEach((page, index) => {
    const rect = crops.get(index + 1);
    if (!rect) return;
    page.setCropBox(rect.x, rect.y, rect.width, rect.height);
    page.setMediaBox(rect.x, rect.y, rect.width, rect.height);
  });

  const out = await pdf.save();
  const blob = new Blob([new Uint8Array(out)], { type: "application/pdf" });
  const baseName = file.name.replace(/\.[^/.]+$/, "") || "cropped";
  triggerDownload(blob, `${baseName}-cropped.pdf`);
};
