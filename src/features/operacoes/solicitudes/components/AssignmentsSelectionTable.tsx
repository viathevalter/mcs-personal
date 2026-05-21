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
    <div className="border rounded-md overflow-hidden bg-white dark:bg-slate-950">
      <Table>
        <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
          <TableRow>
            <TableHead className="w-12 text-center">
              <Checkbox 
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={onToggleAll}
                aria-label="Selecionar todos"
              />
            </TableHead>
            <TableHead>Trabalhador</TableHead>
            <TableHead>Função</TableHead>
            <TableHead>Pedido / Obra</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Tipo de Alocação</TableHead>
            <TableHead>Cadeia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((assignment) => {
            const isSelected = selectedIds.includes(assignment.id);
            const workerName = assignment.worker?.nome || 'N/A';
            const clientSiteName = assignment.client_site?.name || 'N/A';
            const jobFunctionName = assignment.job_function?.name || assignment.job_function_name_snapshot || 'N/A';
            const isReplacement = assignment.assignment_type === 'replacement';
            
            return (
              <TableRow 
                key={assignment.id} 
                className={isSelected ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}
                onClick={() => onToggleSelection(assignment.id)}
              >
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelection(assignment.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{workerName}</div>
                  <div className="text-xs text-muted-foreground">ID: {assignment.worker?.cod_colab || 'N/A'}</div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{jobFunctionName}</span>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{assignment.pedido?.codigo || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">{clientSiteName}</div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{assignment.start_date ? format(new Date(assignment.start_date), 'dd/MM/yyyy') : '-'}</span>
                </TableCell>
                <TableCell>
                  {isReplacement ? (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                      Substituto
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500">
                      Original
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {assignment.replacement_of_assignment_id ? (
                    <div className="text-xs text-muted-foreground">
                      Substituiu ID final ...{assignment.replacement_of_assignment_id.slice(-6)}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
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
