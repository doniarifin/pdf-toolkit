import { useState } from "react";
import MergeUploadArea from "../components/MergeUploadArea";
import Button from "../components/Button";
import PDFMergeList, { type PDFItem } from "../components/PDFMergeList";
import { mergePDFs } from "../features/pdf/mergeService";

const Merge = () => {
  const [pdfs, setPdfs] = useState<PDFItem[]>([]);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = (files: File[]) => {
    const newFiles = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
    }));
    setPdfs((prev) => [...prev, ...newFiles]);
    setError(null);
  };

  const handleMerge = async () => {
    setError(null);
    setMerging(true);
    try {
      await mergePDFs(pdfs);
    } catch (err) {
      console.error(err);
      setError(
        "This file is password-protected or unreadable and cannot be merged.",
      );
    } finally {
      setMerging(false);
    }
  };

  const isEmpty = pdfs.length === 0;
  const canMerge = pdfs.length >= 2 && !merging;

  return (
    <div>
      <div className="mb-6 text-center pt-6">
        <h1 className="text-3xl font-bold">Merge PDF</h1>
        <p className="text-gray-500 mt-2">
          Combine multiple PDFs into one. Drag to reorder.
        </p>
      </div>

      <div className="p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upload + List */}
          <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow">
            <h2 className="text-xl font-semibold mb-4">Upload PDFs</h2>
            <MergeUploadArea onChange={handleUpload} />
            <PDFMergeList items={pdfs} setItems={setPdfs} />
          </div>

          {/* RIGHT: Actions */}
          <div className="relative">
            <div
              className={`
                bg-white p-6 rounded-2xl shadow transition
                ${isEmpty ? "opacity-50 pointer-events-none" : ""}
              `}
            >
              <h2 className="text-xl font-semibold mb-4">Merge</h2>

              <p className="text-sm text-gray-600 mb-4">
                Files will be combined in the order shown on the left. Drag
                cards to reorder.
              </p>

              <p className="text-sm text-gray-500 mb-6">
                {pdfs.length} file{pdfs.length === 1 ? "" : "s"} selected
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                variant="secondary"
                className="w-full cursor-pointer"
                loading={merging}
                disabled={!canMerge}
                onClick={handleMerge}
              >
                Merge &amp; Download
              </Button>
            </div>

            {/* overlay */}
            {isEmpty && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
                <p className="text-sm text-gray-600 font-medium">
                  Please choose files first
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Merge;