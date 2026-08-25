import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowLeft,
  Save,
  Home,
  MapPin,
  Bed,
  Users,
  CheckCircle2,
  Sparkles,
  Wifi,
  Wind,
  Car,
  Utensils,
  Flame,
  Tv,
  Droplets,
  Zap,
  Plus,
  Trash2,
  CreditCard,
  FileText,
  Calendar,
  DollarSign,
  Building,
  Image as ImageIcon,
  Check,
  X,
  PlusCircle,
  HelpCircle,
  ShieldCheck,
  Wrench,
  Bath,
  ArrowRight
} from 'lucide-react';
import { registrosService } from '../../services/registrosService';
import type { Provedor, Alojamento } from '../../services/logisticsService';
import { CountrySelector, RegionSelector } from '@/features/master-data/locations/components/LocationSelectors';
import { FotosAlojamentoManager } from '../../components/FotosAlojamentoManager';

const alojamentoSchema = z.object({
  nome: z.string().min(1, 'Nome / Título do Alojamento é obrigatório'),
  codigo: z.string().default('AL-0001'),
  provedor_id: z.string().min(1, 'O vínculo com o Proveedor é obrigatório'),
  tipo_alojamento: z.string().default('Fijo'),
  classificacao: z.string().default('Privado'),
  status: z.string().default('Activo'),
  
  // Capacidade e Quartos
  capacidade_pessoas: z.coerce.number().min(0).default(0),
  dormitorios: z.coerce.number().min(0).default(0),
  total_camas: z.coerce.number().min(0).default(0),
  camas_individuais: z.coerce.number().min(0).default(0),
  camas_duplas: z.coerce.number().min(0).default(0),
  banheiros: z.coerce.number().min(0).default(0),
  
  // Localização
  endereco: z.string().optional(),
  municipio: z.string().optional(),
  provincia: z.string().optional(),
  codigo_postal: z.string().optional(),
  pais: z.string().default('España'),

  // Comodidades / Alojamiento
  wifi: z.boolean().default(false),
  aire_acondicionado: z.boolean().default(false),
  parking: z.boolean().default(false),
  cocina: z.boolean().default(false),
  calefaccion: z.boolean().default(false),
  lavadora: z.boolean().default(false),
  tv: z.boolean().default(false),
  ascensor: z.boolean().default(false),

  // Suministros a Pagar
  suministro_internet: z.boolean().default(false),
  suministro_agua: z.boolean().default(false),
  suministro_luz: z.boolean().default(false),
  suministro_gas: z.boolean().default(false),
  suministro_limpieza: z.boolean().default(false),
  suministro_otros: z.boolean().default(false),

  // Observações
  observacoes: z.string().optional(),

  // Contrato & Financeiro
  contrato_codigo: z.string().default('CT-2026/0001'),
  contrato_status: z.string().default('Activo'),
  renovacao_automatica: z.boolean().default(false),
  aviso_renovacao_dias: z.coerce.number().default(5),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  dia_vencimento: z.coerce.number().min(1).max(31).default(5),
  tipo_contrato: z.string().default('Fijo'),
  valor_mensal: z.coerce.number().default(0),
  valor_por_pessoa: z.coerce.number().default(0),
  tem_fianza: z.boolean().default(false),
  fianza_valor: z.coerce.number().default(0),
  fianza_meses: z.coerce.number().default(0),

  // Bancários (Herdados)
  banco: z.string().optional(),
  iban: z.string().optional(),
  swift: z.string().optional(),
  titular_conta: z.string().optional(),
  metodo_pago: z.string().default('Transferir'),

  ativo: z.boolean().default(true),
});

type AlojamentoFormValues = z.infer<typeof alojamentoSchema>;

export const AlojamentoForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [provedores, setProvedores] = useState<Provedor[]>([]);
  const [existingAlojamentos, setExistingAlojamentos] = useState<Alojamento[]>([]);
  const [fotos, setFotos] = useState<string[]>([]);
  const [showColabModal, setShowColabModal] = useState(false);
  const dataLoadedRef = useRef(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<AlojamentoFormValues>({
    resolver: zodResolver(alojamentoSchema),
    defaultValues: {
      nome: '',
      codigo: `AL-${Math.floor(1000 + Math.random() * 9000)}`,
      provedor_id: '',
      tipo_alojamento: 'Fijo',
      classificacao: 'Privado',
      status: 'Activo',
      capacidade_pessoas: 0,
      dormitorios: 0,
      total_camas: 0,
      camas_individuais: 0,
      camas_duplas: 0,
      banheiros: 0,
      endereco: '',
      municipio: '',
      provincia: '',
      codigo_postal: '',
      pais: 'España',
      wifi: true,
      aire_acondicionado: false,
      parking: false,
      cocina: true,
      calefaccion: true,
      lavadora: true,
      tv: true,
      ascensor: false,
      suministro_internet: true,
      suministro_agua: true,
      suministro_luz: true,
      suministro_gas: false,
      suministro_limpieza: false,
      suministro_otros: false,
      observacoes: '',
      contrato_codigo: `CT-2026/${Math.floor(1000 + Math.random() * 9000)}`,
      contrato_status: 'Activo',
      renovacao_automatica: true,
      aviso_renovacao_dias: 5,
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: '',
      dia_vencimento: 5,
      valor_mensal: 0,
      tipo_contrato: 'Fijo',
      fianza_valor: 0,
      fianza_meses: 1,
      metodo_pago: 'Transferir',
      banco: '',
      iban: '',
      swift: '',
      titular_conta: '',
      ativo: true,
    },
  });

  const selectedProvedorId = useWatch({ control, name: 'provedor_id' });
  const watchedPais = useWatch({ control, name: 'pais' });
  const watchedProvincia = useWatch({ control, name: 'provincia' });
  const watchedCodigo = useWatch({ control, name: 'codigo' });
  const watchedStatus = useWatch({ control, name: 'status' });
  const watchedRenovacao = useWatch({ control, name: 'renovacao_automatica' });
  const watchedCamasIndividuais = useWatch({ control, name: 'camas_individuais' });
  const watchedCamasDuplas = useWatch({ control, name: 'camas_duplas' });
  const watchedTipoContrato = useWatch({ control, name: 'tipo_contrato' });
  const watchedValorPorPessoa = useWatch({ control, name: 'valor_por_pessoa' });
  const watchedTemFianza = useWatch({ control, name: 'tem_fianza' });
  const watchedCapacidadePessoas = useWatch({ control, name: 'capacidade_pessoas' });
  const watchedValorMensal = useWatch({ control, name: 'valor_mensal' });
  const watchedFianzaMeses = useWatch({ control, name: 'fianza_meses' });

  // Comodidades Watch
  const watchedWifi = useWatch({ control, name: 'wifi' });
  const watchedAc = useWatch({ control, name: 'aire_acondicionado' });
  const watchedParking = useWatch({ control, name: 'parking' });
  const watchedCocina = useWatch({ control, name: 'cocina' });
  const watchedCalefaccion = useWatch({ control, name: 'calefaccion' });
  const watchedLavadora = useWatch({ control, name: 'lavadora' });
  const watchedTv = useWatch({ control, name: 'tv' });
  const watchedAscensor = useWatch({ control, name: 'ascensor' });

  // Suministros Watch
  const watchedSuminInternet = useWatch({ control, name: 'suministro_internet' });
  const watchedSuminAgua = useWatch({ control, name: 'suministro_agua' });
  const watchedSuminLuz = useWatch({ control, name: 'suministro_luz' });
  const watchedSuminGas = useWatch({ control, name: 'suministro_gas' });
  const watchedSuminLimpieza = useWatch({ control, name: 'suministro_limpieza' });
  const watchedSuminOtros = useWatch({ control, name: 'suministro_otros' });

  // Estado para alertar sobre restauração de rascunho
  const [isDraftRestored, setIsDraftRestored] = useState<boolean>(false);

  // Recuperação de Rascunho do LocalStorage (Persistência ao trocar de abas/navegador)
  useEffect(() => {
    if (!id && !dataLoadedRef.current) {
      try {
        const savedDraft = localStorage.getItem('mcs_alojamento_draft_novo');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && (parsed.nome || parsed.provedor_id || parsed.endereco || (parsed.__savedFotos && parsed.__savedFotos.length > 0))) {
            reset(parsed);
            if (parsed.__savedFotos && Array.isArray(parsed.__savedFotos)) {
              setFotos(parsed.__savedFotos);
            }
            setIsDraftRestored(true);
          }
        }
      } catch (e) {
        console.warn('Erro ao restaurar rascunho:', e);
      }
    }
  }, [id, reset]);

  // Carregar lista de provedores e alojamentos existentes para auto-cálculos
  useEffect(() => {
    registrosService.fetchProvedores()
      .then((provData) => {
        if (provData && provData.length > 0) {
          setProvedores(provData as Provedor[]);
        }
      })
      .catch((err) => console.error('Erro ao buscar provedores:', err));

    registrosService.fetchAlojamentos()
      .then((alojData) => {
        if (alojData && alojData.length > 0) {
          setExistingAlojamentos(alojData as Alojamento[]);
        }
      })
      .catch((err) => console.error('Erro ao buscar alojamentos:', err));
  }, []);

  // Auto-Save contínuo do Rascunho no LocalStorage com debounce
  const allWatchedValues = watch();
  useEffect(() => {
    if (!isEditing) {
      const timer = setTimeout(() => {
        try {
          const hasContent = allWatchedValues.nome || allWatchedValues.provedor_id || allWatchedValues.endereco || (fotos && fotos.length > 0);
          if (hasContent) {
            const draftPayload = {
              ...allWatchedValues,
              __savedFotos: fotos,
              __draftSavedAt: new Date().toISOString()
            };
            localStorage.setItem('mcs_alojamento_draft_novo', JSON.stringify(draftPayload));
          }
        } catch (e) {
          // localStorage quota safety
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [allWatchedValues, fotos, isEditing]);

  const handleDiscardDraft = () => {
    localStorage.removeItem('mcs_alojamento_draft_novo');
    reset({
      nome: '',
      codigo: '',
      provedor_id: '',
      tipo_alojamento: 'Fijo',
      classificacao: 'Privado',
      status: 'Activo',
      capacidade_pessoas: 0,
      dormitorios: 0,
      total_camas: 0,
      camas_individuais: 0,
      camas_duplas: 0,
      banheiros: 0,
      endereco: '',
      municipio: '',
      provincia: '',
      codigo_postal: '',
      pais: 'España',
      wifi: true,
      cocina: true,
      calefaccion: true,
      lavadora: true,
      tv: true,
      suministro_internet: true,
      suministro_agua: true,
      suministro_luz: true,
      valor_mensal: 0,
      tipo_contrato: 'Fijo',
      fianza_valor: 0,
      fianza_meses: 1,
      metodo_pago: 'Transferir'
    });
    setFotos([]);
    setIsDraftRestored(false);
  };

  // Calcula o próximo código global sequencial (AL-0001, AL-0002, AL-0003...)
  const getNextGlobalCode = (list: Alojamento[]) => {
    let maxNum = 0;
    (list || []).forEach(a => {
      if (a.codigo) {
        const match = a.codigo.match(/AL-(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    return `AL-${String(maxNum + 1).padStart(4, '0')}`;
  };

  // Encontra o provedor selecionado atualmente e seus alojamentos vinculados
  const currentProvedor = provedores.find(p => p.id === selectedProvedorId);
  const provAlojamentosCount = existingAlojamentos.filter(a => a.provedor_id === selectedProvedorId).length;

  // SMART CALC 1: Sincronização Inteligente de Camas e Capacidade
  useEffect(() => {
    const ind = Number(watchedCamasIndividuais) || 0;
    const dup = Number(watchedCamasDuplas) || 0;
    const totalCamasCalculado = ind + dup;
    const capacidadeCalculada = (ind * 1) + (dup * 2);

    if (ind > 0 || dup > 0) {
      setValue('total_camas', totalCamasCalculado, { shouldDirty: true });
      setValue('capacidade_pessoas', capacidadeCalculada, { shouldDirty: true });
    }
  }, [watchedCamasIndividuais, watchedCamasDuplas, setValue]);

  // SMART CALC 2: Cálculo Dinâmico de Aluguel por Pessoa / Habitação
  useEffect(() => {
    if (watchedTipoContrato === 'Por Trabajador / Habitación') {
      const vpp = Number(watchedValorPorPessoa) || 0;
      const cap = Number(watchedCapacidadePessoas) || 1;
      if (vpp > 0) {
        setValue('valor_mensal', vpp * cap, { shouldDirty: true });
      }
    }
  }, [watchedTipoContrato, watchedValorPorPessoa, watchedCapacidadePessoas, setValue]);

  // Quando o usuário seleciona um provedor, auto-preenche o título, código GLOBAL, endereço e dados bancários
  const handleProvedorChange = (provId: string) => {
    setValue('provedor_id', provId, { shouldDirty: true });
    const prov = provedores.find(p => p.id === provId);
    if (prov) {
      // Código sequencial GLOBAL único para todo o sistema (AL-0001, AL-0002, AL-0003...)
      let nextCode = getValues('codigo');
      if (!isEditing || !nextCode || nextCode === 'AL-0001') {
        nextCode = getNextGlobalCode(existingAlojamentos);
        setValue('codigo', nextCode, { shouldDirty: true });
      }

      // Auto-gera Título: "[Nome do Provedor] - [Código Alojamento]"
      if (!isEditing || !getValues('nome')) {
        setValue('nome', `${prov.nome_razao_social} - ${nextCode}`, { shouldDirty: true });
      }

      // Auto-preenche localização a partir do endereço do Provedor
      if (prov.endereco) setValue('endereco', prov.endereco, { shouldDirty: true });
      if (prov.municipio) setValue('municipio', prov.municipio, { shouldDirty: true });
      if (prov.provincia) setValue('provincia', prov.provincia, { shouldDirty: true });
      if (prov.codigo_postal) setValue('codigo_postal', prov.codigo_postal, { shouldDirty: true });
      if (prov.pais) setValue('pais', prov.pais, { shouldDirty: true });

      // Auto-preenche dados bancários
      const principalBanco = prov.dados_bancarios?.find(b => b.principal) || prov.dados_bancarios?.[0];
      setValue('banco', principalBanco?.banco || prov.banco || '', { shouldDirty: true });
      setValue('iban', principalBanco?.iban || prov.iban || '', { shouldDirty: true });
      setValue('swift', principalBanco?.swift || prov.swift || '', { shouldDirty: true });
      setValue('titular_conta', principalBanco?.titular_conta || prov.titular_conta || prov.nome_razao_social, { shouldDirty: true });
      setValue('metodo_pago', principalBanco?.metodo_pago || prov.metodo_pago || 'Transferir', { shouldDirty: true });
    }
  };

  // Carregar dados no modo de edição
  useEffect(() => {
    if (id && !dataLoadedRef.current) {
      setIsLoading(true);
      registrosService.fetchAlojamentoById(id).then((a) => {
        if (a) {
          dataLoadedRef.current = true;
          const comod = a.comodidades || {};
          const sumin = a.suministros || {};
          const cont = a.contrato || {};

          if (a.fotos && Array.isArray(a.fotos)) {
            setFotos(a.fotos);
          }

          reset({
            nome: a.nome || a.titulo || '',
            codigo: a.codigo || `AL-${Math.floor(1000 + Math.random() * 9000)}`,
            provedor_id: a.provedor_id || '',
            tipo_alojamento: a.tipo_alojamento || 'Fijo',
            classificacao: a.classificacao || 'Privado',
            status: a.status || (a.ativo === false ? 'Inactivo' : 'Activo'),
            capacidade_pessoas: a.capacidade_pessoas || 0,
            dormitorios: a.dormitorios || 0,
            total_camas: a.total_camas || 0,
            camas_individuais: a.camas_individuais || 0,
            camas_duplas: a.camas_duplas || 0,
            banheiros: a.banheiros || 0,
            endereco: a.endereco || '',
            municipio: a.municipio || '',
            provincia: a.provincia || '',
            codigo_postal: a.codigo_postal || '',
            pais: a.pais || 'España',
            wifi: comod.wifi ?? true,
            aire_acondicionado: comod.aire_acondicionado ?? false,
            parking: comod.parking ?? false,
            cocina: comod.cocina ?? true,
            calefaccion: comod.calefaccion ?? true,
            lavadora: comod.lavadora ?? true,
            tv: comod.tv ?? true,
            ascensor: comod.ascensor ?? false,
            suministro_internet: sumin.internet ?? true,
            suministro_agua: sumin.agua ?? true,
            suministro_luz: sumin.luz ?? true,
            suministro_gas: sumin.gas ?? false,
            suministro_limpieza: sumin.limpieza ?? false,
            suministro_otros: sumin.otros ?? false,
            observacoes: a.observacoes || '',
            contrato_codigo: cont.codigo || `CT-2026/${Math.floor(1000 + Math.random() * 9000)}`,
            contrato_status: cont.status || 'Activo',
            renovacao_automatica: cont.renovacao_automatica ?? true,
            aviso_renovacao_dias: cont.aviso_renovacao_dias || 5,
            data_inicio: cont.data_inicio || '',
            data_fim: cont.data_fim || '',
            dia_vencimento: cont.dia_vencimento || 5,
            tipo_contrato: cont.tipo_contrato || 'Fijo',
            valor_mensal: a.valor_mensal || cont.valor_mensal || 0,
            valor_por_pessoa: cont.valor_por_pessoa || 0,
            tem_fianza: cont.tem_fianza ?? (Number(cont.fianza_valor) > 0),
            fianza_valor: cont.fianza_valor || 0,
            fianza_meses: cont.fianza_meses || 0,
            metodo_pago: cont.metodo_pago || a.provedor?.metodo_pago || 'Transferir',
            banco: cont.banco || a.provedor?.banco || '',
            iban: cont.iban || a.provedor?.iban || '',
            swift: cont.swift || a.provedor?.swift || '',
            titular_conta: cont.titular || a.provedor?.titular_conta || '',
            ativo: a.status !== 'Inactivo' && a.ativo !== false,
          });
        }
      }).catch(err => {
        console.error('Erro ao carregar alojamento:', err);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [id, reset]);



  const handleSaveInternal = async (data: AlojamentoFormValues, redirectAfter: boolean = true) => {
    try {
      setIsSubmitting(true);

      const comodidades = {
        wifi: data.wifi,
        aire_acondicionado: data.aire_acondicionado,
        parking: data.parking,
        cocina: data.cocina,
        calefaccion: data.calefaccion,
        lavadora: data.lavadora,
        tv: data.tv,
        ascensor: data.ascensor,
      };

      const suministros = {
        internet: data.suministro_internet,
        agua: data.suministro_agua,
        luz: data.suministro_luz,
        gas: data.suministro_gas,
        limpieza: data.suministro_limpieza,
        otros: data.suministro_otros,
      };

      const contrato = {
        codigo: data.contrato_codigo,
        status: data.contrato_status,
        renovacao_automatica: data.renovacao_automatica,
        aviso_renovacao_dias: data.aviso_renovacao_dias,
        data_inicio: data.data_inicio,
        data_fim: data.data_fim,
        dia_vencimento: data.dia_vencimento,
        tipo_contrato: data.tipo_contrato,
        valor_mensal: data.valor_mensal,
        valor_por_pessoa: data.valor_por_pessoa,
        tem_fianza: data.tem_fianza,
        fianza_valor: data.tem_fianza ? Number(data.fianza_valor) : 0,
        fianza_meses: data.tem_fianza ? Number(data.fianza_meses) : 0,
        metodo_pago: data.metodo_pago,
        banco: data.banco,
        iban: data.iban,
        swift: data.swift,
        titular: data.titular_conta,
      };

      const payload = {
        ...data,
        titulo: data.nome,
        comodidades,
        suministros,
        fotos,
        contrato,
        valor_mensal: data.valor_mensal,
        status: data.status,
        ativo: data.status === 'Activo'
      };

      if (isEditing && id) {
        await registrosService.updateAlojamento(id, payload as any);
      } else {
        await registrosService.createAlojamento(payload as any);
      }

      setSaveSuccess(true);
      localStorage.removeItem('mcs_alojamento_draft_novo');
      setIsDraftRestored(false);

      if (redirectAfter) {
        setTimeout(() => {
          navigate('/logistica/registros/alojamentos');
        }, 500);
      } else {
        // Modo "Guardar y Crear Otro Alojamiento para este Proveedor"
        const nextCode = getNextGlobalCode([...existingAlojamentos, { codigo: data.codigo } as any]);
        setValue('codigo', nextCode, { shouldDirty: true });
        if (currentProvedor) {
          setValue('nome', `${currentProvedor.nome_razao_social} - ${nextCode}`, { shouldDirty: true });
        }
        setValue('dormitorios', 0);
        setValue('total_camas', 0);
        setValue('camas_individuais', 0);
        setValue('camas_duplas', 0);
        setValue('capacidade_pessoas', 0);
        setFotos([]);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (error: any) {
      console.error('Error saving alojamento:', error);
      alert(`Erro ao salvar alojamento: ${error.message || 'Verifique os dados informados.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (data: AlojamentoFormValues) => {
    handleSaveInternal(data, true);
  };

  const onSaveAndCreateAnother = () => {
    handleSubmit((data) => handleSaveInternal(data, false))();
  };

  const onError = (errs: any) => {
    console.error('Form Validation Errors:', errs);
    const firstKey = Object.keys(errs)[0];
    alert(`Atenção: O campo "${firstKey}" necessita ajuste: ${errs[firstKey]?.message || 'Verifique o preenchimento.'}`);
  };

  if (isLoading) {
    return (
      <div className="w-full px-8 py-16 text-center text-slate-500 font-medium">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
        Carregando dados do alojamento...
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-5 space-y-5 bg-slate-100/70 dark:bg-slate-950 min-h-screen">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/logistica/registros/alojamentos')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                {isEditing ? 'Registro de Alojamiento' : 'Nuevo Alojamiento'}
              </h1>
              <span className="px-3 py-1 bg-blue-600 text-white font-mono font-bold text-xs rounded-lg tracking-wider shadow-xs flex items-center gap-1.5">
                <Home size={13} />
                {watchedCodigo || 'AL-0001'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestão integral do imóvel, características, suprimentos e vínculo contratual com o fornecedor
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/logistica/registros/alojamentos')}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>

          {!isEditing && (
            <button
              type="button"
              onClick={onSaveAndCreateAnother}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded-xl text-xs font-bold transition-colors border border-purple-200 dark:border-purple-800"
            >
              <PlusCircle size={14} />
              Guardar e Criar Outro
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit(onSubmit, onError)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-300" />
                Salvo com Sucesso!
              </>
            ) : isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Gravando...
              </>
            ) : (
              <>
                <Save size={16} />
                Guardar Alojamiento
              </>
            )}
          </button>
        </div>
      </div>

      {isDraftRestored && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-5 py-3 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 font-bold">
            <Sparkles size={16} className="text-amber-600 flex-shrink-0" />
            <span>Rascunho recuperado automaticamente! Seus dados e fotos anexadas foram preservados ao alternar entre abas do navegador.</span>
          </div>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="text-xs text-amber-700 hover:text-red-600 dark:text-amber-400 font-bold px-3 py-1 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          >
            Limpar Rascunho
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, onError)} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ========================================================= */}
        {/* COLUNA 1 (ESQUERDA - 5 COLUNAS): DADOS, LOCALIZAÇÃO, FOTOS */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* BLOCO: Datos de Alojamiento */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Home size={15} className="text-blue-600" />
                Datos de Alojamiento
              </h3>
              {currentProvedor && (
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {provAlojamentosCount} imóvel(is) cadastrado(s)
                </span>
              )}
            </div>

            <div className="space-y-3">
              {/* Proveedor & Código Provedor */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Proveedor (Obrigatório) *
                  </label>
                  <select
                    value={selectedProvedorId || ''}
                    onChange={e => handleProvedorChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o Proveedor...</option>
                    {provedores.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome_razao_social} {p.municipio ? `(${p.municipio})` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.provedor_id && (
                    <p className="text-red-500 text-[10px] mt-1">{errors.provedor_id.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Código Provedor
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentProvedor?.codigo || (currentProvedor ? 'PV-0001' : '')}
                    placeholder="PV-XXXX"
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-600 dark:text-slate-400"
                  />
                </div>
              </div>

              {/* Título do Alojamento */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Título de Alojamiento *
                </label>
                <input
                  type="text"
                  {...register('nome')}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: PRUJA FORNIELES PARES SL - AL-0008"
                />
                {errors.nome && (
                  <p className="text-red-500 text-[10px] mt-1">{errors.nome.message}</p>
                )}
              </div>

              {/* Tipo e Classificação */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Alojamiento
                  </label>
                  <select
                    {...register('tipo_alojamento')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="Fijo">Fijo</option>
                    <option value="Temporario">Temporario</option>
                    <option value="Propio">Propio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Clasificación
                  </label>
                  <select
                    {...register('classificacao')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="Privado">Privado</option>
                    <option value="Compartilhado">Compartilhado</option>
                    <option value="Hotel / Pensión">Hotel / Pensión</option>
                  </select>
                </div>
              </div>

              {/* Grid de Capacidade e Quartos com Cálculo Automático Inteligente */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capacidade & Camas (Cálculo Automático)</span>
                  <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                    <Sparkles size={11} /> Auto-soma inteligente
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <div className="p-2 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-center shadow-2xs">
                    <Users size={14} className="mx-auto text-blue-600 mb-1" />
                    <span className="text-[9px] font-bold text-blue-800 dark:text-blue-200 block">Capacidade</span>
                    <input
                      type="number"
                      {...register('capacidade_pessoas')}
                      className="w-full bg-transparent text-center font-bold text-xs text-blue-950 dark:text-white"
                    />
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                    <Home size={14} className="mx-auto text-slate-600 mb-1" />
                    <span className="text-[9px] font-bold text-slate-500 block">Dormitórios</span>
                    <input
                      type="number"
                      {...register('dormitorios')}
                      className="w-full bg-transparent text-center font-bold text-xs text-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="p-2 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-center shadow-2xs">
                    <Bed size={14} className="mx-auto text-blue-600 mb-1" />
                    <span className="text-[9px] font-bold text-blue-800 dark:text-blue-200 block">Total Camas</span>
                    <input
                      type="number"
                      {...register('total_camas')}
                      className="w-full bg-transparent text-center font-bold text-xs text-blue-950 dark:text-white"
                    />
                  </div>

                  <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-emerald-600 block mb-0.5">1x</span>
                    <span className="text-[9px] font-bold text-emerald-800 dark:text-emerald-200 block">Individuais</span>
                    <input
                      type="number"
                      {...register('camas_individuais')}
                      className="w-full bg-transparent text-center font-bold text-xs text-emerald-950 dark:text-white"
                    />
                  </div>

                  <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-emerald-600 block mb-0.5">2x</span>
                    <span className="text-[9px] font-bold text-emerald-800 dark:text-emerald-200 block">Dobles</span>
                    <input
                      type="number"
                      {...register('camas_duplas')}
                      className="w-full bg-transparent text-center font-bold text-xs text-emerald-950 dark:text-white"
                    />
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                    <Bath size={14} className="mx-auto text-slate-600 mb-1" />
                    <span className="text-[9px] font-bold text-slate-500 block">Baños</span>
                    <input
                      type="number"
                      {...register('banheiros')}
                      className="w-full bg-transparent text-center font-bold text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BLOCO: Localização */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <MapPin size={15} className="text-rose-600" />
                Localización
              </h3>
              {selectedProvedorId && (
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={11} />
                  Herdado do Provedor
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ubicación (Calle, Número, Piso)
                  </label>
                  <input
                    type="text"
                    {...register('endereco')}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    placeholder="Ex: Calle de los Álamos, 24, 2ºB"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Municipio / Ciudad
                  </label>
                  <input
                    type="text"
                    {...register('municipio')}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    placeholder="Ex: Gijón / Arbúcies"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    País (Tabela Oficial)
                  </label>
                  <CountrySelector
                    value={watchedPais || 'España'}
                    onChange={(_id, name) => setValue('pais', name || 'España', { shouldDirty: true })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Provincia (Tabela Oficial)
                  </label>
                  <RegionSelector
                    countryName={watchedPais || 'España'}
                    value={watchedProvincia || null}
                    onChange={(_id, name) => setValue('provincia', name || '', { shouldDirty: true })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Código Postal
                  </label>
                  <input
                    type="text"
                    {...register('codigo_postal')}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    placeholder="Ex: 33201 / 17401"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* BLOCO: Fotos com Suporte a Upload Local, Drag & Drop, Ctrl+V e Download */}
          <FotosAlojamentoManager
            fotos={fotos}
            onChange={setFotos}
            maxFotos={5}
          />
        </div>

        {/* ========================================================= */}
        {/* COLUNA 2 (CENTRAL - 3 COLUNAS): ESTADO, COMODIDADES, GASTOS */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* BLOCO: Estado Alojamiento */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <CheckCircle2 size={15} className="text-emerald-600" />
              Estado Alojamiento
            </h3>
            <select
              {...register('status')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs border ${
                watchedStatus === 'Activo'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <option value="Activo">🟢 Activo</option>
              <option value="Inactivo">🔴 Inactivo</option>
              <option value="Mantenimiento">🟡 Mantenimiento</option>
            </select>
          </div>

          {/* BLOCO: Alojamiento (Comodidades / Equipamentos com Tags Interativas) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-purple-100 dark:border-purple-900/40">
              <Sparkles size={15} className="text-purple-600" />
              Alojamiento (Comodidades)
            </h3>
            
            <div className="space-y-2">
              {[
                { name: 'wifi', label: 'Wi-Fi', icon: Wifi, state: watchedWifi },
                { name: 'aire_acondicionado', label: 'Aire acondicionado', icon: Wind, state: watchedAc },
                { name: 'parking', label: 'Parking', icon: Car, state: watchedParking },
                { name: 'cocina', label: 'Cocina', icon: Utensils, state: watchedCocina },
                { name: 'calefaccion', label: 'Calefacción', icon: Flame, state: watchedCalefaccion },
                { name: 'tv', label: 'Televisión', icon: Tv, state: watchedTv },
              ].map((item) => {
                const IconComponent = item.icon;
                const isChecked = !!item.state;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setValue(item.name as any, !isChecked, { shouldDirty: true })}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isChecked
                        ? 'bg-purple-50 text-purple-900 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-800 font-bold'
                        : 'bg-slate-50 text-slate-600 border border-transparent hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <IconComponent size={14} className={isChecked ? 'text-purple-600' : 'text-slate-400'} />
                      <span>{item.label}</span>
                    </div>
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                      isChecked ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {isChecked && <Check size={11} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BLOCO: Suministro a Pagar (Chips Interativos) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-amber-100 dark:border-amber-900/40">
              <Zap size={15} className="text-amber-600" />
              Suministro a Pagar
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'suministro_internet', label: 'Internet', state: watchedSuminInternet },
                { name: 'suministro_agua', label: 'Agua', state: watchedSuminAgua },
                { name: 'suministro_luz', label: 'Luz', state: watchedSuminLuz },
                { name: 'suministro_limpieza', label: 'Limpieza', state: watchedSuminLimpieza },
                { name: 'suministro_gas', label: 'Gas', state: watchedSuminGas },
                { name: 'suministro_otros', label: 'Otros gastos', state: watchedSuminOtros },
              ].map((item) => {
                const isChecked = !!item.state;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setValue(item.name as any, !isChecked, { shouldDirty: true })}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                      isChecked
                        ? 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800 font-bold'
                        : 'bg-slate-50 text-slate-600 border border-transparent hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400'
                    }`}
                  >
                    <span>{item.label}</span>
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                      isChecked ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {isChecked && <Check size={10} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BLOCO: Observaciones */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <FileText size={15} className="text-blue-600" />
              Observaciones
            </h3>
            <textarea
              {...register('observacoes')}
              rows={3}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              placeholder="Instruções de chaves, regras da casa, contatos de emergência..."
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUNA 3 (DIREITA - 4 COLUNAS): CONTRATO & FINANCEIRO */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={15} className="text-emerald-600" />
                Contratos & Financiero
              </h3>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                {getValues('contrato_status') || 'Activo'}
              </span>
            </div>

            {/* Código do Contrato */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detalles del Contrato</span>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  {...register('contrato_codigo')}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold w-36"
                  placeholder="CT-2026/0084"
                />
                <span className="text-[11px] font-semibold text-slate-500">PO-0374</span>
              </div>
            </div>

            {/* Renovação */}
            <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/60 space-y-2">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={13} />
                Renovación
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold mb-1">Renovación Automática</label>
                  <select
                    value={watchedRenovacao ? 'Sim' : 'Nao'}
                    onChange={e => setValue('renovacao_automatica', e.target.value === 'Sim', { shouldDirty: true })}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                  >
                    <option value="Sim">Sí</option>
                    <option value="Nao">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold mb-1">Aviso Renovación</label>
                  <input
                    type="number"
                    {...register('aviso_renovacao_dias')}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    placeholder="5 dias"
                  />
                </div>
              </div>
            </div>

            {/* Término */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={13} />
                Término
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] text-slate-400 font-bold mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    {...register('data_inicio')}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 font-bold mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    {...register('data_fim')}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 font-bold mb-1">Día Vencimiento</label>
                  <input
                    type="number"
                    {...register('dia_vencimento')}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Financiero & Modalidade de Contrato */}
            <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={13} />
                  Condições Financeiras do Contrato
                </span>
              </div>

              {/* Tipo de Contrato */}
              <div>
                <label className="block text-[10px] text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Modalidade do Contrato / Locação
                </label>
                <select
                  {...register('tipo_contrato')}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                >
                  <option value="Fijo">Fijo (Piso Completo / Valor Mensal Fechado)</option>
                  <option value="Por Trabajador / Habitación">Por Habitación / Vaga (Valor por Pessoa)</option>
                  <option value="Temporario (Airbnb / Booking)">Temporario (Airbnb / Booking / Curto Prazo)</option>
                  <option value="Hotel / Pensión">Hotel / Pensión (Diária / Transitório)</option>
                </select>
              </div>

              {/* Valores baseados na modalidade */}
              {watchedTipoContrato === 'Por Trabajador / Habitación' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold mb-1">Preço / Vaga (€/pessoa)</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('valor_por_pessoa')}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300"
                        placeholder="Ex: 400.00"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold mb-1">Total Mensal Estimado (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('valor_mensal')}
                        className="w-full px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300"
                        placeholder="Ex: 1600.00"
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium bg-emerald-100/60 dark:bg-emerald-950/40 p-1.5 rounded-md flex items-center gap-1">
                    <Sparkles size={11} className="flex-shrink-0" />
                    <span>Cálculo: {watchedCapacidadePessoas || 0} vagas × € {watchedValorPorPessoa || 0} = <strong>€ {(Number(watchedCapacidadePessoas) || 0) * (Number(watchedValorPorPessoa) || 0)} / mês</strong></span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold mb-1">
                    {watchedTipoContrato?.includes('Temporario') ? 'Valor Total do Período (€)' : 'Alquiler Mensual Total (€)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('valor_mensal')}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300"
                    placeholder="Ex: 1500.00"
                  />
                </div>
              )}

              {/* Bloco de Fiança / Depósito com Toggle */}
              <div className="pt-2 border-t border-emerald-100 dark:border-emerald-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    ¿Exige Fianza / Depósito?
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setValue('tem_fianza', false, { shouldDirty: true })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        !watchedTemFianza
                          ? 'bg-slate-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('tem_fianza', true, { shouldDirty: true })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        watchedTemFianza
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      Sí
                    </button>
                  </div>
                </div>

                {watchedTemFianza ? (
                  <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-slate-500 font-bold mb-1">Valor da Fiança (€) *</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('fianza_valor')}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-300"
                          placeholder="Ex: 3000.00"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 font-bold mb-1">Meses de Referência</label>
                        <input
                          type="number"
                          {...register('fianza_meses')}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-center"
                          placeholder="Ex: 2"
                        />
                      </div>
                    </div>
                    <p className="text-[9px] text-emerald-800 dark:text-emerald-300 leading-tight">
                      📌 Este valor ficará registrado para controle de vistoria e devolução/estorno no encerramento da locação.
                    </p>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic">
                    Sem retenção de fiança (Padrão para Airbnb, Booking, hotéis e diárias).
                  </div>
                )}
              </div>
            </div>

            {/* Informaciones Bancarias Herdadas */}
            <div className="p-3 bg-purple-50/40 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/60 space-y-2">
              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard size={13} />
                Informaciones Bancarias (Proveedor)
              </span>
              <div className="space-y-1.5 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold mb-1">Método de Pago</label>
                  <select
                    {...register('metodo_pago')}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="Transferir">Transferência Bancária (Transferir)</option>
                    <option value="Tarjeta">Tarjeta / Cartão (Airbnb / Booking)</option>
                    <option value="Bizum">Bizum</option>
                    <option value="Efectivo">Efectivo / Dinheiro</option>
                    <option value="Plataforma">Plataforma Online</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Banco</span>
                  <input
                    type="text"
                    {...register('banco')}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    placeholder="Nome do Banco"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">IBAN</span>
                  <input
                    type="text"
                    {...register('iban')}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono uppercase"
                    placeholder="ES91 2100..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">SWIFT</span>
                    <input
                      type="text"
                      {...register('swift')}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono uppercase"
                      placeholder="SWIFT/BIC"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Titular</span>
                    <input
                      type="text"
                      {...register('titular_conta')}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="Titular"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM BAR: COLABORADORES, CANCELAR, GUARDAR */}
        {/* ========================================================= */}
        <div className="lg:col-span-12 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            type="button"
            onClick={() => setShowColabModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors"
          >
            <Users size={15} />
            Colaboradores Alocados
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/logistica/registros/alojamentos')}
              className="flex items-center gap-1.5 px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors"
            >
              <X size={15} />
              Cancelar
            </button>

            {!isEditing && (
              <button
                type="button"
                onClick={onSaveAndCreateAnother}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded-xl text-xs font-bold transition-colors border border-purple-200 dark:border-purple-800"
              >
                <PlusCircle size={14} />
                Guardar e Criar Outro
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmit(onSubmit, onError)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-300" />
                  Salvo com Sucesso!
                </>
              ) : isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Gravando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Guardar Alojamiento
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Modal de Colaboradores Alocados */}
      {showColabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="text-blue-600" size={20} />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Colaboradores no Alojamento</h3>
              </div>
              <button onClick={() => setShowColabModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Este alojamento possui capacidade para <strong>{getValues('capacidade_pessoas') || 0} pessoas</strong> em <strong>{getValues('total_camas') || 0} camas</strong>.
            </p>

            <div className="p-8 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center text-xs text-slate-400">
              Gerencie as alocações em tempo real através da aba <strong>Ocupação (Gantt)</strong> ou <strong>Demandas de Alocação</strong> no menu lateral.
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowColabModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
