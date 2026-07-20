import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { CropRect } from "../features/pdf/cropService";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

interface Props {
  file: File;
  pageNumber: number;
  crop: CropRect | null;
  onCropChange: (rect: CropRect | null) => void;
  onPageInfo?: (widthPt: number, heightPt: number) => void;
  scale?: number;
}

type HandleId = "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r";

type DragState =
  | { mode: "draw"; startX: number; startY: number }
  | { mode: "move"; startPdfX: number; startPdfY: number; origX: number; origY: number }
  | {
      mode: "resize";
      
      startXLeft: number;
      startXRight: number;
      startYLow: number;
      startYHigh: number;
      move: { xLeft: boolean; xRight: boolean; yLow: boolean; yHigh: boolean };
    }
  | null;

const RENDER_SCALE = 2;
const MIN_SIZE = 1;

const HANDLE_CURSOR: Record<HandleId, string> = {
  tl: "cursor-nwse-resize",
  tr: "cursor-nesw-resize",
  bl: "cursor-nesw-resize",
  br: "cursor-nwse-resize",
  l: "cursor-ew-resize",
  r: "cursor-ew-resize",
  t: "cursor-ns-resize",
  b: "cursor-ns-resize",
};

const CropCanvas = ({
  file,
  pageNumber,
  crop,
  onCropChange,
  onPageInfo,
  scale = RENDER_SCALE,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<pdfjsLib.PageViewport | null>(null);
  const dragRef = useRef<DragState>(null);

  const [draft, setDraft] = useState<CropRect | null>(null);
  const effective = draft ?? crop;
  const effectiveRef = useRef(effective);
  useEffect(() => {
    effectiveRef.current = effective;
  });

  const onPageInfoRef = useRef(onPageInfo);
  useEffect(() => {
    onPageInfoRef.current = onPageInfo;
  });

  const [disp, setDisp] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const computeDisp = useCallback(() => {
    const canvas = canvasRef.current;
    const vp = viewportRef.current;
    if (!canvas || !vp || !effectiveRef.current) {
      setDisp(null);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const [blx, bly] = vp.convertToViewportPoint(
      effectiveRef.current.x,
      effectiveRef.current.y,
    );
    const [trx, tryY] = vp.convertToViewportPoint(
      effectiveRef.current.x + effectiveRef.current.width,
      effectiveRef.current.y + effectiveRef.current.height,
    );
    setDisp({
      left: (Math.min(blx, trx) / canvas.width) * rect.width,
      top: (Math.min(bly, tryY) / canvas.height) * rect.height,
      width: (Math.abs(trx - blx) / canvas.width) * rect.width,
      height: (Math.abs(tryY - bly) / canvas.height) * rect.height,
    });
  }, []);

  // Render the page whenever the file or page changes.
  useEffect(() => {
    let cancelled = false;
    let docTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
    let renderTask: pdfjsLib.RenderTask | null = null;

    const render = async () => {
      try {
        setLoading(true);
        setError(false);
        const data = await file.arrayBuffer();
        if (cancelled) return;
        docTask = pdfjsLib.getDocument({ data });
        const pdf = await docTask.promise;
        if (cancelled) {
          docTask.destroy().catch(() => {});
          return;
        }
        const page = await pdf.getPage(pageNumber);
        if (cancelled) {
          docTask.destroy().catch(() => {});
          return;
        }
        const viewport = page.getViewport({ scale, rotation: 0 });
        viewportRef.current = viewport;
        const canvas = canvasRef.current;
        if (!canvas) {
          docTask.destroy().catch(() => {});
          return;
        }
        const context = canvas.getContext("2d");
        if (!context) {
          docTask.destroy().catch(() => {});
          return;
        }
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        renderTask = page.render({ canvasContext: context, canvas, viewport });
        await renderTask.promise;
        if (cancelled) return;
        onPageInfoRef.current?.(viewport.width / scale, viewport.height / scale);
        setLoading(false);
        computeDisp();
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      } finally {
        if (!cancelled) docTask?.destroy().catch(() => {});
      }
    };

    render();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      docTask?.destroy().catch(() => {});
    };
  }, [file, pageNumber, scale, computeDisp]);

  // Recompute overlay positions on resize.
  useEffect(() => {
    window.addEventListener("resize", computeDisp);
    return () => window.removeEventListener("resize", computeDisp);
  }, [computeDisp]);

  useEffect(() => {
    computeDisp();
  }, [effective, loading, computeDisp]);

  const toPdf = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const rx = (clientX - rect.left) * (canvas.width / rect.width);
    const ry = (clientY - rect.top) * (canvas.height / rect.height);
    const [px, py] = viewportRef.current!.convertToPdfPoint(rx, ry);
    return { px, py };
  }, []);

  const handlePos = (
    handle: HandleId,
    d: NonNullable<typeof disp>,
  ): { x: number; y: number } => {
    const left = d.left;
    const right = d.left + d.width;
    const top = d.top;
    const bottom = d.top + d.height;
    switch (handle) {
      case "tl":
        return { x: left, y: top };
      case "tr":
        return { x: right, y: top };
      case "bl":
        return { x: left, y: bottom };
      case "br":
        return { x: right, y: bottom };
      case "t":
        return { x: (left + right) / 2, y: top };
      case "b":
        return { x: (left + right) / 2, y: bottom };
      case "l":
        return { x: left, y: (top + bottom) / 2 };
      case "r":
        return { x: right, y: (top + bottom) / 2 };
    }
  };

  const pageBounds = () => {
    const vp = viewportRef.current;
    if (!vp) return { pw: Number.POSITIVE_INFINITY, ph: Number.POSITIVE_INFINITY };
    return { pw: vp.width / scale, ph: vp.height / scale };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!viewportRef.current) return;
    const { px, py } = toPdf(e.clientX, e.clientY);
    const { pw, ph } = pageBounds();
    const startX = Math.max(0, Math.min(px, pw));
    const startY = Math.max(0, Math.min(py, ph));

    if (effective) {
      const inside =
        px >= effective.x &&
        px <= effective.x + effective.width &&
        py >= effective.y &&
        py <= effective.y + effective.height;
      if (inside) {
        dragRef.current = {
          mode: "move",
          startPdfX: px,
          startPdfY: py,
          origX: effective.x,
          origY: effective.y,
        };
        setDraft({ ...effective });
      } else {
        dragRef.current = { mode: "draw", startX, startY };
        setDraft({ x: startX, y: startY, width: 0, height: 0 });
      }
    } else {
      dragRef.current = { mode: "draw", startX, startY };
      setDraft({ x: startX, y: startY, width: 0, height: 0 });
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !viewportRef.current) return;
    const { px, py } = toPdf(e.clientX, e.clientY);
    const { pw, ph } = pageBounds();

    if (d.mode === "draw") {
      const cx = Math.max(0, Math.min(px, pw));
      const cy = Math.max(0, Math.min(py, ph));
      setDraft({
        x: Math.min(d.startX, cx),
        y: Math.min(d.startY, cy),
        width: Math.abs(cx - d.startX),
        height: Math.abs(cy - d.startY),
      });
    } else if (d.mode === "move") {
      const cur = effectiveRef.current;
      if (cur) {
        const nx = Math.max(
          0,
          Math.min(d.origX + (px - d.startPdfX), pw - cur.width),
        );
        const ny = Math.max(
          0,
          Math.min(d.origY + (py - d.startPdfY), ph - cur.height),
        );
        setDraft({ ...cur, x: nx, y: ny });
      }
    } else if (d.mode === "resize") {
      const cx = Math.max(0, Math.min(px, pw));
      const cy = Math.max(0, Math.min(py, ph));
      
      const xLeft = d.move.xLeft ? Math.min(cx, d.startXRight) : d.startXLeft;
      const xRight = d.move.xRight ? Math.max(cx, d.startXLeft) : d.startXRight;
      const yLow = d.move.yLow ? Math.min(cy, d.startYHigh) : d.startYLow;
      const yHigh = d.move.yHigh ? Math.max(cy, d.startYLow) : d.startYHigh;
      setDraft({
        x: Math.min(xLeft, xRight),
        y: Math.min(yLow, yHigh),
        width: Math.abs(xRight - xLeft),
        height: Math.abs(yHigh - yLow),
      });
    }
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    const result = draft;
    setDraft(null);
    if (d.mode === "draw" && result && (result.width < MIN_SIZE || result.height < MIN_SIZE)) {
      onCropChange(null);
    } else if (result) {
      onCropChange(result);
    }
  };

  const onHandleDown = (handle: HandleId) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!effective) return;
    
    const move = {
      xLeft: handle === "tl" || handle === "bl" || handle === "l",
      xRight: handle === "tr" || handle === "br" || handle === "r",
      yLow: handle === "bl" || handle === "br" || handle === "b",
      yHigh: handle === "tl" || handle === "tr" || handle === "t",
    };
    dragRef.current = {
      mode: "resize",
      startXLeft: effective.x,
      startXRight: effective.x + effective.width,
      startYLow: effective.y,
      startYHigh: effective.y + effective.height,
      move,
    };
    setDraft({ ...effective });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  return (
    <div
      className="relative w-full select-none touch-none cursor-crosshair"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-auto rounded-md bg-white shadow"
      />

      {disp && (
        <>
          {/* Dark mask over the area outside the crop region */}
          <div
            className="absolute top-0 left-0 right-0 bg-black/40 pointer-events-none"
            style={{ height: disp.top }}
          />
          <div
            className="absolute left-0 right-0 bg-black/40 pointer-events-none"
            style={{ top: disp.top + disp.height, bottom: 0 }}
          />
          <div
            className="absolute bg-black/40 pointer-events-none"
            style={{
              top: disp.top,
              left: 0,
              width: disp.left,
              height: disp.height,
            }}
          />
          <div
            className="absolute bg-black/40 pointer-events-none"
            style={{
              top: disp.top,
              left: disp.left + disp.width,
              right: 0,
              height: disp.height,
            }}
          />

          {/* Crop region — drag the body to move it */}
          <div
            className="absolute border-2 border-yellow-400 cursor-move"
            style={{
              left: disp.left,
              top: disp.top,
              width: disp.width,
              height: disp.height,
            }}
          />

          {/* Resize handles */}
          {(["tl", "tr", "bl", "br", "t", "b", "l", "r"] as HandleId[]).map(
            (c) => {
              const pos = handlePos(c, disp);
              return (
                <div
                  key={c}
                  onPointerDown={onHandleDown(c)}
                  className={`absolute w-3 h-3 bg-yellow-400 border border-white rounded-sm -translate-x-1/2 -translate-y-1/2 shadow ${HANDLE_CURSOR[c]}`}
                  style={{ left: pos.x, top: pos.y }}
                />
              );
            },
          )}
        </>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-md text-sm text-gray-500">
          Loading page…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500">
          Failed to render page
        </div>
      )}
    </div>
  );
};

export default CropCanvas;
