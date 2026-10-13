import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Loader2, Save, X, Trash2, CreditCard } from 'lucide-react';
import { fetchBancos, fetchCartoes, saveCartao, deleteCartao } from '../data/loader';
import { getPublicEmpresas } from '../../admin/api/adminApi';
import type { Banco, CartaoCorporativo } from '../types';
import type { PublicEmpresa } from '../../admin/api/adminApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export const CartaoSettings: React.FC = () => {
    const [cartoes, setCartoes] = useState<CartaoCorporativo[]>([]);
    const [bancos, setBancos] = useState<Banco[]>([]);
    const [empresas, setEmpresas] = useState<PublicEmpresa[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [editingCartao, setEditingCartao] = useState<Partial<CartaoCorporativo>>({
        ativo: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [c, b, e] = await Promise.all([fetchCartoes(), fetchBancos(), getPublicEmpresas()]);
            setCartoes(c);
            setBancos(b);
            setEmpresas(e);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Erro ao carregar dados dos cartões corporativos.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenNew = () => {
        setEditingCartao({
            ativo: true,
            nome_cartao: '',
            empresa_id: empresas[0]?.id || undefined,
            banco_id: undefined,
            ultimos_digitos: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (cartao: CartaoCorporativo) => {
        setEditingCartao({ ...cartao });
        setIsModalOpen(true);
    };

    const handleDelete = async (id?: string) => {
        if (!id) return;
        if (!confirm('Deseja realmente remover este cartão?')) return;

        try {
            const res = await deleteCartao(id);
            if (res.success) {
                toast.success('Cartão removido com sucesso!');
                loadData();
            } else {
                throw new Error('Falha ao excluir cartão');
            }
        } catch (err) {
            toast.error('Não foi possível excluir o cartão.');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCartao.nome_cartao?.trim() || !editingCartao.empresa_id) {
            toast.error('Por favor, preencha o Nome do Cartão e a Empresa.');
            return;
        }

        setIsSaving(true);
        try {
            const cartaoToSave: Partial<CartaoCorporativo> = {
                ...editingCartao,
                nome_cartao: editingCartao.nome_cartao.trim(),
                empresa_id: Number(editingCartao.empresa_id),
                banco_id: editingCartao.banco_id || null,
                ultimos_digitos: editingCartao.ultimos_digitos?.trim() || null,
                ativo: editingCartao.ativo !== false
            };

            const result = await saveCartao(cartaoToSave);

            if (result.success) {
                toast.success('Cartão salvo com sucesso!');
                setIsModalOpen(false);
                setEditingCartao({ ativo: true });
                loadData();
            } else {
                throw new Error('Falha ao salvar cartão');
            }
        } catch (error) {
            console.error('Error saving cartao:', error);
            toast.error('Ocorreu um erro ao salvar o cartão.');
        } finally {
            setIsSaving(false);
        }
    };

    const getEmpresaName = (id?: number | null) => {
        if (!id) return '-';
        return empresas.find(e => e.id === id)?.nombre_comercial || `Empresa #${id}`;
    };

    const getBancoName = (bancoId?: string | null) => {
        if (!bancoId) return '-';
        return bancos.find(b => b.id === bancoId)?.nome_banco || '-';
    };

    // Filtra bancos pela empresa selecionada (ou exibe todos se empresa não possuir bancos específicos)
    const bancosDisponiveis = editingCartao.empresa_id
        ? bancos.filter(b => b.empresa_id === Number(editingCartao.empresa_id))
        : bancos;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-brand-primary" />
                        Cartões Corporativos
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Cadastre e gerencie os cartões físicos/recarregáveis por empresa e banco para uso em missões e fundos de caixa.
                    </p>
                </div>
                <Button onClick={handleOpenNew} className="bg-brand-primary hover:bg-brand-primary/90 text-white">
                    <Plus size={16} className="mr-2" />
                    Novo Cartão
                </Button>
            </div>

            {/* Modal de Cadastro / Edição */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-brand-primary" />
                            {editingCartao.id ? 'Editar Cartão Corporativo' : 'Cadastrar Novo Cartão'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="nome_cartao">Nome / Identificação do Cartão *</Label>
                            <Input
                                id="nome_cartao"
                                value={editingCartao.nome_cartao || ''}
                                onChange={e => setEditingCartao(prev => ({ ...prev, nome_cartao: e.target.value }))}
                                placeholder="Ex: Cartão Stocco Madrid, Mastercard Lumnus #1"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="empresa">Empresa *</Label>
                                <Select
                                    value={editingCartao.empresa_id ? String(editingCartao.empresa_id) : ''}
                                    onValueChange={val => setEditingCartao(prev => ({ ...prev, empresa_id: Number(val), banco_id: undefined }))}
                                >
                                    <SelectTrigger id="empresa">
                                        <SelectValue placeholder="Selecione a empresa" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {empresas.map(e => (
                                            <SelectItem key={e.id} value={String(e.id)}>
                                                {e.nombre_comercial}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="banco">Banco / Emissor</Label>
                                <Select
                                    value={editingCartao.banco_id || 'none'}
                                    onValueChange={val => setEditingCartao(prev => ({ ...prev, banco_id: val === 'none' ? null : val }))}
                                >
                                    <SelectTrigger id="banco">
                                        <SelectValue placeholder="Selecione o banco" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Nenhum / Outro</SelectItem>
                                        {(bancosDisponiveis.length > 0 ? bancosDisponiveis : bancos).map(b => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {b.nome_banco}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="ultimos_digitos">Últimos 4 Dígitos (opcional)</Label>
                                <Input
                                    id="ultimos_digitos"
                                    maxLength={4}
                                    value={editingCartao.ultimos_digitos || ''}
                                    onChange={e => setEditingCartao(prev => ({ ...prev, ultimos_digitos: e.target.value.replace(/\D/g, '') }))}
                                    placeholder="Ex: 4821"
                                />
                            </div>

                            <div className="flex items-center space-x-2 pt-6">
                                <Switch
                                    id="ativo"
                                    checked={editingCartao.ativo !== false}
                                    onCheckedChange={checked => setEditingCartao(prev => ({ ...prev, ativo: checked }))}
                                />
                                <Label htmlFor="ativo" className="cursor-pointer">Cartão Ativo</Label>
                            </div>
                        </div>

                        <DialogFooter className="pt-4 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                disabled={isSaving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="bg-brand-primary hover:bg-brand-primary/90 text-white"
                            >
                                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Salvar Cartão
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Tabela de Cartões */}
            <div className="bg-white dark:bg-slate-900 border rounded-lg shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome do Cartão</TableHead>
                            <TableHead>Empresa</TableHead>
                            <TableHead>Banco</TableHead>
                            <TableHead>Dígitos Finais</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                                        <span>Carregando cartões corporativos...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : cartoes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Nenhum cartão cadastrado ainda. Clique em "Novo Cartão" para adicionar.
                                </TableCell>
                            </TableRow>
                        ) : (
                            cartoes.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                                                <CreditCard className="w-4 h-4" />
                                            </div>
                                            <span>{c.nome_cartao}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{c.empresa_nome || getEmpresaName(c.empresa_id)}</TableCell>
                                    <TableCell>{c.banco_nome || getBancoName(c.banco_id)}</TableCell>
                                    <TableCell>
                                        {c.ultimos_digitos ? (
                                            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                •••• {c.ultimos_digitos}
                                            </span>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                            c.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                        }`}>
                                            {c.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(c)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(c.id)}
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
