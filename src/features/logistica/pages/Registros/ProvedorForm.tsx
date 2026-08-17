import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: countries = [] } = useCountries();

  const {
    register,
    handleSubmit,
    control,
    setValue,
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
      ]
    },
  });

  const selectedCountryId = useWatch({ control, name: 'country_id' });
  const selectedRegionId = useWatch({ control, name: 'region_id' });

  const { data: regions = [] } = useRegions(selectedCountryId || undefined);

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

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'contatos'
  });

  const onSubmit = async (data: ProvedorFormValues) => {
    try {
      setIsSubmitting(true);

      const principal = data.contatos[0];
      const payload = {
        ...data,
        contato_nome: principal?.nome || data.contato_nome || '',
        telefone: principal?.telefone || data.telefone || '',
        email: principal?.email || data.email || ''
      };

      await registrosService.createProvedor(payload as any);
      navigate('/logistica/registros/alojamentos');
    } catch (error) {
      console.error('Error creating provedor:', error);
      alert('Erro ao criar provedor. Verifique os dados e o console.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Novo Proveedor
            </h1>
            <p className="text-sm text-slate-500">Cadastre os dados completos do novo fornecedor para alojamentos e serviços.</p>
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
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {isSubmitting ? 'Salvando...' : 'Salvar Proveedor'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              onClick={() => append({ nome: '', cargo_tipo: 'Proprietário', telefone: '', email: '' })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-xs font-bold transition-colors"
            >
              <Plus size={14} />
              Adicionar Contato
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-xs">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome do Contato</label>
                  <input
                    type="text"
                    {...register(`contatos.${index}.nome` as const)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    placeholder="Ex: Rebeca Conde"
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
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Telefone</label>
                  <input
                    type="text"
                    {...register(`contatos.${index}.telefone` as const)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    placeholder="Ex: +34 666 45 55 12"
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
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
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

        {/* BLOCO 3: Forma de Pagamento & Dados Bancários */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="h-4.5 w-4.5 text-emerald-600" />
            Dados Bancários e Forma de Pagamento
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Método Principal de Pago</label>
              <select
                {...register('metodo_pago')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Transferir">Transferência Bancária (Transferir)</option>
                <option value="Bizum">Bizum</option>
                <option value="Pix">Pix / Chave Instantânea</option>
                <option value="Efectivo">Efectivo / Dinheiro</option>
                <option value="Tarjeta">Tarjeta / Cartão</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nome do Banco</label>
              <input
                type="text"
                {...register('banco')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: CaixaBank, Banco Santander, BBVA"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">IBAN / Cuenta / Chave Pix</label>
              <input
                type="text"
                {...register('iban')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: ES93 2103 2336 2300 3300 0470"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Código SWIFT / BIC</label>
              <input
                type="text"
                {...register('swift')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: CAIXESBBXXX"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Titular da Conta Bancária</label>
              <input
                type="text"
                {...register('titular_conta')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: MERCEDES SASTRE VICENTE"
              />
            </div>
          </div>
        </div>

        {/* BLOCO 4: Endereço Principal & Localização Fiscal (Padrão Master Data / Clientes) */}
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
