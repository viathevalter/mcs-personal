import { useState } from 'react';
import { useEmpresasList } from '../hooks/useEmpresas';
import { EmpresaSheet } from './EmpresaSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Building, Edit } from 'lucide-react';
import type { Empresa } from '../types';

export function EmpresasDataTable() {
  const { data: empresas = [], isLoading } = useEmpresasList();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);

  const filteredEmpresas = empresas.filter(e => 
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setSheetOpen(true);
  };

  const handleNew = () => {
    setSelectedEmpresa(null);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleNew}>
          <Building className="h-4 w-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-500">Código</th>
              <th className="px-4 py-3 font-medium text-slate-500">Nome da Empresa</th>
              <th className="px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Carregando...</td></tr>
            ) : filteredEmpresas.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhuma empresa encontrada.</td></tr>
            ) : (
              filteredEmpresas.map((empresa) => (
                <tr key={empresa.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{empresa.codigo}</td>
                  <td className="px-4 py-3 text-slate-700 font-semibold">{empresa.nome}</td>
                  <td className="px-4 py-3">
                    {empresa.is_active 
                        ? <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Ativa</Badge>
                        : <Badge variant="secondary">Inativa</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(empresa)}>
                      <Edit className="h-4 w-4 text-slate-500" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EmpresaSheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
        empresa={selectedEmpresa} 
      />
    </div>
  );
}
