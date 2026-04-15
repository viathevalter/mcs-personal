import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Worker } from '@/shared/types/corePersonal';
import { Mail, Phone, Hash, FileText, Globe, Briefcase, Loader2 } from 'lucide-react';
import { useWorkerAlocacoes } from '../hooks/useWorkerAlocacoes';
import { Badge } from '@/components/ui/badge';

interface OverviewTabProps {
    worker: Worker;
}

export function OverviewTab({ worker }: OverviewTabProps) {
    const { data: alocacoes, isLoading } = useWorkerAlocacoes(worker.cod_colab);

    // Dedup functions from allocations to show a neat history
    const historicalFunctions = alocacoes?.reduce((acc, aloc) => {
        if (aloc.funcion && aloc.cliente_nombre) {
            acc.push({ functionName: aloc.funcion, client: aloc.cliente_nombre, date: aloc.fechainiciopedido });
        }
        return acc;
    }, [] as { functionName: string; client: string; date: string | null }[]) || [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            Contato e Perfil
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground mb-1">Telemóvel</p>
                                <p className="text-sm font-medium">{worker.movil || 'Não informado'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground mb-1">Email</p>
                                <p className="text-sm font-medium flex items-center gap-2">
                                    {worker.email ? (
                                        <>
                                            <Mail className="h-4 w-4" />
                                            {worker.email}
                                        </>
                                    ) : 'Não informado'}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div>
                                <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground mb-1">Nacionalidade</p>
                                <p className="text-sm font-medium">{worker.nacionalidade || 'Não informada'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground mb-1">Data de Nascimento</p>
                                <p className="text-sm font-medium">{worker.fecha_nacimiento || 'Não informada'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            Outros Documentos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                    <Globe className="h-3.5 w-3.5" /> Passaporte
                                </p>
                                <p className="text-sm font-medium">{worker.pasaporte || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                    <FileText className="h-3.5 w-3.5" /> Carta de Condução
                                </p>
                                <p className="text-sm font-medium">
                                    {worker.licencia_conducir === 'Si' ? 'Sim' : worker.licencia_conducir === 'No' ? 'Não' : worker.licencia_conducir || '-'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <span className="text-muted-foreground text-lg flex align-middle justify-center">👕</span>
                            Tamanhos de Uniforme
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground mb-1">T-Shirt (Camiseta)</p>
                                <p className="text-sm font-medium">{worker.camiseta || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground mb-1">Calça (Pantalones)</p>
                                <p className="text-sm font-medium">{worker.pantalones || 'N/A'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            Documentação
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h4 className="text-sm font-semibold mb-3 pb-2 border-b">Portugal</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                        <Hash className="h-3.5 w-3.5" /> NIF
                                    </p>
                                    <p className="text-sm font-medium">{worker.nif || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                        <Hash className="h-3.5 w-3.5" /> NISS
                                    </p>
                                    <p className="text-sm font-medium">{worker.niss || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold mb-3 pb-2 border-b">Espanha</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                        <FileText className="h-3.5 w-3.5" /> DNI
                                    </p>
                                    <p className="text-sm font-medium">{worker.dni || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                        <Hash className="h-3.5 w-3.5" /> NIE
                                    </p>
                                    <p className="text-sm font-medium">{worker.nie || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                        <Hash className="h-3.5 w-3.5" /> NUSS
                                    </p>
                                    <p className="text-sm font-medium">{worker.nuss || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-muted-foreground" />
                            Funções e Histórico (Galeria)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground mb-1">Função Atual</p>
                            <div className="flex gap-2">
                                {worker.funcion ? (
                                    <Badge variant="default" className="text-xs">{worker.funcion}</Badge>
                                ) : (
                                    <span className="text-sm font-medium text-muted-foreground">Não informada no perfil</span>
                                )}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground mb-3 border-b pb-2">Funções em Clientes (Alocações)</p>
                            {isLoading ? (
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando histórico...
                                </div>
                            ) : historicalFunctions.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                    {historicalFunctions.slice(0, 5).map((hist, idx) => (
                                        <div key={idx} className="flex flex-col border-l-2 border-primary/40 pl-3">
                                            <span className="text-sm font-semibold">{hist.functionName}</span>
                                            <span className="text-xs text-muted-foreground">{hist.client} {hist.date ? `(Início: ${hist.date.split('-').reverse().join('/')})` : ''}</span>
                                        </div>
                                    ))}
                                    {historicalFunctions.length > 5 && (
                                        <p className="text-xs text-muted-foreground italic mt-1">Veja a aba Alocações para mais detalhes.</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Nenhum histórico de função via alocação encontrado.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
