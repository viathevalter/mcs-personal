import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, Calendar, Building, User, Tag, Euro, FileText, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WorkerDiscount } from '../types';
import { EditDiscountDialog } from './EditDiscountDialog';
import { useDeleteDiscount } from '../hooks/useDiscountMutations';
import { normalizeEmpresaName } from '@/shared/utils/empresaNormalizer';

interface ViewDiscountDetailsModalProps {
    discount: WorkerDiscount | null;
    isOpen: boolean;
    onClose: () => void;
    empresas?: any[];
}

export function ViewDiscountDetailsModal({ discount, isOpen, onClose, empresas }: ViewDiscountDetailsModalProps) {
    const { mutate: deleteDiscount } = useDeleteDiscount();

    if (!discount) return null;

    const discountEmpresaObj = empresas?.find(e => String(e.id) === String(discount.empresa_id));
    const empresaName = normalizeEmpresaName(discountEmpresaObj?.trade_name || discountEmpresaObj?.nome || discount.workers?.contratante);

    const formattedDate = (() => {
        if (!discount.reference_date) return '-';
        try {
            return format(parseISO(discount.reference_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        } catch {
            return discount.reference_date;
        }
    })();

    const handleDelete = () => {
        if (confirm('Tem certeza que deseja excluir este desconto?')) {
            deleteDiscount(discount.id);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-[650px] bg-white dark:bg-slate-900 border rounded-2xl shadow-xl">
                <DialogHeader>
                    <div className="flex items-center justify-between pb-2 border-b">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-xl">
                                <Eye className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    Detalhes do Desconto
                                </DialogTitle>
                                <p className="text-xs text-muted-foreground">
                                    Visualização completa das informações do lançamento
                                </p>
                            </div>
                        </div>
                        <Badge
                            variant="outline"
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                discount.status === 'Ativo'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : discount.status === 'Concluído'
                                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                        >
                            {discount.status}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Header Card with Value & Worker */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                                {discount.workers?.nome?.charAt(0) || 'W'}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{discount.workers?.nome || '-'}</h3>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                                    <span>Código: {discount.workers?.cod_colab || '-'}</span>
                                    {discount.workers?.status_trabajador && (
                                        <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px]">
                                            {discount.workers.status_trabajador}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border shadow-sm flex flex-col items-end">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor do Desconto</span>
                            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">€ {Number(discount.amount || 0).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-3.5 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border space-y-1">
                            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                                <Building className="w-3.5 h-3.5 text-indigo-500" /> Empresa (Contratante)
                            </span>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{empresaName || '-'}</p>
                        </div>

                        <div className="p-3.5 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border space-y-1">
                            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                                <User className="w-3.5 h-3.5 text-blue-500" /> Cliente Alocado
                            </span>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{discount.workers?.cliente_nombre || '-'}</p>
                        </div>

                        <div className="p-3.5 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border space-y-1">
                            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                                <Tag className="w-3.5 h-3.5 text-emerald-500" /> Categoria do Desconto
                            </span>
                            <Badge variant="secondary" className="font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 mt-0.5">
                                {discount.category}
                            </Badge>
                        </div>

                        <div className="p-3.5 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border space-y-1">
                            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-amber-500" /> Competência / Data
                            </span>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{formattedDate}</p>
                        </div>
                    </div>

                    {/* Recorrência */}
                    <div className="flex items-center gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900 text-xs">
                        <CheckCircle2 className={`w-4 h-4 ${discount.is_recurring ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                            {discount.is_recurring ? 'Desconto Recorrente (Aplica-se nos próximos meses)' : 'Desconto Único do Mês (Sem recorrência)'}
                        </span>
                    </div>

                    {/* Rich Styled Description Box */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-indigo-500" /> Observações & Justificativas do Desconto
                            </label>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-indigo-50/30 to-slate-50 dark:from-slate-800/60 dark:to-slate-900/60 border border-indigo-100 dark:border-indigo-900/50 rounded-xl min-h-[90px] text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {discount.description || <span className="italic text-muted-foreground">Nenhuma observação ou justificativa registrada para este desconto.</span>}
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t pt-3">
                    <div className="flex items-center justify-between w-full">
                        <Button variant="destructive" size="sm" onClick={handleDelete} className="text-xs">
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Excluir Desconto
                        </Button>
                        <div className="flex items-center gap-2">
                            <EditDiscountDialog
                                discount={discount}
                                trigger={
                                    <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs">
                                        <Edit className="w-3.5 h-3.5 mr-1.5" /> Editar Desconto
                                    </Button>
                                }
                            />
                            <Button size="sm" variant="secondary" onClick={onClose} className="text-xs">
                                Fechar
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
