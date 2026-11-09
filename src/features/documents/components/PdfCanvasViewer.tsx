import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Loader2, FileText, ExternalLink } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfCanvasViewerProps {
  pdfBlob?: Blob | null;
  pdfUrl?: string | null;
  className?: string;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  pdfBlob,
  pdfUrl,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    if (pdfBlob) {
      url = URL.createObjectURL(pdfBlob);
      setObjectUrl(url);
    } else if (pdfUrl) {
      setObjectUrl(pdfUrl);
    } else {
      setObjectUrl(null);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [pdfBlob, pdfUrl]);

  useEffect(() => {
    let cancelled = false;

    async function renderPdf() {
      if (!pdfBlob && !pdfUrl) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let data: ArrayBuffer;
        if (pdfBlob) {
          data = await pdfBlob.arrayBuffer();
        } else {
          const resp = await fetch(pdfUrl!);
          if (!resp.ok) throw new Error('Falha ao carregar arquivo PDF');
          data = await resp.arrayBuffer();
        }

        if (cancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        setNumPages(pdf.numPages);

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const scale = 1.65;
          const viewport = page.getViewport({ scale });

          const pageWrapper = document.createElement('div');
          pageWrapper.className =
            'bg-white shadow-md rounded-lg border border-slate-200 overflow-hidden mb-5 mx-auto max-w-full';
          pageWrapper.style.width = `${Math.min(viewport.width / 1.15, 820)}px`;

          const pageHeader = document.createElement('div');
          pageHeader.className =
            'bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500 border-b border-slate-200 flex items-center justify-between';
          pageHeader.innerHTML = `<span>Página ${pageNum} de ${pdf.numPages}</span><span>Modelo Oficial SEPE</span>`;
          pageWrapper.appendChild(pageHeader);

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';

          pageWrapper.appendChild(canvas);
          container.appendChild(pageWrapper);

          if (context) {
            await page.render({
              canvasContext: context,
              viewport,
              canvas,
            } as any).promise;
          }
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Erro ao renderizar PDF via Canvas:', err);
        if (!cancelled) {
          setError(err.message || 'Erro ao renderizar PDF.');
          setLoading(false);
        }
      }
    }

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfBlob, pdfUrl]);

  return (
    <div className={`w-full ${className}`}>
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-sm font-medium">Renderizando páginas del contrato oficial PDF...</span>
        </div>
      )}

      {error && objectUrl && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center space-y-3">
          <p className="text-xs text-slate-500">Visualización directa del PDF:</p>
          <iframe
            src={objectUrl}
            title="Contrato PDF"
            className="w-full h-[650px] rounded border border-slate-200"
          />
          <a
            href={objectUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Abrir PDF en Nueva Pestaña
          </a>
        </div>
      )}

      {!error && numPages > 0 && objectUrl && (
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" /> {numPages} páginas cargadas
          </span>
          <a
            href={objectUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Abrir PDF Original
          </a>
        </div>
      )}

      <div ref={containerRef} className="w-full flex flex-col items-center" />
    </div>
  );
};
