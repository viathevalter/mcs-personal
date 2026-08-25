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
  Building,
  Bed,
  Users,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { registrosService } from '../../services/registrosService';
import type { Provedor } from '../../services/logisticsService';

const alojamentoSchema = z.object({
  nome: z.string().min(1, 'Nome do Alojamento é obrigatório'),
  provedor_id: z.string().optional().nullable(),
  tipo_alojamento: z.string().default('Fijo'),
  classificacao: z.string().default('Privado'),
  capacidade_pessoas: z.coerce.number().min(0).default(0),
  dormitorios: z.coerce.number().min(0).default(0),
  total_camas: z.coerce.number().min(0).default(0),
  camas_individuais: z.coerce.number().min(0).default(0),
  camas_duplas: z.coerce.number().min(0).default(0),
  banheiros: z.coerce.number().min(0).default(0),
  endereco: z.string().optional(),
  municipio: z.string().optional(),
  provincia: z.string().optional(),
  codigo_postal: z.string().optional(),
  pais: z.string().default('España'),
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
  const dataLoadedRef = useRef(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AlojamentoFormValues>({
    resolver: zodResolver(alojamentoSchema),
    defaultValues: {
      nome: '',
      provedor_id: '',
      tipo_alojamento: 'Fijo',
      classificacao: 'Privado',
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
      ativo: true,
    },
  });

  const selectedProvedorId = useWatch({ control, name: 'provedor_id' });

  // Carregar lista de provedores
  useEffect(() => {
    registrosService.fetchProvedores().then((data) => {
      setProvedores(data as Provedor[]);
    }).catch(console.error);
  }, []);

  // Quando o usuário seleciona um provedor, auto-preenche o endereço se estiver vazio
  useEffect(() => {
    if (selectedProvedorId && provedores.length > 0) {
      const prov = provedores.find(p => p.id === selectedProvedorId);
      if (prov) {
        if (prov.pais) setValue('pais', prov.pais, { shouldDirty: true });
        if (prov.provincia) setValue('provincia', prov.provincia, { shouldDirty: true });
        if (prov.municipio) setValue('municipio', prov.municipio, { shouldDirty: true });
        if (prov.codigo_postal) setValue('codigo_postal', prov.codigo_postal, { shouldDirty: true });
        if (prov.endereco) setValue('endereco', prov.endereco, { shouldDirty: true });
      }
    }
  }, [selectedProvedorId, provedores, setValue]);

  // Carregar dados no modo de edição
  useEffect(() => {
    if (id && !dataLoadedRef.current) {
      setIsLoading(true);
      registrosService.fetchAlojamentoById(id).then((a) => {
        if (a) {
          dataLoadedRef.current = true;
          reset({
            nome: a.nome || a.titulo || '',
            provedor_id: a.provedor_id || '',
            tipo_alojamento: a.tipo_alojamento || 'Fijo',
            classificacao: a.classificacao || 'Privado',
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
            ativo: a.ativo ?? true,
          });
        }
      }).catch(err => {
        console.error('Erro ao carregar alojamento:', err);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [id, reset]);

  const onSubmit = async (data: AlojamentoFormValues) => {
    try {
      setIsSubmitting(true);
      const payload = {
        ...data,
        titulo: data.nome,
        provedor_id: data.provedor_id || null,
        pais: data.pais || 'España',
      };

      if (isEditing && id) {
        await registrosService.updateAlojamento(id, payload as any);
      } else {
        await registrosService.createAlojamento(payload as any);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        navigate('/logistica/registros/alojamentos');
      }, 500);
    } catch (error: any) {
      console.error('Error saving alojamento:', error);
      alert(`Erro ao salvar alojamento: ${error.message || 'Verifique os dados informados.'}`);
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
            onClick={() => navigate('/logistica/registros/alojamentos')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              {isEditing ? 'Editar Alojamiento' : 'Nuevo Alojamiento'}
            </h1>
            <p className="text-sm text-slate-500">
              {isEditing ? 'Atualize as informações do imóvel, capacidade e localização' : 'Cadastre um novo alojamento vinculado a um proveedor'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/logistica/registros/alojamentos')}
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
                {isEditing ? 'Salvar Alterações' : 'Cadastrar Alojamento'}
              </>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
        {/* BLOCO 1: Informações do Alojamento & Vínculo com Provedor */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Home className="h-4.5 w-4.5 text-blue-600" />
            Informações do Imóvel & Proveedor
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome / Título do Alojamento *
              </label>
              <input
                type="text"
                {...register('nome')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Alojamiento Arbúcies Centro"
              />
              {errors.nome && (
                <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Proveedor / Proprietário Vinculado
              </label>
              <select
                {...register('provedor_id')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um proveedor (Opcional)</option>
                {provedores.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome_razao_social} {p.municipio ? `(${p.municipio})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Alojamento
              </label>
              <select
                {...register('tipo_alojamento')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Fijo">Fijo (Contrato Anual / Fixo)</option>
                <option value="Temporario">Temporario (Aluguel Curto / Temporada)</option>
                <option value="Propio">Propio (Imóvel Próprio)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Classificação
              </label>
              <select
                {...register('classificacao')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Privado">Privado</option>
                <option value="Compartilhado">Compartilhado</option>
                <option value="Hotel / Pensão">Hotel / Pensão</option>
              </select>
            </div>
          </div>

          {/* Capacidade e Quartos */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Bed size={14} className="text-blue-600" />
              Capacidade e Quartos
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 text-center">Capacidade Total</label>
                <input type="number" {...register('capacidade_pessoas')} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center font-bold" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 text-center">Dormitórios</label>
                <input type="number" {...register('dormitorios')} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center font-bold" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 text-center">Total Camas</label>
                <input type="number" {...register('total_camas')} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center font-bold" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 text-center">Camas Individuais</label>
                <input type="number" {...register('camas_individuais')} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 text-center">Camas Duplas</label>
                <input type="number" {...register('camas_duplas')} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 text-center">Banheiros</label>
                <input type="number" {...register('banheiros')} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center" />
              </div>
            </div>
          </div>
        </div>

        {/* BLOCO 2: Localização / Endereço Principal */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4.5 w-4.5 text-blue-600" />
              Endereço Principal & Localização do Imóvel
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Logradouro / Endereço Completo (Rua, Número, Andar, Porta)
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
                  País
                </label>
                <select
                  {...register('pais')}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="España">🇪🇸 España</option>
                  <option value="Portugal">🇵🇹 Portugal</option>
                  <option value="Brasil">🇧🇷 Brasil</option>
                  <option value="Francia">🇫🇷 Francia</option>
                  <option value="Alemania">🇩🇪 Alemania</option>
                  <option value="Italia">🇮🇹 Italia</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Província / Estado
                </label>
                <input
                  type="text"
                  {...register('provincia')}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Girona / Barcelona / Madrid"
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
