import React from 'react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const EmpresaSelector: React.FC = () => {
    const { empresas, selectedEmpresaId, setSelectedEmpresaId, isLoading } = useEmpresa();
    const location = useLocation();

    // Trava a alteração da empresa se estiver visualizando/editando um registro específico (ID UUID na URL)
    const isLocked = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(location.pathname);

    if (isLoading || !empresas || empresas.length === 0) {
        return null;
    }

    const selectedEmpresa = empresas.find(e => e.id === selectedEmpresaId);

    // Se houver apenas uma empresa cadastrada ou se a rota estiver travada (somente leitura)
    if (empresas.length === 1 || isLocked) {
        return (
            <div 
                className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-350 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                title={isLocked ? "Esta empresa está vinculada ao registro atual e não pode ser alterada nesta tela." : undefined}
            >
                <Building2 size={16} className="text-slate-500 shrink-0" />
                <span className="truncate max-w-[150px]">
                    {selectedEmpresa?.trade_name || selectedEmpresa?.legal_name || selectedEmpresa?.nome || 'Mastercorp'}
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Select value={selectedEmpresaId || ''} onValueChange={setSelectedEmpresaId}>
                <SelectTrigger className="w-[200px] h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-blue-500">
                    <div className="flex items-center gap-2 truncate">
                        <Building2 size={16} className="text-slate-500 shrink-0" />
                        <span className="truncate">
                            <SelectValue placeholder="Selecione a empresa" />
                        </span>
                    </div>
                </SelectTrigger>
                <SelectContent>
                    {empresas.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                            {empresa.trade_name || empresa.legal_name || empresa.nome || 'Empresa S/N'}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};
