import React, { useState, useRef } from 'react';
import {
  LayoutGrid,
  Plus,
  Minus,
  Trash2,
  Bed,
  Bath,
  Home,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Eye,
  X,
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  Maximize2,
  CheckCircle2,
  Info
} from 'lucide-react';
import { uploadDocumentoVistoria } from '../services/storageService';

export interface HabitacionCroquis {
  numero: number;
  nome?: string;
  camas: number;
  camas_simples?: number;
  camas_matrimonio?: number;
  posicao?: 'top' | 'right' | 'left' | 'bottom';
  observacao?: string;
}

export interface CroquisPlantaData {
  ativo?: boolean;
  habitaciones: HabitacionCroquis[];
  areas_comunes: {
    bano_completo: number;
    medio_bano: number;
    pasillo: boolean;
    cocina: boolean;
    sala: boolean;
    terraza?: boolean;
  };
  imagem_croquis_url?: string;
  observacoes_planta?: string;
}

export function buildDefaultCroquis(
  dormitorios: number = 3,
  totalCamas: number = 4,
  banheiros: number = 1
): CroquisPlantaData {
  const numRooms = Math.max(1, Number(dormitorios) || 1);
  const bedsTotal = Math.max(numRooms, Number(totalCamas) || numRooms);

  const habitaciones: HabitacionCroquis[] = [];
  let remainingBeds = bedsTotal;

  for (let i = 1; i <= numRooms; i++) {
    const roomsLeft = numRooms - i + 1;
    // Distribute beds so first room gets extra beds (like Hab Nº 1 = 2 Camas, Hab 2..N = 1 Cama)
    const bedsForThisRoom =
      i === 1 && remainingBeds > roomsLeft
        ? remainingBeds - (roomsLeft - 1)
        : Math.max(1, Math.floor(remainingBeds / roomsLeft));
    remainingBeds = Math.max(0, remainingBeds - bedsForThisRoom);

    habitaciones.push({
      numero: i,
      nome: `Hab Nº ${i}`,
      camas: bedsForThisRoom,
      camas_simples: bedsForThisRoom,
      camas_matrimonio: 0,
      posicao: i === 1 ? 'top' : 'right',
      observacao: ''
    });
  }

  return {
    ativo: true,
    habitaciones,
    areas_comunes: {
      bano_completo: Math.max(1, Number(banheiros) || 1),
      medio_bano: 0,
      pasillo: true,
      cocina: true,
      sala: true,
      terraza: false
    },
    imagem_croquis_url: '',
    observacoes_planta: ''
  };
}

interface CroquisPlantaAlojamentoProps {
  value: CroquisPlantaData;
  onChange?: (updated: CroquisPlantaData) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export const CroquisPlantaAlojamento: React.FC<CroquisPlantaAlojamentoProps> = ({
  value,
  onChange,
  readOnly = false,
  compact = false
}) => {
  const [isExpandedModal, setIsExpandedModal] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const habitaciones = Array.isArray(value?.habitaciones) ? value.habitaciones : [];
  const areas = value?.areas_comunes || {
    bano_completo: 1,
    medio_bano: 0,
    pasillo: true,
    cocina: true,
    sala: true,
    terraza: false
  };

  const totalCamasPiso = habitaciones.reduce((acc, h) => acc + (Number(h.camas) || 0), 0);
  const totalPersonasPiso = totalCamasPiso; // Regla: 1 cama (sea individual o matrimonio/doble) = 1 persona

  const emitChange = (next: CroquisPlantaData) => {
    if (onChange) onChange(next);
  };

  const handleAddHabitacion = () => {
    if (readOnly) return;
    const nextNum = habitaciones.length + 1;
    const novaHab: HabitacionCroquis = {
      numero: nextNum,
      nome: `Hab Nº ${nextNum}`,
      camas: 1,
      camas_simples: 1,
      camas_matrimonio: 0,
      posicao: nextNum === 1 ? 'top' : 'right',
      observacao: ''
    };
    emitChange({
      ...value,
      ativo: true,
      habitaciones: [...habitaciones, novaHab]
    });
  };

  const handleRemoveHabitacion = (index: number) => {
    if (readOnly || habitaciones.length <= 1) return;
    const filtered = habitaciones
      .filter((_, idx) => idx !== index)
      .map((h, idx) => ({
        ...h,
        numero: idx + 1,
        nome: `Hab Nº ${idx + 1}`
      }));
    emitChange({
      ...value,
      ativo: true,
      habitaciones: filtered
    });
  };

  const handleUpdateHabitacion = (index: number, patch: Partial<HabitacionCroquis>) => {
    if (readOnly) return;
    const nextList = habitaciones.map((h, idx) => {
      if (idx !== index) return h;
      const updated = { ...h, ...patch };
      if (updated.camas < 1) updated.camas = 1;
      return updated;
    });
    emitChange({
      ...value,
      ativo: true,
      habitaciones: nextList
    });
  };

  const handleUpdateAreas = (patch: Partial<CroquisPlantaData['areas_comunes']>) => {
    if (readOnly) return;
    emitChange({
      ...value,
      ativo: true,
      areas_comunes: {
        ...areas,
        ...patch
      }
    });
  };

  const handleUploadCroquisImage = async (file: File) => {
    try {
      setIsUploadingImg(true);
      const res = await uploadDocumentoVistoria(file, 'vistoria_entrada');
      emitChange({
        ...value,
        ativo: true,
        imagem_croquis_url: res.url
      });
    } catch (err: any) {
      alert('Error al subir imagen del croquis: ' + (err.message || 'Intente nuevamente'));
    } finally {
      setIsUploadingImg(false);
    }
  };

  const handlePasteImage = async (e: React.ClipboardEvent) => {
    if (readOnly) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await handleUploadCroquisImage(file);
          break;
        }
      }
    }
  };

  // Separar quartos por posição para o desenho arquitetônico estilo planta
  const topRooms = habitaciones.filter(h => (h.posicao || (h.numero === 1 ? 'top' : 'right')) === 'top');
  const rightRooms = habitaciones.filter(h => (h.posicao || (h.numero === 1 ? 'top' : 'right')) === 'right');
  const leftRooms = habitaciones.filter(h => h.posicao === 'left');
  const bottomRooms = habitaciones.filter(h => h.posicao === 'bottom');

  // Dividir rightRooms acima e abaixo da cozinha (como no croqui modelo: Hab 2 e Hab 3 acima da Cocina, Hab 4 abaixo da Cocina)
  const rightRoomsAboveKitchen =
    rightRooms.length > 1 ? rightRooms.slice(0, Math.ceil(rightRooms.length * 0.66)) : rightRooms;
  const rightRoomsBelowKitchen =
    rightRooms.length > 1 ? rightRooms.slice(Math.ceil(rightRooms.length * 0.66)) : [];

  const renderRoomBoxInPlan = (hab: HabitacionCroquis, extraClass: string = '') => {
    const realIndex = habitaciones.findIndex(h => h.numero === hab.numero);
    const camasLabel = `${hab.camas} ${hab.camas === 1 ? 'Cama' : 'Camas'}`;
    const habTitle = hab.nome || `Hab Nº ${hab.numero}`;

    return (
      <div
        key={hab.numero}
        className={`relative bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-200 p-2.5 flex flex-col items-center justify-center text-center transition-all group select-none ${
          !readOnly ? 'hover:bg-blue-50/70 dark:hover:bg-blue-950/40 cursor-pointer' : ''
        } ${extraClass}`}
        onClick={() => {
          if (!readOnly && realIndex >= 0) {
            // Ciclo rápido ou incremento
          }
        }}
      >
        <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-tight">
          <span>{camasLabel}</span>
          {hab.posicao === 'top' ? (
            <span>
              , <span className="underline decoration-2 underline-offset-2">{habTitle}</span>
            </span>
          ) : (
            <div className="underline decoration-2 underline-offset-2 mt-0.5">{habTitle}</div>
          )}
        </div>

        {hab.observacao && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            ({hab.observacao})
          </span>
        )}

        {/* Controles rápidos dentro da planta quando em modo edição */}
        {!readOnly && realIndex >= 0 && (
          <div
            onClick={e => e.stopPropagation()}
            className="mt-1.5 flex items-center gap-1 opacity-90 group-hover:opacity-100 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-300 dark:border-slate-700"
          >
            <button
              type="button"
              onClick={() => handleUpdateHabitacion(realIndex, { camas: Math.max(1, hab.camas - 1) })}
              className="w-4 h-4 flex items-center justify-center rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-rose-100 hover:text-rose-700 text-[10px] font-black shadow-2xs"
              title="Restar 1 cama"
            >
              -
            </button>
            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 px-1 flex items-center gap-0.5">
              <Bed size={10} /> {hab.camas}
            </span>
            <button
              type="button"
              onClick={() => handleUpdateHabitacion(realIndex, { camas: hab.camas + 1 })}
              className="w-4 h-4 flex items-center justify-center rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-emerald-100 hover:text-emerald-700 text-[10px] font-black shadow-2xs"
              title="Sumar 1 cama"
            >
              +
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderArchitecturalDiagram = (isLarge: boolean = false) => (
    <div
      className={`bg-white dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800 p-4 sm:p-5 flex flex-col items-center justify-between shadow-inner ${
        isLarge ? 'min-h-[460px]' : ''
      }`}
    >
      <div className="w-full max-w-[460px] mx-auto">
        {/* TOPO: Hab Nº 1 (ou quartos marcados como 'top') */}
        {topRooms.length > 0 && (
          <div className="grid grid-cols-12">
            <div className="col-span-8">
              <div className="grid grid-cols-1 gap-0">
                {topRooms.map(hab => renderRoomBoxInPlan(hab, 'min-h-[58px] -mb-[2px]'))}
              </div>
            </div>
            <div className="col-span-4" />
          </div>
        )}

        {/* CORPO CENTRAL DA PLANTA: Esquerda (Baños + Quartos Esq) | Centro (Pasillo + Sala) | Direita (Hab 2, Hab 3, Cocina, Hab 4) */}
        <div className="grid grid-cols-12 items-stretch">
          {/* COLUNA ESQUERDA + CENTRO (8 colunas para encaixar Pasillo e Sala em L) */}
          <div className="col-span-8 flex flex-col">
            {/* Parte Superior: Baños à esquerda + Pasillo à direita */}
            <div className="grid grid-cols-8 flex-1">
              {/* Coluna Esquerda do Pasillo: Baño Completo, 1/2 Baño e Quartos à esquerda */}
              <div className="col-span-4 flex flex-col justify-start py-2 space-y-2.5 pr-0">
                {Array.from({ length: areas.bano_completo || 0 }).map((_, idx) => (
                  <div
                    key={`bano-${idx}`}
                    className="bg-white dark:bg-slate-900 border-2 border-r-0 border-slate-900 dark:border-slate-200 p-2 text-center font-bold text-slate-900 dark:text-white text-xs leading-tight"
                  >
                    <div>Baño</div>
                    <div>completo{areas.bano_completo > 1 ? ` ${idx + 1}` : ''}</div>
                  </div>
                ))}

                {Array.from({ length: areas.medio_bano || 0 }).map((_, idx) => (
                  <div
                    key={`medio-bano-${idx}`}
                    className="bg-white dark:bg-slate-900 border-2 border-r-0 border-slate-900 dark:border-slate-200 py-1.5 px-2 text-center font-bold text-slate-900 dark:text-white text-xs"
                  >
                    1/2 Baño{areas.medio_bano > 1 ? ` ${idx + 1}` : ''}
                  </div>
                ))}

                {leftRooms.map(hab => renderRoomBoxInPlan(hab, 'border-r-0'))}
              </div>

              {/* Coluna do Pasillo */}
              <div className="col-span-4 border-2 border-b-0 border-slate-900 dark:border-slate-200 bg-white dark:bg-slate-900 flex items-center justify-center p-2 min-h-[145px]">
                <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight">
                  {areas.pasillo ? 'Pasillo' : 'Distribuidor'}
                </span>
              </div>
            </div>

            {/* Parte Inferior: SALA (ocupa toda a largura de 8 colunas em formato L com o Pasillo) */}
            {areas.sala && (
              <div className="w-full border-2 border-slate-900 dark:border-slate-200 bg-white dark:bg-slate-900 min-h-[140px] flex flex-col items-center justify-center p-4 relative">
                {/* Pequena máscara branca na junção com o Pasillo para formar o "L" contínuo igual ao croqui oficial */}
                <div className="hidden sm:block absolute -top-[3px] right-0 w-[calc(50%-2px)] h-[4px] bg-white dark:bg-slate-900" />
                <span className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                  Sala
                </span>
                {areas.terraza && (
                  <span className="text-[10px] font-semibold text-slate-500 mt-1 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded">
                    + Terraza / Balcón
                  </span>
                )}
              </div>
            )}

            {/* Quartos na base inferior (se houver) */}
            {bottomRooms.length > 0 && (
              <div className="grid grid-cols-2 gap-0 -mt-[2px]">
                {bottomRooms.map(hab => renderRoomBoxInPlan(hab))}
              </div>
            )}
          </div>

          {/* COLUNA DIREITA (4 colunas): Hab 2, Hab 3, Cocina e Hab 4 */}
          <div className="col-span-4 flex flex-col justify-between -ml-[2px]">
            {/* Quartos superiores da direita (ex: Hab Nº 2, Hab Nº 3) */}
            <div className="flex flex-col">
              {rightRoomsAboveKitchen.map((hab, idx) =>
                renderRoomBoxInPlan(hab, `${idx > 0 ? '-mt-[2px]' : ''} min-h-[64px]`)
              )}
            </div>

            {/* Espaçador se houver cozinha */}
            {areas.cocina && (
              <div className="my-3 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-200 py-3 px-2 text-center shadow-2xs -mr-2 sm:-mr-3">
                <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base underline decoration-2 underline-offset-2">
                  Cocina
                </span>
              </div>
            )}

            {/* Quartos inferiores da direita (ex: Hab Nº 4) */}
            <div className="flex flex-col mb-2">
              {rightRoomsBelowKitchen.map((hab, idx) =>
                renderRoomBoxInPlan(hab, `${idx > 0 ? '-mt-[2px]' : ''} min-h-[72px]`)
              )}
            </div>
          </div>
        </div>

        {/* RODAPÉ AMARELO DE CAPACIDADE TOTAL DO PISO (idêntico ao modelo enviado) */}
        <div className="mt-4 w-full bg-[#ffff00] text-slate-950 px-3 py-1.5 font-extrabold text-xs sm:text-sm text-left border border-amber-400 shadow-2xs">
          <span className="underline decoration-2 underline-offset-2">
            Capacidad total del piso {totalPersonasPiso} {totalPersonasPiso === 1 ? 'persona' : 'personas'}.
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      onPaste={handlePasteImage}
      className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3"
    >
      {/* Header do Croqui / Planta */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <LayoutGrid size={14} />
          </div>
          <div>
            <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              Croquis & Distribución de Habitaciones (Planta del Piso)
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-full text-[9px] font-extrabold">
                1 Cama = 1 Plaza
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Enumere las habitaciones (Hab Nº 1, Hab Nº 2...) y cuántas camas tiene cada cuarto para el Término de Responsabilidad.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddHabitacion}
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-colors shadow-2xs cursor-pointer"
            >
              <Plus size={12} />
              + Habitación (Hab Nº {habitaciones.length + 1})
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpandedModal(true)}
            className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            title="Ampliar Croquis del Piso"
          >
            <Maximize2 size={11} />
            Ampliar Croquis
          </button>
        </div>
      </div>

      {/* Regra explicativa rápida */}
      {!readOnly && !compact && (
        <div className="p-2 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 rounded-xl flex items-start gap-2 text-[10px] text-blue-900 dark:text-blue-200">
          <Info size={13} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <strong>Regla de Capacidad:</strong> Cada cama cuenta como <strong>1 plaza individual (1 trabajador)</strong>, sin importar si la cama es simple o de matrimonio/doble. Al modificar las habitaciones abajo, el total de dormitorios, camas y capacidad se actualiza automáticamente.
          </div>
        </div>
      )}

      {/* Lista Editável de Quartos (Hab Nº 1, Hab Nº 2, ...) */}
      {!readOnly && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {habitaciones.map((hab, idx) => (
              <div
                key={hab.numero}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-black">
                      Hab Nº {hab.numero}
                    </span>
                    <input
                      type="text"
                      value={hab.observacao || ''}
                      onChange={e => handleUpdateHabitacion(idx, { observacao: e.target.value })}
                      placeholder="Nota (ej: Exterior, Matrimonio...)"
                      className="w-28 sm:w-32 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[10px] text-slate-700 dark:text-slate-200"
                    />
                  </div>

                  {habitaciones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveHabitacion(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Eliminar habitación"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  {/* Seletor de Quantidade de Camas no Quarto */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Camas:</span>
                    <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleUpdateHabitacion(idx, { camas: Math.max(1, hab.camas - 1) })}
                        className="px-2 py-0.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="px-2 py-0.5 text-xs font-black text-indigo-700 dark:text-indigo-300 min-w-[24px] text-center">
                        {hab.camas}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateHabitacion(idx, { camas: hab.camas + 1 })}
                        className="px-2 py-0.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Posição no Croqui */}
                  <div className="flex items-center gap-0.5" title="Posición en el dibujo del croquis">
                    {[
                      { pos: 'top', icon: ArrowUp, label: 'Arriba' },
                      { pos: 'right', icon: ArrowRight, label: 'Derecha' },
                      { pos: 'left', icon: ArrowLeft, label: 'Izquierda' },
                      { pos: 'bottom', icon: ArrowDown, label: 'Abajo' }
                    ].map(btn => {
                      const Icon = btn.icon;
                      const currentPos = hab.posicao || (hab.numero === 1 ? 'top' : 'right');
                      const active = currentPos === btn.pos;
                      return (
                        <button
                          key={btn.pos}
                          type="button"
                          onClick={() => handleUpdateHabitacion(idx, { posicao: btn.pos as any })}
                          title={`Ubicar en: ${btn.label}`}
                          className={`p-1 rounded transition-colors ${
                            active
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold'
                              : 'text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Icon size={11} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Configuração rápida das Áreas Comuns da Planta */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-[10px]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <Bath size={12} className="text-slate-500" />
                <span className="font-bold text-slate-600 dark:text-slate-300">Baño completo:</span>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={areas.bano_completo}
                  onChange={e => handleUpdateAreas({ bano_completo: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-11 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center font-bold"
                />
              </div>

              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-600 dark:text-slate-300">1/2 Baño:</span>
                <input
                  type="number"
                  min={0}
                  max={4}
                  value={areas.medio_bano}
                  onChange={e => handleUpdateAreas({ medio_bano: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-11 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center font-bold"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'cocina', label: 'Cocina' },
                { key: 'sala', label: 'Sala' },
                { key: 'pasillo', label: 'Pasillo' },
                { key: 'terraza', label: 'Terraza' }
              ].map(item => {
                const isActive = Boolean((areas as any)[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleUpdateAreas({ [item.key]: !isActive } as any)}
                    className={`px-2 py-0.5 rounded-md font-bold transition-colors border ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-white text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-700'
                    }`}
                  >
                    {isActive ? '✓ ' : '+ '}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DESENHO VISUAL DO CROQUI / PLANTA */}
      {renderArchitecturalDiagram(false)}

      {/* Opção adicional: Anexar imagem externa de planta se desejado */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleUploadCroquisImage(f);
            e.target.value = '';
          }}
        />

        {value?.imagem_croquis_url ? (
          <div className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon size={12} className="text-indigo-600" />
                Imagen / Plano Adicional Adjunto
              </span>
              <div className="flex items-center gap-1.5">
                <a
                  href={value.imagem_croquis_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold hover:bg-blue-100"
                >
                  Ver Original
                </a>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => emitChange({ ...value, imagem_croquis_url: '' })}
                    className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                    title="Quitar imagen adjunta"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
            <img
              src={value.imagem_croquis_url}
              alt="Plano adjunto"
              className="max-h-52 mx-auto rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-white"
            />
          </div>
        ) : (
          !readOnly && (
            <button
              type="button"
              disabled={isUploadingImg}
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Upload size={11} />
              {isUploadingImg
                ? 'Subiendo imagen de croquis...'
                : '¿Tiene también un croquis en imagen? Haga clic aquí o pulse Ctrl+V para adjuntarlo'}
            </button>
          )
        )}
      </div>

      {/* Modal Ampliado da Planta / Croqui */}
      {isExpandedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid size={18} className="text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold">Croquis & Distribución del Piso</h3>
                  <p className="text-[11px] text-slate-400">
                    {habitaciones.length} habitaciones • {totalCamasPiso} camas • Capacidad total: {totalPersonasPiso} personas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpandedModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {renderArchitecturalDiagram(true)}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {habitaciones.map(h => (
                  <div
                    key={h.numero}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center"
                  >
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block">
                      {h.nome || `Hab Nº ${h.numero}`}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {h.camas} {h.camas === 1 ? 'Cama (1 plaza)' : `Camas (${h.camas} plazas)`}
                    </span>
                    {h.observacao && (
                      <span className="text-[10px] text-slate-500 block mt-0.5">{h.observacao}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsExpandedModal(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
              >
                Cerrar Vista de Croquis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
