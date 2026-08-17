import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, X, Home, MapPin, CheckSquare, FileText, Euro } from 'lucide-react';
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
  const [provedores, setProvedores] = useState<Provedor[]>([]);
  const [nextSeq, setNextSeq] = useState<string>('0001');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: countries = [] } = useCountries();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<AlojamentoFormValues>({
    resolver: zodResolver(alojamentoSchema),
    defaultValues: {
      capacidade_pessoas: 10,
      dormitorios: 5,
      total_camas: 10,
      camas_individuais: 6,
      camas_duplas: 4,
      banheiros: 3,
      tipo_alojamento: 'Fijo',
      classificacao: 'Privado',
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

  // Preencher título automaticamente quando o provedor é selecionado
  useEffect(() => {
    if (selectedProvedorId && provedores.length > 0) {
      const prov = provedores.find(p => p.id === selectedProvedorId);
      if (prov) {
        const autoTitle = `${prov.nome_razao_social} - AL-${nextSeq}`;
        setValue('titulo', autoTitle);
      }
    }
  }, [selectedProvedorId, provedores, nextSeq, setValue]);

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

  const onSubmit = async (data: AlojamentoFormValues) => {
    try {
      setIsSubmitting(true);

      const payload = {
        ...data,
        nome: data.titulo,
        codigo: `AL-${nextSeq}`,
      };

      await registrosService.createAlojamento(payload as any);
      navigate('/logistica/registros/alojamentos');
    } catch (error: any) {
      console.error('Error creating alojamento:', error);
      alert(`Erro ao criar alojamento: ${error.message || 'Verifique o console.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errs: any) => {
    console.error('Form Validation Errors:', errs);
    const firstKey = Object.keys(errs)[0];
    alert(`Atenção: O campo "${firstKey}" necessita ajuste: ${errs[firstKey]?.message || 'Verifique o preenchimento.'}`);
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
              Novo Alojamiento
            </h1>
            <p className="text-sm text-slate-500">Cadastre os detalhes do imóvel, capacidade de camas, comodidades e localização.</p>
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
            {isSubmitting ? 'Salvando...' : 'Salvar Alojamiento'}
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

          {/* Localização / Endereço Principal (Padrão Master Data / Clientes) */}
          <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4.5 w-4.5 text-blue-600" />
              Endereço Principal & Localização
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Logradouro / Ubicación</label>
                <input
                  type="text"
                  {...register('endereco')}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Carrer de Collsaerola, 3. 3º 08207 Sabadell, Barcelona"
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
                    placeholder="Ex: Barcelona"
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
                    placeholder="Ex: Sabadell"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Código Postal</label>
                  <input
                    type="text"
                    {...register('codigo_postal')}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 08207"
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
