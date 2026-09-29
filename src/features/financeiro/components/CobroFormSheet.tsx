import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Building2,
  Landmark,
  Calendar,
  DollarSign,
  FileText,
  Paperclip,
  Loader2,
  Check,
  ChevronsUpDown,
  Search,
  X,
  ExternalLink,
  Layers,
  Receipt,
  Tag,
  AlertCircle,
  HelpCircle,
  Briefcase
} from 'lucide-react';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';

import type { ContasReceber, Cliente, FinanceiroCategoria, Obra, Banco } from '../types';
import { fetchClientes, fetchCategorias, fetchObras, fetchModernEmpresas, fetchBancos } from '../data/loader';
import { getDepartments } from '../../admin/api/adminApi';
import type { Department } from '../../admin/api/adminApi';

interface CobroFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ContasReceber>) => Promise<void>;
  initialData?: ContasReceber | null;
}

// Subcomponent: Searchable Combobox for selecting client
interface ClientComboboxProps {
  clientes: Cliente[];
  selectedCodCliente: string;
  onSelect: (cliente: Cliente | null) => void;
  disabled?: boolean;
}

const ClientCombobox: React.FC<ClientComboboxProps> = ({
  clientes,
  selectedCodCliente,
  onSelect,
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearch('');
    }
  }, [open]);

  const selectedClient = useMemo(() => {
    if (!selectedCodCliente) return null;
    return clientes.find(c => c.CodCliente === selectedCodCliente) || null;
  }, [clientes, selectedCodCliente]);

  const filteredClientes = useMemo(() => {
    if (!search.trim()) {
      return clientes.slice(0, 50);
    }
    const q = search.toLowerCase().trim();
    return clientes.filter(c => {
      const nomeComercial = (c.NombreComercial || '').toLowerCase();
      const razonSocial = (c.RazonSocial || '').toLowerCase();
      const codigo = (c.CodCliente || '').toLowerCase();
      const cif = (c.cif || '').toLowerCase();
      const municipio = (c.Municipio || '').toLowerCase();
      const provincia = (c.Provincia || '').toLowerCase();

      return (
        nomeComercial.includes(q) ||
        razonSocial.includes(q) ||
        codigo.includes(q) ||
        cif.includes(q) ||
        municipio.includes(q) ||
        provincia.includes(q)
      );
    }).slice(0, 60);
  }, [clientes, search]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="cliente-select" className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Cliente</span>
          <span className="text-rose-500 font-bold">*</span>
        </Label>
        {selectedClient && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Limpar seleção
          </button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id="cliente-select"
            type="button"
            disabled={disabled}
            className={`w-full min-h-[44px] px-3.5 py-2 flex items-center justify-between gap-2 rounded-xl border text-left text-sm transition-all shadow-xs ${
              open 
                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-slate-900' 
                : selectedClient
                  ? 'border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/30 dark:bg-emerald-950/20 hover:border-emerald-400'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden flex-1">
              <div className={`p-1.5 rounded-lg shrink-0 ${
                selectedClient 
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                <Building2 className="w-4 h-4" />
              </div>

              {selectedClient ? (
                <div className="truncate flex-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {selectedClient.NombreComercial || selectedClient.RazonSocial}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                    <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">
                      Cód: {selectedClient.CodCliente}
                    </span>
                    {selectedClient.RazonSocial && selectedClient.RazonSocial !== selectedClient.NombreComercial && (
                      <span>• {selectedClient.RazonSocial}</span>
                    )}
                    {(selectedClient.Municipio || selectedClient.Provincia) && (
                      <span>• {[selectedClient.Municipio, selectedClient.Provincia].filter(Boolean).join(', ')}</span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 font-normal">
                  Buscar cliente por nome, código ou CIF...
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-slate-400 shrink-0">
              <ChevronsUpDown className="w-4 h-4 opacity-60" />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent 
          align="start" 
          className="w-[var(--radix-popover-trigger-width)] min-w-[340px] max-w-[560px] p-0 shadow-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Search bar inside popover */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite o nome, código ou CIF..."
              className="w-full bg-transparent text-sm focus:outline-none placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
            />
            {search && (
              <button 
                type="button" 
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick stats / count */}
          <div className="px-3 py-1.5 bg-slate-100/60 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>
              {search.trim() ? (
                <>Encontrados <strong>{filteredClientes.length}</strong> clientes</>
              ) : (
                <>Mostrando <strong>{filteredClientes.length}</strong> de <strong>{clientes.length}</strong> clientes</>
              )}
            </span>
            <span className="text-[10px] text-slate-400">Pressione para selecionar</span>
          </div>

          {/* Client List */}
          <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
            {filteredClientes.length === 0 ? (
              <div className="py-8 text-center px-4 space-y-1">
                <Search className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Nenhum cliente encontrado</p>
                <p className="text-xs text-slate-400">Verifique o termo digitado ou tente outro código/nome.</p>
              </div>
            ) : (
              filteredClientes.map((c) => {
                const isSelected = selectedCodCliente === c.CodCliente;
                return (
                  <button
                    key={c.CodCliente}
                    type="button"
                    onClick={() => {
                      onSelect(c);
                      setOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-lg text-left flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                          {c.NombreComercial || c.RazonSocial}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                          {c.CodCliente}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                        {c.RazonSocial && c.RazonSocial !== c.NombreComercial && (
                          <span className="truncate">{c.RazonSocial}</span>
                        )}
                        {(c.Municipio || c.Provincia) && (
                          <span>• {[c.Municipio, c.Provincia].filter(Boolean).join(', ')}</span>
                        )}
                        {c.cif && (
                          <span className="font-mono text-[11px]">• CIF: {c.cif}</span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="p-1 rounded-full bg-emerald-600 text-white shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Client Card Details */}
      {selectedClient && (
        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl flex items-start justify-between text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-start gap-2.5 overflow-hidden">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg shrink-0 mt-0.5">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                <span className="truncate">{selectedClient.NombreComercial || selectedClient.RazonSocial}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-200/60 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 shrink-0">
                  Cód: {selectedClient.CodCliente}
                </span>
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {selectedClient.RazonSocial && selectedClient.RazonSocial !== selectedClient.NombreComercial && (
                  <span className="truncate">Razão: {selectedClient.RazonSocial}</span>
                )}
                {selectedClient.EmailCobros && (
                  <span>Email: <span className="font-mono text-slate-700 dark:text-slate-300">{selectedClient.EmailCobros}</span></span>
                )}
                {(selectedClient.Municipio || selectedClient.Provincia) && (
                  <span>Local: {[selectedClient.Municipio, selectedClient.Provincia].filter(Boolean).join(', ')}</span>
                )}
                {selectedClient.cif && (
                  <span>CIF: {selectedClient.cif}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export function CobroFormSheet({ isOpen, onClose, onSave, initialData }: CobroFormSheetProps) {
  const [formData, setFormData] = useState<Partial<ContasReceber>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRefs, setIsLoadingRefs] = useState(false);

  // Relational data
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([]);
  const [categorias, setCategorias] = useState<FinanceiroCategoria[]>([]);
  const [departamentos, setDepartamentos] = useState<Department[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  
  // UI State
  const [centroCustoTipo, setCentroCustoTipo] = useState<'departamento' | 'obra'>('departamento');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop() || 'pdf';
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${Date.now()}_${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from('financeiro-anexos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('financeiro-anexos')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      setFormData(prev => ({ ...prev, anexo_url: publicUrl }));
      toast.success('Arquivo anexado com sucesso!');
    } catch (err: any) {
      console.error('Error uploading file:', err);
      toast.error('Erro ao fazer upload do anexo: ' + (err.message || 'Falha na conexão'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRelationalData();

      if (initialData) {
        setFormData({
          ...initialData,
          Data_emissao: initialData.Data_emissao ? new Date(initialData.Data_emissao).toISOString().split('T')[0] as any : '',
          Dt_venc: initialData.Dt_venc ? new Date(initialData.Dt_venc).toISOString().split('T')[0] as any : '',
        });
        if (initialData.obra_id) setCentroCustoTipo('obra');
        else setCentroCustoTipo('departamento');
      } else {
        setFormData({
          Status: 'A vencer',
          Data_emissao: new Date().toISOString().split('T')[0] as any,
          Dt_venc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] as any,
        });
        setCentroCustoTipo('departamento');
      }
    } else {
      setFormData({});
      setIsSaving(false);
    }
  }, [isOpen, initialData]);

  const loadRelationalData = async () => {
    setIsLoadingRefs(true);
    try {
      const [cls, emps, cats, depts, obs, bncs] = await Promise.all([
        fetchClientes(),
        fetchModernEmpresas(),
        fetchCategorias(),
        getDepartments(),
        fetchObras(),
        fetchBancos()
      ]);
      setClientes(cls);
      setEmpresas(emps);
      setCategorias(cats);
      setDepartamentos(depts);
      setObras(obs);
      setBancos(bncs);
    } catch (e) {
      console.error("Failed to load relational data", e);
    } finally {
      setIsLoadingRefs(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.CodCliente) {
      toast.error('Por favor, selecione o cliente.');
      return;
    }

    if (!formData.Empresa) {
      toast.error('Por favor, selecione a empresa faturadora.');
      return;
    }

    if (!formData.Dt_venc) {
      toast.error('Por favor, informe a data de vencimento.');
      return;
    }

    if (formData.Valot_total === undefined || formData.Valot_total === null || isNaN(Number(formData.Valot_total))) {
      toast.error('Por favor, informe o valor total do cobro.');
      return;
    }

    setIsSaving(true);
    try {
      // Clean up centro_custo based on selection
      const dataToSave = { ...formData };
      if (centroCustoTipo === 'departamento') {
         dataToSave.obra_id = null as any;
      } else {
         dataToSave.departamento_id = null as any;
      }

      // If status is 'A vencer' or 'Vencido' and there are no partial payments, keep Saldo_a_pagar synced with Valot_total
      if (!initialData || (!initialData.hist_valor_parcial && initialData.Status !== 'Pago' && initialData.Status !== 'Parcial')) {
        if (dataToSave.Valot_total !== undefined) {
          dataToSave.Saldo_a_pagar = dataToSave.Valot_total;
        }
      }

      await onSave(dataToSave);
      toast.success(initialData ? 'Cobro atualizado com sucesso!' : 'Novo cobro cadastrado com sucesso!');
      onClose();
    } catch (error: any) {
      console.error("Error saving form", error);
      toast.error('Erro ao salvar cobro: ' + (error.message || 'Verifique os dados preenchidos'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-4xl max-h-[92vh] p-0 flex flex-col overflow-hidden sm:rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-emerald-50/20 to-slate-50 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-xs">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {initialData ? 'Editar Cobro' : 'Novo Cobro'}
                </DialogTitle>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {initialData ? 'Edição' : 'Inclusão'}
                </span>
              </div>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Preencha os dados e relacione o recebimento com as entidades e centro de custo do sistema.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Form Body */}
        {isLoadingRefs ? (
          <div className="flex-1 flex flex-col justify-center items-center py-20 space-y-3">
            <Loader2 className="animate-spin h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Carregando clientes e cadastros...</p>
          </div>
        ) : (
          <form id="cobro-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* SECTION 1: Cliente e Empresa */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Identificação do Cliente & Entidade Faturadora</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Searchable Client Selector */}
                <div className="md:col-span-1">
                  <ClientCombobox
                    clientes={clientes}
                    selectedCodCliente={formData.CodCliente || ''}
                    onSelect={(client) => {
                      if (client) {
                        setFormData(prev => ({
                          ...prev,
                          CodCliente: client.CodCliente,
                          Cliente: client.NombreComercial || client.RazonSocial || ''
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          CodCliente: '',
                          Cliente: ''
                        }));
                      }
                    }}
                  />
                </div>

                {/* Empresa Faturadora */}
                <div className="space-y-2">
                  <Label htmlFor="Empresa" className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Empresa Faturadora</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </Label>
                  <Select
                    value={formData.Empresa || ''}
                    onValueChange={(val) => handleSelectChange('Empresa', val)}
                  >
                    <SelectTrigger id="Empresa" className="h-[44px] rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                      <SelectValue placeholder="Selecione a empresa faturadora" />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      {empresas.map(e => (
                        <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Document Number and Billing Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="Num_doc" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Nº Documento / Fatura
                  </Label>
                  <Input
                    id="Num_doc"
                    name="Num_doc"
                    placeholder="Ex: FAT-2026/045"
                    className="h-10 rounded-lg bg-white dark:bg-slate-900"
                    value={formData.Num_doc || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="periodo_fat" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Período Faturamento
                  </Label>
                  <Input
                    id="periodo_fat"
                    name="periodo_fat"
                    placeholder="Ex: Setembro 2026"
                    className="h-10 rounded-lg bg-white dark:bg-slate-900"
                    value={formData.periodo_fat || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                  <Label htmlFor="categoria_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400" /> Categoria de Receita
                  </Label>
                  <Select
                    value={formData.categoria_id || ''}
                    onValueChange={(val) => handleSelectChange('categoria_id', val)}
                  >
                    <SelectTrigger id="categoria_id" className="h-10 rounded-lg bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Categoria (DRE)" />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      {categorias.filter(c => c.ativo && c.tipo?.toLowerCase() === 'receita').map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                      {categorias.filter(c => c.ativo && c.tipo?.toLowerCase() === 'receita').length === 0 && (
                        <SelectItem value="none" disabled>Nenhuma categoria cadastrada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* SECTION 2: Valores & Prazos */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Valores & Prazos de Vencimento</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Valor Total */}
                <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                  <Label htmlFor="Valot_total" className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <span>Valor Total (€)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold font-mono text-sm">€</span>
                    <Input
                      id="Valot_total"
                      name="Valot_total"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-8 h-10 rounded-lg bg-white dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-slate-100"
                      value={formData.Valot_total ?? ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Data Emissão */}
                <div className="space-y-1.5">
                  <Label htmlFor="Data_emissao" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Data Emissão
                  </Label>
                  <Input
                    id="Data_emissao"
                    name="Data_emissao"
                    type="date"
                    className="h-10 rounded-lg bg-white dark:bg-slate-900 font-medium"
                    value={(formData.Data_emissao as any) || ''}
                    onChange={handleChange}
                  />
                </div>

                {/* Data Vencimento */}
                <div className="space-y-1.5">
                  <Label htmlFor="Dt_venc" className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <span>Vencimento</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </Label>
                  <Input
                    id="Dt_venc"
                    name="Dt_venc"
                    type="date"
                    className="h-10 rounded-lg bg-white dark:bg-slate-900 font-medium"
                    value={(formData.Dt_venc as any) || ''}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <Label htmlFor="Status" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Status
                  </Label>
                  <Select
                    value={formData.Status as string || 'A vencer'}
                    onValueChange={(val) => handleSelectChange('Status', val)}
                  >
                    <SelectTrigger id="Status" className="h-10 rounded-lg bg-white dark:bg-slate-900 font-medium">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      <SelectItem value="A vencer">
                        <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                          ● A Vencer
                        </span>
                      </SelectItem>
                      <SelectItem value="Pago">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          ● Pago
                        </span>
                      </SelectItem>
                      <SelectItem value="Vencido">
                        <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                          ● Vencido
                        </span>
                      </SelectItem>
                      <SelectItem value="Cancelado">
                        <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                          ● Cancelado
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* SECTION 3: Destino Bancário & Centro de Custo */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Landmark className="w-4 h-4 text-emerald-600" />
                <span>Destino Financeiro & Centro de Custo</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Banco de Destino */}
                <div className="space-y-2">
                  <Label htmlFor="Banco" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-slate-400" />
                    <span>Banco de Destino (Depósito)</span>
                  </Label>
                  <Select
                    value={formData.Banco || ''}
                    onValueChange={(val) => handleSelectChange('Banco', val)}
                  >
                    <SelectTrigger id="Banco" className="h-10 rounded-lg bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Selecione o banco de recebimento" />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      {bancos.map(b => (
                        <SelectItem key={b.id} value={b.nome_banco}>
                          {b.nome_banco} {b.iban ? `(${b.iban.slice(0, 8)}...${b.iban.slice(-4)})` : ''}
                        </SelectItem>
                      ))}
                      {bancos.length === 0 && <SelectItem value="none" disabled>Nenhum banco cadastrado</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                {/* Centro de Custo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>Centro de Custo</span>
                    </Label>
                    
                    {/* Segmented Control Pill */}
                    <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setCentroCustoTipo('obra')}
                        className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                          centroCustoTipo === 'obra'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Obra
                      </button>
                      <button
                        type="button"
                        onClick={() => setCentroCustoTipo('departamento')}
                        className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                          centroCustoTipo === 'departamento'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Departamento
                      </button>
                    </div>
                  </div>

                  {centroCustoTipo === 'departamento' ? (
                    <Select
                      value={formData.departamento_id || ''}
                      onValueChange={(val) => handleSelectChange('departamento_id', val)}
                    >
                      <SelectTrigger className="h-10 rounded-lg bg-white dark:bg-slate-900">
                        <SelectValue placeholder="Selecione o departamento" />
                      </SelectTrigger>
                      <SelectContent className="z-[70]">
                        {departamentos.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={formData.obra_id || ''}
                      onValueChange={(val) => handleSelectChange('obra_id', val)}
                    >
                      <SelectTrigger className="h-10 rounded-lg bg-white dark:bg-slate-900">
                        <SelectValue placeholder="Selecione a obra" />
                      </SelectTrigger>
                      <SelectContent className="z-[70]">
                        {obras.length === 0 ? (
                          <SelectItem value="none" disabled>Nenhuma obra cadastrada</SelectItem>
                        ) : (
                          obras.map(o => (
                            <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 4: Observações & Anexos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="Obs" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Observações & Condições</span>
                </Label>
                <textarea
                  id="Obs"
                  name="Obs"
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                  placeholder="Insira detalhes adicionais do faturamento, condições de recebimento ou anotações internas..."
                  value={formData.Obs || ''}
                  onChange={handleChange}
                />
              </div>

              {/* Anexos */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  <span>Anexo (Fatura / Comprovante)</span>
                </Label>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" 
                  className="hidden" 
                />

                {formData.anexo_url ? (
                  <div className="border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/60 rounded-lg text-emerald-700 dark:text-emerald-300">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">Documento Anexado</p>
                        <a 
                          href={formData.anexo_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium mt-0.5"
                        >
                          <span>Visualizar arquivo anexo</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setFormData(prev => ({ ...prev, anexo_url: undefined }))}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg"
                      title="Remover anexo"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                      isUploading 
                        ? 'bg-emerald-50/50 border-emerald-500/50 text-emerald-600' 
                        : 'bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border-slate-300 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-6 w-6 mb-2 animate-spin text-emerald-600 dark:text-emerald-400" />
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Enviando arquivo...</p>
                      </>
                    ) : (
                      <>
                        <Paperclip className="h-5 w-5 mb-1.5 text-slate-400" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Clique para selecionar ou arraste o arquivo</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">PDF, XML, Imagens ou Planilhas</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

          </form>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            <span className="text-rose-500 font-bold">*</span> Campos obrigatórios
          </div>

          <div className="flex items-center gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isSaving}
              className="rounded-xl font-medium"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              form="cobro-form"
              disabled={isSaving || isLoadingRefs}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 shadow-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{initialData ? 'Atualizar Cobro' : 'Salvar Cobro'}</span>
                </>
              )}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

// Alias export for consistency
export const CobroFormModal = CobroFormSheet;
