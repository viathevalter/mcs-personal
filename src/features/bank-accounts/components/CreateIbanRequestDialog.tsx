import { useEffect, useState } from 'react';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, Copy, Send, Check, Phone, Building2, 
    UserCheck, ShieldCheck, MessageSquare, ExternalLink, RefreshCw
} from 'lucide-react';
import { useCreateIbanRequest } from '../hooks/useIbanRequests';
import { toast } from 'sonner';

interface CreateIbanRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerId: string;
    workerName: string;
    workerCode?: string | null;
    workerPhone?: string | null;
    clienteNome?: string | null;
    contratante?: string | null;
    currentIban: string | null;
    currentBanco: string | null;
    empresaId: string;
}

export function CreateIbanRequestDialog({ 
    open, onOpenChange, workerId, workerName, 
    workerCode, workerPhone, clienteNome, contratante,
    currentIban, currentBanco, empresaId 
}: CreateIbanRequestDialogProps) {
    const { mutateAsync: createRequest, isPending: isCreating } = useCreateIbanRequest();
    const [token, setToken] = useState<string | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedName, setCopiedName] = useState(false);
    const [copiedMsg, setCopiedMsg] = useState(false);

    useEffect(() => {
        if (open && workerId) {
            setToken(null);
            setCopiedLink(false);
            setCopiedName(false);
            setCopiedMsg(false);
            
            // Auto generate request on open
            createRequest({
                empresaId,
                workerId,
                oldIban: currentIban,
                oldBanco: currentBanco
            })
            .then((data) => {
                setToken(data.token);
            })
            .catch((err) => {
                console.error(err);
                toast.error('Erro ao gerar token de solicitação de IBAN.');
                onOpenChange(false);
            });
        }
    }, [open, workerId]);

    const getLink = () => {
        if (!token) return '';
        return `${window.location.origin}/public/update-iban/${token}`;
    };

    const getFormattedMessage = () => {
        const link = getLink();
        return `Olá *${workerName}*, para podermos processar os pagamentos corretamente na sua conta, precisamos que envie o seu novo IBAN. Por favor, acesse este link seguro para anexar a foto e o comprovante do banco:\n\n${link}`;
    };

    const handleCopyLink = () => {
        const link = getLink();
        if (!link) return;
        navigator.clipboard.writeText(link);
        setCopiedLink(true);
        toast.success('Link copiado para a área de transferência!');
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleCopyName = () => {
        if (!workerName) return;
        navigator.clipboard.writeText(workerName);
        setCopiedName(true);
        toast.success(`Nome "${workerName}" copiado! Cole na busca do WhatsApp.`);
        setTimeout(() => setCopiedName(false), 2000);
    };

    const handleCopyMessage = () => {
        const message = getFormattedMessage();
        navigator.clipboard.writeText(message);
        setCopiedMsg(true);
        toast.success('Mensagem completa do WhatsApp copiada!');
        setTimeout(() => setCopiedMsg(false), 2000);
    };

    const handleSendWhatsApp = () => {
        const link = getLink();
        if (!link) return;
        
        const message = getFormattedMessage();
        const encodedText = encodeURIComponent(message);
        
        // Clean phone digits if present
        const cleanPhone = workerPhone ? workerPhone.replace(/\D/g, '') : '';
        
        let waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
        if (cleanPhone && cleanPhone.length >= 8) {
            waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
        }
        
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={isCreating ? undefined : onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden transition-all">
                <DialogHeader className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900">
                            <RefreshCw className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-slate-900 dark:text-slate-100 text-xl font-extrabold tracking-tight">
                                Solicitar Troca de IBAN
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                                Gere um link seguro de auditoria bancária para envio direto ao trabalhador.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-4 space-y-5">
                    {/* Worker Info Premium Card */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-3">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                                    Colaborador Selecionado
                                </span>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                        {workerName}
                                    </h3>
                                    {workerCode && (
                                        <span className="font-mono text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded px-2 py-0.5 shadow-xs">
                                            {workerCode}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Button to Copy Worker Name for WhatsApp search */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCopyName}
                                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-xs font-semibold h-8 shadow-xs self-start sm:self-auto"
                                title="Copiar nome do colaborador para procurar no WhatsApp"
                            >
                                {copiedName ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                                {copiedName ? 'Nome Copiado!' : 'Copiar Nome para WhatsApp'}
                            </Button>
                        </div>

                        {/* Metadata Row: Telefone, Empresa, Cliente */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            {/* Telefone */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
                                <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                <div className="truncate">
                                    <span className="text-[10px] text-slate-400 block font-medium">Telefone / Telemóvel</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono truncate">
                                        {workerPhone || 'Não cadastrado'}
                                    </span>
                                </div>
                            </div>

                            {/* Empresa */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
                                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                                <div className="truncate">
                                    <span className="text-[10px] text-slate-400 block font-medium">Empresa (Contratante)</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                                        {contratante || 'Grupo'}
                                    </span>
                                </div>
                            </div>

                            {/* Cliente */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
                                <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                <div className="truncate">
                                    <span className="text-[10px] text-slate-400 block font-medium">Cliente Ativo</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                                        {clienteNome || 'Todos'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Loading State or Link Section */}
                    {isCreating || !token ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Gerando link criptografado e seguro de auditoria bancária...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Link Box */}
                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">
                                        Link de Envio Seguro
                                    </span>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                        <ShieldCheck className="w-3.5 h-3.5" /> Token Único Validade 30 dias
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={getLink()} 
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 flex-1 select-all focus:outline-none shadow-xs"
                                    />
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-10 px-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs flex-shrink-0"
                                        onClick={handleCopyLink}
                                    >
                                        {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                                        <span className="ml-1.5 hidden sm:inline">{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                                    </Button>
                                </div>
                            </div>
                            
                            {/* Process Instructions Box */}
                            <div className="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl p-4 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                                <span className="font-bold text-indigo-950 dark:text-indigo-100 block mb-1.5 flex items-center gap-1.5">
                                    <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    Fluxo Automático de Atualização:
                                </span>
                                <ol className="list-decimal pl-4 space-y-1 text-indigo-800 dark:text-indigo-300 font-medium">
                                    <li>Envie o link seguro direto para o colaborador no WhatsApp.</li>
                                    <li>O colaborador tira a foto do comprovante do novo IBAN no próprio celular.</li>
                                    <li>Você faz a revisão na fila de solicitações e gera a autorização em 1 clique.</li>
                                </ol>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row items-center justify-between w-full gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-4 mt-1">
                    <Button 
                        variant="outline" 
                        onClick={() => onOpenChange(false)} 
                        disabled={isCreating}
                        className="w-full sm:w-auto border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 font-medium text-xs h-10 px-5"
                    >
                        Fechar
                    </Button>

                    {token && (
                        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 justify-end">
                            <Button 
                                type="button"
                                variant="outline"
                                className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold h-10 px-3.5 shadow-xs"
                                onClick={handleCopyMessage}
                                title="Copiar mensagem formatada para WhatsApp"
                            >
                                {copiedMsg ? <Check className="w-4 h-4 text-emerald-600 mr-1.5" /> : <Copy className="w-4 h-4 text-slate-500 mr-1.5" />}
                                {copiedMsg ? 'Mensagem Copiada!' : 'Copiar Texto'}
                            </Button>

                            <Button 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 shadow-sm flex-1 sm:flex-none"
                                onClick={handleSendWhatsApp}
                            >
                                <Send className="w-4 h-4 mr-2" />
                                {workerPhone ? 'Enviar no WhatsApp Direto' : 'Enviar via WhatsApp'}
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
