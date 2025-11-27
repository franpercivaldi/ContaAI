import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Space, Slider } from 'antd';

type Props = {
  open: boolean;
  blobUrl: string | null;
  fileName?: string;
  onClose: () => void;
};

export default function PdfPreviewModal({ open, blobUrl, fileName, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfLib, setPdfLib] = useState<any>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.2);

  useEffect(() => {
    let cancelled = false;
    if (!blobUrl) return;
    // dynamic import to keep bundle small and avoid SSR issues
    (async () => {
      let pdfjs: any = null;
      try {
        // try local package first
        // @ts-ignore - dynamic import of pdfjs-dist may not have types available in this project
        // prevent Vite from statically resolving this import at build time
        // @vite-ignore
        pdfjs = await import(/* @vite-ignore */ 'pdfjs-dist/legacy/build/pdf.mjs');
      } catch (err) {
        // fallback to CDN if Vite cannot resolve the package path in dev
        // this imports directly in the browser from unpkg
        // @ts-ignore
        // @vite-ignore
        pdfjs = await import(/* @vite-ignore */ 'https://unpkg.com/pdfjs-dist@5.4.394/legacy/build/pdf.mjs');
      }

      // set worker src to the distributed worker (CDN fallback)
      try {
        // @ts-ignore
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.394/legacy/build/pdf.worker.min.mjs';
      } catch (e) {}

      if (cancelled) return;
      setPdfLib(pdfjs);

      // fetch and load
      const resp = await fetch(blobUrl);
      const arrayBuffer = await resp.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      if (cancelled) return;
      setPdfDoc(doc);
      setPageCount(doc.numPages);
      setPageNum(1);
    })();

    return () => {
      cancelled = true;
      setPdfDoc(null);
      setPdfLib(null);
    };
  }, [blobUrl]);

  useEffect(() => {
    let mounted = true;
    const renderPage = async () => {
      if (!pdfDoc || !pdfLib || !canvasRef.current) return;
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      if (!context) return;
      const renderContext = {
        canvasContext: context,
        viewport
      };
      const renderTask = page.render(renderContext);
      await renderTask.promise;
      if (!mounted) return;
    };
    renderPage().catch(() => {});
    return () => { mounted = false; };
  }, [pdfDoc, pdfLib, pageNum, scale]);

  const prev = () => setPageNum((p) => Math.max(1, p - 1));
  const next = () => setPageNum((p) => Math.min(pageCount, p + 1));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="90%"
      centered
      closable={true}
      className="pdf-modal"
      bodyStyle={{ padding: 0, height: '100vh', display: 'flex', flexDirection: 'column', borderRadius: 12 }}
      maskStyle={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div className="pdf-modal-header">
        <div className="pdf-modal-header-left">
          <div className="pdf-modal-title">{fileName || 'Preview'}</div>
          <div className="pdf-modal-sub">{pageNum}/{pageCount}</div>
        </div>

        <div className="pdf-modal-controls">
          <Space>
            <Button size="small" onClick={prev} disabled={pageNum <= 1}>Prev</Button>
            <Button size="small" onClick={next} disabled={pageNum >= pageCount}>Next</Button>
            <div style={{ width: 160 }}>
              <Slider min={0.6} max={2.4} step={0.1} value={scale} onChange={(v) => setScale(v)}/>
            </div>
            <Button size="small" onClick={() => {
              if (!blobUrl) return;
              const a = document.createElement('a');
              a.href = blobUrl;
              a.download = fileName || 'document.pdf';
              document.body.appendChild(a);
              a.click();
              a.remove();
            }}>Descargar</Button>
            <Button size="small" onClick={onClose}>Cerrar</Button>
          </Space>
        </div>
      </div>

      <div className="pdf-modal-body">
        {blobUrl ? (
          <canvas ref={canvasRef} className="pdf-modal-canvas" />
        ) : (
          <div className="pdf-modal-loading">Cargando...</div>
        )}
      </div>
    </Modal>
  );
}
