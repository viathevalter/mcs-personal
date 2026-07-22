import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Edit, Save, UserPlus, X, Search, Filter, Shield, Building2, CheckCircle2 } from 'lucide-react';

interface MCSUser {
    id: string;
    email: string;
    role: 'admin' | 'user' | 'manager' | 'super_admin';
    display_name: string;
    department_id?: string;
    managed_departments?: string[];
}

interface DepartmentMember {
    id: string;
    nombrecompleto: string;
    usuario: string;
    user_id?: string; // Linked auth id
    mcs_departments?: { name: string } | null;
}

interface Company {
    id: string;
    nome: string;
    codigo: string;
}

export const UserManagement: React.FC = () => {
    const { user, refreshProfile } = useAuth();
    const [users, setUsers] = useState<MCSUser[]>([]);
    const [employees, setEmployees] = useState<DepartmentMember[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [_loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Modal Edit State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<MCSUser | null>(null);
    const [formData, setFormData] = useState<Partial<MCSUser> & { employee_id?: string }>({});
    const [membershipsForm, setMembershipsForm] = useState<Record<string, { role: string; is_active: boolean }>>({});
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');

    useEffect(() => {
        fetchData();
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const { data, error } = await supabase
                .schema('core_common')
                .from('empresas')
                .select('id, nome, codigo')
                .eq('is_active', true)
                .order('nome');
            if (error) throw error;
            setCompanies(data || []);
        } catch (err) {
            console.error('Error fetching companies:', err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch System Users
            const { data: usersData, error: usersError } = await supabase
                .from('mcs_users')
                .select('*')
                .order('email');

            if (usersError) throw usersError;

            // Fetch Employees for linking
            const { data: empData, error: empError } = await supabase
                .from('mcs_department_members')
                .select(`
                    id, 
                    nombrecompleto, 
                    usuario, 
                    user_id,
                    mcs_departments ( name )
                `)
                .eq('active', true)
                .order('nombrecompleto');

            if (empError) throw empError;

            setUsers(usersData || []);
            setEmployees(((empData as any) || []).map((emp: any) => ({
                id: emp.id,
                nombrecompleto: emp.nombrecompleto,
                usuario: emp.usuario,
                user_id: emp.user_id,
                mcs_departments: Array.isArray(emp.mcs_departments) ? emp.mcs_departments[0] : emp.mcs_departments
            })));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async (u: MCSUser) => {
        setSelectedUser(u);
        const linkedEmp = employees.find(e => e.user_id === u.id);
        
        setFormData({
            role: u.role,
            display_name: u.display_name || '',
            employee_id: linkedEmp?.id || '',
            managed_departments: u.managed_departments || []
        });

        // Load existing memberships for this user
        try {
            const { data: memsData, error: memsError } = await supabase
                .schema('core_common')
                .from('user_memberships')
                .select('*')
                .eq('user_id', u.id);

            if (memsError) throw memsError;

            const initialMems: Record<string, { role: string; is_active: boolean }> = {};
            companies.forEach(c => {
                const found = memsData?.find(m => m.empresa_id === c.id);
                if (found) {
                    initialMems[c.id] = { role: found.role, is_active: found.is_active };
                } else {
                    initialMems[c.id] = { role: 'user', is_active: false };
                }
            });
            setMembershipsForm(initialMems);
        } catch (err) {
            console.error('Error fetching user memberships:', err);
        }

        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!selectedUser) return;
        setIsSaving(true);
        try {
            const userId = selectedUser.id;

            // 1. Update display_name
            await supabase
                .from('mcs_users')
                .update({ display_name: formData.display_name })
                .eq('id', userId);

            // 2. Call secure RPC to update Roles and Departments
            const { error: rpcError } = await supabase.rpc('update_user_role', {
                target_user_id: userId,
                new_role: formData.role,
                new_managed_departments: formData.role === 'admin' ? formData.managed_departments || [] : []
            });

            if (rpcError) throw rpcError;

            // 3. Update Employee Link
            await supabase
                .from('mcs_department_members')
                .update({ user_id: null })
                .eq('user_id', userId);

            if (formData.employee_id) {
                const { error: linkError } = await supabase
                    .from('mcs_department_members')
                    .update({ user_id: userId })
                    .eq('id', formData.employee_id);

                if (linkError) throw linkError;
            }

            // 4. Update Company Memberships
            for (const companyId of Object.keys(membershipsForm)) {
                const mem = membershipsForm[companyId];
                if (mem.is_active) {
                    // Upsert membership
                    const { error: upsertError } = await supabase
                        .schema('core_common')
                        .from('user_memberships')
                        .upsert({
                            user_id: userId,
                            empresa_id: companyId,
                            role: mem.role,
                            is_active: true
                        }, {
                            onConflict: 'user_id,empresa_id,role'
                        });
                    if (upsertError) throw upsertError;
                } else {
                    // Remove membership if disabled
                    const { error: deleteError } = await supabase
                        .schema('core_common')
                        .from('user_memberships')
                        .delete()
                        .eq('user_id', userId)
                        .eq('empresa_id', companyId);
                    if (deleteError) throw deleteError;
                }
            }

            setIsModalOpen(false);
            fetchData(); // Refresh list

            // If editing own profile, refresh session
            if (user?.id === userId) {
                await refreshProfile();
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('Erro ao salvar alterações');
        } finally {
            setIsSaving(false);
        }
    };

    if (!user?.isAdmin) {
        return <div className="p-8 text-slate-800 dark:text-white">Acesso Negado. Apenas administradores.</div>;
    }

    const uniqueDepartments = Array.from(new Set(employees.map(e => e.mcs_departments?.name).filter(Boolean))).sort();

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciar Usuários</h1>
                    <p className="text-slate-500">Controle de acesso e vínculo com funcionários</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                    <UserPlus size={18} />
                    Convidar Usuário (Em Breve)
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Filter className="h-5 w-5 text-slate-400" />
                    </div>
                    <select
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                    >
                        <option value="">Todos os Departamentos</option>
                        {uniqueDepartments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Email (Login)</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Nome de Exibição</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Permissão</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Funcionário Vinculado</th>
                            <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Departamento</th>
                            <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-300">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {users.filter(u => {
                            const linkedEmp = employees.find(e => e.user_id === u.id);
                            const searchLower = searchTerm.toLowerCase();
                            const matchesSearch =
                                (u.display_name?.toLowerCase().includes(searchLower) ?? false) ||
                                u.email.toLowerCase().includes(searchLower) ||
                                (linkedEmp?.nombrecompleto?.toLowerCase().includes(searchLower) ?? false);

                            const matchesDept = filterDepartment ? linkedEmp?.mcs_departments?.name === filterDepartment : true;

                            return matchesSearch && matchesDept;
                        }).map(u => {
                            const linkedEmp = employees.find(e => e.user_id === u.id);

                            return (
                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                        {u.email}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                        {u.display_name || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                ${u.role === 'super_admin' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' :
                                                    u.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                                        u.role === 'manager' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                                            'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                {u.role.toUpperCase()}
                                            </span>
                                            {u.role === 'admin' && u.managed_departments && u.managed_departments.length > 0 && (
                                                <div className="text-xs text-slate-500 mt-1">
                                                    {u.managed_departments.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                        {linkedEmp ? (
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-700 dark:text-slate-200">{linkedEmp.nombrecompleto}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic">Não vinculado</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                        {linkedEmp ? (
                                            <span className="text-sm">{linkedEmp.mcs_departments?.name || '-'}</span>
                                        ) : (
                                            <span className="text-slate-400 italic">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleEdit(u)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                            title="Editar Acessos e Permissões"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Unified Edit Modal */}
            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Shield className="text-blue-600" size={20} />
                                    Editar Configurações de Acesso
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">{selectedUser.email}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* General Data */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nome de Exibição</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.display_name || ''}
                                        onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Funcionário Vinculado</label>
                                    <select
                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.employee_id}
                                        onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                                    >
                                        <option value="">-- Sem Vínculo --</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.nombrecompleto} ({emp.usuario || 'Sem user'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* System Role */}
                            <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Perfil de App (Global)</label>
                                <select
                                    className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                >
                                    <option value="user">Colaborador Comum (user)</option>
                                    <option value="manager">Gerente (manager)</option>
                                    <option value="operador">Operador (operador)</option>
                                    <option value="admin">Administrador (admin)</option>
                                    <option value="super_admin">Super Administrador (super_admin)</option>
                                </select>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    O Super Administrador tem acesso global irrestrito. Outros perfis dependem dos vínculos de empresas configurados abaixo.
                                </p>
                            </div>

                            {/* Managed Departments (Admin only) */}
                            {formData.role === 'admin' && (
                                <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Departamentos Gerenciados</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const allSelected = formData.managed_departments?.length === uniqueDepartments.length;
                                                setFormData({
                                                    ...formData,
                                                    managed_departments: allSelected ? [] : [...uniqueDepartments] as string[]
                                                });
                                            }}
                                            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                                        >
                                            {formData.managed_departments?.length === uniqueDepartments.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-700">
                                        {uniqueDepartments.map(dept => (
                                            <label key={dept} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                                                    checked={formData.managed_departments?.includes(dept as string)}
                                                    onChange={(e) => {
                                                        const current = formData.managed_departments || [];
                                                        if (e.target.checked) {
                                                            setFormData({ ...formData, managed_departments: [...current, dept as string] });
                                                        } else {
                                                            setFormData({ ...formData, managed_departments: current.filter(d => d !== dept) });
                                                        }
                                                    }}
                                                />
                                                {dept}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Company / Filiais Memberships */}
                            <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                                <div className="mb-3">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acesso às Empresas e Filiais</label>
                                    <p className="text-[11px] text-slate-400">Marque as filiais às quais este usuário tem permissão para visualizar e operar.</p>
                                </div>
                                <div className="space-y-3">
                                    {companies.map(comp => {
                                        const mem = membershipsForm[comp.id] || { role: 'user', is_active: false };
                                        return (
                                            <div key={comp.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${mem.is_active ? 'bg-blue-50/20 border-blue-200 dark:border-blue-800/40 dark:bg-blue-950/10' : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800'}`}>
                                                <div className="flex items-center space-x-3 w-1/2">
                                                    <input
                                                        type="checkbox"
                                                        id={`comp-${comp.id}`}
                                                        className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                                                        checked={mem.is_active}
                                                        onChange={(e) => setMembershipsForm(prev => ({
                                                            ...prev,
                                                            [comp.id]: { ...prev[comp.id], is_active: e.target.checked }
                                                        }))}
                                                    />
                                                    <label htmlFor={`comp-${comp.id}`} className="cursor-pointer">
                                                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                            <Building2 size={14} className="text-slate-400" />
                                                            {comp.nome}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">{comp.codigo}</span>
                                                    </label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-slate-400">Permissão:</span>
                                                    <select
                                                        disabled={!mem.is_active}
                                                        className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 disabled:opacity-50 outline-none"
                                                        value={mem.role}
                                                        onChange={(e) => setMembershipsForm(prev => ({
                                                            ...prev,
                                                            [comp.id]: { ...prev[comp.id], role: e.target.value }
                                                        }))}
                                                    >
                                                        <option value="admin">Admin da Filial</option>
                                                        <option value="rh">Recursos Humanos</option>
                                                        <option value="finance">Financeiro</option>
                                                        <option value="commercial">Comercial</option>
                                                        <option value="user">Colaborador Local</option>
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-2xl">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                                disabled={isSaving}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-1.5 disabled:opacity-75"
                                disabled={isSaving}
                            >
                                <CheckCircle2 size={16} />
                                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
