import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { User, CreditCard, Building2, Briefcase, Calendar, ShieldCheck, Phone, Mail } from 'lucide-react';

export function WorkerProfilePage() {
    const { workerAuth } = useOutletContext<{ workerAuth: any }>();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Meu Perfil</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Consulte os seus dados cadastrais, profissionais e bancários registrados no sistema.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Personal & Identification */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 border-b bg-slate-50/50">
                        <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            Dados Pessoais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3 text-sm">
                        <div>
                            <span className="text-xs text-slate-500 font-medium block">Nome Completo</span>
                            <span className="font-semibold text-slate-800">{workerAuth.nome}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-xs text-slate-500 font-medium block">Passaporte / NIE</span>
                                <span className="font-mono text-slate-700">{workerAuth.pasaporte || workerAuth.nie || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 font-medium block">NIF Contribuinte</span>
                                <span className="font-mono text-slate-700">{workerAuth.nif || 'N/A'}</span>
                            </div>
                        </div>
                        {workerAuth.niss && (
                            <div>
                                <span className="text-xs text-slate-500 font-medium block">Seguridade Social (NISS)</span>
                                <span className="font-mono text-slate-700">{workerAuth.niss}</span>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-xs text-slate-500 font-medium block">Telemóvel / WhatsApp</span>
                                <span className="text-slate-700 flex items-center gap-1">
                                    <Phone className="h-3 w-3 text-slate-400" />
                                    {workerAuth.telefono || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 font-medium block">E-mail</span>
                                <span className="text-slate-700 flex items-center gap-1 truncate">
                                    <Mail className="h-3 w-3 text-slate-400" />
                                    {workerAuth.email || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Professional Data */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 border-b bg-slate-50/50">
                        <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-blue-600" />
                            Dados Profissionais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3 text-sm">
                        <div>
                            <span className="text-xs text-slate-500 font-medium block">Função / Categoria</span>
                            <span className="font-semibold text-slate-800">{workerAuth.funcion || 'Operário Especialista'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 font-medium block">Empresa Contratante</span>
                            <span className="text-slate-700 flex items-center gap-1.5 font-medium">
                                <Building2 className="h-4 w-4 text-slate-400" />
                                {workerAuth.empresa_nome || 'MCS'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-xs text-slate-500 font-medium block">Situação Contratual</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 mt-1">
                                    <ShieldCheck className="h-3 w-3" /> {workerAuth.status_trabajador || 'Ativo'}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 font-medium block">Data de Admissão</span>
                                <span className="text-slate-700 flex items-center gap-1 mt-1">
                                    <Calendar className="h-3 w-3 text-slate-400" />
                                    {workerAuth.data_ingresso ? new Date(workerAuth.data_ingresso).toLocaleDateString('pt-PT') : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bank / Payment Account */}
                <Card className="border-slate-200 shadow-sm md:col-span-2">
                    <CardHeader className="pb-3 border-b bg-slate-50/50">
                        <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            Conta Bancária Cadastrada para Pagamentos
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Conta bancária onde são depositados os valores dos seus vencimentos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-2 text-sm">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <span className="text-xs text-slate-500 font-medium block">IBAN Oficial</span>
                            <span className="font-mono text-base font-bold text-slate-900 tracking-wider">
                                {workerAuth.iban || 'NÃO CADASTRADO'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">
                            Caso necessite alterar o seu IBAN, contate o departamento de recursos humanos munido do comprovante de titularidade bancária.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
