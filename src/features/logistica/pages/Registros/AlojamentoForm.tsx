import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, X, Home, MapPin, Image as ImageIcon, CheckSquare, FileText, Euro } from 'lucide-react';
import { registrosService } from '../../services/registrosService';
import type { Provedor } from '../../services/registrosService';

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
  municipio: z.string().optional(),
  pais: z.string().optional(),
  provincia: z.string().optional(),
  valor_mensal: z.coerce.number().optional(),
  ativo: z.boolean().default(true),
  comodidades: z.record(z.boolean()).default({}),
  suministros: z.record(z.boolean()).default({}),
});

type AlojamentoFormValues = z.infer<typeof alojamentoSchema>;

const comodidadesList = ['Wi-Fi', 'Aire acondicionado', 'Parking', 'Cocina'];
const suministrosList = ['Internet', 'Luz', 'Gas', 'Agua', 'Limpieza', 'Otros gastos'];

export const AlojamentoForm: React.FC = () => {
  const navigate = useNavigate();
  const [provedores, setProvedores] = useState<Provedor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
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

  useEffect(() => {
    const loadProvedores = async () => {
      try {
        const data = await registrosService.fetchProvedores();
        setProvedores(data.filter(p => p.tipo === 'alojamento'));
      } catch (error) {
        console.error('Failed to load provedores', error);
      }
    };
    loadProvedores();
  }, []);

  const onSubmit = async (data: AlojamentoFormValues) => {
    try {
      setIsSubmitting(true);
      await registrosService.createAlojamento(data);
      navigate('/logistica/registros/alojamentos');
    } catch (error) {
      console.error('Error creating alojamento:', error);
      alert('Erro ao criar alojamento. Verifique o console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            Registro de Alojamiento
          </h1>
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
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados do Alojamento */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-wider">
                <Home size={16} />
                Datos de Alojamiento
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Proveedor *</label>
                <select
                  {...register('provedor_id')}
                  className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border ${errors.provedor_id ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg text-sm`}
                >
                  <option value="">Seleccione un proveedor...</option>
                  {provedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nome_razao_social}</option>
                  ))}
                </select>
                {errors.provedor_id && <span className="text-xs text-red-500 mt-1 block">{errors.provedor_id.message}</span>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Título de Alojamiento *</label>
                <input
                  type="text"
                  {...register('titulo')}
                  className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border ${errors.titulo ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg text-sm`}
                  placeholder="Ex: ASTUR NORTE..."
                />
                {errors.titulo && <span className="text-xs text-red-500 mt-1 block">{errors.titulo.message}</span>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo de Alojamiento</label>
                <select {...register('tipo_alojamento')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                  <option value="Fijo">Fijo</option>
                  <option value="Temporario">Temporario</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Clasificación</label>
                <select {...register('classificacao')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                  <option value="Privado">Privado</option>
                  <option value="Publico">Publico</option>
                </select>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 text-center">Capacidad</label>
                  <input type="number" {...register('capacidade_pessoas')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 text-center">Dormitorios</label>
                  <input type="number" {...register('dormitorios')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 text-center">Total Camas</label>
                  <input type="number" {...register('total_camas')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 text-center">Camas Indiv.</label>
                  <input type="number" {...register('camas_individuais')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 text-center">Camas Dobles</label>
                  <input type="number" {...register('camas_duplas')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-center" />
                </div>
              </div>
            </div>
          </div>

          {/* Localização */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-wider">
                <MapPin size={16} />
                Localización
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Ubicación</label>
                <input type="text" {...register('endereco')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Municipio</label>
                <input type="text" {...register('municipio')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">País</label>
                <select {...register('pais')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                  <option value="España">España</option>
                  <option value="Portugal">Portugal</option>
                  <option value="France">France</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Provincia</label>
                <input type="text" {...register('provincia')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Alojamiento (Comodidades) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-wider">
                <CheckSquare size={16} />
                Comodidades
              </h2>
            </div>
            <div className="p-5 space-y-3">
              {comodidadesList.map(item => (
                <label key={item} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register(`comodidades.${item}` as any)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Suministro a Pagar */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden border-l-4 border-l-amber-500">
            <div className="border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-sm font-bold text-amber-600 dark:text-amber-500 flex items-center gap-2 uppercase tracking-wider">
                <FileText size={16} />
                Suministro a Pagar
              </h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              {suministrosList.map(item => (
                <label key={item} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register(`suministros.${item}` as any)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Contratos (Basic for now) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-wider">
                <FileText size={16} />
                Financiero
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Monto de alquiler mensual</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="number"
                    step="0.01"
                    {...register('valor_mensal')}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
