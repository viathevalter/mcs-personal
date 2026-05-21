import React from 'react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export const EmpresaSelector: React.FC = () => {
    const { empresas, selectedEmpresaId, setSelectedEmpresaId, isLoading } = useEmpresa();

    if (isLoading || !empresas || empresas.length <= 1) {
        // Se só tiver uma empresa, ou estiver carregando, não precisa do seletor (ou pode mostrar só o nome)
        // Mas para manter a consistência, podemos retornar null ou um badge
        if (!isLoading && empresas.length === 1) {
            return (
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                    <Building2 size={16} className="text-slate-500" />
                    {empresas[0].trade_name || empresas[0].legal_name || empresas[0].nome || 'Mastercorp'}
                </div>
            );
        }
        return null;
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
