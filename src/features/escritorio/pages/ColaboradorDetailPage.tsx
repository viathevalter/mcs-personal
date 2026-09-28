import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Users, 
    ArrowLeft, 
    Clock, 
    Palmtree, 
    Stethoscope, 
    ShieldCheck, 
    Building2, 
    Mail, 
    Phone, 
    DollarSign, 
    Briefcase, 
    Calendar, 
    FileText, 
    Save, 
    Plus, 
    AlertCircle, 
    CheckCircle2,
    ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { 
    obterColaboradorEscritorio, 
    salvarDadosLaborais, 
    adicionarHistoricoSalarial,
    solicitarFerias,
    registrarAusencia,
    listarPontoMes
} from '../api/escritorioApi';
import type { 
    ColaboradorEscritorio, 
    RhDadosLaborais, 
    RhHistoricoSalarial, 
    RhFeriasSolicitacao, 
    RhAusencia, 
    RhPontoRegistro 
} from '../types/escritorio';
import { CLASSIFICACOES_COLABORADOR, TIPOS_AUSENCIA } from '../types/escritorio';

export const ColaboradorDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [colaborador, setColaborador] = useState<(ColaboradorEscritorio & {
        historicoSalarial: RhHistoricoSalarial[];
        solicitacoesFerias: RhFeriasSolicitacao[];
        ausencias: RhAusencia[];
        ativosPatrimonio: any[];
    }) | null>(null);

    // Form state dados laborais
    const [formData, setFormData] = useState<Partial<RhDadosLaborais>>({});
    const [timeclockCode, setTimeclockCode] = useState('');
    const [pontos, setPontos] = useState<RhPontoRegistro[]>([]);
    const [mesSelecionado, setMesSelecionado] = useState(new Date().toISOString().slice(0, 7));

    // Modal / Mini Forms state
    const [novoSalario, setNovoSalario] = useState({ salario_base: '', motivo: 'Ajuste inicial' });
    const [novaAusencia, setNovaAusencia] = useState({ tipo: 'baixa_medica', data_inicio: '', data_fim: '', observacoes: '' });
    const [novaFerias, setNovaFerias] = useState({ data_inicio: '', data_fim: '', observacoes: '' });

    const carregarDados = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await obterColaboradorEscritorio(id);
            setColaborador(data);
            setFormData(data.laboral || {});
            setTimeclockCode(data.timeclock_code || '');

            const pontosMes = await listarPontoMes(mesSelecionado, id);
            setPontos(pontosMes);
        } catch (error) {
            console.error('Erro ao carregar detalhes do colaborador:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [id, mesSelecionado]);

    const handleSalvarLaboral = async () => {
        if (!id) return;
        try {
            setSaving(true);
            await salvarDadosLaborais(id, {
                ...formData,
                timeclock_code: timeclockCode || null,
            });
            await carregarDados();
            alert('Dados laborais atualizados com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar dados laborais:', error);
            alert('Falha ao salvar dados laborais.');
        } finally {
            setSaving(false);
        }
    };

    const handleAdicionarSalario = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !novoSalario.salario_base) return;
        try {
            await adicionarHistoricoSalarial({
                member_id: id,
                salario_base: parseFloat(novoSalario.salario_base),
                moeda: 'EUR',
                complementos: 0,
                ajuda_custo: 0,
                transporte: 0,
                alimentacao: 0,
                premio_fixo: 0,
                comissao_fixa: 0,
                outros_valores: 0,
                data_vigencia: new Date().toISOString().slice(0, 10),
                motivo: novoSalario.motivo || 'Atualização salarial',
            });
            setNovoSalario({ salario_base: '', motivo: 'Reajuste' });
            await carregarDados();
            alert('Novo salário registrado!');
        } catch (error) {
            console.error('Erro ao salvar salário:', error);
            alert('Erro ao registrar histórico salarial.');
        }
    };

    const handleSolicitarFerias = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !novaFerias.data_inicio || !novaFerias.data_fim) return;
        try {
            const dtInicio = new Date(novaFerias.data_inicio);
            const dtFim = new Date(novaFerias.data_fim);
            const diffTime = Math.abs(dtFim.getTime() - dtInicio.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            await solicitarFerias({
                member_id: id,
                ano_exercicio: dtInicio.getFullYear(),
                data_inicio: novaFerias.data_inicio,
                data_fim: novaFerias.data_fim,
                dias_solicitados: diffDays,
                tipo_dias: 'naturais',
                status: 'solicitado',
                observacoes: novaFerias.observacoes || null,
            });

            setNovaFerias({ data_inicio: '', data_fim: '', observacoes: '' });
            await carregarDados();
            alert(`Solicitação de férias de ${diffDays} dias enviada!`);
        } catch (error) {
            console.error('Erro ao solicitar férias:', error);
            alert('Erro ao registrar solicitação de férias.');
        }
    };

    const handleRegistrarAusencia = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !novaAusencia.data_inicio || !novaAusencia.data_fim) return;
        try {
            const dtInicio = new Date(novaAusencia.data_inicio);
            const dtFim = new Date(novaAusencia.data_fim);
            const diffTime = Math.abs(dtFim.getTime() - dtInicio.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            await registrarAusencia({
                member_id: id,
                tipo: novaAusencia.tipo as any,
                data_inicio: novaAusencia.data_inicio,
                data_fim: novaAusencia.data_fim,
                dias_total: diffDays,
                remunerada: novaAusencia.tipo !== 'falta_injustificada',
                status: 'registrado',
                observacoes: novaAusencia.observacoes || null,
            });

            setNovaAusencia({ tipo: 'baixa_medica', data_inicio: '', data_fim: '', observacoes: '' });
            await carregarDados();
            alert('Ausência/Baixa médica registrada com sucesso!');
        } catch (error) {
            console.error('Erro ao registrar ausência:', error);
            alert('Erro ao registrar ausência.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-sm font-semibold text-slate-500">
                    Carregando ficha do colaborador...
                </div>
            </div>
        );
    }

    if (!colaborador) {
        return (
            <div className="p-8 text-center space-y-4">
                <p className="text-slate-600">Colaborador não encontrado.</p>
                <Button onClick={() => navigate('/escritorio/colaboradores')}>
                    Voltar para a lista
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-16">
            {/* Botão Voltar */}
            <div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/escritorio/colaboradores')}
                    className="gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para Lista de Colaboradores
                </Button>
            </div>

            {/* Cabeçalho Perfil 360° */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                            {colaborador.nombrecompleto?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                                    {colaborador.nombrecompleto}
                                </h1>
                                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 text-xs">
                                    {colaborador.active ? 'Ativo' : 'Inativo'}
                                </Badge>
                                {colaborador.timeclock_code ? (
                                    <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 font-mono text-xs gap-1">
                                        <Clock className="h-3 w-3" />
                                        Relógio ID: {colaborador.timeclock_code}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                                        Sem Código no Relógio
                                    </Badge>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                                <span className="flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                    {colaborador.department_name} • {colaborador.empresa_nome}
                                </span>
                                {colaborador.correoempresarial && (
                                    <span className="flex items-center gap-1">
                                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                                        {colaborador.correoempresarial}
                                    </span>
                                )}
                                {colaborador.telefonodirecto && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                                        {colaborador.telefonodirecto}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Resumo Rápido lateral */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right border-l pl-4 border-slate-200 dark:border-slate-800 hidden sm:block">
                            <p className="text-[11px] text-slate-400 font-medium">Saldo Férias Anual</p>
                            <p className="text-lg font-bold text-emerald-600">
                                {colaborador.ferias_saldo?.dias_saldo ?? 30} dias
                            </p>
                        </div>
                        <div className="text-right border-l pl-4 border-slate-200 dark:border-slate-800 hidden sm:block">
                            <p className="text-[11px] text-slate-400 font-medium">Patrimônio Alocado</p>
                            <p className="text-lg font-bold text-sky-600">
                                {colaborador.ativosPatrimonio.length} itens
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Abas da Central do Colaborador */}
            <Tabs defaultValue="laboral" className="w-full">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl w-full justify-start overflow-x-auto h-auto">
                    <TabsTrigger value="laboral" className="text-xs font-semibold gap-1.5 py-2">
                        <Briefcase className="h-3.5 w-3.5" />
                        Ficha Laboral & Contrato
                    </TabsTrigger>
                    <TabsTrigger value="ponto" className="text-xs font-semibold gap-1.5 py-2">
                        <Clock className="h-3.5 w-3.5" />
                        Espelho de Ponto
                    </TabsTrigger>
                    <TabsTrigger value="ferias" className="text-xs font-semibold gap-1.5 py-2">
                        <Palmtree className="h-3.5 w-3.5" />
                        Férias (Espanha)
                    </TabsTrigger>
                    <TabsTrigger value="ausencias" className="text-xs font-semibold gap-1.5 py-2">
                        <Stethoscope className="h-3.5 w-3.5" />
                        Ausências & Licenças
                    </TabsTrigger>
                    <TabsTrigger value="remuneracao" className="text-xs font-semibold gap-1.5 py-2">
                        <DollarSign className="h-3.5 w-3.5" />
                        Remuneração & Salário
                    </TabsTrigger>
                    <TabsTrigger value="patrimonio" className="text-xs font-semibold gap-1.5 py-2">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Patrimônio ({colaborador.ativosPatrimonio.length})
                    </TabsTrigger>
                </TabsList>

                {/* ABA 1: FICHA LABORAL */}
                <TabsContent value="laboral" className="mt-4">
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                                    Dados Contratuais e Laborais
                                </CardTitle>
                                <p className="text-xs text-slate-500">
                                    Informações de enquadramento, jornada e código de integração com relógio ponto.
                                </p>
                            </div>
                            <Button 
                                onClick={handleSalvarLaboral}
                                disabled={saving}
                                className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold gap-2 shadow-sm"
                                size="sm"
                            >
                                <Save className="h-3.5 w-3.5" />
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-xs font-semibold">Código do Relógio Ponto (timeclock_code)</Label>
                                    <Input 
                                        placeholder="Ex: 1, 2, 3..." 
                                        value={timeclockCode}
                                        onChange={(e) => setTimeclockCode(e.target.value)}
                                        className="text-xs mt-1 font-mono font-bold"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Número de identificação utilizado na planilha/dispositivo biométrico.
                                    </p>
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Cargo / Função</Label>
                                    <Input 
                                        placeholder="Ex: Assistente Administrativo" 
                                        value={formData.cargo || ''}
                                        onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Classificação</Label>
                                    <Select 
                                        value={formData.classificacao || 'Administrativo / Escritório'} 
                                        onValueChange={(val) => setFormData({ ...formData, classificacao: val })}
                                    >
                                        <SelectTrigger className="text-xs mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CLASSIFICACOES_COLABORADOR.map(c => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Tipo de Contrato</Label>
                                    <Select 
                                        value={formData.tipo_contrato || 'Indefinido (CLT/Espanhol)'} 
                                        onValueChange={(val) => setFormData({ ...formData, tipo_contrato: val })}
                                    >
                                        <SelectTrigger className="text-xs mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Indefinido (CLT/Espanhol)">Indefinido (Indefinido)</SelectItem>
                                            <SelectItem value="Temporal / Determinado">Temporal / Determinado</SelectItem>
                                            <SelectItem value="Prácticas / Estágio">Prácticas / Estágio</SelectItem>
                                            <SelectItem value="Formação">Formação</SelectItem>
                                            <SelectItem value="Fixo Descontínuo">Fixo Descontínuo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Data de Admissão</Label>
                                    <Input 
                                        type="date"
                                        value={formData.data_admissao || ''}
                                        onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Carga Horária Semanal (Horas)</Label>
                                    <Input 
                                        type="number"
                                        value={formData.jornada_semanal_horas || 40}
                                        onChange={(e) => setFormData({ ...formData, jornada_semanal_horas: parseInt(e.target.value, 10) })}
                                        className="text-xs mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Horário de Trabalho Padrão</Label>
                                    <Input 
                                        placeholder="Ex: 08:00 - 13:00 / 14:00 - 17:00" 
                                        value={formData.horario_trabalho || '08:00 - 17:00'}
                                        onChange={(e) => setFormData({ ...formData, horario_trabalho: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Local de Trabalho</Label>
                                    <Input 
                                        placeholder="Ex: Escritório Central Madrid / Oficina" 
                                        value={formData.local_trabalho || colaborador.ubicaciontrabajo || ''}
                                        onChange={(e) => setFormData({ ...formData, local_trabalho: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Convenção Coletiva (Espanha)</Label>
                                    <Input 
                                        placeholder="Ex: Metalurgia / Oficinas y Despachos" 
                                        value={formData.convencao_coletiva || 'Convenio Colectivo General'}
                                        onChange={(e) => setFormData({ ...formData, convencao_coletiva: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA 2: ESPELHO DE PONTO */}
                <TabsContent value="ponto" className="mt-4 space-y-4">
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                                    Espelho de Ponto Individual
                                </CardTitle>
                                <p className="text-xs text-slate-500">
                                    Batidas e horas computadas para a competência selecionada.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="month"
                                    value={mesSelecionado}
                                    onChange={(e) => setMesSelecionado(e.target.value)}
                                    className="w-40 text-xs"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                        <TableHead className="font-bold text-xs">Data</TableHead>
                                        <TableHead className="font-bold text-xs">Batidas Registradas</TableHead>
                                        <TableHead className="font-bold text-xs">Entrada 1</TableHead>
                                        <TableHead className="font-bold text-xs">Saída 1</TableHead>
                                        <TableHead className="font-bold text-xs">Entrada 2</TableHead>
                                        <TableHead className="font-bold text-xs">Saída 2</TableHead>
                                        <TableHead className="font-bold text-xs">Horas Trabalhadas</TableHead>
                                        <TableHead className="font-bold text-xs">Saldo / Extras</TableHead>
                                        <TableHead className="font-bold text-xs">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pontos.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-28 text-center text-xs text-slate-500">
                                                Nenhum registro de ponto encontrado para {mesSelecionado}. Importe a planilha de ponto na tela de Ponto & Relógio.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pontos.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-semibold text-xs">{p.data}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1 flex-wrap font-mono text-[11px]">
                                                        {p.batidas?.map((b, i) => (
                                                            <span key={i} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                                {b}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{p.entrada_1 || '-'}</TableCell>
                                                <TableCell className="font-mono text-xs">{p.saida_1 || '-'}</TableCell>
                                                <TableCell className="font-mono text-xs">{p.entrada_2 || '-'}</TableCell>
                                                <TableCell className="font-mono text-xs">{p.saida_2 || '-'}</TableCell>
                                                <TableCell className="font-bold text-xs">{p.horas_trabalhadas}h</TableCell>
                                                <TableCell className="text-xs font-semibold text-sky-600">
                                                    {p.minutos_extras > 0 ? `+${p.minutos_extras}m` : `${p.minutos_saldo}m`}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                                        {p.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA 3: FÉRIAS */}
                <TabsContent value="ferias" className="mt-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-slate-500">Direito Anual (Espanha)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {colaborador.ferias_saldo?.dias_direito ?? 30} dias
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">Estatuto de los Trabajadores (30 naturais)</p>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-slate-500">Dias Gozados</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-sky-600">
                                    {colaborador.ferias_saldo?.dias_gozados ?? 0} dias
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">Usufruídos no ano atual</p>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-slate-500">Saldo Disponível</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {colaborador.ferias_saldo?.dias_saldo ?? 30} dias
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">Prontos para solicitar ou agendar</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Formulário Nova Solicitação de Férias */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Solicitar / Lançar Novo Período de Férias
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSolicitarFerias} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <div>
                                    <Label className="text-xs font-semibold">Data Início</Label>
                                    <Input 
                                        type="date"
                                        required
                                        value={novaFerias.data_inicio}
                                        onChange={(e) => setNovaFerias({ ...novaFerias, data_inicio: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Data Fim</Label>
                                    <Input 
                                        type="date"
                                        required
                                        value={novaFerias.data_fim}
                                        onChange={(e) => setNovaFerias({ ...novaFerias, data_fim: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                                        Lançar Solicitação
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Tabela de Solicitações */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Histórico de Férias
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                        <TableHead className="font-bold text-xs">Período</TableHead>
                                        <TableHead className="font-bold text-xs">Dias</TableHead>
                                        <TableHead className="font-bold text-xs">Tipo</TableHead>
                                        <TableHead className="font-bold text-xs">Status</TableHead>
                                        <TableHead className="font-bold text-xs">Observações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {colaborador.solicitacoesFerias.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-20 text-center text-xs text-slate-500">
                                                Nenhum período de férias solicitado até o momento.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        colaborador.solicitacoesFerias.map(sol => (
                                            <TableRow key={sol.id}>
                                                <TableCell className="text-xs font-semibold">
                                                    {sol.data_inicio} até {sol.data_fim}
                                                </TableCell>
                                                <TableCell className="text-xs font-bold">{sol.dias_solicitados} dias</TableCell>
                                                <TableCell className="text-xs capitalize">{sol.tipo_dias}</TableCell>
                                                <TableCell>
                                                    <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                                        {sol.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">{sol.observacoes || '-'}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA 4: AUSÊNCIAS & LICENÇAS */}
                <TabsContent value="ausencias" className="mt-4 space-y-6">
                    {/* Formulário Nova Ausência */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Registrar Ausência / Baixa Médica (Estatuto Espanhol)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleRegistrarAusencia} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                                <div>
                                    <Label className="text-xs font-semibold">Tipo de Ausência</Label>
                                    <Select 
                                        value={novaAusencia.tipo} 
                                        onValueChange={(val) => setNovaAusencia({ ...novaAusencia, tipo: val })}
                                    >
                                        <SelectTrigger className="text-xs mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TIPOS_AUSENCIA.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Data Início</Label>
                                    <Input 
                                        type="date"
                                        required
                                        value={novaAusencia.data_inicio}
                                        onChange={(e) => setNovaAusencia({ ...novaAusencia, data_inicio: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Data Fim</Label>
                                    <Input 
                                        type="date"
                                        required
                                        value={novaAusencia.data_fim}
                                        onChange={(e) => setNovaAusencia({ ...novaAusencia, data_fim: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold">
                                        Registrar Ausência
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Tabela de Ausências */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Histórico de Ausências e Baixas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                        <TableHead className="font-bold text-xs">Tipo</TableHead>
                                        <TableHead className="font-bold text-xs">Período</TableHead>
                                        <TableHead className="font-bold text-xs">Dias</TableHead>
                                        <TableHead className="font-bold text-xs">Remunerada</TableHead>
                                        <TableHead className="font-bold text-xs">Observações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {colaborador.ausencias.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-20 text-center text-xs text-slate-500">
                                                Nenhuma ausência registrada para este colaborador.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        colaborador.ausencias.map(aus => (
                                            <TableRow key={aus.id}>
                                                <TableCell className="text-xs font-semibold">
                                                    {TIPOS_AUSENCIA.find(t => t.id === aus.tipo)?.label || aus.tipo}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {aus.data_inicio} até {aus.data_fim}
                                                </TableCell>
                                                <TableCell className="text-xs font-bold">{aus.dias_total} dias</TableCell>
                                                <TableCell>
                                                    {aus.remunerada ? (
                                                        <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Sim</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300">Não</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">{aus.observacoes || '-'}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA 5: REMUNERAÇÃO & SALÁRIO */}
                <TabsContent value="remuneracao" className="mt-4 space-y-6">
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Atualizar Salário Base
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAdicionarSalario} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <div>
                                    <Label className="text-xs font-semibold">Salário Base Mensal (€)</Label>
                                    <Input 
                                        type="number"
                                        step="0.01"
                                        placeholder="Ex: 2150.00"
                                        required
                                        value={novoSalario.salario_base}
                                        onChange={(e) => setNovoSalario({ ...novoSalario, salario_base: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Motivo da Alteração</Label>
                                    <Input 
                                        placeholder="Ex: Reajuste anual, promoção..."
                                        value={novoSalario.motivo}
                                        onChange={(e) => setNovoSalario({ ...novoSalario, motivo: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold">
                                        Registrar Novo Salário
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Histórico Salarial
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                        <TableHead className="font-bold text-xs">Vigência</TableHead>
                                        <TableHead className="font-bold text-xs">Salário Base</TableHead>
                                        <TableHead className="font-bold text-xs">Motivo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {colaborador.historicoSalarial.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-20 text-center text-xs text-slate-500">
                                                Nenhum histórico salarial registrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        colaborador.historicoSalarial.map(sal => (
                                            <TableRow key={sal.id}>
                                                <TableCell className="text-xs font-semibold">{sal.data_vigencia}</TableCell>
                                                <TableCell className="text-xs font-bold text-slate-900 dark:text-white">
                                                    € {sal.salario_base.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">{sal.motivo}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA 6: ATIVOS & PATRIMÔNIO */}
                <TabsContent value="patrimonio" className="mt-4">
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                                    Equipamentos e Ativos Sob Responsabilidade
                                </CardTitle>
                                <p className="text-xs text-slate-500">
                                    Notebooks, celulares, monitores e ferramentas vinculados a este colaborador.
                                </p>
                            </div>
                            <Button 
                                onClick={() => navigate('/escritorio/patrimonio')}
                                variant="outline"
                                size="sm"
                                className="text-xs font-semibold gap-1.5"
                            >
                                Gerenciar no Módulo Patrimônio
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                        <TableHead className="font-bold text-xs">Código</TableHead>
                                        <TableHead className="font-bold text-xs">Descrição / Modelo</TableHead>
                                        <TableHead className="font-bold text-xs">Categoria</TableHead>
                                        <TableHead className="font-bold text-xs">Nº Série</TableHead>
                                        <TableHead className="font-bold text-xs">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {colaborador.ativosPatrimonio.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-28 text-center text-xs text-slate-500">
                                                Nenhum ativo de patrimônio alocado atualmente para este colaborador.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        colaborador.ativosPatrimonio.map((ativo: any) => (
                                            <TableRow 
                                                key={ativo.id}
                                                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                onClick={() => navigate(`/escritorio/patrimonio/${ativo.codigo_patrimonial}`)}
                                            >
                                                <TableCell className="font-mono font-bold text-xs text-sky-600">
                                                    {ativo.codigo_patrimonial}
                                                </TableCell>
                                                <TableCell className="text-xs font-semibold text-slate-900 dark:text-white">
                                                    {ativo.nome} {ativo.modelo ? `- ${ativo.modelo}` : ''}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500 capitalize">
                                                    {ativo.categoria}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-slate-400">
                                                    {ativo.numero_serie || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">
                                                        {ativo.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
