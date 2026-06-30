import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

interface AssignmentsSelectionTableProps {
  assignments: any[];
  selectedIds: string[];
  onToggleSelection: (assignmentId: string) => void;
  onToggleAll: () => void;
}

export const AssignmentsSelectionTable: React.FC<AssignmentsSelectionTableProps> = ({
  assignments,
  selectedIds,
  onToggleSelection,
  onToggleAll
}) => {
  if (!assignments || assignments.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-md bg-slate-50 dark:bg-slate-900/50">
        Nenhum trabalhador ativo encontrado para os filtros selecionados.
      </div>
    );
  }

  const allSelected = assignments.length > 0 && selectedIds.length === assignments.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < assignments.length;

  return (
    <div className="w-full h-full">
      <Table>
        <TableHeader className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
          <TableRow>
            <TableHead className="w-10 text-center bg-slate-50/95 dark:bg-slate-900/95 p-1 md:p-2">
              <Checkbox 
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={onToggleAll}
                aria-label="Selecionar todos"
              />
            </TableHead>
            <TableHead className="whitespace-nowrap px-1.5 py-2 text-xs md:text-sm">Trabalhador</TableHead>
            <TableHead className="px-1.5 py-2 text-xs md:text-sm">Função</TableHead>
            <TableHead className="whitespace-nowrap px-1.5 py-2 text-xs md:text-sm">Pedido</TableHead>
            <TableHead className="px-1.5 py-2 text-xs md:text-sm">Cliente</TableHead>
            <TableHead className="px-1.5 py-2 text-xs md:text-sm">Obra Atual (Local)</TableHead>
            <TableHead className="whitespace-nowrap px-1.5 py-2 text-xs md:text-sm">Início</TableHead>
            <TableHead className="whitespace-nowrap px-1.5 py-2 text-xs md:text-sm">Tipo</TableHead>
            <TableHead className="px-1.5 py-2 text-xs md:text-sm">Cadeia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((assignment) => {
            const isSelected = selectedIds.includes(assignment.id);
            const workerName = assignment.worker?.nome || 'N/A';
            const clientSiteName = assignment.client_site?.name || 'N/A';
            const clientName = assignment.client?.trade_name || assignment.client?.legal_name || 'N/A';
            const jobFunctionName = assignment.job_function?.name || assignment.job_function_name_snapshot || 'N/A';
            const isReplacement = assignment.assignment_type === 'replacement';
            const replacedWorkerName = assignment.replaced_assignment?.worker?.nome;
            
            return (
              <TableRow 
                key={assignment.id} 
                className={isSelected ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}
                onClick={() => onToggleSelection(assignment.id)}
              >
                <TableCell className="text-center p-1 md:p-2" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelection(assignment.id)}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap px-1.5 py-1.5 text-xs md:text-sm">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">{workerName}</div>
                  <div className="text-[10px] text-muted-foreground">ID: {assignment.worker?.cod_colab || 'N/A'}</div>
                </TableCell>
                <TableCell className="px-1.5 py-1.5 text-xs md:text-sm leading-tight">
                  <span>{jobFunctionName}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs px-1.5 py-1.5">
                  {assignment.pedido?.codigo || 'N/A'}
                </TableCell>
                <TableCell className="px-1.5 py-1.5 text-xs md:text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight">
                  {clientName}
                </TableCell>
                <TableCell className="px-1.5 py-1.5 text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-tight">
                  {clientSiteName}
                </TableCell>
                <TableCell className="whitespace-nowrap px-1.5 py-1.5 text-xs md:text-sm">
                  {assignment.start_date ? format(new Date(assignment.start_date), 'dd/MM/yyyy') : '-'}
                </TableCell>
                <TableCell className="whitespace-nowrap px-1.5 py-1.5">
                  {isReplacement ? (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 px-1.5 py-0 text-[10px]">
                      Substituto
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500 px-1.5 py-0 text-[10px]">
                      Original
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="px-1.5 py-1.5 text-xs text-muted-foreground leading-tight">
                  {assignment.replacement_of_assignment_id ? (
                    <div title={`ID da Alocação: ${assignment.replacement_of_assignment_id}`}>
                      {replacedWorkerName ? `Substituiu ${replacedWorkerName}` : `Substituiu ID final ...${assignment.replacement_of_assignment_id.slice(-6)}`}
                    </div>
                  ) : (
                    <span className="text-slate-450">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
