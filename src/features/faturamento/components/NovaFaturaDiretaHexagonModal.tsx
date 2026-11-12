import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_HEXAGON_DIRECT_DESCRIPTION,
  HEXAGON_DEFAULT_LOGO_URL,
  HEXAGON_EMPRESA_ID,
  buildHexagonFacturaHtml,
  computeDirectInvoiceTotals,
  formatMoneyEs,
  getDefaultNotaLegalForMode,
  renderHexagonFacturaPDF,
  type DirectInvoiceLineItem,
  type HexagonIvaMode,
} from '@/features/faturamento/utils/hexagonFacturaTemplate';
import {
  getDadosIniciaisFaturaDiretaHexagon,
  salvarFaturaDiretaHexagon,
} from '@/features/faturamento/api/faturamentoApi';

export interface NovaFaturaDiretaHexagonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMonth?: number; // 1-12
  defaultYear?: number;
  editingFatura?: any | null;
  onSuccess?: (result: {
    fatura: any;
    periodMonth: number;
    periodYear: number;
    openedTracking?: boolean;
  }) => void;
}

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DESCRIPTION_PRESETS = [
  {
    label: 'Modelo Completo (Wiseowe)',
    text: DEFAULT_HEXAGON_DIRECT_DESCRIPTION,
  },
  {
    label: 'Serviços Administrativos e Apontamentos',
    text: 'Prestación de servicios administrativos, gestión operativa y control de apuntes técnicos.',
  },
  {
    label: 'Serviços Comerciais e Apoio Operacional',
    text: 'Prestación de servicios comerciales, coordinación logística, gestión documental y soporte operativo.',
  },
];

function formatDatePtEs(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return ymd || '';
  const [y, m, d] = ymd.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function addDaysYmd(baseYmd: string, days: number): string {
  const clean = /^\d{4}-\d{2}-\d{2}/.test(baseYmd)
    ? baseYmd.slice(0, 10)
    : new Date().toISOString().split('T')[0];
  const dt = new Date(`${clean}T12:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().split('T')[0];
}

function parseFlexibleNumber(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const s = String(val || '').trim();
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) {
    // e.g. 56.954,14 -> 56954.14
    const normalized = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  }
  if (s.includes(',')) {
    const n = parseFloat(s.replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export const NovaFaturaDiretaHexagonModal: React.FC<NovaFaturaDiretaHexagonModalProps> = ({
  open,
  onOpenChange,
  defaultMonth,
  defaultYear,
  editingFatura,
  onSuccess,
}) => {
  const todayYmd = useMemo(() => new Date().toISOString().split('T')[0], []);
  const initialMonth = defaultMonth && defaultMonth >= 1 && defaultMonth <= 12 ? defaultMonth : new Date().getMonth() + 1;
  const initialYear = defaultYear && defaultYear >= 2020 ? defaultYear : new Date().getFullYear();

  const [isLoadingInit, setIsLoadingInit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [hexagonEmpresa, setHexagonEmpresa] = useState<any | null>(null);
  const [empresasGrupo, setEmpresasGrupo] = useState<any[]>([]);
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [countriesList, setCountriesList] = useState<Array<{ id: string; iso2: string; name: string }>>([]);

  // Recipient selection
  const [recipientMode, setRecipientMode] = useState<'empresa_grupo' | 'client' | 'novo_cliente'>('empresa_grupo');
  const [selectedEmpresaGrupoId, setSelectedEmpresaGrupoId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState<string>('');

  // Quick new client fields
  const [novoLegalName, setNovoLegalName] = useState('');
  const [novoTradeName, setNovoTradeName] = useState('');
  const [novoTaxId, setNovoTaxId] = useState('');
  const [novoCountryIso2, setNovoCountryIso2] = useState('PT');
  const [novoAddress, setNovoAddress] = useState('');
  const [novoPostalCode, setNovoPostalCode] = useState('');
  const [novoCity, setNovoCity] = useState('');
  const [novoEmail, setNovoEmail] = useState('');

  // Invoice metadata
  const [faturaNumero, setFaturaNumero] = useState('');
  const [dataEmissao, setDataEmissao] = useState(todayYmd);
  const [dataVencimento, setDataVencimento] = useState(todayYmd);
  const [periodMonth, setPeriodMonth] = useState<number>(initialMonth);
  const [periodYear, setPeriodYear] = useState<number>(initialYear);
  const [obra, setObra] = useState('');

  // Tax / IVA mode
  const [ivaMode, setIvaMode] = useState<HexagonIvaMode>('iva_incluido');
  const [notaLegalIva, setNotaLegalIva] = useState<string>(getDefaultNotaLegalForMode('iva_incluido', 21));
  const [notaLegalTouched, setNotaLegalTouched] = useState(false);

  // Line items (storing raw text for smooth typing of comma decimals)
  const [lineItems, setLineItems] = useState<
    Array<{
      id: string;
      descricao: string;
      subdescricao: string;
      quantidadeStr: string;
      valorUnitarioStr: string;
    }>
  >([
    {
      id: '1',
      descricao: DEFAULT_HEXAGON_DIRECT_DESCRIPTION,
      subdescricao: '',
      quantidadeStr: '1',
      valorUnitarioStr: '',
    },
  ]);

  // Payment & IBAN
  const [formaPagamento, setFormaPagamento] = useState('Transferencia Bancaria');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [salvarIbanPadrao, setSalvarIbanPadrao] = useState(true);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Load initial data when modal opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const load = async () => {
      setIsLoadingInit(true);
      try {
        const res = await getDadosIniciaisFaturaDiretaHexagon();
        if (cancelled) return;

        setHexagonEmpresa(res.hexagonEmpresa);
        setEmpresasGrupo(res.empresasGrupo);
        setClientesList(res.clientes);
        setCountriesList(res.countries);

        const defaultBankDetails =
          (res.hexagonEmpresa?.bank_details ? String(res.hexagonEmpresa.bank_details).trim() : '') ||
          (res.hexagonEmpresa?.iban ? String(res.hexagonEmpresa.iban).trim() : '') ||
          '';

        if (editingFatura) {
          const adj = editingFatura.ajustes_json || editingFatura.ajustesJson || {};
          const fatClientId = editingFatura.client_id || editingFatura.clientId || '';

          setRecipientMode('client');
          setSelectedClientId(fatClientId);
          setFaturaNumero(editingFatura.fatura_numero || editingFatura.faturaNumero || '');

          const emStr = String(editingFatura.data_emissao || editingFatura.dataEmissaoFatura || adj.data_emissao || todayYmd).slice(0, 10);
          const vcStr = String(adj.data_vencimento || editingFatura.data_vencimento || emStr).slice(0, 10);
          setDataEmissao(emStr);
          setDataVencimento(vcStr);

          setPeriodMonth(Number(adj.period_month || initialMonth));
          setPeriodYear(Number(adj.period_year || initialYear));
          setObra(adj.obra && adj.obra !== 'SIN OBRA' ? String(adj.obra) : '');

          const savedMode: HexagonIvaMode =
            adj.iva_mode || (Number(adj.iva_pct || 0) > 0 ? 'iva_incluido' : 'exento_intracomunitario');
          setIvaMode(savedMode);
          setNotaLegalIva(adj.nota_legal_iva || getDefaultNotaLegalForMode(savedMode, 21));
          setNotaLegalTouched(Boolean(adj.nota_legal_iva));

          if (Array.isArray(adj.itens_manuais) && adj.itens_manuais.length > 0) {
            setLineItems(
              adj.itens_manuais.map((it: any, idx: number) => ({
                id: String(it.id || idx + 1),
                descricao: it.descricao || DEFAULT_HEXAGON_DIRECT_DESCRIPTION,
                subdescricao: it.subdescricao || '',
                quantidadeStr: String(it.quantidade ?? 1),
                valorUnitarioStr: String(it.valorUnitario ?? 0).replace('.', ','),
              }))
            );
          } else {
            const valNum = adj.valor_digitado ?? adj.total_valor ?? adj.total_valor_base ?? 0;
            setLineItems([
              {
                id: '1',
                descricao: adj.descricao_servico || DEFAULT_HEXAGON_DIRECT_DESCRIPTION,
                subdescricao: adj.detalhes_apontamentos || '',
                quantidadeStr: String(adj.quantidade ?? 1),
                valorUnitarioStr: valNum ? String(valNum).replace('.', ',') : '',
              },
            ]);
          }

          setFormaPagamento(adj.forma_pagamento || 'Transferencia Bancaria');
          const savedBank = adj.iban
            ? adj.bic && !/bic|swift/i.test(String(adj.iban))
              ? `${adj.iban}\nBIC: ${adj.bic}`
              : String(adj.iban)
            : defaultBankDetails;
          setIban(savedBank);
          setBic('');
          setSalvarIbanPadrao(false);
        } else {
          // Fresh creation defaults
          setFaturaNumero(res.suggestedInvoiceNumber);
          setDataEmissao(todayYmd);
          setDataVencimento(todayYmd);
          setPeriodMonth(initialMonth);
          setPeriodYear(initialYear);
          setObra('');
          setFormaPagamento('Transferencia Bancaria');
          setIban(defaultBankDetails);
          setBic('');
          setSalvarIbanPadrao(!defaultBankDetails);
          setNotaLegalTouched(false);

          // Do not pre-select any recipient in memory; require explicit selection
          setRecipientMode('client');
          setSelectedEmpresaGrupoId('');
          setIvaMode('iva_incluido');
          setNotaLegalIva(getDefaultNotaLegalForMode('iva_incluido', 21));

          setSelectedClientId('');
          setClientSearch('');
          setLineItems([
            {
              id: '1',
              descricao: DEFAULT_HEXAGON_DIRECT_DESCRIPTION,
              subdescricao: '',
              quantidadeStr: '1',
              valorUnitarioStr: '',
            },
          ]);
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados iniciais da fatura direta Hexagon:', err);
        toast.error('Não foi possível carregar empresas/clientes: ' + (err.message || 'Erro'));
      } finally {
        if (!cancelled) setIsLoadingInit(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, editingFatura, initialMonth, initialYear, todayYmd]);

  const handleChangeIvaMode = (newMode: HexagonIvaMode) => {
    setIvaMode(newMode);
    if (!notaLegalTouched) {
      setNotaLegalIva(getDefaultNotaLegalForMode(newMode, 21));
    }
  };

  const suggestTaxModeForNif = (rawTax?: string | null, countryIsoOrName?: string | null) => {
    const tax = String(rawTax || '').trim().toUpperCase();
    const country = String(countryIsoOrName || '').trim().toUpperCase();

    const isForeignEu =
      tax.startsWith('PT') ||
      tax.startsWith('FR') ||
      tax.startsWith('DE') ||
      tax.startsWith('IT') ||
      tax.startsWith('BE') ||
      tax.startsWith('NL') ||
      country === 'PT' ||
      country.includes('PORTUGAL') ||
      country.includes('FRAN');

    if (isForeignEu) {
      handleChangeIvaMode('exento_intracomunitario');
    } else if (tax.startsWith('ES') || /^[ABCDEFGHJNPQRSUVW]\d{7}/.test(tax) || country === 'ES' || country.includes('ESPA')) {
      handleChangeIvaMode('iva_incluido');
    }
  };

  const handleSelectEmpresaGrupo = (empId: string) => {
    setSelectedEmpresaGrupoId(empId);
    const emp = empresasGrupo.find((e) => e.id === empId);
    if (emp) {
      const rawTax = String(emp.tax_id || '').trim().toUpperCase();
      const looksSpanish =
        rawTax.startsWith('ES') ||
        /^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(rawTax) ||
        String(emp.postal_code || '').trim().length === 5;
      suggestTaxModeForNif(rawTax, looksSpanish ? 'ES' : 'PT');
    }
  };

  const handleSelectExistingClient = (cliId: string) => {
    setSelectedClientId(cliId);
    const cli = clientesList.find((c) => c.id === cliId);
    if (cli) {
      const cIso = cli.countries
        ? Array.isArray(cli.countries)
          ? cli.countries[0]?.iso2 || cli.countries[0]?.name
          : cli.countries.iso2 || cli.countries.name
        : '';
      suggestTaxModeForNif(cli.tax_id, cIso);
    }
  };

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clientesList.slice(0, 80);
    return clientesList
      .filter((c) => {
        const t = String(c.trade_name || '').toLowerCase();
        const l = String(c.legal_name || '').toLowerCase();
        const nif = String(c.tax_id || '').toLowerCase();
        const cod = String(c.codigo || '').toLowerCase();
        return t.includes(q) || l.includes(q) || nif.includes(q) || cod.includes(q);
      })
      .slice(0, 80);
  }, [clientesList, clientSearch]);

  const parsedItems: DirectInvoiceLineItem[] = useMemo(() => {
    return lineItems.map((li) => ({
      id: li.id,
      descricao: li.descricao,
      subdescricao: li.subdescricao,
      quantidade: Math.max(0.01, parseFlexibleNumber(li.quantidadeStr || '1')),
      unidade: 'ud',
      valorUnitario: Math.max(0, parseFlexibleNumber(li.valorUnitarioStr || '0')),
      desconto: 0,
    }));
  }, [lineItems]);

  const calculation = useMemo(() => {
    return computeDirectInvoiceTotals({
      items: parsedItems,
      ivaMode,
    });
  }, [parsedItems, ivaMode]);

  const previewRecipient = useMemo(() => {
    if (recipientMode === 'empresa_grupo') {
      const emp = empresasGrupo.find((e) => e.id === selectedEmpresaGrupoId);
      if (!emp) return { legal_name: 'SELECIONE O DESTINATÁRIO', tax_id: '—', address_line: '—', postal_code: '', city: '', country: '' };
      const rawTax = String(emp.tax_id || '').trim().toUpperCase();
      const looksSpanish =
        rawTax.startsWith('ES') ||
        /^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(rawTax) ||
        String(emp.postal_code || '').trim().length === 5;
      return {
        legal_name: emp.legal_name || emp.nome || 'EMPRESA',
        tax_id: looksSpanish ? rawTax : rawTax.startsWith('PT') ? rawTax : rawTax ? `PT${rawTax}` : '—',
        address_line: emp.address_line || '—',
        postal_code: emp.postal_code || '',
        city: emp.city || '',
        country: looksSpanish ? 'España' : 'Portugal',
        email: emp.email || '',
      };
    }

    if (recipientMode === 'client') {
      const cli = clientesList.find((c) => c.id === selectedClientId);
      if (!cli) return { legal_name: 'SELECIONE O CLIENTE', tax_id: '—', address_line: '—', postal_code: '', city: '', country: '' };
      const cName = cli.countries
        ? Array.isArray(cli.countries)
          ? cli.countries[0]?.name
          : cli.countries.name
        : cli.province || '';
      return {
        legal_name: cli.legal_name || cli.trade_name || 'CLIENTE',
        tax_id: cli.tax_id || '—',
        address_line: cli.address_line || '—',
        postal_code: cli.postal_code || '',
        city: cli.city || '',
        country: cName || '',
        email: cli.billing_email || cli.email || '',
      };
    }

    const cnt = countriesList.find((c) => c.iso2 === novoCountryIso2);
    return {
      legal_name: novoLegalName || novoTradeName || 'NOVO CLIENTE',
      tax_id: novoTaxId || '—',
      address_line: novoAddress || '—',
      postal_code: novoPostalCode || '',
      city: novoCity || '',
      country: cnt?.name || (novoCountryIso2 === 'PT' ? 'Portugal' : 'España'),
      email: novoEmail || '',
    };
  }, [
    recipientMode,
    empresasGrupo,
    selectedEmpresaGrupoId,
    clientesList,
    selectedClientId,
    countriesList,
    novoCountryIso2,
    novoLegalName,
    novoTradeName,
    novoTaxId,
    novoAddress,
    novoPostalCode,
    novoCity,
    novoEmail,
  ]);

  const previewHtml = useMemo(() => {
    const periodoRefLabel = `${MONTHS_ES[Math.max(0, Math.min(11, periodMonth - 1))]} ${periodYear}`;
    const mockFat = {
      empresa_id: HEXAGON_EMPRESA_ID,
      fatura_numero: faturaNumero || '2026/01',
      client: {
        legal_name: previewRecipient.legal_name,
        nombre_comercial: previewRecipient.legal_name,
        tax_id: previewRecipient.tax_id,
        address_line: previewRecipient.address_line,
        postal_code: previewRecipient.postal_code,
        city: previewRecipient.city,
        countryName: previewRecipient.country,
        billingEmail: previewRecipient.email,
      },
      ajustes_json: {
        sem_horas: true,
        tipo_fatura: 'direta',
        template_modelo: 'hexagon_es',
        verifactu_enabled: false,
        iva_mode: ivaMode,
        iva_pct: calculation.ivaPct,
        iva_valor: calculation.cuotaIva,
        total_valor_base: calculation.baseImponible,
        total_valor: calculation.totalFactura,
        itens_manuais: parsedItems,
        nota_legal_iva: notaLegalIva,
        forma_pagamento: formaPagamento,
        iban,
        bic,
        obra,
        periodo_referencia_label: periodoRefLabel,
      },
    };

    return buildHexagonFacturaHtml({
      fat: mockFat,
      targetEmpresa: hexagonEmpresa,
      clientName: previewRecipient.legal_name,
      emissionDateStr: formatDatePtEs(dataEmissao),
      vencimentoDateStr: formatDatePtEs(dataVencimento),
      totalHoras: 0,
      baseImponible: calculation.baseImponible,
      cuotaIva: calculation.cuotaIva,
      ivaPct: calculation.ivaPct,
      totalFactura: calculation.totalFactura,
      logoSrc: hexagonEmpresa?.invoice_logo_url || HEXAGON_DEFAULT_LOGO_URL,
    });
  }, [
    periodMonth,
    periodYear,
    faturaNumero,
    previewRecipient,
    ivaMode,
    calculation,
    parsedItems,
    notaLegalIva,
    formaPagamento,
    iban,
    bic,
    obra,
    hexagonEmpresa,
    dataEmissao,
    dataVencimento,
  ]);

  const handleUpdateLineItem = (
    id: string,
    field: 'descricao' | 'subdescricao' | 'quantidadeStr' | 'valorUnitarioStr',
    val: string
  ) => {
    setLineItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: val } : it)));
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        descricao: '',
        subdescricao: '',
        quantidadeStr: '1',
        valorUnitarioStr: '',
      },
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSubmit = async (andDownloadPdf: boolean) => {
    if (recipientMode === 'empresa_grupo' && !selectedEmpresaGrupoId) {
      toast.error('Selecione a empresa destinatária.');
      return;
    }
    if (recipientMode === 'client' && !selectedClientId) {
      toast.error('Selecione o cliente destinatário.');
      return;
    }
    if (recipientMode === 'novo_cliente' && (!novoLegalName.trim() || !novoTaxId.trim())) {
      toast.error('Preencha a Razão Social e o NIF/IVA do novo cliente.');
      return;
    }
    if (calculation.totalFactura <= 0) {
      toast.error('Informe o valor da fatura (maior que 0,00 €).');
      return;
    }

    setIsSaving(true);
    try {
      const empSource =
        recipientMode === 'empresa_grupo'
          ? empresasGrupo.find((e) => e.id === selectedEmpresaGrupoId)
          : null;
      const cntObj = countriesList.find((c) => c.iso2 === novoCountryIso2);

      const saved = await salvarFaturaDiretaHexagon({
        faturaId: editingFatura?.id || editingFatura?.activeFaturaId || null,
        recipientMode,
        clientId: recipientMode === 'client' ? selectedClientId : null,
        empresaGrupoSource: empSource,
        novoCliente:
          recipientMode === 'novo_cliente'
            ? {
                legal_name: novoLegalName,
                trade_name: novoTradeName || novoLegalName,
                tax_id: novoTaxId,
                country_iso2: novoCountryIso2,
                country_name: cntObj?.name || (novoCountryIso2 === 'PT' ? 'Portugal' : 'España'),
                address_line: novoAddress,
                postal_code: novoPostalCode,
                city: novoCity,
                email: novoEmail,
                billing_email: novoEmail,
              }
            : null,
        faturaNumero,
        dataEmissao,
        dataVencimento,
        periodYear,
        periodMonth,
        periodoReferenciaLabel: `${MONTHS_ES[Math.max(0, Math.min(11, periodMonth - 1))]} ${periodYear}`,
        obra,
        ivaMode,
        notaLegalIva,
        items: parsedItems,
        formaPagamento,
        iban,
        bic,
        salvarIbanPadraoHexagon: salvarIbanPadrao,
      });

      if (andDownloadPdf) {
        toast.info('Gerando arquivo PDF da Fatura Hexagon...');
        const pdfDoc = await renderHexagonFacturaPDF({
          fat: {
            ...saved,
            client: {
              legal_name: previewRecipient.legal_name,
              nombre_comercial: previewRecipient.legal_name,
              tax_id: previewRecipient.tax_id,
              address_line: previewRecipient.address_line,
              postal_code: previewRecipient.postal_code,
              city: previewRecipient.city,
              countryName: previewRecipient.country,
              billingEmail: previewRecipient.email,
            },
          },
          targetEmpresa: hexagonEmpresa,
          clientName: previewRecipient.legal_name,
          emissionDateStr: formatDatePtEs(dataEmissao),
          vencimentoDateStr: formatDatePtEs(dataVencimento),
          totalHoras: 0,
          baseImponible: calculation.baseImponible,
          cuotaIva: calculation.cuotaIva,
          ivaPct: calculation.ivaPct,
          totalFactura: calculation.totalFactura,
        });

        if (pdfDoc) {
          const safeNum = String(saved.fatura_numero || 'FATURA').replace(/[^A-Za-z0-9_-]/g, '_');
          const safeClient = String(previewRecipient.legal_name || 'CLIENTE')
            .replace(/[^A-Za-z0-9_-]/g, '_')
            .slice(0, 28);
          pdfDoc.save(`FACTURA_${safeNum}_${safeClient}.pdf`);
        }
      }

      toast.success(
        editingFatura
          ? `Fatura ${saved.fatura_numero} atualizada com sucesso!`
          : `Fatura ${saved.fatura_numero} criada com sucesso! Pronta para Tracking e Cobros.`
      );

      onOpenChange(false);
      onSuccess?.({
        fatura: saved,
        periodMonth,
        periodYear,
      });
    } catch (err: any) {
      console.error('Erro ao salvar fatura direta Hexagon:', err);
      toast.error(err.message || 'Erro ao salvar a fatura direta.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isSaving && onOpenChange(v)}>
      <DialogContent className="max-w-[96vw] xl:max-w-[1380px] h-[92vh] p-0 overflow-hidden flex flex-col bg-background border-border shadow-2xl">
        {/* Top Executive Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-[#183935] text-white shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#e5a97c]">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <DialogTitle className="text-lg font-bold text-white tracking-tight">
                    {editingFatura ? 'Editar Fatura Direta — Hexagon' : 'Gerar Fatura Direta (Sem Horas) — Hexagon'}
                  </DialogTitle>
                  <Badge className="bg-[#c88d65]/25 text-[#f7cba8] border border-[#c88d65]/50 text-[11px]">
                    Emissora: HEXAGON MONTAJES INDUSTRIALES, S.L. (B05688197)
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-emerald-100/80 mt-0.5">
                  Faturamento direto de serviços administrativos, comerciais e apontamentos — sem exigir horas de colaboradores e sem validação Veri*factu (pronta para Tracking e Cobros).
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lg:hidden bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setShowMobilePreview((v) => !v)}
            >
              <Eye className="h-4 w-4 mr-1.5" />
              {showMobilePreview ? 'Voltar ao Formulário' : 'Ver Prévia A4'}
            </Button>
          </div>
        </DialogHeader>

        {isLoadingInit ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-[#183935]" />
            <p className="text-sm font-medium">Carregando dados fiscais da Hexagon e carteira de clientes...</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
            {/* LEFT COLUMN: FORM */}
            <div
              className={`lg:col-span-7 overflow-y-auto p-6 space-y-6 border-r border-border ${
                showMobilePreview ? 'hidden lg:block' : 'block'
              }`}
            >
              {/* 1. DESTINATÁRIO / CLIENTE */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#183935] dark:text-emerald-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                      1. Cliente / Empresa Destinatária
                    </h3>
                  </div>

                  <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setRecipientMode('empresa_grupo')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                        recipientMode === 'empresa_grupo'
                          ? 'bg-[#183935] text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      Empresas do Grupo
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientMode('client')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                        recipientMode === 'client'
                          ? 'bg-[#183935] text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Clientes Cadastrados
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientMode('novo_cliente')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                        recipientMode === 'novo_cliente'
                          ? 'bg-[#183935] text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      + Novo Cliente
                    </button>
                  </div>
                </div>

                {recipientMode === 'empresa_grupo' && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-muted-foreground">
                      Selecione a empresa do grupo para faturar diretamente pela Hexagon (sincroniza automaticamente como cliente se ainda não estiver vinculada):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {empresasGrupo.map((emp) => {
                        const isSelected = selectedEmpresaGrupoId === emp.id;
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => handleSelectEmpresaGrupo(emp.id)}
                            className={`text-left p-3 rounded-lg border transition-all ${
                              isSelected
                                ? 'border-[#183935] bg-[#183935]/5 dark:border-emerald-500 dark:bg-emerald-950/30 ring-1 ring-[#183935]'
                                : 'border-border hover:border-slate-400 bg-background'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-foreground truncate">
                                {emp.legal_name || emp.nome}
                              </span>
                              {isSelected && <CheckCircle2 className="h-4 w-4 text-[#183935] dark:text-emerald-400 shrink-0" />}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="font-mono">{emp.tax_id || 'Sem NIF'}</span>
                              {emp.city && <span>· {emp.city}</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {recipientMode === 'client' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar cliente por nome, razão social, código ou NIF/CIF..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="pl-9 h-9 text-sm"
                      />
                    </div>
                    <Select value={selectedClientId} onValueChange={handleSelectExistingClient}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione um cliente cadastrado..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {filteredClients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="font-semibold">{c.legal_name || c.trade_name}</span>
                            {c.tax_id ? ` — NIF: ${c.tax_id}` : ''}
                            {c.city ? ` (${c.city})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {recipientMode === 'novo_cliente' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Razão Social *</Label>
                      <Input
                        placeholder="Ex.: WISEOWE, UNIPESSOAL LDA"
                        value={novoLegalName}
                        onChange={(e) => setNovoLegalName(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">NIF / CIF / VAT *</Label>
                      <Input
                        placeholder="Ex.: PT518599280 ou B12345678"
                        value={novoTaxId}
                        onChange={(e) => {
                          const v = e.target.value.toUpperCase();
                          setNovoTaxId(v);
                          suggestTaxModeForNif(v, novoCountryIso2);
                        }}
                        className="h-9 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">País</Label>
                      <Select
                        value={novoCountryIso2}
                        onValueChange={(iso) => {
                          setNovoCountryIso2(iso);
                          suggestTaxModeForNif(novoTaxId, iso);
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PT">Portugal (PT)</SelectItem>
                          <SelectItem value="ES">Espanha (ES)</SelectItem>
                          <SelectItem value="FR">França (FR)</SelectItem>
                          <SelectItem value="DE">Alemanha (DE)</SelectItem>
                          <SelectItem value="IT">Itália (IT)</SelectItem>
                          <SelectItem value="BE">Bélgica (BE)</SelectItem>
                          <SelectItem value="NL">Países Baixos (NL)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Morada / Endereço</Label>
                      <Input
                        placeholder="Ex.: Rua 5 de Outubro, N.º 164"
                        value={novoAddress}
                        onChange={(e) => setNovoAddress(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Código Postal</Label>
                      <Input
                        placeholder="Ex.: 4480-786"
                        value={novoPostalCode}
                        onChange={(e) => setNovoPostalCode(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cidade / Localidade</Label>
                      <Input
                        placeholder="Ex.: Vila do Conde"
                        value={novoCity}
                        onChange={(e) => setNovoCity(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">E-mail de Faturamento (Opcional)</Label>
                      <Input
                        type="email"
                        placeholder="financeiro@cliente.com"
                        value={novoEmail}
                        onChange={(e) => setNovoEmail(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. DADOS DO DOCUMENTO E PERÍODO */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#183935] dark:text-emerald-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    2. Numeração, Datas e Competência
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Nº da Fatura</Label>
                    <Input
                      value={faturaNumero}
                      onChange={(e) => setFaturaNumero(e.target.value)}
                      placeholder="Ex.: 2026/01"
                      className="h-9 font-mono font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Data de Emissão</Label>
                    <Input
                      type="date"
                      value={dataEmissao}
                      onChange={(e) => setDataEmissao(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Data de Vencimento</Label>
                    <Input
                      type="date"
                      value={dataVencimento}
                      onChange={(e) => setDataVencimento(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-muted-foreground mr-1">Prazo rápido:</span>
                  {[
                    { label: 'Pronto Pagamento', days: 0 },
                    { label: '+15 dias', days: 15 },
                    { label: '+30 dias', days: 30 },
                    { label: '+60 dias', days: 60 },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setDataVencimento(addDaysYmd(dataEmissao, p.days))}
                      className="px-2 py-0.5 rounded border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs">Mês Operacional</Label>
                    <Select
                      value={String(periodMonth)}
                      onValueChange={(v) => setPeriodMonth(Number(v))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS_PT.map((m, idx) => (
                          <SelectItem key={m} value={String(idx + 1)}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ano Operacional</Label>
                    <Select
                      value={String(periodYear)}
                      onValueChange={(v) => setPeriodYear(Number(v))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2025, 2026, 2027].map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Obra / Referência (Opcional)</Label>
                    <Input
                      placeholder="Ex.: Servicios Centrales"
                      value={obra}
                      onChange={(e) => setObra(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* 3. SERVIÇOS, APONTAMENTOS E VALOR */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#183935] dark:text-emerald-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                      3. Descrição do Serviço e Valor (€)
                    </h3>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLineItem}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Adicionar Linha
                  </Button>
                </div>

                {/* Preset buttons for line 1 */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 mr-1">
                    <Sparkles className="h-3 w-3 text-[#c88d65]" />
                    Modelos rápidos:
                  </span>
                  {DESCRIPTION_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        handleUpdateLineItem(lineItems[0].id, 'descricao', preset.text)
                      }
                      className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {lineItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border bg-muted/20 p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground">
                          Item #{String(idx + 1).padStart(2, '0')}
                        </span>
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(item.id)}
                            className="text-rose-500 hover:text-rose-600 text-xs flex items-center gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Descrição Principal na Fatura *</Label>
                        <Textarea
                          rows={2}
                          value={item.descricao}
                          onChange={(e) =>
                            handleUpdateLineItem(item.id, 'descricao', e.target.value)
                          }
                          placeholder="Prestación de servicios administrativos..."
                          className="text-sm resize-y"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-6 space-y-1">
                          <Label className="text-xs">Apontamentos / Detalhe Complementar (Opcional)</Label>
                          <Input
                            value={item.subdescricao}
                            onChange={(e) =>
                              handleUpdateLineItem(item.id, 'subdescricao', e.target.value)
                            }
                            placeholder="Ex.: Ref. expediente administrativo / apoio alojamento..."
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs">Qtd.</Label>
                          <Input
                            value={item.quantidadeStr}
                            onChange={(e) =>
                              handleUpdateLineItem(item.id, 'quantidadeStr', e.target.value)
                            }
                            className="h-9 font-mono text-right"
                          />
                        </div>
                        <div className="sm:col-span-4 space-y-1">
                          <Label className="text-xs font-bold text-[#183935] dark:text-emerald-400">
                            {ivaMode === 'iva_incluido'
                              ? 'Valor c/ IVA Incluso (€) *'
                              : 'Valor Unitário (€) *'}
                          </Label>
                          <Input
                            value={item.valorUnitarioStr}
                            onChange={(e) =>
                              handleUpdateLineItem(item.id, 'valorUnitarioStr', e.target.value)
                            }
                            placeholder="56954,14"
                            className="h-9 font-mono font-bold text-right border-[#183935]/40 focus-visible:ring-[#183935]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. REGIME DE IVA */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    4. Tratamento do IVA na Fatura
                  </h3>
                  <Badge variant="outline" className="font-mono text-xs">
                    Total Final: {formatMoneyEs(calculation.totalFactura)} €
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleChangeIvaMode('iva_incluido')}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      ivaMode === 'iva_incluido'
                        ? 'border-[#183935] bg-[#183935]/5 dark:border-emerald-500 dark:bg-emerald-950/30 ring-1 ring-[#183935]'
                        : 'border-border hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">
                        IVA 21% Já Incluso (Destacado)
                      </span>
                      <Badge className="bg-emerald-600 text-white text-[10px]">21% Incl.</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      Mantém o valor digitado como <strong>Total da Fatura</strong> e destaca Base Imponible + IVA 21% por dentro.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChangeIvaMode('exento_intracomunitario')}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      ivaMode === 'exento_intracomunitario'
                        ? 'border-[#183935] bg-[#183935]/5 dark:border-emerald-500 dark:bg-emerald-950/30 ring-1 ring-[#183935]'
                        : 'border-border hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">
                        Sem IVA (0%) — Intracomunitária UE
                      </span>
                      <Badge variant="secondary" className="text-[10px]">0,00% PT/UE</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      Modelo Wiseowe / Portugal: IVA 0,00% (0,00 €) isento pelo Art. 25.1 Ley 37/1992. Base = Total.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChangeIvaMode('isp_0')}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      ivaMode === 'isp_0'
                        ? 'border-[#183935] bg-[#183935]/5 dark:border-emerald-500 dark:bg-emerald-950/30 ring-1 ring-[#183935]'
                        : 'border-border hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">
                        Sem IVA (0%) — Inversión Sujeto Pasivo
                      </span>
                      <Badge variant="secondary" className="text-[10px]">0,00% ISP</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      Subcontratação / obras na Espanha (Art. 84.Uno.2º.f Ley 37/1992). IVA 0,00%.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChangeIvaMode('iva_general_extra')}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      ivaMode === 'iva_general_extra'
                        ? 'border-[#183935] bg-[#183935]/5 dark:border-emerald-500 dark:bg-emerald-950/30 ring-1 ring-[#183935]'
                        : 'border-border hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">
                        IVA 21% Somado à Base (+21%)
                      </span>
                      <Badge variant="outline" className="text-[10px]">+21%</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      Considera o valor digitado como Base Imponible e adiciona +21% de IVA no total.
                    </p>
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Nota Legal / Fiscal Impressa na Fatura</Label>
                    {notaLegalTouched && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotaLegalTouched(false);
                          setNotaLegalIva(getDefaultNotaLegalForMode(ivaMode, 21));
                        }}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restaurar texto padrão
                      </button>
                    )}
                  </div>
                  <Textarea
                    rows={2}
                    value={notaLegalIva}
                    onChange={(e) => {
                      setNotaLegalTouched(true);
                      setNotaLegalIva(e.target.value);
                    }}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* 5. DADOS BANCÁRIOS / PAGAMENTO */}
              {(() => {
                const companyDefaultBank =
                  (hexagonEmpresa?.bank_details ? String(hexagonEmpresa.bank_details).trim() : '') ||
                  (hexagonEmpresa?.iban ? String(hexagonEmpresa.iban).trim() : '') ||
                  '';
                const isMatchingCompanyDefault =
                  Boolean(companyDefaultBank) && iban.trim() === companyDefaultBank;
                const isCustomModified =
                  Boolean(companyDefaultBank) && iban.trim() !== companyDefaultBank;

                return (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[#183935] dark:text-emerald-400" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                          5. Forma de Pagamento e Dados Bancários (Hexagon)
                        </h3>
                      </div>

                      {isMatchingCompanyDefault && (
                        <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-600/30 text-[10px]">
                          Puxado do Cadastro da Hexagon
                        </Badge>
                      )}
                      {isCustomModified && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300 text-[10px]">
                            Alterado para esta fatura
                          </Badge>
                          <button
                            type="button"
                            onClick={() => {
                              setIban(companyDefaultBank);
                              setBic('');
                              setSalvarIbanPadrao(false);
                            }}
                            className="text-[11px] text-[#183935] dark:text-emerald-300 hover:underline flex items-center gap-1 font-medium"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restaurar do Cadastro
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-4 space-y-1">
                        <Label className="text-xs">Forma de Pagamento</Label>
                        <Input
                          value={formaPagamento}
                          onChange={(e) => setFormaPagamento(e.target.value)}
                          placeholder="Transferencia Bancaria"
                          className="h-9 text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground leading-snug pt-1">
                          Carrega automaticamente o campo <strong>Dados de Transferência Faturação</strong> do cadastro da empresa Hexagon, permitindo alterar livremente nesta fatura.
                        </p>
                      </div>

                      <div className="sm:col-span-8 space-y-1">
                        <Label className="text-xs">
                          Dados de Transferência / Conta Bancária na Fatura (Editável)
                        </Label>
                        <Textarea
                          rows={3}
                          value={iban}
                          onChange={(e) => setIban(e.target.value)}
                          placeholder={'REVOLUT\nIBAN: LU76 1695 8000 0156 2947 6179 052\nBIC: QNTOFRP1XXX'}
                          className="font-mono text-xs resize-y leading-relaxed"
                        />
                      </div>
                    </div>

                    {iban.trim() && (!companyDefaultBank || isCustomModified) && (
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={salvarIbanPadrao}
                          onChange={(e) => setSalvarIbanPadrao(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        <span>
                          Salvar também estes dados bancários como padrão no <strong>Cadastro da Empresa Hexagon</strong> (se desmarcado, vale apenas para esta fatura)
                        </span>
                      </label>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* RIGHT COLUMN: LIVE FINANCIAL BREAKDOWN + A4 PREVIEW */}
            <div
              className={`lg:col-span-5 bg-slate-100 dark:bg-slate-900/70 flex flex-col min-h-0 overflow-hidden ${
                showMobilePreview ? 'block' : 'hidden lg:flex'
              }`}
            >
              {/* Live Totals Strip */}
              <div className="px-5 py-3.5 bg-white dark:bg-slate-950 border-b border-border shrink-0">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-2 border border-border">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">
                      Base Imponible
                    </div>
                    <div className="text-sm font-mono font-bold text-foreground mt-0.5">
                      {formatMoneyEs(calculation.baseImponible)} €
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-2 border border-border">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">
                      Cuota IVA ({calculation.ivaPct}%)
                    </div>
                    <div className="text-sm font-mono font-bold text-foreground mt-0.5">
                      {formatMoneyEs(calculation.cuotaIva)} €
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#183935] text-white p-2 shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-emerald-200/90">
                      Total Factura
                    </div>
                    <div className="text-sm font-mono font-extrabold text-[#f7cba8] mt-0.5">
                      {formatMoneyEs(calculation.totalFactura)} €
                    </div>
                  </div>
                </div>
              </div>

              {/* Scaled Live A4 Document */}
              <div className="flex-1 overflow-auto p-4 flex justify-center items-start">
                <div
                  className="origin-top shadow-xl rounded-sm overflow-hidden bg-white border border-slate-300"
                  style={{
                    width: '800px',
                    minWidth: '800px',
                    transform: 'scale(0.62)',
                    marginBottom: '-410px',
                  }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-border bg-card flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground">
            Ao salvar, a fatura entra imediatamente como <strong className="text-emerald-600">Aprovada</strong> em Operacional e Tracking (pronta para <strong>Gerar Cobros</strong> e envio ao cliente).
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving || isLoadingInit}
              onClick={() => handleSubmit(true)}
              className="border-[#183935]/40 text-[#183935] dark:text-emerald-300 hover:bg-[#183935]/10"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              Salvar e Baixar PDF
            </Button>
            <Button
              type="button"
              disabled={isSaving || isLoadingInit}
              onClick={() => handleSubmit(false)}
              className="bg-[#183935] hover:bg-[#122b28] text-white font-semibold"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1.5 text-[#e5a97c]" />
              )}
              {editingFatura ? 'Salvar Alterações' : 'Emitir Fatura Direta'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
