import React, { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { almacenService } from '../services/almacenService';
import type { AlmacenEpi } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type JobFunctionKit = Awaited<ReturnType<typeof almacenService.getJobFunctionsWithKits>>[number];

export const KitsPerfisAlmacenPage: React.FC = () => {
  const [kits, setKits] = useState<JobFunctionKit[]>([]);
  const [epis, setEpis] = useState<AlmacenEpi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Add EPI to kit state
  const [newEpiId, setNewEpiId] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newRenewalDays, setNewRenewalDays] = useState('180');
  const [newIsRequired, setNewIsRequired] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [kitsData, episData] = await Promise.all([
        almacenService.getJobFunctionsWithKits(),
        almacenService.getEpis(),
      ]);
      setKits(kitsData);
      setEpis(episData.filter((e) => e.status === 'active'));
      if (!selectedId && kitsData.length > 0) {
        setSelectedId(kitsData[0].id);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar kits dos perfis');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredKits = useMemo(() => {
    if (!searchTerm.trim()) return kits;
    const q = searchTerm.toLowerCase();
    return kits.filter(
      (k) => k.name.toLowerCase().includes(q) || (k.code || '').toLowerCase().includes(q)
    );
  }, [kits, searchTerm]);

  const selectedKit = useMemo(
    () => kits.find((k) => k.id === selectedId) || filteredKits[0] || null,
    [kits, filteredKits, selectedId]
  );

  const availableEpis = useMemo(() => {
    if (!selectedKit) return epis;
    const usedIds = new Set(selectedKit.items.map((i) => i.epi_id));
    return epis.filter((e) => !usedIds.has(e.id));
  }, [epis, selectedKit]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKit || !newEpiId) return;
    setIsAdding(true);
    try {
      await almacenService.addEpiToKit({
        job_function_id: selectedKit.id,
        epi_id: newEpiId,
        quantity: Math.max(1, newQty),
        is_required: newIsRequired,
        renewal_period_days: newRenewalDays ? parseInt(newRenewalDays, 10) || null : null,
      });
      toast.success('EPI adicionado ao kit do perfil!');
      setNewEpiId('');
      setNewQty(1);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao adicionar EPI ao kit');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateQty = async (itemId: string, qty: number) => {
    try {
      await almacenService.updateKitItem(itemId, { quantity: Math.max(1, qty) });
      toast.success('Quantidade atualizada!');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar quantidade');
    }
  };

  const handleUpdateRenewal = async (itemId: string, daysStr: string) => {
    const val = daysStr.trim() ? parseInt(daysStr, 10) : null;
    try {
      await almacenService.updateKitItem(itemId, { renewal_period_days: val });
      toast.success('Prazo de renovação atualizado!');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar prazo');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await almacenService.removeKitItem(itemId);
      toast.success('EPI removido do kit');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover EPI');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            Kits de EPIs por Perfil Profissional
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monte e ajuste os kits obrigatórios de cada função (quantidades e prazos de renovação). Sincronizado com Registro Geral.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={isLoading} className="gap-2 rounded-xl">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Perfis */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col max-h-[calc(100vh-230px)] overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar perfil / cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-slate-400">Carregando perfis...</div>
            ) : (
              filteredKits.map((k) => {
                const isSelected = selectedKit?.id === k.id;
                return (
                  <button
                    key={k.id}
                    onClick={() => setSelectedId(k.id)}
                    className={`w-full text-left p-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between gap-2 ${
                      isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-600' : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{k.name}</div>
                      {k.code && <div className="text-[10px] font-mono text-slate-400">{k.code}</div>}
                    </div>
                    <Badge variant="outline" className="text-[11px] flex-shrink-0">
                      {k.items.length} EPIs
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Kit Items */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col max-h-[calc(100vh-230px)] overflow-hidden">
          {!selectedKit ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-12">
              Selecione um perfil à esquerda para configurar o kit.
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-lg font-bold">{selectedKit.name}</h2>
                  {selectedKit.risk_level && <Badge variant="outline">Risco: {selectedKit.risk_level}</Badge>}
                </div>
                {selectedKit.description && (
                  <p className="text-xs text-slate-500 mt-1">{selectedKit.description}</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Add Form */}
                <form
                  onSubmit={handleAddItem}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                >
                  <div className="sm:col-span-5">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Adicionar EPI ao Kit</label>
                    <select
                      value={newEpiId}
                      onChange={(e) => setNewEpiId(e.target.value)}
                      className="w-full h-9 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2"
                    >
                      <option value="">Selecionar EPI...</option>
                      {availableEpis.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Qtd</label>
                    <Input
                      type="number"
                      min={1}
                      value={newQty}
                      onChange={(e) => setNewQty(parseInt(e.target.value, 10) || 1)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Renov. (dias)</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="180"
                      value={newRenewalDays}
                      onChange={(e) => setNewRenewalDays(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2">
                    <label className="text-[11px] flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newIsRequired}
                        onChange={(e) => setNewIsRequired(e.target.checked)}
                      />
                      Obrig.
                    </label>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!newEpiId || isAdding}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Incluir
                    </Button>
                  </div>
                </form>

                {/* Kit Items Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">EPI</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-center">Quantidade</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-center">Renovação (dias)</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-center">Tipo</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-right">Remover</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedKit.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-xs text-slate-400">
                            Nenhum EPI configurado para este perfil. Use o formulário acima para montar o kit.
                          </td>
                        </tr>
                      ) : (
                        selectedKit.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2.5 font-semibold text-xs">{item.epi_name}</td>
                            <td className="px-4 py-2.5 text-center">
                              <input
                                type="number"
                                min={1}
                                defaultValue={item.quantity}
                                onBlur={(e) => {
                                  const v = parseInt(e.target.value, 10);
                                  if (!isNaN(v) && v !== item.quantity) handleUpdateQty(item.id, v);
                                }}
                                className="w-16 text-center text-xs border border-slate-200 dark:border-slate-700 rounded py-1 bg-transparent font-bold"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <input
                                type="number"
                                min={0}
                                placeholder="180"
                                defaultValue={item.renewal_period_days ?? ''}
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v !== String(item.renewal_period_days ?? '')) {
                                    handleUpdateRenewal(item.id, v);
                                  }
                                }}
                                className="w-20 text-center text-xs border border-slate-200 dark:border-slate-700 rounded py-1 bg-transparent"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <Badge className={item.is_required ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}>
                                {item.is_required ? 'Obrigatório' : 'Opcional'}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(item.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
