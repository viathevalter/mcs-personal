import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LayoutGrid,
  Plus,
  Trash2,
  Bed,
  Bath,
  Upload,
  Image as ImageIcon,
  X,
  Maximize2,
  Info,
  Move,
  RotateCw,
  RefreshCw,
  MousePointerClick,
  Square,
  Columns
} from 'lucide-react';
import { uploadDocumentoVistoria } from '../services/storageService';

export interface BlocoRect {
  x: number; // 0..480 (unidades lógicas do canvas)
  y: number; // 0..400 (unidades lógicas do canvas)
  w: number;
  h: number;
  semBordaTopo?: boolean;
  semBordaBase?: boolean;
  semBordaEsq?: boolean;
  semBordaDir?: boolean;
  layoutTexto?: 'inline' | 'stacked';
  zIndex?: number;
}

export interface HabitacionCroquis {
  numero: number;
  nome?: string;
  camas: number;
  camas_simples?: number;
  camas_matrimonio?: number;
  posicao?: 'top' | 'right' | 'left' | 'bottom';
  observacao?: string;
  rect?: BlocoRect;
}

export interface AreaExtraCroquis {
  id: string;
  titulo: string;
  subtitulo?: string;
  sublinhado?: boolean;
  rect: BlocoRect;
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
  layout_blocos?: Record<string, BlocoRect>;
  areas_extras?: AreaExtraCroquis[];
  canvas_height?: number;
  imagem_croquis_url?: string;
  observacoes_planta?: string;
}

const CANVAS_W = 480;
const DEFAULT_CANVAS_H = 400;
const SNAP_STEP = 5;

function snap(val: number, step: number = SNAP_STEP): number {
  return Math.round(val / step) * step;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function getDefaultRoomRect(index: number, totalRooms: number): BlocoRect {
  if (index === 0) {
    // Hab Nº 1 no topo (como no croqui de referência)
    return { x: 10, y: 10, w: 230, h: 50, layoutTexto: 'inline', zIndex: 2 };
  }
  if (index === 1) {
    // Hab Nº 2 na direita superior
    return { x: 240, y: 60, w: 120, h: 55, layoutTexto: 'stacked', zIndex: 2 };
  }
  if (index === 2) {
    // Hab Nº 3 logo abaixo da Hab Nº 2
    return { x: 240, y: 115, w: 120, h: 55, layoutTexto: 'stacked', zIndex: 2 };
  }
  if (index === 3) {
    // Hab Nº 4 na direita inferior (abaixo da Cocina)
    return { x: 240, y: 295, w: 120, h: 70, layoutTexto: 'stacked', zIndex: 2 };
  }
  // Para 5º quarto em diante: posiciona de forma organizada
  const extraIdx = index - 4;
  const col = extraIdx % 2;
  const row = Math.floor(extraIdx / 2);
  return {
    x: col === 0 ? 360 : 240,
    y: clamp(60 + row * 60, 10, 330),
    w: 110,
    h: 55,
    layoutTexto: 'stacked',
    zIndex: 2
  };
}

export function getDefaultCommonRects(
  banoCompleto: number = 1,
  medioBano: number = 0
): Record<string, BlocoRect> {
  const map: Record<string, BlocoRect> = {
    pasillo: {
      x: 120,
      y: 60,
      w: 120,
      h: 170,
      semBordaBase: true, // Une com a Sala em formato "L"
      zIndex: 3
    },
    sala: {
      x: 10,
      y: 230,
      w: 230,
      h: 150,
      zIndex: 1
    },
    cocina: {
      x: 240,
      y: 220,
      w: 230,
      h: 55,
      zIndex: 2
    },
    terraza: {
      x: 10,
      y: 380,
      w: 230,
      h: 40,
      zIndex: 2
    }
  };

  for (let i = 0; i < Math.max(1, banoCompleto); i++) {
    map[`bano_completo_${i}`] = {
      x: 10,
      y: 90 + i * 65,
      w: 110,
      h: 60,
      zIndex: 2
    };
  }

  for (let i = 0; i < Math.max(1, medioBano); i++) {
    map[`medio_bano_${i}`] = {
      x: 10,
      y: 165 + i * 45,
      w: 110,
      h: 35,
      zIndex: 2
    };
  }

  return map;
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
      observacao: '',
      rect: getDefaultRoomRect(i - 1, numRooms)
    });
  }

  const banoComp = Math.max(1, Number(banheiros) || 1);

  return {
    ativo: true,
    habitaciones,
    areas_comunes: {
      bano_completo: banoComp,
      medio_bano: 0,
      pasillo: true,
      cocina: true,
      sala: true,
      terraza: false
    },
    layout_blocos: getDefaultCommonRects(banoComp, 0),
    canvas_height: DEFAULT_CANVAS_H,
    imagem_croquis_url: '',
    observacoes_planta: ''
  };
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface InteractionState {
  blockKey: string; // ex: "hab_0", "pasillo", "sala", "cocina", "bano_completo_0"
  mode: 'move' | 'resize';
  handle?: ResizeHandle;
  startClientX: number;
  startClientY: number;
  initialRect: BlocoRect;
  canvasWidthPx: number;
  canvasHeightPx: number;
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
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const [isUploadingImg, setIsUploadingImg] = useState(false);

  const inlineCanvasRef = useRef<HTMLDivElement>(null);
  const modalCanvasRef = useRef<HTMLDivElement>(null);
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
  const canvasH = value?.canvas_height || DEFAULT_CANVAS_H;

  const defaultCommons = getDefaultCommonRects(areas.bano_completo, areas.medio_bano);
  const layoutBlocos: Record<string, BlocoRect> = {
    ...defaultCommons,
    ...(value?.layout_blocos || {})
  };

  const totalCamasPiso = habitaciones.reduce((acc, h) => acc + (Number(h.camas) || 0), 0);
  const totalPersonasPiso = totalCamasPiso; // 1 cama = 1 trabajador

  const emitChange = useCallback(
    (next: CroquisPlantaData) => {
      if (onChange) onChange(next);
    },
    [onChange]
  );

  // Obter o BlocoRect de qualquer item pela chave ("hab_0", "sala", "pasillo", etc.)
  const getRectForKey = useCallback(
    (key: string): BlocoRect => {
      if (key.startsWith('hab_')) {
        const idx = parseInt(key.replace('hab_', ''), 10);
        const hab = habitaciones[idx];
        return hab?.rect || getDefaultRoomRect(idx, habitaciones.length);
      }
      return layoutBlocos[key] || { x: 20, y: 20, w: 120, h: 60, zIndex: 2 };
    },
    [habitaciones, layoutBlocos]
  );

  // Atualizar o BlocoRect de qualquer item pela chave
  const updateRectForKey = useCallback(
    (key: string, nextRect: BlocoRect) => {
      if (readOnly) return;
      if (key.startsWith('hab_')) {
        const idx = parseInt(key.replace('hab_', ''), 10);
        const nextHabs = habitaciones.map((h, i) => (i === idx ? { ...h, rect: nextRect } : h));
        emitChange({
          ...value,
          ativo: true,
          habitaciones: nextHabs
        });
      } else {
        emitChange({
          ...value,
          ativo: true,
          layout_blocos: {
            ...layoutBlocos,
            [key]: nextRect
          }
        });
      }
    },
    [readOnly, habitaciones, value, layoutBlocos, emitChange]
  );

  // Listener global de MouseMove / MouseUp durante o arraste ou redimensionamento
  useEffect(() => {
    if (!interaction) return;

    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      const dxPx = e.clientX - interaction.startClientX;
      const dyPx = e.clientY - interaction.startClientY;

      const dxLogic = (dxPx / Math.max(1, interaction.canvasWidthPx)) * CANVAS_W;
      const dyLogic = (dyPx / Math.max(1, interaction.canvasHeightPx)) * canvasH;

      const init = interaction.initialRect;
      let nextX = init.x;
      let nextY = init.y;
      let nextW = init.w;
      let nextH = init.h;

      const minW = 50;
      const minH = 30;

      if (interaction.mode === 'move') {
        nextX = clamp(snap(init.x + dxLogic), 0, CANVAS_W - init.w);
        nextY = clamp(snap(init.y + dyLogic), 0, canvasH - init.h);
      } else if (interaction.mode === 'resize' && interaction.handle) {
        const h = interaction.handle;

        if (h.includes('e')) {
          nextW = clamp(snap(init.w + dxLogic), minW, CANVAS_W - init.x);
        }
        if (h.includes('s')) {
          nextH = clamp(snap(init.h + dyLogic), minH, canvasH - init.y);
        }
        if (h.includes('w')) {
          const maxDeltaX = init.w - minW;
          const clampedDx = clamp(snap(dxLogic), -init.x, maxDeltaX);
          nextX = init.x + clampedDx;
          nextW = init.w - clampedDx;
        }
        if (h.includes('n')) {
          const maxDeltaY = init.h - minH;
          const clampedDy = clamp(snap(dyLogic), -init.y, maxDeltaY);
          nextY = init.y + clampedDy;
          nextH = init.h - clampedDy;
        }
      }

      updateRectForKey(interaction.blockKey, {
        ...init,
        x: nextX,
        y: nextY,
        w: nextW,
        h: nextH
      });
    };

    const handlePointerUp = () => {
      setInteraction(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [interaction, canvasH, updateRectForKey]);

  const startBlockInteraction = (
    e: React.PointerEvent,
    blockKey: string,
    mode: 'move' | 'resize',
    handle?: ResizeHandle,
    isModalCanvas?: boolean
  ) => {
    if (readOnly) return;
    e.stopPropagation();
    e.preventDefault();

    setSelectedKey(blockKey);

    const container = isModalCanvas ? modalCanvasRef.current : inlineCanvasRef.current;
    const rectPx = container?.getBoundingClientRect();
    const widthPx = rectPx?.width || 480;
    const heightPx = rectPx?.height || 400;

    setInteraction({
      blockKey,
      mode,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialRect: getRectForKey(blockKey),
      canvasWidthPx: widthPx,
      canvasHeightPx: heightPx
    });
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
      observacao: '',
      rect: getDefaultRoomRect(nextNum - 1, nextNum)
    };
    emitChange({
      ...value,
      ativo: true,
      habitaciones: [...habitaciones, novaHab]
    });
    setSelectedKey(`hab_${habitaciones.length}`);
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
    setSelectedKey(null);
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
    const nextAreas = {
      ...areas,
      ...patch
    };
    emitChange({
      ...value,
      ativo: true,
      areas_comunes: nextAreas
    });
  };

  const handleResetLayout = () => {
    if (readOnly) return;
    const resetHabs = habitaciones.map((h, idx) => ({
      ...h,
      rect: getDefaultRoomRect(idx, habitaciones.length)
    }));
    emitChange({
      ...value,
      ativo: true,
      habitaciones: resetHabs,
      layout_blocos: getDefaultCommonRects(areas.bano_completo, areas.medio_bano)
    });
    setSelectedKey(null);
  };

  const handleRotateSelected = () => {
    if (!selectedKey || readOnly) return;
    const r = getRectForKey(selectedKey);
    const nextW = clamp(r.h, 50, CANVAS_W);
    const nextH = clamp(r.w, 30, canvasH);
    const nextX = clamp(r.x, 0, CANVAS_W - nextW);
    const nextY = clamp(r.y, 0, canvasH - nextH);
    updateRectForKey(selectedKey, {
      ...r,
      x: nextX,
      y: nextY,
      w: nextW,
      h: nextH,
      layoutTexto: r.layoutTexto === 'inline' ? 'stacked' : 'inline'
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

  // Renderiza as 8 alças de redimensionamento com o mouse quando um cômodo está selecionado
  const renderResizeHandles = (blockKey: string, isModalCanvas: boolean) => {
    if (readOnly || selectedKey !== blockKey) return null;

    const handles: Array<{ id: ResizeHandle; className: string }> = [
      { id: 'nw', className: '-top-1.5 -left-1.5 cursor-nwse-resize' },
      { id: 'n', className: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
      { id: 'ne', className: '-top-1.5 -right-1.5 cursor-nesw-resize' },
      { id: 'e', className: 'top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize' },
      { id: 'se', className: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
      { id: 's', className: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
      { id: 'sw', className: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
      { id: 'w', className: 'top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize' }
    ];

    return (
      <>
        {handles.map(h => (
          <div
            key={h.id}
            onPointerDown={e => startBlockInteraction(e, blockKey, 'resize', h.id, isModalCanvas)}
            className={`absolute w-3 h-3 bg-indigo-600 border-2 border-white dark:border-slate-900 rounded-xs shadow-sm z-30 hover:scale-125 transition-transform ${h.className}`}
            title="Arraste para alterar o tamanho"
          />
        ))}
      </>
    );
  };

  // Renderiza um bloco posicionável e redimensionável no Canvas
  const renderInteractiveBlock = (
    blockKey: string,
    rect: BlocoRect,
    content: React.ReactNode,
    isModalCanvas: boolean,
    extraClasses: string = ''
  ) => {
    const isSelected = !readOnly && selectedKey === blockKey;
    const isInteracting = interaction?.blockKey === blockKey;

    const leftPct = (rect.x / CANVAS_W) * 100;
    const topPct = (rect.y / canvasH) * 100;
    const widthPct = (rect.w / CANVAS_W) * 100;
    const heightPct = (rect.h / canvasH) * 100;

    return (
      <div
        key={blockKey}
        onPointerDown={e => startBlockInteraction(e, blockKey, 'move', undefined, isModalCanvas)}
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          width: `${widthPct}%`,
          height: `${heightPct}%`,
          zIndex: isSelected ? 25 : rect.zIndex || 2,
          borderTopWidth: rect.semBordaTopo ? 0 : 2,
          borderBottomWidth: rect.semBordaBase ? 0 : 2,
          borderLeftWidth: rect.semBordaEsq ? 0 : 2,
          borderRightWidth: rect.semBordaDir ? 0 : 2
        }}
        className={`absolute bg-white dark:bg-slate-900 border-slate-900 dark:border-slate-100 flex flex-col items-center justify-center text-center p-1.5 select-none transition-shadow ${
          !readOnly ? 'cursor-move hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30' : ''
        } ${
          isSelected
            ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/30 shadow-lg'
            : ''
        } ${isInteracting ? 'opacity-95 shadow-xl' : ''} ${extraClasses}`}
      >
        {content}
        {renderResizeHandles(blockKey, isModalCanvas)}
      </div>
    );
  };

  // Barra de ferramentas contextual do cômodo selecionado no canvas
  const renderSelectedToolbar = () => {
    if (readOnly || !selectedKey) return null;

    const rect = getRectForKey(selectedKey);
    const isHab = selectedKey.startsWith('hab_');
    const habIdx = isHab ? parseInt(selectedKey.replace('hab_', ''), 10) : -1;
    const hab = isHab ? habitaciones[habIdx] : null;

    const labelMap: Record<string, string> = {
      pasillo: 'Pasillo / Distribuidor',
      sala: 'Sala de Estar',
      cocina: 'Cocina',
      terraza: 'Terraza / Balcón'
    };
    const itemLabel = isHab
      ? hab?.nome || `Hab Nº ${habIdx + 1}`
      : selectedKey.startsWith('bano_completo_')
        ? `Baño Completo`
        : selectedKey.startsWith('medio_bano_')
          ? `1/2 Baño`
          : labelMap[selectedKey] || selectedKey;

    return (
      <div className="p-2.5 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center justify-between gap-2 text-[11px] animate-in fade-in duration-150">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md font-black text-[10px] flex items-center gap-1">
            <Move size={11} />
            {itemLabel}
          </span>

          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            {Math.round(rect.w)}×{Math.round(rect.h)}
          </span>

          {/* Se for quarto, permite ajustar camas direto na barra do elemento selecionado */}
          {isHab && hab && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <Bed size={12} className="text-indigo-600" />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Camas:</span>
              <button
                type="button"
                onClick={() => handleUpdateHabitacion(habIdx, { camas: Math.max(1, hab.camas - 1) })}
                className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800 font-black text-xs hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center"
              >
                -
              </button>
              <span className="font-black text-indigo-700 dark:text-indigo-300 px-1">{hab.camas}</span>
              <button
                type="button"
                onClick={() => handleUpdateHabitacion(habIdx, { camas: hab.camas + 1 })}
                className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800 font-black text-xs hover:bg-emerald-100 hover:text-emerald-700 flex items-center justify-center"
              >
                +
              </button>
            </div>
          )}

          {/* Alternar texto 1 linha vs 2 linhas */}
          {isHab && (
            <button
              type="button"
              onClick={() =>
                updateRectForKey(selectedKey, {
                  ...rect,
                  layoutTexto: rect.layoutTexto === 'inline' ? 'stacked' : 'inline'
                })
              }
              className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1"
              title="Cambiar disposición del texto (1 línea o 2 líneas)"
            >
              <Columns size={11} />
              Texto: {rect.layoutTexto === 'inline' ? '1 Línea' : '2 Líneas'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Girar 90 graus */}
          <button
            type="button"
            onClick={handleRotateSelected}
            className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-100 hover:text-indigo-700 flex items-center gap-1"
            title="Girar forma 90° (intercambiar ancho y alto)"
          >
            <RotateCw size={11} />
            Girar 90°
          </button>

          {/* Ocultar/Exibir bordas para unir cômodos em formato L */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[9px] font-bold text-slate-400 mr-1" title="Ocultar pared para unir con otro espacio (ej: Pasillo + Sala en L)">
              Unir pared:
            </span>
            {[
              { key: 'semBordaTopo', label: 'Arr' },
              { key: 'semBordaBase', label: 'Aba' },
              { key: 'semBordaEsq', label: 'Izq' },
              { key: 'semBordaDir', label: 'Der' }
            ].map(b => {
              const isHidden = Boolean((rect as any)[b.key]);
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() =>
                    updateRectForKey(selectedKey, {
                      ...rect,
                      [b.key]: !isHidden
                    })
                  }
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold transition-colors ${
                    isHidden
                      ? 'bg-amber-500 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={isHidden ? `Mostrar pared (${b.label})` : `Ocultar pared (${b.label}) para unir forma en L`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setSelectedKey(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
            title="Deseleccionar"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    );
  };

  // Renderiza o Canvas Interativo de Planta Baixa (com suporte a arrastar e redimensionar com o mouse)
  const renderInteractiveFloorPlanCanvas = (isModalCanvas: boolean = false) => {
    const refToUse = isModalCanvas ? modalCanvasRef : inlineCanvasRef;

    return (
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800 p-3 sm:p-5 flex flex-col items-center shadow-inner">
        {!readOnly && (
          <div className="w-full max-w-[520px] flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-2 px-1">
            <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
              <MousePointerClick size={12} />
              Arraste cualquier habitación con el ratón para moverla o estire sus bordes/esquinas para cambiar el tamaño.
            </span>
            <button
              type="button"
              onClick={handleResetLayout}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 shrink-0 ml-2 cursor-pointer"
              title="Restaurar diseño estándar del croquis"
            >
              <RefreshCw size={11} />
              Restaurar Diseño
            </button>
          </div>
        )}

        {/* Área do Canvas proporcional 480x400 com grade pontilhada suave no modo edição */}
        <div
          ref={refToUse}
          onPointerDown={() => {
            if (!readOnly) setSelectedKey(null);
          }}
          style={{
            aspectRatio: `${CANVAS_W} / ${canvasH}`,
            backgroundImage: !readOnly
              ? 'radial-gradient(circle, rgba(148, 163, 184, 0.35) 1px, transparent 1px)'
              : 'none',
            backgroundSize: '16px 16px'
          }}
          className={`relative w-full ${
            isModalCanvas ? 'max-w-[620px]' : 'max-w-[480px]'
          } bg-white dark:bg-slate-950 rounded-lg overflow-hidden border border-dashed ${
            !readOnly ? 'border-slate-300 dark:border-slate-800' : 'border-transparent'
          }`}
        >
          {/* 1. SALA */}
          {areas.sala &&
            renderInteractiveBlock(
              'sala',
              getRectForKey('sala'),
              <div className="flex flex-col items-center justify-center pointer-events-none">
                <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-lg">
                  Sala
                </span>
              </div>,
              isModalCanvas
            )}

          {/* 2. PASILLO */}
          {areas.pasillo &&
            renderInteractiveBlock(
              'pasillo',
              getRectForKey('pasillo'),
              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-base tracking-tight pointer-events-none">
                Pasillo
              </span>,
              isModalCanvas
            )}

          {/* 3. BAÑOS COMPLETOS */}
          {Array.from({ length: areas.bano_completo || 0 }).map((_, idx) => {
            const key = `bano_completo_${idx}`;
            return renderInteractiveBlock(
              key,
              getRectForKey(key),
              <div className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-xs leading-tight pointer-events-none">
                <div>Baño</div>
                <div>completo{areas.bano_completo > 1 ? ` ${idx + 1}` : ''}</div>
              </div>,
              isModalCanvas
            );
          })}

          {/* 4. MEDIO BAÑO (1/2 Baño) */}
          {Array.from({ length: areas.medio_bano || 0 }).map((_, idx) => {
            const key = `medio_bano_${idx}`;
            return renderInteractiveBlock(
              key,
              getRectForKey(key),
              <div className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-xs leading-tight pointer-events-none">
                1/2 Baño{areas.medio_bano > 1 ? ` ${idx + 1}` : ''}
              </div>,
              isModalCanvas
            );
          })}

          {/* 5. COCINA */}
          {areas.cocina &&
            renderInteractiveBlock(
              'cocina',
              getRectForKey('cocina'),
              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-base underline decoration-2 underline-offset-2 pointer-events-none">
                Cocina
              </span>,
              isModalCanvas
            )}

          {/* 6. TERRAZA */}
          {areas.terraza &&
            renderInteractiveBlock(
              'terraza',
              getRectForKey('terraza'),
              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm pointer-events-none">
                Terraza
              </span>,
              isModalCanvas
            )}

          {/* 7. HABITACIONES (Hab Nº 1, Hab Nº 2, Hab Nº 3, Hab Nº 4...) */}
          {habitaciones.map((hab, idx) => {
            const key = `hab_${idx}`;
            const rect = getRectForKey(key);
            const camasLabel = `${hab.camas} ${hab.camas === 1 ? 'Cama' : 'Camas'}`;
            const habTitle = hab.nome || `Hab Nº ${hab.numero}`;
            const isInline =
              rect.layoutTexto === 'inline' || (!rect.layoutTexto && rect.w >= rect.h * 2.2);

            return renderInteractiveBlock(
              key,
              rect,
              <div className="flex flex-col items-center justify-center w-full h-full overflow-hidden pointer-events-none">
                <div className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-sm leading-tight">
                  {isInline ? (
                    <span>
                      {camasLabel},{' '}
                      <span className="underline decoration-2 underline-offset-2">{habTitle}</span>
                    </span>
                  ) : (
                    <>
                      <div>{camasLabel}</div>
                      <div className="underline decoration-2 underline-offset-2 mt-0.5">
                        {habTitle}
                      </div>
                    </>
                  )}
                </div>
                {hab.observacao && (
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-full px-1">
                    ({hab.observacao})
                  </span>
                )}
              </div>,
              isModalCanvas
            );
          })}
        </div>

        {/* RODAPÉ AMARELO DE CAPACIDADE TOTAL DO PISO (idêntico ao modelo enviado) */}
        <div
          className={`mt-3 w-full ${
            isModalCanvas ? 'max-w-[620px]' : 'max-w-[480px]'
          } bg-[#ffff00] text-slate-950 px-3 py-1.5 font-extrabold text-xs sm:text-sm text-left border border-amber-400 shadow-2xs`}
        >
          <span className="underline decoration-2 underline-offset-2">
            Capacidad total del piso {totalPersonasPiso}{' '}
            {totalPersonasPiso === 1 ? 'persona' : 'personas'}.
          </span>
        </div>
      </div>
    );
  };

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
              Croquis & Distribución de Habitaciones (Planta Interactiva)
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-full text-[9px] font-extrabold">
                1 Cama = 1 Plaza
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Arrastre y ajuste el tamaño de cada habitación con el ratón para dibujar el croquis real del alojamiento.
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
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            title="Abrir Editor de Croquis en Pantalla Grande"
          >
            <Maximize2 size={11} />
            {readOnly ? 'Ampliar Croquis' : 'Editor Pantalla Completa'}
          </button>
        </div>
      </div>

      {/* Regra explicativa rápida */}
      {!readOnly && !compact && (
        <div className="p-2 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 rounded-xl flex items-start gap-2 text-[10px] text-blue-900 dark:text-blue-200">
          <Info size={13} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <strong>Diseño libre con el ratón + Regla 1 Cama = 1 Plaza:</strong> Haga clic sobre cualquier habitación o área en el dibujo de abajo para <strong>moverla arrastrando</strong> o <strong>cambiar su forma y tamaño</strong> estirando los puntos azules de sus bordes y esquinas.
          </div>
        </div>
      )}

      {/* Lista Editável de Quartos (Hab Nº 1, Hab Nº 2, ...) */}
      {!readOnly && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {habitaciones.map((hab, idx) => {
              const key = `hab_${idx}`;
              const isSel = selectedKey === key;
              return (
                <div
                  key={hab.numero}
                  onClick={() => setSelectedKey(key)}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                    isSel
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-black">
                        Hab Nº {hab.numero}
                      </span>
                      <input
                        type="text"
                        value={hab.observacao || ''}
                        onClick={e => e.stopPropagation()}
                        onChange={e => handleUpdateHabitacion(idx, { observacao: e.target.value })}
                        placeholder="Nota (ej: Exterior, Suite...)"
                        className="w-28 sm:w-36 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[10px] text-slate-700 dark:text-slate-200"
                      />
                    </div>

                    {habitaciones.length > 1 && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleRemoveHabitacion(idx);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Eliminar habitación"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    {/* Seletor de Quantidade de Camas no Quarto */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
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

                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                      <Move size={10} />
                      Arrastrable en planta
                    </span>
                  </div>
                </div>
              );
            })}
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

      {/* Barra de Ferramentas do Cômodo Selecionado */}
      {renderSelectedToolbar()}

      {/* CANVAS INTERATIVO DO CROQUI / PLANTA */}
      {renderInteractiveFloorPlanCanvas(false)}

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

      {/* Modal Ampliado da Planta / Editor em Tela Cheia */}
      {isExpandedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LayoutGrid size={18} className="text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold">
                    {readOnly ? 'Croquis & Distribución del Piso' : 'Editor Interactivo de Croquis / Planta del Piso'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {habitaciones.length} habitaciones • {totalCamasPiso} camas • Capacidad total: {totalPersonasPiso} personas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={handleAddHabitacion}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold"
                  >
                    <Plus size={13} />
                    + Habitación
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsExpandedModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {renderSelectedToolbar()}
              {renderInteractiveFloorPlanCanvas(true)}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {habitaciones.map((h, idx) => (
                  <div
                    key={h.numero}
                    onClick={() => !readOnly && setSelectedKey(`hab_${idx}`)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      selectedKey === `hab_${idx}`
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    } ${!readOnly ? 'cursor-pointer' : ''}`}
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
                Listo / Cerrar Vista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
