import { supabase } from '@/shared/supabase/client';
import { uploadAlojamentoPhoto } from './storageService';

export type EstadoConservacion = 'BUENA' | 'REGULAR' | 'MALA' | 'NA';

export interface ChecklistItemDefinition {
  id: string;
  areaKey: 'HABITACION' | 'AREAS_COMUNES' | 'EQUIPOS_DISPONIBLES' | 'BANOS';
  areaLabelEs: string;
  areaLabelPt: string;
  labelEs: string;
  labelPt: string;
  allowEspecificacion?: boolean;
  allowMandosCount?: boolean;
}

export interface ChecklistItemAnswer {
  estado: EstadoConservacion;
  observacao: string;
  fotos: string[];
  especificacion?: string;
}

export type ChecklistRespostasMap = Record<string, ChecklistItemAnswer>;

export interface SuministrosAlojamentoInfo {
  agua?: boolean;
  luz?: boolean;
  gas?: boolean;
  internet?: boolean;
  limpieza?: boolean;
  aire_acondicionado?: boolean;
  calefaccion?: boolean;
  lavadora?: boolean;
  cocina?: boolean;
  tv?: boolean;
  parking?: boolean;
  reglas_consumo?: string;
}

export interface TermoResponsabilidadeAlojamento {
  id: string;
  token: string;
  codigo_termo: string;
  alocacao_id?: string;
  alojamento_id?: string;
  alojamento_codigo?: string;
  alojamento_nome: string;
  alojamento_endereco: string;
  alojamento_cidade?: string;
  alojamento_provincia?: string;
  cama_identificador: string;
  suministros_info: SuministrosAlojamentoInfo;
  worker_id?: string;
  worker_codigo?: string;
  worker_nome: string;
  worker_documento?: string;
  worker_cargo?: string;
  worker_movil?: string;
  empresa_id?: string;
  empresa_contratante: string;
  pedido_id?: string;
  pedido_codigo?: string;
  cliente_nome?: string;
  obra_nome?: string;
  data_emissao: string;
  data_checkin: string;
  status: 'PENDENTE' | 'ENVIADO' | 'ASSINADO' | 'COM_INCIDENCIAS';
  checklist_respostas: ChecklistRespostasMap;
  quantidade_mandos: string;
  quantidade_llaves: string;
  observacoes_gerais?: string;
  fotos_gerais: string[];
  tem_avarias: boolean;
  total_fotos: number;
  aceite_termos: boolean;
  empresa_representante_nome: string;
  empresa_assinatura_url?: string;
  worker_assinatura_url?: string;
  assinado_em?: string;
  assinatura_ip?: string;
  assinatura_user_agent?: string;
  pdf_url?: string;
  worker_document_id?: string;
  created_at: string;
  updated_at?: string;
}

export const CLAUSULAS_TERMO_ALOJAMENTO = [
  {
    numero: 1,
    tituloEs: 'Conservación, Limpieza y Funcionamiento',
    tituloPt: 'Conservação, Limpeza e Funcionamento',
    textoEs:
      'Recibo el alojamiento en buen estado de conservación, limpieza y funcionamiento, comprometiéndome a mantenerlo en las mismas condiciones recibidas en todo el tiempo de estadía asignada y al momento de requerirse mi salida.',
    textoPt:
      'Recebo o alojamento em bom estado de conservação, limpeza e funcionamento, comprometendo-me a mantê-lo nas mesmas condições recebidas durante todo o período de estadia designada e no momento em que for solicitada a minha saída.'
  },
  {
    numero: 2,
    tituloEs: 'Uso Exclusivo y Prohibición de Terceros',
    tituloPt: 'Uso Exclusivo e Proibição de Terceiros',
    textoEs:
      'El alojamiento será destinado exclusivamente para mi uso y el de las personas autorizadas por el área responsable, quedando estrictamente prohibido cederlo, subarrendarlo o permitir su ocupación o visita por terceros sin autorización escrita.',
    textoPt:
      'O alojamento será destinado exclusivamente para meu uso e das pessoas autorizadas pela área responsável, ficando estritamente proibido cedê-lo, sublocá-lo ou permitir sua ocupação por terceiros sem autorização por escrito.'
  },
  {
    numero: 3,
    tituloEs: 'Reglamento Interno y Normas de Convivencia',
    tituloPt: 'Regulamento Interno e Normas de Convivência',
    textoEs:
      'Me comprometo a cumplir el reglamento interno del alojamiento y las normas de convivencia, silencio, orden e higiene establecidas por la empresa y la comunidad de propietarios.',
    textoPt:
      'Comprometo-me a cumprir o regulamento interno do alojamento e as normas de convivência, silêncio, ordem e higiene estabelecidas pela empresa e pelo condomínio.'
  },
  {
    numero: 4,
    tituloEs: 'Uso Consciente de Suministros (Agua, Luz, Gas) y Mobiliario',
    tituloPt: 'Uso Consciente das Contas (Água, Luz, Gás) e Mobiliário',
    textoEs:
      'Seré responsable del uso correcto y consciente de los suministros diarios (agua, electricidad, gas, internet, otros), así como del cuidado de las instalaciones, muebles, electrodomésticos, llaves, controles (mandos) y demás bienes entregados, respondiendo por los daños o consumos abusivos ocasionados por uso indebido, negligencia o pérdida. Está prohibido realizar cambios de posiciones en los mobiliarios de las habitaciones así como en las demás áreas del piso, perforaciones y/o agujeros en puertas, paredes o cualquiera sea el área que afecte la condición original al recibido en el alojamiento.',
    textoPt:
      'Serei responsável pelo uso correto e consciente dos recursos e contas diárias (água, eletricidade, gás, internet, outros), bem como pelo cuidado das instalações, móveis, eletrodomésticos, chaves, controles e demais bens entregues, respondendo pelos danos ou consumos abusivos ocasionados por uso indevido, negligência ou perda. É proibido alterar a posição dos móveis dos quartos e demais áreas do imóvel, bem como fazer furos em portas, paredes ou qualquer área que afete a condição original recebida.'
  },
  {
    numero: 5,
    tituloEs: 'Reporte Inmediato de Daños o Averías',
    tituloPt: 'Comunicação Imediata de Danos ou Avarias',
    textoEs:
      'Me comprometo a informar de manera oportuna y/o inmediata cualquier daño, avería, incidente o situación que afecte el alojamiento, adjuntando evidencia fotográfica o en video al departamento de Logística / RRHH.',
    textoPt:
      'Comprometo-me a informar de maneira oportuna e imediata qualquer dano, avaria, incidente ou situação que afete o alojamento, enviando fotos ou vídeos ao setor de Logística / RH.'
  },
  {
    numero: 6,
    tituloEs: 'Entrega del Inmueble y Devolución de Llaves',
    tituloPt: 'Entrega do Imóvel e Devolução de Chaves',
    textoEs:
      'En caso de terminación de mi contrato de trabajo, cambio de alojamiento o requerimiento de la empresa, me obligo a entregar el inmueble y/o habitación en la fecha indicada, limpio, desocupado y con todos los elementos, llaves y mandos recibidos.',
    textoPt:
      'Em caso de término do contrato de trabalho, troca de alojamento ou solicitação da empresa, obrigo-me a entregar o imóvel e/ou quarto na data indicada, limpo, desocupado e com todos os itens, chaves e controles recebidos.'
  },
  {
    numero: 7,
    tituloEs: 'Inspecciones y Auditorías Periódicas',
    tituloPt: 'Inspeções e Auditorias Periódicas',
    textoEs:
      'La empresa podrá realizar inspecciones periódicas con el objetivo de auditar el cumplimiento de normas, control de suministros y estado de conservación general en las diferentes áreas del alojamiento asignado.',
    textoPt:
      'A empresa poderá realizar inspeções periódicas com o objetivo de auditar o cumprimento das normas, controle de contas e o estado geral de conservação nas diferentes áreas do alojamento designado.'
  },
  {
    numero: 8,
    tituloEs: 'Responsabilidad Disciplinaria, Civil y Reparación de Daños',
    tituloPt: 'Responsabilidade Disciplinar, Civil e Reparação de Danos',
    textoEs:
      'Comprendo y entiendo que el incumplimiento de las obligaciones aquí establecidas podrá dar lugar a las acciones administrativas, disciplinarias o legales a que haya lugar por parte de la empresa; así como a la obligación de reparar o indemnizar los daños ocasionados, de conformidad con la legislación laboral y civil aplicable.',
    textoPt:
      'Compreendo que o descumprimento das obrigações aqui estabelecidas poderá dar lugar às medidas administrativas, disciplinares ou legais cabíveis por parte da empresa, bem como à obrigação de reparar ou indenizar os danos causados, em conformidade com a legislação trabalhista e civil aplicável.'
  }
];

export const CHECKLIST_ITEMS_CATALOG: ChecklistItemDefinition[] = [
  // 1. HABITACIÓN
  {
    id: 'hab_pintura',
    areaKey: 'HABITACION',
    areaLabelEs: 'Habitación (Dormitorio Asignado)',
    areaLabelPt: 'Quarto (Dormitório Designado)',
    labelEs: 'Pintura en paredes, persiana mecanismo, puerta, suelo.',
    labelPt: 'Pintura nas paredes, mecanismo da persiana, porta, piso.'
  },
  {
    id: 'hab_cama',
    areaKey: 'HABITACION',
    areaLabelEs: 'Habitación (Dormitorio Asignado)',
    areaLabelPt: 'Quarto (Dormitório Designado)',
    labelEs: 'Base soporte, colchón, ropa de cama.',
    labelPt: 'Base/estrado da cama, colchão, roupa de cama.'
  },
  {
    id: 'hab_armario',
    areaKey: 'HABITACION',
    areaLabelEs: 'Habitación (Dormitorio Asignado)',
    areaLabelPt: 'Quarto (Dormitório Designado)',
    labelEs: 'Armario, cajones, tomacorriente e iluminación.',
    labelPt: 'Armário, gavetas, tomadas e iluminação.'
  },
  {
    id: 'hab_otros',
    areaKey: 'HABITACION',
    areaLabelEs: 'Habitación (Dormitorio Asignado)',
    areaLabelPt: 'Quarto (Dormitório Designado)',
    labelEs: 'Otros elementos de la habitación (Especificar si aplica).',
    labelPt: 'Outros itens do quarto (Especificar se aplicável).',
    allowEspecificacion: true
  },

  // 2. ÁREAS COMUNES
  {
    id: 'com_pasillo_hab',
    areaKey: 'AREAS_COMUNES',
    areaLabelEs: 'Áreas Comunes del Inmueble',
    areaLabelPt: 'Áreas Comuns do Imóvel',
    labelEs: 'Pasillo habitaciones: condición de pintura, iluminación, otros.',
    labelPt: 'Corredor dos quartos: condição da pintura, iluminação, outros.'
  },
  {
    id: 'com_pasillo_cocina',
    areaKey: 'AREAS_COMUNES',
    areaLabelEs: 'Áreas Comunes del Inmueble',
    areaLabelPt: 'Áreas Comuns do Imóvel',
    labelEs: 'Pasillo cocina: condición de pintura, suelo, otros.',
    labelPt: 'Corredor da cozinha: condição da pintura, piso, outros.'
  },
  {
    id: 'com_pasillo_sala',
    areaKey: 'AREAS_COMUNES',
    areaLabelEs: 'Áreas Comunes del Inmueble',
    areaLabelPt: 'Áreas Comuns do Imóvel',
    labelEs: 'Pasillo sala-comedor: condición de pintura, otros.',
    labelPt: 'Corredor da sala de estar/jantar: condição da pintura, outros.'
  },
  {
    id: 'com_sala',
    areaKey: 'AREAS_COMUNES',
    areaLabelEs: 'Áreas Comunes del Inmueble',
    areaLabelPt: 'Áreas Comuns do Imóvel',
    labelEs: 'Sala de estar y/o comedor: condición de mesa, sillas, sofá(s), otros.',
    labelPt: 'Sala de estar e/ou jantar: condição da mesa, cadeiras, sofá(s), outros.'
  },
  {
    id: 'com_cocina',
    areaKey: 'AREAS_COMUNES',
    areaLabelEs: 'Áreas Comunes del Inmueble',
    areaLabelPt: 'Áreas Comuns do Imóvel',
    labelEs: 'Área de cocina: condición general de cajones, gavetas, limpieza, conservación.',
    labelPt: 'Área da cozinha: condição geral de armários, gavetas, limpeza e conservação.'
  },
  {
    id: 'com_utensilios',
    areaKey: 'AREAS_COMUNES',
    areaLabelEs: 'Áreas Comunes del Inmueble',
    areaLabelPt: 'Áreas Comuns do Imóvel',
    labelEs: 'Verificación de disponibilidad de utensilios de cocina, cubiertos, vasos, platos, ollas, otros.',
    labelPt: 'Verificação de disponibilidade de utensílios de cozinha, talheres, copos, pratos, panelas, outros.'
  },
  {
    id: 'com_lavado',
    areaKey: 'AREAS_COMUNES',
    areaLabelEs: 'Áreas Comunes del Inmueble',
    areaLabelPt: 'Áreas Comuns do Imóvel',
    labelEs: 'Área de lavado / tendedero: condición general.',
    labelPt: 'Área de lavanderia / varal: condição geral.'
  },
  {
    id: 'com_otros',
    areaKey: 'AREAS_COMUNES',
    areaLabelEs: 'Áreas Comunes del Inmueble',
    areaLabelPt: 'Áreas Comuns do Imóvel',
    labelEs: 'Otros elementos de áreas comunes (Especificar si aplica).',
    labelPt: 'Outros elementos das áreas comuns (Especificar se aplicável).',
    allowEspecificacion: true
  },

  // 3. EQUIPOS DISPONIBLES
  {
    id: 'eq_climatizacion',
    areaKey: 'EQUIPOS_DISPONIBLES',
    areaLabelEs: 'Equipos y Electrodomésticos Disponibles',
    areaLabelPt: 'Equipamentos e Eletrodomésticos Disponíveis',
    labelEs: 'Aires acondicionados, Televisor, ventiladores manuales, Calefactores manuales o integrales (conservación, limpieza y operatividad).',
    labelPt: 'Ar-condicionado, Televisor, ventiladores, Aquecedores/Calefação (conservação, limpeza e funcionamento).'
  },
  {
    id: 'eq_mandos',
    areaKey: 'EQUIPOS_DISPONIBLES',
    areaLabelEs: 'Equipos y Electrodomésticos Disponibles',
    areaLabelPt: 'Equipamentos e Eletrodomésticos Disponíveis',
    labelEs: 'Mandos (controles) de equipos y juegos de llaves.',
    labelPt: 'Controles remotos (mandos) de equipamentos e jogos de chaves.',
    allowMandosCount: true
  },
  {
    id: 'eq_cocina',
    areaKey: 'EQUIPOS_DISPONIBLES',
    areaLabelEs: 'Equipos y Electrodomésticos Disponibles',
    areaLabelPt: 'Equipamentos e Eletrodomésticos Disponíveis',
    labelEs: 'Campana, horno, vitrocerámica, refrigerador, microondas (condición de conservación, limpieza y operatividad).',
    labelPt: 'Exaustor, forno, cooktop/vitrocerâmica, geladeira, micro-ondas (condição de conservação, limpeza e funcionamento).'
  },
  {
    id: 'eq_lavanderia',
    areaKey: 'EQUIPOS_DISPONIBLES',
    areaLabelEs: 'Equipos y Electrodomésticos Disponibles',
    areaLabelPt: 'Equipamentos e Eletrodomésticos Disponíveis',
    labelEs: 'Lavadora, secadora, Caldera / Termo eléctrico (condición de conservación, limpieza y operatividad).',
    labelPt: 'Máquina de lavar, secadora, Caldeira / Aquecedor de água (conservação, limpeza e funcionamento).'
  },
  {
    id: 'eq_otros',
    areaKey: 'EQUIPOS_DISPONIBLES',
    areaLabelEs: 'Equipos y Electrodomésticos Disponibles',
    areaLabelPt: 'Equipamentos e Eletrodomésticos Disponíveis',
    labelEs: 'Otros equipos disponibles (Especificar si aplica).',
    labelPt: 'Outros equipamentos disponíveis (Especificar se aplicável).',
    allowEspecificacion: true
  },

  // 4. BAÑOS
  {
    id: 'bano_habitacion',
    areaKey: 'BANOS',
    areaLabelEs: 'Baños e Instalaciones Sanitarias',
    areaLabelPt: 'Banheiros e Instalações Sanitárias',
    labelEs: 'Baño (en habitación / suite): condición de limpieza general, estado del WC, Espejo, Cajones, ducha, grifería, otros.',
    labelPt: 'Banheiro (privativo no quarto): condição de limpeza geral, vaso sanitário, espelho, armários, chuveiro, torneiras.'
  },
  {
    id: 'bano_compartido',
    areaKey: 'BANOS',
    areaLabelEs: 'Baños e Instalaciones Sanitarias',
    areaLabelPt: 'Banheiros e Instalações Sanitárias',
    labelEs: 'Baño (compartido): condición de limpieza general, estado del WC, Espejo, Cajones, ducha, grifería, otros.',
    labelPt: 'Banheiro (compartilhado): condição de limpeza geral, vaso sanitário, espelho, armários, chuveiro, torneiras.'
  }
];

export function buildDefaultChecklistRespostas(): ChecklistRespostasMap {
  const map: ChecklistRespostasMap = {};
  CHECKLIST_ITEMS_CATALOG.forEach(item => {
    map[item.id] = {
      estado: item.id.endsWith('_otros') || item.id === 'bano_habitacion' ? 'NA' : 'BUENA',
      observacao: '',
      fotos: [],
      especificacion: ''
    };
  });
  return map;
}

const STORAGE_KEY = 'mcs_logistica_termos_alojamento_v1';

const getClient = () => {
  return (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
};

const isUuid = (str?: string | null): boolean =>
  Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

function getLocalTermos(): TermoResponsabilidadeAlojamento[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalTermos(list: TermoResponsabilidadeAlojamento[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Erro ao salvar termos no localStorage:', e);
  }
}

function generateCompanyStampDataUrl(empresaNome: string, representante: string): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Carimbo corporativo retangular estilizado
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 18, 480, 124);

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1;
  ctx.strokeRect(26, 24, 468, 112);

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 20px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText((empresaNome || 'GRUPO MCS').toUpperCase(), 260, 56);

  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
  ctx.fillText('DEPARTAMENTO DE LOGÍSTICA Y ALOJAMIENTOS', 260, 80);

  ctx.fillStyle = '#334155';
  ctx.font = 'italic 16px "Brush Script MT", "Caveat", cursive, sans-serif';
  ctx.fillText(representante || 'Coordinación Operativa', 260, 106);

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 10px Courier, monospace';
  ctx.fillText('SELLO DIGITAL VERIFICADO • ENTREGA DE INMUEBLE', 260, 126);

  return canvas.toDataURL('image/png');
}

function hydrateTermo(row: any): TermoResponsabilidadeAlojamento {
  const checklist =
    row.checklist_respostas && Object.keys(row.checklist_respostas).length > 0
      ? row.checklist_respostas
      : buildDefaultChecklistRespostas();

  return {
    id: row.id,
    token: row.token,
    codigo_termo: row.codigo_termo || `TR-ALOJ-${String(row.id || '').slice(0, 6).toUpperCase()}`,
    alocacao_id: row.alocacao_id || undefined,
    alojamento_id: row.alojamento_id || undefined,
    alojamento_codigo: row.alojamento_codigo || 'AL-0001',
    alojamento_nome: row.alojamento_nome || 'Alojamiento Corporativo',
    alojamento_endereco: row.alojamento_endereco || 'Dirección registrada en Logística',
    alojamento_cidade: row.alojamento_cidade || '',
    alojamento_provincia: row.alojamento_provincia || '',
    cama_identificador: row.cama_identificador || 'Habitación Asignada',
    suministros_info: row.suministros_info || {
      agua: true,
      luz: true,
      gas: true,
      internet: true,
      limpieza: false,
      cocina: true,
      lavadora: true,
      calefaccion: true
    },
    worker_id: row.worker_id || undefined,
    worker_codigo: row.worker_codigo || 'E-XXXX',
    worker_nome: row.worker_nome || 'Trabajador',
    worker_documento: row.worker_documento || '',
    worker_cargo: row.worker_cargo || 'Especialista Operativo',
    worker_movil: row.worker_movil || '',
    empresa_id: row.empresa_id || undefined,
    empresa_contratante: row.empresa_contratante || 'LUMINOUS',
    pedido_id: row.pedido_id || undefined,
    pedido_codigo: row.pedido_codigo || '',
    cliente_nome: row.cliente_nome || '',
    obra_nome: row.obra_nome || '',
    data_emissao: row.data_emissao ? String(row.data_emissao).split('T')[0] : new Date().toISOString().split('T')[0],
    data_checkin: row.data_checkin ? String(row.data_checkin).split('T')[0] : new Date().toISOString().split('T')[0],
    status: row.status || 'PENDENTE',
    checklist_respostas: checklist,
    quantidade_mandos: row.quantidade_mandos ?? '1',
    quantidade_llaves: row.quantidade_llaves ?? '1 juego',
    observacoes_gerais: row.observacoes_gerais || '',
    fotos_gerais: Array.isArray(row.fotos_gerais) ? row.fotos_gerais : [],
    tem_avarias: Boolean(row.tem_avarias),
    total_fotos: Number(row.total_fotos || 0),
    aceite_termos: Boolean(row.aceite_termos),
    empresa_representante_nome: row.empresa_representante_nome || 'Coordinación de Logística & Operaciones',
    empresa_assinatura_url: row.empresa_assinatura_url || undefined,
    worker_assinatura_url: row.worker_assinatura_url || undefined,
    assinado_em: row.assinado_em || undefined,
    assinatura_ip: row.assinatura_ip || undefined,
    assinatura_user_agent: row.assinatura_user_agent || undefined,
    pdf_url: row.pdf_url || undefined,
    worker_document_id: row.worker_document_id || undefined,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || undefined
  };
}

export const termoResponsabilidadeService = {
  generateCompanyStampDataUrl,

  async fetchAllTermos(): Promise<TermoResponsabilidadeAlojamento[]> {
    const localList = getLocalTermos();
    try {
      const { data, error } = await getClient()
        .from('termos_responsabilidade_alojamento')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const dbHydrated = data.map(hydrateTermo);
        const dbMap = new Map(dbHydrated.map(t => [t.id, t]));
        const tokenMap = new Map(dbHydrated.map(t => [t.token, t]));

        // Merge local items that might not be in DB yet
        localList.forEach(lt => {
          if (!dbMap.has(lt.id) && !tokenMap.has(lt.token)) {
            dbHydrated.push(lt);
          }
        });

        saveLocalTermos(dbHydrated);
        return dbHydrated;
      }
    } catch (e) {
      console.warn('Erro ao buscar termos do banco, usando cache local:', e);
    }
    return localList;
  },

  async getTermoByToken(token: string): Promise<TermoResponsabilidadeAlojamento | null> {
    try {
      const { data, error } = await getClient()
        .from('termos_responsabilidade_alojamento')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (!error && data) {
        return hydrateTermo(data);
      }
    } catch (e) {
      console.warn('Erro ao buscar termo por token no banco:', e);
    }

    const local = getLocalTermos().find(t => t.token === token);
    return local || null;
  },

  async fetchTermosByWorker(params: {
    workerId?: string;
    workerCodigo?: string;
    workerNome?: string;
  }): Promise<TermoResponsabilidadeAlojamento[]> {
    const all = await this.fetchAllTermos();
    const cleanCode = (params.workerCodigo || '').toUpperCase().trim();
    const cleanName = (params.workerNome || '').toUpperCase().trim();

    return all.filter(t => {
      if (params.workerId && t.worker_id === params.workerId) return true;
      if (cleanCode && cleanCode !== 'E-XXXX' && (t.worker_codigo || '').toUpperCase().trim() === cleanCode) return true;
      if (cleanName && (t.worker_nome || '').toUpperCase().trim() === cleanName) return true;
      return false;
    });
  },

  async createOrGetTermoForAlocacao(input: {
    alocacao_id?: string;
    alojamento_id?: string;
    alojamento_codigo?: string;
    alojamento_nome: string;
    alojamento_endereco?: string;
    alojamento_cidade?: string;
    alojamento_provincia?: string;
    cama_identificador?: string;
    suministros_info?: SuministrosAlojamentoInfo;
    worker_id?: string;
    worker_codigo?: string;
    worker_nome: string;
    worker_documento?: string;
    worker_cargo?: string;
    worker_movil?: string;
    empresa_id?: string;
    empresa_contratante?: string;
    pedido_id?: string;
    pedido_codigo?: string;
    cliente_nome?: string;
    obra_nome?: string;
    data_checkin?: string;
    forceNew?: boolean;
  }): Promise<TermoResponsabilidadeAlojamento> {
    const existingAll = await this.fetchAllTermos();

    if (!input.forceNew) {
      const found = existingAll.find(t => {
        if (input.alocacao_id && t.alocacao_id === input.alocacao_id) return true;
        if (
          input.worker_id &&
          t.worker_id === input.worker_id &&
          input.alojamento_id &&
          t.alojamento_id === input.alojamento_id
        ) {
          return true;
        }
        if (
          input.worker_codigo &&
          input.worker_codigo !== 'E-XXXX' &&
          t.worker_codigo === input.worker_codigo &&
          t.alojamento_nome === input.alojamento_nome
        ) {
          return true;
        }
        return false;
      });

      if (found) return found;
    }

    // Buscar dados complementares do trabalhador (NIF/Passaporte, Móvil, Empresa) e do Alojamento (Endereço, Suministros)
    let workerDoc = input.worker_documento || '';
    let workerMovil = input.worker_movil || '';
    let workerCargo = input.worker_cargo || 'Operador Especialista';
    let empresaId = input.empresa_id;
    let empresaContratante = input.empresa_contratante || 'LUMINOUS';

    if (isUuid(input.worker_id)) {
      try {
        const { data: wData } = await supabase
          .schema('core_personal')
          .from('workers')
          .select('id, nif, pasaporte, movil, funcion, contratante, empresa_id')
          .eq('id', input.worker_id!)
          .maybeSingle();

        if (wData) {
          workerDoc = workerDoc || wData.nif || wData.pasaporte || '';
          workerMovil = workerMovil || wData.movil || '';
          workerCargo = input.worker_cargo || wData.funcion || 'Operador Especialista';
          empresaId = empresaId || wData.empresa_id || undefined;
          empresaContratante = input.empresa_contratante || wData.contratante || 'LUMINOUS';
        }
      } catch (e) {
        console.warn('Aviso ao enriquecer trabalhador no termo:', e);
      }
    } else if (input.worker_codigo && input.worker_codigo !== 'E-XXXX') {
      try {
        const { data: wData } = await supabase
          .schema('core_personal')
          .from('workers')
          .select('id, nif, pasaporte, movil, funcion, contratante, empresa_id')
          .eq('cod_colab', input.worker_codigo.trim())
          .maybeSingle();

        if (wData) {
          input.worker_id = wData.id;
          workerDoc = workerDoc || wData.nif || wData.pasaporte || '';
          workerMovil = workerMovil || wData.movil || '';
          workerCargo = input.worker_cargo || wData.funcion || 'Operador Especialista';
          empresaId = empresaId || wData.empresa_id || undefined;
          empresaContratante = input.empresa_contratante || wData.contratante || 'LUMINOUS';
        }
      } catch (e) {}
    }

    let alojEndereco = input.alojamento_endereco || '';
    let alojCidade = input.alojamento_cidade || '';
    let alojProvincia = input.alojamento_provincia || '';
    let alojCodigo = input.alojamento_codigo || 'AL-0001';
    let suministrosInfo: SuministrosAlojamentoInfo = input.suministros_info || {
      agua: true,
      luz: true,
      gas: true,
      internet: true,
      limpieza: false,
      cocina: true,
      lavadora: true,
      calefaccion: true
    };

    if (isUuid(input.alojamento_id)) {
      try {
        const { data: aData } = await getClient()
          .from('alojamentos')
          .select('*')
          .eq('id', input.alojamento_id!)
          .maybeSingle();

        if (aData) {
          alojEndereco = alojEndereco || aData.endereco || '';
          alojCidade = alojCidade || aData.municipio || '';
          alojProvincia = alojProvincia || aData.provincia || '';
          alojCodigo = aData.codigo || alojCodigo;
          const sum = aData.suministros || {};
          const com = aData.comodidades || {};
          suministrosInfo = {
            agua: sum.agua !== false,
            luz: sum.luz !== false,
            gas: sum.gas !== false,
            internet: sum.internet !== false || com.wifi !== false,
            limpieza: Boolean(sum.limpieza),
            aire_acondicionado: Boolean(com.aire_acondicionado),
            calefaccion: com.calefaccion !== false,
            lavadora: com.lavadora !== false,
            cocina: com.cocina !== false,
            tv: com.tv !== false,
            parking: Boolean(com.parking)
          };
        }
      } catch (e) {}
    }

    const year = new Date().getFullYear();
    const seq = String(existingAll.length + 1).padStart(4, '0');
    const codigoTermo = `TR-ALOJ-${year}-${seq}`;
    const token =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '')
        : `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 12)}`;

    const representanteEmpresa = 'Coordinación de Logística & Operaciones';
    const empresaStampUrl = generateCompanyStampDataUrl(empresaContratante, representanteEmpresa);
    const todayStr = new Date().toISOString().split('T')[0];

    const payloadDb: any = {
      token,
      codigo_termo: codigoTermo,
      alocacao_id: input.alocacao_id || null,
      alojamento_id: isUuid(input.alojamento_id) ? input.alojamento_id : null,
      alojamento_codigo: alojCodigo,
      alojamento_nome: input.alojamento_nome || 'Alojamiento Corporativo',
      alojamento_endereco: alojEndereco || `${input.alojamento_nome} (${alojCidade || 'España'})`,
      alojamento_cidade: alojCidade || 'España',
      alojamento_provincia: alojProvincia || '',
      cama_identificador: input.cama_identificador || 'Habitación / Cama Individual',
      suministros_info: suministrosInfo,
      worker_id: isUuid(input.worker_id) ? input.worker_id : null,
      worker_codigo: input.worker_codigo || 'E-XXXX',
      worker_nome: input.worker_nome,
      worker_documento: workerDoc,
      worker_cargo: workerCargo,
      worker_movil: workerMovil,
      empresa_id: isUuid(empresaId) ? empresaId : null,
      empresa_contratante: empresaContratante,
      pedido_id: isUuid(input.pedido_id) ? input.pedido_id : null,
      pedido_codigo: input.pedido_codigo || '',
      cliente_nome: input.cliente_nome || '',
      obra_nome: input.obra_nome || '',
      data_emissao: todayStr,
      data_checkin: input.data_checkin || todayStr,
      status: 'PENDENTE',
      checklist_respostas: buildDefaultChecklistRespostas(),
      quantidade_mandos: '1',
      quantidade_llaves: '1 juego',
      observacoes_gerais: '',
      fotos_gerais: [],
      tem_avarias: false,
      total_fotos: 0,
      aceite_termos: false,
      empresa_representante_nome: representanteEmpresa,
      empresa_assinatura_url: empresaStampUrl
    };

    try {
      const { data: inserted, error } = await getClient()
        .from('termos_responsabilidade_alojamento')
        .insert([payloadDb])
        .select('*')
        .single();

      if (!error && inserted) {
        const hydrated = hydrateTermo(inserted);
        const updatedLocal = [hydrated, ...existingAll.filter(t => t.id !== hydrated.id)];
        saveLocalTermos(updatedLocal);
        return hydrated;
      }
    } catch (e) {
      console.warn('Erro ao inserir termo no Supabase, salvando localmente:', e);
    }

    const fallbackTermo: TermoResponsabilidadeAlojamento = hydrateTermo({
      id: `termo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...payloadDb,
      created_at: new Date().toISOString()
    });

    saveLocalTermos([fallbackTermo, ...existingAll]);
    return fallbackTermo;
  },

  async updateTermoCapa(
    id: string,
    updates: Partial<TermoResponsabilidadeAlojamento>
  ): Promise<TermoResponsabilidadeAlojamento | null> {
    try {
      const { data, error } = await getClient()
        .from('termos_responsabilidade_alojamento')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (!error && data) {
        const hydrated = hydrateTermo(data);
        const list = getLocalTermos().map(t => (t.id === id ? hydrated : t));
        saveLocalTermos(list);
        return hydrated;
      }
    } catch (e) {
      console.warn('Erro ao atualizar capa do termo:', e);
    }

    const list = getLocalTermos();
    const idx = list.findIndex(t => t.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
      saveLocalTermos(list);
      return list[idx];
    }
    return null;
  },

  async uploadFotoChecklist(file: File | Blob, termoCodigo = 'TR'): Promise<string> {
    return await uploadAlojamentoPhoto(file, `checklist_${termoCodigo}`);
  },

  async submitChecklistAndSignature(
    token: string,
    payload: {
      worker_documento?: string;
      worker_cargo?: string;
      alojamento_cidade?: string;
      cama_identificador?: string;
      checklist_respostas: ChecklistRespostasMap;
      quantidade_mandos: string;
      quantidade_llaves: string;
      observacoes_gerais?: string;
      fotos_gerais?: string[];
      worker_assinatura_url: string;
      assinatura_ip?: string;
      pdfBlob?: Blob;
    }
  ): Promise<TermoResponsabilidadeAlojamento> {
    const current = await this.getTermoByToken(token);
    if (!current) {
      throw new Error('Término de responsabilidad no encontrado.');
    }

    // Calcular se há avarias (REGULAR ou MALA) e total de fotos
    let temAvarias = false;
    let totalFotos = Array.isArray(payload.fotos_gerais) ? payload.fotos_gerais.length : 0;
    const avariasResumo: string[] = [];
    const todasFotosAvarias: string[] = [...(payload.fotos_gerais || [])];

    Object.entries(payload.checklist_respostas).forEach(([itemId, ans]) => {
      if (ans.estado === 'MALA' || ans.estado === 'REGULAR') {
        temAvarias = true;
        const itemDef = CHECKLIST_ITEMS_CATALOG.find(i => i.id === itemId);
        avariasResumo.push(
          `[${ans.estado}] ${itemDef?.labelEs || itemId}${ans.observacao ? `: ${ans.observacao}` : ''}`
        );
      }
      if (Array.isArray(ans.fotos) && ans.fotos.length > 0) {
        totalFotos += ans.fotos.length;
        todasFotosAvarias.push(...ans.fotos);
      }
    });

    const finalStatus: TermoResponsabilidadeAlojamento['status'] = temAvarias ? 'COM_INCIDENCIAS' : 'ASSINADO';
    const nowIso = new Date().toISOString();

    // Upload do PDF Assinado no bucket 'alojamentos'
    let pdfPublicUrl = current.pdf_url || '';
    let uploadedFilePath = '';
    const fileName = `Termino_Alojamiento_${current.alojamento_codigo || 'AL'}_${(current.worker_nome || 'Trabajador').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    if (payload.pdfBlob) {
      try {
        uploadedFilePath = `alojamentos/termos-assinados/${current.token}_${fileName}`;
        const storagePath = `termos-assinados/${current.token}_${fileName}`;
        const { data: upData, error: upErr } = await supabase.storage
          .from('alojamentos')
          .upload(storagePath, payload.pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (!upErr && upData) {
          const { data: pubData } = supabase.storage.from('alojamentos').getPublicUrl(storagePath);
          if (pubData?.publicUrl) {
            pdfPublicUrl = pubData.publicUrl;
          }
        }
      } catch (e) {
        console.warn('Aviso ao enviar PDF assinado ao storage:', e);
      }
    }

    const updateData: any = {
      worker_documento: payload.worker_documento ?? current.worker_documento,
      worker_cargo: payload.worker_cargo ?? current.worker_cargo,
      alojamento_cidade: payload.alojamento_cidade ?? current.alojamento_cidade,
      cama_identificador: payload.cama_identificador ?? current.cama_identificador,
      checklist_respostas: payload.checklist_respostas,
      quantidade_mandos: payload.quantidade_mandos,
      quantidade_llaves: payload.quantidade_llaves,
      observacoes_gerais: payload.observacoes_gerais || '',
      fotos_gerais: payload.fotos_gerais || [],
      tem_avarias: temAvarias,
      total_fotos: totalFotos,
      aceite_termos: true,
      worker_assinatura_url: payload.worker_assinatura_url,
      assinado_em: nowIso,
      assinatura_ip: payload.assinatura_ip || '0.0.0.0',
      assinatura_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Client',
      status: finalStatus,
      pdf_url: pdfPublicUrl || null,
      updated_at: nowIso
    };

    let updatedTermo: TermoResponsabilidadeAlojamento = {
      ...current,
      ...updateData
    };

    try {
      const { data: dbUpdated, error: dbErr } = await getClient()
        .from('termos_responsabilidade_alojamento')
        .update(updateData)
        .eq('token', token)
        .select('*')
        .maybeSingle();

      if (!dbErr && dbUpdated) {
        updatedTermo = hydrateTermo(dbUpdated);
      }
    } catch (e) {
      console.warn('Erro ao atualizar assinatura no banco:', e);
    }

    // Arquivar automaticamente no prontuário do trabalhador (core_personal.worker_documents) via RPC SECURITY DEFINER
    if (isUuid(updatedTermo.worker_id) && (uploadedFilePath || pdfPublicUrl)) {
      try {
        const { data: docId } = await supabase.rpc('arquivar_termo_alojamento_no_trabalhador', {
          p_termo_id: isUuid(updatedTermo.id) ? updatedTermo.id : null,
          p_worker_id: updatedTermo.worker_id,
          p_empresa_id: isUuid(updatedTermo.empresa_id) ? updatedTermo.empresa_id : null,
          p_file_path: uploadedFilePath || pdfPublicUrl,
          p_file_name: fileName,
          p_file_size: payload.pdfBlob?.size || 120400
        });

        if (docId) {
          updatedTermo.worker_document_id = docId;
        }
      } catch (rpcErr) {
        console.warn('Aviso ao arquivar documento no perfil do trabalhador:', rpcErr);
      }
    }

    // Se houver avarias reportadas no checklist, registrar automaticamente na linha do tempo de manutenção do Alojamento
    if (temAvarias && isUuid(updatedTermo.alojamento_id)) {
      try {
        const { data: alojRow } = await getClient()
          .from('alojamentos')
          .select('id, comodidades, historico_manutencao')
          .eq('id', updatedTermo.alojamento_id!)
          .maybeSingle();

        if (alojRow) {
          const comodidades = alojRow.comodidades || {};
          const currentHist = Array.isArray(alojRow.historico_manutencao)
            ? alojRow.historico_manutencao
            : Array.isArray(comodidades.__historico_observacoes)
              ? comodidades.__historico_observacoes
              : [];

          const novoRegistro = {
            id: `vistoria-checkin-${Date.now()}`,
            data_hora: nowIso,
            categoria: 'observacion_general',
            titulo: `Check-in con Incidencias — ${updatedTermo.worker_nome} (${updatedTermo.cama_identificador})`,
            conteudo_html: `<p><strong>Reporte de Check-in (${updatedTermo.codigo_termo}):</strong></p><ul>${avariasResumo
              .map(r => `<li>${r}</li>`)
              .join('')}</ul>${
              updatedTermo.observacoes_gerais
                ? `<p><strong>Observaciones del trabajador:</strong> ${updatedTermo.observacoes_gerais}</p>`
                : ''
            }`,
            conteudo_texto: avariasResumo.join(' | '),
            anexos: todasFotosAvarias.map((url, idx) => ({
              id: `foto-avaria-${Date.now()}-${idx}`,
              nome: `Evidencia_Checkin_${idx + 1}.jpg`,
              tipo: 'imagem',
              url,
              data_upload: nowIso
            })),
            autor: `${updatedTermo.worker_nome} (Check-in Digital)`,
            created_at: nowIso
          };

          const updatedHist = [novoRegistro, ...currentHist];
          await getClient()
            .from('alojamentos')
            .update({
              comodidades: {
                ...comodidades,
                __historico_observacoes: updatedHist
              }
            })
            .eq('id', updatedTermo.alojamento_id!);
        }
      } catch (histErr) {
        console.warn('Aviso ao registrar avarias no histórico do alojamento:', histErr);
      }
    }

    // Atualizar cache local
    const allLocal = getLocalTermos();
    const updatedList = [updatedTermo, ...allLocal.filter(t => t.token !== token && t.id !== updatedTermo.id)];
    saveLocalTermos(updatedList);

    return updatedTermo;
  }
};
