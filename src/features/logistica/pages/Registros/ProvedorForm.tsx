import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, Building, Contact, CreditCard, MapPin, Plus, Trash2, Sparkles, CheckCircle2 } from 'lucide-react';
import { registrosService } from '../../services/registrosService';
import { identifyBankFromIban, formatIban } from '@/shared/utils/ibanHelper';
import { CountrySelector, RegionSelector } from '@/features/master-data/locations/components/LocationSelectors';

const contatoItemSchema = z.object({
  nome: z.string().optional(),
  cargo_tipo: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

const contaBancariaItemSchema = z.object({
  banco: z.string().optional(),
  iban: z.string().optional(),
  swift: z.string().optional(),
  titular_conta: z.string().optional(),
  metodo_pago: z.string().default('Transferir'),
  principal: z.boolean().default(false),
});

const provedorSchema = z.object({
  nome_razao_social: z.string().min(1, 'Razão Social é obrigatória'),
  nome_comercial: z.string().optional(),
  cif_nif: z.string().optional(),
  tipo: z.enum(['padrao', 'alojamento']),
  tipo_pessoa: z.enum(['Persona Física', 'Persona Jurídica']),
  classificacao: z.string().default('Proveedor Alojamiento'),
  contato_nome: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  contatos: z.array(contatoItemSchema).default([]),
  dados_bancarios: z.array(contaBancariaItemSchema).default([]),
  metodo_pago: z.string().default('Transferir'),
  banco: z.string().optional(),
  iban: z.string().optional(),
  swift: z.string().optional(),
  titular_conta: z.string().optional(),
  endereco: z.string().optional(),
  municipio: z.string().optional(),
  provincia: z.string().optional(),
  codigo_postal: z.string().optional(),
  pais: z.string().default('España'),
  ativo: z.boolean().default(true),
});

type ProvedorFormValues = z.infer<typeof provedorSchema>;

export const ProvedorForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const dataLoadedRef = useRef(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProvedorFormValues>({
    resolver: zodResolver(provedorSchema),
    defaultValues: {
      nome_razao_social: '',
      nome_comercial: '',
      cif_nif: '',
      tipo: 'alojamento',
      tipo_pessoa: 'Persona Jurídica',
      classificacao: 'Proveedor Alojamiento',
      metodo_pago: 'Transferir',
      endereco: '',
      municipio: '',
      provincia: '',
      codigo_postal: '',
      pais: 'España',
      ativo: true,
      contatos: [
        { nome: '', cargo_tipo: 'Proprietário', telefone: '', email: '' }
      ],
      dados_bancarios: [
        { banco: '', iban: '', swift: '', titular_conta: '', metodo_pago: 'Transferir', principal: true }
      ]
    },
  });

  const watchedDadosBancarios = useWatch({ control, name: 'dados_bancarios' });
  const watchedPais = useWatch({ control, name: 'pais' });
  const watchedProvincia = useWatch({ control, name: 'provincia' });

  // Estado para alertar sobre restauração de rascunho
  const [isDraftRestored, setIsDraftRestored] = useState<boolean>(false);

  // Recuperação de Rascunho do LocalStorage (Persistência ao trocar de abas)
  useEffect(() => {
    if (!id && !dataLoadedRef.current) {
      try {
        const savedDraft = localStorage.getItem('mcs_provedor_draft_novo');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && (parsed.nome_razao_social || parsed.cif_nif || parsed.telefone || parsed.endereco)) {
            reset(parsed);
            setIsDraftRestored(true);
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar rascunho de provedor:', e);
      }
    }
  }, [id, reset]);

  // Auto-Save contínuo do Rascunho no LocalStorage com debounce
  const allWatchedValues = watch();
  useEffect(() => {
    if (!isEditing) {
      const timer = setTimeout(() => {
        try {
          const hasContent = allWatchedValues.nome_razao_social || allWatchedValues.cif_nif || allWatchedValues.telefone || allWatchedValues.endereco;
          if (hasContent) {
            localStorage.setItem('mcs_provedor_draft_novo', JSON.stringify(allWatchedValues));
          }
        } catch (e) {}
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [allWatchedValues, isEditing]);

  const handleDiscardDraft = () => {
    localStorage.removeItem('mcs_provedor_draft_novo');
    reset({
      nome_razao_social: '',
      nome_comercial: '',
      cif_nif: '',
      tipo: 'alojamento',
      tipo_pessoa: 'Persona Jurídica',
      classificacao: 'Proveedor Alojamiento',
      contato_nome: '',
      telefone: '',
      email: '',
      contatos: [{ nome: '', cargo_tipo: 'Proprietário', telefone: '', email: '' }],
      dados_bancarios: [{ banco: '', iban: '', swift: '', titular_conta: '', metodo_pago: 'Transferir', principal: true }],
      metodo_pago: 'Transferir',
      banco: '',
      iban: '',
      swift: '',
      titular_conta: '',
      endereco: '',
      municipio: '',
      provincia: '',
      codigo_postal: '',
      pais: 'España',
      ativo: true,
    });
    setIsDraftRestored(false);
  };

  // Carregar dados APENAS UMA VEZ no modo de edição (quando id estiver disponível)
  useEffect(() => {
    if (id && !dataLoadedRef.current) {
      setIsLoading(true);
      registrosService.fetchProvedorById(id).then((p) => {
        if (p) {
          dataLoadedRef.current = true;

          const contatosCarregados = p.contatos && p.contatos.length > 0 ? p.contatos : [
            {
              nome: p.contato_nome || '',
              cargo_tipo: 'Proprietário',
              telefone: p.telefone || '',
              email: p.email || ''
            }
          ];

          let dadosBancariosCarregados = p.dados_bancarios && p.dados_bancarios.length > 0 ? p.dados_bancarios : [
            {
              banco: p.banco || '',
              iban: p.iban || '',
              swift: p.swift || '',
              titular_conta: p.titular_conta || '',
              metodo_pago: p.metodo_pago || 'Transferir',
              principal: true
            }
          ];

          dadosBancariosCarregados = dadosBancariosCarregados.map(b => {
            const rawIban = b.iban || '';
            const bankInfo = identifyBankFromIban(rawIban);
            return {
              ...b,
              iban: formatIban(rawIban),
              banco: b.banco || bankInfo?.name || '',
              swift: b.swift || bankInfo?.bic || '',
            };
          });

          reset({
            nome_razao_social: p.nome_razao_social || '',
            nome_comercial: p.nome_comercial || '',
            cif_nif: p.cif_nif || '',
            tipo: (p.tipo as any) || 'alojamento',
            tipo_pessoa: (p.tipo_pessoa as any) || 'Persona Jurídica',
            classificacao: p.classificacao || 'Proveedor Alojamiento',
            contato_nome: p.contato_nome || '',
            telefone: p.telefone || '',
            email: p.email || '',
            contatos: contatosCarregados,
            dados_bancarios: dadosBancariosCarregados,
            metodo_pago: p.metodo_pago || 'Transferir',
            banco: p.banco || '',
            iban: p.iban || '',
            swift: p.swift || '',
            titular_conta: p.titular_conta || '',
            endereco: p.endereco || '',
            municipio: p.municipio || '',
            provincia: p.provincia || '',
            codigo_postal: p.codigo_postal || '',
            pais: p.pais || 'España',
            ativo: p.ativo ?? true,
          });
        }
      }).catch(err => {
        console.error('Erro ao carregar provedor:', err);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [id, reset]);

  const { fields: contatosFields, append: appendContato, remove: removeContato } = useFieldArray({
    control,
    name: 'contatos'
  });

  const { fields: bancoFields, append: appendBanco, remove: removeBanco } = useFieldArray({
    control,
    name: 'dados_bancarios'
  });

  const handleIbanInputChange = (index: number, rawValue: string) => {
    const formatted = formatIban(rawValue);
    setValue(`dados_bancarios.${index}.iban`, formatted, { shouldDirty: true });

    const bankInfo = identifyBankFromIban(formatted);
    if (bankInfo) {
      setValue(`dados_bancarios.${index}.banco`, bankInfo.name, { shouldDirty: true });
      setValue(`dados_bancarios.${index}.swift`, bankInfo.bic, { shouldDirty: true });
    }
  };

  const onSubmit = async (data: ProvedorFormValues) => {
    try {
      setIsSubmitting(true);

      const principalContato = data.contatos[0];
      const principalBanco = data.dados_bancarios.find(b => b.principal) || data.dados_bancarios[0];

      const payload = {
        ...data,
        contato_nome: principalContato?.nome || data.contato_nome || '',
        telefone: principalContato?.telefone || data.telefone || '',
        email: principalContato?.email || data.email || '',
        banco: principalBanco?.banco || data.banco || '',
        iban: principalBanco?.iban || data.iban || '',
        swift: principalBanco?.swift || data.swift || '',
        titular_conta: principalBanco?.titular_conta || data.titular_conta || '',
        metodo_pago: principalBanco?.metodo_pago || data.metodo_pago || 'Transferir',
        endereco: data.endereco || '',
        municipio: data.municipio || '',
        provincia: data.provincia || '',
        codigo_postal: data.codigo_postal || '',
        pais: data.pais || 'España',
      };

      if (isEditing && id) {
        await registrosService.updateProvedor(id, payload as any);
      } else {
        await registrosService.createProvedor(payload as any);
      }

      setSaveSuccess(true);
      localStorage.removeItem('mcs_provedor_draft_novo');
      setIsDraftRestored(false);

      setTimeout(() => {
        navigate('/logistica/registros/provedores');
      }, 500);
    } catch (error: any) {
      console.error('Error saving provedor:', error);
      alert(`Erro ao salvar provedor: ${error.message || 'Verifique os dados informados.'}`);
    } finally {
      setIsSubmitting(false);
    }
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
        Carregando dados do proveedor...
      </div>
    );
  }

  return (
    <div className="w-full px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/logistica/registros/provedores')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              {isEditing ? 'Editar Proveedor' : 'Novo Proveedor'}
            </h1>
            <p className="text-sm text-slate-500">
              {isEditing ? 'Atualize as informações cadastrais, fiscais e bancárias' : 'Cadastre um novo fornecedor de alojamentos ou serviços'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/logistica/registros/provedores')}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit, onError)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-xs disabled:opacity-50"
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
                {isEditing ? 'Salvar Alterações' : 'Cadastrar Proveedor'}
              </>
            )}
          </button>
        </div>
      </div>

      {isDraftRestored && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-5 py-3 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 font-bold">
            <Sparkles size={16} className="text-amber-600 flex-shrink-0" />
            <span>Rascunho recuperado automaticamente! Seus dados cadastrais foram preservados ao alternar entre abas do navegador.</span>
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

      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
        {/* BLOCO 1: Informações Gerais & Fiscais */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Building className="h-4.5 w-4.5 text-blue-600" />
            Informações Gerais & Fiscais
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome / Razão Social *
              </label>
              <input
                type="text"
                {...register('nome_razao_social')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: PRUJA FORNIELES PARES SL"
              />
              {errors.nome_razao_social && (
                <p className="text-red-500 text-xs mt-1">{errors.nome_razao_social.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome Fantasia / Comercial
              </label>
              <input
                type="text"
                {...register('nome_comercial')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Agência Prujà"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                CIF / NIF / DNI
              </label>
              <input
                type="text"
                {...register('cif_nif')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm uppercase focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: B12345678"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Pessoa
              </label>
              <select
                {...register('tipo_pessoa')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Persona Jurídica">Persona Jurídica (Empresa / SL / SA)</option>
                <option value="Persona Física">Persona Física (Autônomo / Particular)</option>
              </select>
            </div>
          </div>
        </div>

        {/* BLOCO 2: Contatos & Telefones */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Contact className="h-4.5 w-4.5 text-blue-600" />
              Contatos & Responsáveis
            </h3>
            <button
              type="button"
              onClick={() => appendContato({ nome: '', cargo_tipo: 'Contato Comercial', telefone: '', email: '' })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-xs font-bold transition-colors"
            >
              <Plus size={14} />
              Adicionar Contato
            </button>
          </div>

          <div className="space-y-3">
            {contatosFields.map((field, index) => (
              <div key={field.id} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Contato #{index + 1} {index === 0 && '(Principal)'}
                  </span>
                  {contatosFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContato(index)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors text-xs flex items-center gap-1"
                      title="Remover Contato"
                    >
                      <Trash2 size={14} />
                      Remover
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome</label>
                    <input
                      type="text"
                      {...register(`contatos.${index}.nome` as const)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="Nome do contato"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Cargo / Tipo</label>
                    <input
                      type="text"
                      {...register(`contatos.${index}.cargo_tipo` as const)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="Ex: Proprietário, Gerente"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      {...register(`contatos.${index}.telefone` as const)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="+34 600 00 00 00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      {...register(`contatos.${index}.email` as const)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BLOCO 3: Múltiplas Contas Bancárias & Reconhecimento Automático de IBAN */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="h-4.5 w-4.5 text-emerald-600" />
                Dados Bancários e Formas de Pagamento
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">O sistema identifica o Banco e o código SWIFT/BIC automaticamente ao digitar o IBAN.</p>
            </div>
            <button
              type="button"
              onClick={() => appendBanco({ banco: '', iban: '', swift: '', titular_conta: '', metodo_pago: 'Transferir', principal: bancoFields.length === 0 })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-xs font-bold transition-colors"
            >
              <Plus size={14} />
              Adicionar Conta Bancária
            </button>
          </div>

          <div className="space-y-4">
            {bancoFields.map((field, index) => {
              const currentIban = watchedDadosBancarios?.[index]?.iban || '';
              const identifiedBank = identifyBankFromIban(currentIban);

              return (
                <div key={field.id} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      Conta Bancária #{index + 1}
                      {index === 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-full">Principal / Padrão</span>}
                    </span>
                    {bancoFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBanco(index)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors text-xs flex items-center gap-1"
                        title="Remover Conta"
                      >
                        <Trash2 size={14} />
                        Remover Conta
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Método de Pago</label>
                      <select
                        {...register(`dados_bancarios.${index}.metodo_pago` as const)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      >
                        <option value="Transferir">Transferência Bancária (Transferir)</option>
                        <option value="Bizum">Bizum</option>
                        <option value="Pix">Pix / Chave Instantânea</option>
                        <option value="Efectivo">Efectivo / Dinheiro</option>
                        <option value="Tarjeta">Tarjeta / Cartão</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        IBAN / Cuenta / Chave Pix *
                      </label>
                      <input
                        type="text"
                        value={watchedDadosBancarios?.[index]?.iban || ''}
                        onChange={e => handleIbanInputChange(index, e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500"
                        placeholder="Ex: ES09 0182 7307 4202 0009 3104"
                      />

                      {identifiedBank && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md mt-1.5 border border-emerald-200 dark:border-emerald-800 animate-in fade-in duration-150">
                          <Sparkles size={13} className="text-emerald-600 flex-shrink-0" />
                          <span>
                            Banco Reconhecido: <strong className="text-emerald-800 dark:text-emerald-200">{identifiedBank.name}</strong> • SWIFT/BIC: <strong className="font-mono text-emerald-800 dark:text-emerald-200">{identifiedBank.bic}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome do Banco</label>
                      <input
                        type="text"
                        {...register(`dados_bancarios.${index}.banco` as const)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: BBVA, CaixaBank, Santander"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Código SWIFT / BIC</label>
                      <input
                        type="text"
                        {...register(`dados_bancarios.${index}.swift` as const)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: BBVAESMMXXX"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Titular da Conta Bancária</label>
                      <input
                        type="text"
                        {...register(`dados_bancarios.${index}.titular_conta` as const)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: MERCEDES SASTRE VICENTE"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BLOCO 4: Endereço Principal & Localização Fiscal (Vinculado a Tabelas Oficiais de Países e Províncias) */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="h-4.5 w-4.5 text-blue-600" />
            Endereço Principal & Localização Fiscal
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Logradouro / Direção Fiscal (Rua, Número, Andar)
              </label>
              <input
                type="text"
                {...register('endereco')}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Arbúcies, Carrer Mossèn Jacint Verdaguer, núm. 21."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  País (Tabela Oficial)
                </label>
                <CountrySelector
                  value={watchedPais || 'España'}
                  onChange={(_id, name) => {
                    setValue('pais', name || 'España', { shouldDirty: true });
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Província (Tabela Oficial)
                </label>
                <RegionSelector
                  countryName={watchedPais || 'España'}
                  value={watchedProvincia || null}
                  onChange={(_id, name) => {
                    setValue('provincia', name || '', { shouldDirty: true });
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Cidade / Município
                </label>
                <input
                  type="text"
                  {...register('municipio')}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Arbúcies / Sabadell"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Código Postal (Opcional)
                </label>
                <input
                  type="text"
                  {...register('codigo_postal')}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 17401 / 08001"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
