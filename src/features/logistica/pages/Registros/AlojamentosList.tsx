import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MapPin, Calendar, CheckCircle2, Settings, ArrowUpDown, Upload, Home, Building } from 'lucide-react';
import { useLanguage } from '@/features/operacoes/i18n';
import { logisticsService } from '../../services/logisticsService';
import type { Alojamento, Provedor } from '../../services/logisticsService';
import { ImportModal } from '../../components/ImportModal';

export const AlojamentosList: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'alojamentos' | 'provedores'>('alojamentos');
  
  const [alojamentos, setAlojamentos] = useState<Alojamento[]>([]);
  const [provedores, setProvedores] = useState<Provedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Ordenação
  const [sortField, setSortField] = useState<string>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'alojamentos') {
        const data = await logisticsService.fetchAlojamentos();
        setAlojamentos(data);
      } else {
        const data = await logisticsService.fetchProvedores();
        setProvedores(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedAlojamentos = [...alojamentos]
    .filter(a => a.nome.toLowerCase().includes(searchTerm.toLowerCase()) || (a.municipio && a.municipio.toLowerCase().includes(searchTerm.toLowerCase())))
    .sort((a, b) => {
      let aVal = (a as any)[sortField] || '';
      let bVal = (b as any)[sortField] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const sortedProvedores = [...provedores]
    .filter(p => p.nome_razao_social.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let aVal = (a as any)[sortField] || '';
      let bVal = (b as any)[sortField] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="w-full px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Registros de Alojamentos & Provedores</h1>
          <p className="text-sm text-slate-500">Gestão cadastral de imóveis, fornecedores e capacidade de alojamento</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 rounded-xl text-sm font-medium transition-colors border border-emerald-200 dark:border-emerald-800 shadow-sm"
          >
            <Upload size={16} />
            Importar Planilha
          </button>
          <button
            onClick={() => navigate('/logistica/registros/alojamentos/novo')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Nuevo Alojamiento
          </button>
          <button
            onClick={() => navigate('/logistica/registros/provedores/novo')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {/* Tabs and Actions */}
        <div className="border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab('alojamentos'); setSortField('nome'); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'alojamentos'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Alojamentos ({alojamentos.length})
            </button>
            <button
              onClick={() => { setActiveTab('provedores'); setSortField('nome_razao_social'); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'provedores'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Proveedores ({provedores.length})
            </button>
          </div>

          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={`Filtrar ${activeTab}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Galeria / Tabela com ordenação e scroll suave */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Carregando registros...</div>
          ) : activeTab === 'alojamentos' ? (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('nome')}>
                    <div className="flex items-center gap-1">
                      Título / Imóvel
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('municipio')}>
                    <div className="flex items-center gap-1">
                      Localização
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('capacidade_pessoas')}>
                    <div className="flex items-center gap-1">
                      Capacidade / Camas
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedAlojamentos.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum alojamento encontrado.</td></tr>
                ) : (
                  sortedAlojamentos.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Home size={16} className="text-blue-600 flex-shrink-0" />
                          <div>
                            <p>{a.nome}</p>
                            <span className="text-[10px] font-normal text-slate-400">{a.codigo}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.provedor?.nome_razao_social || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.municipio || 'N/A'}, {a.pais}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-semibold">
                          {a.capacidade_pessoas} pax / {a.total_camas} camas
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => navigate(`/logistica/registros/alojamentos/editar/${a.id}`)} className="text-blue-600 hover:text-blue-800 font-semibold text-xs">
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('nome_razao_social')}>
                    <div className="flex items-center gap-1">
                      Razão Social / Nome
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('tipo_provedor')}>
                    <div className="flex items-center gap-1">
                      Tipo
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3">Contato / Email</th>
                  <th className="px-4 py-3">IBAN</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedProvedores.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum provedor encontrado.</td></tr>
                ) : (
                  sortedProvedores.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Building size={16} className="text-purple-600 flex-shrink-0" />
                          <div>
                            <p>{p.nome_razao_social}</p>
                            <span className="text-[10px] font-normal text-slate-400">{p.codigo}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.classificacao?.includes('Alojamiento') ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {p.classificacao || 'Proveedor General'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <p>{p.contato_nome || '-'}</p>
                        <p className="text-[11px] text-slate-400">{p.email || '-'}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{p.iban || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => navigate(`/logistica/registros/provedores/editar/${p.id}`)} className="text-blue-600 hover:text-blue-800 font-semibold text-xs">
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
};
