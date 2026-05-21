import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ChevronLeft, Calendar, DollarSign, User, Building, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';

export const TitleDetail = () => {
    const { id } = useParams();
    const { rawData } = useData();
    const title = rawData.find(t => t.id === id);

    if (!title) {
        return <div className="p-8 text-center text-gray-500">Título não encontrado.</div>;
    }

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <Link to="/financeiro/titulos" className="flex items-center text-gray-500 hover:text-brand-dark transition-colors mb-4">
                    <ChevronLeft size={16} /> Voltar
                </Link>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">{title.clienteInfo?.NombreComercial || title.Cliente}</h2>
                            <p className="text-gray-500 flex items-center gap-2">
                                <Building size={14} /> {title.Empresa} | Doc: {title.Num_doc}
                            </p>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-bold ${title.Status === 'Vencido' ? 'bg-red-100 text-red-700' :
                                title.Status === 'Pago' ? 'bg-green-100 text-green-700' :
                                    'bg-orange-100 text-orange-700'
                            }`}>
                            {title.Status}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <DollarSign size={16} /> Valor Total
                            </div>
                            <div className="text-xl font-bold text-gray-900">{formatCurrency(title.Valot_total)}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <DollarSign size={16} /> Saldo a Pagar
                            </div>
                            <div className="text-xl font-bold text-brand-dark">{formatCurrency(title.Saldo_a_pagar)}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <Calendar size={16} /> Vencimento
                            </div>
                            <div className="text-xl font-bold text-gray-900">{formatDate(title.Dt_venc)}</div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Detalhes</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-gray-500">Emissão:</span> {formatDate(title.Data_emissao)}</div>
                                <div><span className="text-gray-500">Recebimento:</span> {formatDate(title.dt_recebimento)}</div>
                                <div><span className="text-gray-500">Banco:</span> {title.Banco || 'N/A'}</div>
                                <div><span className="text-gray-500">Forma:</span> {title.Form_receb || 'N/A'}</div>
                            </div>
                        </div>

                        {title.Hist_ValorParcial && title.Hist_ValorParcial.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Histórico de Pagamentos</h3>
                                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                                    {title.Hist_ValorParcial.map((h: any, idx: number) => (
                                        <div key={idx} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                                            <span>{h.DataPagamento || h.Data}</span>
                                            <span className="font-semibold">{formatCurrency(parseFloat(h.ValorParcial || 0))}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Observações</h3>
                            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: title.Obs || 'Sem observações.' }} />
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs text-gray-400">
                            <div>Criado por: {title.Creado_por} em {formatDate(title.Creado)}</div>
                            <div>Modificado por: {title.Modificado_por} em {formatDate(title.Modificado)}</div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button disabled className="bg-gray-200 text-gray-400 px-6 py-3 rounded-xl font-bold cursor-not-allowed">
                            Registrar Recebimento (Em breve)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
