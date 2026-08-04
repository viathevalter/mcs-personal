import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { AllocateWorkerDialog } from './components/AllocateWorkerDialog';
import { CancelAllocationDialog } from './components/CancelAllocationDialog';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, 
  Users, 
  Clock, 
  Search, 
  MapPin, 
  Calendar, 
  Award, 
  Phone, 
  Shield, 
  UserPlus, 
  Shirt, 
  CreditCard,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Loader2,
  HelpCircle,
  AlertTriangle,
  X,
  Copy
} from 'lucide-react';
import type { OpenPosition } from './hooks/useOpenPositions';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const HiringDashboardPage: React.FC = () => {
  const { selectedEmpresaId, activeEmpresaId } = useEmpresa();
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Filter States
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [profileFilter, setProfileFilter] = useState<string>('all');
  const [workerSearch, setWorkerSearch] = useState<string>('');

  // Dialog state
  const [selectedPosition, setSelectedPosition] = useState<OpenPosition | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Cancel Dialog state
  const [allocationToCancel, setAllocationToCancel] = useState<{ id: string; workerName: string } | null>(null);
  const [isCancelPending, setIsCancelPending] = useState(false);

  const handleCancelAllocation = async (reason: string) => {
    if (!allocationToCancel) return;
    setIsCancelPending(true);
    try {
      const { data, error } = await supabase
        .schema('core_personal')
        .rpc('cancelar_alocacao_trabalhador', {
          payload: {
            assignment_id: allocationToCancel.id,
            reason: reason || null
          }
        });

      if (error) throw error;

      toast.success('Contratação cancelada e vaga reaberta com sucesso!');
      setAllocationToCancel(null);
      
      // Atualizar dados da tela
      refetchPedidos();
      refetchAllocations();
      refetchReplacementTargets();
    } catch (err: any) {
      console.error("Erro ao cancelar alocação:", err);
      toast.error(err.message || 'Erro ao cancelar a contratação.');
    } finally {
      setIsCancelPending(false);
    }
  };

  const handleCopyTeamsText = (alloc: any) => {
    const worker = alloc.worker || {};
    const clienteNome = selectedPedido?.client?.trade_name || selectedPedido?.client?.legal_name || 'Desconhecido';
    const pedidoCodigo = selectedPedido?.codigo || 'N/A';
    
    // Formatar data de início
    let dataInicio = 'N/A';
    const dateSrc = alloc.planned_start_date || alloc.start_date;
    if (dateSrc) {
      const dateObj = new Date(dateSrc);
      if (!isNaN(dateObj.getTime())) {
        // Garantir fuso horário local correto ao converter date string (YYYY-MM-DD)
        const parts = String(dateSrc).split('-');
        if (parts.length === 3) {
          dataInicio = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          dataInicio = dateObj.toLocaleDateString('pt-BR');
        }
      }
    }
    
    // Formatar tamanho camiseta e calça
    const camisetaVal = worker.camiseta || 'Não informado';
    const calcaVal = worker.pantalones || 'Não informado';
    
    // Formatar CNH (LICENCIA DE CONDUCIR)
    const cnh = worker.licencia_conducir === 'Si' ? 'Si' : 'No';
    
    // Formatar tarifa
    const tarifa = alloc.tarifa_acordada ? `${Number(alloc.tarifa_acordada).toFixed(2).replace('.', ',')} €` : 'N/A';

    // 1. Texto Plano (Plain Text) para fallback
    const plainText = `${clienteNome.toUpperCase()} - Pedido ${pedidoCodigo}

Abajo la contratación del PEDIDO ${pedidoCodigo}

NOMBRE: ${(worker.nome || 'Desconhecido').toUpperCase()}
NÚMERO DEL MÓVIL: ${worker.movil || 'Não informado'}
EMPRESA: ${clienteNome.toUpperCase()}
NÚMERO DEL PEDIDO: ${pedidoCodigo}
FECHA DE INICIO: ${dataInicio}
FUNCIÓN: ${(alloc.job_function_name_snapshot || 'Desconhecida').toUpperCase()}
TARIFA: ${tarifa}
TALLA UNIFORME: ${camisetaVal}
TALLA UNIFORME: ${calcaVal}
LICENCIA DE CONDUCIR: ${cnh}`;

    // 2. Rich Text (HTML) para manter negritos no Teams
    const htmlText = `<div><strong>${clienteNome.toUpperCase()} - Pedido ${pedidoCodigo}</strong></div>
<div>Abajo la contratación del PEDIDO ${pedidoCodigo}</div>
<br />
<div><strong>NOMBRE:</strong> ${(worker.nome || 'Desconhecido').toUpperCase()}</div>
<div><strong>NÚMERO DEL MÓVIL:</strong> ${worker.movil || 'Não informado'}</div>
<div><strong>EMPRESA:</strong> ${clienteNome.toUpperCase()}</div>
<div><strong>NÚMERO DEL PEDIDO:</strong> ${pedidoCodigo}</div>
<div><strong>FECHA DE INICIO:</strong> ${dataInicio}</div>
<div><strong>FUNCIÓN:</strong> ${(alloc.job_function_name_snapshot || 'Desconhecida').toUpperCase()}</div>
<div><strong>TARIFA:</strong> ${tarifa}</div>
<div><strong>TALLA UNIFORME:</strong> ${camisetaVal}</div>
<div><strong>TALLA UNIFORME:</strong> ${calcaVal}</div>
<div><strong>LICENCIA DE CONDUCIR:</strong> ${cnh}</div>`;

    // Gravar no Clipboard os dois formatos
    const clipboardData = [
      new ClipboardItem({
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
        'text/html': new Blob([htmlText], { type: 'text/html' })
      })
    ];

    navigator.clipboard.write(clipboardData)
      .then(() => {
        toast.success(`Dados de ${worker.nome || 'trabalhador'} copiados em negrito para o Teams!`);
      })
      .catch((err) => {
        console.error('Erro ao copiar para clipboard:', err);
        // Fallback simples se write(ClipboardItem) falhar por algum motivo de compatibilidade
        navigator.clipboard.writeText(plainText)
          .then(() => {
            toast.success(`Dados copiados (formato texto simples)`);
          })
          .catch(() => {
            toast.error('Não foi possível copiar os dados automaticamente.');
          });
      });
  };

  const getProfileQuestions = (perguntaRespuesta: any, cargoName: string) => {
    if (!perguntaRespuesta || typeof perguntaRespuesta !== 'object') return [];
    return Object.values(perguntaRespuesta).filter((q: any) => 
      q?.cargo?.toLowerCase() === cargoName?.toLowerCase()
    );
  };

  // 1. Query all active Pedidos (excluding cancelled ones) with their client details and items
  const { data: activePedidos = [], isLoading: isLoadingPedidos, refetch: refetchPedidos } = useQuery({
    queryKey: ['active_pedidos', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      
      // Fetch pedidos
      let query = supabase
        .schema('core_comercial')
        .from('pedidos')
        .select('*')
        .neq('operational_status', 'cancelled')
        .order('created_at', { ascending: false });
        
      if (activeEmpresaId) {
        query = query.eq('empresa_id', activeEmpresaId);
      }

      const { data: pedidos, error: pedidosErr } = await query;
        
      if (pedidosErr) throw pedidosErr;
      if (!pedidos || pedidos.length === 0) return [];

      const pedidoIds = pedidos.map(p => p.id);
      const clientIds = [...new Set(pedidos.map(p => p.client_id).filter(Boolean))];
      const siteIds = [...new Set(pedidos.map(p => p.client_site_id).filter(Boolean))];

      // Fetch items
      const { data: items, error: itemsErr } = await supabase
        .schema('core_comercial')
        .from('pedido_items')
        .select('*')
        .in('pedido_id', pedidoIds);

      if (itemsErr) throw itemsErr;

      const jobFunctionIds = [...new Set((items || []).map(i => i.job_function_id).filter(Boolean))];

      // Fetch clients, sites, and functions in parallel
      const [clientsRes, sitesRes, jobsRes] = await Promise.all([
        clientIds.length > 0 
          ? supabase.schema('core_common').from('clients').select('id, trade_name, legal_name').in('id', clientIds)
          : Promise.resolve({ data: [] }),
        siteIds.length > 0
          ? supabase.schema('core_common').from('client_sites').select('id, name, address_line, city, postal_code').in('id', siteIds)
          : Promise.resolve({ data: [] }),
        jobFunctionIds.length > 0
          ? supabase.schema('core_comercial').from('job_functions').select('id, name').in('id', jobFunctionIds)
          : Promise.resolve({ data: [] })
      ]);

      const clientsMap = new Map(clientsRes.data?.map(c => [c.id, c]) || []);
      const sitesMap = new Map(sitesRes.data?.map(s => [s.id, s]) || []);
      const jobsMap = new Map(jobsRes.data?.map(j => [j.id, j]) || []);

      return pedidos.map(pedido => {
        const pedidoItems = (items || [])
          .filter(item => item.pedido_id === pedido.id)
          .map(item => ({
            ...item,
            job_function: jobsMap.get(item.job_function_id) || null
          }));

        return {
          ...pedido,
          client: clientsMap.get(pedido.client_id) || null,
          client_site: sitesMap.get(pedido.client_site_id) || null,
          pedido_items: pedidoItems
        };
      });
    },
    enabled: !!selectedEmpresaId
  });

  // 2. Query active replacement and offboard-with-replacement targets for this empresa
  const { data: replacementTargets = [], refetch: refetchReplacementTargets } = useQuery({
    queryKey: ['active_replacement_targets', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      let query = supabase
        .schema('core_operacoes')
        .from('solicitud_targets')
        .select(`
          id, 
          source_assignment_id, 
          source_pedido_id,
          source_pedido_item_id, 
          source_worker_id,
          source_client_id,
          source_client_site_id,
          target_job_function_id,
          target_job_function_name,
          status, 
          action_type, 
          requires_replacement, 
          reason,
          notes,
          solicitud_id, 
          solicitud:solicitudes_operativas(due_date, codigo, title, description, client_id, client_site_id, pergunta_respuesta)
        `)
        .in('action_type', ['replace', 'offboard'])
        .in('status', ['pending', 'in_progress', 'completed']);

      if (activeEmpresaId) {
        query = query.eq('empresa_id', activeEmpresaId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching replacement targets:", error);
        return [];
      }
      
      const targets = (data || []).filter((t: any) => 
        t.action_type === 'replace' || 
        (t.action_type === 'offboard' && t.requires_replacement === true)
      );

      const workerIds = [...new Set(targets.map((t: any) => t.source_worker_id).filter(Boolean))];
      const clientIds = [...new Set(targets.map((t: any) => t.source_client_id || t.solicitud?.client_id).filter(Boolean))];
      const siteIds = [...new Set(targets.map((t: any) => t.source_client_site_id || t.solicitud?.client_site_id).filter(Boolean))];

      const [workersRes, clientsRes, sitesRes] = await Promise.all([
        workerIds.length > 0 
          ? supabase.schema('core_personal').from('workers').select('id, nome, cod_colab, funcion').in('id', workerIds)
          : Promise.resolve({ data: [] }),
        clientIds.length > 0
          ? supabase.schema('core_common').from('clients').select('id, trade_name, legal_name').in('id', clientIds)
          : Promise.resolve({ data: [] }),
        siteIds.length > 0
          ? supabase.schema('core_common').from('client_sites').select('id, name, address_line, city, postal_code').in('id', siteIds)
          : Promise.resolve({ data: [] })
      ]);

      const workersMap = new Map(workersRes.data?.map(w => [w.id, w]) || []);
      const clientsMap = new Map(clientsRes.data?.map(c => [c.id, c]) || []);
      const sitesMap = new Map(sitesRes.data?.map(s => [s.id, s]) || []);

      return targets.map((t: any) => ({
        ...t,
        source_worker: workersMap.get(t.source_worker_id) || null,
        client: clientsMap.get(t.source_client_id || t.solicitud?.client_id) || null,
        client_site: sitesMap.get(t.source_client_site_id || t.solicitud?.client_site_id) || null
      }));
    },
    enabled: !!selectedEmpresaId
  });

  const replacementMap = useMemo(() => {
    const map = new Map<string, any>();
    replacementTargets.forEach(t => {
      if (t.source_assignment_id) {
        map.set(t.source_assignment_id, t);
      }
    });
    return map;
  }, [replacementTargets]);

  // 3. Query all allocations for active Pedidos in this Empresa
  const { data: allAllocations = [], isLoading: isLoadingAllocations, refetch: refetchAllocations } = useQuery({
    queryKey: ['all_allocations', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      
      let query = supabase
        .schema('core_personal')
        .from('worker_assignments')
        .select(`
          id,
          solicitud_id,
          status,
          planned_start_date,
          start_date,
          tarifa_acordada,
          pedido_id,
          pedido_item_id,
          job_function_name_snapshot,
          worker:workers(
            id,
            nome,
            nif,
            camiseta,
            pantalones,
            licencia_conducir,
            movil,
            cod_colab
          )
        `)
        .in('status', ['planned', 'active', 'paused', 'replaced', 'relocated', 'terminated']);

      if (activeEmpresaId) {
        query = query.eq('empresa_id', activeEmpresaId);
      }
        
      const { data, error } = await query;
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEmpresaId
  });

  // Blended list of Pedidos (real active Pedidos + synthetic Pedidos for standalone replacements)
  const blendedPedidos = useMemo(() => {
    const list = [...activePedidos];
    const activePedidoIds = new Set(activePedidos.map(p => p.id));
    const standaloneReplacements = replacementTargets.filter(t => 
      !t.source_pedido_id || !activePedidoIds.has(t.source_pedido_id)
    );
    
    standaloneReplacements.forEach(t => {
      const existingId = `reemplazo-${t.solicitud_id || t.id}`;
      let syntheticPedido = list.find(p => p.id === existingId);
      
      const itemJobFunction = t.target_job_function_name || t.source_worker?.funcion || 'Perfil';
      const itemJobFunctionId = t.target_job_function_id || null;
      const isTargetCompleted = t.status === 'completed' || !!t.target_assignment_id || allAllocations.some((a: any) => a.solicitud_id === (t.solicitud_id || t.id));
      const item = {
        id: `reemplazo-item-${t.id}`,
        pedido_id: existingId,
        job_function_id: itemJobFunctionId,
        job_function_name_snapshot: itemJobFunction,
        job_function: { name: itemJobFunction },
        quantity_requested: 1,
        quantity_fulfilled: isTargetCompleted ? 1 : 0,
        includes_epi: false,
        includes_housing: t.requires_housing || false,
        base_cost_hour_snapshot: null,
        isReplacementItem: true,
        replaced_worker: t.source_worker,
        reason: t.reason,
        notes: t.notes,
        solicitud_target_id: t.id
      };
      
      if (syntheticPedido) {
        syntheticPedido.pedido_items.push(item);
      } else {
        syntheticPedido = {
          id: existingId,
          isSynthetic: true,
          syntheticType: 'replacement',
          solicitud_id: t.solicitud_id,
          codigo: t.solicitud?.codigo || `R-${t.id.slice(0, 8)}`,
          title: t.solicitud?.title || `Substituição`,
          client_id: t.source_client_id || t.solicitud?.client_id || null,
          client_site_id: t.source_client_site_id || t.solicitud?.client_site_id || null,
          expected_start_date: t.solicitud?.due_date || null,
          expected_end_date: null,
          client: t.client || { trade_name: 'N/A - Reemplazo' },
          client_site: t.client_site || { name: 'N/A - Local não definido' },
          pergunta_respuesta: t.solicitud?.pergunta_respuesta || null,
          pedido_items: [item]
        };
        list.push(syntheticPedido);
      }
    });
    
    return list;
  }, [activePedidos, replacementTargets]);

  // Selected Pedido helper
  const selectedPedido = useMemo(() => {
    return blendedPedidos.find(p => p.id === selectedPedidoId) || null;
  }, [blendedPedidos, selectedPedidoId]);

  // Allocations for the selected Pedido
  const allocations = useMemo(() => {
    if (selectedPedidoId && selectedPedidoId.toString().startsWith('reemplazo-')) {
      const gsoId = selectedPedidoId.toString().replace('reemplazo-', '');
      return allAllocations.filter(a => a.solicitud_id === gsoId);
    }
    return allAllocations.filter(a => a.pedido_id === selectedPedidoId);
  }, [allAllocations, selectedPedidoId]);

  // Helper to calculate a Pedido's hiring progress (subtracting active replacements)
  const getPedidoHiringStatus = (pedido: any, replacementTargetsList: any[]) => {
    let reqQty = 0;
    let fulQty = 0;
    let hasReplacement = false;
    
    if (pedido.isSynthetic) {
      reqQty = pedido.pedido_items.length;
      fulQty = pedido.pedido_items.filter((item: any) => item.quantity_fulfilled > 0).length;
      hasReplacement = false;
    } else {
      pedido.pedido_items?.forEach((item: any) => {
        reqQty += item.quantity_requested || 0;
        const repCount = replacementTargetsList.filter(t => t.source_pedido_item_id === item.id).length;
        if (repCount > 0) hasReplacement = true;
        fulQty += Math.max(0, (item.quantity_fulfilled || 0) - repCount);
      });
    }

    const isCompleted = reqQty === 0 || fulQty >= reqQty;
    return {
      reqQty,
      fulQty,
      isCompleted,
      hasReplacement
    };
  };

  // Helper to check if a Pedido is urgent (expected start date <= 5 days and pending/has replacements)
  const isPedidoUrgent = (pedido: any) => {
    const { isCompleted, hasReplacement } = getPedidoHiringStatus(pedido, replacementTargets);
    const isPending = !isCompleted || hasReplacement;
    if (!isPending || !pedido.expected_start_date) return false;

    const today = new Date();
    today.setHours(0,0,0,0);
    const startDate = new Date(pedido.expected_start_date);
    startDate.setHours(0,0,0,0);
    
    const diffTime = startDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 5;
  };

  // Unique clients present in active pedidos for filter dropdown
  const clientsList = useMemo(() => {
    const map = new Map<string, string>();
    blendedPedidos.forEach(p => {
      if (p.client) {
        map.set(p.client.id, p.client.trade_name || p.client.legal_name || 'Cliente');
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [blendedPedidos]);

  // Unique profiles present in active pedidos for filter dropdown
  const profilesList = useMemo(() => {
    const set = new Set<string>();
    blendedPedidos.forEach(p => {
      p.pedido_items?.forEach((item: any) => {
        const name = item.job_function_name_snapshot || item.job_function?.name;
        if (name) set.add(name);
      });
    });
    return Array.from(set).sort();
  }, [blendedPedidos]);

  // Calculate totals across all active orders
  const totals = useMemo(() => {
    let openVacancies = 0;
    let activeOrders = 0;
    let urgentCount = 0;
    
    blendedPedidos.forEach(p => {
      const { reqQty, fulQty, isCompleted, hasReplacement } = getPedidoHiringStatus(p, replacementTargets);
      
      const isPending = !isCompleted || hasReplacement;
      if (isPending) {
        activeOrders++;
        openVacancies += Math.max(0, reqQty - fulQty);
        
        if (p.expected_start_date) {
          const today = new Date();
          today.setHours(0,0,0,0);
          const startDate = new Date(p.expected_start_date);
          startDate.setHours(0,0,0,0);
          
          const diffTime = startDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= 5) {
            urgentCount++;
          }
        }
      }
    });

    return {
      openVacancies,
      activeOrders,
      urgentCount
    };
  }, [blendedPedidos, replacementTargets]);

  // Filtered pedidos for sidebar list
  const filteredPedidos = useMemo(() => {
    return blendedPedidos.filter(p => {
      const { isCompleted, hasReplacement } = getPedidoHiringStatus(p, replacementTargets);

      // 1. Status Filter
      if (statusFilter === 'pending') {
        if (isCompleted && !hasReplacement) return false;
      } else if (statusFilter === 'completed') {
        if (!isCompleted || hasReplacement) return false;
      }

      // 2. Client Filter
      if (clientFilter !== 'all' && p.client_id !== clientFilter) {
        return false;
      }

      // 3. Profile Filter
      if (profileFilter !== 'all') {
        const hasProfile = p.pedido_items?.some((item: any) => {
          const name = item.job_function_name_snapshot || item.job_function?.name;
          return name === profileFilter;
        });
        if (!hasProfile) return false;
      }

      // 4. General Search (Client trade name, legal name, code, site name)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const clientTradeName = (p.client?.trade_name || '').toLowerCase();
        const clientLegalName = (p.client?.legal_name || '').toLowerCase();
        const code = (p.codigo || '').toLowerCase();
        const siteName = (p.client_site?.name || '').toLowerCase();
        
        const matchesBasic = clientTradeName.includes(query) || 
                             clientLegalName.includes(query) || 
                             code.includes(query) || 
                             siteName.includes(query);
        if (!matchesBasic) return false;
      }

      // 5. Worker Search
      if (workerSearch) {
        const query = workerSearch.toLowerCase();
        const hasHiredWorker = allAllocations.some(a => 
          (a.pedido_id === p.id || (p.isSynthetic && a.solicitud_id === p.solicitud_id)) && 
          a.worker?.nome?.toLowerCase().includes(query)
        );
        if (!hasHiredWorker) return false;
      }

      return true;
    });
  }, [blendedPedidos, replacementTargets, statusFilter, clientFilter, profileFilter, searchQuery, workerSearch, allAllocations]);

  // Automatically select the first Pedido if none is selected, or if the selected one is filtered out
  React.useEffect(() => {
    if (filteredPedidos.length > 0) {
      const isStillVisible = filteredPedidos.some(p => p.id === selectedPedidoId);
      if (!isStillVisible) {
        setSelectedPedidoId(filteredPedidos[0].id);
      }
    } else {
      setSelectedPedidoId(null);
    }
  }, [filteredPedidos, selectedPedidoId]);

  const handleOpenAllocateDialog = (item: any) => {
    if (!selectedPedido) return;

    // Find if there is a pending replacement target for this item
    const repTarget = selectedPedido.isSynthetic 
      ? replacementTargets.find(t => t.id === item.solicitud_target_id)
      : replacementTargets.find(t => t.source_pedido_item_id === item.id);

    const targetJobFuncId = repTarget?.target_job_function_id || item.job_function_id;
    const targetJobFuncName = repTarget?.target_job_function_name || item.job_function_name_snapshot || item.job_function?.name || 'Função';

    setSelectedPosition({
      id: item.id,
      pedido_id: selectedPedido.id,
      pedido_codigo: selectedPedido.codigo,
      client_id: selectedPedido.client_id,
      client_name: selectedPedido.client?.trade_name || selectedPedido.client?.legal_name || 'Cliente',
      client_site_id: selectedPedido.client_site_id,
      site_name: selectedPedido.client_site?.name || 'Local',
      job_function_id: targetJobFuncId,
      job_function_name: targetJobFuncName,
      expected_start_date: selectedPedido.expected_start_date,
      quantity_requested: item.quantity_requested,
      quantity_fulfilled: item.quantity_fulfilled,
      status: item.status,
      pergunta_respuesta: repTarget?.solicitud?.pergunta_respuesta || selectedPedido.pergunta_respuesta,
      base_cost_hour_snapshot: item.base_cost_hour_snapshot,
      solicitud_id: selectedPedido.isSynthetic ? selectedPedido.solicitud_id : (repTarget?.solicitud_id || undefined),
      replacement_due_date: repTarget?.solicitud?.due_date || undefined,
      isSynthetic: selectedPedido.isSynthetic || false,
      empresa_id: selectedPedido.empresa_id
    });
    
    setIsDialogOpen(true);
  };

  return (
    <div className="p-6 max-w-[1700px] mx-auto flex flex-col space-y-6 h-[calc(100vh-80px)] overflow-hidden font-sans">
      
      {/* Header and Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-850 dark:text-white flex items-center">
            <Users className="mr-2 h-7 w-7 text-indigo-600" />
            Contratação Inicial & Operações
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Aloque trabalhadores para as vagas abertas dos pedidos e verifique tamanhos de roupa, CNH e tarifas.
          </p>
        </div>

        {/* Stat Badges */}
        <div className="flex space-x-3 text-xs">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-2 flex items-center space-x-2">
            <Users className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Vagas em Aberto</p>
              <p className="font-bold text-slate-800 dark:text-white text-sm">{isLoadingPedidos ? '-' : totals.openVacancies}</p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl px-4 py-2 flex items-center space-x-2">
            <Briefcase className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Pedidos Ativos</p>
              <p className="font-bold text-slate-800 dark:text-white text-sm">{isLoadingPedidos ? '-' : totals.activeOrders}</p>
            </div>
          </div>

          <div className={`border rounded-xl px-4 py-2 flex items-center space-x-2 transition-all ${
            totals.urgentCount > 0 
              ? 'bg-rose-550/10 dark:bg-rose-955/20 border-rose-300 dark:border-rose-900 animate-pulse'
              : 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-900'
          }`}>
            <Clock className={`h-4 w-4 ${totals.urgentCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Pedidos Urgentes</p>
              <p className={`font-bold text-sm ${totals.urgentCount > 0 ? 'text-rose-650 dark:text-rose-455' : 'text-slate-700'}`}>
                {isLoadingPedidos ? '-' : totals.urgentCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {/* Left Sidebar: Pedidos List */}
        <div className="w-80 md:w-96 flex flex-col border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shrink-0 overflow-hidden shadow-sm">
          
          {/* Advanced Filters Area */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-3 shrink-0">
            
            {/* Status tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`flex-1 py-1 text-center font-semibold rounded-md transition-all ${statusFilter === 'pending' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Pendentes
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`flex-1 py-1 text-center font-semibold rounded-md transition-all ${statusFilter === 'completed' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Concluídos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`flex-1 py-1 text-center font-semibold rounded-md transition-all ${statusFilter === 'all' ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Todos
              </button>
            </div>

            {/* General Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar cliente ou código..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Worker Search */}
            <div className="relative">
              <Users className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar trabalhador alocado..."
                value={workerSearch}
                onChange={e => setWorkerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Cliente</label>
                <select
                  value={clientFilter}
                  onChange={e => setClientFilter(e.target.value)}
                  className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-md text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Todos</option>
                  {clientsList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Perfil</label>
                <select
                  value={profileFilter}
                  onChange={e => setProfileFilter(e.target.value)}
                  className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-md text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Todos</option>
                  {profilesList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Pedidos List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
            {isLoadingPedidos ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-2 text-slate-400">
                <Loader2 className="animate-spin h-6 w-6 text-indigo-500" />
                <span className="text-xs">Carregando pedidos...</span>
              </div>
            ) : filteredPedidos.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-10">Nenhum pedido ativo encontrado.</p>
            ) : (
              filteredPedidos.map(pedido => {
                const urgent = isPedidoUrgent(pedido);
                const isSelected = pedido.id === selectedPedidoId;
                const clientName = pedido.client?.trade_name || pedido.client?.legal_name || 'Cliente';
                const dateStr = pedido.expected_start_date 
                  ? new Date(pedido.expected_start_date).toLocaleDateString('pt-PT') 
                  : 'N/A';
                
                // Calculate progress with replacements
                const { reqQty, fulQty, isCompleted, hasReplacement } = getPedidoHiringStatus(pedido, replacementTargets);
                
                const progressBadge = isCompleted && !hasReplacement
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900' 
                  : hasReplacement
                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900'
                    : 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900';

                let itemBgClass = '';
                let borderLeftClass = '';
                
                if (isSelected) {
                  itemBgClass = 'bg-indigo-50/10 dark:bg-indigo-950/10';
                  borderLeftClass = 'border-indigo-650';
                } else if (urgent) {
                  itemBgClass = 'bg-rose-50/30 dark:bg-rose-950/5 hover:bg-rose-50/50 dark:hover:bg-rose-950/10';
                  borderLeftClass = 'border-rose-500';
                } else {
                  itemBgClass = 'hover:bg-slate-50 dark:hover:bg-slate-800/40';
                  borderLeftClass = 'border-transparent';
                }

                return (
                  <button
                    key={pedido.id}
                    onClick={() => setSelectedPedidoId(pedido.id)}
                    className={`w-full text-left p-4 flex items-center justify-between transition-all border-l-4 ${itemBgClass} ${borderLeftClass}`}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-indigo-650 dark:text-indigo-400">{pedido.codigo}</span>
                        <div className="flex items-center">
                          {urgent && (
                            <span className="text-[9px] text-rose-600 dark:text-rose-455 font-bold flex items-center bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.2 rounded mr-1.5 border border-rose-200 dark:border-rose-900/40">
                              <Clock className="mr-0.5 h-2.5 w-2.5 animate-pulse" />
                              Urgente
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-slate-400 flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            {dateStr}
                          </span>
                        </div>
                      </div>
                      <p className="font-bold text-sm text-slate-850 dark:text-white truncate mt-1">{clientName}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {pedido.client_site?.name || 'Local não definido'}
                      </p>
                      {hasReplacement && (() => {
                        const pedidoReplacements = replacementTargets.filter(t => 
                          pedido.pedido_items?.some((item: any) => item.id === t.source_pedido_item_id)
                        );
                        const replacementDates = pedidoReplacements
                          .map(t => t.solicitud?.due_date)
                          .filter(Boolean)
                          .map(d => new Date(d));
                        const replacementDateStr = replacementDates.length > 0
                          ? new Date(Math.min(...replacementDates.map(d => d.getTime()))).toLocaleDateString('pt-PT')
                          : '';
                        return (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40 mt-1">
                            <AlertTriangle className="h-2.5 w-2.5 text-purple-650" />
                            Reemplazo Pendente{replacementDateStr ? ` (Início: ${replacementDateStr})` : ''}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${progressBadge}`}>
                        {fulQty}/{reqQty} Contr.
                      </span>
                      <ChevronRight className={`h-4 w-4 mt-2 text-slate-300 transition-transform ${isSelected ? 'text-indigo-600 translate-x-1' : ''}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Selected Pedido Details */}
        <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-y-auto shadow-sm p-6 space-y-6">
          
          {selectedPedido ? (
            <>
              {/* Card 1: Pedido Details Header */}
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-3 gap-2">
                  <div>
                    <span className={`${selectedPedido.isSynthetic ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200'} text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border`}>
                      {selectedPedido.isSynthetic ? 'Substituição Operativa' : 'Pedido Comercial'}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {selectedPedido.client?.trade_name || selectedPedido.client?.legal_name || 'Cliente'}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-indigo-650 dark:text-indigo-400">{selectedPedido.codigo}</span>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                      Status Operacional: <strong className="text-slate-700 dark:text-slate-350">{selectedPedido.operational_status}</strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4.5 w-4.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-500">Ubicación / Obra</span>
                      <p className="font-medium text-slate-800 dark:text-slate-100 mt-0.5">
                        {selectedPedido.client_site?.address_line ? (
                          <>
                            {selectedPedido.client_site.address_line}
                            {selectedPedido.client_site.city && `, ${selectedPedido.client_site.city}`}
                            {selectedPedido.client_site.postal_code && ` (${selectedPedido.client_site.postal_code})`}
                          </>
                        ) : 'Não definido'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Calendar className="h-4.5 w-4.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-500">Período Previsto</span>
                      <p className="font-medium text-slate-800 dark:text-slate-100 mt-0.5">
                        {selectedPedido.expected_start_date ? new Date(selectedPedido.expected_start_date).toLocaleDateString('pt-PT') : 'N/A'} 
                        {' '} até {' '}
                        {selectedPedido.expected_end_date ? new Date(selectedPedido.expected_end_date).toLocaleDateString('pt-PT') : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Briefcase className="h-4.5 w-4.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-500">Observações Gerais</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 italic max-h-[60px] overflow-y-auto">
                        {selectedPedido.notes || 'Sem observações gerais.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Required Functions Grid (Vagas) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                    <Award className="mr-1.5 h-4.5 w-4.5 text-indigo-500" />
                    Vagas por Perfil / Função
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">Selecione para contratar</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedPedido.pedido_items?.map((item: any) => {
                    const itemReplacements = replacementTargets.filter(t => t.source_pedido_item_id === item.id);
                    const repCount = itemReplacements.length;
                    const firstRep = itemReplacements[0];
                    const effectiveFulfilled = Math.max(0, (item.quantity_fulfilled || 0) - repCount);
                    const isItemFulfilled = effectiveFulfilled >= (item.quantity_requested || 0);
                    const progress = item.quantity_requested > 0 
                      ? Math.min(100, Math.round((effectiveFulfilled / item.quantity_requested) * 100))
                      : 0;

                    const isReplacement = repCount > 0 || item.isReplacementItem;

                    return (
                      <div 
                        key={item.id} 
                        className={`border rounded-xl p-4 flex flex-col justify-between space-y-4 hover:shadow-md transition-all ${
                          isItemFulfilled 
                            ? 'bg-emerald-50/10 border-emerald-150 dark:bg-emerald-950/5 dark:border-emerald-950' 
                            : isReplacement
                              ? 'bg-purple-50/10 border-purple-200 dark:bg-purple-950/5 dark:border-purple-900/50'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h4 className="font-bold text-sm text-slate-850 dark:text-white truncate">
                                {item.job_function_name_snapshot || item.job_function?.name || 'Perfil'}
                              </h4>
                              {(() => {
                                const qas = getProfileQuestions(selectedPedido.pergunta_respuesta, item.job_function_name_snapshot || item.job_function?.name);
                                if (qas.length === 0) return null;
                                return (
                                  <TooltipProvider>
                                    <Tooltip delayDuration={100}>
                                      <TooltipTrigger asChild>
                                        <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                                          <HelpCircle className="h-3.5 w-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs bg-slate-900 border border-slate-800 text-white p-3 rounded-lg shadow-lg">
                                        <div className="space-y-2 text-xs">
                                          <p className="font-bold border-b border-slate-800 pb-1 text-slate-350">Respostas da Viabilidade:</p>
                                          {qas.map((qa: any, idx: number) => (
                                            <div key={idx} className="space-y-0.5">
                                              <span className="text-slate-400 font-medium block">{qa.pergunta}</span>
                                              <span className="text-white font-semibold block">{qa.resposta}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })()}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isItemFulfilled 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                : isReplacement
                                  ? 'bg-purple-50 text-purple-755 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400'
                                  : 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/40 dark:text-amber-400'
                            }`}>
                              {item.isReplacementItem 
                                ? 'Reemplazo Pendente' 
                                : `${effectiveFulfilled} de ${item.quantity_requested} Contratados ${repCount > 0 ? `(${repCount} p. reimplacar)` : ''}`}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${isItemFulfilled ? 'bg-emerald-550' : isReplacement ? 'bg-purple-500' : 'bg-amber-500'}`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>

                          {isReplacement && (() => {
                            const repDate = (firstRep?.solicitud?.due_date || selectedPedido.expected_start_date)
                              ? new Date(firstRep?.solicitud?.due_date || selectedPedido.expected_start_date).toLocaleDateString('pt-PT')
                              : '';
                            const workerName = item.replaced_worker?.nome || 'Trabalhador';
                            const workerCod = item.replaced_worker?.cod_colab ? ` (Cód: ${item.replaced_worker.cod_colab})` : '';
                            const reasonStr = item.reason ? ` Motivo: ${item.reason}.` : '';
                            return (
                              <div className="mt-3 flex flex-col gap-1 text-[10px] text-purple-700 dark:text-purple-400 bg-purple-50/40 dark:bg-purple-950/15 p-2 rounded-lg border border-purple-200/40">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <AlertTriangle className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                  <span>Substituição Pendente</span>
                                </div>
                                <p className="mt-1">
                                  Substituir: <strong>{workerName}</strong>{workerCod}.
                                </p>
                                {reasonStr && <p className="text-slate-500">{reasonStr}</p>}
                                {repDate && <p className="mt-1 font-semibold text-purple-700 dark:text-purple-400">Data de início esperada: {repDate}</p>}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex justify-between items-center text-xs pt-1">
                          <div className="space-y-1.5 text-slate-500">
                            <p>EPI: {item.includes_epi ? 'Incluso' : 'Não incluso'}</p>
                            <p>Alojamento: {item.includes_housing ? 'Incluso' : 'Não incluso'}</p>
                            {item.base_cost_hour_snapshot && (
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-400">Tarifa Orçada:</span>
                                <span className="font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/45 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 text-xs shadow-sm">
                                  {Number(item.base_cost_hour_snapshot).toFixed(2)} €/h
                                </span>
                              </div>
                            )}
                          </div>

                          <Button
                            size="sm"
                            disabled={isItemFulfilled}
                            onClick={() => handleOpenAllocateDialog(item)}
                            className={`h-8 text-xs font-semibold ${
                              isItemFulfilled 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                                : isReplacement
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                            }`}
                          >
                            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                            {isReplacement ? '+ Substituir' : '+ Contratar'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 3: Currently Hired Workers */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                    <CheckCircle2 className="mr-1.5 h-4.5 w-4.5 text-emerald-600" />
                    Pessoas Contratadas
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Total: {allocations.filter(a => a.status !== 'replaced' && a.status !== 'relocated' && a.status !== 'terminated').length} ativo(s)
                    {allocations.some(a => a.status === 'replaced' || a.status === 'relocated' || a.status === 'terminated') && ` (${allocations.filter(a => a.status === 'replaced' || a.status === 'relocated' || a.status === 'terminated').length} histórico)`}
                  </span>
                </div>

                {isLoadingAllocations ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : allocations.length === 0 ? (
                  <div className="text-center py-10 border rounded-xl bg-slate-50/20 dark:bg-slate-950/10 border-dashed">
                    <p className="text-xs text-muted-foreground">Nenhum trabalhador contratado/alocado para este pedido ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allocations.map((alloc: any) => {
                      const worker = alloc.worker || {};
                      const isTerminated = alloc.status === 'replaced' || alloc.status === 'relocated' || alloc.status === 'terminated';
                      const needsReplacement = replacementMap.has(alloc.id);

                      let cardClass = 'border rounded-xl p-4 space-y-3 hover:shadow-sm transition-all ';
                      if (isTerminated) {
                        cardClass += 'border-slate-200 dark:border-slate-800 bg-slate-100/35 dark:bg-slate-900/20 opacity-65 grayscale';
                      } else if (needsReplacement) {
                        cardClass += 'border-purple-200 dark:border-purple-900/50 bg-purple-50/25 dark:bg-purple-950/5 hover:bg-purple-50/40 dark:hover:bg-purple-950/10';
                      } else {
                        cardClass += 'border-slate-100 dark:border-slate-800 bg-slate-50/25 dark:bg-slate-950/10 hover:bg-slate-50 dark:hover:bg-slate-950/20';
                      }

                      return (
                        <div key={alloc.id} className={cardClass}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-sm text-slate-850 dark:text-white">{worker.nome || 'Desconhecido'}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Cód: {worker.cod_colab || 'N/A'} • NIF: {worker.nif || 'Não informado'}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <div className="flex items-center gap-1.5">
                                {!isTerminated && (
                                  <button
                                    onClick={() => setAllocationToCancel({ id: alloc.id, workerName: worker.nome || 'Desconhecido' })}
                                    className="text-xs text-rose-500 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 p-1 rounded transition-colors border border-rose-200 dark:border-rose-900/50"
                                    title="Cancelar contratação / Desistência"
                                  >
                                    <X size={13} />
                                  </button>
                                )}
                                <span className={isTerminated 
                                  ? "bg-slate-150 text-slate-650 border border-slate-250 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                  : "bg-indigo-50 text-indigo-755 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900"
                                }>
                                  {alloc.job_function_name_snapshot || 'Perfil'}
                                </span>
                              </div>
                              {isTerminated && (
                                <span className="bg-slate-200 text-slate-700 border border-slate-350 text-[9px] font-black px-2 py-0.5 rounded-full dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 flex items-center gap-1 shrink-0">
                                  Histórico / Substituído
                                </span>
                              )}
                              {needsReplacement && !isTerminated && (
                                <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-black px-2 py-0.5 rounded-full dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-900/40 flex items-center gap-1 shrink-0">
                                  <AlertTriangle className="h-2.5 w-2.5 text-purple-650 shrink-0" />
                                  Reemplazo Solicitado
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Specific hiring fields: sizes, driving license, rate */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800">
                            
                            <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                              <Shirt className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-500">Camisa:</span>
                              <span className="font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                {worker.camiseta || 'N/A'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                              <Shirt className="h-3.5 w-3.5 text-slate-400 shrink-0 transform rotate-180" />
                              <span className="font-semibold text-slate-500">Calça:</span>
                              <span className="font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                {worker.pantalones || 'N/A'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                              <Shield className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-500">CNH:</span>
                              <span className={`font-bold px-1.5 py-0.2 rounded ${worker.licencia_conducir === 'Si' ? 'text-emerald-700 bg-emerald-100/50' : 'text-slate-600 bg-slate-100'}`}>
                                {worker.licencia_conducir || 'No'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-500">Celular:</span>
                              <span className="font-bold text-slate-800 dark:text-white truncate">
                                {worker.movil || 'Não informado'}
                              </span>
                            </div>

                            <div className="col-span-2 flex justify-between items-center pt-1 border-t border-slate-100/40 border-dashed">
                              <div className="flex items-center space-x-1.5 text-slate-655 dark:text-slate-400">
                                <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-500">Tarifa Acordada:</span>
                                <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                                  {alloc.tarifa_acordada ? `${Number(alloc.tarifa_acordada).toFixed(2)} €/h` : 'N/A'}
                                </span>
                              </div>
                              {!isTerminated && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyTeamsText(alloc)}
                                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 px-2.5 py-1 rounded border border-indigo-200 dark:border-indigo-900/60 transition-colors shrink-0 shadow-sm"
                                  title="Copiar dados formatados para colar no Teams"
                                >
                                  <Copy className="h-3 w-3 shrink-0" />
                                  Teams
                                </button>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
              <Users className="h-16 w-16 text-slate-300 dark:text-slate-700" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nenhum Pedido Selecionado</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Selecione um pedido na barra lateral esquerda para visualizar os cargos necessários e iniciar as alocações.
              </p>
            </div>
          )}

        </div>

      </div>

      <AllocateWorkerDialog 
        isOpen={isDialogOpen} 
        onClose={() => {
          setIsDialogOpen(false);
          refetchPedidos();
          refetchAllocations();
          refetchReplacementTargets();
        }} 
        position={selectedPosition} 
      />

      <CancelAllocationDialog
        isOpen={!!allocationToCancel}
        onClose={() => setAllocationToCancel(null)}
        onConfirm={handleCancelAllocation}
        workerName={allocationToCancel?.workerName || ''}
        isPending={isCancelPending}
      />
    </div>
  );
};
