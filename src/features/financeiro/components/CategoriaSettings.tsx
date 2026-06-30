import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Edit2, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { FinanceiroCategoria } from '../types';
import { fetchCategorias } from '../data/loader';

export const CategoriaSettings = () => {
    const [categorias, setCategorias] = useState<FinanceiroCategoria[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingCat, setEditingCat] = useState<Partial<FinanceiroCategoria> | null>(null);

    const loadCategorias = async () => {
        setIsLoading(true);
        const data = await fetchCategorias();
        setCategorias(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadCategorias();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCat || !editingCat.nome) return;
        setIsSaving(true);
        
        try {
            const dbData = {
                nome: editingCat.nome,
                descricao: editingCat.descricao || null,
                tipo: editingCat.tipo || 'Receita',
                ativo: editingCat.ativo !== false,
                cod_snc: editingCat.cod_snc || null,
                categoria_dre: editingCat.categoria_dre || null,
            };

            if (editingCat.id) {
                await supabase.from('financeiro_categorias').update(dbData).eq('id', editingCat.id);
            } else {
                await supabase.from('financeiro_categorias').insert([dbData]);
            }
            
            setEditingCat(null);
            await loadCategorias();
        } catch (error) {
            console.error('Error saving categoria:', error);
            alert('Erro ao salvar categoria. Verifique se as tabelas foram criadas no banco de dados.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja excluir esta categoria? Ela pode estar em uso por contas a receber.")) return;
        try {
            await supabase.from('financeiro_categorias').delete().eq('id', id);
            await loadCategorias();
        } catch (error) {
            console.error('Error deleting categoria:', error);
            alert('Não foi possível excluir. Talvez esteja em uso.');
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6 mt-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Categorias de Receitas/Despesas</h2>
                <Button onClick={() => setEditingCat({ tipo: 'Receita', ativo: true })} size="sm" className="gap-2">
                    <Plus size={16} /> Nova Categoria
                </Button>
            </div>
            
            <p className="text-sm text-gray-500 mb-6">
                Gerencie as categorias contábeis e fiscais para classificar os recebimentos (DRE, Fluxo de Caixa).
            </p>

            {editingCat && (
                <form onSubmit={handleSave} className="bg-gray-50 p-4 rounded-lg border mb-6 space-y-4">
                    <h3 className="font-medium text-gray-900">{editingCat.id ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="nome">Nome da Categoria</Label>
                            <Input 
                                id="nome" 
                                value={editingCat.nome || ''} 
                                onChange={e => setEditingCat({...editingCat, nome: e.target.value})} 
                                required 
                                placeholder="Ex: Prestação de Serviços"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tipo">Tipo</Label>
                            <Select 
                                value={editingCat.tipo || 'Receita'} 
                                onValueChange={v => setEditingCat({...editingCat, tipo: v})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Receita">Receita</SelectItem>
                                    <SelectItem value="Despesa">Despesa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cod_snc">Código SNC</Label>
                            <Input 
                                id="cod_snc" 
                                value={editingCat.cod_snc || ''} 
                                onChange={e => setEditingCat({...editingCat, cod_snc: e.target.value})} 
                                placeholder="Ex: 7111"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="categoria_dre">Categoria DRE</Label>
                            <Input 
                                id="categoria_dre" 
                                value={editingCat.categoria_dre || ''} 
                                onChange={e => setEditingCat({...editingCat, categoria_dre: e.target.value})} 
                                placeholder="Ex: Receita Operacional"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="descricao">Descrição (Opcional)</Label>
                            <Input 
                                id="descricao" 
                                value={editingCat.descricao || ''} 
                                onChange={e => setEditingCat({...editingCat, descricao: e.target.value})} 
                                placeholder="Detalhes adicionais sobre esta categoria"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setEditingCat(null)}>Cancelar</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                    </div>
                </form>
            )}

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cód. SNC</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Cat. DRE</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                            </TableRow>
                        ) : categorias.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    Nenhuma categoria cadastrada. Crie a primeira acima.
                                </TableCell>
                            </TableRow>
                        ) : (
                            categorias.map(cat => (
                                <TableRow key={cat.id}>
                                    <TableCell className="text-muted-foreground font-mono">{cat.cod_snc || '-'}</TableCell>
                                    <TableCell className="font-medium">{cat.nome}</TableCell>
                                    <TableCell>
                                        <Badge variant={cat.tipo === 'Despesa' ? 'destructive' : cat.tipo === 'Resultado' ? 'outline' : 'default'} className={cat.tipo === 'Receita' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                                            {cat.tipo}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{cat.categoria_dre || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => setEditingCat(cat)}>
                                            <Edit2 size={16} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(cat.id)}>
                                            <Trash2 size={16} />
                                        </Button>
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
