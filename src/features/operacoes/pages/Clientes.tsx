import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Eye } from 'lucide-react';
import { fetchClientes } from '../services/queries';


export const Clientes: React.FC = () => {
    const navigate = useNavigate();
    const [clientes, setClientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchClientes().then(data => {
            setClientes(data || []);
            setLoading(false);
        });
    }, []);

    const filteredClientes = clientes.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toString().includes(searchTerm)
    );

    if (loading) return <div className="p-8">Carregando clientes...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 transition-colors">
                        <Users className="text-blue-600 dark:text-blue-500" />
                        Clientes
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie e visualize informações dos clientes</p>
                </div>
            </div>

            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou ID..."
                        className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors flex flex-col h-[calc(100vh-200px)]">
                <div className="overflow-auto flex-grow">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-700 dark:text-slate-300 text-sm divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredClientes.length > 0 ? (
                                filteredClientes.map((cliente) => (
                                    <tr key={cliente.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{cliente.nome}</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">#{cliente.id}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
                                                Ativo
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => navigate(`/clientes/${cliente.id}`)}
                                                className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium inline-flex items-center gap-1 transition-colors px-3 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            >
                                                <Eye size={16} /> <span className="text-xs">Ver 360</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center">
                                            <Users size={32} className="text-slate-300 mb-2" />
                                            <p>Nenhum cliente encontrado.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
