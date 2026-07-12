import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/shared/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, User, Mail, Phone, Calendar, MapPin, Clock, Users, CheckCircle, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

export function SolicitarPresupuestoPage() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('lead_id');
  const empresaIdParam = searchParams.get('empresa_id');

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Existing lead state
  const [empresaId, setEmpresaId] = useState('');
  const [existingNotes, setExistingNotes] = useState('');

  // Form State
  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
  });

  // Project Questionnaire State
  const [projectData, setProjectData] = useState({
    startDate: '',
    endDate: '',
    workAddress: '',
    daysHours: '',
    workersCount: '',
    entryTime: '',
  });

  // Profile checkboxes
  const perfilesList = [
    'Soldadores (todos los procesos)',
    'Caldereros',
    'Tuberos',
    'Electricistas',
    'Obra civil',
    'Electromecánicos',
    'Montadores',
    'Otros perfiles'
  ];
  const [selectedPerfiles, setSelectedPerfiles] = useState<string[]>([]);

  useEffect(() => {
    async function loadInitialData() {
      if (leadId) {
        setIsLoading(true);
        try {
          const { data: lead, error } = await supabase
            .schema('core_comercial')
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

          if (error) throw error;

          if (lead) {
            setEmpresaId(lead.empresa_id || '');
            setExistingNotes(lead.notes || '');
            setContactData({
              name: lead.name || '',
              email: lead.email || '',
              phone: lead.phone || '',
              company_name: lead.company_name || '',
            });
            // Try to extract existing sector if matched
            if (lead.sector) {
              const matched = perfilesList.filter(p => lead.sector?.includes(p));
              setSelectedPerfiles(matched);
            }
          }
        } catch (err: any) {
          console.error(err);
          toast.error('No se pudieron cargar los datos del lead.');
        } finally {
          setIsLoading(false);
        }
      } else if (empresaIdParam) {
        setEmpresaId(empresaIdParam);
      } else {
        toast.error('Parámetro de empresa o lead faltante en el enlace.');
      }
    }

    loadInitialData();
  }, [leadId, empresaIdParam]);

  const handleProfileToggle = (perfil: string) => {
    setSelectedPerfiles(prev => 
      prev.includes(perfil) ? prev.filter(p => p !== perfil) : [...prev, perfil]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactData.name || !contactData.email || !contactData.company_name) {
      toast.error('Por favor, rellene los campos obligatorios del contacto.');
      return;
    }
    if (!empresaId) {
      toast.error('No se ha podido asociar la solicitud con ninguna empresa del grupo.');
      return;
    }

    setIsLoading(true);

    // Format budget details
    const formattedBudgetDetails = `--- SOLICITUD DE PRESUPUESTO ---
• Perfiles requeridos: ${selectedPerfiles.length > 0 ? selectedPerfiles.join(', ') : 'No especificado'}
• Inicio del proyecto: ${projectData.startDate || 'No especificado'}
• Final estimado: ${projectData.endDate || 'No especificado'}
• Dirección y CP de la obra: ${projectData.workAddress || 'No especificado'}
• Días y horas previstas: ${projectData.daysHours || 'No especificado'}
• Cantidad de operarios: ${projectData.workersCount || 'No especificado'}
• Hora de entrada de operarios: ${projectData.entryTime || 'No especificado'}
--------------------------------`;

    const finalNotes = existingNotes 
      ? `${existingNotes}\n\n${formattedBudgetDetails}`
      : formattedBudgetDetails;

    // Use selected profiles for sector field
    const primarySector = selectedPerfiles.join(', ');

    try {
      if (leadId) {
        // Update existing lead with budget request notes
        const { error } = await supabase
          .schema('core_comercial')
          .from('leads')
          .update({
            name: contactData.name,
            email: contactData.email,
            phone: contactData.phone || null,
            company_name: contactData.company_name,
            notes: finalNotes,
            sector: primarySector || null,
            address_line: projectData.workAddress || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);

        if (error) throw error;
      } else {
        // Create new lead with budget request notes
        // Fetch default Novo stage
        let defaultStageId = null;
        try {
          const { data: stages, error: stageErr } = await supabase
            .schema('core_comercial')
            .from('kanban_stages')
            .select('id')
            .eq('empresa_id', empresaId)
            .eq('name', 'Novo');

          if (!stageErr && stages && stages.length > 0) {
            defaultStageId = stages[0].id;
          }
        } catch (stageErr) {
          console.warn('Could not fetch default kanban stage for new lead', stageErr);
        }

        const { error } = await supabase
          .schema('core_comercial')
          .from('leads')
          .insert({
            empresa_id: empresaId,
            name: contactData.name,
            email: contactData.email,
            phone: contactData.phone || null,
            company_name: contactData.company_name,
            notes: finalNotes,
            sector: primarySector || null,
            address_line: projectData.workAddress || null,
            stage_id: defaultStageId,
          });

        if (error) throw error;
      }

      setIsSubmitted(true);
      toast.success('¡Solicitud de presupuesto enviada con éxito!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al procesar la solicitud.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 to-yellow-500" />
          <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-3">¡Solicitud Recibida!</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Hemos registrado correctamente los datos del proyecto. Nuestro equipo comercial se pondrá en contacto con usted a la brevedad para facilitarle la propuesta de presupuesto detallada.
          </p>
          <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-850 text-left text-xs space-y-1.5 mb-6">
            <div className="flex justify-between text-slate-500">
              <span>Empresa:</span>
              <span className="font-semibold text-slate-300">{contactData.company_name}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Contacto:</span>
              <span className="font-semibold text-slate-300">{contactData.name}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Perfiles:</span>
              <span className="font-semibold text-slate-300 truncate max-w-[200px]">{selectedPerfiles.join(', ') || 'General'}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">LoginPro © Soluciones de personal cualificado para industria y construcción</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 text-slate-200">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header Block reminiscent of the LoginPro Navy Header */}
        <div className="bg-[#061f3d] px-8 py-6 border-b border-slate-800 text-center relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-500" />
          <h1 className="text-2xl font-bold text-white tracking-wide uppercase">LoginPro</h1>
          <p className="text-xs text-slate-300 mt-1.5 font-medium tracking-wide">
            Soluciones de personal cualificado para industria y construcción
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Solicitud de Presupuesto
            </h2>
            <p className="text-xs text-slate-400">
              Por favor, complete los detalles del proyecto abajo para que podamos calcular una propuesta ajustada.
            </p>
          </div>

          {/* Section 1: Contact Details */}
          <div className="bg-slate-950/30 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800/60 pb-1.5">
              Identificación de la Empresa
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="company_name" className="text-xs font-semibold text-slate-300">
                  Nombre Comercial / Empresa *
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="company_name"
                    required
                    placeholder="Ej: Talleres Metalúrgicos S.L."
                    value={contactData.company_name}
                    onChange={e => setContactData({ ...contactData, company_name: e.target.value })}
                    className="pl-9 bg-slate-950 border-slate-800 focus:border-orange-500/50 focus:ring-orange-500/20 text-sm h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-300">
                  Persona de Contacto *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="name"
                    required
                    placeholder="Ej: Juan Pérez"
                    value={contactData.name}
                    onChange={e => setContactData({ ...contactData, name: e.target.value })}
                    className="pl-9 bg-slate-950 border-slate-800 focus:border-orange-500/50 focus:ring-orange-500/20 text-sm h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
                  Correo Electrónico *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="Ej: contacto@empresa.com"
                    value={contactData.email}
                    onChange={e => setContactData({ ...contactData, email: e.target.value })}
                    className="pl-9 bg-slate-950 border-slate-800 focus:border-orange-500/50 focus:ring-orange-500/20 text-sm h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-300">
                  Teléfono de Contacto
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="phone"
                    placeholder="Ej: +34 600 000 000"
                    value={contactData.phone}
                    onChange={e => setContactData({ ...contactData, phone: e.target.value })}
                    className="pl-9 bg-slate-950 border-slate-800 focus:border-orange-500/50 focus:ring-orange-500/20 text-sm h-10 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Profiles checkboxes */}
          <div className="bg-slate-950/30 border border-slate-800/80 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/60 pb-1.5">
              Perfiles Profesionales Requeridos
            </h3>
            <p className="text-[11px] text-slate-500">Seleccione uno o varios perfiles de operarios que necesita para su obra.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {perfilesList.map(perfil => {
                const isSelected = selectedPerfiles.includes(perfil);
                return (
                  <div 
                    key={perfil} 
                    onClick={() => handleProfileToggle(perfil)}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-orange-500/10 border-orange-500/50 text-orange-450 font-medium' 
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded border-slate-700 text-orange-500 focus:ring-orange-500/20 h-4 w-4 cursor-pointer"
                    />
                    <span className="text-xs select-none">{perfil}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Project specific details */}
          <div className="bg-slate-950/30 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/60 pb-1.5">
              Detalles del Proyecto / Obra
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-orange-500" />
                  Inicio del Proyecto
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={projectData.startDate}
                  onChange={e => setProjectData({ ...projectData, startDate: e.target.value })}
                  className="bg-slate-950 border-slate-800 focus:border-orange-500/50 focus:ring-orange-500/20 text-sm h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-orange-500" />
                  Final Estimado / Duración
                </Label>
                <Input
                  id="endDate"
                  placeholder="Ej: 3 meses / Dic 2026"
                  value={projectData.endDate}
                  onChange={e => setProjectData({ ...projectData, endDate: e.target.value })}
                  className="bg-slate-950 border-slate-800 focus:border-orange-500/50 focus:ring-orange-500/20 text-sm h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="workAddress" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-orange-500" />
                  Dirección de la obra y Código Postal
                </Label>
                <Input
                  id="workAddress"
                  placeholder="Ej: Av. de la Industria 14, CP 28050, Madrid"
                  value={projectData.workAddress}
                  onChange={e => setProjectData({ ...projectData, workAddress: e.target.value })}
                  className="bg-slate-950 border-slate-800 focus:border-orange-500/50 focus:ring-orange-500/20 text-sm h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="daysHours" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-orange-500" />
                  Días de trabajo y Horas previstas
                </Label>
                <Input
                  id="daysHours"
                  placeholder="Ej: Lun a Vie, 8:00 a 17:00 (40h/sem)"
                  value={projectData.daysHours}
                  onChange={e => setProjectData({ ...projectData, daysHours: e.target.value })}
                  className="bg-slate-950 border-slate-800 focus:border-orange-500/50 focus:ring-orange-500/20 text-sm h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="workersCount" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-orange-500" />
                  Cantidad de Operarios
                </Label>
                <Input
                  id="workersCount"
                  type="number"
                  placeholder="Ej: 5"
                  value={projectData.workersCount}
                  onChange={e => setProjectData({ ...projectData, workersCount: e.target.value })}
                  className="bg-slate-950 border-slate-800 focus:border-orange-500/50 focus:ring-orange-500/20 text-sm h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="entryTime" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-orange-500" />
                  Hora de entrada de los operarios
                </Label>
                <Input
                  id="entryTime"
                  placeholder="Ej: 08:00 (O el horario de relevo)"
                  value={projectData.entryTime}
                  onChange={e => setProjectData({ ...projectData, entryTime: e.target.value })}
                  className="bg-slate-950 border-slate-800 focus:border-orange-500/50 focus:ring-orange-500/20 text-sm h-10 rounded-xl"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold py-3 text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 h-11"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                Procesando solicitud...
              </>
            ) : (
              'Solicitar Presupuesto'
            )}
          </Button>
        </form>

        <div className="bg-slate-950 border-t border-slate-850 px-8 py-4 text-center text-[10px] text-slate-500">
          Sus datos están protegidos conforme a la política de protección de datos confidenciales.
        </div>
      </div>
    </div>
  );
}
