import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
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
import { Paperclip, Loader2, FileText, ExternalLink, X } from 'lucide-react';
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
    setIsSaving(true);
    try {
      // Clean up centro_custo based on selection
      const dataToSave = { ...formData };
      if (centroCustoTipo === 'departamento') {
         dataToSave.obra_id = null as any;
      } else {
         dataToSave.departamento_id = null as any;
      }

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error("Error saving form", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-xl text-brand-primary">
              {initialData ? 'Editar Cobro' : 'Novo Cobro'}
            </SheetTitle>
            <SheetDescription>
              Preencha os dados e relacione o recebimento com as entidades do sistema.
            </SheetDescription>
          </SheetHeader>

          {isLoadingRefs ? (
            <div className="flex-1 flex justify-center items-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
            </div>
          ) : (
            <div className="flex-1 py-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="CodCliente">Cliente *</Label>
                  <Select
                    value={formData.CodCliente || ''}
                    onValueChange={(val) => {
                      const client = clientes.find(c => c.CodCliente === val);
                      setFormData(prev => ({ ...prev, CodCliente: val, Cliente: client?.RazonSocial || '' }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => (
                        <SelectItem key={c.CodCliente} value={c.CodCliente}>{c.RazonSocial || c.NombreComercial}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="Empresa">Empresa *</Label>
                  <Select
                    value={formData.Empresa || ''}
                    onValueChange={(val) => handleSelectChange('Empresa', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa faturadora" />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas.map(e => (
                        <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="categoria_id">Categoria de Receita</Label>
                  <Select
                    value={formData.categoria_id || ''}
                    onValueChange={(val) => handleSelectChange('categoria_id', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria (DRE)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.filter(c => c.ativo && c.tipo?.toLowerCase() === 'receita').map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                      {categorias.filter(c => c.ativo && c.tipo?.toLowerCase() === 'receita').length === 0 && (
                        <SelectItem value="none" disabled>Nenhuma categoria de receita cadastrada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="periodo_fat">Período Faturamento</Label>
                  <Input
                    id="periodo_fat"
                    name="periodo_fat"
                    placeholder="Ex: Outubro 2025"
                    value={formData.periodo_fat || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="Banco">Banco de Destino (Depósito)</Label>
                  <Select
                    value={formData.Banco || ''}
                    onValueChange={(val) => handleSelectChange('Banco', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o banco onde o valor será depositado" />
                    </SelectTrigger>
                    <SelectContent>
                      {bancos.map(b => (
                        <SelectItem key={b.id} value={b.nome_banco}>{b.nome_banco} {b.iban ? `(${b.iban})` : ''}</SelectItem>
                      ))}
                      {bancos.length === 0 && <SelectItem value="none" disabled>Nenhum banco cadastrado</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Centro de Custo Section */}
              <div className="p-4 bg-gray-50 border rounded-lg space-y-4">
                <Label className="text-base">Centro de Custo</Label>
                <div className="flex items-center gap-6">
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="cc-obra" 
                        name="cc-tipo" 
                        value="obra" 
                        checked={centroCustoTipo === 'obra'} 
                        onChange={() => setCentroCustoTipo('obra')} 
                        className="h-4 w-4 text-brand-primary border-gray-300 focus:ring-brand-primary"
                      />
                      <Label htmlFor="cc-obra" className="font-normal cursor-pointer">Obra</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="cc-depto" 
                        name="cc-tipo" 
                        value="departamento" 
                        checked={centroCustoTipo === 'departamento'} 
                        onChange={() => setCentroCustoTipo('departamento')} 
                        className="h-4 w-4 text-brand-primary border-gray-300 focus:ring-brand-primary"
                      />
                      <Label htmlFor="cc-depto" className="font-normal cursor-pointer">Departamento</Label>
                    </div>
                  </div>

                  <div className="flex-1">
                    {centroCustoTipo === 'departamento' ? (
                      <Select
                        value={formData.departamento_id || ''}
                        onValueChange={(val) => handleSelectChange('departamento_id', val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o departamento" />
                        </SelectTrigger>
                        <SelectContent>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a obra" />
                        </SelectTrigger>
                        <SelectContent>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="Data_emissao">Data Emissão</Label>
                  <Input
                    id="Data_emissao"
                    name="Data_emissao"
                    type="date"
                    value={(formData.Data_emissao as any) || ''}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="Dt_venc">Vencimento</Label>
                  <Input
                    id="Dt_venc"
                    name="Dt_venc"
                    type="date"
                    value={(formData.Dt_venc as any) || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="Valot_total">Valor Total (€) *</Label>
                  <Input
                    id="Valot_total"
                    name="Valot_total"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.Valot_total || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="Status">Status</Label>
                  <Select
                    value={formData.Status as string || 'A vencer'}
                    onValueChange={(val) => handleSelectChange('Status', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pago">Pago</SelectItem>
                      <SelectItem value="A vencer">A Vencer</SelectItem>
                      <SelectItem value="Vencido">Vencido</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="Num_doc">Nº Documento / Fatura</Label>
                <Input
                  id="Num_doc"
                  name="Num_doc"
                  placeholder="Número da Fatura/Recibo"
                  value={formData.Num_doc || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="Obs">Observações</Label>
                <textarea
                  id="Obs"
                  name="Obs"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Detalhes adicionais do recebimento..."
                  value={formData.Obs || ''}
                  onChange={handleChange}
                />
              </div>

              {/* Anexos */}
              <div className="space-y-2">
                <Label>Anexos</Label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" 
                  className="hidden" 
                />

                {formData.anexo_url ? (
                  <div className="border rounded-lg p-4 bg-emerald-50/50 border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-emerald-900 truncate">Documento Anexado</p>
                        <a 
                          href={formData.anexo_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[11px] text-brand-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <span>Visualizar arquivo</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setFormData(prev => ({ ...prev, anexo_url: undefined }))}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                      isUploading 
                        ? 'bg-blue-50/50 border-brand-primary/50 text-brand-primary' 
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-muted-foreground'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-6 w-6 mb-2 animate-spin text-brand-primary" />
                        <p className="text-sm font-medium text-brand-primary">Enviando arquivo...</p>
                      </>
                    ) : (
                      <>
                        <Paperclip className="h-6 w-6 mb-2 text-slate-400" />
                        <p className="text-sm font-medium text-slate-700">Anexar arquivo</p>
                        <p className="text-xs text-slate-500">Arraste a fatura ou comprovante aqui (PDF, Imagens, Docs)</p>
                      </>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          <SheetFooter className="mt-auto pb-6 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || isLoadingRefs}>
              {isSaving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
