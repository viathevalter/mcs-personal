import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, X, Home, MapPin, CheckSquare, FileText, Sparkles } from 'lucide-react';
import { registrosService } from '../../services/registrosService';
import { logisticsService } from '../../services/logisticsService';
import type { Provedor } from '../../services/registrosService';
import { CountrySelector, RegionSelector } from '@/features/master-data/locations/components/LocationSelectors';
import { useCountries, useRegions } from '@/features/master-data/locations/hooks/useLocations';

const alojamentoSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  provedor_id: z.string().min(1, 'Provedor é obrigatório'),
  tipo_alojamento: z.string().optional(),
  classificacao: z.string().optional(),
  capacidade_pessoas: z.coerce.number().default(0),
  dormitorios: z.coerce.number().default(0),
  total_camas: z.coerce.number().default(0),
  camas_individuais: z.coerce.number().default(0),
  camas_duplas: z.coerce.number().default(0),
  banheiros: z.coerce.number().default(0),
  endereco: z.string().optional(),
  country_id: z.string().optional().nullable(),
  region_id: z.string().optional().nullable(),
  municipio: z.string().optional(),
  provincia: z.string().optional(),
  codigo_postal: z.string().optional(),
  pais: z.string().optional(),
  valor_mensal: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || isNaN(Number(val)) ? undefined : Number(val)),
    z.number().optional()
  ),
  ativo: z.boolean().default(true),
  comodidades: z.record(z.boolean()).default({}),
  suministros: z.record(z.boolean()).default({}),
});

type AlojamentoFormValues = z.infer<typeof alojamentoSchema>;

const comodidadesList = ['Wi-Fi', 'Aire acondicionado', 'Parking', 'Cocina'];
const suministrosList = ['Internet', 'Luz', 'Gas', 'Agua', 'Limpieza', 'Otros gastos'];
const clasificacaoList = [
  'Privado',
  'Inmobiliaria',
  'Hotel',
  'Airbnb',
  'Booking',
  'Hostal',
  'Habitación',
  'Pensión'
];

export const AlojamentoForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [provedores, setProvedores] = useState<Provedor[]>([]);
  const [nextSeq, setNextSeq] = useState<string>('0001');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dataLoadedRef = useRef(false);

  const { data: countries = [] } = useCountries();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    reset,
    formState: { errors },
  } = useForm<AlojamentoFormValues>({
    resolver: zodResolver(alojamentoSchema),
    defaultValues: {
      titulo: '',
      provedor_id: '',
      capacidade_pessoas: 10,
      dormitorios: 5,
      total_camas: 10,
      camas_individuais: 6,
      camas_duplas: 4,
      banheiros: 3,
      tipo_alojamento: 'Fijo',
      classificacao: 'Privado',
      endereco: '',
      municipio: '',
      provincia: '',
      codigo_postal: '',
      pais: 'España',
      comodidades: { 'Wi-Fi': true, 'Aire acondicionado': true, 'Parking': true, 'Cocina': true },
      suministros: {},
      ativo: true
    },
  });

  const selectedProvedorId = useWatch({ control, name: 'provedor_id' });
  const selectedCountryId = useWatch({ control, name: 'country_id' });
  const selectedRegionId = useWatch({ control, name: 'region_id' });

  const { data: regions = [] } = useRegions(selectedCountryId || undefined);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [allProvedores, allAlojamentos] = await Promise.all([
          registrosService.fetchProvedores(),
          logisticsService.fetchAlojamentos()
        ]);
        
        setProvedores(allProvedores);

        const count = allAlojamentos.length + 1;
        const seqStr = String(count).padStart(4, '0');
        setNextSeq(seqStr);
      } catch (error) {
        console.error('Failed to load initial data', error);
      }
    };
    loadInitialData();
  }, []);

  // Carregar dados APENAS UMA VEZ ao editar pelo ID
  useEffect(() => {
    if (id && !dataLoadedRef.current) {
      setIsLoading(true);
      registrosService.fetchAlojamentoById(id).then((a) => {
        if (a) {
          dataLoadedRef.current = true;

          const paisTexto = a.pais || (a as any).country || 'España';
          const provinciaTexto = a.provincia || (a as any).estado || '';
          const enderecoTexto = a.endereco || (a as any).direccion || (a as any).direccion_hospedaje || (a as any).logradouro || '';
          const municipioTexto = a.municipio || (a as any).ciudad || (a as any).cidade || '';
          const codigoPostalTexto = a.codigo_postal || (a as any).cep || (a as any).cp || '';

          reset({
            titulo: a.titulo || (a as any).nome || '',
            provedor_id: a.provedor_id || '',
            tipo_alojamento: a.tipo_alojamento || 'Fijo',
            classificacao: a.classificacao || 'Privado',
            capacidade_pessoas: a.capacidade_pessoas || 0,
            dormitorios: a.dormitorios || 0,
            total_camas: a.total_camas || 0,
            camas_individuais: a.camas_individuais || 0,
            camas_duplas: a.camas_duplas || 0,
            banheiros: a.banheiros || 0,
            endereco: enderecoTexto,
            country_id: a.country_id || null,
            region_id: a.region_id || null,
            municipio: municipioTexto,
            provincia: provinciaTexto,
            codigo_postal: codigoPostalTexto,
            pais: paisTexto,
            valor_mensal: a.valor_mensal,
            comodidades: a.comodidades || {},
            suministros: a.suministros || {},
            ativo: a.ativo ?? true
          });
        }
      }).catch(err => {
        console.error('Erro ao carregar alojamento para edição:', err);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [id, reset]);

  // Se o país for resolvido após o catálogo de países carregar, preenche country_id
  useEffect(() => {
    const currentCountryId = getValues('country_id');
    const currentPais = getValues('pais') || 'España';
    if (!currentCountryId && countries.length > 0) {
      const foundC = countries.find(c =>
        c.name.toLowerCase().trim() === currentPais.toLowerCase().trim() ||
        (currentPais.toLowerCase().includes('espa') && c.name.toLowerCase().includes('espa')) ||
        (currentPais.toLowerCase().includes('port') && c.name.toLowerCase().includes('port'))
      );
      if (foundC) {
        setValue('country_id', foundC.id);
      }
    }
  }, [countries, getValues, setValue]);

  // Se a região for resolvida após o catálogo de regiões carregar, preenche region_id
  useEffect(() => {
    const currentRegionId = getValues('region_id');
    const currentProvincia = getValues('provincia');
    if (!currentRegionId && currentProvincia && regions.length > 0) {
      const foundR = regions.find(r =>
        r.name.toLowerCase().trim() === currentProvincia.toLowerCase().trim() ||
        r.name.toLowerCase().includes(currentProvincia.toLowerCase().trim()) ||
        currentProvincia.toLowerCase().includes(r.name.toLowerCase().trim())
      );
      if (foundR) {
        setValue('region_id', foundR.id);
      }
    }
  }, [regions, getValues, setValue]);

  // Preencher título E LOCALIZAÇÃO (País, Província, Cidade, CEP) automaticamente quando o provedor é selecionado
  useEffect(() => {
    if (!isEditing && selectedProvedorId && provedores.length > 0) {
      const prov = provedores.find(p => p.id === selectedProvedorId);
      if (prov) {
        // 1. Título do Imóvel
        const autoTitle = `${prov.nome_razao_social} - AL-${nextSeq}`;
        setValue('titulo', autoTitle, { shouldDirty: true });

        // 2. País
        const provPais = prov.pais || (prov as any).country || 'España';
        setValue('pais', provPais, { shouldDirty: true });
        if (countries.length > 0) {
          const foundC = countries.find(c =>
            c.name.toLowerCase().trim() === provPais.toLowerCase().trim() ||
            (provPais.toLowerCase().includes('espa') && c.name.toLowerCase().includes('espa')) ||
            (provPais.toLowerCase().includes('port') && c.name.toLowerCase().includes('port'))
          );
          if (foundC) {
            setValue('country_id', foundC.id, { shouldDirty: true });
          }
        }

        // 3. Província / Região
        const provProvincia = prov.provincia || (prov as any).estado || (prov as any).regiao || '';
        if (provProvincia) {
          setValue('provincia', provProvincia, { shouldDirty: true });
        }

        // 4. Cidade / Município
        const provMunicipio = prov.municipio || (prov as any).ciudad || (prov as any).cidade || '';
        if (provMunicipio) {
          setValue('municipio', provMunicipio, { shouldDirty: true });
        }

        // 5. Código Postal
        const provCp = prov.codigo_postal || (prov as any).cep || (prov as any).cp || '';
        if (provCp) {
          setValue('codigo_postal', provCp, { shouldDirty: true });
        }

        // 6. Logradouro / Endereço base do provedor (se o usuário ainda não tiver digitado nada)
        const currentEndereco = getValues('endereco');
        const provEndereco = prov.endereco || (prov as any).direccion || (prov as any).direccion_hospedaje || (prov as any).logradouro || '';
        if (!currentEndereco && provEndereco) {
          setValue('endereco', provEndereco, { shouldDirty: true });
        }
      }
    }
  }, [isEditing, selectedProvedorId, provedores, nextSeq, countries, setValue, getValues]);

  const onSubmit = async (data: AlojamentoFormValues) => {
    try {
      setIsSubmitting(true);

      const payload = {
        ...data,
        nome: data.titulo,
        codigo: (data as any).codigo || `AL-${nextSeq}`,
        endereco: data.endereco || '',
        municipio: data.municipio || '',
        provincia: data.provincia || '',
        codigo_postal: data.codigo_postal || '',
        pais: data.pais || 'España',
      };

      if (isEditing && id) {
        await registrosService.updateAlojamento(id, payload as any);
      } else {
        await registrosService.createAlojamento(payload as any);
      }

      navigate('/logistica/registros/alojamentos');
    } catch (error: any) {
      console.error('Error saving alojamento:', error);
      alert(`Erro ao salvar alojamento: ${error.message || 'Verifique o console.'}`);
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
        Carregando dados do alojamento...
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
              {isEditing ? 'Editar Alojamiento' : 'Novo Alojamiento'}
            </h1>
            <p className="text-sm text-slate-500">
              {isEditing ? 'Atualize os detalhes do imóvel e capacidade.' : 'Cadastre os detalhes do imóvel, capacidade de camas, comodidades e localização.'}
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
            {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Salvar Alojamiento'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados do Alojamento */}
          <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Home className="h-4.5 w-4.5 text-blue-600" />
              Datos de Alojamiento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Proveedor *</label>
                <select
                  {...register('provedor_id')}
                  className={`w-full px-3.5 py-2 bg-white dark:bg-slate-900 border ${errors.provedor_id ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg text-sm focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">Seleccione un proveedor...</option>
                  {provedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nome_razao_social}</option>
                  ))}
                </select>
                {errors.provedor_id && <span className="text-xs text-red-500 mt-1 block">{errors.provedor_id.message}</span>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Título / Nombre de Alojamiento *</label>
                <input
                  type="text"
                  {...register('titulo')}
                  className={`w-full px-3.5 py-2 bg-white dark:bg-slate-900 border ${errors.titulo ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg text-sm focus:ring-2 focus:ring-blue-500`}
                  placeholder="Ex: ALBERT PEGUERA - AL-0001"
                />
                {errors.titulo && <span className="text-xs text-red-500 mt-1 block">{errors.titulo.message}</span>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tipo de Alojamiento</label>
                <select {...register('tipo_alojamento')} className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="Fijo">Fijo</option>
                  <option value="Temporario">Temporario</option>
                  <option value="Propio">Propio</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Clasificación</label>
                <select {...register('classificacao')} className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                  {clasificacaoList.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 text-center">Capacidad</label>
                  <input type="number" {...register('capacidade_pessoas')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 text-center">Dormitorios</label>
                  <input type="number" {...register('dormitorios')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 text-center">Total Camas</label>
                  <input type="number" {...register('total_camas')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 text-center">Individuais</label>
                  <input type="number" {...register('camas_individuais')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 text-center">Dobles</label>
                  <input type="number" {...register('camas_duplas')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center" />
                </div>
              </div>
            </div>
          </div>

          {/* Localização / Endereço Principal */}
          <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4.5 w-4.5 text-blue-600" />
                Endereço Principal & Localização
              </h3>
              {selectedProvedorId && (
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={12} />
                  Sincronizado com o Provedor
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Logradouro / Ubicación</label>
                <input
                  type="text"
                  {...register('endereco')}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Arbúcies, Carrer Mossèn Jacint Verdaguer, núm. 21."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">País</label>
                  <CountrySelector
                    value={selectedCountryId || null}
                    onChange={(val) => {
                      setValue('country_id', val, { shouldDirty: true });
                      setValue('region_id', null, { shouldDirty: true });
                      const countryObj = countries.find(c => c.id === val);
                      if (countryObj) {
                        setValue('pais', countryObj.name, { shouldDirty: true });
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Região / Província</label>
                  <RegionSelector
                    countryId={selectedCountryId || null}
                    value={selectedRegionId || null}
                    onChange={(val) => {
                      setValue('region_id', val, { shouldDirty: true });
                      const regionObj = regions.find(r => r.id === val);
                      if (regionObj) {
                        setValue('provincia', regionObj.name, { shouldDirty: true });
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Província / Estado</label>
                  <input
                    type="text"
                    {...register('provincia')}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Girona / Barcelona"
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
                    placeholder="Ex: Arbúcies / Sabadell"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Código Postal</label>
                  <input
                    type="text"
                    {...register('codigo_postal')}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 17401 / 08207"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Comodidades */}
          <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="h-4.5 w-4.5 text-blue-600" />
              Comodidades
            </h3>
            <div className="space-y-3">
              {comodidadesList.map(item => (
                <label key={item} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register(`comodidades.${item}` as any)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Suministro a Pagar */}
          <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm border-l-4 border-l-amber-500">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-amber-600" />
              Suministros Incluidos / A Pagar
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {suministrosList.map(item => (
                <label key={item} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register(`suministros.${item}` as any)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
