import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Edit, Save, UserPlus, X, Search, Filter } from 'lucide-react';

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

export const UserManagement: React.FC = () => {
    const { user, refreshProfile } = useAuth();
    const [users, setUsers] = useState<MCSUser[]>([]);
    const [employees, setEmployees] = useState<DepartmentMember[]>([]);
    const [_loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<MCSUser> & { employee_id?: string }>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

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

    const handleEdit = (u: MCSUser) => {
        // Find linked employee
        const linkedEmp = employees.find(e => e.user_id === u.id);
        setEditingUser(u.id);
        setFormData({
            role: u.role,
            display_name: u.display_name,
            employee_id: linkedEmp?.id || '',
            managed_departments: u.managed_departments || []
        });
    };

    const handleSave = async (userId: string) => {
        try {
            // 1. Update ONLY display_name directly if needed (RLS usually allows updating own records or basic info, 
            // but if this fails too, we can move it to the RPC, for now let's keep it here first)
            const { error: nameError } = await supabase
                .from('mcs_users')
                .update({ display_name: formData.display_name })
                .eq('id', userId);

            if (nameError) {
                console.warn('Erro ao atualizar display_name (possível RLS), prosseguindo com role:', nameError);
            }

            // 2. Call secure RPC to update Roles and Departments
            const { error: rpcError } = await supabase.rpc('update_user_role', {
                target_user_id: userId,
                new_role: formData.role,
                new_managed_departments: formData.role === 'admin' ? formData.managed_departments || [] : []
            });

            if (rpcError) throw rpcError;

            // 3. Update Employee Link
            // First unlink any employee currently linked to this user (if changing)
            // Ideally we'd do this more carefully, but for now:

            if (formData.employee_id) {
                // Remove link from old employee if different
                // Actually, just set the new one. The old one might remain linked if we are not careful, 
                // but usually user_id is unique on department members? 
                // Let's first clear THIS user from ALL employees (unlink all)
                await supabase
                    .from('mcs_department_members')
                    .update({ user_id: null })
                    .eq('user_id', userId);

                // Now link selected
                const { error: linkError } = await supabase
                    .from('mcs_department_members')
                    .update({ user_id: userId })
                    .eq('id', formData.employee_id);

                if (linkError) throw linkError;
            } else {
                // If empty, just unlink
                await supabase
                    .from('mcs_department_members')
                    .update({ user_id: null })
                    .eq('user_id', userId);
            }

            setEditingUser(null);
            fetchData(); // Refresh the list

            // If the user edited their own profile, refresh their session profile too
            if (user?.id === userId) {
                await refreshProfile();
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('Erro ao salvar alterações');
        }
    };

    if (!user?.isAdmin) {
        return <div className="p-8">Acesso Negado. Apenas administradores.</div>;
    }

    const uniqueDepartments = Array.from(new Set(employees.map(e => e.mcs_departments?.name).filter(Boolean))).sort();

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciar Usuários</h1>
                    <p className="text-slate-500">Controle de acesso e vínculo com funcionários</p>
                </div>
                {/* Future: Invite User Button */}
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
                                (linkedEmp?.nombrecompleto.toLowerCase().includes(searchLower) ?? false);

                            const matchesDept = filterDepartment ? linkedEmp?.mcs_departments?.name === filterDepartment : true;

                            return matchesSearch && matchesDept;
                        }).map(u => {
                            const isEditing = editingUser === u.id;
                            const linkedEmp = employees.find(e => e.user_id === u.id);

                            return (
                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                        {u.email}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                        {isEditing ? (
                                            <input
                                                className="border rounded px-2 py-1 w-full dark:bg-slate-800 dark:border-slate-600"
                                                value={formData.display_name || ''}
                                                onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                                            />
                                        ) : (
                                            u.display_name || '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isEditing ? (
                                            <div className="flex flex-col gap-2">
                                                <select
                                                    className="border rounded px-2 py-1 dark:bg-slate-800 dark:border-slate-600"
                                                    value={formData.role}
                                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                                >
                                                    <option value="user">Usuário</option>
                                                    <option value="manager">Gerente</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="super_admin">Super Admin</option>
                                                </select>
                                                {formData.role === 'admin' && (
                                                    <div className="mt-2 space-y-1 bg-slate-50 dark:bg-slate-900 p-2 rounded border dark:border-slate-700">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <div className="text-xs font-semibold text-slate-500">Dptos Gerenciados:</div>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    const allSelected = formData.managed_departments?.length === uniqueDepartments.length;
                                                                    setFormData({
                                                                        ...formData,
                                                                        managed_departments: allSelected ? [] : [...uniqueDepartments] as string[]
                                                                    });
                                                                }}
                                                                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                                                            >
                                                                {formData.managed_departments?.length === uniqueDepartments.length ? 'Limpar Todos' : 'Selecionar Todos'}
                                                            </button>
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                                            {uniqueDepartments.map(dept => (
                                                                <label key={dept} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                                    <input
                                                                        type="checkbox"
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
                                            </div>
                                        ) : (
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
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                        {isEditing ? (
                                            <select
                                                className="border rounded px-2 py-1 w-full dark:bg-slate-800 dark:border-slate-600"
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
                                        ) : (
                                            linkedEmp ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-700 dark:text-slate-200">{linkedEmp.nombrecompleto}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">Não vinculado</span>
                                            )
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
                                        {isEditing ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleSave(u.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save size={18} /></button>
                                                <button onClick={() => setEditingUser(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded"><X size={18} /></button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleEdit(u)}
                                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                title="Editar Permissões"
                                            >
                                                <Edit size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
