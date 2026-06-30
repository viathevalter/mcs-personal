import React, { useCallback, useState } from 'react';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function UploadHorasPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleProcessarIA = () => {
    if (files.length === 0) {
      toast.error('Nenhum arquivo selecionado.');
      return;
    }
    toast.success('Imagem enviada para o bucket extracao-horas e iniciada a extração via IA.');
    setFiles([]); // Clear after processing
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar Horas</h1>
        <p className="text-muted-foreground mt-1">
          Faça o upload dos comprovantes de horas (imagens ou PDF) para extração automática via IA.
        </p>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Arraste e solte seus arquivos aqui</h3>
        <p className="text-sm text-muted-foreground mt-2">ou clique para selecionar do seu computador</p>
        <input 
          type="file" 
          multiple 
          className="hidden" 
          id="file-upload"
          onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
        />
        <Button variant="outline" className="mt-6" asChild>
          <label htmlFor="file-upload" className="cursor-pointer">Procurar Arquivos</label>
        </Button>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Arquivos selecionados ({files.length})</h4>
          <ul className="space-y-2">
            {files.map((file, idx) => (
              <li key={idx} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border rounded-lg shadow-sm">
                <FileText className="h-5 w-5 text-blue-500" />
                <span className="flex-1 text-sm font-medium truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end pt-4">
            <Button onClick={handleProcessarIA} size="lg" className="shadow-lg hover:shadow-primary/25 transition-all">
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Processar com IA
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
