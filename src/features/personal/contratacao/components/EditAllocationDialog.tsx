import React, { useState, useEffect } from 'react';
import { X, Pencil, AlertTriangle, Loader2, Save, Shirt, Shield, Phone, CreditCard, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/shared/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EditAllocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  allocation: any;
  onSuccess?: () => void;
}

const STANDARD_RATES = [
  '10.00', '10.50', '11.00', '11.50', '12.00', '12.50', '13.00', '13.50',
  '14.00', '14.50', '15.00', '15.50', '16.00', '16.50', '17.00', '17.50',
  '18.00', '18.50', '19.00', '19.50', '20.00', '20.50', '21.00', '21.50',
  '22.00', '22.50', '23.00', '23.50', '24.00', '24.50', '25.00', '25.50',
  '26.00', '26.50', '27.00', '27.50', '28.00', '28.50', '29.00', '29.50', '30.00'
];

export const EditAllocationDialog: React.FC<EditAllocationDialogProps> = ({
  isOpen,
  onClose,
  allocation,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [tarifaAcordada, setTarifaAcordada] = useState<string>('');
  const [isCustomTariff, setIsCustomTariff] = useState(false);
  const [plannedStartDate, setPlannedStartDate] = useState<string>('');
  const [plannedEndDate, setPlannedEndDate] = useState<string>('');
  const [camiseta, setCamiseta] = useState<string>('');
  const [pantalones, setPantalones] = useState<string>('');
  const [licenciaConducir, setLicenciaConducir] = useState<'Si' | 'No' | ''>('');
  const [movil, setMovil] = useState<string>('');
  const [pasaporte, setPasaporte] = useState<string>('');
  const [jobFunctionName, setJobFunctionName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [motivoAlteracao, setMotivoAlteracao] = useState<string>('');

  const worker = allocation?.worker || {};

  // Initialize form with allocation data when opened
  useEffect(() => {
    if (allocation && isOpen) {
      const initialTariff = allocation.tarifa_acordada ? Number(allocation.tarifa_acordada).toFixed(2) : '';
      setTarifaAcordada(initialTariff);
      setIsCustomTariff(Boolean(initialTariff && !STANDARD_RATES.includes(initialTariff)));

      setPlannedStartDate(allocation.planned_start_date || allocation.start_date || '');
      setPlannedEndDate(allocation.planned_end_date || '');
      setCamiseta(worker.camiseta || '');
      setPantalones(worker.pantalones || '');
      setLicenciaConducir(worker.licencia_conducir === 'Si' ? 'Si' : 'No');
      setMovil(worker.movil || '');
      setPasaporte(worker.pasaporte || worker.dni || worker.nie || '');
      setJobFunctionName(allocation.job_function_name_snapshot || '');
      setNotes(allocation.notes || '');
      setMotivoAlteracao('');
    }
  }, [allocation, isOpen]);

  if (!isOpen || !allocation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numTariff = parseFloat(tarifaAcordada);
    if (isNaN(numTariff) || numTariff <= 0) {
      toast.error('Informe um valor de tarifa acordada válido.');
      return;
    }

    if (!plannedStartDate) {
      toast.error('A data de início prevista é obrigatória.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        assignment_id: allocation.id,
        tarifa_acordada: numTariff,
        planned_start_date: plannedStartDate,
        planned_end_date: plannedEndDate || null,
        camiseta: camiseta || null,
        pantalones: pantalones || null,
        licencia_conducir: licenciaConducir || 'No',
        movil: movil || null,
        pasaporte: pasaporte || null,
        job_function_name: jobFunctionName || null,
        notes: notes || null,
        motivo_alteracao: motivoAlteracao || 'Ajuste de dados na Contratação Inicial'
      };

      const { data, error } = await supabase
        .schema('core_personal')
        .rpc('atualizar_contratacao_trabalhador', { payload });

      if (error) throw error;

      toast.success('Dados da contratação e tarifa atualizados com sucesso!');

      // Invalidate relevant React Query caches
      queryClient.invalidateQueries({ queryKey: ['all_allocations'] });
      queryClient.invalidateQueries({ queryKey: ['active_pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['worker_assignments'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['workers-tariffs'] });
      queryClient.invalidateQueries({ queryKey: ['worker_beneficios_settings'] });

      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Erro ao atualizar contratação:', err);
      toast.error(err.message || 'Erro ao atualizar dados da contratação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Editar Dados da Contratação
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Altere a tarifa, datas de alocação ou dados cadastrais consolidados do trabalhador.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Worker Summary Banner */}
        <div className="px-6 py-3 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-100/60 dark:border-indigo-900/40 flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
              {worker.nome || 'Trabalhador'}
            </span>
            <span className="text-xs text-slate-500 ml-2">
              Cód: <span className="font-semibold text-slate-700 dark:text-slate-300">{worker.cod_colab || 'N/A'}</span>
              {worker.nif && ` • NIF: ${worker.nif}`}
            </span>
          </div>
          <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
            {jobFunctionName || allocation.job_function_name_snapshot || 'Perfil'}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Section: Tarifa Acordada */}
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                Tarifa Acordada com o Trabalhador (€/h) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomTariff(!isCustomTariff)}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                {isCustomTariff ? '← Escolher da lista pré-definida' : '+ Digitar outro valor'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {isCustomTariff ? (
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={tarifaAcordada}
                    onChange={e => setTarifaAcordada(e.target.value)}
                    placeholder="Ex: 14.50"
                    className="w-full pl-3 pr-8 py-2.5 border border-emerald-300 dark:border-emerald-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold text-base focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <span className="absolute right-3 top-2.5 font-bold text-slate-400 text-sm">€/h</span>
                </div>
              ) : (
                <select
                  required
                  value={tarifaAcordada}
                  onChange={e => setTarifaAcordada(e.target.value)}
                  className="w-full px-3 py-2.5 border border-emerald-300 dark:border-emerald-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold text-base focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Selecione a tarifa...</option>
                  {tarifaAcordada && !STANDARD_RATES.includes(tarifaAcordada) && (
                    <option value={tarifaAcordada}>
                      {Number(tarifaAcordada).toFixed(2).replace('.', ',')} €/h (Atual)
                    </option>
                  )}
                  {STANDARD_RATES.map(val => (
                    <option key={val} value={val}>
                      {val.replace('.', ',')} €/h
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ao alterar a tarifa aqui, o valor é consolidado na alocação, nas configurações de benefícios/remuneração e no histórico de auditoria.
            </p>
          </div>

          {/* Section: Datas de Alocação */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Período de Alocação
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Data de Início Prevista <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={plannedStartDate}
                  onChange={e => setPlannedStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Data de Fim Prevista
                </label>
                <input
                  type="date"
                  value={plannedEndDate}
                  onChange={e => setPlannedEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Dados Pessoais & Uniforme */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Shirt className="h-3.5 w-3.5" />
              Uniforme, CNH e Contato
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Camisa (Camiseta)
                </label>
                <select
                  value={camiseta}
                  onChange={e => setCamiseta(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecione...</option>
                  <option value="S (50/52)">S (50/52)</option>
                  <option value="M(54/56)">M(54/56)</option>
                  <option value="L(58)">L(58)</option>
                  <option value="XL(60)">XL(60)</option>
                  <option value="XXL(62)">XXL(62)</option>
                  <option value="XXXL(64)">XXXL(64)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Calça (Pantalones)
                </label>
                <select
                  value={pantalones}
                  onChange={e => setPantalones(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecione...</option>
                  <option value="S (38/40)">S (38/40)</option>
                  <option value="M(42/44)">M(42/44)</option>
                  <option value="L(46)">L(46)</option>
                  <option value="XL(52)">XL(52)</option>
                  <option value="XXL(54)">XXL(54)</option>
                  <option value="XXXL(56)">XXXL(56)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  CNH (Conducir)
                </label>
                <select
                  value={licenciaConducir}
                  onChange={e => setLicenciaConducir(e.target.value as 'Si' | 'No')}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Si">Si</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  Celular (Móvil)
                </label>
                <input
                  type="text"
                  value={movil}
                  onChange={e => setMovil(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Shield className="h-3 w-3 text-slate-400" />
                  Passaporte / Doc.
                </label>
                <input
                  type="text"
                  value={pasaporte}
                  onChange={e => setPasaporte(e.target.value)}
                  placeholder="Número de passaporte ou documento"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Perfil / Função */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nome da Função / Perfil Alocado
            </label>
            <input
              type="text"
              value={jobFunctionName}
              onChange={e => setJobFunctionName(e.target.value)}
              placeholder="Ex: TUBERO INDUSTRIAL"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Section: Motivo da Alteração & Observações */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Motivo da Alteração <span className="text-slate-400 font-normal">(para histórico de auditoria)</span>
              </label>
              <input
                type="text"
                value={motivoAlteracao}
                onChange={e => setMotivoAlteracao(e.target.value)}
                placeholder="Ex: Ajuste de tarifa acordada com o cliente / trabalhador"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Observações da Alocação
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notas internas ou observações da contratação..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando Alterações...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
