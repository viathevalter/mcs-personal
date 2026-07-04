import { useState } from 'react';
import { useLeads } from './hooks/useLeads';
import { useKanbanStages, useMutateKanban } from './hooks/useKanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Building, 
  Mail, 
  Phone, 
  Settings,
  Trash2,
  Calendar,
  Layers
} from 'lucide-react';
import { EmpresaSelector } from '@/features/operacoes/components/EmpresaSelector';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function KanbanPage() {
  const { t, i18n } = useTranslation();
  const { selectedEmpresaId } = useEmpresa();
  const { data: stages = [], isLoading: loadingStages } = useKanbanStages();
  const { data: leads = [], isLoading: loadingLeads } = useLeads();
  const { createStage, updateStage, deleteStage, moveLead } = useMutateKanban();

  const [searchTerm, setSearchTerm] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#3b82f6');

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    try {
      await moveLead({ leadId, stageId });
      toast.success('Estágio do lead atualizado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao mover lead');
    }
  };

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) {
      toast.error('O nome do estágio é obrigatório');
      return;
    }

    try {
      const orderIndex = stages.length > 0 ? Math.max(...stages.map(s => s.order_index)) + 1 : 1;
      await createStage({
        name: newStageName,
        color: newStageColor,
        order_index: orderIndex,
      });
      toast.success('Novo estágio criado com sucesso!');
      setNewStageName('');
      setNewStageColor('#3b82f6');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar estágio');
    }
  };

  const handleDeleteStage = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este estágio? Leads associados ficarão sem estágio definido.')) {
      try {
        await deleteStage(id);
        toast.success('Estágio excluído com sucesso.');
      } catch (err: any) {
        toast.error(err.message || 'Erro ao excluir estágio');
      }
    }
  };

  // Filtragem de leads
  const filteredLeads = leads.filter(lead => {
    const search = searchTerm.toLowerCase();
    return (
      lead.name.toLowerCase().includes(search) ||
      lead.email.toLowerCase().includes(search) ||
      (lead.company_name && lead.company_name.toLowerCase().includes(search)) ||
      (lead.phone && lead.phone.includes(search))
    );
  });

  // Agrupar leads por ID do estágio
  const getLeadsInStage = (stageId: string) => {
    return filteredLeads.filter(lead => lead.stage_id === stageId);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : i18n.resolvedLanguage === 'es' ? 'es-ES' : 'pt-PT';
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-8 w-8 text-yellow-500" />
            Funil de Vendas
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o engajamento e a negociação dos seus leads em tempo real
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <EmpresaSelector />
          <Button onClick={() => setIsConfigOpen(true)} variant="outline" className="border-slate-300 dark:border-slate-800">
            <Settings className="mr-2 h-4 w-4" />
            Configurar Estágios
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center bg-card border p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lead por nome, empresa, e-mail..."
            className="pl-10 focus-visible:ring-yellow-500 focus-visible:border-yellow-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[600px]">
        {loadingStages || loadingLeads ? (
          <div className="flex justify-center items-center w-full py-20 text-muted-foreground">
            Carregando funil de vendas...
          </div>
        ) : stages.length === 0 ? (
          <div className="flex flex-col justify-center items-center w-full py-20 text-muted-foreground border border-dashed rounded-xl bg-card">
            <Layers className="h-12 w-12 text-slate-400 mb-2" />
            <p className="font-semibold">Nenhum estágio do funil configurado</p>
            <p className="text-sm">Clique em "Configurar Estágios" para começar.</p>
          </div>
        ) : (
          stages.map(stage => {
            const stageLeads = getLeadsInStage(stage.id);
            return (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="flex flex-col w-72 shrink-0 bg-slate-100 dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: stage.color }}
                    />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[180px]">
                      {stage.name}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Stage Body (Leads List) */}
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[550px] min-h-[400px]">
                  {stageLeads.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-xs text-muted-foreground border border-dashed border-slate-300 dark:border-slate-800 rounded-lg">
                      Arraste leads para cá
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className="bg-card hover:border-yellow-500/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm cursor-grab active:cursor-grabbing hover:shadow transition-all group"
                      >
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                          <Building size={12} className="shrink-0" />
                          <span className="truncate">{lead.company_name}</span>
                        </div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm mb-2 group-hover:text-yellow-500 transition-colors">
                          {lead.name}
                        </h4>
                        
                        <div className="space-y-1 text-xs text-slate-500">
                          {lead.email && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail size={12} className="shrink-0" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone size={12} className="shrink-0" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-150 dark:border-slate-800 flex justify-between items-center text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {lead.created_at ? formatDate(lead.created_at) : ''}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Configuração dos Estágios do Funil</DialogTitle>
            <DialogDescription>
              Adicione novos estágios ou exclua os existentes. Reordene arrastando e editando os índices.
            </DialogDescription>
          </DialogHeader>

          {/* Adicionar Estágio */}
          <form onSubmit={handleCreateStage} className="space-y-4 border-b pb-4 mb-4">
            <h4 className="font-semibold text-sm">Adicionar Novo Estágio</h4>
            <div className="grid grid-cols-3 gap-3 items-end">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="stageName" className="text-xs">Nome do Estágio</Label>
                <Input
                  id="stageName"
                  placeholder="Ex: Negociação"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stageColor" className="text-xs">Cor</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="stageColor"
                    type="color"
                    className="w-10 h-10 p-0 border rounded cursor-pointer"
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                  />
                  <Button type="submit" size="icon" className="h-10 w-10 bg-yellow-500 hover:bg-yellow-600 text-slate-950">
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </form>

          {/* Listar Estágios Existentes */}
          <div className="space-y-3 max-h-[250px] overflow-y-auto">
            <h4 className="font-semibold text-sm">Estágios Ativos</h4>
            {stages.map((stage, idx) => (
              <div key={stage.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border p-2.5 rounded-lg text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400 w-5">#{idx + 1}</span>
                  <span 
                    className="w-3.5 h-3.5 rounded-full" 
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">{stage.name}</span>
                  {stage.is_system && (
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-1.5 py-0.25 rounded">Sistema</span>
                  )}
                </div>
                {!stage.is_system && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 w-8"
                    onClick={() => handleDeleteStage(stage.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="mt-4">
            <Button onClick={() => setIsConfigOpen(false)} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
