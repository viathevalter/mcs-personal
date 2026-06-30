import { useState } from 'react';
import { useClientContacts, useMutateClientContact } from '../../hooks/useClientContacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Users, AlertCircle, Mail, Phone, Contact } from 'lucide-react';
import { toast } from 'sonner';
import type { ClientContact } from '../../types';

interface ClientContactsTabProps {
  clientId: string;
}

const PREDEFINED_ROLES = [
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'diretor', label: 'Diretor' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'encarregado', label: 'Encarregado' },
];

export function ClientContactsTab({ clientId }: ClientContactsTabProps) {
  const { data: contacts = [], isLoading, error } = useClientContacts(clientId);
  const { createContact, updateContact, deleteContact, isCreating, isUpdating, isDeleting } = useMutateClientContact(clientId);

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ClientContact | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    roleSelect: 'financeiro',
    roleCustom: '',
    phone: '',
    email: '',
  });

  const handleOpenCreate = () => {
    setSelectedContact(null);
    setFormData({
      name: '',
      roleSelect: 'financeiro',
      roleCustom: '',
      phone: '',
      email: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (contact: ClientContact) => {
    setSelectedContact(contact);
    
    // Check if current role is predefined
    const isPredefined = PREDEFINED_ROLES.some(r => r.label.toLowerCase() === contact.role?.toLowerCase() || r.value === contact.role?.toLowerCase());
    
    setFormData({
      name: contact.name,
      roleSelect: isPredefined ? (contact.role?.toLowerCase() || 'financeiro') : 'custom',
      roleCustom: isPredefined ? '' : (contact.role || ''),
      phone: contact.phone || '',
      email: contact.email || '',
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (contact: ClientContact) => {
    setSelectedContact(contact);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Nome do contato é obrigatório');
      return;
    }

    let finalRole = '';
    if (formData.roleSelect === 'custom') {
      finalRole = formData.roleCustom.trim();
      if (!finalRole) {
        toast.error('Por favor, informe a função/cargo do contato');
        return;
      }
    } else {
      const selected = PREDEFINED_ROLES.find(r => r.value === formData.roleSelect);
      finalRole = selected ? selected.label : '';
    }

    try {
      const payload = {
        name: formData.name,
        role: finalRole || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
      };

      if (selectedContact) {
        await updateContact({
          id: selectedContact.id,
          payload,
        });
        toast.success('Contato atualizado com sucesso!');
      } else {
        await createContact(payload);
        toast.success('Contato cadastrado com sucesso!');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar contato');
    }
  };

  const handleDelete = async () => {
    if (!selectedContact) return;
    try {
      await deleteContact(selectedContact.id);
      toast.success('Contato excluído com sucesso!');
      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao excluir contato');
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.role && c.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">Contatos do Cliente</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os pontos de contato e seus respectivos cargos na empresa deste cliente.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-500/10 shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Contato
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center bg-card border p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, função ou e-mail..."
            className="pl-10 focus-visible:ring-orange-500 focus-visible:border-orange-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="p-8 border border-red-950 bg-red-950/20 text-red-400 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="font-semibold text-lg">Erro ao carregar contatos</h3>
            <p className="text-sm">{(error as any).message || 'Por favor, verifique sua conexão.'}</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-xl border" />
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/10 text-center">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4 border">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum Contato Encontrado</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            {searchTerm
              ? 'Nenhum contato corresponde aos filtros de busca informados.'
              : 'Cadastre o primeiro contato de suporte para este cliente.'}
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
                  <TableHead className="py-4">Cargo / Função</TableHead>
                  <TableHead className="py-4">E-mail</TableHead>
                  <TableHead className="py-4">Telefone</TableHead>
                  <TableHead className="py-4 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium text-foreground py-4 flex items-center gap-2">
                      <Contact className="h-4 w-4 text-slate-400 shrink-0" />
                      {contact.name}
                    </TableCell>
                    <TableCell className="text-foreground/90 py-4">
                      {contact.role || <span className="text-muted-foreground/50 italic">Não informado</span>}
                    </TableCell>
                    <TableCell className="py-4 text-sm">
                      {contact.email ? (
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Mail className="h-3.5 w-3.5" />
                          {contact.email}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 italic">Sem e-mail</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-sm">
                      {contact.phone ? (
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Phone className="h-3.5 w-3.5" />
                          {contact.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 italic">Sem telefone</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(contact)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Editar Contato"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(contact)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Excluir Contato"
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
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              {selectedContact ? 'Editar Contato' : 'Novo Contato'}
            </DialogTitle>
            <DialogDescription>
              Preencha os detalhes do ponto de contato do cliente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="cont_name">Nome Completo *</Label>
              <Input
                id="cont_name"
                required
                placeholder="Ex: Carlos Oliveira"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="focus-visible:ring-orange-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cont_role_select">Função / Cargo *</Label>
              <Select
                value={formData.roleSelect}
                onValueChange={(val) => setFormData({ ...formData, roleSelect: val })}
              >
                <SelectTrigger id="cont_role_select" className="focus-visible:ring-orange-500">
                  <SelectValue placeholder="Selecione o cargo/função..." />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Outra (Digitar manualmente)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.roleSelect === 'custom' && (
              <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                <Label htmlFor="cont_role_custom">Descreva a Função / Cargo *</Label>
                <Input
                  id="cont_role_custom"
                  required
                  placeholder="Ex: Gerente de Operações, Diretor Técnico"
                  value={formData.roleCustom}
                  onChange={(e) => setFormData({ ...formData, roleCustom: e.target.value })}
                  className="focus-visible:ring-orange-500"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cont_email">E-mail</Label>
              <Input
                id="cont_email"
                type="email"
                placeholder="Ex: carlos@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="focus-visible:ring-orange-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cont_phone">Telefone</Label>
              <Input
                id="cont_phone"
                placeholder="Ex: +351 912 345 678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="focus-visible:ring-orange-500"
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6"
              >
                {isCreating || isUpdating ? 'Salvando...' : 'Salvar'}
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
              Esta ação é permanente. Tem certeza de que deseja excluir o contato{' '}
              <strong className="text-foreground">"{selectedContact?.name}"</strong>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
