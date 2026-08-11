import { useEffect, useState } from 'react';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Send, Check } from 'lucide-react';
import { useCreateIbanRequest } from '../hooks/useIbanRequests';
import { toast } from 'sonner';

interface CreateIbanRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerId: string;
    workerName: string;
    currentIban: string | null;
    currentBanco: string | null;
    empresaId: string;
}

export function CreateIbanRequestDialog({ 
    open, onOpenChange, workerId, workerName, 
    currentIban, currentBanco, empresaId 
}: CreateIbanRequestDialogProps) {
    const { mutateAsync: createRequest, isPending: isCreating } = useCreateIbanRequest();
    const [token, setToken] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (open && workerId) {
            setToken(null);
            setCopied(false);
            
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

    const handleCopy = () => {
        const link = getLink();
        if (!link) return;
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success('Link copiado para a área de transferência!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendWhatsApp = () => {
        const link = getLink();
        if (!link) return;
        
        const message = `Olá *${workerName}*, para podermos processar os pagamentos corretamente na sua conta, precisamos que envie o seu novo IBAN. Por favor, aceda a este link seguro para anexar a foto e o comprovante do banco:\n\n${link}`;
        const encodedText = encodeURIComponent(message);
        
        window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank', 'noopener,noreferrer');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={isCreating ? undefined : onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="text-slate-900 text-lg font-bold">
                        Solicitar Troca de IBAN
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 text-sm">
                        Gere um link seguro e envie para o colaborador atualizar os seus dados bancários.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 flex flex-col items-center justify-center min-h-[140px]">
                    {isCreating || !token ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                            <p className="text-xs text-slate-500 font-medium">Gerando link de segurança único...</p>
                        </div>
                    ) : (
                        <div className="w-full space-y-4">
                            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Link de Envio Seguro</span>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={getLink()} 
                                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 flex-1 select-all focus:outline-none"
                                    />
                                    <Button 
                                        size="icon" 
                                        variant="outline" 
                                        className="h-9 w-9 bg-white border-slate-200 hover:bg-slate-50 flex-shrink-0"
                                        onClick={handleCopy}
                                    >
                                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900 leading-relaxed">
                                <span className="font-semibold block mb-1">Como funciona o processo?</span>
                                <ol className="list-decimal pl-4 space-y-1 text-indigo-700">
                                    <li>Envie o link acima para o trabalhador (WhatsApp/E-mail).</li>
                                    <li>Ele tirará foto do IBAN e enviará o comprovante de titularidade.</li>
                                    <li>Você revisa as informações e gera o Termo de Autorização.</li>
                                    <li>Após a assinatura do termo, você ativa a nova conta.</li>
                                </ol>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex sm:justify-between items-center w-full gap-2 border-t pt-4 mt-2">
                    <Button 
                        variant="outline" 
                        onClick={() => onOpenChange(false)} 
                        disabled={isCreating}
                        className="w-full sm:w-auto border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                    >
                        Fechar
                    </Button>
                    {token && (
                        <Button 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto flex-1 shadow-sm"
                            onClick={handleSendWhatsApp}
                        >
                            <Send className="w-4 h-4 mr-2" />
                            Enviar via WhatsApp
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
