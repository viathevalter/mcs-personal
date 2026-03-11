import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkerBeneficios } from '../hooks/useWorkerBeneficios';
import { useUpdateWorkerBeneficios, type AuditPayload } from '../hooks/useUpdateWorkerBeneficios';

export interface BankTabProps {
    workerId: string;
}
export interface BankTabRef {
    save: () => Promise<void>;
}

export const BankTab = forwardRef<BankTabRef, BankTabProps>(({ workerId }, ref) => {
    const { data: beneficios, isLoading, isError } = useWorkerBeneficios(workerId);
    const { mutateAsync: updateBeneficios } = useUpdateWorkerBeneficios();

    const [iban, setIban] = useState('');
    const [banco, setBanco] = useState('');
    const [tarifaHora, setTarifaHora] = useState('');
    const [documentFile, setDocumentFile] = useState<File | null>(null);

    useEffect(() => {
        if (beneficios) {
            setIban(beneficios.iban || '');
            setBanco(beneficios.banco || '');
            setTarifaHora(beneficios.tarifa_hora ? beneficios.tarifa_hora.toString() : '');
        }
    }, [beneficios]);

    useImperativeHandle(ref, () => ({
        save: async () => {
            await handleSave();
        }
    }));

    const handleSave = async () => {
        try {
            const audits: AuditPayload[] = [];
            const oldIban = beneficios?.iban || "";
            const oldTarifa = beneficios?.tarifa_hora || 0;
            const newTarifaNum = Number(tarifaHora) || 0;

            if (iban !== oldIban) {
                if (!documentFile && iban !== "") {
                    toast.error("Documento de autorização é obrigatório ao alterar o IBAN.");
                    return;
                }
                audits.push({
                    change_type: 'iban_update',
                    old_value: oldIban,
                    new_value: iban,
                    documentFile: documentFile
                });
            }

            if (newTarifaNum !== oldTarifa) {
                audits.push({
                    change_type: 'tarifa_update',
                    old_value: oldTarifa.toString(),
                    new_value: newTarifaNum.toString()
                });
            }

            await updateBeneficios({
                settings: {
                    worker_id: workerId,
                    iban: iban || null,
                    banco: banco || null,
                    tarifa_hora: newTarifaNum,
                    recebe_auxilio_moradia: beneficios?.recebe_auxilio_moradia || false,
                    auxilio_moradia_base: beneficios?.auxilio_moradia_base || 0
                },
                audits
            });

            setDocumentFile(null); // Reset file after save
        } catch (error) {
            console.error('Failed to save bank settings', error);
            throw error;
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex justify-center items-center py-8">
                <div className="text-destructive bg-destructive/10 p-4 rounded-md">
                    Erro ao carregar dados bancários.
                </div>
            </div>
        );
    }

    return (
        <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    Contas Bancárias (IBAN)
                </CardTitle>
                <CardDescription>
                    Configure os dados bancários e a tarifa base (holerite) do trabalhador.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-4">Dados Bancários</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 space-y-2">
                            <Label>Identificador de Referência</Label>
                            <Input
                                id="w-pay-code"
                                name="w_pay_code"
                                autoComplete="new-password"
                                placeholder="ES440182438819020186"
                                value={iban}
                                onChange={(e) => setIban(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label>Banco</Label>
                            <Input
                                id="w-inst-name"
                                name="w_inst_name"
                                autoComplete="new-password"
                                placeholder="Ex: Santander / BBVA"
                                value={banco}
                                onChange={(e) => setBanco(e.target.value)}
                            />
                        </div>
                        {iban !== (beneficios?.iban || "") && iban !== "" && (
                            <div className="md:col-span-2 space-y-2 p-4 bg-muted/50 rounded-lg border-l-4 border-warning">
                                <div className="flex items-center text-warning-foreground text-sm font-semibold mb-1">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Autorização de Mudança de Conta
                                </div>
                                <p className="text-xs text-muted-foreground">A Chave da Conta foi alterada. Faça o upload do documento assinado pelo trabalhador autorizando a mudança (PDF ou Imagem).</p>
                                <Input
                                    type="file"
                                    accept=".pdf,image/*"
                                    onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                                    className="cursor-pointer"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground mb-4">Parâmetros de Holerite</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tarifa Base (€ / Hora)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="Ex: 10.50"
                                value={tarifaHora}
                                onChange={(e) => setTarifaHora(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

BankTab.displayName = 'BankTab';
