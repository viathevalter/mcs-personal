import { useState } from 'react';
import { useLeads, useMutateLead } from './hooks/useLeads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Edit, 
  Trash2, 
  UserPlus, 
  Building, 
  Mail, 
  Phone, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { EmpresaSelector } from '@/features/operacoes/components/EmpresaSelector';
import { toast } from 'sonner';
import type { Lead } from '../estimaciones/types';

export function LeadsPage() {
  const { data: leads = [], isLoading, error } = useLeads();
  const { createLead, updateLead, deleteLead, isCreating, isUpdating, isDeleting } = useMutateLead();

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    notes: '',
  });

  const handleOpenCreate = () => {
    setSelectedLead(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company_name: '',
      notes: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      company_name: lead.company_name || '',
      notes: lead.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Nome e Email são obrigatórios');
      return;
    }

    try {
      if (selectedLead) {
        await updateLead({
          id: selectedLead.id,
          payload: formData,
        });
        toast.success('Lead atualizado com sucesso');
      } else {
        await createLead(formData);
        toast.success('Lead criado com sucesso');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar lead');
    }
  };

  const handleDelete = async () => {
    if (!selectedLead) return;
    try {
      await deleteLead(selectedLead.id);
      toast.success('Lead excluído com sucesso');
      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao excluir lead');
    }
  };

  const filteredLeads = leads.filter(lead => {
    const search = searchTerm.toLowerCase();
    return (
      lead.name.toLowerCase().includes(search) ||
      lead.email.toLowerCase().includes(search) ||
      (lead.company_name && lead.company_name.toLowerCase().includes(search)) ||
      (lead.phone && lead.phone.includes(search))
    );
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', {
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
            <UserPlus className="h-8 w-8 text-yellow-500" />
            Leads de Marketing
          </h1>
          <p className="text-muted-foreground">
            Gerencie contatos e potenciais clientes capturados em campanhas de marketing.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <EmpresaSelector />
          <Button onClick={handleOpenCreate} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold shadow-lg shadow-yellow-500/10">
            <Plus className="mr-2 h-4 w-4" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center bg-card border p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail, empresa ou telefone..."
            className="pl-10 focus-visible:ring-yellow-500 focus-visible:border-yellow-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="p-8 border border-red-900 bg-red-950/20 text-red-400 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="font-semibold text-lg">Erro ao carregar dados</h3>
            <p className="text-sm">{(error as any).message || 'Por favor, verifique sua conexão.'}</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-xl border" />
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/10 text-center">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4 border">
            <UserPlus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum Lead Encontrado</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            {searchTerm ? 'Nenhum lead corresponds aos filtros de busca informados.' : 'Cadastre seu primeiro Lead de Marketing clicando no botão acima para iniciar a prospecção.'}
          </p>
          {searchTerm && (
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Limpar Filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="py-4">Nome</TableHead>
                  <TableHead className="py-4">Empresa / Organização</TableHead>
                  <TableHead className="py-4">Contato</TableHead>
                  <TableHead className="py-4">Observações</TableHead>
                  <TableHead className="py-4">Data Cadastro</TableHead>
                  <TableHead className="py-4 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium text-foreground py-4">
                      {lead.name}
                    </TableCell>
                    <TableCell className="py-4">
                      {lead.company_name ? (
                        <span className="flex items-center gap-2 text-foreground/90">
                          <Building className="h-4 w-4 text-muted-foreground/75 shrink-0" />
                          {lead.company_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 italic text-sm">Não informada</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 space-y-1">
                      <div className="flex items-center gap-2 text-foreground/90 text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground/75 shrink-0" />
                        <span className="hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors">{lead.email}</span>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/75 shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-muted-foreground max-w-xs truncate text-sm">
                      {lead.notes || <span className="text-muted-foreground/50 italic">Sem observações</span>}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground/75 shrink-0" />
                        <span>{formatDate(lead.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(lead)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Editar Lead"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(lead)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Excluir Lead"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-yellow-500" />
              {selectedLead ? 'Editar Lead de Marketing' : 'Criar Novo Lead'}
            </DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para {selectedLead ? 'atualizar' : 'salvar'} as informações deste lead.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Contato <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                required
                placeholder="Ex: Ana Souza"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="focus-visible:ring-yellow-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">Empresa / Organização</Label>
              <Input
                id="company_name"
                placeholder="Ex: Luminous Tech"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="focus-visible:ring-yellow-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="Ex: ana@empresa.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="focus-visible:ring-yellow-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="Ex: +34 600 123 456"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="focus-visible:ring-yellow-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações / Detalhes de Prospecção</Label>
              <Textarea
                id="notes"
                placeholder="Registros adicionais, necessidades do cliente, interesses e histórico de contatos..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-[100px] focus-visible:ring-yellow-500"
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold px-6">
                {(isCreating || isUpdating) ? 'Salvando...' : 'Salvar Lead'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Esta ação é permanente e não poderá ser desfeita. Você tem certeza que deseja excluir o lead <strong className="text-foreground">{selectedLead?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
