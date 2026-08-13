import React, { useEffect, useState } from 'react';
import { FileText, Plus, Search, Calendar, DollarSign, AlertTriangle, CheckCircle, ArrowUpRight, Filter } from 'lucide-react';
import { contratosLogisticsService } from '../../services/contratosLogisticsService';
import type { ContratoAlojamento } from '../../services/contratosLogisticsService';
import { financeLogisticsService } from '../../services/financeLogisticsService';

export const ContratosList: React.FC = () => {
  const [contratos, setContratos] = useState<ContratoAlojamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatingOpId, setGeneratingOpId] = useState<string | null>(null);

  const loadContratos = async () => {
    setIsLoading(true);
    try {
      const data = await contratosLogisticsService.fetchContratos();
      setContratos(data);
    } catch (err) {
      console.error('Erro ao carregar contratos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContratos();
  }, []);

  const handleGerarOP = async (contrato: ContratoAlojamento) => {
    try {
      setGeneratingOpId(contrato.id);
      await financeLogisticsService.gerarOrdemPagamento({
        contrato_id: contrato.id,
        alojamento_id: contrato.alojamento_id,
        provedor_id: contrato.provedor_id,
        tipo_pago: 'Aluguel',
        valor: contrato.valor_mensal || 1500,
        data_vencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        observacoes: `Aluguel mensal do contrato ${contrato.codigo}`
      });

      alert(`Ordem de Pagamento gerada com sucesso para o contrato ${contrato.codigo}!`);
    } catch (err: any) {
      console.error('Erro ao gerar OP:', err);
      alert('Erro ao gerar Ordem de Pagamento.');
    } finally {
      setGeneratingOpId(null);
    }
  };

  const filtered = contratos.filter(c => 
    (c.codigo && c.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.titular && c.titular.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="text-blue-600" size={26} />
            Contratos de Locação & Fianças
          </h1>
          <p className="text-sm text-slate-500">Gestão de contratos com imobiliárias/proprietários, renovações mensais e fianças</p>
        </div>
        <button
          onClick={() => alert('Novo contrato')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} />
          Nuevo Contrato
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por código ou titular..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Carregando contratos...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum contrato cadastrado.</div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Titular / Provedor</th>
                  <th className="px-4 py-3">Vigência</th>
                  <th className="px-4 py-3">Aluguel Mensal</th>
                  <th className="px-4 py-3">Fiança</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações Financeiras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">{c.codigo}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 dark:text-white">{c.titular || 'Titular N/A'}</p>
                      <p className="text-[11px] text-slate-400">{c.provedor?.nome_razao_social}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {c.data_inicio || '01/01/2026'} - {c.data_fim || '31/12/2026'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      € {c.valor_mensal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      € {c.fianza_valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        c.status === 'Activo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleGerarOP(c)}
                        disabled={generatingOpId === c.id}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        <DollarSign size={14} />
                        {generatingOpId === c.id ? 'Gerando OP...' : 'Gerar OP Aluguel'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
