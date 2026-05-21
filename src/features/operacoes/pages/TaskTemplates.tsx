import React, { useEffect, useState } from 'react';
import {
  Plus, Search, Edit2, CheckCircle, XCircle, Save, X, CheckSquare, Clock, Briefcase
} from 'lucide-react';
import { taskTemplateService } from '../services/mock/taskTemplates.service';
import { departmentService } from '../services/mock/departments.service';
import type { TaskTemplate, Department } from '../types/models';

export const TaskTemplates: React.FC = () => {
  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Partial<TaskTemplate>>({
    title: '',
    description: '',
    default_department_id: '',
    default_sla_days: 1,
    default_sla_unit: 'days',
    active: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, dData] = await Promise.all([
        taskTemplateService.list(),
        departmentService.list()
      ]);
      setTasks(tData);
      setDepartments(dData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentTask.id) {
        await taskTemplateService.update(currentTask.id, currentTask);
      } else {
        await taskTemplateService.create({
          title: currentTask.title!,
          description: currentTask.description || '',
          default_department_id: currentTask.default_department_id || departments[0]?.id || 'dept-1',
          default_sla_days: Number(currentTask.default_sla_days) || 1,
          default_sla_unit: currentTask.default_sla_unit || 'days'
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar template.');
    }
  };

  const handleEdit = (task: TaskTemplate) => {
    setCurrentTask(task);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setCurrentTask({
      title: '',
      description: '',
      default_department_id: departments[0]?.id || '',
      default_sla_days: 1,
      default_sla_unit: 'days',
      active: true
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (task: TaskTemplate) => {
    await taskTemplateService.update(task.id, { active: !task.active });
    loadData();
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = showActiveOnly ? t.active : true;
    return matchesSearch && matchesActive;
  });

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || 'Desconhecido';

  return (
    <div className="space-y-6 animate-fade-in font-inter">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors">Biblioteca de Tarefas</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">Gerencie os modelos de tarefas padrão para Playbooks.</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all"
        >
          <Plus size={16} />
          <span>Nova Tarefa Modelo</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Buscar por título..."
            className="w-full bg-slate-50 dark:bg-slate-950 pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="activeOnly"
            checked={showActiveOnly}
            onChange={e => setShowActiveOnly(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 dark:bg-slate-800"
          />
          <label htmlFor="activeOnly" className="text-sm text-slate-700 dark:text-slate-300 font-medium cursor-pointer transition-colors">Apenas Ativos</label>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">Carregando...</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3 w-10">Status</th>
                <th className="px-6 py-3">Título / Descrição</th>
                <th className="px-6 py-3">Departamento Padrão</th>
                <th className="px-6 py-3">SLA Padrão</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.map(task => (
                <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 group transition-colors">
                  <td className="px-6 py-3">
                    <button onClick={() => handleToggleActive(task)} title={task.active ? "Desativar" : "Ativar"}>
                      {task.active ? (
                        <CheckCircle size={18} className="text-emerald-500" />
                      ) : (
                        <XCircle size={18} className="text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <div className={`font-medium ${task.active ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>{task.title}</div>
                    {task.description && <div className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-xs">{task.description}</div>}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                      <Briefcase size={12} />
                      {getDeptName(task.default_department_id)}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Clock size={14} className="text-amber-500" />
                      {task.default_sla_days} {task.default_sla_unit === 'hours' ? 'horas' : 'dias'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleEdit(task)}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">Nenhuma tarefa encontrada.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md animate-fade-in flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 transition-colors">
                <CheckSquare className="text-blue-600 dark:text-blue-500" size={20} />
                {currentTask.id ? 'Editar Tarefa Modelo' : 'Nova Tarefa Modelo'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Título da Tarefa</label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:outline-none transition-colors"
                  value={currentTask.title}
                  onChange={e => setCurrentTask({ ...currentTask, title: e.target.value })}
                  placeholder="Ex: Emitir nota fiscal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Descrição (Instruções)</label>
                <textarea
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:outline-none transition-colors"
                  value={currentTask.description}
                  onChange={e => setCurrentTask({ ...currentTask, description: e.target.value })}
                  placeholder="Instruções para quem for executar a tarefa..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Setor Padrão</label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:outline-none transition-colors"
                    value={currentTask.default_department_id}
                    onChange={e => setCurrentTask({ ...currentTask, default_department_id: e.target.value })}
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">SLA Padrão</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:outline-none transition-colors"
                      value={currentTask.default_sla_days}
                      onChange={e => setCurrentTask({ ...currentTask, default_sla_days: Number(e.target.value) })}
                    />
                    <select
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:outline-none transition-colors"
                      value={currentTask.default_sla_unit || 'days'}
                      onChange={e => setCurrentTask({ ...currentTask, default_sla_unit: e.target.value as 'hours' | 'days' })}
                    >
                      <option value="days">Dias</option>
                      <option value="hours">Horas</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="modalActive"
                  checked={currentTask.active}
                  onChange={e => setCurrentTask({ ...currentTask, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 dark:bg-slate-800"
                />
                <label htmlFor="modalActive" className="text-sm text-slate-700 dark:text-slate-300 font-medium cursor-pointer transition-colors">Modelo Ativo</label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-transparent transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-bold shadow-sm flex items-center gap-2 transition-colors">
                  <Save size={16} /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div >
      )}
    </div >
  );
};
