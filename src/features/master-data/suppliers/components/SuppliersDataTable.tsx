import { useState } from 'react';
import { useSuppliers } from '../hooks/useSuppliers';
import { SupplierSheet } from './SupplierSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Truck, Edit } from 'lucide-react';
import type { Supplier } from '../types';

export function SuppliersDataTable() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const filteredSuppliers = suppliers.filter(s => 
    s.trade_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.legal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.tax_id.includes(searchTerm)
  );

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSheetOpen(true);
  };

  const handleNew = () => {
    setSelectedSupplier(null);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou NIF..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleNew}>
          <Truck className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-500">Nome Fantasia</th>
              <th className="px-4 py-3 font-medium text-slate-500">Razão Social</th>
              <th className="px-4 py-3 font-medium text-slate-500">NIF</th>
              <th className="px-4 py-3 font-medium text-slate-500">Categoria</th>
              <th className="px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Carregando...</td></tr>
            ) : filteredSuppliers.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum fornecedor encontrado.</td></tr>
            ) : (
              filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{supplier.trade_name}</td>
                  <td className="px-4 py-3 text-slate-500">{supplier.legal_name}</td>
                  <td className="px-4 py-3 text-slate-500">{supplier.tax_id}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {supplier.supplier_type || '--'}
                  </td>
                  <td className="px-4 py-3">
                    {supplier.status === 'active' && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Ativo</Badge>}
                    {supplier.status === 'inactive' && <Badge variant="secondary">Inativo</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)}>
                      <Edit className="h-4 w-4 text-slate-500" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SupplierSheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
        supplier={selectedSupplier} 
      />
    </div>
  );
}
