import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Building2,
  MapPin,
  Phone,
  CreditCard,
  Check,
  ChevronDown,
  X,
  Plus
} from 'lucide-react';
import type { Provedor, Alojamento } from '../services/logisticsService';

/**
 * Normaliza texto removendo acentos/diacríticos e convertendo para minúsculas.
 */
export function normalizeSearchText(text?: string | number | null): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Verifica busca parcial multi-palavra (insensível a acentos e maiúsculas/minúsculas).
 * Basta digitar parte de uma ou mais palavras em qualquer ordem para encontrar o registro.
 */
export function matchesPartialSearch(
  query: string,
  fields: Array<string | number | undefined | null> | string | number | undefined | null
): boolean {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return true;

  const tokens = normQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const fieldList = Array.isArray(fields) ? fields : [fields];
  const combinedHaystack = fieldList.map(f => normalizeSearchText(f)).join(' ');
  return tokens.every(token => combinedHaystack.includes(token));
}

interface ProvedorSearchComboboxProps {
  provedores: Provedor[];
  selectedProvedorId: string;
  onSelectProvedor: (provedorId: string) => void;
  onCreateNewClick?: () => void;
  errorMessage?: string;
}

export const ProvedorSearchCombobox: React.FC<ProvedorSearchComboboxProps> = ({
  provedores,
  selectedProvedorId,
  onSelectProvedor,
  onCreateNewClick,
  errorMessage
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProvedor = useMemo(
    () => provedores.find(p => p.id === selectedProvedorId) || null,
    [provedores, selectedProvedorId]
  );

  // Filtragem parcial inteligente em todos os campos do provedor
  const filteredProvedores = useMemo(() => {
    const filtered = provedores.filter(p =>
      matchesPartialSearch(searchTerm, [
        p.nome_razao_social,
        p.nome_comercial,
        p.codigo,
        p.municipio,
        p.provincia,
        p.endereco,
        p.codigo_postal,
        p.cif_nif,
        p.contato_nome,
        p.telefone,
        p.email,
        p.iban
      ])
    );

    return filtered.sort((a, b) =>
      (a.nome_razao_social || '').localeCompare(b.nome_razao_social || '', 'es', {
        sensitivity: 'base'
      })
    );
  }, [provedores, searchTerm]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm, isOpen]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
  };

  const handleSelect = (prov: Provedor) => {
    onSelectProvedor(prov.id);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectProvedor('');
    setSearchTerm('');
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < filteredProvedores.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = filteredProvedores[highlightedIndex];
      if (chosen) {
        handleSelect(chosen);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Campo Principal / Trigger ou Input de Busca */}
      {!isOpen && selectedProvedor ? (
        <div
          onClick={handleOpen}
          className="w-full px-3 py-2 bg-blue-50/50 dark:bg-slate-800 border border-blue-300 dark:border-blue-800 hover:border-blue-500 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-all shadow-2xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 size={14} className="text-blue-600 flex-shrink-0" />
            <span className="truncate font-bold text-slate-800 dark:text-white">
              {selectedProvedor.nome_razao_social}
            </span>
            {selectedProvedor.municipio && (
              <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold flex-shrink-0">
                {selectedProvedor.municipio}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-red-500 rounded transition-colors"
              title="Cambiar o limpiar proveedor"
            >
              <X size={14} />
            </button>
            <ChevronDown size={14} className="text-slate-400" />
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onFocus={() => setIsOpen(true)}
            onChange={e => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedProvedor
                ? `${selectedProvedor.nome_razao_social} (Escriba para buscar otro...)`
                : 'Escriba parte del nombre, ciudad, CIF o código para buscar...'
            }
            className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpen(prev => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <ChevronDown size={14} />
            </button>
          )}
        </div>
      )}

      {errorMessage && (
        <p className="text-red-500 text-[10px] mt-1">{errorMessage}</p>
      )}

      {/* Dropdown de Resultados Filtrados */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-100">
          {/* Subheader com contador */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>
              {searchTerm.trim()
                ? `${filteredProvedores.length} proveedor(es) encontrado(s)`
                : `${provedores.length} proveedores disponibles (escriba para filtrar)`}
            </span>
            {onCreateNewClick && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onCreateNewClick();
                }}
                className="text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-0.5 font-bold"
              >
                <Plus size={11} />
                Nuevo Proveedor
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredProvedores.length > 0 ? (
              filteredProvedores.map((p, idx) => {
                const isSelected = p.id === selectedProvedorId;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(p)}
                    className={`w-full text-left px-3.5 py-2.5 transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/50'
                        : isHighlighted
                        ? 'bg-slate-100/80 dark:bg-slate-800/80'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {p.nome_razao_social}
                        </span>
                        {p.codigo && (
                          <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[9px] font-bold rounded">
                            {p.codigo}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        {(p.municipio || p.provincia) && (
                          <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-semibold">
                            <MapPin size={10} />
                            {[p.municipio, p.provincia].filter(Boolean).join(', ')}
                          </span>
                        )}
                        {p.cif_nif && <span>CIF: {p.cif_nif}</span>}
                        {p.telefone && (
                          <span className="inline-flex items-center gap-0.5">
                            <Phone size={9} />
                            {p.telefone}
                          </span>
                        )}
                        {p.metodo_pago && (
                          <span className="inline-flex items-center gap-0.5 text-purple-600 dark:text-purple-400">
                            <CreditCard size={9} />
                            {p.metodo_pago}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={15} className="text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-5 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-500">
                  No se encontró ningún proveedor con "{searchTerm}"
                </p>
                {onCreateNewClick && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onCreateNewClick();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <Plus size={13} />
                    + Registrar Nuevo Proveedor
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface AlojamentoQuickComboboxProps {
  alojamentos: Alojamento[];
  selectedAlojamentoId: string;
  onSelectAlojamento: (alojamentoId: string) => void;
  alocacoes?: any[];
}

export const AlojamentoQuickCombobox: React.FC<AlojamentoQuickComboboxProps> = ({
  alojamentos,
  selectedAlojamentoId,
  onSelectAlojamento,
  alocacoes = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clienteFilter, setClienteFilter] = useState<string>('TODOS');
  const [apenasComOcupantes, setApenasComOcupantes] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mapear ocupantes e clientes ativos por alojamento
  const ocupacaoPorAlojamento = useMemo(() => {
    const map: Record<string, { ocupantes: any[]; clientes: string[]; obras: string[] }> = {};
    for (const a of alojamentos) {
      const ocs = (alocacoes || []).filter(
        al =>
          al.status !== 'Checkout' &&
          (al.alojamento_id === a.id ||
            (a.codigo && al.alojamento_codigo === a.codigo) ||
            (a.nome && al.alojamento_nome && al.alojamento_nome.toLowerCase() === a.nome.toLowerCase()))
      );
      const clientes = Array.from(new Set(ocs.map((o: any) => o.cliente_nome).filter(Boolean))) as string[];
      const obras = Array.from(new Set(ocs.map((o: any) => o.obra_nome).filter(Boolean))) as string[];
      map[a.id] = { ocupantes: ocs, clientes, obras };
    }
    return map;
  }, [alojamentos, alocacoes]);

  // Lista única de clientes que possuem trabalhadores alojados atualmente
  const clientesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    Object.values(ocupacaoPorAlojamento).forEach(info => {
      info.clientes.forEach(c => set.add(c));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [ocupacaoPorAlojamento]);

  const selectedAloj = useMemo(
    () => alojamentos.find(a => a.id === selectedAlojamentoId) || null,
    [alojamentos, selectedAlojamentoId]
  );

  const filteredAlojamentos = useMemo(() => {
    return alojamentos.filter(a => {
      const info = ocupacaoPorAlojamento[a.id] || { ocupantes: [], clientes: [], obras: [] };
      if (apenasComOcupantes && info.ocupantes.length === 0) return false;
      if (clienteFilter !== 'TODOS' && !info.clientes.some(c => c.toLowerCase() === clienteFilter.toLowerCase())) {
        return false;
      }
      return matchesPartialSearch(searchTerm, [
        a.codigo,
        a.nome,
        a.titulo,
        a.municipio,
        a.provincia,
        a.endereco,
        a.provedor?.nome_razao_social,
        a.tipo_alojamento,
        ...info.clientes,
        ...info.obras,
        ...info.ocupantes.map((o: any) => o.worker_nome),
        ...info.ocupantes.map((o: any) => o.codigo_colab)
      ]);
    });
  }, [alojamentos, searchTerm, ocupacaoPorAlojamento, clienteFilter, apenasComOcupantes]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedInfo = selectedAloj ? ocupacaoPorAlojamento[selectedAloj.id] : null;

  return (
    <div ref={containerRef} className="relative w-full space-y-2">
      {/* Barra de Filtro Rápido por Cliente Contratado no Alojamento */}
      {alocacoes && alocacoes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-blue-200/70 dark:border-blue-900/50">
          <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
            🏢 Filtrar por Cliente no Alojamento:
          </span>
          <select
            value={clienteFilter}
            onChange={e => {
              setClienteFilter(e.target.value);
              if (!selectedAloj) setIsOpen(true);
            }}
            className="flex-1 min-w-[180px] px-2.5 py-1 bg-blue-50/70 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos los Clientes ({alojamentos.length} inmuebles)</option>
            {clientesDisponiveis.map(cli => {
              const countAloj = alojamentos.filter(a => ocupacaoPorAlojamento[a.id]?.clientes.includes(cli)).length;
              return (
                <option key={cli} value={cli}>
                  🏢 {cli} ({countAloj} alojamiento{countAloj !== 1 ? 's' : ''})
                </option>
              );
            })}
          </select>
          <button
            type="button"
            onClick={() => {
              setApenasComOcupantes(prev => !prev);
              if (!selectedAloj) setIsOpen(true);
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
              apenasComOcupantes
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
          >
            👥 Solo con Alojados
          </button>
          {(clienteFilter !== 'TODOS' || apenasComOcupantes) && (
            <button
              type="button"
              onClick={() => {
                setClienteFilter('TODOS');
                setApenasComOcupantes(false);
              }}
              className="text-[10px] font-bold text-red-500 hover:underline px-1"
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {!isOpen && selectedAloj ? (
        <div
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 10);
          }}
          className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 hover:border-blue-500 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="px-1.5 py-0.5 bg-blue-600 text-white font-mono text-[10px] font-bold rounded flex-shrink-0">
              {selectedAloj.codigo}
            </span>
            <span className="truncate font-bold text-slate-900 dark:text-white">
              {selectedAloj.nome}
            </span>
            {selectedAloj.municipio && (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 flex-shrink-0">
                ({selectedAloj.municipio})
              </span>
            )}
            {selectedInfo && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                  selectedInfo.ocupantes.length > 0
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                👥 {selectedInfo.ocupantes.length}/{selectedAloj.capacidade || 0} alojados
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onSelectAlojamento('');
                setSearchTerm('');
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 10);
              }}
              className="p-0.5 text-slate-400 hover:text-red-500 rounded"
            >
              <X size={14} />
            </button>
            <ChevronDown size={14} className="text-slate-400" />
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onFocus={() => setIsOpen(true)}
            onChange={e => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            placeholder="Escriba nombre, código (ej: 1059), ciudad, proveedor, cliente o trabajador alojado..."
            className="w-full pl-8 pr-8 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpen(prev => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <ChevronDown size={14} />
            </button>
          )}
        </div>
      )}

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 flex items-center justify-between">
            <span>
              {searchTerm.trim() || clienteFilter !== 'TODOS' || apenasComOcupantes
                ? `${filteredAlojamentos.length} alojamiento(s) encontrado(s)`
                : `${alojamentos.length} alojamientos (escriba para filtrar por piso, cliente o trabajador)`}
            </span>
            {clienteFilter !== 'TODOS' && (
              <span className="text-blue-600 dark:text-blue-400 font-black">
                Filtro: {clienteFilter}
              </span>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredAlojamentos.slice(0, 80).map(a => {
              const info = ocupacaoPorAlojamento[a.id] || { ocupantes: [], clientes: [], obras: [] };
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onSelectAlojamento(a.id);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/70 dark:hover:bg-slate-800 transition-colors flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold rounded">
                        {a.codigo}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {a.nome}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          info.ocupantes.length > 0
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        👥 {info.ocupantes.length}/{a.capacidade || 0}
                      </span>
                      {a.valor_mensal_padrao ? (
                        <span className="text-[10px] font-bold text-slate-500">
                          • € {Number(a.valor_mensal_padrao).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center flex-wrap gap-2 mt-0.5">
                      {a.municipio && <span>📍 {a.municipio}</span>}
                      {a.provedor?.nome_razao_social && (
                        <span>🏠 {a.provedor.nome_razao_social}</span>
                      )}
                      {info.clientes.length > 0 && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                          🏢 Cliente(s): {info.clientes.join(', ')}
                        </span>
                      )}
                    </div>
                    {info.ocupantes.length > 0 && (
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">
                        👷 {info.ocupantes.map((o: any) => `${o.worker_nome}${o.codigo_colab ? ` [${o.codigo_colab}]` : ''}`).join(', ')}
                      </div>
                    )}
                  </div>
                  {a.id === selectedAlojamentoId && (
                    <Check size={14} className="text-blue-600 flex-shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
            {filteredAlojamentos.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">
                No se encontró ningún alojamiento con los filtros actuales
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
