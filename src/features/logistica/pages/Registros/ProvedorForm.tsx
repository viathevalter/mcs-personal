import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, X, Building, Contact, CreditCard, MapPin, Plus, Trash2 } from 'lucide-react';
import { registrosService } from '../../services/registrosService';
import { CountrySelector, RegionSelector } from '@/features/master-data/locations/components/LocationSelectors';
import { useCountries, useRegions } from '@/features/master-data/locations/hooks/useLocations';

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
  country_id: z.string().optional().nullable(),
  region_id: z.string().optional().nullable(),
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

  const { data: countries = [] } = useCountries();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProvedorFormValues>({
    resolver: zodResolver(provedorSchema),
    defaultValues: {
      tipo: 'alojamento',
      tipo_pessoa: 'Persona Jurídica',
      classificacao: 'Proveedor Alojamiento',
      metodo_pago: 'Transferir',
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

  const selectedCountryId = useWatch({ control, name: 'country_id' });
  const selectedRegionId = useWatch({ control, name: 'region_id' });
  const selectedPais = useWatch({ control, name: 'pais' });
  const selectedProvincia = useWatch({ control, name: 'provincia' });

  const { data: regions = [] } = useRegions(selectedCountryId || undefined);

  // Carregar dados se estiver em modo de EDIÇÃO (quando houver ID na URL)
  useEffect(() => {
    if (id) {
      setIsLoading(true);
      registrosService.fetchProvedorById(id).then((p) => {
        if (p) {
          const contatosCarregados = p.contatos && p.contatos.length > 0 ? p.contatos : [
            {
              nome: p.contato_nome || (p as any).contato || '',
              cargo_tipo: 'Proprietário',
              telefone: p.telefone || (p as any).telefono || '',
              email: p.email || ''
            }
          ];

          const dadosBancariosCarregados = p.dados_bancarios && p.dados_bancarios.length > 0 ? p.dados_bancarios : [
            {
              banco: p.banco || '',
              iban: p.iban || '',
              swift: p.swift || '',
              titular_conta: p.titular_conta || '',
              metodo_pago: p.metodo_pago || 'Transferir',
              principal: true
            }
          ];

          const paisTexto = p.pais || (p as any).country || 'España';
          const provinciaTexto = p.provincia || (p as any).estado || (p as any).regiao || '';
          const enderecoTexto = p.endereco || (p as any).direccion || (p as any).direccion_hospedaje || (p as any).logradouro || (p as any).ubicacion_fiscal || '';
          const municipioTexto = p.municipio || (p as any).ciudad || (p as any).cidade || '';
          const codigoPostalTexto = (p as any).codigo_postal || (p as any).cep || (p as any).cp || '';

          // Resolver country_id pelo nome do país se disponível
          let matchedCountryId = (p as any).country_id || null;
          if (!matchedCountryId && paisTexto && countries.length > 0) {
            const foundC = countries.find(c =>
              c.name.toLowerCase().trim() === paisTexto.toLowerCase().trim() ||
              (paisTexto.toLowerCase().includes('espa') && c.name.toLowerCase().includes('espa')) ||
              (paisTexto.toLowerCase().includes('port') && c.name.toLowerCase().includes('port'))
            );
            if (foundC) matchedCountryId = foundC.id;
          }

          reset({
            nome_razao_social: p.nome_razao_social || '',
            nome_comercial: p.nome_comercial || '',
            cif_nif: p.cif_nif || (p as any).cif || (p as any).nif || (p as any).tax_id || '',
            tipo: (p.tipo as any) || 'alojamento',
            tipo_pessoa: (p.tipo_pessoa as any) || 'Persona Jurídica',
            classificacao: p.classificacao || (p as any).tipo_provedor || 'Proveedor Alojamiento',
            contato_nome: p.contato_nome || (p as any).contato || '',
            telefone: p.telefone || (p as any).telefono || '',
            email: p.email || '',
            contatos: contatosCarregados,
            dados_bancarios: dadosBancariosCarregados,
            metodo_pago: p.metodo_pago || 'Transferir',
            banco: p.banco || '',
            iban: p.iban || '',
            swift: p.swift || '',
            titular_conta: p.titular_conta || '',
            endereco: enderecoTexto,
            country_id: matchedCountryId,
            region_id: (p as any).region_id || null,
            municipio: municipioTexto,
            provincia: provinciaTexto,
            codigo_postal: codigoPostalTexto,
            pais: paisTexto,
            ativo: p.ativo ?? true,
          });
        }
      }).catch(err => {
        console.error('Erro ao carregar provedor:', err);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [id, reset, countries]);

  // Sincronizar automaticamente country_id quando o catálogo de países carregar
  useEffect(() => {
    if (!selectedCountryId && selectedPais && countries.length > 0) {
      const foundC = countries.find(c =>
        c.name.toLowerCase().trim() === selectedPais.toLowerCase().trim() ||
        (selectedPais.toLowerCase().includes('espa') && c.name.toLowerCase().includes('espa')) ||
        (selectedPais.toLowerCase().includes('port') && c.name.toLowerCase().includes('port'))
      );
      if (foundC) {
        setValue('country_id', foundC.id);
      }
    }
  }, [countries, selectedPais, selectedCountryId, setValue]);

  // Sincronizar automaticamente region_id quando o catálogo de regiões carregar
  useEffect(() => {
    if (!selectedRegionId && selectedProvincia && regions.length > 0) {
      const foundR = regions.find(r =>
        r.name.toLowerCase().trim() === selectedProvincia.toLowerCase().trim() ||
        r.name.toLowerCase().includes(selectedProvincia.toLowerCase().trim()) ||
        selectedProvincia.toLowerCase().includes(r.name.toLowerCase().trim())
      );
      if (foundR) {
        setValue('region_id', foundR.id);
      }
    }
  }, [regions, selectedProvincia, selectedRegionId, setValue]);

  // Atualizar nomes de país e província em texto quando os seletores mudarem
  useEffect(() => {
    if (selectedCountryId && countries.length > 0) {
      const countryObj = countries.find(c => c.id === selectedCountryId);
      if (countryObj) {
        setValue('pais', countryObj.name);
      }
    }
  }, [selectedCountryId, countries, setValue]);

  useEffect(() => {
    if (selectedRegionId && regions.length > 0) {
      const regionObj = regions.find(r => r.id === selectedRegionId);
      if (regionObj) {
        setValue('provincia', regionObj.name);
      }
    }
  }, [selectedRegionId, regions, setValue]);

  const { fields: contatosFields, append: appendContato, remove: removeContato } = useFieldArray({
    control,
    name: 'contatos'
  });

  const { fields: bancoFields, append: appendBanco, remove: removeBanco } = useFieldArray({
    control,
    name: 'dados_bancarios'
  });

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
        metodo_pago: principalBanco?.metodo_pago || data.metodo_pago || 'Transferir'
      };

      if (isEditing && id) {
        await registrosService.updateProvedor(id, payload as any);
      } else {
        await registrosService.createProvedor(payload as any);
      }

      navigate('/logistica/registros/provedores');
    } catch (error) {
      console.error('Error saving provedor:', error);
      alert('Erro ao salvar provedor. Verifique os dados e o console.');
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
            onClick={() => navigate(-1)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isEditing ? 'Editar Proveedor' : 'Novo Proveedor'}
            </h1>
            <p className="text-sm text-slate-500">
              {isEditing ? 'Atualize os dados cadastrais, contatos, contas bancárias e endereço fiscal.' : 'Cadastre os dados completos do novo fornecedor para alojamentos e serviços.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            <X size={16} />
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit, onError)}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Salvar Proveedor'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
        {/* BLOCO 1: Identificação do Proveedor */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Building className="h-4.5 w-4.5 text-blue-600" />
            Identificação do Proveedor
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nome / Razão Social *</label>
              <input
                type="text"
                {...register('nome_razao_social')}
                className={`w-full px-3.5 py-2 bg-white dark:bg-slate-900 border ${errors.nome_razao_social ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="Ex: ASTUR NORTE SERVICIOS INTEGRALES, S.L."
              />
              {errors.nome_razao_social && <span className="text-xs text-red-500 mt-1 block">{errors.nome_razao_social.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nome Comercial / Fantasia</label>
              <input
                type="text"
                {...register('nome_comercial')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: AsturNorte Servicios"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tipo de Pessoa</label>
              <select
                {...register('tipo_pessoa')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Persona Jurídica">Persona Jurídica (Empresa / S.L.)</option>
                <option value="Persona Física">Persona Física (Proprietário Direto)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Clasificación de Proveedor</label>
              <select
                {...register('tipo')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="alojamento">Proveedor Alojamiento (Inmobiliaria, Hotel, Airbnb)</option>
                <option value="padrao">Proveedor General (EPI, Energía, Serviços)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">CIF / NIF / DNI / TAX ID</label>
              <input
                type="text"
                {...register('cif_nif')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: B12345678"
              />
            </div>
          </div>
        </div>

        {/* BLOCO 2: Contatos & Telefones Múltiplos */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Contact className="h-4.5 w-4.5 text-blue-600" />
              Contatos e Telefones
            </h3>
            <button
              type="button"
              onClick={() => appendContato({ nome: '', cargo_tipo: 'Proprietário', telefone: '', email: '' })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-xs font-bold transition-colors"
            >
              <Plus size={14} />
              Adicionar Contato
            </button>
          </div>

          <div className="space-y-3">
            {contatosFields.map((field, index) => (
              <div key={field.id} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-xs">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome do Contato</label>
                  <input
                    type="text"
                    {...register(`contatos.${index}.nome` as const)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    placeholder="Ex: Sr. Joaquim Prujà Roca"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Cargo / Tipo</label>
                  <input
                    type="text"
                    {...register(`contatos.${index}.cargo_tipo` as const)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    placeholder="Ex: Proprietário, Imobiliária"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    {...register(`contatos.${index}.telefone` as const)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    placeholder="Ex: +34 604 49 14 91"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      {...register(`contatos.${index}.email` as const)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  {contatosFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContato(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BLOCO 3: Múltiplas Contas Bancárias & Formas de Pagamento */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="h-4.5 w-4.5 text-emerald-600" />
              Dados Bancários e Formas de Pagamento
            </h3>
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
            {bancoFields.map((field, index) => (
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

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome do Banco</label>
                    <input
                      type="text"
                      {...register(`dados_bancarios.${index}.banco` as const)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="Ex: CaixaBank, Banco Santander, BBVA"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">IBAN / Cuenta / Chave Pix</label>
                    <input
                      type="text"
                      {...register(`dados_bancarios.${index}.iban` as const)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono uppercase"
                      placeholder="Ex: ES93 2103 2336 2300 3300 0470"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Código SWIFT / BIC</label>
                    <input
                      type="text"
                      {...register(`dados_bancarios.${index}.swift` as const)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono uppercase"
                      placeholder="Ex: CAIXESBBXXX"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Titular da Conta Bancária</label>
                    <input
                      type="text"
                      {...register(`dados_bancarios.${index}.titular_conta` as const)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="Ex: MERCEDES SASTRE VICENTE"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BLOCO 4: Endereço Principal & Localização Fiscal */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="h-4.5 w-4.5 text-blue-600" />
            Endereço Principal & Localização Fiscal
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Logradouro / Dirección Fiscal</label>
              <input
                type="text"
                {...register('endereco')}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Av. da Liberdade, 123 - 4º Andar"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">País</label>
                <CountrySelector
                  value={selectedCountryId || null}
                  onChange={(val) => {
                    setValue('country_id', val);
                    setValue('region_id', null);
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Região / Província</label>
                <RegionSelector
                  countryId={selectedCountryId || null}
                  value={selectedRegionId || null}
                  onChange={(val) => setValue('region_id', val)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Província / Estado</label>
                <input
                  type="text"
                  {...register('provincia')}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Catalunha / Minho"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Cidade</label>
                <input
                  type="text"
                  {...register('municipio')}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Barcelona / Braga"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Código Postal</label>
                <input
                  type="text"
                  {...register('codigo_postal')}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 08001 / 4700-001"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
