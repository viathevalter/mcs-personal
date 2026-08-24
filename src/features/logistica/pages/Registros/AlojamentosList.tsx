import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MapPin,
  ArrowUpDown,
  Upload,
  Home,
  Building,
  Eye,
  Pencil,
  Trash2,
  Phone,
  Mail,
  CreditCard,
  Check,
  Copy,
  X,
  AlertTriangle,
  ExternalLink,
  Bed,
  Users,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '@/features/operacoes/i18n';
import { logisticsService } from '../../services/logisticsService';
import { registrosService } from '../../services/registrosService';
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

  // Modais de Visualização e Exclusão
  const [viewingProvedor, setViewingProvedor] = useState<Provedor | null>(null);
  const [viewingAlojamento, setViewingAlojamento] = useState<Alojamento | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'alojamento' | 'provedor' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Ordenação e Busca
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

  const handleCopy = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      if (itemToDelete.type === 'provedor') {
        await registrosService.deleteProvedor(itemToDelete.id);
        setProvedores(prev => prev.filter(p => p.id !== itemToDelete.id));
        if (viewingProvedor?.id === itemToDelete.id) setViewingProvedor(null);
      } else {
        await registrosService.deleteAlojamento(itemToDelete.id);
        setAlojamentos(prev => prev.filter(a => a.id !== itemToDelete.id));
        if (viewingAlojamento?.id === itemToDelete.id) setViewingAlojamento(null);
      }
      setItemToDelete(null);
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      alert(`Erro ao excluir: ${error.message || 'Verifique se existem dependências vinculadas.'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const sortedAlojamentos = [...alojamentos]
    .filter(a =>
      a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.municipio && a.municipio.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.provedor?.nome_razao_social && a.provedor.nome_razao_social.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.codigo && a.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
    )
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
    .filter(p =>
      p.nome_razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.nome_comercial && p.nome_comercial.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.contato_nome && p.contato_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.telefone && p.telefone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.iban && p.iban.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.municipio && p.municipio.toLowerCase().includes(searchTerm.toLowerCase()))
    )
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Registros de Alojamentos & Proveedores
          </h1>
          <p className="text-sm text-slate-500">Gestão cadastral de imóveis, fornecedores, contas bancárias e contatos</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 rounded-xl text-sm font-medium transition-colors border border-emerald-200 dark:border-emerald-800 shadow-xs"
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-sm font-medium transition-colors shadow-xs"
          >
            <Plus size={16} />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {/* Tabs & Search */}
        <div className="border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab('alojamentos'); setSortField('nome'); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'alojamentos'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Home size={15} />
              Alojamentos
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                {alojamentos.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('provedores'); setSortField('nome_razao_social'); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'provedores'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Building size={15} />
              Proveedores
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                {provedores.length}
              </span>
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={`Buscar por nome, contato, telefone, cidade, IBAN...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="overflow-x-auto overflow-y-auto max-h-[640px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          {isLoading ? (
            <div className="p-16 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              Carregando registros...
            </div>
          ) : activeTab === 'alojamentos' ? (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('nome')}>
                    <div className="flex items-center gap-1">
                      Imóvel / Título
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Contato / Telefone</th>
                  <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('municipio')}>
                    <div className="flex items-center gap-1">
                      Localização
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('capacidade_pessoas')}>
                    <div className="flex items-center gap-1">
                      Capacidade
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedAlojamentos.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhum alojamento encontrado.</td></tr>
                ) : (
                  sortedAlojamentos.map(a => (
                    <tr
                      key={a.id}
                      onClick={() => setViewingAlojamento(a)}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:scale-105 transition-transform">
                            <Home size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{a.nome}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">{a.codigo || 'AL-XXXX'}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{a.classificacao || 'Privado'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-700 dark:text-slate-300">{a.provedor?.nome_razao_social || '-'}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        {a.provedor?.telefone ? (
                          <a
                            href={`tel:${a.provedor.telefone}`}
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md"
                          >
                            <Phone size={12} />
                            {a.provedor.telefone}
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                          <span>{a.municipio || 'N/A'}{a.provincia ? `, ${a.provincia}` : ''}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold text-xs">
                          <Users size={13} />
                          {a.capacidade_pessoas} pax / {a.total_camas} camas
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingAlojamento(a)}
                            title="Visualizar Detalhes"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => navigate(`/logistica/registros/alojamentos/editar/${a.id}`)}
                            title="Editar Alojamento"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setItemToDelete({ id: a.id, name: a.nome, type: 'alojamento' })}
                            title="Excluir Alojamento"
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
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
                      Proveedor / Razão Social
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3">Responsável / Cargo</th>
                  <th className="px-4 py-3 text-emerald-600 font-bold">Telefone / WhatsApp</th>
                  <th className="px-4 py-3">Dados Bancários / IBAN</th>
                  <th className="px-4 py-3 cursor-pointer select-none hover:text-blue-600" onClick={() => handleSort('municipio')}>
                    <div className="flex items-center gap-1">
                      Localização
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedProvedores.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhum provedor encontrado.</td></tr>
                ) : (
                  sortedProvedores.map(p => {
                    const principalContato = p.contatos?.[0];
                    const contatoNome = principalContato?.nome || p.contato_nome || '-';
                    const contatoCargo = principalContato?.cargo_tipo || 'Proprietário';
                    const telefone = principalContato?.telefone || p.telefone;
                    const principalBanco = p.dados_bancarios?.[0];
                    const ibanPrincipal = principalBanco?.iban || p.iban;
                    const bancoNome = principalBanco?.banco || p.banco;
                    const qtdContas = p.dados_bancarios?.length || (p.iban ? 1 : 0);

                    return (
                      <tr
                        key={p.id}
                        onClick={() => setViewingProvedor(p)}
                        className="hover:bg-purple-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 group-hover:scale-105 transition-transform">
                              <Building size={16} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-100">{p.nome_razao_social}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {p.cif_nif && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold uppercase">
                                    {p.cif_nif}
                                  </span>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                  p.tipo_pessoa === 'Persona Física'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                    : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                }`}>
                                  {p.tipo_pessoa || 'Persona Jurídica'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-700 dark:text-slate-200">{contatoNome}</p>
                          <p className="text-[11px] text-slate-400">{contatoCargo}</p>
                        </td>

                        <td className="px-4 py-3.5">
                          {telefone ? (
                            <a
                              href={`https://wa.me/${telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs transition-colors shadow-2xs"
                              title="Abrir WhatsApp / Discar"
                            >
                              <Phone size={13} className="text-emerald-600" />
                              <span>{telefone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 font-normal">Sem telefone</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {ibanPrincipal ? (
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{ibanPrincipal}</p>
                                <p className="text-[10px] text-slate-400">{bancoNome || 'Banco cadastrado'}</p>
                              </div>
                              <button
                                onClick={e => handleCopy(ibanPrincipal, e)}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                                title="Copiar IBAN"
                              >
                                {copiedText === ibanPrincipal ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              </button>
                              {qtdContas > 1 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  +{qtdContas - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">Sem conta</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                            <span>{p.municipio || p.provincia || 'Espanha'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingProvedor(p)}
                              title="Visualizar Provedor"
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => navigate(`/logistica/registros/provedores/editar/${p.id}`)}
                              title="Editar Provedor"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setItemToDelete({ id: p.id, name: p.nome_razao_social, type: 'provedor' })}
                              title="Excluir Provedor"
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL DE VISUALIZAÇÃO COMPLETA DE PROVEEDOR */}
      {viewingProvedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header Modal */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded-xl">
                  <Building size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{viewingProvedor.nome_razao_social}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {viewingProvedor.cif_nif && (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                        {viewingProvedor.cif_nif}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 rounded-full font-semibold">
                      {viewingProvedor.tipo_pessoa || 'Persona Jurídica'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingProvedor(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Contatos */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Phone size={14} className="text-blue-600" />
                  Contatos e Telefones
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(viewingProvedor.contatos && viewingProvedor.contatos.length > 0 ? viewingProvedor.contatos : [
                    { nome: viewingProvedor.contato_nome || 'Responsável', cargo_tipo: 'Proprietário', telefone: viewingProvedor.telefone, email: viewingProvedor.email }
                  ]).map((c, i) => (
                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5">
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-100">{c.nome || 'Contato'}</span>
                        <span className="text-xs text-slate-400">{c.cargo_tipo || 'Proprietário'}</span>
                      </div>
                      {c.telefone && (
                        <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                          <Phone size={13} />
                          <a href={`https://wa.me/${c.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline">
                            {c.telefone}
                          </a>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Mail size={13} />
                          <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contas Bancárias */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <CreditCard size={14} className="text-emerald-600" />
                  Contas Bancárias & Pagamentos ({viewingProvedor.dados_bancarios?.length || (viewingProvedor.iban ? 1 : 0)})
                </h3>
                <div className="space-y-3">
                  {(viewingProvedor.dados_bancarios && viewingProvedor.dados_bancarios.length > 0 ? viewingProvedor.dados_bancarios : [
                    { banco: viewingProvedor.banco, iban: viewingProvedor.iban, swift: viewingProvedor.swift, titular_conta: viewingProvedor.titular_conta, metodo_pago: viewingProvedor.metodo_pago, principal: true }
                  ]).map((b, i) => (
                    <div key={i} className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {b.banco || 'Banco Principal'}
                          {i === 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">Principal</span>}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded">
                          {b.metodo_pago || 'Transferir'}
                        </span>
                      </div>

                      {b.iban && (
                        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">IBAN / Cuenta</span>
                            <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{b.iban}</span>
                          </div>
                          <button
                            onClick={() => handleCopy(b.iban!)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 rounded-md transition-colors"
                          >
                            {copiedText === b.iban ? <Check size={14} /> : <Copy size={14} />}
                            {copiedText === b.iban ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-slate-600 dark:text-slate-300">
                        {b.titular_conta && <p><span className="text-slate-400">Titular:</span> {b.titular_conta}</p>}
                        {b.swift && <p><span className="text-slate-400">SWIFT:</span> <span className="font-mono">{b.swift}</span></p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Endereço & Localização */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <MapPin size={14} className="text-rose-600" />
                  Endereço & Localização Fiscal
                </h3>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{viewingProvedor.endereco || 'Logradouro não informado'}</p>
                  <p className="text-slate-500 text-xs">
                    {[viewingProvedor.municipio, viewingProvedor.provincia, viewingProvedor.pais].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
              <button
                onClick={() => {
                  const id = viewingProvedor.id;
                  const name = viewingProvedor.nome_razao_social;
                  setViewingProvedor(null);
                  setItemToDelete({ id, name, type: 'provedor' });
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
              >
                <Trash2 size={14} />
                Excluir Provedor
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setViewingProvedor(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    const provId = viewingProvedor.id;
                    setViewingProvedor(null);
                    navigate(`/logistica/registros/provedores/editar/${provId}`);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  <Pencil size={14} />
                  Editar Provedor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO COMPLETA DE ALOJAMIENTO */}
      {viewingAlojamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header Modal */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-xl">
                  <Home size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{viewingAlojamento.nome}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                      {viewingAlojamento.codigo || 'AL-XXXX'}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-full font-semibold">
                      {viewingAlojamento.classificacao || 'Privado'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingAlojamento(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Capacidade e Quartos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl text-center">
                  <span className="text-xs text-blue-600 font-bold block mb-1">Capacidade</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{viewingAlojamento.capacidade_pessoas} pax</span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                  <span className="text-xs text-slate-500 font-bold block mb-1">Dormitórios</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{viewingAlojamento.dormitorios}</span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                  <span className="text-xs text-slate-500 font-bold block mb-1">Total Camas</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{viewingAlojamento.total_camas}</span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                  <span className="text-xs text-slate-500 font-bold block mb-1">Banheiros</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{viewingAlojamento.banheiros || 1}</span>
                </div>
              </div>

              {/* Proveedor Vinculado */}
              <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Proveedor Vinculado</span>
                <p className="font-bold text-slate-800 dark:text-slate-100">{viewingAlojamento.provedor?.nome_razao_social || 'Proveedor não especificado'}</p>
                {viewingAlojamento.provedor?.telefone && (
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 pt-1">
                    <Phone size={13} />
                    {viewingAlojamento.provedor.telefone}
                  </p>
                )}
              </div>

              {/* Endereço */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Endereço Completo</span>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{viewingAlojamento.endereco || 'Endereço não cadastrado'}</p>
                <p className="text-slate-500 text-xs">
                  {[viewingAlojamento.municipio, viewingAlojamento.provincia, viewingAlojamento.pais].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
              <button
                onClick={() => {
                  const id = viewingAlojamento.id;
                  const name = viewingAlojamento.nome;
                  setViewingAlojamento(null);
                  setItemToDelete({ id, name, type: 'alojamento' });
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
              >
                <Trash2 size={14} />
                Excluir Alojamento
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setViewingAlojamento(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    const alojId = viewingAlojamento.id;
                    setViewingAlojamento(null);
                    navigate(`/logistica/registros/alojamentos/editar/${alojId}`);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  <Pencil size={14} />
                  Editar Alojamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 dark:bg-red-950/50 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300">
              Tem certeza que deseja remover o {itemToDelete.type === 'provedor' ? 'fornecedor' : 'alojamento'}{' '}
              <strong className="text-slate-900 dark:text-white">{itemToDelete.name}</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 size={14} />
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchData();
          setIsImportModalOpen(false);
        }}
      />
    </div>
  );
};
