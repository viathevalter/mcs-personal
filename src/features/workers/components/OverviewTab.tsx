import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Worker } from '@/shared/types/corePersonal';
import { Mail, Phone, Hash, FileText, Globe } from 'lucide-react';

interface OverviewTabProps {
    worker: Worker;
}

export function OverviewTab({ worker }: OverviewTabProps) {
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
            </div>
        </div>
    );
}
