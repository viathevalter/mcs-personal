import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Save,
    User,
    Mail,
    MapPin,
    Phone,
    Calendar,
    CreditCard,
    UserCheck
} from 'lucide-react';
import { supabaseEmployeeService } from '../../services/db/SupabaseEmployeeService';
import type { Employee } from '../../services/db/SupabaseEmployeeService';
import { supabaseDepartmentService } from '../../services/db/SupabaseDepartmentService';
import { supabaseCompanyService } from '../../services/db/SupabaseCompanyService';
import type { Company } from '../../services/db/SupabaseCompanyService';
import type { Department } from '../../types/models';
import { useLanguage } from '../../i18n';

interface FormData {
    department_id: string;
    empresa_contratante_id: number | '';
    empresa_servicos_id: number | '';
    nombrecompleto: string;
    correoempresarial: string;
    ubicaciontrabajo: string;
    codigoresponsabilidad: string;
    telefonodirecto: string;
    extenciontelefonica: string;
    fechainicio: string;
    fechanacimiento: string;
    estadotrabajador: string;
    iban: string;
    usuario: string;
}

const initialFormState: FormData = {
    department_id: '',
    empresa_contratante_id: '',
    empresa_servicos_id: '',
    nombrecompleto: '',
    correoempresarial: '',
    ubicaciontrabajo: '',
    codigoresponsabilidad: '',
    telefonodirecto: '',
    extenciontelefonica: '',
    fechainicio: '',
    fechanacimiento: '',
    estadotrabajador: 'Ativo',
    iban: '',
    usuario: ''
};

export const Funcionarios: React.FC = () => {
    const { t } = useLanguage();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormState);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [employeesData, departmentsData, companiesData] = await Promise.all([
                supabaseEmployeeService.list(),
                supabaseDepartmentService.list(),
                supabaseCompanyService.list()
            ]);
            // Show all employees, including inactive ones, but maybe style them differently
            setEmployees(employeesData);
            setDepartments(departmentsData.filter(d => d.active !== false));
            setCompanies(companiesData);
        } catch (err) {
            console.error('Error loading data:', err);
            setError(t('funcionarios.messages.error_loading'));
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (employee?: Employee) => {
        if (employee) {
            setEditingId(employee.id);
            setFormData({
                department_id: employee.department_id,
                empresa_contratante_id: employee.empresa_contratante_id || '',
                empresa_servicos_id: employee.empresa_servicos_id || '',
                nombrecompleto: employee.nombrecompleto,
                correoempresarial: employee.correoempresarial || '',
                ubicaciontrabajo: employee.ubicaciontrabajo || '',
                codigoresponsabilidad: employee.codigoresponsabilidad || '',
                telefonodirecto: employee.telefonodirecto || '',
                extenciontelefonica: employee.extenciontelefonica || '',
                fechainicio: employee.fechainicio || '',
                fechanacimiento: employee.fechanacimiento || '',
                estadotrabajador: employee.estadotrabajador || 'Ativo',
                iban: employee.iban || '',
                usuario: employee.usuario || ''
            });
        } else {
            setEditingId(null);
            setFormData(initialFormState);
        }
        setError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombrecompleto || !formData.department_id) {
            setError(t('funcionarios.messages.error_mandatory'));
            return;
        }

        try {
            // Logic to sync active status with estadotrabajador
            const isActive = formData.estadotrabajador === 'Ativo';

            const payload: Partial<Employee> = {
                ...formData,
                active: isActive, // Set active based on status selection
                empresa_contratante_id: formData.empresa_contratante_id === '' ? null : Number(formData.empresa_contratante_id),
                empresa_servicos_id: formData.empresa_servicos_id === '' ? null : Number(formData.empresa_servicos_id)
            };

            if (editingId) {
                const success = await supabaseEmployeeService.update(editingId, payload);
                if (success) {
                    await loadData();
                    setIsModalOpen(false);
                } else {
                    setError(t('funcionarios.messages.error_update'));
                }
            } else {
                const result = await supabaseEmployeeService.create(payload);
                if (result) {
                    await loadData();
                    setIsModalOpen(false);
                } else {
                    setError(t('funcionarios.messages.error_create'));
                }
            }
        } catch (err) {
            console.error(err);
            setError(t('funcionarios.messages.error_save'));
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm(t('funcionarios.messages.confirm_delete'))) {
            const success = await supabaseEmployeeService.delete(id);
            if (success) {
                // Optimistic update or reload
                await loadData();
            } else {
                alert(t('funcionarios.messages.error_delete'));
            }
        }
    };

    const filteredEmployees = employees.filter(employee => {
        const matchesSearch = employee.nombrecompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (employee.department_name && employee.department_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (employee.empresa_contratante_nome && employee.empresa_contratante_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (employee.usuario && employee.usuario.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesDepartment = filterDepartment ? employee.department_id === filterDepartment : true;
        const matchesCompany = filterCompany ? employee.empresa_contratante_id?.toString() === filterCompany : true;

        return matchesSearch && matchesDepartment && matchesCompany;
    });

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'Ativo': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'Inativo': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'Desligado': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <User className="text-blue-600" />
                        {t('funcionarios.title')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {t('funcionarios.subtitle')}
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    <span>{t('funcionarios.btn_new')}</span>
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder={t('funcionarios.filters.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                    >
                        <option value="">{t('funcionarios.filters.all_departments')}</option>
                        {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterCompany}
                        onChange={(e) => setFilterCompany(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                    >
                        <option value="">{t('funcionarios.filters.all_companies')}</option>
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>
                                {company.nome_pbi}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('funcionarios.table.name')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('funcionarios.table.department')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('funcionarios.table.company')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('funcionarios.table.status')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">{t('funcionarios.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        {t('common.loading')}
                                    </td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        {t('funcionarios.empty_search')}
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map((employee) => (
                                    <tr key={employee.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900 dark:text-slate-100">{employee.nombrecompleto}</span>
                                                {employee.usuario && (
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                        <UserCheck size={12} /> {employee.usuario}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                            {employee.department_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                            {employee.empresa_contratante_nome || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.estadotrabajador)}`}>
                                                {t(`funcionarios.status.${employee.estadotrabajador || 'Indefinido'}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                            <button
                                                onClick={() => handleOpenModal(employee)}
                                                className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-100 rounded transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(employee.id)}
                                                className="text-red-600 hover:text-red-800 p-1 hover:bg-red-100 rounded transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {editingId ? t('funcionarios.modal.title_edit') : t('funcionarios.modal.title_new')}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* --- Informações Pessoais --- */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b pb-2 mb-4">{t('funcionarios.modal.personal_info')}</h3>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            {t('funcionarios.modal.full_name')}
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="text"
                                                required
                                                value={formData.nombrecompleto}
                                                onChange={(e) => setFormData({ ...formData, nombrecompleto: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder={t('funcionarios.modal.placeholder_name')}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            {t('funcionarios.modal.birth_date')}
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="date"
                                                value={formData.fechanacimiento}
                                                onChange={(e) => setFormData({ ...formData, fechanacimiento: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* --- Contato --- */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b pb-2 mb-4">{t('funcionarios.modal.contact')}</h3>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            {t('funcionarios.modal.email')}
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="email"
                                                value={formData.correoempresarial}
                                                onChange={(e) => setFormData({ ...formData, correoempresarial: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder={t('funcionarios.modal.placeholder_email')}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                {t('funcionarios.modal.phone')}
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="text"
                                                    value={formData.telefonodirecto}
                                                    onChange={(e) => setFormData({ ...formData, telefonodirecto: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder={t('funcionarios.modal.placeholder_phone')}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                {t('funcionarios.modal.extension')}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.extenciontelefonica}
                                                onChange={(e) => setFormData({ ...formData, extenciontelefonica: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder={t('funcionarios.modal.placeholder_extension')}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* --- Dados Contratuais --- */}
                                <div className="space-y-4 md:col-span-2">
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b pb-2 mb-4">{t('funcionarios.modal.contract_data')}</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                {t('funcionarios.modal.department')}
                                            </label>
                                            <select
                                                required
                                                value={formData.department_id}
                                                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="">{t('funcionarios.modal.select_department')}</option>
                                                {departments.map(dept => (
                                                    <option key={dept.id} value={dept.id}>
                                                        {dept.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                {t('funcionarios.modal.responsibility_code')}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.codigoresponsabilidad}
                                                onChange={(e) => setFormData({ ...formData, codigoresponsabilidad: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                {t('funcionarios.modal.hiring_company')}
                                            </label>
                                            <select
                                                value={formData.empresa_contratante_id}
                                                onChange={(e) => setFormData({ ...formData, empresa_contratante_id: e.target.value === '' ? '' : Number(e.target.value) })}
                                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="">{t('funcionarios.modal.select_company')}</option>
                                                {companies.map(company => (
                                                    <option key={company.id} value={company.id}>
                                                        {company.nome_pbi}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                {t('funcionarios.modal.service_company')}
                                            </label>
                                            <select
                                                value={formData.empresa_servicos_id}
                                                onChange={(e) => setFormData({ ...formData, empresa_servicos_id: e.target.value === '' ? '' : Number(e.target.value) })}
                                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="">{t('funcionarios.modal.select_company')}</option>
                                                {companies.map(company => (
                                                    <option key={company.id} value={company.id}>
                                                        {company.nome_pbi}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                {t('funcionarios.modal.workplace')}
                                            </label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="text"
                                                    value={formData.ubicaciontrabajo}
                                                    onChange={(e) => setFormData({ ...formData, ubicaciontrabajo: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                {t('funcionarios.modal.start_date')}
                                            </label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="date"
                                                    value={formData.fechainicio}
                                                    onChange={(e) => setFormData({ ...formData, fechainicio: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                {t('funcionarios.modal.iban')}
                                            </label>
                                            <div className="relative">
                                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="text"
                                                    value={formData.iban}
                                                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder={t('funcionarios.modal.placeholder_iban')}
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                    {t('funcionarios.modal.system_user')}
                                                </label>
                                                <div className="relative">
                                                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                    <input
                                                        type="text"
                                                        value={formData.usuario}
                                                        onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder={t('funcionarios.modal.placeholder_user')}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                    {t('funcionarios.table.status')}
                                                </label>
                                                <select
                                                    value={formData.estadotrabajador}
                                                    onChange={(e) => setFormData({ ...formData, estadotrabajador: e.target.value })}
                                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="Ativo">{t('funcionarios.status.Ativo')}</option>
                                                    <option value="Inativo">{t('funcionarios.status.Inativo')}</option>
                                                    <option value="Desligado">{t('funcionarios.status.Desligado')}</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                                >
                                    {t('funcionarios.modal.btn_cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                                >
                                    <Save size={18} />
                                    <span>{editingId ? t('funcionarios.modal.btn_save') : t('funcionarios.modal.btn_create')}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
