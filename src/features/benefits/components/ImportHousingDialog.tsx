import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface ImportHousingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ImportHousingDialog({ open, onOpenChange }: ImportHousingDialogProps) {
    const [file, setFile] = useState<File | null>(null);

    const handleImport = () => {
        if (!file) {
            alert("Selecione um arquivo para importar.");
            return;
        }

        // Placeholder for future import logic
        alert("Importação em massa de benefícios de moradia será implementada em breve. Arquivo: " + file.name);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                        Importar Planilha de Benefícios
                    </DialogTitle>
                    <DialogDescription>
                        Faça o upload de uma planilha (Excel ou CSV) para atualizar os benefícios de moradia dos trabalhadores em lote.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="file-upload">Arquivo Excel/CSV</Label>
                        <Input
                            id="file-upload"
                            type="file"
                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                            A planilha deve conter pelo menos as colunas: Código do Trabalhador, Valor Mensal, Data de Início.
                        </p>
                    </div>

                    <div className="bg-blue-50/50 p-4 rounded-md border text-sm text-blue-800 dark:bg-blue-900/10 dark:text-blue-200">
                        <strong>Nota:</strong> Esta funcionalidade está sendo preparada para o futuro. Atualmente ela atua como um demonstrativo do fluxo.
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleImport} disabled={!file}>
                        <Upload className="h-4 w-4 mr-2" />
                        Validar e Importar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
