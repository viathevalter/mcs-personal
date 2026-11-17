import React, { useState } from 'react';
import {
    PERMISSIONS_CATALOG,
    ALL_HUB_MODULES,
    getModuleAccessLevel,
    setModuleAccessLevel,
    getFeatureAccessLevel,
    setFeatureAccessLevel,
    type ModuleAccessLevel,
    type FeatureAccessLevel,
} from './permissionsCatalog';
import { ShieldAlert, Lock, Eye, Edit3, ChevronDown, ChevronRight, Sparkles, RotateCcw } from 'lucide-react';

interface UserPermissionsMatrixProps {
    tokens: string[];
    onChange: (newTokens: string[]) => void;
}

const QUICK_CRITICAL_KEYS = [
    {
        key: 'comercial.aprovacoes',
        module: 'Comercial',
        label: 'Mesa de Aprovações Comerciais',
        desc: 'Ver menu e aprovar/rejeitar orçamentos na Mesa de Aprovações',
        isActionOnly: false,
    },
    {
        key: 'comercial.discador_supervisao',
        module: 'Comercial',
        label: 'Supervisão & KPIs / Operadores (Power Dialer)',
        desc: 'Relatório gerencial de tempo falado, produtividade por comercial e scripts',
        isActionOnly: false,
    },
    {
        key: 'comercial.analises',
        module: 'Comercial',
        label: 'Análises & Simulações Comerciais',
        desc: 'Raio-X de rentabilidade por cliente, margens e simulador de tarifas',
        isActionOnly: false,
    },
    {
        key: 'rh.tariffs',
        module: 'RH',
        label: 'Gestão de Tarifas (RH)',
        desc: 'Ver menu de tarifas, editar valor/hora e importar planilha de tarifas',
        isActionOnly: false,
    },
    {
        key: 'rh.bank_accounts',
        module: 'RH',
        label: 'Gestão de Contas Bancárias e IBAN',
        desc: 'Ver menu de IBAN e cadastrar/corrigir/trocar IBAN dos trabalhadores',
        isActionOnly: false,
    },
    {
        key: 'rh.workers.edit_status',
        module: 'RH - Trabalhadores',
        label: 'Alterar Status do Trabalhador (Ativo / Inativo / Baixa)',
        desc: 'Botão de mudar status trabalhador ou seguridade social na lista e na ficha',
        isActionOnly: true,
    },
    {
        key: 'rh.workers.edit_cadastro',
        module: 'RH - Trabalhadores',
        label: 'Alterar Nome e Dados Cadastrais do Trabalhador',
        desc: 'Botão "Editar Trabalhador" dentro da ficha do colaborador',
        isActionOnly: true,
    },
    {
        key: 'operacoes.admin',
        module: 'Operações',
        label: 'Seção Administração (Usuários, Funcionários, Playbooks)',
        desc: 'Menus administrativos no final da barra lateral de Operações',
        isActionOnly: true,
    },
];

export const UserPermissionsMatrix: React.FC<UserPermissionsMatrixProps> = ({ tokens = [], onChange }) => {
    const [expandedModule, setExpandedModule] = useState<string | null>(null);

    const handleModuleChange = (moduleId: string, level: ModuleAccessLevel) => {
        onChange(setModuleAccessLevel(tokens, moduleId, level));
    };

    const handleFeatureChange = (featureKey: string, level: FeatureAccessLevel) => {
        onChange(setFeatureAccessLevel(tokens, featureKey, level));
    };

    // Presets para agilizar a configuração cirúrgica sem trabalho manual
    const applyPreset = (preset: 'reset' | 'vendedor' | 'operacoes' | 'rh_operacional' | 'consulta_geral') => {
        // Keep only module-level blocks if resetting or start clean
        let next: string[] = [];

        if (preset === 'reset') {
            onChange([]);
            return;
        }

        if (preset === 'vendedor') {
            // Vendedor: Edita Comercial (exceto Mesa de Aprovações, Configurações e Supervisão),
            // Consulta Trabalhadores/Contratação (sem editar nome/status e sem ver Tarifas/IBAN/Financeiro)
            next = [
                'financeiro',
                'facturacion',
                'mod_view:rrhh',
                'mod_view:contratacao',
                'hide:comercial.aprovacoes',
                'hide:comercial.configuracion',
                'hide:comercial.discador_supervisao',
                'hide:comercial.analises',
                'hide:rh.tariffs',
                'hide:rh.bank_accounts',
                'hide:rh.payment_orders',
                'hide:rh.taxes',
                'hide:rh.holerites',
                'hide:rh.salary_report',
                'hide:rh.discounts',
                'hide:rh.workers.edit_status',
                'hide:rh.workers.edit_cadastro',
                'hide:operacoes.admin',
            ];
        } else if (preset === 'operacoes') {
            // Operações: Trabalha em Operações/Contratação/Logística, consulta RH (sem alterar status/nome e sem Tarifas/IBAN)
            next = [
                'financeiro',
                'mod_view:rrhh',
                'hide:comercial.aprovacoes',
                'hide:comercial.configuracion',
                'hide:comercial.discador_supervisao',
                'hide:comercial.analises',
                'hide:rh.tariffs',
                'hide:rh.bank_accounts',
                'hide:rh.payment_orders',
                'hide:rh.taxes',
                'hide:rh.workers.edit_status',
                'hide:rh.workers.edit_cadastro',
                'hide:operacoes.admin',
            ];
        } else if (preset === 'rh_operacional') {
            // RH Operacional: Pode editar trabalhadores e status, mas NÃO vê Tarifas, IBAN, Impostos nem Mesa de Aprovações
            next = [
                'edit:rh.workers',
                'edit:rh.workers.edit_status',
                'edit:rh.workers.edit_cadastro',
                'hide:rh.tariffs',
                'hide:rh.bank_accounts',
                'hide:rh.taxes',
                'hide:comercial.aprovacoes',
                'hide:comercial.discador_supervisao',
                'hide:comercial.analises',
                'hide:operacoes.admin',
            ];
        } else if (preset === 'consulta_geral') {
            // Apenas consulta em todos os módulos principais, sem telas críticas e sem edição
            next = [
                'mod_view:rrhh',
                'mod_view:comercial',
                'mod_view:contratacao',
                'mod_view:operacoes',
                'mod_view:logistica',
                'hide:comercial.aprovacoes',
                'hide:comercial.configuracion',
                'hide:comercial.discador_supervisao',
                'hide:comercial.analises',
                'hide:rh.tariffs',
                'hide:rh.bank_accounts',
                'hide:rh.payment_orders',
                'hide:rh.taxes',
                'hide:rh.workers.edit_status',
                'hide:rh.workers.edit_cadastro',
                'hide:operacoes.admin',
                'hide:financeiro.settings',
                'hide:financeiro.comissoes',
            ];
        }

        onChange(next);
    };

    return (
        <div className="space-y-6">
            {/* 1. PRESETS RÁPIDOS */}
            <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                            Modelos Rápidos de Permissão (1 Clique)
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => applyPreset('reset')}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600"
                        title="Remove bloqueios customizados e mantém o padrão atual do perfil"
                    >
                        <RotateCcw className="w-3 h-3" /> Limpar Restrições
                    </button>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Clique em um modelo abaixo para preencher automaticamente os bloqueios recomendados para este usuário, ou ajuste item por item abaixo:
                </p>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => applyPreset('vendedor')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-50 transition-colors shadow-xs"
                    >
                        💼 Padrão Vendedor (Sem Aprovações / RH Só Consulta)
                    </button>
                    <button
                        type="button"
                        onClick={() => applyPreset('operacoes')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 hover:bg-blue-50 transition-colors shadow-xs"
                    >
                        👷 Padrão Operações (RH Só Consulta / Sem Tarifas e IBAN)
                    </button>
                    <button
                        type="button"
                        onClick={() => applyPreset('rh_operacional')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300 hover:bg-purple-50 transition-colors shadow-xs"
                    >
                        👥 RH Operacional (Edita Status/Nome, Oculta Tarifas e IBAN)
                    </button>
                    <button
                        type="button"
                        onClick={() => applyPreset('consulta_geral')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors shadow-xs"
                    >
                        👁️ Apenas Consulta Geral
                    </button>
                </div>
            </div>

            {/* 2. CHAVES ESPECIAIS E TELAS CRÍTICAS EM DESTAQUE */}
            <div className="border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-950 dark:text-rose-200">
                        Chaves Especiais & Funcionalidades Sensíveis
                    </h4>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Controle diretamente quem pode ver ou mexer nas telas e botões mais sensíveis do sistema (funciona mesmo que o usuário esteja com perfil ADMIN):
                </p>

                <div className="divide-y divide-rose-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-lg border border-rose-100 dark:border-slate-800">
                    {QUICK_CRITICAL_KEYS.map(item => {
                        const level = getFeatureAccessLevel(tokens, item.key);
                        return (
                            <div key={item.key} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            {item.module}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                            {item.label}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        {item.desc}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleFeatureChange(item.key, level === 'edit' ? 'default' : 'edit')}
                                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                                            level === 'default' || level === 'edit'
                                                ? 'bg-emerald-600 text-white border-emerald-600'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        ✏️ Liberado
                                    </button>
                                    {!item.isActionOnly && (
                                        <button
                                            type="button"
                                            onClick={() => handleFeatureChange(item.key, 'view')}
                                            className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                                                level === 'view'
                                                    ? 'bg-amber-500 text-white border-amber-500'
                                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                            }`}
                                        >
                                            👁️ Só Ver
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleFeatureChange(item.key, 'hidden')}
                                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                                            level === 'hidden'
                                                ? 'bg-rose-600 text-white border-rose-600'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        🚫 {item.isActionOnly ? 'Bloqueado' : 'Oculto'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. ACESSO AOS MÓDULOS DO HUB (LIBERADO vs SÓ CONSULTA vs BLOQUEADO) */}
            <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Acesso aos Módulos do Hub (Completo vs. Só Consulta vs. Bloqueado)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Defina quais módulos este usuário vê no Hub e se ele entra apenas para consultar ou operar:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    {ALL_HUB_MODULES.map(mod => {
                        const modLevel = getModuleAccessLevel(tokens, mod.id);
                        return (
                            <div
                                key={mod.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700"
                            >
                                <span className={`text-xs font-semibold truncate mr-2 ${
                                    modLevel === 'blocked'
                                        ? 'text-rose-500 line-through'
                                        : modLevel === 'view'
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-slate-800 dark:text-slate-200'
                                }`}>
                                    {mod.label}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleModuleChange(mod.id, modLevel === 'edit' ? 'default' : 'edit')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                            modLevel === 'default' || modLevel === 'edit'
                                                ? 'bg-emerald-600 text-white border-emerald-600'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-transparent'
                                        }`}
                                        title="Acesso liberado para operar"
                                    >
                                        <Edit3 className="w-3 h-3 inline mr-0.5" /> Liberado
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleModuleChange(mod.id, 'view')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                            modLevel === 'view'
                                                ? 'bg-amber-500 text-white border-amber-500'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-transparent'
                                        }`}
                                        title="Entra no módulo apenas para consultar"
                                    >
                                        <Eye className="w-3 h-3 inline mr-0.5" /> Consulta
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleModuleChange(mod.id, 'blocked')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                            modLevel === 'blocked'
                                                ? 'bg-rose-600 text-white border-rose-600'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-transparent'
                                        }`}
                                        title="Oculta o módulo no Hub"
                                    >
                                        <Lock className="w-3 h-3 inline mr-0.5" /> Bloq.
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 4. OPÇÕES DETALHADAS DE MENU POR MÓDULO (ACORDEÃO) */}
            <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Personalizar Menus Laterais de Cada Módulo (Opcional)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Clique em um módulo abaixo para mostrar ou ocultar qualquer opção específica do menu lateral daquele módulo:
                </p>

                <div className="space-y-2">
                    {PERMISSIONS_CATALOG.map(group => {
                        const isOpen = expandedModule === group.moduleId;
                        const customCount = group.items.filter(i => getFeatureAccessLevel(tokens, i.key) !== 'default').length;

                        return (
                            <div key={group.moduleId} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                                <button
                                    type="button"
                                    onClick={() => setExpandedModule(isOpen ? null : group.moduleId)}
                                    className="w-full px-4 py-3 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                            {group.moduleTitle}
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            ({group.items.length} opções)
                                        </span>
                                    </div>
                                    {customCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                            {customCount} regra(s) ativa(s)
                                        </span>
                                    )}
                                </button>

                                {isOpen && (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2">
                                        {group.items.map(item => {
                                            const level = getFeatureAccessLevel(tokens, item.key);
                                            return (
                                                <div key={item.key} className="py-2 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-lg">
                                                    <div className="min-w-0">
                                                        <span className={`text-xs font-medium ${item.isCritical ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            {item.label}
                                                        </span>
                                                        {item.description && (
                                                            <p className="text-[10px] text-slate-400">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFeatureChange(item.key, level === 'edit' ? 'default' : 'edit')}
                                                            className={`px-2 py-1 rounded text-[10px] font-semibold border ${
                                                                level === 'default' || level === 'edit'
                                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                                            }`}
                                                        >
                                                            ✏️ Liberado
                                                        </button>
                                                        {!item.isActionOnly && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleFeatureChange(item.key, 'view')}
                                                                className={`px-2 py-1 rounded text-[10px] font-semibold border ${
                                                                    level === 'view'
                                                                        ? 'bg-amber-500 text-white border-amber-500'
                                                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                                                }`}
                                                            >
                                                                👁️ Só Consultar
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFeatureChange(item.key, 'hidden')}
                                                            className={`px-2 py-1 rounded text-[10px] font-semibold border ${
                                                                level === 'hidden'
                                                                    ? 'bg-rose-600 text-white border-rose-600'
                                                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                                            }`}
                                                        >
                                                            🚫 {item.isActionOnly ? 'Bloqueado' : 'Oculto'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
