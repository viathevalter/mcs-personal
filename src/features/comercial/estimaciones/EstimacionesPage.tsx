import { useState, useEffect } from 'react';
import { useEstimaciones } from './hooks/useEstimaciones';
import { EstimacionKpiCards } from './components/EstimacionKpiCards';
import { EstimacionesTable } from './components/EstimacionesTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FilterX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmpresaSelector } from '@/features/operacoes/components/EmpresaSelector';
import { useTranslation } from 'react-i18next';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export function EstimacionesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedEmpresaId, setSelectedEmpresaId, empresas = [] } = useEmpresa();
  const [filters, setFilters] = useState({
    status: 'all',
    solicitud_type: 'all',
    search: '',
    empresa_id: selectedEmpresaId || 'all'
  });

  const [isConfirmCompanyOpen, setIsConfirmCompanyOpen] = useState(false);
  const [confirmEmpresaId, setConfirmEmpresaId] = useState('');

  const handleNewEstimacionClick = () => {
    console.log('handleNewEstimacionClick foi chamado. Empresas:', empresas);
    if (empresas.length <= 1) {
      console.log('Ignorando modal porque o número de empresas é:', empresas.length);
      navigate('/comercial/estimaciones/nova');
    } else {
      console.log('Abrindo modal. Empresa selecionada padrão:', selectedEmpresaId || empresas[0].id);
      setConfirmEmpresaId(selectedEmpresaId || empresas[0].id);
      setIsConfirmCompanyOpen(true);
    }
  };

  // Keep local filter in sync if global company selector changes
  useEffect(() => {
    if (selectedEmpresaId) {
      setFilters(prev => ({ ...prev, empresa_id: selectedEmpresaId }));
    }
  }, [selectedEmpresaId]);

  const { data: allEstimaciones = [], isLoading } = useEstimaciones({
    solicitud_type: filters.solicitud_type,
    search: filters.search,
    empresa_id: filters.empresa_id
  });

  const filteredEstimaciones = allEstimaciones.filter(est => {
    if (filters.status === 'all') return true;
    if (filters.status === 'rejected') {
      return ['rejected', 'expired'].includes(est.status);
    }
    return est.status === filters.status;
  });

  const clearFilters = () => {
    setFilters({ status: 'all', solicitud_type: 'all', search: '', empresa_id: selectedEmpresaId || 'all' });
  };

  return (
    <div className="flex flex-col space-y-6 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('comercial.list.title')}</h1>
            <p className="text-muted-foreground">
              {t('comercial.list.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <EmpresaSelector />
            <Button onClick={handleNewEstimacionClick}>
              <Plus className="mr-2 h-4 w-4" />
              {t('comercial.list.btnNew')}
            </Button>
          </div>
        </div>

        <EstimacionKpiCards 
          estimaciones={allEstimaciones} 
          selectedStatus={filters.status}
          onStatusSelect={(status) => setFilters(prev => ({ ...prev, status }))}
        />

        <div className="flex flex-col sm:flex-row gap-4 items-end bg-card p-4 rounded-md border">
          <div className="space-y-1.5 flex-1">
            <label className="text-sm font-medium text-muted-foreground">{t('comercial.list.searchLabel')}</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('comercial.list.searchPlaceholder')}
                className="pl-9"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-1.5 w-full sm:w-[200px]">
            <label className="text-sm font-medium text-muted-foreground">{t('comercial.table.empresa')}</label>
            <Select 
              value={filters.empresa_id} 
              onValueChange={(val) => setFilters({ ...filters, empresa_id: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('comercial.table.selectEmpresa')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('comercial.table.allCompanies')}</SelectItem>
                {empresas.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.trade_name || emp.legal_name || emp.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5 w-full sm:w-[200px]">
            <label className="text-sm font-medium text-muted-foreground">{t('comercial.list.statusLabel')}</label>
            <Select 
              value={filters.status} 
              onValueChange={(val) => setFilters({ ...filters, status: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('comercial.list.allStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('comercial.status.all')}</SelectItem>
                <SelectItem value="draft">{t('comercial.status.draft')}</SelectItem>
                <SelectItem value="review">{t('comercial.status.review')}</SelectItem>
                <SelectItem value="sent">{t('comercial.status.sent')}</SelectItem>
                <SelectItem value="signed">{t('comercial.status.signed')}</SelectItem>
                <SelectItem value="approved">{t('comercial.status.approved')}</SelectItem>
                <SelectItem value="rejected">{t('comercial.status.rejected')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 w-full sm:w-[200px]">
            <label className="text-sm font-medium text-muted-foreground">{t('comercial.list.orderTypeLabel')}</label>
            <Select 
              value={filters.solicitud_type} 
              onValueChange={(val) => setFilters({ ...filters, solicitud_type: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('comercial.list.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('comercial.requestTypes.all')}</SelectItem>
                <SelectItem value="new_order">{t('comercial.requestTypes.new_order')}</SelectItem>
                <SelectItem value="replacement">{t('comercial.requestTypes.replacement')}</SelectItem>
                <SelectItem value="relocation">{t('comercial.requestTypes.relocation')}</SelectItem>
                <SelectItem value="scope_change">{t('comercial.requestTypes.scope_change')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="ghost" className="px-3" onClick={clearFilters} title={t('comercial.list.clearFilters')}>
            <FilterX className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <EstimacionesTable estimaciones={filteredEstimaciones} isLoading={isLoading} />

        <Dialog open={isConfirmCompanyOpen} onOpenChange={setIsConfirmCompanyOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t('comercial.confirmCompany.title', 'Confirmar Empresa')}</DialogTitle>
              <DialogDescription>
                {t('comercial.confirmCompany.description', 'Selecione a empresa para a qual deseja criar esta nova estimativa comercial.')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="confirm-company-select">
                  {t('comercial.confirmCompany.label', 'Empresa')}
                </Label>
                <Select
                  value={confirmEmpresaId}
                  onValueChange={setConfirmEmpresaId}
                >
                  <SelectTrigger id="confirm-company-select" className="w-full">
                    <SelectValue placeholder={t('comercial.confirmCompany.placeholder', 'Selecione uma empresa')} />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.trade_name || emp.legal_name || emp.nome || 'Empresa S/N'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex space-x-2 justify-end">
              <Button variant="outline" onClick={() => setIsConfirmCompanyOpen(false)}>
                {t('comercial.confirmCompany.btnCancel', 'Cancelar')}
              </Button>
              <Button
                onClick={() => {
                  if (confirmEmpresaId) {
                    setSelectedEmpresaId(confirmEmpresaId);
                  }
                  setIsConfirmCompanyOpen(false);
                  navigate('/comercial/estimaciones/nova');
                }}
              >
                {t('comercial.confirmCompany.btnContinue', 'Começar')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
