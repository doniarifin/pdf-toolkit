import { PDFDocument } from "pdf-lib";

export type PDFFileItem = { id: string; file: File };

export const mergePDFs = async (items: PDFFileItem[]): Promise<void> => {
  const merged = await PDFDocument.create();

  for (const { file } of items) {
    const bytes = await file.arrayBuffer();
    const src = await PDFDocument.load(bytes, { ignoreEncryption: false });
    const indices = src.getPageIndices();
    const copied = await merged.copyPages(src, indices);
    copied.forEach((p) => merged.addPage(p));
  }

  const out = await merged.save();
  const bytes = new Uint8Array(out);

  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  const baseName = items[0]?.file.name.replace(/\.[^/.]+$/, "") ?? "merged";
  a.download = `${baseName}-merged.pdf`;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
};