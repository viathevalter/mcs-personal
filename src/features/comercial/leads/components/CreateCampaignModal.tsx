import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhoneCall, Loader2, Zap } from 'lucide-react';
import { useSalespeople, useCommercialScope } from '../hooks/useLeads';
import { useSalesScripts, useMutateDialer } from '../hooks/useDialer';
import { useComercialLanguage } from '../utils/comercialI18n';
import { toast } from 'sonner';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeadIds: string[];
  selectedCount: number;
  defaultTitle?: string;
  defaultVendedorHint?: string;
}

export function CreateCampaignModal({
  isOpen,
  onClose,
  selectedLeadIds,
  selectedCount,
  defaultTitle,
  defaultVendedorHint,
}: CreateCampaignModalProps) {
  const navigate = useNavigate();
  const { tr } = useComercialLanguage();
  const { data: salespeople = [] } = useSalespeople();
  const { isCommercialOperator, loggedCommercialProfile, activeCommercialProfile } = useCommercialScope();
  const { data: scripts = [] } = useSalesScripts();
  const { createCampaign, isCreatingCampaign } = useMutateDialer();

  const defaultQueuePrefix = tr('Fila de Prospecção', 'Cola de Prospección', 'File de Prospection');

  const [title, setTitle] = useState(`${defaultQueuePrefix} - ${new Date().toLocaleDateString('es-ES')}`);
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [scriptId, setScriptId] = useState<string>(scripts[0]?.id || '');

  useEffect(() => {
    if (isOpen) {
      if (defaultTitle) {
        setTitle(defaultTitle);
      } else {
        setTitle(`${defaultQueuePrefix} - ${new Date().toLocaleDateString('es-ES')}`);
      }

      if (isCommercialOperator && loggedCommercialProfile) {
        setAssignedTo(loggedCommercialProfile.userId);
        return;
      }

      if (defaultVendedorHint && defaultVendedorHint !== 'all' && salespeople.length > 0) {
        const hintLower = defaultVendedorHint.toLowerCase();
        const matched = salespeople.find(sp => {
          const nameLower = (sp.display_name || '').toLowerCase();
          const emailLower = (sp.email || '').toLowerCase();
          const ownerLower = (sp.ownerKey || '').toLowerCase();
          return (
            ownerLower === hintLower ||
            nameLower.includes(hintLower) ||
            emailLower.includes(hintLower)
          );
        });
        if (matched) {
          setAssignedTo(matched.id);
          return;
        }
      }

      if (activeCommercialProfile) {
        setAssignedTo(activeCommercialProfile.userId);
      } else if (salespeople.length > 0 && !assignedTo) {
        setAssignedTo(salespeople[0].id);
      }
    }
  }, [isOpen, defaultTitle, defaultVendedorHint, salespeople, isCommercialOperator, loggedCommercialProfile, activeCommercialProfile, defaultQueuePrefix]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLeadIds.length === 0) {
      toast.error(
        tr(
          'Nenhum lead selecionado para a fila de discagem',
          'Ningún lead seleccionado para la cola de llamadas',
          'Aucun lead sélectionné pour la file d\'appels'
        )
      );
      return;
    }

    try {
      const newCampaign = await createCampaign({
        title,
        description,
        assigned_to: assignedTo && assignedTo !== 'unassigned' ? assignedTo : null,
        script_id: scriptId || (scripts[0]?.id || null),
        lead_ids: selectedLeadIds,
      });

      toast.success(
        tr(
          `Fila com ${selectedLeadIds.length} leads criada com sucesso!`,
          `¡Cola con ${selectedLeadIds.length} leads creada con éxito!`,
          `File avec ${selectedLeadIds.length} leads créée avec succès !`
        )
      );
      onClose();
      navigate(`/comercial/discador?campaignId=${newCampaign.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.message ||
          tr('Erro ao criar fila de discagem', 'Error al crear la cola de llamadas', 'Erreur lors de la création de la file')
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-xl bg-card border-border text-foreground p-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-500">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                {tr(
                  'Criar Fila de Discagem (Power Dialer)',
                  'Crear Cola de Llamadas (Power Dialer)',
                  'Créer une File d\'Appels (Power Dialer)'
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {tr(
                  'Gere um trabalho sequencial de prospecção para ligar para as empresas selecionadas.',
                  'Genere un trabajo secuencial de prospección para llamar a las empresas seleccionadas.',
                  'Générez un travail séquentiel de prospection pour appeler les entreprises sélectionnées.'
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Selected Leads Alert */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <PhoneCall className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-foreground">
                {tr(
                  'Empresas selecionadas no mailing:',
                  'Empresas seleccionadas en el público:',
                  'Entreprises sélectionnées dans l\'audience :'
                )}
              </span>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              {selectedCount} {tr('Empresas', 'Empresas', 'Entreprises')}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground font-medium">
              {tr(
                'Nome do Trabalho / Campanha',
                'Nombre del Trabajo / Campaña',
                'Nom du Travail / Campagne'
              )}
            </Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={tr(
                'Ex: Campanha Calderería & Estruturas',
                'Ej: Campaña Calderería & Estructuras',
                'Ex : Campagne Tuyauterie & Chaudronnerie'
              )}
              required
              className="bg-background border-input text-foreground text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground font-medium">
                {tr(
                  'Comercial Responsável (SDR)',
                  'Comercial Responsable (SDR)',
                  'Commercial Responsable (SDR)'
                )}
              </Label>
              <Select
                value={assignedTo}
                onValueChange={setAssignedTo}
                disabled={isCommercialOperator}
              >
                <SelectTrigger className="bg-background border-input text-foreground text-xs h-9">
                  <SelectValue
                    placeholder={tr(
                      'Selecione o comercial...',
                      'Seleccione el comercial...',
                      'Sélectionnez le commercial...'
                    )}
                  />
                </SelectTrigger>
                <SelectContent className="bg-card text-card-foreground border-border text-xs">
                  {salespeople.map(sp => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.flag || '🇪🇸'} {sp.display_name || sp.email}
                      {sp.empresaName ? ` • ${sp.empresaName} (${sp.commercial_country || 'ES'})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground font-medium">
                {tr(
                  'Roteiro de Vendas (Script)',
                  'Guión de Ventas (Script)',
                  'Script de Vente'
                )}
              </Label>
              <Select 
                value={scriptId || (scripts[0]?.id || '')} 
                onValueChange={setScriptId}
              >
                <SelectTrigger className="bg-background border-input text-foreground text-xs h-9">
                  <SelectValue
                    placeholder={tr(
                      'Selecione o script...',
                      'Seleccione el guión...',
                      'Sélectionnez le script...'
                    )}
                  />
                </SelectTrigger>
                <SelectContent className="bg-card text-card-foreground border-border text-xs">
                  {scripts.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground font-medium">
              {tr(
                'Observações / Meta da Campanha (Opcional)',
                'Observaciones / Objetivo de la Campaña (Opcional)',
                'Observations / Objectif de la Campagne (Optionnel)'
              )}
            </Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={tr(
                'Ex: Focar na identificação de paradas de manutenção previstas para o próximo trimestre...',
                'Ej: Enfocarse en identificar paradas de mantenimiento previstas para el próximo trimestre...',
                'Ex : Identifier les arrêts de maintenance prévus pour le prochain trimestre...'
              )}
              rows={2}
              className="bg-background border-input text-foreground text-xs resize-none"
            />
          </div>

          <DialogFooter className="p-0 pt-4 border-t border-border flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-input text-xs"
            >
              {tr('Cancelar', 'Cancelar', 'Annuler')}
            </Button>

            <Button
              type="submit"
              disabled={isCreatingCampaign}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-2 shadow-md shadow-blue-900/30"
            >
              {isCreatingCampaign ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />{' '}
                  {tr('Gerando Fila...', 'Generando Cola...', 'Création de la File...')}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />{' '}
                  {tr(
                    'Iniciar Fila no Cockpit',
                    'Iniciar Cola en el Cockpit',
                    'Démarrer la File dans le Cockpit'
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
