import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/shared/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { getUsers, getDepartments, getPublicEmpresas, updateDepartmentMember, createDepartmentMember, updateMcsUser, updateUserRole, getUserMemberships, saveUserMembership, type UserProfile } from './api/adminApi';
import { useEmpresas } from '@/shared/hooks/useEmpresas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function UsersPage() {
    const queryClient = useQueryClient();
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ['admin_users'], queryFn: getUsers });
    const { data: departments } = useQuery({ queryKey: ['admin_departments'], queryFn: getDepartments });
    const { data: publicEmpresas } = useQuery({ queryKey: ['admin_public_empresas'], queryFn: getPublicEmpresas });
    const { data: empresas } = useEmpresas();

    const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
    const [isCreating, setIsCreating] = useState(false);
    // memberships state for edit: { [empresaId]: { role, is_active } }
    const [membershipsForm, setMembershipsForm] = useState<Record<string, { role: string; is_active: boolean }>>({});

    // Fetch memberships when a user is selected
    useQuery({
        queryKey: ['admin_memberships', selectedUser?.id],
        queryFn: async () => {
            if (!selectedUser) return [];
            const mems = await getUserMemberships(selectedUser.id);
            const initialMemForm: Record<string, { role: string; is_active: boolean }> = {};
            empresas?.forEach(emp => {
                const found = mems.find(m => m.empresa_id === emp.id);
                if (found) {
                    initialMemForm[emp.id] = { role: found.role, is_active: found.is_active };
                } else {
                    initialMemForm[emp.id] = { role: 'user', is_active: false }; // Default unselected
                }
            });
            setMembershipsForm(initialMemForm);
            return mems;
        },
        enabled: !!selectedUser && !!empresas,
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (isCreating) {
                // Create Department Member
                await createDepartmentMember({
                    display_name: editForm.display_name,
                    email: editForm.email,
                    department_id: editForm.department_id,
                    active: editForm.active,
                    empresa_contratante_id: editForm.empresa_contratante_id,
                    empresa_servicos_id: editForm.empresa_servicos_id
                });
                return;
            }

            if (!selectedUser) return;
            // Update Department Member
            await updateDepartmentMember(selectedUser.id, {
                display_name: editForm.display_name,
                department_id: editForm.department_id,
                active: editForm.active,
                empresa_contratante_id: editForm.empresa_contratante_id,
                empresa_servicos_id: editForm.empresa_servicos_id
            });

            // Update Auth User info only if they have already registered (user_id is not null)
            if (selectedUser.user_id) {
                await updateMcsUser(selectedUser.user_id, {
                    active: editForm.active,
                    display_name: editForm.display_name,
                    department_id: editForm.department_id,
                });

                // Update RBAC role
                if (editForm.role) {
                    await updateUserRole(selectedUser.user_id, editForm.email || selectedUser.email, editForm.role);
                }

                // Update Memberships
                for (const empId of Object.keys(membershipsForm)) {
                    const memData = membershipsForm[empId];
                    if (memData.is_active || Object.keys(memData).length > 0) {
                        await saveUserMembership({
                            user_id: selectedUser.user_id, // must use the UUID from auth
                            empresa_id: empId,
                            role: memData.role,
                            is_active: memData.is_active
                        });
                    }
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin_users'] });
            toast.success('Sucesso', { description: isCreating ? 'Usuário criado com sucesso.' : 'Usuário atualizado com sucesso.' });
            setIsDialogOpen(false);
        },
        onError: (err: any) => {
            console.error(err);
            toast.error('Erro ao Salvar Permissões', {
                description: err.message || JSON.stringify(err) || 'Ocorreu um erro no banco de dados. Tente novamente.',
                duration: 10000
            });
        }
    });

    const handleEditClick = (user: UserProfile) => {
        setIsCreating(false);
        setSelectedUser(user);
        setEditForm({
            display_name: user.display_name || '',
            role: user.role || 'visualizador',
            department_id: user.department_id || '',
            active: user.active ?? true,
            empresa_contratante_id: user.empresa_contratante_id || null,
            empresa_servicos_id: user.empresa_servicos_id || null,
        });
        setIsDialogOpen(true);
    };

    const handleCreateClick = () => {
        setIsCreating(true);
        setSelectedUser(null);
        setEditForm({
            display_name: '',
            email: '',
            role: 'visualizador',
            department_id: null,
            active: true,
            empresa_contratante_id: null,
            empresa_servicos_id: null,
        });
        setMembershipsForm({});
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        updateMutation.mutate();
    };

    const columns: ColumnDef<UserProfile>[] = [
        { header: 'Nome', accessorKey: 'display_name' },
        { header: 'E-mail', accessorKey: 'email' },
        {
            header: 'Perfil Global',
            accessorKey: 'role',
            cell: ({ row }) => {
                const roleLabels: Record<string, string> = {
                    super_admin: 'Super Admin',
                    admin_rh: 'Admin RH',
                    operador: 'Operador',
                    visualizador: 'Visualizador'
                };
                const r = row.original.role;
                const isHighLevel = r === 'super_admin' || r === 'admin_rh';
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isHighLevel ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}>
                        {roleLabels[r] || 'Desconhecido'}
                    </span>
                );
            }
        },
        {
            header: 'Departamento',
            accessorKey: 'department_id',
            cell: ({ row }) => {
                if (!row.original.department_id) return <span className="text-gray-400 text-xs">Nenhum</span>;
                const dep = departments?.find(d => d.id === row.original.department_id);
                return dep ? dep.name : 'Desconhecido';
            }
        },
        {
            header: 'Status',
            accessorKey: 'active',
            cell: ({ row }) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.original.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {row.original.active ? 'Ativo' : 'Inativo'}
                </span>
            )
        },
        {
            header: 'Ações',
            accessorKey: 'id',
            cell: ({ row }) => (
                <Button variant="ghost" size="sm" onClick={() => handleEditClick(row.original)}>
                    <Edit className="w-4 h-4 mr-2" /> Editar Acessos
                </Button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Gestão de Acessos</h2>
                    <p className="text-muted-foreground text-sm">Controle as permissões de usuários, empresas (Matriz e Filiais) e departamentos.</p>
                </div>
                <Button onClick={handleCreateClick} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Adicionar Usuário
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    {usersLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Carregando usuários...</div>
                    ) : (
                        <DataTable
                            data={users || []}
                            columns={columns}
                            searchKey="display_name"
                        />
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isCreating ? 'Adicionar Novo Usuário' : 'Editar Acessos do Usuário'}</DialogTitle>
                        <DialogDescription>
                            {isCreating ? 'Preencha os dados básicos gerenciais para criar o registro do colaborador.' : `Configure os níveis de permissão em cada Filial para ${selectedUser?.email}`}
                        </DialogDescription>
                    </DialogHeader>

                    {(selectedUser || isCreating) && (
                        <div className="grid gap-6 py-4">
                            {/* --- GLOBAL SETTINGS --- */}
                            <div className="bg-muted/50 p-4 rounded-lg space-y-4 border">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-indigo-600" /> Configurações Gerais
                                </h3>

                                {isCreating && (
                                    <div className="space-y-2 mb-4">
                                        <Label>E-mail Corporativo</Label>
                                        <Input
                                            type="email"
                                            value={editForm.email || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="usuario@loginpro.pt"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nome Completo</Label>
                                        <Input
                                            value={editForm.display_name || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Departamento Principal</Label>
                                        <Select value={editForm.department_id || 'none'} onValueChange={(val: string) => setEditForm(prev => ({ ...prev, department_id: val === 'none' ? null : val }))}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {departments?.map(d => (
                                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* EMPRESA CONTRATADA E ALOCADA */}
                                    <div className="space-y-2">
                                        <Label>Empresa Contratada</Label>
                                        <Select value={editForm.empresa_contratante_id ? String(editForm.empresa_contratante_id) : 'none'} onValueChange={(val: string) => setEditForm(prev => ({ ...prev, empresa_contratante_id: val === 'none' ? null : Number(val) }))}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {publicEmpresas?.map(e => (
                                                    <SelectItem key={e.id} value={String(e.id)}>{e.nombre_comercial}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Empresa Alocada</Label>
                                        <Select value={editForm.empresa_servicos_id ? String(editForm.empresa_servicos_id) : 'none'} onValueChange={(val: string) => setEditForm(prev => ({ ...prev, empresa_servicos_id: val === 'none' ? null : Number(val) }))}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {publicEmpresas?.map(e => (
                                                    <SelectItem key={e.id} value={String(e.id)}>{e.nombre_comercial}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 flex flex-col justify-center">
                                        <div className="flex items-center space-x-2 mt-4">
                                            <Switch
                                                checked={editForm.active ?? true}
                                                onCheckedChange={(checked: boolean) => setEditForm(prev => ({ ...prev, active: checked }))}
                                            />
                                            <Label>Conta Ativa</Label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- PERMISSÕES GLOBAIS DE APP --- */}
                            {!isCreating && !selectedUser?.user_id ? (
                                <div className="border border-orange-200 bg-orange-50 p-4 rounded-lg">
                                    <p className="text-sm text-orange-800 font-medium">Este funcionário ainda não acessou ou se registrou no sistema.</p>
                                    <p className="text-xs text-orange-600 mt-1">Configurações de Acesso e Filiais ficarão disponíveis quando o funcionário possuir login através deste e-mail.</p>
                                </div>
                            ) : isCreating ? (
                                <div className="border border-indigo-200 bg-indigo-50 p-4 rounded-lg">
                                    <p className="text-sm text-indigo-800 font-medium">Conta pendente de Registro</p>
                                    <p className="text-xs text-indigo-600 mt-1">Após salvar, o usuário deverá realizar o cadastro no sistema com o mesmo email para herdar este perfil. As filiais só poderão ser definidas após ele criar o login.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-muted/50 p-4 rounded-lg space-y-4 border">
                                        <h3 className="text-sm font-semibold flex items-center gap-2">
                                            <ShieldAlert className="w-4 h-4 text-indigo-600" /> Permissões de Aplicativo
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Perfil de App</Label>
                                                <Select value={editForm.role || 'visualizador'} onValueChange={(val: string) => setEditForm(prev => ({ ...prev, role: val }))}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="super_admin">Super Administrador</SelectItem>
                                                        <SelectItem value="admin_rh">Administrador (RH)</SelectItem>
                                                        <SelectItem value="operador">Operador (Edita Dados)</SelectItem>
                                                        <SelectItem value="visualizador">Visualizador (Apenas Leitura)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-[10px] text-muted-foreground mt-1">O Super Admin tem acesso integral ao sistema. Os outros perfis limitam acessos sensíveis como exclusão ou upload.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* --- EMPRESAS / FILIAIS --- */}
                                    <div className="space-y-4 border rounded-lg p-4">
                                        <div>
                                            <h3 className="text-sm font-semibold mb-1">Acesso às Empresas e Filiais</h3>
                                            <p className="text-xs text-muted-foreground">O usuário verá dados vinculados apenas às filiais em que estiver ativo.</p>
                                        </div>

                                        {empresas?.map(emp => {
                                            const mem = membershipsForm[emp.id] || { role: 'user', is_active: false };
                                            return (
                                                <div key={emp.id} className={`flex items-center justify-between p-3 rounded-md border ${mem.is_active ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}>
                                                    <div className="flex items-center space-x-3 w-1/3">
                                                        <Checkbox
                                                            checked={mem.is_active}
                                                            onCheckedChange={(checked: boolean) => setMembershipsForm(prev => ({
                                                                ...prev,
                                                                [emp.id]: { ...prev[emp.id], is_active: checked }
                                                            }))}
                                                        />
                                                        <div>
                                                            <Label className="font-semibold text-sm cursor-pointer">{emp.nome}</Label>
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{emp.codigo}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-4 w-1/2">
                                                        <Label className="text-xs text-muted-foreground w-16 text-right">Permissão:</Label>
                                                        <Select
                                                            disabled={!mem.is_active}
                                                            value={mem.role || 'user'}
                                                            onValueChange={(val: string) => setMembershipsForm(prev => ({
                                                                ...prev,
                                                                [emp.id]: { ...prev[emp.id], role: val }
                                                            }))}>
                                                            <SelectTrigger className="h-8 text-xs w-[140px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="admin">Admin da Filial</SelectItem>
                                                                <SelectItem value="rh">Recursos Humanos</SelectItem>
                                                                <SelectItem value="finance">Financeiro</SelectItem>
                                                                <SelectItem value="commercial">Comercial</SelectItem>
                                                                <SelectItem value="user">Colaborador Local</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
