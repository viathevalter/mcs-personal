import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MapPin, Calendar, CheckCircle2, Settings } from 'lucide-react';
import { useLanguage } from '@/features/operacoes/i18n';
import { registrosService } from '../../services/registrosService';
import type { Alojamento, Provedor } from '../../services/registrosService';

export const AlojamentosList: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'alojamentos' | 'provedores'>('alojamentos');
  
  const [alojamentos, setAlojamentos] = useState<Alojamento[]>([]);
  const [provedores, setProvedores] = useState<Provedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'alojamentos') {
          const data = await registrosService.fetchAlojamentos();
          setAlojamentos(data);
        } else {
          const data = await registrosService.fetchProvedores();
          setProvedores(data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Registros</h1>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {/* Tabs and Actions */}
        <div className="border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('alojamentos')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'alojamentos'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Alojamentos
            </button>
            <button
              onClick={() => setActiveTab('provedores')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'provedores'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Proveedores
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/logistica/registros/alojamentos/novo')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Nuevo Alojamiento
            </button>
            <button
              onClick={() => navigate('/logistica/registros/provedores/novo')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus size={16} />
              Nuevo Proveedor
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Buscar {activeTab === 'alojamentos' ? 'Alojamentos' : 'Proveedores'}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Carregando dados...</div>
          ) : activeTab === 'alojamentos' ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Localização</th>
                  <th className="px-4 py-3">Capacidade</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {alojamentos.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum alojamento cadastrado.</td></tr>
                ) : (
                  alojamentos.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{a.titulo}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.provedor?.nome_razao_social || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.municipio}, {a.pais}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.capacidade_pessoas} pax / {a.total_camas} camas</td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-blue-600 hover:text-blue-800 text-xs font-medium">Ver / Editar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Nome / Razão Social</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {provedores.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum provedor cadastrado.</td></tr>
                ) : (
                  provedores.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{p.nome_razao_social}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <span className={`px-2 py-1 rounded-full text-xs ${p.tipo === 'alojamento' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                          {p.tipo === 'alojamento' ? 'Alojamiento' : 'Estándar'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.contato_nome || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.email || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-blue-600 hover:text-blue-800 text-xs font-medium">Ver / Editar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
