import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, X, Phone, Mail, Building, Clock, Plus, Send } from 'lucide-react';
import { fetchObservacoes, saveObservacao } from '../data/loader';
import type { EnrichedTitulo, CobrancaObservacao } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface ObservacoesModalProps {
    titulo: EnrichedTitulo;
    isOpen: boolean;
    onClose: () => void;
}

export const ObservacoesModal: React.FC<ObservacoesModalProps> = ({ titulo, isOpen, onClose }) => {
    const { t } = useTranslation();
    const [observacoes, setObservacoes] = useState<CobrancaObservacao[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [novaObs, setNovaObs] = useState('');
    const [currentUser, setCurrentUser] = useState(t('financeiro.modals.unknown_user', 'Usuário Desconhecido'));

    useEffect(() => {
        if (isOpen) {
            loadData();
            fetchUser();
        }
    }, [isOpen, titulo]);

    const fetchUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
            setCurrentUser(session.user.email);
        }
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await fetchObservacoes(titulo.id);
            
            // Build base creation event
            const formattedTotal = titulo.Valot_total?.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';
            const formattedVenc = titulo.Dt_venc ? new Date(titulo.Dt_venc).toLocaleDateString('pt-PT') : 'N/A';
            const formattedEmissao = titulo.Data_emissao ? new Date(titulo.Data_emissao).toLocaleDateString('pt-PT') : 'N/A';
            
            const baseEvent: CobrancaObservacao = {
                id: 'creation-event',
                conta_receber_id: titulo.id,
                data: titulo.Creado ? titulo.Creado.toISOString() : (titulo.Data_emissao ? titulo.Data_emissao.toISOString() : new Date().toISOString()),
                usuario: titulo.Creado_por || 'Sistema',
                tipo: t('financeiro.modals.obs_creation_event', 'Registro do Cobro'),
                descricao: `Título de contas a receber criado para o cliente ${titulo.Cliente || 'Cliente'} no valor de € ${formattedTotal} com emissão em ${formattedEmissao} e vencimento em ${formattedVenc}. Documento: ${titulo.Num_doc}.`
            };

            setObservacoes([...data, baseEvent]);
        } catch (error) {
            console.error('Error fetching observacoes:', error);
            toast.error(t('financeiro.modals.err_timeline_fetch', 'Erro ao carregar a linha do tempo.'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddObs = async () => {
        if (!novaObs.trim()) return;

        setIsSaving(true);
        try {
            const obsToSave = {
                conta_receber_id: titulo.id,
                usuario: currentUser,
                tipo: t('financeiro.modals.obs_manual_note', 'Anotação Manual'),
                descricao: novaObs,
                data: new Date().toISOString()
            };

            const res = await saveObservacao(obsToSave);
            if (!res.success) throw res.error;

            setNovaObs('');
            loadData(); // Reload to get the new list with IDs
        } catch (error) {
            toast.error(t('financeiro.modals.err_obs_add', 'Falha ao adicionar anotação.'));
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const cliente = titulo.clienteInfo;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center bg-brand-primary p-4 text-white">
                    <h2 className="text-xl font-semibold tracking-tight">{t('financeiro.modals.obs_title', 'Observações e Histórico')}</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                        <X size={20} />
                    </Button>
                </div>

                {/* Cliente Info Cards */}
                <div className="p-4 bg-gray-50 border-b flex flex-wrap gap-4">
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm flex-1 min-w-[250px]">
                        <div className="bg-blue-100 p-2 rounded text-blue-600">
                            <Building size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{t('financeiro.modals.client', 'Cliente')}</p>
                            <p className="text-sm font-semibold truncate" title={cliente?.NombreComercial || titulo.Cliente}>{cliente?.NombreComercial || titulo.Cliente || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm flex-1 min-w-[250px]">
                        <div className="bg-green-100 p-2 rounded text-green-600">
                            <Mail size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{t('financeiro.modals.obs_email', 'E-mail')}</p>
                            <p className="text-sm font-semibold truncate" title={cliente?.EmailCobros || t('financeiro.modals.obs_no_email', 'Sem E-mail')}>{cliente?.EmailCobros || t('financeiro.modals.obs_no_email', 'Sem E-mail')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm flex-1 min-w-[200px]">
                        <div className="bg-purple-100 p-2 rounded text-purple-600">
                            <Phone size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{t('financeiro.modals.obs_phone', 'Telefone')}</p>
                            <p className="text-sm font-semibold truncate">{cliente?.TelefonoCobros || t('financeiro.modals.obs_no_phone', 'Sem Telefone')}</p>
                        </div>
                    </div>
                </div>

                {/* Timeline Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    <h3 className="text-lg font-medium text-center text-brand-dark mb-8 border-b pb-2">{t('financeiro.modals.obs_timeline', 'Linha do Tempo')}</h3>
                    
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                        </div>
                    ) : observacoes.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                            <Clock className="w-12 h-12 mb-3 text-gray-300" />
                            <p>{t('financeiro.modals.obs_no_history', 'Nenhum histórico registrado para este documento.')}</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-gray-200 ml-4 space-y-8">
                            {observacoes.map((obs, idx) => {
                                const dateObj = new Date(obs.data);
                                const isRecebimento = obs.tipo.toLowerCase().includes('recebimento') || obs.tipo.toLowerCase().includes('pagamento');
                                
                                return (
                                    <div key={obs.id || idx} className="relative pl-6">
                                        <div className={`absolute -left-2 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${isRecebimento ? 'bg-green-500' : 'bg-brand-primary'}`}></div>
                                        <div>
                                            <h4 className={`font-semibold text-sm ${isRecebimento ? 'text-green-700' : 'text-brand-primary'}`}>
                                                {obs.tipo}
                                            </h4>
                                            <p className="text-gray-800 text-sm mt-1">{obs.descricao}</p>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                <span>Data: {dateObj.toLocaleDateString('pt-BR')} às {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span>•</span>
                                                <span>Usuário: {obs.usuario}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="bg-gray-50 border-t p-4 flex gap-2">
                    <Input 
                        value={novaObs}
                        onChange={e => setNovaObs(e.target.value)}
                        placeholder={t('financeiro.modals.obs_input_placeholder', 'Adicionar nova observação ou registro de contato...')}
                        className="flex-1"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddObs();
                        }}
                    />
                    <Button 
                        onClick={handleAddObs} 
                        disabled={isSaving || !novaObs.trim()}
                        className="bg-brand-primary hover:bg-brand-primary/90"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        {t('financeiro.modals.obs_btn_add', 'Adicionar')}
                    </Button>
                </div>
            </div>
        </div>
    );
};
