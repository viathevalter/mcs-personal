import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useLeads, useMutateLead } from './hooks/useLeads';
import { normalizeSectorName } from './services/prospectingService';
import { useKanbanStages } from './hooks/useKanban';
import { useMutateClient } from '@/features/master-data/clients/hooks/useClients';
import { usePaymentTerms } from '@/features/master-data/clients/hooks/usePaymentTerms';
import { CountrySelector, RegionSelector } from '@/features/master-data/locations/components/LocationSelectors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  UserPlus, 
  Building, 
  Mail, 
  Phone, 
  Calendar,
  AlertCircle,
  UserCheck,
  Link,
  Share2,
  FileSpreadsheet,
  Upload,
  FileUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Eye,
  Globe,
  Linkedin,
  Instagram,
  Tag,
  MapPin,
  FileText,
  Filter,
  Download,
  Ship,
  Flame,
  Layers,
  FlaskConical,
  CheckCircle2,
  Factory,
  BarChart3,
  Building2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { EmpresaSelector } from '@/features/operacoes/components/EmpresaSelector';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Lead } from '../estimaciones/types';
import { useTranslation } from 'react-i18next';
const ensureAbsoluteUrl = (url?: string | null): string => {
  if (!url) return '#';
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed === 'null') return '#';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export function LeadsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { data: leads = [], isLoading, error } = useLeads();
  const { empresas, selectedEmpresaId } = useEmpresa();
  const { createLead, updateLead, deleteLead, isCreating, isUpdating, isDeleting, createLeadsBatch, isCreatingBatch } = useMutateLead();
  const { createClient } = useMutateClient();
  const { data: paymentTerms = [] } = usePaymentTerms();
  const { data: stages = [] } = useKanbanStages();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // ETL Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileRows, setFileRows] = useState<any[][]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [mappings, setMappings] = useState({
    nameCol: '',
    companyCol: '',
    emailCol: '',
    phoneCol: '',
    notesCol: '',
    sectorCol: '',
    cargoCol: '',
    serviceCol: '',
    originCol: '',
  });
  const [updateExisting, setUpdateExisting] = useState(false);

  // Leads Sorting States
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortHeader = (field: string, label: string) => {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1.5 hover:text-yellow-600 dark:hover:text-yellow-500 font-semibold focus:outline-none select-none transition-colors py-1"
      >
        <span>{label}</span>
        {isActive ? (
          sortDirection === 'asc' ? <ArrowUp size={13} className="text-yellow-600 dark:text-yellow-500 shrink-0" /> : <ArrowDown size={13} className="text-yellow-600 dark:text-yellow-500 shrink-0" />
        ) : (
          <ArrowUpDown size={13} className="text-muted-foreground/35 shrink-0 hover:text-yellow-500/50" />
        )}
      </button>
    );
  };

  // Main Table Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dnsCache] = useState<Map<string, boolean>>(() => new Map());

  const [etlResult, setEtlResult] = useState<{
    total: number;
    valid: any[];
    invalidCount: number;
    duplicateCount: number;
    dbDuplicateCount: number;
    analyzed: boolean;
  } | null>(null);

  // Conversion Form State
  const [conversionData, setConversionData] = useState({
    trade_name: '',
    legal_name: '',
    tax_id: '',
    email: '',
    billing_email: '',
    phone: '',
    country_id: '',
    region_id: '',
    province: '',
    city: '',
    postal_code: '',
    address_line: '',
    payment_term_id: '',
  });
  // Details Modal State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDetailLead, setSelectedDetailLead] = useState<Lead | null>(null);

  const handleOpenDetails = (lead: Lead) => {
    setSelectedDetailLead(lead);
    setIsDetailsOpen(true);
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    notes: '',
    empresa_id: '',
    sector: '',
    cargo: '',
    servicio_producto: '',
    origen_lead: '',
    website: '',
    linkedin_url: '',
    instagram_url: '',
    tags: '',
  });

  const handleOpenCreate = () => {
    setSelectedLead(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company_name: '',
      notes: '',
      empresa_id: selectedEmpresaId || '',
      sector: '',
      cargo: '',
      servicio_producto: '',
      origen_lead: '',
      website: '',
      linkedin_url: '',
      instagram_url: '',
      tags: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      company_name: lead.company_name || '',
      notes: lead.notes || '',
      empresa_id: lead.empresa_id || selectedEmpresaId || '',
      sector: lead.sector || '',
      cargo: lead.cargo || '',
      servicio_producto: lead.servicio_producto || '',
      origen_lead: lead.origen_lead || '',
      website: lead.website || '',
      linkedin_url: lead.linkedin_url || '',
      instagram_url: lead.instagram_url || '',
      tags: Array.isArray(lead.tags) ? lead.tags.join(', ') : '',
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name || !formData.name || !formData.email || !formData.phone || !formData.empresa_id) {
      toast.error(t('comercial.leads.form.validationRequired'));
      return;
    }

    const tagsArray = formData.tags
      ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : undefined;

    const payload = {
      ...formData,
      tags: tagsArray,
      website: formData.website || null,
      linkedin_url: formData.linkedin_url || null,
      instagram_url: formData.instagram_url || null,
    };

    try {
      if (selectedLead) {
        await updateLead({
          id: selectedLead.id,
          payload: payload as any,
        });
        toast.success(t('comercial.leads.form.toastUpdateSuccess'));
      } else {
        await createLead(payload as any);
        toast.success(t('comercial.leads.form.toastCreateSuccess'));
      }
      setIsFormOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('comercial.leads.form.toastSaveError'));
    }
  };

  const handleDelete = async () => {
    if (!selectedLead) return;
    try {
      await deleteLead(selectedLead.id);
      toast.success(t('comercial.leads.delete.toastSuccess'));
      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('comercial.leads.delete.toastError'));
    }
  };

  const handleOpenConvert = (lead: Lead) => {
    setSelectedLead(lead);
    setConversionData({
      trade_name: lead.company_name || '',
      legal_name: lead.legal_name || lead.company_name || '',
      tax_id: lead.tax_id || '',
      email: lead.email || '',
      billing_email: lead.billing_email || lead.email || '',
      phone: lead.phone || '',
      country_id: lead.country_id || '',
      region_id: lead.region_id || '',
      province: lead.province || '',
      city: lead.city || '',
      postal_code: lead.postal_code || '',
      address_line: lead.address_line || '',
      payment_term_id: lead.payment_term_id || '',
    });
    setIsConvertOpen(true);
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    if (!conversionData.tax_id || !conversionData.legal_name || !conversionData.trade_name) {
      toast.error('Nome Fantasia, Razão Social e NIF são obrigatórios');
      return;
    }

    try {
      // 1. Criar o cliente no banco de dados (o código CXXXX será gerado automaticamente pela trigger)
      const newClient = await createClient({
        trade_name: conversionData.trade_name,
        legal_name: conversionData.legal_name,
        tax_id: conversionData.tax_id,
        email: conversionData.email || null,
        billing_email: conversionData.billing_email || null,
        phone: conversionData.phone || null,
        country_id: conversionData.country_id || null,
        region_id: conversionData.region_id || null,
        province: conversionData.province || null,
        city: conversionData.city || null,
        postal_code: conversionData.postal_code || null,
        address_line: conversionData.address_line || null,
        payment_term_id: conversionData.payment_term_id === 'none' || conversionData.payment_term_id === '' ? null : conversionData.payment_term_id,
        status: 'active',
        codigo: null,
      } as any);

      // 2. Vincular o lead ao cliente criado
      await updateLead({
        id: selectedLead.id,
        payload: {
          client_id: newClient.id,
          tax_id: conversionData.tax_id,
          legal_name: conversionData.legal_name,
          billing_email: conversionData.billing_email || null,
          country_id: conversionData.country_id || null,
          region_id: conversionData.region_id || null,
          province: conversionData.province || null,
          city: conversionData.city || null,
          postal_code: conversionData.postal_code || null,
          address_line: conversionData.address_line || null,
          payment_term_id: conversionData.payment_term_id === 'none' || conversionData.payment_term_id === '' ? null : conversionData.payment_term_id,
        } as any,
      });

      toast.success('Lead convertido em cliente com sucesso!');
      setIsConvertOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao converter lead em cliente');
    }
  };

  const handleCopyCollectionLink = (lead: Lead) => {
    const url = `${window.location.origin}/public/coleta-dados/${lead.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de coleta copiado para a área de transferência!');
  };

  const handleCopyNewLeadLink = () => {
    if (!selectedEmpresaId) {
      toast.error('Selecione uma empresa do grupo primeiro');
      return;
    }
    const url = `${window.location.origin}/public/novo-lead?empresa_id=${selectedEmpresaId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de novo lead copiado para a área de transferência!');
  };

  const handleCopyNewBudgetLink = () => {
    if (!selectedEmpresaId) {
      toast.error('Selecione uma empresa do grupo primeiro');
      return;
    }
    const url = `${window.location.origin}/public/solicitar-presupuesto?empresa_id=${selectedEmpresaId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de nova solicitação de orçamento copiado para a área de transferência!');
  };

  const handleCopyBudgetLink = (lead: any) => {
    const url = `${window.location.origin}/public/solicitar-presupuesto?lead_id=${lead.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de solicitação de orçamento deste lead copiado para a área de transferência!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length === 0) {
          toast.error('A planilha está vazia.');
          return;
        }

        const headers = data[0].map(h => String(h || '').trim());
        const rows = data.slice(1).filter(row => row.some(cell => cell !== null && cell !== ''));

        setFileHeaders(headers);
        setFileRows(rows);
        // Auto mapping
        const mapObj = {
          nameCol: '',
          companyCol: '',
          emailCol: '',
          phoneCol: '',
          notesCol: '',
          sectorCol: '',
          cargoCol: '',
          serviceCol: '',
          originCol: ''
        };
        headers.forEach(h => {
          const normalized = h.toLowerCase();
          if (normalized.includes('contacto') || normalized.includes('contato') || normalized.includes('nombre del contacto') || (normalized.includes('nome') && !normalized.includes('empresa'))) {
            if (!mapObj.nameCol) mapObj.nameCol = h;
          }
          if (normalized.includes('empresa') || normalized.includes('company') || normalized.includes('cliente') || normalized.includes('fantasia') || normalized.includes('razão') || normalized.includes('trade')) {
            if (!mapObj.companyCol) mapObj.companyCol = h;
          }
          if (normalized.includes('email') || normalized.includes('e-mail') || normalized.includes('correo') || normalized.includes('mail')) {
            if (!mapObj.emailCol) mapObj.emailCol = h;
          }
          if (normalized.includes('tel') || normalized.includes('fone') || normalized.includes('phone') || normalized.includes('cel') || normalized.includes('movil') || normalized.includes('móvel')) {
            if (!mapObj.phoneCol) mapObj.phoneCol = h;
          }
          if (normalized.includes('obs') || normalized.includes('nota') || normalized.includes('note') || normalized.includes('próximo paso') || normalized.includes('passo') || normalized.includes('next')) {
            if (!mapObj.notesCol) mapObj.notesCol = h;
          }
          if (normalized.includes('setor') || normalized.includes('sector') || normalized.includes('industria') || normalized.includes('sector')) {
            if (!mapObj.sectorCol) mapObj.sectorCol = h;
          }
          if (normalized.includes('cargo') || normalized.includes('puesto') || normalized.includes('role') || normalized.includes('position') || normalized.includes('função')) {
            if (!mapObj.cargoCol) mapObj.cargoCol = h;
          }
          if (normalized.includes('servicio') || normalized.includes('produto') || normalized.includes('service') || normalized.includes('product')) {
            if (!mapObj.serviceCol) mapObj.serviceCol = h;
          }
          if (normalized.includes('origen') || normalized.includes('origem') || normalized.includes('source') || normalized.includes('origem do lead')) {
            if (!mapObj.originCol) mapObj.originCol = h;
          }
        });
        setMappings(mapObj);

        toast.success(`Planilha lida com sucesso: ${rows.length} linhas encontradas.`);
      } catch (err: any) {
        console.error(err);
        toast.error('Erro ao ler a planilha. Verifique o formato do arquivo.');
      }
    };
    reader.readAsBinaryString(file);
  };
  const runEtlAnalysis = async () => {
    if (!mappings.companyCol || !mappings.emailCol) {
      setEtlResult(null);
      return;
    }

    setIsAnalyzing(true);

    const nameIdx = mappings.nameCol ? fileHeaders.indexOf(mappings.nameCol) : -1;
    const companyIdx = fileHeaders.indexOf(mappings.companyCol);
    const emailIdx = fileHeaders.indexOf(mappings.emailCol);
    const phoneIdx = mappings.phoneCol ? fileHeaders.indexOf(mappings.phoneCol) : -1;
    const notesIdx = mappings.notesCol ? fileHeaders.indexOf(mappings.notesCol) : -1;
    const sectorIdx = mappings.sectorCol ? fileHeaders.indexOf(mappings.sectorCol) : -1;
    const cargoIdx = mappings.cargoCol ? fileHeaders.indexOf(mappings.cargoCol) : -1;
    const serviceIdx = mappings.serviceCol ? fileHeaders.indexOf(mappings.serviceCol) : -1;
    const originIdx = mappings.originCol ? fileHeaders.indexOf(mappings.originCol) : -1;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Corretor de erros comuns de digitação em domínios
    const DOMAIN_TYPOS: Record<string, string> = {
      'gamil.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gmaill.com': 'gmail.com',
      'hotamil.com': 'hotmail.com',
      'hotmial.com': 'hotmail.com',
      'hotmaill.com': 'hotmail.com',
      'outllok.com': 'outlook.com',
      'outlok.com': 'outlook.com',
      'yahooo.com': 'yahoo.com',
    };

    // Lista de domínios temporários descartáveis
    const DISPOSABLE_DOMAINS = new Set([
      'yopmail.com', 'mailinator.com', 'tempmail.com', '10minutemail.com',
      'dispostable.com', 'sharklasers.com', 'guerrillamail.com', 'temp-mail.org'
    ]);

    // Primeira passada: limpar e extrair domínios únicos para verificação DNS em lote
    const rowsToProcess: any[] = [];
    const uniqueDomains = new Set<string>();

    fileRows.forEach(row => {
      let email = String(row[emailIdx] || '').trim().toLowerCase();
      if (!email || email === 'x') return;

      // Corrigir typos no domínio
      const parts = email.split('@');
      if (parts.length === 2) {
        const domain = parts[1];
        if (DOMAIN_TYPOS[domain]) {
          email = `${parts[0]}@${DOMAIN_TYPOS[domain]}`;
        }
        uniqueDomains.add(email.split('@')[1]);
      }
      rowsToProcess.push({ row, email });
    });

    // Validar domínios via API do Google DNS de forma concorrente e cacheada
    const domainsToCheck = Array.from(uniqueDomains).filter(domain => !dnsCache.has(domain));
    
    if (domainsToCheck.length > 0) {
      const checkPromises = domainsToCheck.map(async (domain) => {
        // Pular verificações para domínios conhecidos gigantes
        const wellKnown = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.com'];
        if (wellKnown.includes(domain)) {
          dnsCache.set(domain, true);
          return;
        }

        try {
          const res = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
          const data = await res.json();
          const hasMx = !!(data.Answer && data.Answer.length > 0);
          dnsCache.set(domain, hasMx);
        } catch (e) {
          console.warn(`DNS MX check failed for domain: ${domain}`, e);
          dnsCache.set(domain, true); // Fallback amigável
        }
      });
      // Executar todas em paralelo com timeout de 3.5 segundos
      await Promise.race([
        Promise.all(checkPromises),
        new Promise(resolve => setTimeout(resolve, 3500))
      ]);
    }

    const validLeads: any[] = [];
    const uniqueEmailsInFile = new Set<string>();
    
    let invalidCount = 0;
    let duplicateCount = 0;
    let dbDuplicateCount = 0;

    rowsToProcess.forEach(({ row, email }) => {
      const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
      const companyName = String(row[companyIdx] || '').trim();
      const phone = phoneIdx !== -1 ? String(row[phoneIdx] || '').trim() : '';
      const notes = notesIdx !== -1 ? String(row[notesIdx] || '').trim() : '';
      const sector = sectorIdx !== -1 ? String(row[sectorIdx] || '').trim() : '';
      const cargo = cargoIdx !== -1 ? String(row[cargoIdx] || '').trim() : '';
      const service = serviceIdx !== -1 ? String(row[serviceIdx] || '').trim() : '';
      const origin = originIdx !== -1 ? String(row[originIdx] || '').trim() : '';

      // Validação de dados mínimos
      const hasCompany = !!companyName;
      const isSyntaxValid = emailRegex.test(email);

      // Extrair domínio
      const domain = email.split('@')[1] || '';

      // Verificar se é domínio temporário ou se falhou no teste DNS MX
      const isDisposable = DISPOSABLE_DOMAINS.has(domain);
      const hasMailServer = dnsCache.get(domain) !== false; // Considera válido se não for explicitamente falso

      const isEmailValid = isSyntaxValid && !isDisposable && hasMailServer;

      if (!hasCompany || !isEmailValid) {
        invalidCount++;
        return;
      }

      // Duplicados no próprio arquivo
      if (uniqueEmailsInFile.has(email)) {
        duplicateCount++;
        return;
      }

      // Duplicados no banco de dados
      const existingLead = leads.find(l => l.email.toLowerCase().trim() === email);
      if (existingLead) {
        if (!updateExisting) {
          dbDuplicateCount++;
          return;
        }
      }

      // Fallback inteligente para o Nome
      const finalName = name || cargo || (existingLead ? existingLead.name : 'Responsável');

      uniqueEmailsInFile.add(email);
      validLeads.push({
        ...(existingLead ? { id: existingLead.id } : {}),
        name: finalName,
        email,
        company_name: companyName,
        phone: phone || (existingLead ? existingLead.phone : null),
        notes: notes || (existingLead ? existingLead.notes : null),
        sector: sector || (existingLead ? existingLead.sector : null),
        cargo: cargo || (existingLead ? existingLead.cargo : null),
        servicio_producto: service || (existingLead ? existingLead.servicio_producto : null),
        origen_lead: origin || (existingLead ? existingLead.origen_lead : null),
      });
    });

    setEtlResult({
      total: fileRows.length,
      valid: validLeads,
      invalidCount,
      duplicateCount,
      dbDuplicateCount,
      analyzed: true,
    });
    
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (fileHeaders.length > 0 && fileRows.length > 0) {
      runEtlAnalysis();
    } else {
      setEtlResult(null);
    }
  }, [mappings, fileHeaders, fileRows, leads, updateExisting]);

  const handleImportLeads = async () => {
    if (!selectedEmpresaId) {
      toast.error('Selecione uma empresa do grupo primeiro.');
      return;
    }
    if (!etlResult || !etlResult.analyzed || etlResult.valid.length === 0) {
      toast.error('Nenhum lead válido para importação. Verifique os mapeamentos.');
      return;
    }

    // Buscar estágio inicial (Novo / Sem Contato ou primeiro estágio)
    const defaultStage = stages.find(s => s.name === 'Novo' || s.name.includes('Novo')) || stages[0];
    const defaultStageId = defaultStage?.id || null;

    const inserts: any[] = [];
    const updates: any[] = [];

    etlResult.valid.forEach(lead => {
      const formattedLead = {
        ...lead,
        empresa_id: selectedEmpresaId
      };
      if (lead.id) {
        updates.push(formattedLead);
      } else {
        formattedLead.stage_id = defaultStageId;
        inserts.push(formattedLead);
      }
    });

    try {
      const chunkSize = 500;
      let importedCount = 0;
      let updatedCount = 0;

      // 1. Inserir novos leads
      if (inserts.length > 0) {
        for (let i = 0; i < inserts.length; i += chunkSize) {
          const chunk = inserts.slice(i, i + chunkSize);
          await createLeadsBatch(chunk);
          importedCount += chunk.length;
        }
      }

      // 2. Atualizar leads existentes
      if (updates.length > 0) {
        for (let i = 0; i < updates.length; i += chunkSize) {
          const chunk = updates.slice(i, i + chunkSize);
          const { error: upsertErr } = await supabase
            .schema('core_comercial')
            .from('leads')
            .upsert(chunk, { onConflict: 'id' });
          if (upsertErr) throw upsertErr;
          updatedCount += chunk.length;
        }
      }

      // Invalidar cache de leads do react-query
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      toast.success(
        `Importação concluída! ${importedCount} novos leads cadastrados e ${updatedCount} leads existentes atualizados.`
      );
      setIsImportOpen(false);
      // Reset state
      setFileHeaders([]);
      setFileRows([]);
      setImportFileName('');
      setEtlResult(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao importar leads para o banco.');
    }
  };

  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedCompanySize, setSelectedCompanySize] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');

  const detectLeadCountry = (lead: any) => {
    if (lead.country_id) {
      const c = String(lead.country_id).toUpperCase();
      if (['ES', 'PT', 'FR', 'DE', 'IT', 'NL', 'BE', 'GB'].includes(c)) {
        return c;
      }
    }
    if (lead.phone) {
      const p = String(lead.phone).trim();
      if (p.startsWith('+34') || p.startsWith('34')) return 'ES';
      if (p.startsWith('+351') || p.startsWith('351')) return 'PT';
      if (p.startsWith('+33') || p.startsWith('33')) return 'FR';
      if (p.startsWith('+49') || p.startsWith('49')) return 'DE';
      if (p.startsWith('+39') || p.startsWith('39')) return 'IT';
      if (p.startsWith('+31') || p.startsWith('31')) return 'NL';
      if (p.startsWith('+32') || p.startsWith('32')) return 'BE';
      if (p.startsWith('+44') || p.startsWith('44')) return 'GB';
    }
    if (lead.email) {
      const em = String(lead.email).toLowerCase().trim();
      if (em.endsWith('.es')) return 'ES';
      if (em.endsWith('.pt')) return 'PT';
      if (em.endsWith('.fr')) return 'FR';
      if (em.endsWith('.de')) return 'DE';
      if (em.endsWith('.it')) return 'IT';
      if (em.endsWith('.nl')) return 'NL';
      if (em.endsWith('.be')) return 'BE';
      if (em.endsWith('.uk') || em.endsWith('.co.uk')) return 'GB';
    }
    if (Array.isArray(lead.tags)) {
      const tagStr = lead.tags.join(' ').toLowerCase();
      if (tagStr.includes('portugal') || tagStr.includes('🇵🇹')) return 'PT';
      if (tagStr.includes('frança') || tagStr.includes('france') || tagStr.includes('🇫🇷')) return 'FR';
      if (tagStr.includes('alemanha') || tagStr.includes('germany') || tagStr.includes('🇩🇪')) return 'DE';
      if (tagStr.includes('itália') || tagStr.includes('italia') || tagStr.includes('italy') || tagStr.includes('🇮🇹')) return 'IT';
      if (tagStr.includes('holanda') || tagStr.includes('netherlands') || tagStr.includes('🇳🇱')) return 'NL';
      if (tagStr.includes('bélgica') || tagStr.includes('belgium') || tagStr.includes('🇧🇪')) return 'BE';
      if (tagStr.includes('reino unido') || tagStr.includes('uk') || tagStr.includes('gb') || tagStr.includes('🇬🇧')) return 'GB';
    }
    if (lead.province && typeof lead.province === 'string') {
      const provStr = lead.province.toLowerCase();
      if (provStr.includes('(mi)') || provStr.includes('(bs)') || provStr.includes('(bg)') || provStr.includes('(va)') || provStr.includes('(to)') || provStr.includes('(vi)') || provStr.includes('(vr)') || provStr.includes('(tv)') || provStr.includes('(bo)') || provStr.includes('(ra)') || provStr.includes('(lu)') || provStr.includes('(ge)') || provStr.includes('(ts)') || provStr.includes('(li)')) {
        return 'IT';
      }
    }
    return 'ES';
  };

  const countryLabels: Record<string, { name: string; flag: string }> = {
    ES: { name: 'Espanha', flag: '🇪🇸' },
    PT: { name: 'Portugal', flag: '🇵🇹' },
    FR: { name: 'França', flag: '🇫🇷' },
    DE: { name: 'Alemanha', flag: '🇩🇪' },
    IT: { name: 'Itália', flag: '🇮🇹' },
    NL: { name: 'Holanda', flag: '🇳🇱' },
    BE: { name: 'Bélgica', flag: '🇧🇪' },
    GB: { name: 'Reino Unido', flag: '🇬🇧' },
    OTHER: { name: 'Outros', flag: '🌍' },
  };

  const countryCounts = {
    total: leads.length,
    ES: leads.filter((l) => detectLeadCountry(l) === 'ES').length,
    PT: leads.filter((l) => detectLeadCountry(l) === 'PT').length,
    FR: leads.filter((l) => detectLeadCountry(l) === 'FR').length,
    DE: leads.filter((l) => detectLeadCountry(l) === 'DE').length,
    IT: leads.filter((l) => detectLeadCountry(l) === 'IT').length,
    NL: leads.filter((l) => detectLeadCountry(l) === 'NL').length,
    BE: leads.filter((l) => detectLeadCountry(l) === 'BE').length,
    GB: leads.filter((l) => detectLeadCountry(l) === 'GB').length,
    OTHER: leads.filter((l) => detectLeadCountry(l) === 'OTHER').length,
  };

  const availableSectors = Array.from(
    new Set(leads.map((l) => normalizeSectorName(l.sector)).filter(Boolean))
  );

  const availableCompanySizes = [
    { label: '🏢 Gran Empresa (Tier 1)', value: 'Gran Empresa (Tier 1)' },
    { label: '🏭 Mediana Empresa (Tier 2)', value: 'Mediana Empresa (Tier 2)' },
    { label: '⚙️ Taller / Pequeña (Tier 3)', value: 'Pequeña Empresa / Taller (Tier 3)' },
  ];

  const availableRegions = Array.from(
    new Set(leads.map((l: any) => l.region).filter(Boolean))
  ).sort() as string[];

  const availableProvinces = Array.from(
    new Set(leads.map((l: any) => l.province).filter(Boolean))
  ).sort() as string[];

  const sectorCounts = {
    total: leads.length,
    naval: leads.filter((l) => normalizeSectorName(l.sector) === 'Construção & Reparação Naval').length,
    caldereria: leads.filter((l) => normalizeSectorName(l.sector) === 'Calderería & Tubería Industrial').length,
    estructuras: leads.filter((l) => normalizeSectorName(l.sector) === 'Estructuras Metálicas & Montajes').length,
    quimica: leads.filter((l) => normalizeSectorName(l.sector) === 'Industria Química & Petroquímica').length,
    geral: leads.filter((l) => normalizeSectorName(l.sector) === 'Industrial Geral').length,
  };

  const handleExportExcel = () => {
    if (filteredLeads.length === 0) {
      toast.error('Nenhum lead disponível para exportação com os filtros atuais.');
      return;
    }

    const exportData = filteredLeads.map((l) => {
      const cCode = detectLeadCountry(l);
      const cInfo = countryLabels[cCode] || countryLabels.ES;
      return {
        'Empresa / Organização': l.company_name || 'N/A',
        'Porte / Tamanho': (l as any).company_size || 'N/D',
        'Região / Comunidade': (l as any).region || 'N/D',
        'Província': l.province || '',
        'Cidade': l.city || '',
        'País': `${cInfo.flag} ${cInfo.name}`,
        'Setor': normalizeSectorName(l.sector),
        'Nome do Contato': l.name || 'N/A',
        'E-mail': l.email || 'N/A',
        'Telefone': l.phone || 'N/A',
        'Origem Lead': l.origen_lead || 'AIsa Prospecting',
        'Website': l.website || '',
        'LinkedIn': l.linkedin_url || '',
        'Data Cadastro': l.created_at ? new Date(l.created_at).toLocaleDateString() : '',
        'Observações': l.notes || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Qualificados');

    const sectorSlug = selectedSector === 'all' ? 'Todos_Setores' : selectedSector.replace(/[^a-zA-Z0-9]/g, '_');
    const countrySlug = selectedCountry === 'all' ? 'Global' : selectedCountry;
    const fileName = `Leads_Marketing_${countrySlug}_${sectorSlug}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success(`Exportados ${filteredLeads.length} leads em Excel (.xlsx) com sucesso!`);
  };

  const filteredLeads = leads.filter((lead: any) => {
    const leadNormSector = normalizeSectorName(lead.sector);
    if (selectedSector !== 'all' && leadNormSector !== selectedSector) return false;
    if (selectedCountry !== 'all' && detectLeadCountry(lead) !== selectedCountry) return false;
    if (selectedCompanySize !== 'all') {
      const sizeStr = lead.company_size || '';
      const inTags = Array.isArray(lead.tags) && lead.tags.includes(selectedCompanySize);
      if (sizeStr !== selectedCompanySize && !inTags) return false;
    }
    if (selectedRegion !== 'all') {
      const regStr = lead.region || '';
      const inTags = Array.isArray(lead.tags) && lead.tags.includes(selectedRegion);
      if (regStr !== selectedRegion && !inTags) return false;
    }
    if (selectedProvince !== 'all' && lead.province !== selectedProvince) return false;

    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search) ||
      (lead.company_name && lead.company_name.toLowerCase().includes(search)) ||
      (lead.phone && lead.phone.includes(search)) ||
      (lead.city && lead.city.toLowerCase().includes(search)) ||
      (lead.province && lead.province.toLowerCase().includes(search)) ||
      (lead.region && lead.region.toLowerCase().includes(search)) ||
      (lead.company_size && lead.company_size.toLowerCase().includes(search)) ||
      (lead.sector && lead.sector.toLowerCase().includes(search)) ||
      (lead.origen_lead && lead.origen_lead.toLowerCase().includes(search)) ||
      (Array.isArray(lead.tags) && lead.tags.some((t: string) => t.toLowerCase().includes(search)))
    );
  });

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (!sortField) return 0;

    let valA = a[sortField as keyof typeof a] || '';
    let valB = b[sortField as keyof typeof b] || '';

    if (sortField === 'email') {
      valA = a.email || a.phone || '';
      valB = b.email || b.phone || '';
    }

    if (typeof valA === 'string') valA = valA.toLowerCase().trim();
    if (typeof valB === 'string') valB = valB.toLowerCase().trim();

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalLeadPages = Math.ceil(sortedLeads.length / itemsPerPage);
  const paginatedSortedLeads = sortedLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : i18n.resolvedLanguage === 'es' ? 'es-ES' : 'pt-PT';
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserPlus className="h-8 w-8 text-yellow-500" />
            {t('comercial.leads.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('comercial.leads.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button onClick={handleExportExcel} variant="outline" className="border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel ({filteredLeads.length})
          </Button>
          <Button onClick={handleCopyNewLeadLink} variant="outline" className="border-slate-300 dark:border-slate-800">
            <Share2 className="mr-2 h-4 w-4 text-yellow-500" />
            Link de Cadastro
          </Button>
          <Button onClick={handleCopyNewBudgetLink} variant="outline" className="border-slate-300 dark:border-slate-800">
            <Share2 className="mr-2 h-4 w-4 text-orange-500" />
            Link Solicitação Orçamento
          </Button>
          <Button onClick={() => setIsImportOpen(true)} variant="outline" className="border-slate-300 dark:border-slate-800">
            <FileSpreadsheet className="mr-2 h-4 w-4 text-yellow-500" />
            Importar Planilha
          </Button>
          <Button onClick={handleOpenCreate} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold shadow-lg shadow-yellow-500/10">
            <Plus className="mr-2 h-4 w-4" />
            {t('comercial.leads.btnNew')}
          </Button>
        </div>
      </div>

      {/* Premium Executive KPI Dashboard Cards (Clickable Bento Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Base */}
        <div 
          onClick={() => setSelectedSector('all')}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden ${
            selectedSector === 'all' 
              ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30' 
              : 'bg-card hover:bg-muted/50 border-border hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Base CRM</span>
            <Building2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{sectorCounts.total}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
            Ver Todos os Leads
          </div>
        </div>

        {/* Naval */}
        <div 
          onClick={() => setSelectedSector('Construção & Reparação Naval')}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden ${
            selectedSector === 'Construção & Reparação Naval' 
              ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30' 
              : 'bg-card hover:bg-muted/50 border-border hover:border-blue-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Naval</span>
            <Ship className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">{sectorCounts.naval}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between font-medium">
            <span>Astilleros & 6G</span>
            <span className="text-blue-500 font-bold">{sectorCounts.total > 0 ? Math.round((sectorCounts.naval / sectorCounts.total) * 100) : 0}%</span>
          </div>
        </div>

        {/* Calderería */}
        <div 
          onClick={() => setSelectedSector('Calderería & Tubería Industrial')}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden ${
            selectedSector === 'Calderería & Tubería Industrial' 
              ? 'bg-amber-600/10 border-amber-600 ring-2 ring-amber-600/30' 
              : 'bg-card hover:bg-muted/50 border-border hover:border-amber-600/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Calderería</span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{sectorCounts.caldereria}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between font-medium">
            <span>Tubería Pesada</span>
            <span className="text-amber-600 font-bold">{sectorCounts.total > 0 ? Math.round((sectorCounts.caldereria / sectorCounts.total) * 100) : 0}%</span>
          </div>
        </div>

        {/* Estructuras */}
        <div 
          onClick={() => setSelectedSector('Estructuras Metálicas & Montajes')}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden ${
            selectedSector === 'Estructuras Metálicas & Montajes' 
              ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30' 
              : 'bg-card hover:bg-muted/50 border-border hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estructuras</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{sectorCounts.estructuras}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between font-medium">
            <span>Talleres & Montajes</span>
            <span className="text-emerald-500 font-bold">{sectorCounts.total > 0 ? Math.round((sectorCounts.estructuras / sectorCounts.total) * 100) : 0}%</span>
          </div>
        </div>

        {/* Química */}
        <div 
          onClick={() => setSelectedSector('Industria Química & Petroquímica')}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden ${
            selectedSector === 'Industria Química & Petroquímica' 
              ? 'bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/30' 
              : 'bg-card hover:bg-muted/50 border-border hover:border-purple-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Química</span>
            <FlaskConical className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">{sectorCounts.quimica}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between font-medium">
            <span>Paradas de Planta</span>
            <span className="text-purple-500 font-bold">{sectorCounts.total > 0 ? Math.round((sectorCounts.quimica / sectorCounts.total) * 100) : 0}%</span>
          </div>
        </div>

        {/* Industrial Geral */}
        <div 
          onClick={() => setSelectedSector('Industrial Geral')}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden ${
            selectedSector === 'Industrial Geral' 
              ? 'bg-slate-500/10 border-slate-500 ring-2 ring-slate-500/30' 
              : 'bg-card hover:bg-muted/50 border-border hover:border-slate-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Geral</span>
            <Factory className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-700 dark:text-slate-300">{sectorCounts.geral}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between font-medium">
            <span>Indústria Geral</span>
            <span className="text-slate-500 font-bold">{sectorCounts.total > 0 ? Math.round((sectorCounts.geral / sectorCounts.total) * 100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* Filters Bar: Search, Country & Sector Filters */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-card border p-3.5 rounded-xl shadow-sm justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('comercial.leads.searchPlaceholder')}
            className="pl-10 h-9 text-xs focus-visible:ring-yellow-500 focus-visible:border-yellow-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {/* Country Filter Dropdown */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Globe className="w-4 h-4 text-blue-500 shrink-0" />
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-xs font-semibold focus-visible:ring-blue-500">
                <SelectValue placeholder="Todos os Países" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌐 Todos Países ({leads.length})</SelectItem>
                <SelectItem value="ES">🇪🇸 Espanha ({countryCounts.ES})</SelectItem>
                <SelectItem value="PT">🇵🇹 Portugal ({countryCounts.PT})</SelectItem>
                <SelectItem value="FR">🇫🇷 França ({countryCounts.FR})</SelectItem>
                <SelectItem value="DE">🇩🇪 Alemanha ({countryCounts.DE})</SelectItem>
                <SelectItem value="IT">🇮🇹 Itália ({countryCounts.IT})</SelectItem>
                <SelectItem value="NL">🇳🇱 Holanda ({countryCounts.NL})</SelectItem>
                <SelectItem value="BE">🇧🇪 Bélgica ({countryCounts.BE})</SelectItem>
                <SelectItem value="GB">🇬🇧 Reino Unido ({countryCounts.GB})</SelectItem>
                <SelectItem value="OTHER">🌍 Outros ({countryCounts.OTHER})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sector Filter Dropdown */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-yellow-500 shrink-0" />
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="w-full sm:w-52 h-9 text-xs font-semibold focus-visible:ring-yellow-500">
                <SelectValue placeholder="Todos os Setores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Setores ({leads.length})</SelectItem>
                {availableSectors.map((sec, idx) => (
                  <SelectItem key={idx} value={sec!}>
                    {sec} ({leads.filter((l) => normalizeSectorName(l.sector) === sec).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Company Size Tier Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Building2 className="w-4 h-4 text-purple-500 shrink-0" />
            <Select value={selectedCompanySize} onValueChange={setSelectedCompanySize}>
              <SelectTrigger className="w-full sm:w-48 h-9 text-xs font-semibold focus-visible:ring-purple-500">
                <SelectValue placeholder="Porte da Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🏢 Todos os Portes</SelectItem>
                {availableCompanySizes.map((s, idx) => (
                  <SelectItem key={idx} value={s.value}>
                    {s.label} ({leads.filter((l: any) => l.company_size === s.value || (Array.isArray(l.tags) && l.tags.includes(s.value))).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Region / Autonomous Community Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-full sm:w-48 h-9 text-xs font-semibold focus-visible:ring-emerald-500">
                <SelectValue placeholder="Comunidade / Região" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🗺️ Todas as Regiões</SelectItem>
                {availableRegions.map((reg, idx) => (
                  <SelectItem key={idx} value={reg}>
                    {reg} ({leads.filter((l: any) => l.region === reg || (Array.isArray(l.tags) && l.tags.includes(reg))).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Province Filter */}
          {availableProvinces.length > 0 && (
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Layers className="w-4 h-4 text-cyan-500 shrink-0" />
              <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                <SelectTrigger className="w-full sm:w-44 h-9 text-xs font-semibold focus-visible:ring-cyan-500">
                  <SelectValue placeholder="Província" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📍 Todas as Províncias</SelectItem>
                  {availableProvinces.map((prov, idx) => (
                    <SelectItem key={idx} value={prov}>
                      {prov} ({leads.filter((l: any) => l.province === prov).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
      {error ? (
        <div className="p-8 border border-red-900 bg-red-950/20 text-red-400 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="font-semibold text-lg">{t('comercial.leads.errorLoad')}</h3>
            <p className="text-sm">{(error as any).message || t('comercial.leads.errorLoadDesc')}</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-xl border" />
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/10 text-center">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4 border">
            <UserPlus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">{t('comercial.leads.emptyTitle')}</h3>
          <p className="text-muted-foreground max-w-sm mb-6 text-sm">{t('comercial.leads.emptyDesc')}</p>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold"
          >
            <Plus className="h-4 w-4" />
            {t('comercial.leads.btnNew')}
          </Button>
        </div>
      ) : (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="py-3 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b">
                    {renderSortHeader('company_name', t('comercial.leads.table.company'))}
                  </th>
                  <th className="py-3 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400 font-semibold sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b">
                    {t('comercial.leads.table.sector')}
                  </th>
                  <th className="py-3 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b">
                    {renderSortHeader('name', t('comercial.leads.table.name'))}
                  </th>
                  <th className="py-3 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b">
                    {renderSortHeader('email', t('comercial.leads.table.contact'))}
                  </th>
                  <th className="py-3 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400 font-semibold sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b">
                    {t('comercial.leads.table.notes')}
                  </th>
                  <th className="py-3 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b">
                    {renderSortHeader('created_at', t('comercial.leads.table.date'))}
                  </th>
                  <th className="py-3 px-4 text-right align-middle font-medium text-slate-500 dark:text-slate-400 font-semibold sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b">
                    {t('comercial.leads.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0 bg-card">
                {paginatedSortedLeads.map((lead) => {
                  const cCode = detectLeadCountry(lead);
                  const cInfo = countryLabels[cCode] || countryLabels.ES;

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleOpenDetails(lead)}
                      className="border-b transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer group"
                    >
                      <td className="p-4 align-middle font-medium text-foreground">
                        {lead.company_name ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                <Building className="h-4 w-4 text-yellow-500 shrink-0" />
                                {lead.company_name}
                              </span>
                              <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                <span>{cInfo.flag}</span>
                                <span>{cCode}</span>
                              </span>
                              {(lead as any).company_size && (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  (lead as any).company_size.includes('Tier 1')
                                    ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800/60 shadow-sm'
                                    : (lead as any).company_size.includes('Tier 2')
                                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}>
                                  {(lead as any).company_size}
                                </span>
                              )}
                            </div>
                            {((lead as any).region || lead.city || lead.province) && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pl-5">
                                <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                                <span>
                                  {[lead.city, lead.province, (lead as any).region].filter(Boolean).join(' • ')}
                                </span>
                              </div>
                            )}
                            {lead.tags && lead.tags.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap pl-5 pt-0.5">
                                {lead.tags.slice(0, 3).map((tg, idx) => (
                                  <span key={idx} className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-medium px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/40">
                                    {tg}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 italic text-sm font-normal">{t('comercial.leads.table.noCompany')}</span>
                        )}
                      </td>
                      <td className="p-4 align-middle text-foreground/90">
                        {lead.sector ? (
                          <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-500 px-2 py-0.5 rounded text-xs font-semibold">
                            {normalizeSectorName(lead.sector)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 italic text-xs">--</span>
                        )}
                      </td>
                    <td className="p-4 align-middle text-foreground/90">
                      <span className="flex flex-col">
                        <span>{lead.name}</span>
                        {lead.cargo && (
                          <span className="text-[11px] text-muted-foreground font-normal">
                            Cargo: {lead.cargo}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="p-4 align-middle space-y-1">
                      <div className="flex items-center gap-2 text-foreground/90 text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground/75 shrink-0" />
                        <span className="hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors">{lead.email}</span>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/75 shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      )}

                      {/* Social & Web Icons */}
                      <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                        {lead.website && (
                          <a
                            href={ensureAbsoluteUrl(lead.website)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 bg-slate-100 dark:bg-slate-900 text-blue-600 dark:text-blue-400 hover:text-blue-500 rounded border border-slate-200 dark:border-slate-700"
                            title={`Website: ${lead.website}`}
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {lead.linkedin_url && (
                          <a
                            href={ensureAbsoluteUrl(lead.linkedin_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 bg-slate-100 dark:bg-slate-900 text-blue-600 dark:text-blue-400 hover:text-blue-500 rounded border border-slate-200 dark:border-slate-700"
                            title={`LinkedIn: ${lead.linkedin_url}`}
                          >
                            <Linkedin className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {lead.instagram_url && (
                          <a
                            href={ensureAbsoluteUrl(lead.instagram_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 bg-slate-100 dark:bg-slate-900 text-pink-600 dark:text-pink-400 hover:text-pink-500 rounded border border-slate-200 dark:border-slate-700"
                            title={`Instagram: ${lead.instagram_url}`}
                          >
                            <Instagram className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground max-w-xs text-sm">
                      <div className="flex flex-col gap-1">
                        {lead.servicio_producto && (
                          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                            Produto: {lead.servicio_producto}
                          </span>
                        )}
                        {lead.origen_lead && (
                          <span className="text-[11px] font-medium text-slate-500">
                            Origem: {lead.origen_lead}
                          </span>
                        )}
                        <span className="truncate">
                          {lead.notes || <span className="text-muted-foreground/50 italic">{t('comercial.leads.table.noNotes')}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground/75 shrink-0" />
                        <span>{formatDate(lead.created_at)}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetails(lead);
                          }}
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                          title="Ver Detalhes Premium do Lead"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {lead.client_id ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 mr-1">
                            Convertido
                          </span>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenConvert(lead);
                              }}
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              title="Converter em Cliente"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyCollectionLink(lead);
                              }}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              title="Copiar Link de Coleta"
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyBudgetLink(lead);
                              }}
                              className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                              title="Copiar Link Solicitação Orçamento"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(lead);
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title={t('comercial.leads.tooltips.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDelete(lead);
                          }}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title={t('comercial.leads.tooltips.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {totalLeadPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card border rounded-xl p-4 shadow-sm mt-4">
          <span className="text-xs text-muted-foreground">
            Mostrando <strong className="text-slate-700 dark:text-slate-350">{Math.min(sortedLeads.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(sortedLeads.length, currentPage * itemsPerPage)}</strong> de <strong className="text-slate-700 dark:text-slate-350">{sortedLeads.length}</strong> leads
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="h-8 text-xs px-3 font-semibold"
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-muted-foreground">Página</span>
              <span className="bg-slate-100 dark:bg-slate-950 border px-2.5 py-1 rounded text-slate-800 dark:text-slate-200">
                {currentPage}
              </span>
              <span className="text-muted-foreground">de {totalLeadPages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalLeadPages}
              onClick={() => setCurrentPage(p => Math.min(totalLeadPages, p + 1))}
              className="h-8 text-xs px-3 font-semibold"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-yellow-500" />
              {selectedLead ? t('comercial.leads.form.titleEdit') : t('comercial.leads.form.titleCreate')}
            </DialogTitle>
            <DialogDescription>
              {t('comercial.leads.form.desc')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="company_name">{t('comercial.leads.form.companyName')}</Label>
              <Input
                id="company_name"
                required
                placeholder={t('comercial.leads.form.companyNamePlaceholder')}
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="focus-visible:ring-yellow-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresa_id">{t('comercial.leads.form.groupCompany')}</Label>
              <Select
                value={formData.empresa_id}
                onValueChange={(val) => setFormData({ ...formData, empresa_id: val })}
              >
                <SelectTrigger id="empresa_id" className="focus-visible:ring-yellow-500">
                  <SelectValue placeholder={t('comercial.leads.form.groupCompanyPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.trade_name || emp.legal_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('comercial.leads.form.contactName')}</Label>
              <Input
                id="name"
                required
                placeholder={t('comercial.leads.form.contactNamePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="focus-visible:ring-yellow-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('comercial.leads.form.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder={t('comercial.leads.form.emailPlaceholder')}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="focus-visible:ring-yellow-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('comercial.leads.form.phone')}</Label>
                <Input
                  id="phone"
                  required
                  placeholder={t('comercial.leads.form.phonePlaceholder')}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="focus-visible:ring-yellow-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sector">Setor da Empresa</Label>
                <Input
                  id="sector"
                  placeholder="Ex: Indústria"
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  className="focus-visible:ring-yellow-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo / Puesto</Label>
                <Input
                  id="cargo"
                  placeholder="Ex: Gerente de Compras"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  className="focus-visible:ring-yellow-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="servicio_producto">Serviço / Produto de Interesse</Label>
                <Input
                  id="servicio_producto"
                  placeholder="Ex: Mão de Obra de Solda"
                  value={formData.servicio_producto}
                  onChange={(e) => setFormData({ ...formData, servicio_producto: e.target.value })}
                  className="focus-visible:ring-yellow-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="origen_lead">Origem do Lead</Label>
                <Input
                  id="origen_lead"
                  placeholder="Ex: Campanha de E-mail"
                  value={formData.origen_lead}
                  onChange={(e) => setFormData({ ...formData, origen_lead: e.target.value })}
                  className="focus-visible:ring-yellow-500"
                />
              </div>
            </div>

            {/* Presença Web & Redes Sociais */}
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-1.5 text-xs font-semibold">
                <Globe className="w-3.5 h-3.5 text-blue-500" /> Website Oficial
              </Label>
              <Input
                id="website"
                placeholder="https://www.empresa.es"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="focus-visible:ring-yellow-500 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin_url" className="flex items-center gap-1.5 text-xs font-semibold">
                  <Linkedin className="w-3.5 h-3.5 text-blue-600" /> LinkedIn B2B
                </Label>
                <Input
                  id="linkedin_url"
                  placeholder="https://www.linkedin.com/company/empresa"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  className="focus-visible:ring-yellow-500 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram_url" className="flex items-center gap-1.5 text-xs font-semibold">
                  <Instagram className="w-3.5 h-3.5 text-pink-500" /> Instagram
                </Label>
                <Input
                  id="instagram_url"
                  placeholder="https://www.instagram.com/empresa"
                  value={formData.instagram_url}
                  onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                  className="focus-visible:ring-yellow-500 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="flex items-center gap-1.5 text-xs font-semibold">
                <Tag className="w-3.5 h-3.5 text-blue-500" /> Tags de Público Alvo (separadas por vírgula)
              </Label>
              <Input
                id="tags"
                placeholder="ex: Caldererías Zaragoza, Indústria Q3"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="focus-visible:ring-yellow-500 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('comercial.leads.form.notes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('comercial.leads.form.notesPlaceholder')}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-[100px] focus-visible:ring-yellow-500 text-xs"
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                {t('comercial.leads.form.btnCancel')}
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold">
                {isCreating || isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('comercial.leads.form.btnSaving')}
                  </>
                ) : (
                  t('comercial.leads.form.btnSave')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Premium de Detalhes do Lead */}
      {isDetailsOpen && selectedDetailLead && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[650px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedDetailLead.company_name || selectedDetailLead.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {selectedDetailLead.tags && selectedDetailLead.tags.map((tg, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-300 dark:border-blue-700/50">
                          <Tag className="w-2.5 h-2.5" /> {tg}
                        </span>
                      ))}
                      {selectedDetailLead.origen_lead && (
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          Origem: {selectedDetailLead.origen_lead}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* Contact & Social Links Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-2">
                  <div className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-500" /> E-mail de Contato
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm select-all">
                    {selectedDetailLead.email || 'Não informado'}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" /> Telefone / WhatsApp
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm select-all">
                    {selectedDetailLead.phone || 'Não informado'}
                  </div>
                </div>

                {/* Social & Web Buttons */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold mr-2">Presença Web:</span>
                  {selectedDetailLead.website ? (
                    <a
                      href={ensureAbsoluteUrl(selectedDetailLead.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-lg font-medium transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" /> Website Oficial
                    </a>
                  ) : null}

                  {selectedDetailLead.linkedin_url ? (
                    <a
                      href={ensureAbsoluteUrl(selectedDetailLead.linkedin_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 dark:text-blue-300 border border-blue-600/30 rounded-lg font-medium transition-colors"
                    >
                      <Linkedin className="w-3.5 h-3.5" /> LinkedIn B2B
                    </a>
                  ) : null}

                  {selectedDetailLead.instagram_url ? (
                    <a
                      href={ensureAbsoluteUrl(selectedDetailLead.instagram_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/30 rounded-lg font-medium transition-colors"
                    >
                      <Instagram className="w-3.5 h-3.5" /> Instagram
                    </a>
                  ) : null}

                  {!selectedDetailLead.website && !selectedDetailLead.linkedin_url && !selectedDetailLead.instagram_url && (
                    <span className="text-slate-400 italic">Sem links sociais mapeados</span>
                  )}
                </div>
              </div>

              {/* Location & Address Box */}
              {(selectedDetailLead.address_line || selectedDetailLead.city || selectedDetailLead.province) && (
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" /> Endereço & Localização
                  </div>
                  <div className="text-slate-900 dark:text-slate-100 font-medium">
                    {selectedDetailLead.address_line && <div>{selectedDetailLead.address_line}</div>}
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      {[selectedDetailLead.city, selectedDetailLead.province, 'Espanha'].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Notes Section */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-500" /> Observações & Histórico de Prospecção
                </div>
                <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-mono text-[11px] bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  {selectedDetailLead.notes || 'Sem observações registradas.'}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Fechar
              </Button>
              <Button
                variant="default"
                className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
                onClick={() => {
                  setIsDetailsOpen(false);
                  handleOpenEdit(selectedDetailLead);
                }}
              >
                <Edit className="w-4 h-4 mr-1.5" /> Editar Lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              {t('comercial.leads.delete.title')}
            </DialogTitle>
            <DialogDescription>
              {t('comercial.leads.delete.desc', { name: selectedLead?.name })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              {t('comercial.leads.form.btnCancel')}
            </Button>
            <Button onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
              {isDeleting ? t('comercial.leads.delete.btnConfirming') : t('comercial.leads.delete.btnConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Lead to Client Modal */}
      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-emerald-600">
              <UserCheck className="h-5 w-5" />
              Converter Lead em Cliente
            </DialogTitle>
            <DialogDescription>
              Verifique e complete as informações do cliente para contratos e faturamento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConvert} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conv_trade_name">Nome Fantasia *</Label>
                <Input
                  id="conv_trade_name"
                  required
                  placeholder="Ex: Mastercorp Portugal"
                  value={conversionData.trade_name}
                  onChange={(e) => setFormData ? setConversionData({ ...conversionData, trade_name: e.target.value }) : null}
                  className="focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conv_legal_name">Razão Social *</Label>
                <Input
                  id="conv_legal_name"
                  required
                  placeholder="Ex: Mastercorp S.A."
                  value={conversionData.legal_name}
                  onChange={(e) => setConversionData({ ...conversionData, legal_name: e.target.value })}
                  className="focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conv_tax_id">NIF / CIF / CPF *</Label>
                <Input
                  id="conv_tax_id"
                  required
                  placeholder="Ex: 500123456"
                  value={conversionData.tax_id}
                  onChange={(e) => setConversionData({ ...conversionData, tax_id: e.target.value })}
                  className="focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conv_payment_term">Prazo de Pagamento</Label>
                <Select
                  value={conversionData.payment_term_id}
                  onValueChange={(val) => setConversionData({ ...conversionData, payment_term_id: val })}
                >
                  <SelectTrigger id="conv_payment_term" className="focus-visible:ring-emerald-500">
                    <SelectValue placeholder="Selecione o prazo de pagamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / A combinar</SelectItem>
                    {paymentTerms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conv_email">E-mail de Contato</Label>
                <Input
                  id="conv_email"
                  type="email"
                  placeholder="Ex: contato@empresa.com"
                  value={conversionData.email}
                  onChange={(e) => setConversionData({ ...conversionData, email: e.target.value })}
                  className="focus-visible:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conv_billing_email">E-mail Financeiro</Label>
                <Input
                  id="conv_billing_email"
                  type="email"
                  placeholder="Ex: financeiro@empresa.com"
                  value={conversionData.billing_email}
                  onChange={(e) => setConversionData({ ...conversionData, billing_email: e.target.value })}
                  className="focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conv_phone">Telefone</Label>
              <Input
                id="conv_phone"
                placeholder="Ex: +351 912 345 678"
                value={conversionData.phone}
                onChange={(e) => setConversionData({ ...conversionData, phone: e.target.value })}
                className="focus-visible:ring-emerald-500"
              />
            </div>

            <div className="border-t pt-4 mt-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Endereço</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>País</Label>
                  <CountrySelector
                    value={conversionData.country_id || null}
                    onChange={(val) => setConversionData({ ...conversionData, country_id: val || '', region_id: '' })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Região</Label>
                  <RegionSelector
                    countryId={conversionData.country_id || null}
                    value={conversionData.region_id || null}
                    onChange={(val) => setConversionData({ ...conversionData, region_id: val || '' })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="conv_province">Província</Label>
                  <Input
                    id="conv_province"
                    placeholder="Ex: Madrid"
                    value={conversionData.province}
                    onChange={(e) => setConversionData({ ...conversionData, province: e.target.value })}
                    className="focus-visible:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conv_city">Cidade</Label>
                  <Input
                    id="conv_city"
                    placeholder="Ex: Lisboa"
                    value={conversionData.city}
                    onChange={(e) => setConversionData({ ...conversionData, city: e.target.value })}
                    className="focus-visible:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conv_postal_code">Código Postal</Label>
                  <Input
                    id="conv_postal_code"
                    placeholder="Ex: 1000-001"
                    value={conversionData.postal_code}
                    onChange={(e) => setConversionData({ ...conversionData, postal_code: e.target.value })}
                    className="focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conv_address_line">Logradouro completo</Label>
                <Input
                  id="conv_address_line"
                  placeholder="Ex: Av. da Liberdade, 123"
                  value={conversionData.address_line}
                  onChange={(e) => setConversionData({ ...conversionData, address_line: e.target.value })}
                  className="focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t sticky bottom-0 bg-background pb-2">
              <Button type="button" variant="outline" onClick={() => setIsConvertOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6">
                Confirmar e Criar Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Spreadsheet Import Modal */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-[800px] lg:max-w-[950px] max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle>Importar Leads de Planilha</DialogTitle>
            <DialogDescription>
              Faça upload de uma planilha Excel (.xlsx, .xls) ou CSV, mapeie as colunas e realize a importação em lote com validação automática.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 max-h-[62vh]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Upload & Mapping Selectors (col-span-7) */}
              <div className="md:col-span-7 space-y-4">
                {/* Step 1: Upload File */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Selecionar Arquivo</Label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-850 rounded-xl p-5 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex flex-col justify-center items-center gap-2"
                  >
                    <FileUp className="h-8 w-8 text-yellow-500" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {importFileName || 'Arraste ou clique para selecionar planilha'}
                    </span>
                    <span className="text-[10px] text-slate-500">Formatos aceitos: .xlsx, .xls ou .csv</span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Option to update existing leads */}
                <div className="flex items-center space-x-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl p-3">
                  <input
                    type="checkbox"
                    id="chkUpdateExisting"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500/20 h-4 w-4 cursor-pointer"
                  />
                  <Label htmlFor="chkUpdateExisting" className="cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Atualizar dados de leads existentes se o e-mail já estiver cadastrado no CRM
                  </Label>
                </div>

                {/* Step 2: Mapping columns (shows up if file is uploaded) */}
                {fileHeaders.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">Mapeamento de Colunas (ETL)</h4>
                      <p className="text-[11px] text-slate-500">Associe as colunas do seu arquivo aos campos correspondentes do lead.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Nome do Contato (Opcional)</Label>
                        <select
                          className="w-full border rounded p-1.5 text-xs bg-background"
                          value={mappings.nameCol}
                          onChange={(e) => setMappings({ ...mappings, nameCol: e.target.value })}
                        >
                          <option value="">Nenhum / Opcional</option>
                          {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Nome da Empresa *</Label>
                        <select
                          className="w-full border rounded p-1.5 text-xs bg-background"
                          value={mappings.companyCol}
                          onChange={(e) => setMappings({ ...mappings, companyCol: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">E-mail do Lead *</Label>
                        <select
                          className="w-full border rounded p-1.5 text-xs bg-background"
                          value={mappings.emailCol}
                          onChange={(e) => setMappings({ ...mappings, emailCol: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Telefone (Opcional)</Label>
                        <select
                          className="w-full border rounded p-1.5 text-xs bg-background"
                          value={mappings.phoneCol}
                          onChange={(e) => setMappings({ ...mappings, phoneCol: e.target.value })}
                        >
                          <option value="">Nenhum</option>
                          {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Setor da Empresa (Opcional)</Label>
                        <select
                          className="w-full border rounded p-1.5 text-xs bg-background"
                          value={mappings.sectorCol}
                          onChange={(e) => setMappings({ ...mappings, sectorCol: e.target.value })}
                        >
                          <option value="">Nenhum</option>
                          {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Cargo / Puesto (Opcional)</Label>
                        <select
                          className="w-full border rounded p-1.5 text-xs bg-background"
                          value={mappings.cargoCol}
                          onChange={(e) => setMappings({ ...mappings, cargoCol: e.target.value })}
                        >
                          <option value="">Nenhum</option>
                          {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Serviço / Produto (Opcional)</Label>
                        <select
                          className="w-full border rounded p-1.5 text-xs bg-background"
                          value={mappings.serviceCol}
                          onChange={(e) => setMappings({ ...mappings, serviceCol: e.target.value })}
                        >
                          <option value="">Nenhum</option>
                          {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Origem do Lead (Opcional)</Label>
                        <select
                          className="w-full border rounded p-1.5 text-xs bg-background"
                          value={mappings.originCol}
                          onChange={(e) => setMappings({ ...mappings, originCol: e.target.value })}
                        >
                          <option value="">Nenhum</option>
                          {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Observações / Notas / Próximo Passo (Opcional)</Label>
                      <select
                        className="w-full border rounded p-1.5 text-xs bg-background"
                        value={mappings.notesCol}
                        onChange={(e) => setMappings({ ...mappings, notesCol: e.target.value })}
                      >
                        <option value="">Nenhum</option>
                        {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: ETL Analysis Dashboard (col-span-5) */}
              <div className="md:col-span-5 flex flex-col justify-start space-y-4 border-t md:border-t-0 md:border-l md:pl-6 pt-4 md:pt-0">
                {isAnalyzing ? (
                  <div className="h-full min-h-[220px] flex flex-col justify-center items-center text-center p-6 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed text-muted-foreground text-xs gap-2.5">
                    <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Verificando e-mails na rede de DNS...</span>
                    <span className="text-[11px] leading-relaxed text-slate-500">
                      Validando a sintaxe dos e-mails, corrigindo erros comuns de digitação (typos), descartando domínios temporários e consultando servidores MX em tempo real.
                    </span>
                  </div>
                ) : fileHeaders.length > 0 && etlResult && etlResult.analyzed ? (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <FileSpreadsheet className="h-4 w-4 text-yellow-500" />
                      Resultado da Análise ETL
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-slate-50 dark:bg-slate-900 border p-2.5 rounded-lg flex flex-col justify-center">
                        <span className="text-[10px] text-muted-foreground">Linhas no Arquivo</span>
                        <span className="text-lg font-bold text-slate-850 dark:text-slate-100">{etlResult.total}</span>
                      </div>
                      
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-2.5 rounded-lg flex flex-col justify-center">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Aceitáveis para Envio</span>
                        <span className="text-lg font-bold text-emerald-700 dark:text-emerald-450">{etlResult.valid.length}</span>
                      </div>

                      <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-2.5 rounded-lg flex flex-col justify-center">
                        <span className="text-[10px] text-rose-600 dark:text-rose-455 font-semibold">Incompletos / Inválidos</span>
                        <span className="text-lg font-bold text-rose-700 dark:text-rose-400">{etlResult.invalidCount}</span>
                      </div>

                      <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-2.5 rounded-lg flex flex-col justify-center">
                        <span className="text-[10px] text-amber-600 dark:text-amber-455 font-semibold">Duplicados Descartados</span>
                        <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                          {etlResult.duplicateCount + etlResult.dbDuplicateCount}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground space-y-1 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                      <div className="flex justify-between">
                        <span>• Novos cadastros (inserir):</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-450">
                          {etlResult.valid.filter(l => !l.id).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Cadastros existentes (atualizar):</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-450">
                          {etlResult.valid.filter(l => l.id).length}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span>• E-mails duplicados na planilha:</span>
                        <span className="font-semibold">{etlResult.duplicateCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Já cadastrados (ignorados):</span>
                        <span className="font-semibold">{etlResult.dbDuplicateCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Linhas inválidas / Sem servidor de e-mail:</span>
                        <span className="font-semibold">{etlResult.invalidCount}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[220px] flex flex-col justify-center items-center text-center p-6 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed text-muted-foreground text-xs">
                    <FileSpreadsheet className="h-8 w-8 mb-2 text-slate-400" />
                    <span>Mapeie os campos obrigatórios (* Empresa e * E-mail) para exibir os dados de ETL e de-duplicação em tempo real.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsImportOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleImportLeads} 
              disabled={isCreatingBatch || isAnalyzing || fileHeaders.length === 0 || !etlResult || etlResult.valid.length === 0}
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
            >
              {isCreatingBatch ? 'Processando...' : isAnalyzing ? 'Verificando...' : 'Processar Importação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
