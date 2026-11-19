import React, { useEffect, useMemo, useState } from 'react';
import {
  HardHat,
  Search,
  Plus,
  RefreshCw,
  Edit,
  X,
  Tag,
  Ruler,
} from 'lucide-react';
import { toast } from 'sonner';
import { almacenService } from '../services/almacenService';
import type { AlmacenEpi } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const CatalogoEpisAlmacenPage: React.FC = () => {
  const [epis, setEpis] = useState<AlmacenEpi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingEpi, setEditingEpi] = useState<AlmacenEpi | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Estandar');
  const [unit, setUnit] = useState('Ud');
  const [defaultCost, setDefaultCost] = useState('0');
  const [hasSizes, setHasSizes] = useState(false);
  const [isBranded, setIsBranded] = useState(false);
  const [sizeCategory, setSizeCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await almacenService.getEpis();
      setEpis(data);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar catálogo de EPIs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEpis = useMemo(() => {
    if (!searchTerm.trim()) return epis;
    const q = searchTerm.toLowerCase();
    return epis.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.code || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q)
    );
  }, [epis, searchTerm]);

  const openModal = (epi: AlmacenEpi | null) => {
    setEditingEpi(epi);
    if (epi) {
      setCode(epi.code || '');
      setName(epi.name);
      setDescription(epi.description || '');
      setCategory(epi.category || 'Estandar');
      setUnit(epi.unit || 'Ud');
      setDefaultCost(String(epi.default_cost ?? 0));
      setHasSizes(epi.has_sizes);
      setIsBranded(epi.is_branded);
      setSizeCategory(epi.size_category || '');
    } else {
      setCode('');
      setName('');
      setDescription('');
      setCategory('Estandar');
      setUnit('Ud');
      setDefaultCost('0');
      setHasSizes(false);
      setIsBranded(false);
      setSizeCategory('');
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('O nome do EPI é obrigatório');
      return;
    }
    setIsSaving(true);
    try {
      await almacenService.createOrUpdateEpi({
        id: editingEpi?.id,
        code: code.trim() || null,
        name: name.trim().toUpperCase(),
        description: description.trim() || null,
        category,
        unit,
        default_cost: parseFloat(defaultCost) || 0,
        has_sizes: hasSizes,
        is_branded: isBranded,
        size_category: hasSizes ? sizeCategory || null : null,
      });
      toast.success(editingEpi ? 'EPI atualizado (sincronizado com Registro Geral)!' : 'EPI criado no catálogo global!');
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar EPI');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-600">
              <HardHat className="h-5 w-5" />
            </div>
            Catálogo de EPIs & Uniformes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Integrado em tempo real com o Registro Geral (fonte única). Configure grade de tamanhos e marcação por empresa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading} className="gap-2 rounded-xl">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => openModal(null)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Novo EPI
          </Button>
        </div>
      </div>

      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar EPI por nome ou código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 rounded-xl bg-white dark:bg-slate-900"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500">Código</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500">Nome / Descrição</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500">Categoria</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500">Controle de Grade / Empresa</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 text-right">Custo (€)</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Carregando catálogo...</td>
                </tr>
              ) : filteredEpis.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Nenhum EPI encontrado.</td>
                </tr>
              ) : (
                filteredEpis.map((epi) => (
                  <tr key={epi.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{epi.code || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{epi.name}</div>
                      {epi.description && (
                        <div className="text-xs text-slate-500 truncate max-w-md">{epi.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{epi.category || 'Estandar'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {epi.has_sizes ? (
                          <Badge className="bg-blue-100 text-blue-800 gap-1 text-[11px]">
                            <Ruler className="h-3 w-3" />
                            Grade ({epi.size_category || 'tamanhos'})
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 text-[11px]">Unidade (Único)</Badge>
                        )}
                        {epi.is_branded && (
                          <Badge className="bg-purple-100 text-purple-800 gap-1 text-[11px]">
                            <Tag className="h-3 w-3" /> Por Empresa
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      € {Number(epi.default_cost || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openModal(epi)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingEpi ? `Editar ${editingEpi.name}` : 'Novo EPI no Catálogo'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Código</label>
                  <Input placeholder="EPI-0013" value={code} onChange={(e) => setCode(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Nome do EPI *</label>
                  <Input placeholder="Ex: BOTA SEGURIDAD" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Descrição</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 text-sm"
                  >
                    <option value="Estandar">Estandar</option>
                    <option value="Especial">Especial</option>
                    <option value="Uniforme">Uniforme</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Unidade</label>
                  <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Custo (€)</label>
                  <Input type="number" step="0.01" value={defaultCost} onChange={(e) => setDefaultCost(e.target.value)} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input type="checkbox" checked={hasSizes} onChange={(e) => setHasSizes(e.target.checked)} />
                  Possui grade de tamanhos (S, M, L, XL, XXL, XXXL)
                </label>
                {hasSizes && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Vincular tamanho ao campo do trabalhador:
                    </label>
                    <select
                      value={sizeCategory}
                      onChange={(e) => setSizeCategory(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                    >
                      <option value="">Selecionar categoria de tamanho...</option>
                      <option value="camisa">Camisa / Jaqueta (worker.camiseta)</option>
                      <option value="pantalon">Calça (worker.pantalones)</option>
                      <option value="calzado">Calçado (futuro)</option>
                    </select>
                  </div>
                )}
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input type="checkbox" checked={isBranded} onChange={(e) => setIsBranded(e.target.checked)} />
                  Uniforme padronizado por Empresa (estoque separado por empresa)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isSaving ? 'Salvando...' : 'Salvar EPI'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
