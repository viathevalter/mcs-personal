import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobFunction } from '../types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Archive, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface JobFunctionsDataTableProps {
  data: JobFunction[];
  onArchive: (id: string) => void;
}

export function JobFunctionsDataTable({ data, onArchive }: JobFunctionsDataTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Sorting State
  const [sortField, setSortField] = useState<'code' | 'name' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'code' | 'name') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = (a[sortField] || '').toString().toLowerCase().trim();
    const bVal = (b[sortField] || '').toString().toLowerCase().trim();
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100">{t('masterData.status.active', { defaultValue: 'Ativa' })}</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">{t('masterData.status.inactive', { defaultValue: 'Inativa' })}</Badge>;
      case 'archived':
        return <Badge variant="destructive" className="dark:bg-red-950/40 dark:text-red-400">{t('masterData.status.archived', { defaultValue: 'Arquivada' })}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRiskBadge = (risk?: string | null) => {
    switch (risk) {
      case 'low': return <Badge variant="outline" className="text-green-600 border-green-200 dark:text-green-400 dark:border-green-900/30 dark:bg-green-950/10">{t('masterData.jobFunctions.risk_low', { defaultValue: 'Baixo' })}</Badge>;
      case 'medium': return <Badge variant="outline" className="text-yellow-600 border-yellow-200 dark:text-yellow-400 dark:border-yellow-900/30 dark:bg-yellow-950/10">{t('masterData.jobFunctions.risk_medium', { defaultValue: 'Médio' })}</Badge>;
      case 'high': return <Badge variant="outline" className="text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-900/30 dark:bg-orange-950/10">{t('masterData.jobFunctions.risk_high', { defaultValue: 'Alto' })}</Badge>;
      case 'critical': return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-900/30 dark:bg-red-950/20">{t('masterData.jobFunctions.risk_critical', { defaultValue: 'Crítico' })}</Badge>;
      default: return <span className="text-muted-foreground text-sm">-</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-xl bg-white dark:bg-slate-900/50 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-auto max-h-[calc(100vh-220px)] scrollbar-thin">
          <Table className="relative">
            <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-20 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.1)] dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05)]">
              <TableRow className="hover:bg-transparent dark:hover:bg-transparent border-b dark:border-slate-800">
                <TableHead className="sticky left-0 top-0 bg-slate-50 dark:bg-slate-900 z-30 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors select-none border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400" onClick={() => handleSort('code')}>
                  <div className="flex items-center gap-1">
                    {t('masterData.fields.code', { defaultValue: 'Código' })}
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'code' ? 'text-orange-500 scale-110' : 'text-slate-400 dark:text-slate-500 opacity-55'}`} />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors select-none text-slate-500 dark:text-slate-400" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    {t('masterData.fields.name', { defaultValue: 'Nome' })}
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'name' ? 'text-orange-500 scale-110' : 'text-slate-400 dark:text-slate-500 opacity-55'}`} />
                  </div>
                </TableHead>
                <TableHead className="text-slate-500 dark:text-slate-400">{t('masterData.fields.risk', { defaultValue: 'Risco' })}</TableHead>
                <TableHead className="text-slate-500 dark:text-slate-400">{t('masterData.fields.status', { defaultValue: 'Status' })}</TableHead>
                <TableHead className="text-slate-500 dark:text-slate-400">{t('masterData.fields.updated_at', { defaultValue: 'Atualizado em' })}</TableHead>
                <TableHead className="text-right text-slate-500 dark:text-slate-400">{t('masterData.fields.actions', { defaultValue: 'Ações' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y dark:divide-slate-800/50">
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('masterData.jobFunctions.no_functions', { defaultValue: 'Nenhuma função encontrada.' })}
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((job) => (
                  <TableRow 
                    key={job.id} 
                    className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors duration-150 active:bg-slate-100 dark:active:bg-slate-800/70 border-b dark:border-slate-800/50"
                    onClick={() => navigate(`/master-data/job-functions/${job.id}`)}
                  >
                    <TableCell className="sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50/80 dark:group-hover:bg-slate-800/40 group-active:bg-slate-100 dark:group-active:bg-slate-800/70 transition-colors z-10 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">{job.code}</TableCell>
                    <TableCell className="dark:text-slate-200 font-medium">
                      <div>{job.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {job.description}
                      </div>
                    </TableCell>
                    <TableCell>{getRiskBadge(job.risk_level)}</TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400">
                      {job.updated_at ? format(new Date(job.updated_at), 'dd/MM/yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => navigate(`/master-data/job-functions/${job.id}`)}
                        title={t('common.edit', { defaultValue: 'Editar' })}
                      >
                        <Edit className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </Button>
                      {job.status !== 'archived' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => {
                            if (confirm(t('masterData.jobFunctions.confirm_archive', { defaultValue: 'Deseja arquivar esta função? Ela deixará de aparecer em novos pedidos.' }))) {
                              if(job.id) onArchive(job.id);
                            }
                          }}
                          title={t('common.archive', { defaultValue: 'Arquivar' })}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
