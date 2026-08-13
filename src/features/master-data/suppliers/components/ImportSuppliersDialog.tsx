import { useState } from 'react';
import * as XLSX from 'xlsx';
import { DownloadCloud, Loader2, ArrowRight, ArrowLeft, FileSpreadsheet, Upload, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useMutateSupplier, useSuppliers } from '../hooks/useSuppliers';
import { suppliersApi } from '../api/suppliersApi';
import type { CreateSupplierDTO } from '../types';

interface ImportSuppliersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = 'UPLOAD' | 'MAPPING' | 'PREVIEW';

interface ParsedSupplierRow {
  index: number;
  codigo?: string;
  generatedCodigo?: string;
  trade_name: string;
  legal_name: string;
  tax_id: string;
  supplier_type: 'housing' | 'transport' | 'epi' | 'tools' | 'legal' | 'accounting' | 'general' | 'other';
  email?: string;
  billing_email?: string;
  phone?: string;
  address_line?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  notes?: string;
  status: 'valid' | 'warning' | 'invalid';
  errorMessage?: string;
}

function findKeyIgnoreCase(headers: string[], keywords: string[]): string {
  for (const kw of keywords) {
    const found = headers.find(h => h.trim().toLowerCase() === kw.toLowerCase());
    if (found) return found;
  }
  for (const kw of keywords) {
    const found = headers.find(h => h.trim().toLowerCase().includes(kw.toLowerCase()));
    if (found) return found;
  }
  return '';
}

function normalizeSupplierType(rawType: string): 'housing' | 'transport' | 'epi' | 'tools' | 'legal' | 'accounting' | 'general' | 'other' {
  const val = (rawType || '').trim().toLowerCase();
  if (!val) return 'general';
  if (val.includes('aloj') || val.includes('hous') || val.includes('hosped')) return 'housing';
  if (val.includes('transp') || val.includes('logist')) return 'transport';
  if (val.includes('epi') || val.includes('protec')) return 'epi';
  if (val.includes('ferram') || val.includes('tool') || val.includes('equip')) return 'tools';
  if (val.includes('jurid') || val.includes('legal') || val.includes('advoc')) return 'legal';
  if (val.includes('contab') || val.includes('account')) return 'accounting';
  if (val.includes('outro') || val.includes('other')) return 'other';
  return 'general';
}

export function ImportSuppliersDialog({ open, onOpenChange }: ImportSuppliersDialogProps) {
  const { selectedEmpresaId } = useEmpresa();
  const { data: existingSuppliers = [] } = useSuppliers();
  const { bulkCreateSuppliers, isBulkCreating } = useMutateSupplier();

  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [isParsing, setIsParsing] = useState(false);

  // Raw parsed file data
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);

  // Column Mapping
  const [colMapping, setColMapping] = useState({
    codigo: '',
    trade_name: '',
    legal_name: '',
    tax_id: '',
    supplier_type: '',
    email: '',
    billing_email: '',
    phone: '',
    address_line: '',
    city: '',
    province: '',
    postal_code: '',
    notes: '',
  });

  // Final parsed preview rows
  const [parsedRows, setParsedRows] = useState<ParsedSupplierRow[]>([]);

  const resetState = () => {
    setStep('UPLOAD');
    setRawHeaders([]);
    setRawRows([]);
    setParsedRows([]);
    setColMapping({
      codigo: '',
      trade_name: '',
      legal_name: '',
      tax_id: '',
      supplier_type: '',
      email: '',
      billing_email: '',
      phone: '',
      address_line: '',
      city: '',
      province: '',
      postal_code: '',
      notes: '',
    });
  };

  const handleClose = (value: boolean) => {
    if (!value) resetState();
    onOpenChange(value);
  };

  // Download XLSX template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Código': 'FOR-001',
        'Nome Fantasia': 'Fornecedor Exemplo Lda',
        'Razão Social': 'Fornecedor Exemplo Lda',
        'NIF / Tax ID': '500123456',
        'Tipo de Fornecedor': 'general',
        'E-mail': 'contato@exemplo.com',
        'E-mail Financeiro': 'financeiro@exemplo.com',
        'Telefone': '+351 912 345 678',
        'Endereço': 'Rua Principal, 123',
        'Cidade': 'Lisboa',
        'Distrito / Estado': 'Lisboa',
        'Código Postal': '1000-001',
        'Observações': 'Fornecedor principal de materiais',
      },
      {
        'Código': '', // Deixar vazio para testar auto-geração
        'Nome Fantasia': 'Alojamento Sol & Mar',
        'Razão Social': 'Alojamento Sol & Mar Lda',
        'NIF / Tax ID': '509876543',
        'Tipo de Fornecedor': 'housing',
        'E-mail': 'reservas@solemar.pt',
        'E-mail Financeiro': 'financeiro@solemar.pt',
        'Telefone': '+351 933 444 555',
        'Endereço': 'Av. Beira Mar, 45',
        'Cidade': 'Porto',
        'Distrito / Estado': 'Porto',
        'Código Postal': '4000-001',
        'Observações': 'Parceiro de alojamento para colaboradores',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fornecedores');
    XLSX.writeFile(workbook, 'modelo_importacao_fornecedores.xlsx');
  };

  // Handle file select/upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

        if (!data || data.length < 2) {
          toast.error('O arquivo selecionado está vazio ou não contém dados válidos.');
          setIsParsing(false);
          return;
        }

        const headers = (data[0] as string[]).map(h => String(h || '').trim());
        const rows = data.slice(1).filter(r => r && r.some((cell: any) => cell !== null && cell !== ''));

        setRawHeaders(headers);
        setRawRows(rows);

        // Auto-detect columns
        setColMapping({
          codigo: findKeyIgnoreCase(headers, ['codigo', 'código', 'cod', 'id']),
          trade_name: findKeyIgnoreCase(headers, ['nome fantasia', 'fantasia', 'nome', 'trade_name', 'empresa']),
          legal_name: findKeyIgnoreCase(headers, ['razão social', 'razao social', 'legal_name', 'social']),
          tax_id: findKeyIgnoreCase(headers, ['nif', 'tax id', 'nif/tax id', 'cnpj', 'cpf', 'tax_id', 'vat']),
          supplier_type: findKeyIgnoreCase(headers, ['tipo', 'categoria', 'tipo de fornecedor', 'supplier_type']),
          email: findKeyIgnoreCase(headers, ['e-mail', 'email', 'contato']),
          billing_email: findKeyIgnoreCase(headers, ['e-mail financeiro', 'email financeiro', 'billing_email', 'financeiro']),
          phone: findKeyIgnoreCase(headers, ['telefone', 'phone', 'tel', 'celular']),
          address_line: findKeyIgnoreCase(headers, ['endereço', 'endereco', 'logradouro', 'rua', 'address']),
          city: findKeyIgnoreCase(headers, ['cidade', 'city']),
          province: findKeyIgnoreCase(headers, ['distrito', 'estado', 'provincia', 'province', 'distrito / estado']),
          postal_code: findKeyIgnoreCase(headers, ['código postal', 'codigo postal', 'cep', 'postal_code']),
          notes: findKeyIgnoreCase(headers, ['observações', 'observacoes', 'notes', 'obs']),
        });

        setStep('MAPPING');
      } catch (err: any) {
        console.error('Erro ao ler arquivo:', err);
        toast.error('Erro ao processar o arquivo. Verifique o formato enviado.');
      } finally {
        setIsParsing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Process rows to preview
  const handleProceedToPreview = async () => {
    if (!colMapping.trade_name && !colMapping.legal_name) {
      toast.error('Selecione ao menos uma coluna para Nome Fantasia ou Razão Social.');
      return;
    }

    setIsParsing(true);

    try {
      let nextCodeStr = 'FOR-001';
      if (selectedEmpresaId) {
        nextCodeStr = await suppliersApi.getNextSupplierCode(selectedEmpresaId);
      }

      let currentSeqNum = parseInt(nextCodeStr.replace(/^FOR-/i, ''), 10);
      if (isNaN(currentSeqNum)) currentSeqNum = 1;

      const existingNifs = new Set(
        existingSuppliers
          .map(s => (s.tax_id || '').trim().toLowerCase())
          .filter(Boolean)
      );

      const parsed: ParsedSupplierRow[] = rawRows.map((row, idx) => {
        const getVal = (colName: string) => {
          if (!colName) return '';
          const colIndex = rawHeaders.indexOf(colName);
          if (colIndex === -1) return '';
          const cellVal = row[colIndex];
          return cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : '';
        };

        const rawCod = getVal(colMapping.codigo);
        const tradeName = getVal(colMapping.trade_name) || getVal(colMapping.legal_name);
        const legalName = getVal(colMapping.legal_name) || tradeName;
        const taxId = getVal(colMapping.tax_id);
        const supplierType = normalizeSupplierType(getVal(colMapping.supplier_type));

        let generatedCodigo = '';
        if (rawCod) {
          generatedCodigo = rawCod;
        } else {
          generatedCodigo = `FOR-${String(currentSeqNum).padStart(3, '0')}`;
          currentSeqNum++;
        }

        let status: 'valid' | 'warning' | 'invalid' = 'valid';
        let errorMessage = '';

        if (!tradeName && !legalName) {
          status = 'invalid';
          errorMessage = 'Nome Fantasia e Razão Social ausentes.';
        } else if (!taxId) {
          status = 'warning';
          errorMessage = 'Sem NIF/Tax ID (preenchimento recomendável).';
        } else if (existingNifs.has(taxId.toLowerCase())) {
          status = 'warning';
          errorMessage = `NIF ${taxId} já cadastrado no sistema.`;
        }

        return {
          index: idx + 1,
          codigo: rawCod || undefined,
          generatedCodigo,
          trade_name: tradeName,
          legal_name: legalName,
          tax_id: taxId || `NIF-TEMP-${idx + 1}`,
          supplier_type: supplierType,
          email: getVal(colMapping.email) || undefined,
          billing_email: getVal(colMapping.billing_email) || undefined,
          phone: getVal(colMapping.phone) || undefined,
          address_line: getVal(colMapping.address_line) || undefined,
          city: getVal(colMapping.city) || undefined,
          province: getVal(colMapping.province) || undefined,
          postal_code: getVal(colMapping.postal_code) || undefined,
          notes: getVal(colMapping.notes) || undefined,
          status,
          errorMessage,
        };
      });

      setParsedRows(parsed);
      setStep('PREVIEW');
    } catch (err: any) {
      console.error('Erro ao gerar pré-visualização:', err);
      toast.error('Erro ao validar dados da planilha.');
    } finally {
      setIsParsing(false);
    }
  };

  // Submit Bulk Import
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r.status !== 'invalid');

    if (validRows.length === 0) {
      toast.error('Nenhum fornecedor válido para importar.');
      return;
    }

    try {
      const payloadList: CreateSupplierDTO[] = validRows.map(r => ({
        codigo: r.generatedCodigo,
        trade_name: r.trade_name,
        legal_name: r.legal_name,
        tax_id: r.tax_id,
        supplier_type: r.supplier_type,
        email: r.email,
        billing_email: r.billing_email,
        phone: r.phone,
        address_line: r.address_line,
        city: r.city,
        province: r.province,
        postal_code: r.postal_code,
        notes: r.notes,
        status: 'active',
      }));

      await bulkCreateSuppliers(payloadList);

      toast.success(`${validRows.length} fornecedor(es) importado(s) com sucesso!`);
      handleClose(false);
    } catch (err: any) {
      console.error('Erro na importação em lote:', err);
      toast.error(err.message || 'Erro ao importar fornecedores.');
    }
  };

  const validCount = parsedRows.filter(r => r.status === 'valid').length;
  const warningCount = parsedRows.filter(r => r.status === 'warning').length;
  const invalidCount = parsedRows.filter(r => r.status === 'invalid').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileSpreadsheet className="h-5 w-5 text-orange-500" />
            Importar Fornecedores por Planilha
          </DialogTitle>
          <DialogDescription>
            Importe dados em lote (.xlsx, .xls ou .csv). Os códigos de fornecedor serão atribuídos automaticamente se não informados.
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: UPLOAD */}
        {step === 'UPLOAD' && (
          <div className="space-y-6 py-4 flex-1 overflow-y-auto">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-8 text-center hover:border-orange-500/50 transition-colors bg-slate-50/50 dark:bg-slate-900/30">
              <Upload className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Selecione ou arraste o arquivo de planilha
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Suporta formatos Excel (.xlsx, .xls) e CSV
              </p>
              
              <Input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
                id="supplier-file-input"
              />
              
              <Label
                htmlFor="supplier-file-input"
                className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 bg-orange-500 text-white hover:bg-orange-600 h-10 px-4 py-2"
              >
                {isParsing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Selecionar Arquivo
              </Label>
            </div>

            <div className="bg-slate-100 dark:bg-slate-900/80 p-4 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Precisa de um modelo?</p>
                <p className="text-xs text-muted-foreground">Baixe nossa planilha pré-formatada para facilitar o preenchimento.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2 border-slate-300 dark:border-slate-700">
                <DownloadCloud className="h-4 w-4 text-orange-500" />
                Baixar Planilha Modelo
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: MAPPING */}
        {step === 'MAPPING' && (
          <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
            <p className="text-xs text-slate-500">
              Confirme a correspondência entre as colunas da sua planilha e os campos do sistema:
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Código Interno</Label>
                <Select value={colMapping.codigo} onValueChange={(val) => setColMapping(p => ({ ...p, codigo: val }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione ou deixe auto" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Gerar Sequencial Automático --</SelectItem>
                    {rawHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">NIF / Tax ID *</Label>
                <Select value={colMapping.tax_id} onValueChange={(val) => setColMapping(p => ({ ...p, tax_id: val }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Não Mapear --</SelectItem>
                    {rawHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Nome Fantasia *</Label>
                <Select value={colMapping.trade_name} onValueChange={(val) => setColMapping(p => ({ ...p, trade_name: val }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Não Mapear --</SelectItem>
                    {rawHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Razão Social *</Label>
                <Select value={colMapping.legal_name} onValueChange={(val) => setColMapping(p => ({ ...p, legal_name: val }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Não Mapear --</SelectItem>
                    {rawHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Categoria / Tipo</Label>
                <Select value={colMapping.supplier_type} onValueChange={(val) => setColMapping(p => ({ ...p, supplier_type: val }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Padrão (Uso Geral) --</SelectItem>
                    {rawHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">E-mail de Contato</Label>
                <Select value={colMapping.email} onValueChange={(val) => setColMapping(p => ({ ...p, email: val }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Não Mapear --</SelectItem>
                    {rawHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">E-mail Financeiro</Label>
                <Select value={colMapping.billing_email} onValueChange={(val) => setColMapping(p => ({ ...p, billing_email: val }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Não Mapear --</SelectItem>
                    {rawHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Telefone</Label>
                <Select value={colMapping.phone} onValueChange={(val) => setColMapping(p => ({ ...p, phone: val }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Não Mapear --</SelectItem>
                    {rawHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Endereço / Logradouro</Label>
                <Select value={colMapping.address_line} onValueChange={(val) => setColMapping(p => ({ ...p, address_line: val }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Não Mapear --</SelectItem>
                    {rawHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Cidade</Label>
                <Select value={colMapping.city} onValueChange={(val) => setColMapping(p => ({ ...p, city: val }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Não Mapear --</SelectItem>
                    {rawHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Distrito / Estado</Label>
                <Select value={colMapping.province} onValueChange={(val) => setColMapping(p => ({ ...p, province: val }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Não Mapear --</SelectItem>
                    {rawHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Código Postal</Label>
                <Select value={colMapping.postal_code} onValueChange={(val) => setColMapping(p => ({ ...p, postal_code: val }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Não Mapear --</SelectItem>
                    {rawHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW */}
        {step === 'PREVIEW' && (
          <div className="space-y-4 py-2 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-800 text-xs">
              <div className="flex gap-4">
                <span>Total: <strong>{parsedRows.length}</strong></span>
                <span className="text-emerald-600 dark:text-emerald-400">Válidos: <strong>{validCount}</strong></span>
                <span className="text-amber-600 dark:text-amber-400">Avisos: <strong>{warningCount}</strong></span>
                <span className="text-red-600 dark:text-red-400">Inválidos: <strong>{invalidCount}</strong></span>
              </div>
              <span className="text-muted-foreground">Linhas inválidas serão ignoradas.</span>
            </div>

            <ScrollArea className="h-72 border rounded-md">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-medium">
                  <tr>
                    <th className="p-2">Linha</th>
                    <th className="p-2">Código</th>
                    <th className="p-2">Nome Fantasia</th>
                    <th className="p-2">Razão Social</th>
                    <th className="p-2">NIF / Tax ID</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {parsedRows.map((row) => (
                    <tr key={row.index} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                      <td className="p-2 text-muted-foreground">{row.index}</td>
                      <td className="p-2 font-mono font-semibold text-orange-600 dark:text-orange-400">
                        {row.generatedCodigo}
                        {!row.codigo && <span className="text-[10px] text-slate-400 font-normal ml-1">(novo)</span>}
                      </td>
                      <td className="p-2 font-medium">{row.trade_name || '--'}</td>
                      <td className="p-2 text-slate-600 dark:text-slate-400">{row.legal_name || '--'}</td>
                      <td className="p-2 font-mono">{row.tax_id}</td>
                      <td className="p-2 capitalize">{row.supplier_type}</td>
                      <td className="p-2">
                        {row.status === 'valid' && (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Válido</Badge>
                        )}
                        {row.status === 'warning' && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" title={row.errorMessage}>
                            {row.errorMessage || 'Aviso'}
                          </Badge>
                        )}
                        {row.status === 'invalid' && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" title={row.errorMessage}>
                            Inválido
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="pt-4 border-t flex justify-between items-center">
          {step === 'UPLOAD' && (
            <Button variant="ghost" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
          )}

          {step === 'MAPPING' && (
            <>
              <Button variant="outline" onClick={() => setStep('UPLOAD')} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button onClick={handleProceedToPreview} disabled={isParsing} className="bg-orange-500 hover:bg-orange-600 text-white gap-1">
                {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Validar e Avançar <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </>
          )}

          {step === 'PREVIEW' && (
            <>
              <Button variant="outline" onClick={() => setStep('MAPPING')} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Voltar Mapeamento
              </Button>
              <Button onClick={handleConfirmImport} disabled={isBulkCreating || (validCount + warningCount === 0)} className="bg-orange-500 hover:bg-orange-600 text-white gap-1">
                {isBulkCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirmar Importação ({validCount + warningCount})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
