import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Sparkles,
  Wifi,
  Snowflake,
  Car,
  UtensilsCrossed,
  Flame,
  Tv,
  Shirt,
  ArrowUpCircle,
  Globe,
  Droplets,
  Zap,
  DollarSign,
  Download,
  Maximize2,
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Info
} from 'lucide-react';
import { useLanguage } from '@/features/operacoes/i18n';
import { logisticsService } from '../../services/logisticsService';
import { registrosService } from '../../services/registrosService';
import type { Alojamento, Provedor } from '../../services/logisticsService';
import { ImportModal } from '../../components/ImportModal';

export const AlojamentosList: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'alojamentos' | 'provedores'>(
    location.pathname.includes('provedores') ? 'provedores' : 'alojamentos'
  );

  const [alojamentos, setAlojamentos] = useState<Alojamento[]>([]);
  const [provedores, setProvedores] = useState<Provedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Modais de Visualização e Exclusão
  const [viewingProvedor, setViewingProvedor] = useState<Provedor | null>(null);
  const [viewingAlojamento, setViewingAlojamento] = useState<Alojamento | null>(null);
  const [activeViewPhotoIndex, setActiveViewPhotoIndex] = useState<number>(0);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);
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
      const [alojRes, provRes] = await Promise.allSettled([
        registrosService.fetchAlojamentos(),
        registrosService.fetchProvedores()
      ]);
      if (alojRes.status === 'fulfilled' && Array.isArray(alojRes.value)) {
        setAlojamentos(alojRes.value);
      }
      if (provRes.status === 'fulfilled' && Array.isArray(provRes.value)) {
        setProvedores(provRes.value);
      }
    } catch (error) {
      console.error('Error fetching data in list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (location.pathname.includes('provedores')) {
      setActiveTab('provedores');
    } else {
      setActiveTab('alojamentos');
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchData();
  }, []);

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
    .filter(a => {
      const search = (searchTerm || '').toLowerCase();
      if (!search) return true;
      return (
        (a.nome || a.titulo || '').toLowerCase().includes(search) ||
        (a.codigo || '').toLowerCase().includes(search) ||
        (a.endereco || '').toLowerCase().includes(search) ||
        (a.municipio || '').toLowerCase().includes(search) ||
        (a.provincia || '').toLowerCase().includes(search) ||
        (a.provedor?.nome_razao_social || '').toLowerCase().includes(search)
      );
    })
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
    .filter(p => {
      const search = (searchTerm || '').toLowerCase();
      if (!search) return true;
      return (
        (p.nome_razao_social || '').toLowerCase().includes(search) ||
        (p.nome_comercial || '').toLowerCase().includes(search) ||
        (p.contato_nome || '').toLowerCase().includes(search) ||
        (p.telefone || '').toLowerCase().includes(search) ||
        (p.iban || '').toLowerCase().includes(search) ||
        (p.municipio || '').toLowerCase().includes(search) ||
        (p.provincia || '').toLowerCase().includes(search)
      );
    })
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
                    {[
                      viewingProvedor.municipio,
                      viewingProvedor.provincia,
                      viewingProvedor.codigo_postal ? `CP: ${viewingProvedor.codigo_postal}` : null,
                      viewingProvedor.pais
                    ].filter(Boolean).join(' • ')}
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
                    const id = viewingProvedor.id;
                    setViewingProvedor(null);
                    navigate(`/logistica/registros/provedores/editar/${id}`);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Pencil size={13} />
                  Editar Provedor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO COMPLETA DE ALOJAMIENTO */}
      {viewingAlojamento && (() => {
        const comod = viewingAlojamento.comodidades || {};
        const sumin = viewingAlojamento.suministros || {};
        const cont = viewingAlojamento.contrato || (comod as any).__contrato || {};
        const rawFotos: string[] = viewingAlojamento.fotos && viewingAlojamento.fotos.length > 0
          ? viewingAlojamento.fotos
          : Array.isArray((comod as any).__fotos)
            ? (comod as any).__fotos
            : [];
        const currentPhoto = rawFotos[activeViewPhotoIndex] || rawFotos[0];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[94vh] overflow-hidden flex flex-col shadow-2xl">
              
              {/* Header Modal */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
                    <Home size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        {viewingAlojamento.nome}
                      </h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        viewingAlojamento.ativo !== false && viewingAlojamento.status !== 'Inactivo'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {viewingAlojamento.status || (viewingAlojamento.ativo !== false ? 'Activo' : 'Inactivo')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                        {viewingAlojamento.codigo || 'AL-0001'}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold">
                        {viewingAlojamento.tipo_alojamento || 'Fijo'}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-medium">
                        {viewingAlojamento.classificacao || 'Privado'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setViewingAlojamento(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content Scrollable */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                
                {/* 1. SEÇÃO DE FOTOS DO IMÓVEL */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={15} className="text-blue-600" />
                      Galeria de Fotos do Imóvel ({rawFotos.length})
                    </span>
                    {rawFotos.length > 0 && (
                      <span className="text-xs text-slate-400 font-medium">
                        Foto {activeViewPhotoIndex + 1} de {rawFotos.length}
                      </span>
                    )}
                  </div>

                  {rawFotos.length > 0 ? (
                    <div className="space-y-3">
                      {/* Foto Principal em Destaque */}
                      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 group h-64 sm:h-80 flex items-center justify-center">
                        <img
                          src={currentPhoto}
                          alt="Foto do Alojamento"
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 cursor-pointer"
                          onClick={() => setZoomPhotoUrl(currentPhoto)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                        
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          <button
                            onClick={() => setZoomPhotoUrl(currentPhoto)}
                            className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md transition-colors"
                            title="Ampliar Foto"
                          >
                            <Maximize2 size={16} />
                          </button>
                          <a
                            href={currentPhoto}
                            download={`alojamento-foto-${activeViewPhotoIndex + 1}.jpg`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md transition-colors"
                            title="Baixar Imagem"
                          >
                            <Download size={16} />
                          </a>
                        </div>

                        <div className="absolute bottom-3 left-3 text-white text-xs font-semibold bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg">
                          📸 {viewingAlojamento.nome}
                        </div>
                      </div>

                      {/* Miniaturas */}
                      {rawFotos.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {rawFotos.map((f, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveViewPhotoIndex(idx)}
                              className={`relative flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                                activeViewPhotoIndex === idx
                                  ? 'border-blue-600 ring-2 ring-blue-600/30 scale-102'
                                  : 'border-transparent opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img src={f} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-2 bg-white dark:bg-slate-900/50">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto">
                        <ImageIcon size={24} />
                      </div>
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Nenhuma foto anexada a este imóvel</p>
                      <p className="text-xs text-slate-400">
                        Você pode clicar em <strong>Editar Alojamento</strong> para carregar imagens ou colar prints com <strong>Ctrl + V</strong>.
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. GRID PRINCIPAL: CAPACIDADE, LOCALIZAÇÃO & PROVEDOR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Capacidade e Camas */}
                  <div className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={15} className="text-blue-600" />
                      Capacidade & Dormitórios
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-center">
                        <span className="text-[10px] text-slate-400 font-bold block">Capacidade</span>
                        <span className="text-sm font-black text-blue-700 dark:text-blue-300">{viewingAlojamento.capacidade_pessoas} pax</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl text-center">
                        <span className="text-[10px] text-slate-400 font-bold block">Dormitórios</span>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{viewingAlojamento.dormitorios || 0}</span>
                      </div>
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-center">
                        <span className="text-[10px] text-slate-400 font-bold block">Total Camas</span>
                        <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{viewingAlojamento.total_camas || 0}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                      <div className="p-2 bg-slate-50 dark:bg-slate-700/20 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block">Individuais</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{viewingAlojamento.camas_individuais || 0}</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-700/20 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block">Duplas / Casal</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{viewingAlojamento.camas_duplas || 0}</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-700/20 rounded-lg text-center">
                        <span className="text-[10px] text-slate-400 block">Banheiros</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{viewingAlojamento.banheiros || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Proveedor & Localização */}
                  <div className="space-y-3">
                    {/* Proveedor */}
                    <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-2xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Building size={13} />
                          Proveedor Vinculado
                        </span>
                        {viewingAlojamento.provedor?.codigo && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 rounded">
                            {viewingAlojamento.provedor.codigo}
                          </span>
                        )}
                      </div>
                      <p className="font-black text-slate-800 dark:text-slate-100 text-sm">
                        {viewingAlojamento.provedor?.nome_razao_social || 'Proveedor não especificado'}
                      </p>
                      {viewingAlojamento.provedor?.telefone && (
                        <a
                          href={`https://wa.me/${viewingAlojamento.provedor.telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline pt-0.5"
                        >
                          <Phone size={13} />
                          {viewingAlojamento.provedor.telefone}
                        </a>
                      )}
                    </div>

                    {/* Localização */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1">
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={13} />
                        Localização Completa
                      </span>
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                        {viewingAlojamento.endereco || 'Endereço não cadastrado'}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {[
                          viewingAlojamento.municipio,
                          viewingAlojamento.provincia,
                          viewingAlojamento.codigo_postal ? `CP: ${viewingAlojamento.codigo_postal}` : null,
                          viewingAlojamento.pais || 'España'
                        ].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. COMODIDADES & SUPRIMENTOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Comodidades */}
                  <div className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      Comodidades do Imóvel
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: 'wifi', label: 'Wi-Fi', icon: Wifi },
                        { key: 'aire_acondicionado', label: 'Ar-Condicionado', icon: Snowflake },
                        { key: 'parking', label: 'Parking', icon: Car },
                        { key: 'cocina', label: 'Cozinha', icon: UtensilsCrossed },
                        { key: 'calefaccion', label: 'Aquecimento', icon: Flame },
                        { key: 'lavadora', label: 'Lavadora', icon: Shirt },
                        { key: 'tv', label: 'TV', icon: Tv },
                        { key: 'ascensor', label: 'Elevador', icon: ArrowUpCircle },
                      ].map(item => {
                        const active = !!comod[item.key];
                        const Icon = item.icon;
                        return (
                          <span
                            key={item.key}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              active
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 opacity-60'
                            }`}
                          >
                            <Icon size={13} />
                            {item.label}
                            {active ? '✓' : '✗'}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Suprimentos */}
                  <div className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Droplets size={14} className="text-cyan-500" />
                      Suprimentos a Pagar / Inclusos
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: 'internet', label: 'Internet', icon: Globe },
                        { key: 'agua', label: 'Água', icon: Droplets },
                        { key: 'luz', label: 'Luz / Energia', icon: Zap },
                        { key: 'gas', label: 'Gás', icon: Flame },
                        { key: 'limpieza', label: 'Limpeza', icon: Shirt },
                        { key: 'otros', label: 'Outros Gastos', icon: Info },
                      ].map(item => {
                        const active = !!sumin[item.key];
                        const Icon = item.icon;
                        return (
                          <span
                            key={item.key}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              active
                                ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 opacity-60'
                            }`}
                          >
                            <Icon size={13} />
                            {item.label}
                            {active ? '✓' : '✗'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 4. CONTRATO & CONDIÇÕES FINANCEIRAS */}
                <div className="p-5 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/60 pb-3">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign size={15} />
                      Contrato & Condições Financeiras
                    </span>
                    {cont.codigo && (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 rounded-md">
                        {cont.codigo}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Modalidade</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {cont.tipo_contrato || viewingAlojamento.tipo_alojamento || 'Fijo'}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Aluguel / Custo Mensal</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        € {(viewingAlojamento.valor_mensal || cont.valor_mensal || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Fiança / Depósito</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {cont.tem_fianza || Number(cont.fianza_valor) > 0
                          ? `€ ${Number(cont.fianza_valor || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} (${cont.fianza_meses || 1}m)`
                          : 'Sem Fiança (Airbnb/Hotel)'}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Vencimento</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Dia {cont.dia_vencimento || 5} do mês
                      </span>
                    </div>
                  </div>

                  {/* Vigência & Banco */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
                        <Calendar size={12} />
                        Período de Vigência
                      </span>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {cont.data_inicio ? `Início: ${cont.data_inicio}` : 'Data Início: Não definida'}
                        {cont.data_fim ? ` • Término: ${cont.data_fim}` : ''}
                      </p>
                      {cont.renovacao_automatica && (
                        <span className="text-[10px] text-emerald-600 font-semibold block">
                          ✓ Renovação Automática ({cont.aviso_renovacao_dias || 5} dias aviso)
                        </span>
                      )}
                    </div>

                    {/* Dados Bancários */}
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
                          <CreditCard size={12} />
                          Dados de Pagamento
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-600 dark:text-slate-400">
                          {cont.metodo_pago || viewingAlojamento.provedor?.metodo_pago || 'Transferir'}
                        </span>
                      </div>

                      {(cont.iban || viewingAlojamento.provedor?.iban) ? (
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-lg">
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                            {cont.iban || viewingAlojamento.provedor?.iban}
                          </span>
                          <button
                            onClick={() => handleCopy(cont.iban || viewingAlojamento.provedor?.iban || '')}
                            className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded hover:opacity-80 transition-opacity"
                          >
                            {copiedText === (cont.iban || viewingAlojamento.provedor?.iban) ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">IBAN não informado</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. OBSERVAÇÕES */}
                {viewingAlojamento.observacoes && (
                  <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
                      <FileText size={12} />
                      Instruções & Observações do Imóvel
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {viewingAlojamento.observacoes}
                    </p>
                  </div>
                )}

              </div>

              {/* Footer Modal Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex justify-between items-center">
                <button
                  onClick={() => {
                    const id = viewingAlojamento.id;
                    const name = viewingAlojamento.nome;
                    setViewingAlojamento(null);
                    setItemToDelete({ id, name, type: 'alojamento' });
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                >
                  <Trash2 size={14} />
                  Excluir Alojamento
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingAlojamento(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => {
                      const alojId = viewingAlojamento.id;
                      setViewingAlojamento(null);
                      navigate(`/logistica/registros/alojamentos/editar/${alojId}`);
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm"
                  >
                    <Pencil size={14} />
                    Editar Alojamento
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL DE ZOOM DE FOTO */}
      {zoomPhotoUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setZoomPhotoUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <img src={zoomPhotoUrl} alt="Zoom Preview" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
            <button
              onClick={() => setZoomPhotoUrl(null)}
              className="absolute top-4 right-4 p-2.5 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <a
              href={zoomPhotoUrl}
              download="alojamento-foto.jpg"
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-4 right-4 flex items-center gap-1.5 px-4 py-2 bg-black/70 hover:bg-black/90 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Download size={14} />
              Baixar Foto Original
            </a>
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
