import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, Clock, CheckCircle2, AlertCircle, Plus, Search,
  Sparkles, TrendingUp, Layers, ChevronRight, Play, Check, ShieldAlert,
  ArrowUpRight, RefreshCw, X, MessageSquare, Repeat, Target, UserCheck,
  Building2, Briefcase, Mail, Send, Globe, AtSign, CheckSquare, Info,
  LayoutGrid, List, CalendarClock, Ban, Trash2, MoreVertical, AlertTriangle,
  Eye, Edit3, Video, MapPin, Monitor, ExternalLink, ChevronDown, ChevronUp,
  ListOrdered
} from 'lucide-react';
import { toast } from 'sonner';
import { reunioesService } from '../services/reunioesService';
import { listDepartments } from '../services/incidencias';
import { supabase } from '../services/supabaseClient';
import { VisualWysiwygEditor } from '../components/ui/VisualWysiwygEditor';
import type { Reuniao, TipoReuniao, StatusReuniao, ModalidadeReuniao } from '../types/reunioes';
import { TIPOS_REUNIAO_MAP } from '../types/reunioes';

interface EmployeeMember {
  id: string;
  department_id: string;
  department_name?: string;
  nombrecompleto: string;
  correoempresarial?: string;
  codigoresponsabilidad?: string;
  active: boolean;
}

export const Reunioes: React.FC = () => {
  const navigate = useNavigate();
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Modo de Visualização (Galeria / Cards vs Lista Compacta)
  const [viewMode, setViewMode] = useState<'cards' | 'lista'>(() => {
    return (localStorage.getItem('mcs_reunioes_view_mode') as 'cards' | 'lista') || 'cards';
  });

  const handleToggleViewMode = (mode: 'cards' | 'lista') => {
    setViewMode(mode);
    localStorage.setItem('mcs_reunioes_view_mode', mode);
  };

  // Controle de expansão de pautas completas nos cards
  const [expandedPautas, setExpandedPautas] = useState<Record<string, boolean>>({});
  const togglePautaExpanded = (id: string) => {
    setExpandedPautas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtros de listagem
  const [selectedTipo, setSelectedTipo] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedRecorrencia, setSelectedRecorrencia] = useState<'todos' | 'recorrente' | 'pontual'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de Adiar / Reagendar
  const [isAdiarModalOpen, setIsAdiarModalOpen] = useState(false);
  const [reuniaoParaAdiar, setReuniaoParaAdiar] = useState<Reuniao | null>(null);
  const [novaDataAdiada, setNovaDataAdiada] = useState('');
  const [adiando, setAdiando] = useState(false);

  // Modal de Criação / Agendamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newReuniao, setNewReuniao] = useState({
    titulo: 'Alinhamento Semanal: Comercial × Recursos Humanos',
    tipo: 'comercial_rh' as TipoReuniao,
    recorrente: true,
    data_reuniao: new Date().toISOString().slice(0, 16),
    duracao_minutos: 45,
    pauta_topicos: `<h3>Pauta do Alinhamento WBR</h3><ul><li><strong>1. Cobrança de Ações:</strong> Revisão das pendências pactuadas na semana anterior</li><li><strong>2. Pedidos em Aberto:</strong> Análise dos prazos de entrega vs capacidade de atração</li><li><strong>3. Desistências e Ocorrências:</strong> Casos críticos da semana e planos de contingência</li><li><strong>4. Novas Regras e Tarefas:</strong> Definição de responsáveis e prazos no sistema</li></ul>`,
    departamentos_envolvidos: ['Comercial', 'Recursos Humanos'],
    participantesSelecionados: [] as string[],
    modalidade: 'hibrido' as ModalidadeReuniao,
    local_presencial: 'Sala de Reuniões Principal (Sede Espanha)',
    link_online: '',
    plataforma_online: 'teams' as 'teams' | 'meet' | 'zoom' | 'outro'
  });

  // Estados da Notificação por E-mail
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [emailLanguage, setEmailLanguage] = useState<'es' | 'pt' | 'en'>('es');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [additionalEmails, setAdditionalEmails] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isManualEmailBodyEdit, setIsManualEmailBodyEdit] = useState(false);
  const [emailPreviewTab, setEmailPreviewTab] = useState<'visual' | 'edit'>('visual');

  // Formatador da Pauta para HTML de E-mail (Itens empilhados um abaixo do outro com layout limpo e 100% compatível)
  const formatPautaToEmailHtml = (raw: string): string => {
    if (!raw || !raw.trim()) {
      return '<p style="color: #64748b; font-style: italic; margin: 0;">Nenhuma pauta detalhada informada.</p>';
    }

    let text = raw.trim();

    // Se o texto não possui tags HTML de bloco (ex: markdown ou texto simples com quebras de linha)
    const hasHtmlBlocks = /<(h[1-6]|ul|ol|li|p|div)[^>]*>/i.test(text);

    if (!hasHtmlBlocks) {
      // 1. Processar cabeçalhos markdown
      text = text.replace(/^### (.*$)/gim, '<h4 style="margin: 4px 0 10px 0; font-size: 14px; font-weight: 800; color: #166534; border-bottom: 1px solid #bbf7d0; padding-bottom: 4px;">$1</h4>');
      text = text.replace(/^## (.*$)/gim, '<h3 style="margin: 4px 0 12px 0; font-size: 15px; font-weight: 800; color: #166534; border-bottom: 1px solid #bbf7d0; padding-bottom: 4px;">$1</h3>');
      text = text.replace(/^# (.*$)/gim, '<h2 style="margin: 4px 0 14px 0; font-size: 16px; font-weight: 800; color: #166534; border-bottom: 1px solid #bbf7d0; padding-bottom: 4px;">$1</h2>');

      // Negrito e Itálico markdown
      text = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a; font-weight: 700;">$1</strong>');
      text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

      // Separar por linhas para colocar cada tópico exatamente um embaixo do outro em cards brancos limpos
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const formattedBlocks = lines.map(line => {
        if (line.startsWith('<h')) return line;

        // Linha com numeração (ex: 1. ou 1) )
        const numMatch = line.match(/^(\d+)[\.\)]\s+(.*)/);
        if (numMatch) {
          return `<div style="margin: 8px 0; padding: 10px 14px; background-color: #ffffff; border: 1px solid #dcfce7; border-radius: 8px; line-height: 1.5; color: #1e293b;">
            <strong style="color: #16a34a; font-weight: 800; margin-right: 6px; font-size: 13px;">${numMatch[1]}.</strong> ${numMatch[2]}
          </div>`;
        }

        // Marcador (ex: - ou * ou •)
        const bulletMatch = line.match(/^[\*\-•]\s+(.*)/);
        if (bulletMatch) {
          return `<div style="margin: 8px 0; padding: 10px 14px; background-color: #ffffff; border: 1px solid #dcfce7; border-radius: 8px; line-height: 1.5; color: #1e293b;">
            <span style="color: #16a34a; font-weight: 800; margin-right: 8px; font-size: 14px;">•</span> ${bulletMatch[1]}
          </div>`;
        }

        return `<p style="margin: 6px 0; line-height: 1.5; color: #1e293b;">${line}</p>`;
      });

      return formattedBlocks.join('\n');
    } else {
      // 2. Se já veio como HTML (gerado pelo editor WYSIWYG)
      // Converte possíveis marcações residuais de markdown
      text = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a; font-weight: 700;">$1</strong>');
      text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

      // Aplica estilo inline para que cada item fique perfeitamente empilhado no e-mail
      text = text.replace(/<ul[^>]*>/gi, '<ul style="margin: 6px 0; padding: 0; list-style-type: none;">');
      text = text.replace(/<ol[^>]*>/gi, '<ol style="margin: 6px 0; padding: 0; list-style-type: none;">');
      text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '<li style="margin: 8px 0; padding: 10px 14px; background-color: #ffffff; border: 1px solid #dcfce7; border-radius: 8px; line-height: 1.5; color: #1e293b; list-style: none;">$1</li>');
      text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '<h4 style="margin: 4px 0 10px 0; font-size: 14px; font-weight: 800; color: #166534; border-bottom: 1px solid #bbf7d0; padding-bottom: 4px;">$1</h4>');
      text = text.replace(/<p[^>]*>/gi, '<p style="margin: 6px 0; line-height: 1.5; color: #1e293b;">');
      text = text.replace(/<strong[^>]*>/gi, '<strong style="color: #0f172a; font-weight: 700;">');

      return text;
    }
  };

  // Conversor de HTML para Texto Limpo sem tags (para o editor de texto do e-mail)
  const htmlToCleanPlainText = (html: string): string => {
    if (!html) return '';
    let str = html;

    // Converte cabeçalhos em marcadores de seção
    str = str.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n📌 $1\n');
    str = str.replace(/^### (.*$)/gim, '\n📌 $1\n');
    str = str.replace(/^## (.*$)/gim, '\n📌 $1\n');
    str = str.replace(/^# (.*$)/gim, '\n📌 $1\n');

    // Converte itens de lista em marcadores com recuo
    str = str.replace(/<li[^>]*>(.*?)<\/li>/gi, '  • $1\n');

    // Converte quebras de linha e blocos
    str = str.replace(/<br\s*[\/]?>/gi, '\n');
    str = str.replace(/<\/p>/gi, '\n');
    str = str.replace(/<p[^>]*>/gi, '');
    str = str.replace(/<\/div>/gi, '\n');
    str = str.replace(/<div[^>]*>/gi, '');

    // Remove todas as outras tags HTML (strong, span, u, ul, ol, etc)
    str = str.replace(/<[^>]+>/gi, '');

    // Remove marcações markdown
    str = str.replace(/\*\*(.*?)\*\*/g, '$1');
    str = str.replace(/\*(.*?)\*/g, '$1');

    // Decodifica entidades HTML
    str = str
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Limpa quebras de linhas repetidas
    str = str
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return str;
  };

  // Extrator e organizador dos tópicos da Pauta (Remove tags HTML e estrutura itens limpos)
  const extractPautaTopics = (raw: string | undefined): { title?: string; topics: string[] } => {
    if (!raw || !raw.trim()) return { topics: [] };

    // 1. Caso haja marcações de lista <li>...</li> (geradas pelo editor visual ou template)
    const liMatches = raw.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    if (liMatches && liMatches.length > 0) {
      let title: string | undefined;
      const hMatch = raw.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
      if (hMatch) {
        title = hMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      }

      const topics = liMatches
        .map(li => {
          return li
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
        })
        .filter(t => t.length > 0);

      return { title, topics };
    }

    // 2. Limpeza profunda de tags HTML, quebras e entidades
    let cleaned = raw
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '$1\n')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/gi, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[#*`]/g, '')
      .trim();

    // Se possui sequência enumerada como "1. ... 2. ... 3. ..." (mesmo corrida numa linha só)
    if (/\b1[\.\)]\s+/.test(cleaned) && /\b2[\.\)]\s+/.test(cleaned)) {
      const firstNumIdx = cleaned.search(/\b1[\.\)]\s+/);
      let title: string | undefined;
      let itemsPart = cleaned;
      if (firstNumIdx > 0) {
        title = cleaned.slice(0, firstNumIdx).trim();
        itemsPart = cleaned.slice(firstNumIdx);
      }
      const parts = itemsPart
        .split(/(?=\b\d+[\.\)]\s+)/)
        .map(p => p.trim())
        .filter(Boolean);
      return { title, topics: parts };
    }

    // Se possui quebras de linhas explícitas
    const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      return { topics: lines };
    }

    return { topics: [cleaned] };
  };

  // Gerador de Templates de E-mail nos 3 Idiomas
  const generateEmailContent = (
    lang: 'es' | 'pt' | 'en',
    dados: typeof newReuniao
  ) => {
    const dataObj = new Date(dados.data_reuniao);
    const dateFormatted = dataObj.toLocaleDateString(
      lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US',
      { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
    );
    const timeFormatted = dataObj.toLocaleTimeString(
      lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US',
      { hour: '2-digit', minute: '2-digit' }
    );

    const deptsStr = dados.departamentos_envolvidos.join(' • ') || 'Operaciones';
    const participantsStr = dados.participantesSelecionados.length > 0
      ? dados.participantesSelecionados.join(', ')
      : (lang === 'pt' ? 'Todos os convocados' : lang === 'es' ? 'Todos los convocados' : 'All participants');

    // Converte a pauta HTML em texto limpo com marcadores e SEM NENHUMA tag de código
    const pautaLimpa = htmlToCleanPlainText(dados.pauta_topicos);

    // Formatação de Local e Modalidade Online
    const modalidade = dados.modalidade || 'presencial';
    const plataformaNome = dados.plataforma_online === 'meet' ? 'Google Meet' : dados.plataforma_online === 'zoom' ? 'Zoom' : 'Microsoft Teams';

    let localLinhas = '';
    if (lang === 'es') {
      if (modalidade === 'presencial') {
        localLinhas = `📍 LUGAR / SALA: ${dados.local_presencial || 'Sala de Reuniones Principal'}\n`;
      } else if (modalidade === 'online') {
        localLinhas = `💻 MODALIDAD: 100% Online (${plataformaNome})\n${dados.link_online ? `🔗 ENLACE DE ACCESO: ${dados.link_online}\n` : ''}`;
      } else {
        localLinhas = `📍 LUGAR PRESENCIAL: ${dados.local_presencial || 'Sala de Reuniones Principal'}\n🌐 CONEXIÓN ONLINE (Brasil, Dubai, Italia, España): ${plataformaNome}\n${dados.link_online ? `🔗 ENLACE DE ACCESO VIRTUAL: ${dados.link_online}\n` : ''}`;
      }
    } else if (lang === 'pt') {
      if (modalidade === 'presencial') {
        localLinhas = `📍 LOCAL / SALA: ${dados.local_presencial || 'Sala de Reuniões Principal'}\n`;
      } else if (modalidade === 'online') {
        localLinhas = `💻 MODALIDADE: 100% Online (${plataformaNome})\n${dados.link_online ? `🔗 LINK DE ACESSO: ${dados.link_online}\n` : ''}`;
      } else {
        localLinhas = `📍 LOCAL PRESENCIAL: ${dados.local_presencial || 'Sala de Reuniões Principal'}\n🌐 PARTICIPAÇÃO ONLINE (Brasil, Dubai, Itália, Espanha): ${plataformaNome}\n${dados.link_online ? `🔗 LINK DE ACESSO VIRTUAL: ${dados.link_online}\n` : ''}`;
      }
    } else {
      if (modalidade === 'presencial') {
        localLinhas = `📍 LOCATION / ROOM: ${dados.local_presencial || 'Main Meeting Room'}\n`;
      } else if (modalidade === 'online') {
        localLinhas = `💻 FORMAT: 100% Online (${plataformaNome})\n${dados.link_online ? `🔗 MEETING LINK: ${dados.link_online}\n` : ''}`;
      } else {
        localLinhas = `📍 PHYSICAL LOCATION: ${dados.local_presencial || 'Main Meeting Room'}\n🌐 ONLINE ACCESS (Brazil, Dubai, Italy, Spain): ${plataformaNome}\n${dados.link_online ? `🔗 ACCESS LINK: ${dados.link_online}\n` : ''}`;
      }
    }

    if (lang === 'es') {
      return {
        subject: `[Convocatoria] ${dados.titulo} - ${dateFormatted} a las ${timeFormatted}`,
        body: `Estimado equipo,\n\nHan sido convocados a la reunión de alineación interdepartamental:\n\n📌 TÍTULO: ${dados.titulo}\n🏢 DEPARTAMENTOS: ${deptsStr}\n📅 FECHA: ${dateFormatted}\n⏰ HORA: ${timeFormatted}\n⏱️ DURACIÓN PREVISTA: ${dados.duracao_minutos} minutos\n${localLinhas}👥 CONVOCADOS: ${participantsStr}\n\n📋 ORDEN DEL DÍA / TEMAS A TRATAR:\n${pautaLimpa}\n\nAgradecemos la puntualidad y el compromiso de todos para mantener nuestros procesos alineados y eficientes.\n\nAtentamente,\nMCS Personal - Gestión Operativa`
      };
    } else if (lang === 'pt') {
      return {
        subject: `[Convocação] ${dados.titulo} - ${dateFormatted} às ${timeFormatted}`,
        body: `Prezada equipe,\n\nVocês foram convocados para a reunião de alinhamento interdepartamental:\n\n📌 TÍTULO: ${dados.titulo}\n🏢 DEPARTAMENTOS: ${deptsStr}\n📅 DATA: ${dateFormatted}\n⏰ HORÁRIO: ${timeFormatted}\n⏱️ DURAÇÃO PREVISTA: ${dados.duracao_minutos} minutos\n${localLinhas}👥 CONVOCADOS: ${participantsStr}\n\n📋 PAUTA E PONTOS DE DISCUSSÃO:\n${pautaLimpa}\n\nContamos com a pontualidade e participação ativa de todos para alinhamento dos fluxos e resolução dos gargalos operacionais.\n\nAtenciosamente,\nMCS Personal - Gestão Operacional`
      };
    } else {
      return {
        subject: `[Meeting Invitation] ${dados.titulo} - ${dateFormatted} at ${timeFormatted}`,
        body: `Dear team,\n\nYou are invited to the cross-departmental alignment meeting:\n\n📌 TITLE: ${dados.titulo}\n🏢 DEPARTMENTS: ${deptsStr}\n📅 DATE: ${dateFormatted}\n⏰ TIME: ${timeFormatted}\n⏱️ ESTIMATED DURATION: ${dados.duracao_minutos} minutes\n${localLinhas}👥 INVITED PARTICIPANTS: ${participantsStr}\n\n📋 MEETING AGENDA:\n${pautaLimpa}\n\nPlease ensure punctuality as we review performance and resolve cross-functional bottlenecks.\n\nBest regards,\nMCS Personal - Operations Management`
      };
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, depts, { data: membersData }] = await Promise.all([
        reunioesService.listReunioes({
          tipo: selectedTipo !== 'todos' ? selectedTipo : undefined,
          status: selectedStatus !== 'todos' ? selectedStatus : undefined
        }),
        listDepartments().catch(() => []),
        supabase
          .from('mcs_department_members')
          .select(`
            id,
            department_id,
            nombrecompleto,
            correoempresarial,
            codigoresponsabilidad,
            active,
            mcs_departments (
              id,
              name
            )
          `)
          .eq('active', true)
          .order('nombrecompleto')
      ]);

      setReunioes(list);
      setDepartments(depts || []);

      if (membersData) {
        const formattedMembers: EmployeeMember[] = membersData.map((m: any) => ({
          id: m.id,
          department_id: m.department_id,
          department_name: m.mcs_departments?.name || '',
          nombrecompleto: m.nombrecompleto || 'Sem Nome',
          correoempresarial: m.correoempresarial || '',
          codigoresponsabilidad: m.codigoresponsabilidad || '',
          active: m.active
        }));
        setAllEmployees(formattedMembers);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar reuniões');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTipo, selectedStatus]);

  // Métricas WBR
  const totalReunioes = reunioes.length;
  const agendadas = reunioes.filter(r => r.status === 'agendada' || r.status === 'em_andamento').length;
  const concluidas = reunioes.filter(r => r.status === 'concluida').length;
  
  const todasAcoes = reunioes.flatMap(r => r.acoes || []);
  const totalAcoes = todasAcoes.length;
  const acoesConcluidas = todasAcoes.filter(a => a.status === 'Concluida').length;
  const taxaConclusao = totalAcoes > 0 ? Math.round((acoesConcluidas / totalAcoes) * 100) : 100;

  // Próxima reunião
  const proximaReuniao = reunioes
    .filter(r => r.status === 'agendada' && new Date(r.data_reuniao).getTime() >= Date.now() - 3600000)
    .sort((a, b) => new Date(a.data_reuniao).getTime() - new Date(b.data_reuniao).getTime())[0];

  // Funcionários ativos dos departamentos atualmente selecionados na modal
  const funcionariosDisponiveis = useMemo(() => {
    if (newReuniao.departamentos_envolvidos.length === 0) return [];
    
    const deptsSelecionadosLower = newReuniao.departamentos_envolvidos.map(d => d.toLowerCase().trim());
    const deptIdsSelecionados = departments
      .filter(d => deptsSelecionadosLower.includes(d.name?.toLowerCase().trim()))
      .map(d => d.id);

    return allEmployees.filter(emp => {
      const matchName = emp.department_name && deptsSelecionadosLower.includes(emp.department_name.toLowerCase().trim());
      const matchId = emp.department_id && deptIdsSelecionados.includes(emp.department_id);
      return matchName || matchId;
    });
  }, [newReuniao.departamentos_envolvidos, allEmployees, departments]);

  // Sincronizar e-mails dos convocados
  const convocadosComEmail = useMemo(() => {
    return allEmployees.filter(emp => 
      newReuniao.participantesSelecionados.includes(emp.nombrecompleto) && 
      emp.correoempresarial && 
      emp.correoempresarial.includes('@')
    );
  }, [newReuniao.participantesSelecionados, allEmployees]);

  // Atualizar destinatários selecionados automaticamente quando participantes mudam
  useEffect(() => {
    const validEmails = Array.from(new Set(convocadosComEmail.map(e => e.correoempresarial!.trim())));
    setSelectedEmails(validEmails);
  }, [convocadosComEmail]);

  // Atualizar Assunto e Corpo do E-mail quando os dados principais mudarem
  useEffect(() => {
    if (!isManualEmailBodyEdit) {
      const generated = generateEmailContent(emailLanguage, newReuniao);
      setEmailSubject(generated.subject);
      setEmailBody(generated.body);
    }
  }, [
    newReuniao.titulo, newReuniao.data_reuniao, newReuniao.duracao_minutos,
    newReuniao.departamentos_envolvidos, newReuniao.participantesSelecionados,
    newReuniao.pauta_topicos, newReuniao.modalidade, newReuniao.local_presencial,
    newReuniao.link_online, newReuniao.plataforma_online, emailLanguage
  ]);

  // Ao trocar o idioma do e-mail explicitamente
  const handleLanguageChange = (lang: 'es' | 'pt' | 'en') => {
    setEmailLanguage(lang);
    setIsManualEmailBodyEdit(false);
    const generated = generateEmailContent(lang, newReuniao);
    setEmailSubject(generated.subject);
    setEmailBody(generated.body);
  };

  // Ao trocar o Tipo de Alinhamento
  const handleTipoChange = (tipo: TipoReuniao) => {
    const config = TIPOS_REUNIAO_MAP[tipo];
    const deptsSugeridos = config.depts;
    
    setNewReuniao(prev => ({
      ...prev,
      tipo,
      titulo: `Alinhamento Semanal: ${config.label}`,
      departamentos_envolvidos: deptsSugeridos
    }));
  };

  // Alternar seleção de um departamento
  const handleToggleDepartamento = (deptName: string) => {
    setNewReuniao(prev => {
      const exists = prev.departamentos_envolvidos.some(
        d => d.toLowerCase().trim() === deptName.toLowerCase().trim()
      );
      let updatedDepts: string[];
      if (exists) {
        updatedDepts = prev.departamentos_envolvidos.filter(
          d => d.toLowerCase().trim() !== deptName.toLowerCase().trim()
        );
      } else {
        updatedDepts = [...prev.departamentos_envolvidos, deptName];
      }

      const novoTitulo = updatedDepts.length > 0
        ? `Alinhamento: ${updatedDepts.join(' × ')}`
        : 'Alinhamento Intersetorial';

      return {
        ...prev,
        departamentos_envolvidos: updatedDepts,
        titulo: novoTitulo
      };
    });
  };

  // Alternar seleção de funcionário para convocação
  const handleToggleParticipante = (empIdentifier: string) => {
    setNewReuniao(prev => {
      const exists = prev.participantesSelecionados.includes(empIdentifier);
      const updated = exists
        ? prev.participantesSelecionados.filter(p => p !== empIdentifier)
        : [...prev.participantesSelecionados, empIdentifier];
      return { ...prev, participantesSelecionados: updated };
    });
  };

  // Convocação rápida por departamento
  const handleSelecionarTodosDoDepartamento = (deptName: string) => {
    const deptsLower = deptName.toLowerCase().trim();
    const empsDoSetor = funcionariosDisponiveis.filter(
      e => e.department_name?.toLowerCase().trim() === deptsLower
    );
    const identifiers = empsDoSetor.map(e => e.nombrecompleto);

    setNewReuniao(prev => {
      const current = new Set(prev.participantesSelecionados);
      identifiers.forEach(id => current.add(id));
      return { ...prev, participantesSelecionados: Array.from(current) };
    });
  };

  const handleLimparTodosDoDepartamento = (deptName: string) => {
    const deptsLower = deptName.toLowerCase().trim();
    const empsDoSetor = funcionariosDisponiveis.filter(
      e => e.department_name?.toLowerCase().trim() === deptsLower
    );
    const identifiers = new Set(empsDoSetor.map(e => e.nombrecompleto));

    setNewReuniao(prev => ({
      ...prev,
      participantesSelecionados: prev.participantesSelecionados.filter(p => !identifiers.has(p))
    }));
  };

  // --- AÇÕES CRUD DE GESTÃO DA REUNIÃO ---

  // Cancelar reunião
  const handleCancelarReuniao = async (reuniao: Reuniao) => {
    if (!confirm(`Deseja realmente cancelar o alinhamento "${reuniao.titulo}"?`)) return;
    try {
      await reunioesService.updateReuniao(reuniao.id, { status: 'cancelada' });
      toast.success('Reunião cancelada com sucesso!');
      loadData();
    } catch (err: any) {
      toast.error('Erro ao cancelar reunião');
    }
  };

  // Excluir reunião
  const handleExcluirReuniao = async (reuniao: Reuniao) => {
    if (!confirm(`ATENÇÃO: Deseja apagar permanentemente a reunião "${reuniao.titulo}"? Esta ação removerá o registro do sistema.`)) return;
    try {
      await reunioesService.deleteReuniao(reuniao.id);
      toast.success('Reunião excluída com sucesso!');
      loadData();
    } catch (err: any) {
      toast.error('Erro ao excluir reunião');
    }
  };

  // Abrir Modal de Adiar
  const handleAbrirAdiarModal = (reuniao: Reuniao) => {
    setReuniaoParaAdiar(reuniao);
    setNovaDataAdiada(new Date(reuniao.data_reuniao).toISOString().slice(0, 16));
    setIsAdiarModalOpen(true);
  };

  // Confirmar Reagendamento / Adiar
  const handleConfirmarAdiar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reuniaoParaAdiar || !novaDataAdiada) return;

    setAdiando(true);
    try {
      await reunioesService.updateReuniao(reuniaoParaAdiar.id, {
        data_reuniao: new Date(novaDataAdiada).toISOString(),
        status: 'agendada'
      });
      toast.success('Reunião reagendada com sucesso!');
      setIsAdiarModalOpen(false);
      setReuniaoParaAdiar(null);
      loadData();
    } catch (err: any) {
      toast.error('Erro ao reagendar reunião');
    } finally {
      setAdiando(false);
    }
  };

  // Criar / Agendar Reunião & Disparar E-mails
  const handleCreateReuniao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReuniao.titulo.trim()) {
      toast.error('Por favor informe o título da reunião');
      return;
    }

    if (newReuniao.departamentos_envolvidos.length < 2) {
      toast.error('Selecione pelo menos 2 departamentos para realizar o alinhamento intersetorial');
      return;
    }

    setCreating(true);
    try {
      const created = await reunioesService.createReuniao({
        titulo: newReuniao.titulo,
        tipo: newReuniao.tipo,
        data_reuniao: new Date(newReuniao.data_reuniao).toISOString(),
        duracao_minutos: Number(newReuniao.duracao_minutos) || 45,
        recorrente: newReuniao.recorrente,
        pauta_topicos: newReuniao.pauta_topicos,
        departamentos_envolvidos: newReuniao.departamentos_envolvidos,
        participantes: newReuniao.participantesSelecionados,
        modalidade: newReuniao.modalidade,
        local_presencial: newReuniao.local_presencial,
        link_online: newReuniao.link_online,
        plataforma_online: newReuniao.plataforma_online,
        status: 'agendada'
      });

      if (sendEmailNotification) {
        const toEmails = [...selectedEmails];
        if (additionalEmails.trim()) {
          additionalEmails.split(',').forEach(em => {
            const trimmed = em.trim();
            if (trimmed && trimmed.includes('@') && !toEmails.includes(trimmed)) {
              toEmails.push(trimmed);
            }
          });
        }

        if (toEmails.length > 0) {
          try {
            let contentBodyHtml = '';
            if (isManualEmailBodyEdit) {
              const linkRegex = /(https?:\/\/[^\s]+)/g;
              contentBodyHtml = emailBody
                .replace(linkRegex, (url) => `<a href="${url}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${url}</a>`)
                .replace(/\n/g, '<br/>');
            } else {
              const dataObj = new Date(newReuniao.data_reuniao);
              const dateFormatted = dataObj.toLocaleDateString(
                emailLanguage === 'pt' ? 'pt-BR' : emailLanguage === 'es' ? 'es-ES' : 'en-US',
                { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
              );
              const timeFormatted = dataObj.toLocaleTimeString(
                emailLanguage === 'pt' ? 'pt-BR' : emailLanguage === 'es' ? 'es-ES' : 'en-US',
                { hour: '2-digit', minute: '2-digit' }
              );
              const deptsStr = newReuniao.departamentos_envolvidos.join(' • ') || 'Operaciones';
              const participantsStr = newReuniao.participantesSelecionados.length > 0
                ? newReuniao.participantesSelecionados.join(', ')
                : (emailLanguage === 'pt' ? 'Todos os convocados' : emailLanguage === 'es' ? 'Todos los convocados' : 'All participants');

              const saudacao = emailLanguage === 'pt'
                ? 'Prezada equipe,<br/><br/>Vocês foram convocados para a reunião de alinhamento interdepartamental:'
                : emailLanguage === 'es'
                ? 'Estimado equipo,<br/><br/>Han sido convocados a la reunión de alineación interdepartamental:'
                : 'Dear team,<br/><br/>You are invited to the cross-departmental alignment meeting:';

              const tituloLabel = emailLanguage === 'es' ? 'TÍTULO' : emailLanguage === 'pt' ? 'TÍTULO' : 'TITLE';
              const deptsLabel = emailLanguage === 'es' ? 'DEPARTAMENTOS' : emailLanguage === 'pt' ? 'DEPARTAMENTOS' : 'DEPARTMENTS';
              const dataLabel = emailLanguage === 'es' ? 'FECHA' : emailLanguage === 'pt' ? 'DATA' : 'DATE';
              const horaLabel = emailLanguage === 'es' ? 'HORA' : emailLanguage === 'pt' ? 'HORÁRIO' : 'TIME';
              const duracaoLabel = emailLanguage === 'es' ? 'DURACIÓN PREVISTA' : emailLanguage === 'pt' ? 'DURAÇÃO PREVISTA' : 'ESTIMATED DURATION';
              const convocadosLabel = emailLanguage === 'es' ? 'CONVOCADOS' : emailLanguage === 'pt' ? 'CONVOCADOS' : 'INVITED PARTICIPANTS';
              const pautaLabel = emailLanguage === 'es' ? 'ORDEN DEL DÍA / TEMAS A TRATAR' : emailLanguage === 'pt' ? 'PAUTA E PONTOS DE DISCUSSÃO' : 'MEETING AGENDA';

              const despedida = emailLanguage === 'pt'
                ? 'Contamos com a pontualidade e participação ativa de todos para alinhamento dos fluxos e resolução dos gargalos operacionais.<br/><br/>Atenciosamente,<br/><strong>MCS Personal - Gestão Operacional</strong>'
                : emailLanguage === 'es'
                ? 'Agradecemos la puntualidad y el compromiso de todos para mantener nuestros procesos alineados y eficientes.<br/><br/>Atentamente,<br/><strong>MCS Personal - Gestión Operativa</strong>'
                : 'Please ensure punctuality as we review performance and resolve cross-functional bottlenecks.<br/><br/>Best regards,<br/><strong>MCS Personal - Operations Management</strong>';

              // Local e Conexão Online
              const modalidade = newReuniao.modalidade || 'presencial';
              const plataformaNome = newReuniao.plataforma_online === 'meet' ? 'Google Meet' : newReuniao.plataforma_online === 'zoom' ? 'Zoom' : 'Microsoft Teams';
              let localHtml = '';

              if (modalidade === 'presencial') {
                localHtml = `<p style="margin: 3px 0;"><strong>📍 ${emailLanguage === 'es' ? 'LUGAR / SALA' : emailLanguage === 'pt' ? 'LOCAL / SALA' : 'LOCATION / ROOM'}:</strong> ${newReuniao.local_presencial || 'Sala de Reuniones Principal'}</p>`;
              } else if (modalidade === 'online') {
                localHtml = `
                  <p style="margin: 3px 0;"><strong>💻 ${emailLanguage === 'es' ? 'MODALIDAD' : emailLanguage === 'pt' ? 'MODALIDADE' : 'FORMAT'}:</strong> 100% Online (${plataformaNome})</p>
                  ${newReuniao.link_online ? `<p style="margin: 10px 0;"><a href="${newReuniao.link_online}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 8px 16px; border-radius: 6px; font-weight: bold; text-decoration: none; font-size: 13px;">💻 ${emailLanguage === 'es' ? 'Entrar a la Sala Virtual' : emailLanguage === 'pt' ? 'Entrar na Sala Virtual' : 'Join Virtual Meeting'}</a></p>` : ''}
                `;
              } else {
                localHtml = `
                  <p style="margin: 3px 0;"><strong>📍 ${emailLanguage === 'es' ? 'LUGAR PRESENCIAL' : emailLanguage === 'pt' ? 'LOCAL PRESENCIAL' : 'PHYSICAL LOCATION'}:</strong> ${newReuniao.local_presencial || 'Sala de Reuniones Principal'}</p>
                  <p style="margin: 3px 0;"><strong>🌐 ${emailLanguage === 'es' ? 'CONEXIÓN ONLINE (Brasil, Dubai, Italia, España)' : emailLanguage === 'pt' ? 'PARTICIPAÇÃO ONLINE (Brasil, Dubai, Itália, Espanha)' : 'ONLINE ACCESS (Brazil, Dubai, Italy, Spain)'}:</strong> ${plataformaNome}</p>
                  ${newReuniao.link_online ? `<p style="margin: 10px 0;"><a href="${newReuniao.link_online}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 8px 16px; border-radius: 6px; font-weight: bold; text-decoration: none; font-size: 13px;">💻 ${emailLanguage === 'es' ? 'Entrar a la Sala Virtual' : emailLanguage === 'pt' ? 'Entrar na Sala Virtual' : 'Join Virtual Meeting'}</a> <span style="font-size: 11px; color: #64748b;">(${emailLanguage === 'es' ? 'Equipos remotos' : emailLanguage === 'pt' ? 'Equipes remotas' : 'Remote teams'})</span></p>` : ''}
                `;
              }

              contentBodyHtml = `
                <p style="margin: 0 0 16px 0;">${saudacao}</p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 16px 0; font-size: 13px; line-height: 1.6;">
                  <p style="margin: 3px 0;"><strong>📌 ${tituloLabel}:</strong> ${newReuniao.titulo}</p>
                  <p style="margin: 3px 0;"><strong>🏢 ${deptsLabel}:</strong> ${deptsStr}</p>
                  <p style="margin: 3px 0;"><strong>📅 ${dataLabel}:</strong> ${dateFormatted}</p>
                  <p style="margin: 3px 0;"><strong>⏰ ${horaLabel}:</strong> ${timeFormatted}</p>
                  <p style="margin: 3px 0;"><strong>⏱️ ${duracaoLabel}:</strong> ${newReuniao.duracao_minutos} min</p>
                  ${localHtml}
                  <p style="margin: 3px 0;"><strong>👥 ${convocadosLabel}:</strong> ${participantsStr}</p>
                </div>
                <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; padding: 16px 20px; margin: 18px 0;">
                  <div style="font-weight: 800; color: #166534; font-size: 13px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    📋 ${pautaLabel}:
                  </div>
                  <div style="color: #1e293b; font-size: 13px; line-height: 1.6;">
                    ${formatPautaToEmailHtml(newReuniao.pauta_topicos)}
                  </div>
                </div>
                <p style="margin: 16px 0 0 0; color: #475569; font-size: 13px; line-height: 1.5;">${despedida}</p>
              `;
            }

            const emailHtmlCard = `
              <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 28px; color: #ffffff;">
                  <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: #60a5fa; margin-bottom: 6px;">
                    MCS Personal • Convocatória Oficial
                  </div>
                  <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                    ${newReuniao.titulo}
                  </h2>
                </div>
                <div style="padding: 28px; color: #334155; font-size: 14px; line-height: 1.6;">
                  ${contentBodyHtml}
                </div>
                <div style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b;">
                  Este é um comunicado automático gerado pelo módulo de Operações e Alinhamento da <strong>MCS Personal</strong>.
                </div>
              </div>
            `;

            const { error: mailErr } = await supabase.functions.invoke('send-order-notification', {
              body: {
                to_emails: toEmails,
                email_subject: emailSubject,
                email_body: emailHtmlCard
              }
            });

            if (mailErr) {
              console.warn('Aviso ao enviar e-mails de convocação:', mailErr);
              toast.warning(`Reunião agendada, mas ocorreu um erro no envio dos e-mails: ${mailErr.message}`);
            } else {
              toast.success(`E-mails de convocação enviados com sucesso para ${toEmails.length} destinatários!`);
            }
          } catch (mErr: any) {
            console.warn('Falha na chamada de e-mail:', mErr);
            toast.warning('Reunião agendada, mas os e-mails não puderam ser entregues.');
          }
        } else {
          toast.info('Reunião agendada sem envio de e-mails (nenhum destinatário com e-mail selecionado).');
        }
      } else {
        toast.success('Reunião agendada com sucesso!');
      }

      setIsModalOpen(false);
      await loadData();
      if (created?.id) {
        navigate(`/operacoes/reunioes/${created.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao agendar reunião');
    } finally {
      setCreating(false);
    }
  };

  // Filtragem completa
  const filteredReunioes = reunioes.filter(r => {
    // Busca por termo
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match = (
        r.titulo.toLowerCase().includes(term) ||
        (r.pauta_topicos || '').toLowerCase().includes(term) ||
        r.departamentos_envolvidos.some(d => d.toLowerCase().includes(term))
      );
      if (!match) return false;
    }

    // Filtro por recorrência (contínua vs pontual)
    if (selectedRecorrencia === 'recorrente' && r.recorrente === false) return false;
    if (selectedRecorrencia === 'pontual' && r.recorrente !== false) return false;

    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Header com Identidade Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs tracking-wider uppercase">
            <Sparkles size={16} />
            Metodologia WBR + Ciclo PDCA Operacional
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Reuniões & Alinhamentos Interdepartamentais
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Elimine atritos entre Comercial, RH, Logística e Financeiro. Conduza encontros orientados a dados reais, convoque os colaboradores-chave com disparos de e-mail integrados e acompanhe o cumprimento das ações no sistema.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 self-start md:self-center">
          <button
            onClick={() => {
              const defaultData = {
                titulo: 'Alinhamento Semanal: Comercial × Recursos Humanos',
                tipo: 'comercial_rh' as TipoReuniao,
                recorrente: true,
                data_reuniao: new Date().toISOString().slice(0, 16),
                duracao_minutos: 45,
                pauta_topicos: `<h3>Pauta do Alinhamento WBR</h3><ul><li><strong>1. Cobrança de Ações:</strong> Revisão das pendências pactuadas na semana anterior</li><li><strong>2. Pedidos em Aberto:</strong> Análise dos prazos de entrega vs capacidade de atração</li><li><strong>3. Desistências e Ocorrências:</strong> Casos críticos da semana e planos de contingência</li><li><strong>4. Novas Regras e Tarefas:</strong> Definição de responsáveis e prazos no sistema</li></ul>`,
                departamentos_envolvidos: ['Comercial', 'Recursos Humanos'],
                participantesSelecionados: [] as string[],
                modalidade: 'hibrido' as ModalidadeReuniao,
                local_presencial: 'Sala de Reuniões Principal (Sede Espanha)',
                link_online: '',
                plataforma_online: 'teams' as 'teams' | 'meet' | 'zoom' | 'outro'
              };
              setNewReuniao(defaultData);
              setIsManualEmailBodyEdit(false);
              const generated = generateEmailContent('es', defaultData);
              setEmailSubject(generated.subject);
              setEmailBody(generated.body);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} />
            Agendar Novo Alinhamento
          </button>
        </div>
      </div>

      {/* Cards de Métricas e Raio-X do Ciclo WBR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Próximo Encontro */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Próximo Encontro</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-3">
            {proximaReuniao ? (
              <>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                  {proximaReuniao.titulo}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <Clock size={13} />
                  {new Date(proximaReuniao.data_reuniao).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">Nenhum encontro agendado</p>
            )}
          </div>
          {proximaReuniao && (
            <button
              onClick={() => navigate(`/operacoes/reunioes/${proximaReuniao.id}`)}
              className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Abrir Cockpit <ArrowUpRight size={14} />
            </button>
          )}
        </div>

        {/* Taxa de Cumprimento de Ações (WBR Compliance) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Taxa de Conclusão (WBR)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{taxaConclusao}%</span>
              <span className="text-xs text-slate-500">das ações pactuadas</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${taxaConclusao}%` }}
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {acoesConcluidas} de {totalAcoes} tarefas resolvidas
          </div>
        </div>

        {/* Ciclos Realizados */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Ciclos Realizados</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{concluidas}</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {agendadas} em andamento / agendadas
            </p>
          </div>
          <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            Histórico registrado no sistema
          </div>
        </div>

        {/* Estrutura PDCA */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Estrutura PDCA</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
              Rito Semanal Ativo
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              4 Blocos: Check ➡️ Plan ➡️ Do ➡️ Act
            </p>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Duração padrão de 45 min
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Alternância de Visualização e Busca */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Campo de Busca & Atualizar */}
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Buscar por pauta, título ou setor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <button
            onClick={loadData}
            title="Atualizar lista"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Filtros Dropdowns & Alternância de Visualização */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Filtro de Recorrência / Ciclo */}
          <select
            value={selectedRecorrencia}
            onChange={e => setSelectedRecorrencia(e.target.value as any)}
            className="text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os Ciclos</option>
            <option value="recorrente">🔁 Ciclos Contínuos (WBR)</option>
            <option value="pontual">🎯 Reuniões Pontuais</option>
          </select>

          {/* Filtro de Tipo */}
          <select
            value={selectedTipo}
            onChange={e => setSelectedTipo(e.target.value)}
            className="text-xs font-medium py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os Alinhamentos</option>
            <option value="comercial_rh">Comercial × RH & Contratação</option>
            <option value="comercial_logistica">Comercial × Logística</option>
            <option value="contratacao_financeiro">Contratação × Financeiro</option>
            <option value="logistica_financeiro">Logística × Financeiro</option>
            <option value="documentacao_rh">Documentação × RH</option>
            <option value="geral_operacoes">Geral de Operações</option>
            <option value="outro">Outro</option>
          </select>

          {/* Filtro de Status */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="text-xs font-medium py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="agendada">Agendadas</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluídas</option>
            <option value="cancelada">Canceladas</option>
          </select>

          {/* Alternância Galeria / Cards vs Lista Compacta */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 ml-1">
            <button
              onClick={() => handleToggleViewMode('cards')}
              title="Visualização em Cards / Galeria"
              className={`p-1.5 rounded-md text-xs transition-colors flex items-center gap-1 ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => handleToggleViewMode('lista')}
              title="Visualização em Lista Compacta"
              className={`p-1.5 rounded-md text-xs transition-colors flex items-center gap-1 ${
                viewMode === 'lista'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <List size={15} />
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo: Listagem de Reuniões */}
      <div>
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-blue-500" />
            <p className="text-sm font-medium">Carregando ciclos e atas de reuniões...</p>
          </div>
        ) : filteredReunioes.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <Users size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              Nenhuma reunião encontrada com os filtros selecionados
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Tente redefinir os filtros ou agende um novo alinhamento intersetorial.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all"
            >
              <Plus size={16} /> Agendar Novo Alinhamento
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          /* MODO 1: CARDS / GALERIA */
          <div className="grid grid-cols-1 gap-4">
            {filteredReunioes.map((reuniao) => {
              const tipoConfig = TIPOS_REUNIAO_MAP[reuniao.tipo] || TIPOS_REUNIAO_MAP.outro;
              const acoes = reuniao.acoes || [];
              const concluidas = acoes.filter(a => a.status === 'Concluida').length;
              const pctAcoes = acoes.length > 0 ? Math.round((concluidas / acoes.length) * 100) : 0;
              const isAoVivo = reuniao.status === 'em_andamento';
              const isCancelada = reuniao.status === 'cancelada';

              return (
                <div
                  key={reuniao.id}
                  className={`group bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 p-5 md:p-6 shadow-sm hover:shadow-md ${
                    isCancelada
                      ? 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50'
                      : isAoVivo
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Lado Esquerdo: Identificação, Ciclo e Datas */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Tag de Tipo */}
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border bg-gradient-to-r ${tipoConfig.color}`}>
                          {tipoConfig.label}
                        </span>

                        {/* Recorrência */}
                        {reuniao.recorrente ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Repeat size={11} /> Ciclo Contínuo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            <Target size={11} /> Pontual
                          </span>
                        )}

                        {/* Status */}
                        {reuniao.status === 'em_andamento' && (
                          <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping" />
                            AO VIVO
                          </span>
                        )}
                        {reuniao.status === 'agendada' && (
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Agendada
                          </span>
                        )}
                        {reuniao.status === 'concluida' && (
                          <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={12} />
                            Concluída
                          </span>
                        )}
                        {reuniao.status === 'cancelada' && (
                          <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <Ban size={12} />
                            Cancelada
                          </span>
                        )}

                        {reuniao.modalidade === 'presencial' && (
                          <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <Building2 size={11} />
                            Presencial
                          </span>
                        )}
                        {reuniao.modalidade === 'online' && (
                          <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <Video size={11} />
                            100% Online
                          </span>
                        )}
                        {reuniao.modalidade === 'hibrido' && (
                          <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            <Globe size={11} />
                            Híbrido
                          </span>
                        )}

                        <span className="text-xs text-slate-400">
                          {reuniao.duracao_minutos || 45} min
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {reuniao.titulo}
                        </h3>

                        {/* Pauta / Ordem do Dia Organizada e Sem Tags HTML */}
                        {reuniao.pauta_topicos && (() => {
                          const { title, topics } = extractPautaTopics(reuniao.pauta_topicos);
                          const isExpanded = !!expandedPautas[reuniao.id];
                          if (topics.length === 0) return null;

                          return (
                            <div className="mt-2 space-y-1.5">
                              {!isExpanded ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-0.5">
                                    <ListOrdered size={13} className="text-blue-500" />
                                    Pauta:
                                  </span>

                                  {topics.slice(0, 3).map((item, idx) => {
                                    const colonIdx = item.indexOf(':');
                                    const hasColon = colonIdx > -1 && colonIdx < 45;
                                    const itemLabel = hasColon ? item.slice(0, colonIdx) : item;
                                    const itemDesc = hasColon ? item.slice(colonIdx + 1).trim() : '';

                                    return (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200/90 dark:border-slate-700/80 max-w-[340px] truncate shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
                                        title={item}
                                      >
                                        <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                          {hasColon ? itemLabel : `${idx + 1}.`}
                                        </span>
                                        {itemDesc ? (
                                          <span className="text-slate-500 dark:text-slate-400 truncate">
                                            {itemDesc}
                                          </span>
                                        ) : (
                                          !hasColon && <span className="truncate">{item}</span>
                                        )}
                                      </span>
                                    );
                                  })}

                                  {topics.length > 3 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePautaExpanded(reuniao.id);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-200/70 dark:border-blue-800/70 transition-colors shadow-2xs cursor-pointer"
                                    >
                                      +{topics.length - 3} tópicos <ChevronDown size={12} />
                                    </button>
                                  )}

                                  {topics.length <= 3 && topics.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePautaExpanded(reuniao.id);
                                      }}
                                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-1 inline-flex items-center gap-0.5 cursor-pointer"
                                    >
                                      Ver completa <ChevronDown size={11} />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-850/80 border border-slate-200/90 dark:border-slate-750 space-y-2.5 shadow-2xs">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                                    <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                      <ListOrdered size={14} />
                                      {title || 'Ordem do Dia / Pauta do Encontro'} ({topics.length} tópicos)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePautaExpanded(reuniao.id);
                                      }}
                                      className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold px-2 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                                    >
                                      Recolher <ChevronUp size={12} />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-0.5">
                                    {topics.map((item, idx) => {
                                      const colonIdx = item.indexOf(':');
                                      const hasColon = colonIdx > -1 && colonIdx < 45;
                                      const itemLabel = hasColon ? item.slice(0, colonIdx) : item;
                                      const itemDesc = hasColon ? item.slice(colonIdx + 1).trim() : '';

                                      return (
                                        <div
                                          key={idx}
                                          className="flex items-start gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs shadow-2xs"
                                        >
                                          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-[11px] shrink-0 mt-0.5">
                                            {idx + 1}
                                          </span>
                                          <div className="leading-tight">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                              {hasColon ? itemLabel.replace(/^\d+[\.\)]\s*/, '') : item}
                                            </span>
                                            {itemDesc && (
                                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                                                {itemDesc}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Departamentos, Convocados e Data de Criação */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Layers size={14} className="text-slate-400" />
                          <span>Setores:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {reuniao.departamentos_envolvidos.join(' • ')}
                          </span>
                        </div>

                        {reuniao.participantes && reuniao.participantes.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <UserCheck size={14} className="text-slate-400" />
                            <span>{reuniao.participantes.length} colaboradores convocados</span>
                          </div>
                        )}

                        {/* DATA E HORA DE CRIAÇÃO (SOLICITAÇÃO DO USUÁRIO) */}
                        {reuniao.created_at && (
                          <div className="flex items-center gap-1.5 text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">
                            <CalendarClock size={13} className="text-slate-400" />
                            <span>Criada em: {new Date(reuniao.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                        )}

                        {/* Local Presencial & Sala Virtual (Teams / Meet) */}
                        {(reuniao.local_presencial || reuniao.link_online) && (
                          <div className="flex flex-wrap items-center gap-2">
                            {reuniao.local_presencial && (
                              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                                <MapPin size={12} className="text-amber-500 shrink-0" />
                                <span className="font-medium truncate max-w-[260px]">{reuniao.local_presencial}</span>
                              </div>
                            )}
                            {reuniao.link_online && (
                              <a
                                href={reuniao.link_online}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 hover:underline transition-colors"
                              >
                                <Video size={12} className="text-blue-500 shrink-0" />
                                <span>Sala Virtual ({reuniao.plataforma_online ? reuniao.plataforma_online.toUpperCase() : 'Teams/Meet'})</span>
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lado Direito: Ações WBR e Botões de Gestão (Adiar, Cancelar, Excluir) */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800">
                      
                      {/* Progresso de Tarefas Pactuadas */}
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <div className="flex items-center sm:justify-end gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <span className="font-medium">
                            {concluidas} de {acoes.length} ações resolvidas
                          </span>
                        </div>
                        {acoes.length > 0 && (
                          <div className="w-36 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden ml-auto">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${pctAcoes}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Data do Encontro & Botões de Ação */}
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                        <div className="text-right text-xs text-slate-500 dark:text-slate-400 hidden md:block mr-2">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {new Date(reuniao.data_reuniao).toLocaleDateString('pt-BR', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short'
                            })}
                          </div>
                          <div>
                            {new Date(reuniao.data_reuniao).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>

                        {/* Botão Adiar */}
                        {reuniao.status !== 'concluida' && reuniao.status !== 'cancelada' && (
                          <button
                            onClick={() => handleAbrirAdiarModal(reuniao)}
                            title="Adiar / Reagendar horário do encontro"
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <CalendarClock size={15} />
                            <span className="hidden sm:inline">Adiar</span>
                          </button>
                        )}

                        {/* Botão Cancelar */}
                        {reuniao.status !== 'concluida' && reuniao.status !== 'cancelada' && (
                          <button
                            onClick={() => handleCancelarReuniao(reuniao)}
                            title="Cancelar este alinhamento"
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 text-xs font-semibold transition-colors"
                          >
                            <Ban size={15} />
                          </button>
                        )}

                        {/* Botão Excluir */}
                        <button
                          onClick={() => handleExcluirReuniao(reuniao)}
                          title="Excluir reunião permanentemente"
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 text-xs transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>

                        {/* Botão Principal: Abrir Cockpit / Ver Ata */}
                        <button
                          onClick={() => navigate(`/operacoes/reunioes/${reuniao.id}`)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${
                            reuniao.status === 'concluida'
                              ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                          }`}
                        >
                          {reuniao.status === 'concluida' ? (
                            <>Ver Ata & Ações <ChevronRight size={16} /></>
                          ) : (
                            <>
                              <Play size={14} className="fill-current" />
                              Abrir Cockpit
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* MODO 2: LISTA / TABELA COMPACTA (SOLICITAÇÃO DO USUÁRIO) */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Status & Ciclo</th>
                    <th className="py-3.5 px-4">Reunião & Setores</th>
                    <th className="py-3.5 px-4">Formato & Local</th>
                    <th className="py-3.5 px-4">Data do Encontro</th>
                    <th className="py-3.5 px-4">Criada em</th>
                    <th className="py-3.5 px-4">Convocados</th>
                    <th className="py-3.5 px-4">Ações WBR</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredReunioes.map((reuniao) => {
                    const tipoConfig = TIPOS_REUNIAO_MAP[reuniao.tipo] || TIPOS_REUNIAO_MAP.outro;
                    const acoes = reuniao.acoes || [];
                    const concluidas = acoes.filter(a => a.status === 'Concluida').length;
                    const isCancelada = reuniao.status === 'cancelada';

                    return (
                      <tr
                        key={reuniao.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isCancelada ? 'opacity-60 bg-slate-50/30' : ''
                        }`}
                      >
                        {/* Status & Ciclo */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {reuniao.status === 'em_andamento' && (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping" />
                                AO VIVO
                              </span>
                            )}
                            {reuniao.status === 'agendada' && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 block w-fit">
                                Agendada
                              </span>
                            )}
                            {reuniao.status === 'concluida' && (
                              <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
                                <CheckCircle2 size={10} /> Concluída
                              </span>
                            )}
                            {reuniao.status === 'cancelada' && (
                              <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 w-fit">
                                <Ban size={10} /> Cancelada
                              </span>
                            )}
                            
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              {reuniao.recorrente ? (
                                <span className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5 font-medium">
                                  <Repeat size={10} /> Contínuo
                                </span>
                              ) : (
                                <span className="text-slate-500 flex items-center gap-0.5">
                                  <Target size={10} /> Pontual
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Título & Setores */}
                        <td className="py-3 px-4">
                          <div
                            className="font-bold text-slate-900 dark:text-slate-100 max-w-xs truncate"
                            title={reuniao.pauta_topicos ? `${reuniao.titulo}\n\n📋 Pauta:\n${htmlToCleanPlainText(reuniao.pauta_topicos)}` : reuniao.titulo}
                          >
                            {reuniao.titulo}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] px-2 py-0.2 rounded-full border ${tipoConfig.color}`}>
                              {tipoConfig.label}
                            </span>
                            <span className="truncate max-w-[180px]">{reuniao.departamentos_envolvidos.join(' • ')}</span>
                          </div>
                        </td>

                        {/* Formato & Local / Sala Online */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div>
                              {reuniao.modalidade === 'presencial' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  <Building2 size={10} /> Presencial
                                </span>
                              )}
                              {reuniao.modalidade === 'online' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                  <Video size={10} /> Online
                                </span>
                              )}
                              {reuniao.modalidade === 'hibrido' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                  <Globe size={10} /> Híbrido
                                </span>
                              )}
                            </div>
                            {reuniao.local_presencial && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 truncate max-w-[180px]" title={reuniao.local_presencial}>
                                <MapPin size={10} className="text-amber-500 shrink-0" />
                                <span className="truncate">{reuniao.local_presencial}</span>
                              </div>
                            )}
                            {reuniao.link_online && (
                              <div>
                                <a
                                  href={reuniao.link_online}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                                >
                                  <Video size={10} className="shrink-0" />
                                  <span>Link {reuniao.plataforma_online ? reuniao.plataforma_online.toUpperCase() : 'Virtual'}</span>
                                  <ExternalLink size={9} />
                                </a>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Data do Encontro */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {new Date(reuniao.data_reuniao).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(reuniao.data_reuniao).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })} ({reuniao.duracao_minutos || 45} min)
                          </div>
                        </td>

                        {/* Data de Criação */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                          {reuniao.created_at ? (
                            <div>
                              <div>{new Date(reuniao.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
                              <div className="text-[10px] text-slate-400">{new Date(reuniao.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* Convocados */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                            <Users size={12} className="text-slate-400" />
                            {reuniao.participantes?.length || 0}
                          </span>
                        </td>

                        {/* Ações WBR */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            {concluidas} / {acoes.length}
                          </div>
                          <div className="text-[10px] text-slate-400">resolvidas</div>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {reuniao.status !== 'concluida' && reuniao.status !== 'cancelada' && (
                              <button
                                onClick={() => handleAbrirAdiarModal(reuniao)}
                                title="Adiar / Reagendar horário"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                              >
                                <CalendarClock size={14} />
                              </button>
                            )}

                            {reuniao.status !== 'concluida' && reuniao.status !== 'cancelada' && (
                              <button
                                onClick={() => handleCancelarReuniao(reuniao)}
                                title="Cancelar reunião"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 transition-colors"
                              >
                                <Ban size={14} />
                              </button>
                            )}

                            <button
                              onClick={() => handleExcluirReuniao(reuniao)}
                              title="Excluir reunião permanentemente"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>

                            <button
                              onClick={() => navigate(`/operacoes/reunioes/${reuniao.id}`)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs"
                            >
                              {reuniao.status === 'concluida' ? 'Ata' : 'Cockpit'}
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE ADIAR / REAGENDAR REUNIÃO (SOLICITAÇÃO DO USUÁRIO) */}
      {isAdiarModalOpen && reuniaoParaAdiar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-600/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <CalendarClock size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Adiar / Reagendar Reunião
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina a nova data e horário para este alinhamento.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdiarModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmarAdiar} className="p-6 space-y-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Reunião</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {reuniaoParaAdiar.titulo}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Horário atual: {new Date(reuniaoParaAdiar.data_reuniao).toLocaleDateString('pt-BR')} às {new Date(reuniaoParaAdiar.data_reuniao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nova Data e Hora
                </label>
                <input
                  type="datetime-local"
                  required
                  value={novaDataAdiada}
                  onChange={e => setNovaDataAdiada(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAdiarModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adiando}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/30 flex items-center gap-1.5"
                >
                  {adiando ? <RefreshCw size={14} className="animate-spin" /> : <CalendarClock size={14} />}
                  Salvar Novo Horário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Amplo e Premium de Agendamento (max-w-5xl) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl overflow-hidden max-h-[94vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-inner">
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Agendar Alinhamento Intersetorial
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina os departamentos envolvidos, convoque os colaboradores, configure o e-mail oficial e estruture a pauta.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Scrollable */}
            <form onSubmit={handleCreateReuniao} className="p-6 md:p-8 space-y-7 overflow-y-auto flex-1">
              
              {/* 1. SELEÇÃO DO TIPO DE ALINHAMENTO */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} className="text-blue-500" />
                    1. Sugestões de Alinhamento Rápido
                  </label>
                  <span className="text-[11px] text-slate-400">Selecione um modelo para preencher departamentos sugeridos</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {(Object.keys(TIPOS_REUNIAO_MAP) as TipoReuniao[]).map((tipoKey) => {
                    const cfg = TIPOS_REUNIAO_MAP[tipoKey];
                    const isSelected = newReuniao.tipo === tipoKey;
                    return (
                      <button
                        key={tipoKey}
                        type="button"
                        onClick={() => handleTipoChange(tipoKey)}
                        className={`text-left p-3.5 rounded-2xl border text-xs transition-all relative ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-semibold shadow-sm ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{cfg.label}</span>
                          {isSelected && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {cfg.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. DEPARTAMENTOS ENVOLVIDOS (MULTISELEÇÃO DINÂMICA) */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Building2 size={15} className="text-indigo-500" />
                      2. Departamentos Convocados (Selecione 2 ou mais)
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Os funcionários ativos destes setores serão listados automaticamente abaixo para convocação.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 self-start sm:self-auto">
                    {newReuniao.departamentos_envolvidos.length} setores selecionados
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {departments.map((dept) => {
                    const isSelected = newReuniao.departamentos_envolvidos.some(
                      d => d.toLowerCase().trim() === dept.name?.toLowerCase().trim()
                    );
                    const countEmps = allEmployees.filter(
                      e => e.department_name?.toLowerCase().trim() === dept.name?.toLowerCase().trim() ||
                           e.department_id === dept.id
                    ).length;

                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => handleToggleDepartamento(dept.name)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/30'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                          isSelected ? 'bg-white text-blue-600' : 'border border-slate-300 dark:border-slate-600'
                        }`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span>{dept.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {countEmps}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. CONVOCAÇÃO DOS FUNCIONÁRIOS (CHECKBOXES / CARDS CLICÁVEIS) */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <UserCheck size={15} className="text-emerald-500" />
                      3. Funcionários Convocados para a Reunião
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Clique no funcionário para convocá-lo. Apenas colaboradores ativos dos setores selecionados aparecem aqui.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      {newReuniao.participantesSelecionados.length} convocados
                    </span>
                  </div>
                </div>

                {funcionariosDisponiveis.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-400 text-xs">
                    <Users size={32} className="mx-auto mb-2 opacity-40" />
                    Selecione pelo menos um departamento acima para listar os colaboradores ativos.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Agrupamento por Departamento */}
                    {newReuniao.departamentos_envolvidos.map((deptName) => {
                      const deptsLower = deptName.toLowerCase().trim();
                      const empsDesteSetor = funcionariosDisponiveis.filter(
                        e => e.department_name?.toLowerCase().trim() === deptsLower
                      );
                      if (empsDesteSetor.length === 0) return null;

                      const todosDesteSetorSelecionados = empsDesteSetor.every(
                        e => newReuniao.participantesSelecionados.includes(e.nombrecompleto)
                      );

                      return (
                        <div key={deptName} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              <Building2 size={13} className="text-blue-500" />
                              {deptName} ({empsDesteSetor.length} ativos)
                            </span>
                            <div className="flex items-center gap-2">
                              {todosDesteSetorSelecionados ? (
                                <button
                                  type="button"
                                  onClick={() => handleLimparTodosDoDepartamento(deptName)}
                                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                                >
                                  Desmarcar Todos
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSelecionarTodosDoDepartamento(deptName)}
                                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                >
                                  Convocar Todos de {deptName}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {empsDesteSetor.map((emp) => {
                              const isSelected = newReuniao.participantesSelecionados.includes(emp.nombrecompleto);
                              return (
                                <div
                                  key={emp.id}
                                  onClick={() => handleToggleParticipante(emp.nombrecompleto)}
                                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                                    isSelected
                                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/30 shadow-sm'
                                      : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white'
                                      : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                  }`}>
                                    {isSelected && <Check size={13} strokeWidth={3} />}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                      {emp.nombrecompleto}
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                      {emp.correoempresarial ? (
                                        <>
                                          <Mail size={10} className="flex-shrink-0 text-slate-400" />
                                          <span className="truncate">{emp.correoempresarial}</span>
                                        </>
                                      ) : (
                                        <span>{emp.codigoresponsabilidad || 'Colaborador Ativo'}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. DADOS DA REUNIÃO (TÍTULO, RECORRÊNCIA, DATA/HORA, DURAÇÃO) */}
              <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={15} className="text-blue-500" />
                  4. Informações do Encontro & Recorrência
                </label>

                {/* Título da Reunião */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Título do Encontro
                  </label>
                  <input
                    type="text"
                    required
                    value={newReuniao.titulo}
                    onChange={e => setNewReuniao({ ...newReuniao, titulo: e.target.value })}
                    placeholder="Ex: Alinhamento Semanal: Comercial × Logística"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>

                {/* Recorrência: Ciclo Contínuo vs Reunião Pontual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewReuniao({ ...newReuniao, recorrente: true })}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                      newReuniao.recorrente
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-semibold ring-1 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                      <Repeat size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-xs">Ciclo Contínuo WBR (Semanal)</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Reunião periódica que gera continuidade: a próxima reunião semanal é agendada ao concluir esta.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewReuniao({ ...newReuniao, recorrente: false })}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                      !newReuniao.recorrente
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-semibold ring-1 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-600 dark:text-slate-400">
                      <Target size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-xs">Reunião Pontual / Única</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Encontro específico para resolver uma crise ou projeto pontual, sem desdobramento semanal obrigatório.
                      </div>
                    </div>
                  </button>
                </div>

                {/* Data, Hora e Duração */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Data e Hora do Encontro
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newReuniao.data_reuniao}
                      onChange={e => setNewReuniao({ ...newReuniao, data_reuniao: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Duração Planejada
                    </label>
                    <select
                      value={newReuniao.duracao_minutos}
                      onChange={e => setNewReuniao({ ...newReuniao, duracao_minutos: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={30}>30 minutos (Express)</option>
                      <option value={45}>45 minutos (Padrão WBR)</option>
                      <option value={60}>60 minutos (Completa)</option>
                      <option value={90}>90 minutos (Planejamento Estratégico)</option>
                    </select>
                  </div>
                </div>

                {/* MODALIDADE & LOCAL DO ENCONTRO (PRESENCIAL / ONLINE / HÍBRIDO) */}
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 size={14} className="text-blue-500" />
                      Modalidade & Formato da Reunião
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Conecte equipes no Brasil, Dubai, Itália e Espanha
                    </span>
                  </div>

                  {/* 3 Opções de Modalidade */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setNewReuniao({ ...newReuniao, modalidade: 'presencial' })}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                        newReuniao.modalidade === 'presencial'
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-bold ring-1 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Presencial</div>
                        <div className="text-[10px] text-slate-400">Sala de reunião física</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewReuniao({ ...newReuniao, modalidade: 'online' })}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                        newReuniao.modalidade === 'online'
                          ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 font-bold ring-1 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center flex-shrink-0 text-purple-600 dark:text-purple-400">
                        <Video size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold">100% Online</div>
                        <div className="text-[10px] text-slate-400">Teams / Meet / Zoom</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewReuniao({ ...newReuniao, modalidade: 'hibrido' })}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                        newReuniao.modalidade === 'hibrido'
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 font-bold ring-1 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400">
                        <Globe size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Híbrido</div>
                        <div className="text-[10px] text-slate-400">Presencial + Remotos</div>
                      </div>
                    </button>
                  </div>

                  {/* Campos Dinâmicos: Local Físico e/ou Link Online */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {(newReuniao.modalidade === 'presencial' || newReuniao.modalidade === 'hibrido') && (
                      <div className={newReuniao.modalidade === 'presencial' ? 'sm:col-span-2 space-y-1' : 'space-y-1'}>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400" />
                          Sala / Local Físico da Reunião
                        </label>
                        <input
                          type="text"
                          value={newReuniao.local_presencial}
                          onChange={e => setNewReuniao({ ...newReuniao, local_presencial: e.target.value })}
                          placeholder="Ex: Sala de Reuniões Principal - Sede Espanha"
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {['Sala de Reuniões Principal', 'Sala de Operações', 'Sala da Diretoria', 'Auditório Central'].map(sugestao => (
                            <button
                              key={sugestao}
                              type="button"
                              onClick={() => setNewReuniao({ ...newReuniao, local_presencial: sugestao })}
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              + {sugestao}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {(newReuniao.modalidade === 'online' || newReuniao.modalidade === 'hibrido') && (
                      <div className={newReuniao.modalidade === 'online' ? 'sm:col-span-2 space-y-1' : 'space-y-1'}>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Video size={13} className="text-blue-500" />
                            Link da Sala Virtual (Teams / Meet)
                          </label>
                          <select
                            value={newReuniao.plataforma_online}
                            onChange={e => setNewReuniao({ ...newReuniao, plataforma_online: e.target.value as any })}
                            className="text-[10px] py-0.5 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            <option value="teams">Microsoft Teams</option>
                            <option value="meet">Google Meet</option>
                            <option value="zoom">Zoom</option>
                            <option value="outro">Outra Plataforma</option>
                          </select>
                        </div>
                        <input
                          type="url"
                          value={newReuniao.link_online}
                          onChange={e => setNewReuniao({ ...newReuniao, link_online: e.target.value })}
                          placeholder="Cole o link da videochamada (ex: https://meet.google.com/xyz...)"
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="text-[10px] text-slate-400 pt-0.5">
                          Colaboradores remotos (Brasil, Dubai, Itália, Espanha) verão este link com botão direto no e-mail e no Cockpit.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. PAUTA & TÓPICOS COM VISUAL WYSIWYG EDITOR */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare size={15} className="text-indigo-500" />
                    5. Pauta & Tópicos de Discussão (Editor Visual em Tempo Real)
                  </label>
                  <span className="text-[11px] text-slate-400">Aplique negrito, títulos, cores e listas visuais diretamente no texto</span>
                </div>

                <VisualWysiwygEditor
                  value={newReuniao.pauta_topicos}
                  onChange={(val) => setNewReuniao({ ...newReuniao, pauta_topicos: val })}
                  placeholder="Estruture aqui os tópicos da pauta, pontos de atenção e metas do encontro..."
                  minHeight="220px"
                />
              </div>

              {/* 6. DISPARO E FORMATAÇÃO DE E-MAIL */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                {/* Trigger Checkbox Principal */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <Mail size={20} />
                    </div>
                    <div>
                      <label htmlFor="chk_send_email" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer flex items-center gap-2">
                        6. Disparar Convocação Oficial por E-mail?
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Gera o e-mail formal com a pauta e dispara aos colaboradores convocados.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="chk_send_email"
                    checked={sendEmailNotification}
                    onChange={e => setSendEmailNotification(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {sendEmailNotification && (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 space-y-5 animate-fade-in">
                    
                    {/* Seletor de Idioma do E-mail */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                        <Globe size={14} className="text-blue-500" />
                        Idioma da Notificação
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLanguageChange('es')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                            emailLanguage === 'es'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span>🇪🇸</span> Espanhol (Espanha / Padrão)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLanguageChange('pt')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                            emailLanguage === 'pt'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span>🇵🇹</span> Português
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLanguageChange('en')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                            emailLanguage === 'en'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span>🇬🇧</span> Inglês
                        </button>
                      </div>
                    </div>

                    {/* Destinatários com E-mail */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                          <Users size={14} className="text-emerald-500" />
                          Destinatários Selecionados ({selectedEmails.length})
                        </label>
                        <span className="text-[11px] text-slate-400">
                          {convocadosComEmail.length} dos colaboradores convocados possuem e-mail corporativo
                        </span>
                      </div>

                      {convocadosComEmail.length === 0 ? (
                        <div className="p-3 text-center text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center justify-center gap-2">
                          <Info size={15} />
                          Nenhum dos colaboradores convocados possui e-mail empresarial cadastrado. Você pode inserir e-mails manualmente abaixo.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          {convocadosComEmail.map(emp => {
                            const email = emp.correoempresarial!.trim();
                            const isChecked = selectedEmails.includes(email);
                            return (
                              <label
                                key={emp.id}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                                  isChecked
                                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 text-slate-900 dark:text-white'
                                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedEmails(prev => [...prev, email]);
                                    } else {
                                      setSelectedEmails(prev => prev.filter(em => em !== email));
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="min-w-0 flex-1 truncate">
                                  <span className="font-semibold">{emp.nombrecompleto}</span>
                                  <span className="text-[11px] text-slate-400 block truncate">{email}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* E-mails Adicionais */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                        <AtSign size={13} className="text-slate-400" />
                        E-mails Adicionais (separados por vírgula)
                      </label>
                      <input
                        type="text"
                        value={additionalEmails}
                        onChange={e => setAdditionalEmails(e.target.value)}
                        placeholder="diretoria@mcspersonal.com, gestao@mcspersonal.com"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Assunto do E-mail */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Assunto do E-mail
                      </label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={e => {
                          setEmailSubject(e.target.value);
                          setIsManualEmailBodyEdit(true);
                        }}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Corpo do E-mail (Prévia Visual + Edição) */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setEmailPreviewTab('visual')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              emailPreviewTab === 'visual'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            <Eye size={13} />
                            Prévia Visual do E-mail
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmailPreviewTab('edit')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              emailPreviewTab === 'edit'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            <Edit3 size={13} />
                            Editar Mensagem (Texto)
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsManualEmailBodyEdit(false);
                            const generated = generateEmailContent(emailLanguage, newReuniao);
                            setEmailSubject(generated.subject);
                            setEmailBody(generated.body);
                            toast.success('Modelo de e-mail regenerado!');
                          }}
                          className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold"
                        >
                          Restaurar Modelo Padrão
                        </button>
                      </div>

                      {/* Modo 1: Prévia Visual Real do E-mail */}
                      {emailPreviewTab === 'visual' ? (
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs bg-white dark:bg-slate-900">
                          {/* Banner Superior do E-mail */}
                          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-4 text-white">
                            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">
                              MCS Personal • Convocatória Oficial
                            </div>
                            <div className="text-sm font-black text-white">
                              {newReuniao.titulo}
                            </div>
                          </div>

                          {/* Corpo Formatado do E-mail */}
                          <div className="p-4 md:p-5 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {emailLanguage === 'es' ? 'Estimado equipo,' : emailLanguage === 'pt' ? 'Prezada equipe,' : 'Dear team,'}
                            </p>
                            <p>
                              {emailLanguage === 'es'
                                ? 'Han sido convocados a la reunión de alineación interdepartamental:'
                                : emailLanguage === 'pt'
                                ? 'Vocês foram convocados para a reunião de alinhamento interdepartamental:'
                                : 'You are invited to the cross-departmental alignment meeting:'}
                            </p>

                            {/* Cartão de Detalhes da Reunião */}
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-750 space-y-1.5 font-sans">
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">📌 {emailLanguage === 'es' ? 'TÍTULO' : emailLanguage === 'pt' ? 'TÍTULO' : 'TITLE'}:</span>{' '}
                                {newReuniao.titulo}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">🏢 {emailLanguage === 'es' ? 'DEPARTAMENTOS' : emailLanguage === 'pt' ? 'DEPARTAMENTOS' : 'DEPARTMENTS'}:</span>{' '}
                                {newReuniao.departamentos_envolvidos.join(' • ')}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">📅 {emailLanguage === 'es' ? 'FECHA' : emailLanguage === 'pt' ? 'DATA' : 'DATE'}:</span>{' '}
                                {new Date(newReuniao.data_reuniao).toLocaleDateString(emailLanguage === 'pt' ? 'pt-BR' : emailLanguage === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">⏰ {emailLanguage === 'es' ? 'HORA' : emailLanguage === 'pt' ? 'HORÁRIO' : 'TIME'}:</span>{' '}
                                {new Date(newReuniao.data_reuniao).toLocaleTimeString(emailLanguage === 'pt' ? 'pt-BR' : emailLanguage === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })}{' '}
                                ({newReuniao.duracao_minutos} min)
                              </div>
                              {newReuniao.modalidade === 'presencial' && (
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white">📍 {emailLanguage === 'es' ? 'LUGAR / SALA' : emailLanguage === 'pt' ? 'LOCAL / SALA' : 'LOCATION'}:</span>{' '}
                                  {newReuniao.local_presencial || 'Sala de Reuniones Principal'}
                                </div>
                              )}
                              {newReuniao.modalidade === 'online' && (
                                <div className="space-y-1">
                                  <div>
                                    <span className="font-bold text-slate-900 dark:text-white">💻 {emailLanguage === 'es' ? 'MODALIDAD' : emailLanguage === 'pt' ? 'MODALIDADE' : 'FORMAT'}:</span>{' '}
                                    100% Online ({newReuniao.plataforma_online === 'meet' ? 'Google Meet' : newReuniao.plataforma_online === 'zoom' ? 'Zoom' : 'Microsoft Teams'})
                                  </div>
                                  {newReuniao.link_online && (
                                    <div className="pt-1">
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-xs">
                                        <Video size={13} /> {emailLanguage === 'es' ? 'Entrar a la Sala Virtual' : emailLanguage === 'pt' ? 'Entrar na Sala Virtual' : 'Join Virtual Meeting'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {newReuniao.modalidade === 'hibrido' && (
                                <div className="space-y-1">
                                  <div>
                                    <span className="font-bold text-slate-900 dark:text-white">📍 {emailLanguage === 'es' ? 'LUGAR PRESENCIAL' : emailLanguage === 'pt' ? 'LOCAL PRESENCIAL' : 'PHYSICAL LOCATION'}:</span>{' '}
                                    {newReuniao.local_presencial || 'Sala de Reuniones Principal'}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-900 dark:text-white">🌐 {emailLanguage === 'es' ? 'CONEXIÓN ONLINE (Brasil, Dubai, Italia, España)' : emailLanguage === 'pt' ? 'PARTICIPAÇÃO ONLINE (Brasil, Dubai, Itália, Espanha)' : 'ONLINE ACCESS (Brazil, Dubai, Italy, Spain)'}:</span>{' '}
                                    {newReuniao.plataforma_online === 'meet' ? 'Google Meet' : newReuniao.plataforma_online === 'zoom' ? 'Zoom' : 'Microsoft Teams'}
                                  </div>
                                  {newReuniao.link_online && (
                                    <div className="pt-1 flex items-center gap-2">
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-xs">
                                        <Video size={13} /> {emailLanguage === 'es' ? 'Entrar a la Sala Virtual' : emailLanguage === 'pt' ? 'Entrar na Sala Virtual' : 'Join Virtual Meeting'}
                                      </span>
                                      <span className="text-[10px] text-slate-500">({emailLanguage === 'es' ? 'Equipos remotos' : emailLanguage === 'pt' ? 'Equipes remotas' : 'Remote teams'})</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">👥 {emailLanguage === 'es' ? 'CONVOCADOS' : emailLanguage === 'pt' ? 'CONVOCADOS' : 'INVITED'}:</span>{' '}
                                {newReuniao.participantesSelecionados.length > 0 ? newReuniao.participantesSelecionados.join(', ') : 'Todos os convocados'}
                              </div>
                            </div>

                            {/* Pauta com Formatação Visual Real (Caixa Verde Idêntica ao E-mail) */}
                            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border-l-4 border-l-emerald-600 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                              <div className="font-extrabold text-emerald-900 dark:text-emerald-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                                📋 {emailLanguage === 'es' ? 'ORDEN DEL DÍA / TEMAS A TRATAR:' : emailLanguage === 'pt' ? 'PAUTA E PONTOS DE DISCUSSÃO:' : 'MEETING AGENDA:'}
                              </div>
                              {isManualEmailBodyEdit ? (
                                <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                                  {emailBody}
                                </div>
                              ) : (
                                <div
                                  className="text-xs font-sans leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: formatPautaToEmailHtml(newReuniao.pauta_topicos) }}
                                />
                              )}
                            </div>

                            <p className="text-slate-500 italic">
                              {emailLanguage === 'es'
                                ? 'Agradecemos la puntualidad y el compromiso de todos para mantener nuestros procesos alineados y eficientes.'
                                : emailLanguage === 'pt'
                                ? 'Contamos com a pontualidade e participação ativa de todos para alinhamento dos fluxos e resolução dos gargalos operacionais.'
                                : 'Please ensure punctuality as we review performance and resolve cross-functional bottlenecks.'}
                            </p>

                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
                              Atentamente,<br />
                              <strong className="text-slate-700 dark:text-slate-300">MCS Personal • Gestão Operacional</strong>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Modo 2: Edição Manual do Texto (Sem tags de código) */
                        <div className="space-y-1.5">
                          <textarea
                            rows={8}
                            value={emailBody}
                            onChange={e => {
                              setEmailBody(e.target.value);
                              setIsManualEmailBodyEdit(true);
                            }}
                            placeholder="Personalize o texto do e-mail livremente..."
                            className="w-full p-3.5 text-xs font-sans rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                          />
                          <p className="text-[11px] text-slate-400">
                            Texto limpo sem tags de código HTML. Use a aba "Prévia Visual" para ver como ficará na caixa de entrada.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900 py-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 hover:scale-[1.02]"
                >
                  {creating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Processando e Agendando...
                    </>
                  ) : sendEmailNotification ? (
                    <>
                      <Send size={14} />
                      Confirmar, Enviar E-mails e Abrir Cockpit
                    </>
                  ) : (
                    <>
                      <Check size={14} strokeWidth={3} />
                      Confirmar e Abrir Cockpit da Reunião
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ADIAR / REAGENDAR REUNIÃO (SOLICITAÇÃO DO USUÁRIO) */}
      {isAdiarModalOpen && reuniaoParaAdiar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-600/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <CalendarClock size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Adiar / Reagendar Reunião
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina a nova data e horário para este alinhamento.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdiarModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmarAdiar} className="p-6 space-y-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Reunião</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {reuniaoParaAdiar.titulo}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Horário atual: {new Date(reuniaoParaAdiar.data_reuniao).toLocaleDateString('pt-BR')} às {new Date(reuniaoParaAdiar.data_reuniao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nova Data e Hora
                </label>
                <input
                  type="datetime-local"
                  required
                  value={novaDataAdiada}
                  onChange={e => setNovaDataAdiada(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAdiarModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adiando}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/30 flex items-center gap-1.5"
                >
                  {adiando ? <RefreshCw size={14} className="animate-spin" /> : <CalendarClock size={14} />}
                  Salvar Novo Horário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
