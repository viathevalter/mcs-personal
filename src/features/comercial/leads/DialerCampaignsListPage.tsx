import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, 
  PhoneCall, 
  Play, 
  Pause, 
  Trash2, 
  Eye, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Search, 
  Filter, 
  Layers, 
  Calendar,
  Sparkles,
  BarChart3,
  Loader2,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useDialerCampaigns, useDialerQueue, useMutateDialer } from './hooks/useDialer';
import { CreateCampaignModal } from './components/CreateCampaignModal';
import { useLeads } from './hooks/useLeads';
import { toast } from 'sonner';
import type { DialerCampaign, DialerQueueItem } from './types/dialerTypes';

export function DialerCampaignsListPage() {
  const navigate = useNavigate();
  const { selectedEmpresaId } = useEmpresa();
  const { data: campaigns = [], isLoading } = useDialerCampaigns();
  const { data: allLeads = [] } = useLeads({ empresaId: selectedEmpresaId });
  const { updateCampaignStatus, deleteCampaign, isUpdatingCampaignStatus, isDeletingCampaign } = useMutateDialer();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCampaignForQueue, setSelectedCampaignForQueue] = useState<DialerCampaign | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  // Leads in currently inspected queue
  const { data: inspectedQueue = [], isLoading: loadingQueue } = useDialerQueue(
    selectedCampaignForQueue?.id
  );

  const filteredCampaigns = campaigns.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.assigned_user?.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.script?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = async (campaign: DialerCampaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      await updateCampaignStatus({ id: campaign.id, status: newStatus });
      toast.success(`Trabalho ${newStatus === 'active' ? 'ativado' : 'pausado'} com sucesso!`);
    } catch (err: any) {
      toast.error('Erro ao alterar status do trabalho');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este trabalho e sua fila de discagem?')) return;
    try {
      await deleteCampaign(id);
      toast.success('Trabalho excluído com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao excluir trabalho');
    }
  };

  const handleOpenQueueViewer = (campaign: DialerCampaign) => {
    setSelectedCampaignForQueue(campaign);
    setIsQueueModalOpen(true);
  };

  // Summary Counters
  const totalCampaigns = campaigns.length;
  const activeCampaignsCount = campaigns.filter(c => c.status === 'active').length;
  const totalLeadsEnqueued = campaigns.reduce((acc, c) => acc + (c.total_leads || 0), 0);
  const totalCompletedLeads = campaigns.reduce((acc, c) => acc + (c.completed_leads || 0), 0);

  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                Trabalhos & Filas de Discagem
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                  Power Dialer
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                Consulte e gerencie todos os lotes de prospecção gerados para a equipe comercial (Omar, Michele).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            onClick={() => navigate('/comercial/discador')}
            variant="outline"
            className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold gap-2"
          >
            <PhoneCall className="w-4 h-4 text-emerald-400" />
            Abrir Discador
          </Button>

          <Button
            onClick={() => navigate('/comercial/leads')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-900/30 gap-2"
          >
            <Plus className="w-4 h-4" />
            Gerar Fila da Base de Leads
          </Button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground uppercase font-bold">Total de Trabalhos</span>
          <p className="text-2xl font-black text-foreground">{totalCampaigns}</p>
          <p className="text-[11px] text-blue-500 font-semibold">{activeCampaignsCount} ativos no momento</p>
        </div>

        <div className="p-4 rounded-xl bg-card border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground uppercase font-bold">Leads Enfileirados</span>
          <p className="text-2xl font-black text-foreground">{totalLeadsEnqueued}</p>
          <p className="text-[11px] text-slate-400">Distribuídos em lotes</p>
        </div>

        <div className="p-4 rounded-xl bg-card border shadow-sm space-y-1">
          <span className="text-xs text-emerald-500 uppercase font-bold">Leads Concluídos</span>
          <p className="text-2xl font-black text-emerald-500">{totalCompletedLeads}</p>
          <p className="text-[11px] text-slate-400">
            {totalLeadsEnqueued > 0 ? Math.round((totalCompletedLeads / totalLeadsEnqueued) * 100) : 0}% do mailing processado
          </p>
        </div>

        <div className="p-4 rounded-xl bg-card border shadow-sm space-y-1">
          <span className="text-xs text-indigo-500 uppercase font-bold">Disponíveis p/ Discagem</span>
          <p className="text-2xl font-black text-indigo-500">{totalLeadsEnqueued - totalCompletedLeads}</p>
          <p className="text-[11px] text-slate-400">Aguardando atendimento</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-card border rounded-xl">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do trabalho, operador ou script..."
            className="pl-9 bg-background text-xs h-9"
          />
        </div>

        <span className="text-xs text-muted-foreground">
          Exibindo <strong>{filteredCampaigns.length}</strong> de {campaigns.length} trabalhos
        </span>
      </div>

      {/* Campaigns Table */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="text-sm">Carregando trabalhos de discagem...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border-2 border-dashed bg-card space-y-4">
          <Layers className="w-12 h-12 text-muted-foreground/50 mx-auto" />
          <h3 className="text-base font-bold text-foreground">Nenhum trabalho de discagem encontrado</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Você pode ir até a base de leads, aplicar filtros por região ou setor, selecionar 50 a 100 empresas e clicar em "Criar Fila de Discagem".
          </p>
          <Button
            onClick={() => navigate('/comercial/leads')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
          >
            Ir para Base de Leads
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-bold border-b">
                <tr>
                  <th className="py-3.5 px-4">Nome do Trabalho</th>
                  <th className="py-3.5 px-4">Operador / Vendedor</th>
                  <th className="py-3.5 px-4">Script de Abordagem</th>
                  <th className="py-3.5 px-4 text-center">Progresso da Fila</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Criado em</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCampaigns.map(camp => {
                  const total = camp.total_leads || 0;
                  const completed = camp.completed_leads || 0;
                  const pending = total - completed;
                  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <tr key={camp.id} className="hover:bg-muted/30 transition-colors">
                      {/* Title & Description */}
                      <td className="py-4 px-4 font-bold text-foreground">
                        <div className="space-y-0.5">
                          <span className="text-sm font-bold text-foreground hover:text-blue-500 cursor-pointer" onClick={() => navigate(`/comercial/discador?campaignId=${camp.id}`)}>
                            {camp.title}
                          </span>
                          {camp.description && (
                            <p className="text-[11px] text-muted-foreground font-normal line-clamp-1">
                              {camp.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Operator */}
                      <td className="py-4 px-4 font-medium">
                        {camp.assigned_user ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[10px]">
                              {camp.assigned_user.display_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-foreground">{camp.assigned_user.display_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Qualquer operador</span>
                        )}
                      </td>

                      {/* Script */}
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="text-[11px] font-normal border-slate-700">
                          {camp.script?.title || 'Script Padrão Industrial'}
                        </Badge>
                      </td>

                      {/* Progress Bar & Counters */}
                      <td className="py-4 px-4">
                        <div className="w-44 mx-auto space-y-1 text-center">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-emerald-500 font-bold">{completed} concluídos</span>
                            <span className="text-muted-foreground">{pending} restam ({total})</span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase ${
                          camp.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : camp.status === 'paused'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {camp.status === 'active' ? 'Ativa' : camp.status === 'paused' ? 'Pausada' : 'Concluída'}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 text-center text-muted-foreground font-mono text-[11px]">
                        {new Date(camp.created_at).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Play in Dialer */}
                          <Button
                            size="sm"
                            onClick={() => navigate(`/comercial/discador?campaignId=${camp.id}`)}
                            className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 shadow-sm"
                            title="Atender no Discador"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Discar
                          </Button>

                          {/* View Queue Items */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenQueueViewer(camp)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Ver fila de leads"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Pause / Resume */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(camp)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-400"
                            title={camp.status === 'active' ? 'Pausar trabalho' : 'Ativar trabalho'}
                          >
                            {camp.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(camp.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500"
                            title="Excluir lote"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: View Queue Leads */}
      <Dialog open={isQueueModalOpen} onOpenChange={setIsQueueModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto bg-slate-950 border border-slate-800 text-slate-100 p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-slate-800">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Fila de Leads: {selectedCampaignForQueue?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Relação de todas as empresas incluídas nesta campanha e status de contato individual.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {loadingQueue ? (
              <div className="p-8 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                Carregando leads da fila...
              </div>
            ) : inspectedQueue.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhum lead nesta fila.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Empresa</th>
                      <th className="py-2.5 px-3">Telefone</th>
                      <th className="py-2.5 px-3 text-center">Tentativas</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {inspectedQueue.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {item.lead.company_name || item.lead.name}
                          <p className="text-[10px] text-slate-400 font-normal">
                            {item.lead.city || item.lead.province || 'Espanha'} • {item.lead.sector || 'Industrial'}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{item.lead.phone || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-300">{item.attempts_count}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === 'converted'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : item.status === 'scheduled'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : item.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : item.status === 'no_answer'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQueueModalOpen(false)}
              className="bg-slate-900 border-slate-700 text-slate-300"
            >
              Fechar
            </Button>
            {selectedCampaignForQueue && (
              <Button
                size="sm"
                onClick={() => {
                  setIsQueueModalOpen(false);
                  navigate(`/comercial/discador?campaignId=${selectedCampaignForQueue.id}`);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Abrir no Discador
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
