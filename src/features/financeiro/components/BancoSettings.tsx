import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Loader2, Save, X } from 'lucide-react';
import { fetchBancos, saveBanco } from '../data/loader';
import { getPublicEmpresas } from '../../admin/api/adminApi';
import type { Banco } from '../types';
import type { PublicEmpresa } from '../../admin/api/adminApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export const BancoSettings: React.FC = () => {
    const [bancos, setBancos] = useState<Banco[]>([]);
    const [empresas, setEmpresas] = useState<PublicEmpresa[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    const [editingBanco, setEditingBanco] = useState<Partial<Banco>>({
        ativo: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [b, e] = await Promise.all([fetchBancos(), getPublicEmpresas()]);
            setBancos(b);
            setEmpresas(e);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Erro ao carregar dados dos bancos.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingBanco.nome_banco || !editingBanco.empresa_id) {
            toast.error('Por favor, preencha o Nome do Banco e a Empresa.');
            return;
        }

        setIsSaving(true);
        try {
            const bancoToSave = {
                ...editingBanco,
                nome_banco: editingBanco.nome_banco,
                empresa_id: editingBanco.empresa_id,
                agencia: editingBanco.agencia || '',
                conta: editingBanco.conta || '',
                iban: editingBanco.iban || '',
                ativo: editingBanco.ativo !== false,
            };

            const result = await saveBanco(bancoToSave);
            
            if (result.success) {
                toast.success('Banco salvo com sucesso!');
                setIsFormOpen(false);
                setEditingBanco({ ativo: true });
                loadData();
            } else {
                throw new Error('Falha ao salvar banco');
            }
        } catch (error) {
            toast.error('Ocorreu um erro ao salvar o banco.');
        } finally {
            setIsSaving(false);
        }
    };

    const getEmpresaName = (id: number) => {
        return empresas.find(e => e.id === id)?.nombre_comercial || 'Desconhecida';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Contas Bancárias</h3>
                    <p className="text-sm text-muted-foreground">
                        Gerencie as contas bancárias de cada empresa para uso nos recebimentos.
                    </p>
                </div>
                {!isFormOpen && (
                    <Button onClick={() => setIsFormOpen(true)} className="bg-brand-primary hover:bg-brand-primary/90 text-white">
                        <Plus size={16} className="mr-2" />
                        Novo Banco
                    </Button>
                )}
            </div>

            {isFormOpen && (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-brand-dark">
                            {editingBanco.id ? 'Editar Banco' : 'Novo Banco'}
                        </h4>
                        <Button variant="ghost" size="icon" onClick={() => { setIsFormOpen(false); setEditingBanco({ ativo: true }); }}>
                            <X size={16} />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="empresa">Empresa *</Label>
                            <Select 
                                value={editingBanco.empresa_id ? editingBanco.empresa_id.toString() : ''} 
                                onValueChange={(val) => setEditingBanco({...editingBanco, empresa_id: parseInt(val)})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a empresa" />
                                </SelectTrigger>
                                <SelectContent>
                                    {empresas.map(e => (
                                        <SelectItem key={e.id} value={e.id.toString()}>{e.nombre_comercial}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="nome_banco">Nome do Banco *</Label>
                            <Input 
                                id="nome_banco" 
                                value={editingBanco.nome_banco || ''} 
                                onChange={e => setEditingBanco({...editingBanco, nome_banco: e.target.value})} 
                                placeholder="Ex: Santander, Caixa"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="agencia">Agência</Label>
                            <Input 
                                id="agencia" 
                                value={editingBanco.agencia || ''} 
                                onChange={e => setEditingBanco({...editingBanco, agencia: e.target.value})} 
                                placeholder="Ex: 0001"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="conta">Conta Corrente</Label>
                            <Input 
                                id="conta" 
                                value={editingBanco.conta || ''} 
                                onChange={e => setEditingBanco({...editingBanco, conta: e.target.value})} 
                                placeholder="Ex: 123456-7"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="iban">IBAN</Label>
                            <Input 
                                id="iban" 
                                value={editingBanco.iban || ''} 
                                onChange={e => setEditingBanco({...editingBanco, iban: e.target.value})} 
                                placeholder="PT50..."
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Switch 
                                id="ativo" 
                                checked={editingBanco.ativo !== false} 
                                onCheckedChange={(checked) => setEditingBanco({...editingBanco, ativo: checked})}
                            />
                            <Label htmlFor="ativo">Ativo</Label>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="bg-brand-primary hover:bg-brand-primary/90 text-white"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Salvar Banco
                        </Button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Empresa</TableHead>
                            <TableHead>Banco</TableHead>
                            <TableHead>Agência / Conta</TableHead>
                            <TableHead>IBAN</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-primary mb-2" />
                                    <span className="text-muted-foreground text-sm">Carregando bancos...</span>
                                </TableCell>
                            </TableRow>
                        ) : bancos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Nenhuma conta bancária cadastrada. Crie a primeira acima.
                                </TableCell>
                            </TableRow>
                        ) : (
                            bancos.map(banco => (
                                <TableRow key={banco.id}>
                                    <TableCell className="font-medium text-brand-primary">{getEmpresaName(banco.empresa_id)}</TableCell>
                                    <TableCell className="font-medium">{banco.nome_banco}</TableCell>
                                    <TableCell className="text-muted-foreground">{banco.agencia ? `${banco.agencia} / ` : ''}{banco.conta || '-'}</TableCell>
                                    <TableCell className="font-mono text-xs">{banco.iban || '-'}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${banco.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {banco.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => {
                                            setEditingBanco(banco);
                                            setIsFormOpen(true);
                                        }}>
                                            <Edit2 size={16} />
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
