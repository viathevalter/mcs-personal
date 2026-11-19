import React, { useEffect, useMemo, useState } from 'react';
import { Ruler, Plus, RefreshCw, Edit, X } from 'lucide-react';
import { toast } from 'sonner';
import { almacenService } from '../services/almacenService';
import type { AlmacenSize } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const TamanhosAlmacenPage: React.FC = () => {
  const [sizes, setSizes] = useState<AlmacenSize[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryTab, setCategoryTab] = useState<string>('all');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AlmacenSize | null>(null);
  const [category, setCategory] = useState('camisa');
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await almacenService.getSizes();
      setSizes(data);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar tamanhos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    if (categoryTab === 'all') return sizes;
    return sizes.filter((s) => s.category === categoryTab);
  }, [sizes, categoryTab]);

  const openModal = (item: AlmacenSize | null) => {
    setEditing(item);
    if (item) {
      setCategory(item.category);
      setCode(item.code);
      setLabel(item.label);
      setSortOrder(item.sort_order);
      setIsActive(item.is_active);
    } else {
      setCategory(categoryTab !== 'all' ? categoryTab : 'camisa');
      setCode('');
      setLabel('');
      setSortOrder(sizes.length + 1);
      setIsActive(true);
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !label.trim()) {
      toast.warning('Código e Descrição são obrigatórios');
      return;
    }
    setIsSaving(true);
    try {
      await almacenService.upsertSize({
        id: editing?.id,
        category,
        code: code.trim().toUpperCase(),
        label: label.trim(),
        sort_order: sortOrder,
        is_active: isActive,
      });
      toast.success('Tamanho salvo! Já refletido na Contratação e no Almacén.');
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar tamanho');
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
              <Ruler className="h-5 w-5" />
            </div>
            Cadastro Oficial de Tamanhos / Grades
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Padroniza os tamanhos usados na Contratação, Ficha do Trabalhador, Estoque e Ordens de Separação.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading} className="gap-2 rounded-xl">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => openModal(null)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Novo Tamanho
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'camisa', label: 'Camisa / Jaqueta' },
          { id: 'pantalon', label: 'Calça (Pantalones)' },
          { id: 'calzado', label: 'Calçado (Futuro)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryTab(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              categoryTab === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">Categoria</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">Código Padrão</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">Equivalência / Exibição</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center">Ordem</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">Carregando...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">Nenhum tamanho cadastrado nesta categoria.</td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 uppercase text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {s.category}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {s.code}
                  </td>
                  <td className="px-4 py-3 font-medium">{s.label}</td>
                  <td className="px-4 py-3 text-center text-xs">{s.sort_order}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}>
                      {s.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openModal(s)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing ? 'Editar Tamanho' : 'Novo Tamanho'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={Boolean(editing)}
                  className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm"
                >
                  <option value="camisa">Camisa / Jaqueta</option>
                  <option value="pantalon">Calça (Pantalones)</option>
                  <option value="calzado">Calçado</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Código Padrão *</label>
                  <Input placeholder="Ex: XL" value={code} onChange={(e) => setCode(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Ordem</label>
                  <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Descrição / Equivalência *</label>
                <Input placeholder="Ex: XL (60)" value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Tamanho ativo para seleção
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
