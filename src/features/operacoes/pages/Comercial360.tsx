import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchComercial360 } from '../services/queries';
import { ArrowLeft, UserCircle } from 'lucide-react';
import { HeatbarTable } from '../components/HeatbarTable';

export const Comercial360 = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (id) fetchComercial360(id).then(setData);
  }, [id]);

  if (!data) return <div className="p-8">Carregando perfil...</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Voltar
      </button>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-6 transition-colors">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500">
          <UserCircle size={40} />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.nome}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Executivo de Contas</p>
        </div>
        <div className="flex gap-8">
          {data.kpis.map((k: any, i: number) => (
            <div key={i} className="text-right">
              <div className="text-xs text-slate-400 dark:text-slate-500 uppercase">{k.label}</div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96">
          <HeatbarTable title="Carteira de Clientes (Top 5)" items={data.topClientes} linkPrefix="/clientes" />
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Pipeline Ativo</h3>
          <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            Gráfico de Pipeline Aqui
          </div>
        </div>
      </div>
    </div>
  );
};
