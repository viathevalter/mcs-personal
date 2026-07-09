import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Mail, Save, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface CobrancaConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newEmail: string) => void;
}

export const CobrancaConfigModal = ({ isOpen, onClose, onSave }: CobrancaConfigModalProps) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [recordId, setRecordId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadConfig();
        }
    }, [isOpen]);

    const loadConfig = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('cobranca_configuracoes')
                .select('*')
                .limit(1)
                .single();

            if (error) {
                // If it doesn't exist, we'll create a new one on save
                console.log('No configuration record found, will create one on save.');
            } else if (data) {
                setEmail(data.email_remetente || '');
                setRecordId(data.id);
            }
        } catch (err) {
            console.error('Error loading cobranca config:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!email.trim()) {
            toast.error(t('financeiro.config.err_empty_email', 'Por favor, insira um e-mail de remetente válido.'));
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error(t('financeiro.config.err_invalid_email', 'O e-mail inserido é inválido.'));
            return;
        }

        setIsSaving(true);
        try {
            if (recordId) {
                const { error } = await supabase
                    .from('cobranca_configuracoes')
                    .update({ 
                        email_remetente: email.trim(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', recordId);

                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('cobranca_configuracoes')
                    .insert([{ 
                        email_remetente: email.trim() 
                    }])
                    .select()
                    .single();

                if (error) throw error;
                if (data) setRecordId(data.id);
            }

            toast.success(t('financeiro.config.save_success', 'Configurações de cobrança salvas com sucesso!'));
            onSave(email.trim());
            onClose();
        } catch (err: any) {
            console.error('Error saving config:', err);
            toast.error(t('financeiro.config.err_save', 'Erro ao salvar configurações: ') + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400">
                        <Settings className="w-5 h-5" />
                        <DialogTitle className="text-lg font-bold">{t('financeiro.config.modal_title', 'Configurações Gerais de Cobrança')}</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs">
                        {t('financeiro.config.modal_desc', 'Defina os parâmetros padrão de comunicação e disparo da carteira de inadimplência.')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3 text-xs">
                    {/* Microsoft Global Email Config */}
                    <div className="space-y-1.5 p-3.5 border dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950/20">
                        <Label htmlFor="globalEmail" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-indigo-500" />
                            {t('financeiro.config.sender_label', 'E-mail Global de Remetente (Microsoft Tenant)')}
                        </Label>
                        <Input
                            id="globalEmail"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ex: cobrancas@empresa.com"
                            disabled={isLoading || isSaving}
                            className="h-9 text-xs bg-white dark:bg-slate-900 font-medium"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-start gap-1 leading-normal">
                            <HelpCircle className="w-3.5 h-3.5 shrink-0 text-slate-450 mt-0.5" />
                            <span>
                                {t('financeiro.config.email_tip', 'Este e-mail será utilizado como remetente padrão para todos os e-mails de negociação e lembretes gerados pelo sistema, conectado ao aplicativo de integração Outlook.')}
                            </span>
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t dark:border-slate-800 pt-3">
                    <Button 
                        variant="outline" 
                        onClick={onClose}
                        disabled={isLoading || isSaving}
                        className="text-xs h-9"
                    >
                        {t('financeiro.config.btn_cancel', 'Cancelar')}
                    </Button>
                    <Button 
                        onClick={handleSave}
                        disabled={isLoading || isSaving}
                        className="text-xs h-9 bg-primary text-white hover:bg-primary/95 gap-1.5 font-bold"
                    >
                        <Save className="w-3.5 h-3.5" />
                        {isSaving ? t('financeiro.config.btn_saving', 'Salvando...') : t('financeiro.config.btn_save', 'Salvar Configurações')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
