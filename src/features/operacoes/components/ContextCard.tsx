
import React from 'react';
import {
  Building, FileText, User, HardHat, Database, ExternalLink, MapPin, Mail, Phone
} from 'lucide-react';
import type { IncidentContext, ContextLink } from '../types/models';

interface ContextCardProps {
  context?: IncidentContext;
  compact?: boolean;
}

export const ContextCard: React.FC<ContextCardProps> = ({ context, compact = false }) => {
  if (!context) return null;

  const { origin, client, pedido, worker, obra, extra } = context;

  // Renderiza um link individual com ícone
  const renderItem = (
    label: string,
    value?: string,
    icon?: React.ReactNode,
    link?: ContextLink,
    details?: { email?: string; phone?: string },
    colorClass: string = 'text-slate-600 dark:text-slate-300'
  ) => {
    if (!value) return null;

    const Content = () => (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} ${colorClass}`}>
        {icon && <span className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} opacity-70`}>{icon}</span>}
        <div className="flex-1 truncate">
          {!compact && <span className="block text-[10px] font-bold text-slate-400 uppercase leading-none mb-0.5">{label}</span>}
          <span className="font-medium truncate block" title={value}>{value}</span>
          {!compact && details && (
            <div className="mt-1 space-y-0.5">
              {details.email && <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-normal"><Mail size={10} /> {details.email}</div>}
              {details.phone && <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-normal"><Phone size={10} /> {details.phone}</div>}
            </div>
          )}
        </div>
        {!compact && link && <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />}
      </div>
    );

    if (link) {
      // Simula navegação ou link externo
      return (
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); /* Navegação mock */ alert(`Navegando para ${link.system} > ${link.table} > ${link.ref || link.sp_id}`); }}
          className="group block p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
        >
          <Content />
        </a>
      );
    }

    return <div className="p-1.5"><Content /></div>;
  };

  // --- MODO COMPACTO (Tabelas) ---
  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        {/* Origem */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit">
          <Database size={10} /> {origin?.ref || origin?.label || 'S/ Origem'}
        </div>
        {/* Itens Principais (Limitado para não poluir a tabela) */}
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          {client && (
            <span className="flex items-center gap-1" title={client.name}>
              <Building size={10} /> {client.name}
            </span>
          )}
          {pedido && (
            <span className="flex items-center gap-1" title={`Pedido: ${pedido.ref}`}>
              <FileText size={10} /> {pedido.ref}
            </span>
          )}
          {worker && (
            <span className="flex items-center gap-1" title={`Worker: ${worker.name}`}>
              <HardHat size={10} /> {worker.name}
            </span>
          )}
        </div>
      </div>
    );
  }

  // --- MODO DETALHADO (Card Completo) ---
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
      {/* Header: Origem */}
      <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-blue-600 dark:text-blue-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            Origem: {origin?.label || origin?.ref || 'Desconhecida'}
          </span>
        </div>
        {origin?.sp_id && <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">ID: {origin.sp_id}</span>}
      </div>

      {/* Grid de Entidades */}
      <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
        {client && renderItem('Cliente', client.name, <Building />, client.link, { email: client.email, phone: client.phone })}
        {pedido && renderItem('Pedido', pedido.ref, <FileText />, pedido.link)}
        {worker && renderItem('Colaborador', worker.name, <HardHat />, worker.link, { email: worker.email, phone: worker.phone })}
        {obra && renderItem('Obra/Projeto', obra.name, <MapPin />, obra.link)}
        {extra?.comercial && renderItem('Comercial', extra.comercial, <User />)}
      </div>
    </div>
  );
};
