import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCliente360 } from '../services/queries';
import { ArrowLeft } from 'lucide-react';

export const Cliente360 = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (id) fetchCliente360(id).then(setData);
  }, [id]);

  if (!data) return <div className="p-8">Carregando perfil...</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Voltar
      </button>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.nome}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">ID: {data.id}</p>
        </div>
        <div className="flex gap-4">
          {data.kpis.map((k: any, i: number) => (
            <div key={i} className="text-right">
              <div className="text-xs text-slate-400 dark:text-slate-500 uppercase">{k.label}</div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Últimos Pedidos</h3>
          <ul className="space-y-3">
            {data.pedidos.map((p: any) => (
              <li key={p.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded transition-colors">
                <span className="font-medium text-blue-600 dark:text-blue-400">{p.CodPedido}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{p.DataInicio}</span>
                <span className="text-xs font-semibold px-2 py-1 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded text-slate-700 dark:text-slate-300">{p.Status}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Alertas e Comentários</h3>
          <textarea className="w-full h-32 p-3 border dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-colors" placeholder="Adicionar nota sobre o cliente..."></textarea>
          <button className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-800 dark:hover:text-blue-300 transition-colors">Salvar Nota</button>
        </div>
      </div>
    </div>
  );
};
