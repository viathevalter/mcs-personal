import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { DownloadCloud, Loader2, CheckSquare, Square, FileSpreadsheet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface ExportColumnDef {
  id: string;
  label: string;
  defaultSelected?: boolean;
}

interface ExportLogisticaDialogProps {
  trigger: React.ReactNode;
  title: string;
  filenamePrefix: string;
  availableColumns: ExportColumnDef[];
  getData: () => Promise<Record<string, any>[]> | Record<string, any>[];
  totalRecordsCount?: number;
}

export const ExportLogisticaDialog: React.FC<ExportLogisticaDialogProps> = ({
  trigger,
  title,
  filenamePrefix,
  availableColumns,
  getData,
  totalRecordsCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // Inicializar colunas selecionadas
  useEffect(() => {
    const defaults = availableColumns.filter(c => c.defaultSelected !== false).map(c => c.id);
    setSelectedColumns(defaults);
  }, [availableColumns]);

  const handleToggleColumn = (colId: string) => {
    setSelectedColumns(prev =>
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedColumns(availableColumns.map(c => c.id));
    } else {
      setSelectedColumns([]);
    }
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      alert('Seleccione al menos una columna para exportar.');
      return;
    }

    setIsExporting(true);
    try {
      const rawData = await getData();

      if (!rawData || rawData.length === 0) {
        alert('No hay datos disponibles para exportar con los filtros actuales.');
        setIsExporting(false);
        return;
      }

      // Mapear linhas para os dados das colunas selecionadas mantendo a ordem
      const rows = rawData.map(item => {
        const rowData: Record<string, any> = {};
        availableColumns.forEach(col => {
          if (selectedColumns.includes(col.id)) {
            const val = item[col.id];
            rowData[col.label] = val !== undefined && val !== null ? val : '';
          }
        });
        return rowData;
      });

      // Gerar planilha Excel
      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Auto-dimensionar largura das colunas
      const colWidths = availableColumns
        .filter(col => selectedColumns.includes(col.id))
        .map(col => {
          const maxContentLen = Math.max(
            col.label.length,
            ...rows.map(r => String(r[col.label] || '').length)
          );
          return { wch: Math.min(Math.max(maxContentLen + 3, 12), 45) };
        });
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
      const fullFilename = `${filenamePrefix}_${timestamp}.xlsx`;

      XLSX.writeFile(workbook, fullFilename);
      setIsOpen(false);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Ocurrió un error al generar la exportación. Intente nuevamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight">{title}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Seleccione las columnas que desea enviar a la planilla Excel (.xlsx).
                {totalRecordsCount !== undefined && (
                  <span className="font-semibold text-slate-700 dark:text-slate-200 ml-1">
                    ({totalRecordsCount} registros coincidentes)
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-300">
              {selectedColumns.length} de {availableColumns.length} columnas seleccionadas
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectAll(true)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <CheckSquare size={13} />
                Seleccionar Todas
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                type="button"
                onClick={() => handleSelectAll(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline flex items-center gap-1"
              >
                <Square size={13} />
                Limpiar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {availableColumns.map(col => {
              const isChecked = selectedColumns.includes(col.id);
              return (
                <div
                  key={col.id}
                  onClick={() => handleToggleColumn(col.id)}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none text-xs ${
                    isChecked
                      ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800 font-bold text-emerald-950 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-medium'
                  }`}
                >
                  <Checkbox
                    id={`col-${col.id}`}
                    checked={isChecked}
                    onCheckedChange={() => handleToggleColumn(col.id)}
                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <Label
                    htmlFor={`col-${col.id}`}
                    className="cursor-pointer text-xs truncate leading-tight pointer-events-none"
                  >
                    {col.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="rounded-xl text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleExport}
            disabled={isExporting || selectedColumns.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Generando Excel (.xlsx)...
              </>
            ) : (
              <>
                <DownloadCloud size={15} />
                Exportar Excel (.xlsx)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
