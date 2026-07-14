import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

interface Props {
  file: File;
  className?: string;
}

const TARGET_WIDTH = 200;

const PDFThumbnail = ({ file, className }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let destroyed = false;
    let docTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
    let renderTask: pdfjsLib.RenderTask | null = null;

    const cleanupDoc = () => {
      if (destroyed) return;
      destroyed = true;
      docTask?.destroy().catch(() => {});
    };

    const render = async () => {
      try {
        const data = await file.arrayBuffer();
        if (cancelled) return;

        docTask = pdfjsLib.getDocument({ data });
        const pdf = await docTask.promise;
        if (cancelled) {
          cleanupDoc();
          return;
        }

        const page = await pdf.getPage(1);
        if (cancelled) {
          cleanupDoc();
          return;
        }

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = TARGET_WIDTH / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) {
          cleanupDoc();
          return;
        }

        const context = canvas.getContext("2d");
        if (!context) {
          cleanupDoc();
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        renderTask = page.render({ canvasContext: context, canvas, viewport });
        await renderTask.promise;

        cleanupDoc();
      } catch {
        if (!cancelled) setError(true);
      }
    };

    render();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      cleanupDoc();
    };
  }, [file]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-md ${className ?? ""}`}
      >
        <FontAwesomeIcon
          icon={faFilePdf}
          size="2x"
          className="text-red-500"
        />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`rounded-md bg-white ${className ?? ""}`}
    />
  );
};

export default PDFThumbnail;
