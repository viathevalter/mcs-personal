import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, Building, Contact, CreditCard, MapPin, Plus, Trash2, Sparkles, CheckCircle2 } from 'lucide-react';
import { registrosService } from '../../services/registrosService';
import { identifyBankFromIban, formatIban } from '@/shared/utils/ibanHelper';
import { CountrySelector, RegionSelector } from '@/features/master-data/locations/components/LocationSelectors';

const contatoItemSchema = z.object({
  nome: z.string().optional(),
  cargo_tipo: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email no válido').optional().or(z.literal('')),
});

const contaBancariaItemSchema = z.object({
  banco: z.string().optional(),
  iban: z.string().optional(),
  swift: z.string().optional(),
  titular_conta: z.string().optional(),
  metodo_pago: z.string().default('Transferir'),
  principal: z.boolean().default(false),
});

const provedorSchema = z.object({
  nome_razao_social: z.string().min(1, 'La Razón Social es obligatoria'),
  nome_comercial: z.string().optional(),
  cif_nif: z.string().optional(),
  tipo: z.enum(['padrao', 'alojamento']),
  tipo_pessoa: z.enum(['Persona Física', 'Persona Jurídica']),
  classificacao: z.string().default('Proveedor Alojamiento'),
  contato_nome: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email no válido').optional().or(z.literal('')),
  contatos: z.array(contatoItemSchema).default([]),
  dados_bancarios: z.array(contaBancariaItemSchema).default([]),
  metodo_pago: z.string().default('Transferir'),
  banco: z.string().optional(),
  iban: z.string().optional(),
  swift: z.string().optional(),
  titular_conta: z.string().optional(),
  endereco: z.string().optional(),
  municipio: z.string().optional(),
  provincia: z.string().optional(),
  codigo_postal: z.string().optional(),
  pais: z.string().default('España'),
  ativo: z.boolean().default(true),
});

type ProvedorFormValues = z.infer<typeof provedorSchema>;

export const ProvedorForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const dataLoadedRef = useRef(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProvedorFormValues>({
    resolver: zodResolver(provedorSchema),
    defaultValues: {
      nome_razao_social: '',
      nome_comercial: '',
      cif_nif: '',
      tipo: 'alojamento',
      tipo_pessoa: 'Persona Jurídica',
      classificacao: 'Proveedor Alojamiento',
      metodo_pago: 'Transferir',
      endereco: '',
      municipio: '',
      provincia: '',
      codigo_postal: '',
      pais: 'España',
      ativo: true,
      contatos: [
        { nome: '', cargo_tipo: 'Propietario', telefone: '', email: '' }
      ],
      dados_bancarios: [
        { banco: '', iban: '', swift: '', titular_conta: '', metodo_pago: 'Transferir', principal: true }
      ]
    },
  });

  const watchedDadosBancarios = useWatch({ control, name: 'dados_bancarios' });
  const watchedPais = useWatch({ control, name: 'pais' });
  const watchedProvincia = useWatch({ control, name: 'provincia' });

  const {
    fields: contatoFields,
    append: appendContato,
    remove: removeContato,
  } = useFieldArray({
    control,
    name: 'contatos',
  });

  const {
    fields: bancoFields,
    append: appendBanco,
    remove: removeBanco,
  } = useFieldArray({
    control,
    name: 'dados_bancarios',
  });

  // Estado para alertar sobre restauração de rascunho
  const [isDraftRestored, setIsDraftRestored] = useState<boolean>(false);

  // Recuperación de borrador desde LocalStorage
  useEffect(() => {
    if (!id && !dataLoadedRef.current) {
      try {
        const savedDraft = localStorage.getItem('mcs_provedor_draft_novo');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && (parsed.nome_razao_social || parsed.cif_nif || parsed.telefone || parsed.endereco)) {
            reset(parsed);
            setIsDraftRestored(true);
          }
        }
      } catch (e) {
        console.warn('Error al cargar borrador de proveedor:', e);
      }
    }
  }, [id, reset]);

  // Auto-Save continuo del borrador en LocalStorage con debounce
  const allWatchedValues = watch();
  useEffect(() => {
    if (!isEditing) {
      const timer = setTimeout(() => {
        try {
          const hasContent = allWatchedValues.nome_razao_social || allWatchedValues.cif_nif || allWatchedValues.telefone || allWatchedValues.endereco;
          if (hasContent) {
            localStorage.setItem('mcs_provedor_draft_novo', JSON.stringify(allWatchedValues));
          }
        } catch (e) {}
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [allWatchedValues, isEditing]);

  const handleDiscardDraft = () => {
    localStorage.removeItem('mcs_provedor_draft_novo');
    reset({
      nome_razao_social: '',
      nome_comercial: '',
      cif_nif: '',
      tipo: 'alojamento',
      tipo_pessoa: 'Persona Jurídica',
      classificacao: 'Proveedor Alojamiento',
      contato_nome: '',
      telefone: '',
      email: '',
      contatos: [{ nome: '', cargo_tipo: 'Propietario', telefone: '', email: '' }],
      dados_bancarios: [{ banco: '', iban: '', swift: '', titular_conta: '', metodo_pago: 'Transferir', principal: true }],
      metodo_pago: 'Transferir',
      banco: '',
      iban: '',
      swift: '',
      titular_conta: '',
      endereco: '',
      municipio: '',
      provincia: '',
      codigo_postal: '',
      pais: 'España',
      ativo: true,
    });
    setIsDraftRestored(false);
  };

  // Cargar datos en modo de edición
  useEffect(() => {
    if (id && !dataLoadedRef.current) {
      setIsLoading(true);
      registrosService.fetchProvedorById(id).then((p) => {
        if (p) {
          dataLoadedRef.current = true;

          const contatosCarregados = p.contatos && p.contatos.length > 0 ? p.contatos : [
            {
              nome: p.contato_nome || '',
              cargo_tipo: 'Propietario',
              telefone: p.telefone || '',
              email: p.email || ''
            }
          ];

          let dadosBancariosCarregados = p.dados_bancarios && p.dados_bancarios.length > 0 ? p.dados_bancarios : [
            {
              banco: p.banco || '',
              iban: p.iban || '',
              swift: p.swift || '',
              titular_conta: p.titular_conta || '',
              metodo_pago: p.metodo_pago || 'Transferir',
              principal: true
            }
          ];

          dadosBancariosCarregados = dadosBancariosCarregados.map(b => {
            const rawIban = b.iban || '';
            const bankInfo = identifyBankFromIban(rawIban);
            return {
              ...b,
              iban: formatIban(rawIban),
              banco: b.banco || bankInfo?.name || '',
              swift: b.swift || bankInfo?.bic || '',
            };
          });

          reset({
            nome_razao_social: p.nome_razao_social || '',
            nome_comercial: p.nome_comercial || '',
            cif_nif: p.cif_nif || '',
            tipo: (p.tipo as any) || 'alojamento',
            tipo_pessoa: (p.tipo_pessoa as any) || 'Persona Jurídica',
            classificacao: p.classificacao || 'Proveedor Alojamiento',
            contato_nome: p.contato_nome || '',
            telefone: p.telefone || '',
            email: p.email || '',
            contatos: contatosCarregados,
            dados_bancarios: dadosBancariosCarregados,
            metodo_pago: p.metodo_pago || 'Transferir',
            banco: p.banco || '',
            iban: p.iban || '',
            swift: p.swift || '',
            titular_conta: p.titular_conta || '',
            endereco: p.endereco || '',
            municipio: p.municipio || '',
            provincia: p.provincia || '',
            codigo_postal: p.codigo_postal || '',
            pais: p.pais || 'España',
            ativo: p.ativo ?? (p.status !== 'Inactivo'),
          });
        }
      }).catch(err => {
        console.error('Error al cargar proveedor:', err);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [id, reset]);

  // Autodetectar banco ao digitar IBAN
  const handleIbanChange = (index: number, val: string) => {
    const formatted = formatIban(val);
    setValue(`dados_bancarios.${index}.iban`, formatted, { shouldDirty: true });

    const bankInfo = identifyBankFromIban(formatted);
    if (bankInfo) {
      if (!watch(`dados_bancarios.${index}.banco`)) {
        setValue(`dados_bancarios.${index}.banco`, bankInfo.name, { shouldDirty: true });
      }
      if (!watch(`dados_bancarios.${index}.swift`)) {
        setValue(`dados_bancarios.${index}.swift`, bankInfo.bic, { shouldDirty: true });
      }
    }
  };

  const handleSetPrincipalBanco = (index: number) => {
    const list = watchedDadosBancarios || [];
    list.forEach((_, i) => {
      setValue(`dados_bancarios.${i}.principal`, i === index, { shouldDirty: true });
    });
  };

  const onSubmit = async (data: ProvedorFormValues) => {
    try {
      setIsSubmitting(true);

      const principalContato = data.contatos?.[0];
      const principalBanco = data.dados_bancarios?.find(b => b.principal) || data.dados_bancarios?.[0];

      const payload = {
        ...data,
        contato_nome: principalContato?.nome || data.contato_nome || '',
        telefone: principalContato?.telefone || data.telefone || '',
        email: principalContato?.email || data.email || '',
        banco: principalBanco?.banco || data.banco || '',
        iban: principalBanco?.iban || data.iban || '',
        swift: principalBanco?.swift || data.swift || '',
        titular_conta: principalBanco?.titular_conta || data.titular_conta || '',
        metodo_pago: principalBanco?.metodo_pago || data.metodo_pago || 'Transferir',
        endereco: data.endereco || '',
        municipio: data.municipio || '',
        provincia: data.provincia || '',
        codigo_postal: data.codigo_postal || '',
        pais: data.pais || 'España',
      };

      if (isEditing && id) {
        await registrosService.updateProvedor(id, payload as any);
      } else {
        await registrosService.createProvedor(payload as any);
      }

      setSaveSuccess(true);
      localStorage.removeItem('mcs_provedor_draft_novo');
      setIsDraftRestored(false);

      setTimeout(() => {
        navigate('/logistica/registros/provedores');
      }, 500);
    } catch (error: any) {
      console.error('Error saving provedor:', error);
      alert(`Error al guardar proveedor: ${error.message || 'Compruebe los datos informados.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errs: any) => {
    console.error('Form Validation Errors:', errs);
    const firstKey = Object.keys(errs)[0];
    alert(`Atención: El campo "${firstKey}" requiere ajuste: ${errs[firstKey]?.message || 'Compruebe el formulario.'}`);
  };

  if (isLoading) {
    return (
      <div className="w-full px-8 py-16 text-center text-slate-500 font-medium">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
        Cargando datos del proveedor...
      </div>
    );
  }

  return (
    <div className="w-full px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/logistica/registros/provedores')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h1>
            <p className="text-sm text-slate-500">
              {isEditing ? 'Actualice la información fiscal, bancaria y de contacto' : 'Registre un nuevo proveedor de alojamientos o servicios'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/logistica/registros/provedores')}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit, onError)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-xs disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-300" />
                ¡Guardado con Éxito!
              </>
            ) : isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save size={16} />
                {isEditing ? 'Guardar Cambios' : 'Registrar Proveedor'}
              </>
            )}
          </button>
        </div>
      </div>

      {isDraftRestored && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-5 py-3 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 font-bold">
            <Sparkles size={16} className="text-amber-600 flex-shrink-0" />
            <span>¡Borrador recuperado automáticamente! Los datos se han conservado al cambiar de pestaña.</span>
          </div>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="text-xs text-amber-700 hover:text-red-600 dark:text-amber-400 font-bold px-3 py-1 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          >
            Limpiar Borrador
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
        {/* BLOQUE 1: Información General & Fiscal */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Building className="h-4.5 w-4.5 text-blue-600" />
            Información General & Fiscal
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nombre / Razón Social *
              </label>
              <input
                type="text"
                {...register('nome_razao_social')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: PRUJA FORNIELES PARES SL"
              />
              {errors.nome_razao_social && (
                <p className="text-red-500 text-xs mt-1">{errors.nome_razao_social.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nombre Comercial / Marca
              </label>
              <input
                type="text"
                {...register('nome_comercial')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Agencia Prujà"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                CIF / NIF / DNI
              </label>
              <input
                type="text"
                {...register('cif_nif')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm uppercase focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: B12345678"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Persona
              </label>
              <select
                {...register('tipo_pessoa')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Persona Jurídica">Persona Jurídica (Empresa / SL / SA)</option>
                <option value="Persona Física">Persona Física (Autónomo / Particular)</option>
              </select>
            </div>
          </div>
        </div>

        {/* BLOQUE 2: Ubicación & Dirección */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="h-4.5 w-4.5 text-blue-600" />
            Ubicación & Dirección Fiscal
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dirección / Calle / Número
              </label>
              <input
                type="text"
                {...register('endereco')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Carrer Major, 12, 2º 1ª"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Código Postal
              </label>
              <input
                type="text"
                {...register('codigo_postal')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 08001"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                País
              </label>
              <CountrySelector
                value={watchedPais}
                onChange={val => setValue('pais', val, { shouldDirty: true })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Provincia / Comunidad
              </label>
              <RegionSelector
                countryName={watchedPais}
                value={watchedProvincia}
                onChange={val => setValue('provincia', val, { shouldDirty: true })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Municipio / Ciudad
              </label>
              <input
                type="text"
                {...register('municipio')}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Barcelona"
              />
            </div>
          </div>
        </div>

        {/* BLOQUE 3: Contactos */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Contact className="h-4.5 w-4.5 text-blue-600" />
              Contactos & Responsables
            </h3>
            <button
              type="button"
              onClick={() => appendContato({ nome: '', cargo_tipo: 'Contacto', telefone: '', email: '' })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
            >
              <Plus size={14} />
              Añadir Contacto
            </button>
          </div>

          <div className="space-y-3">
            {contatoFields.map((field, index) => (
              <div key={field.id} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    {...register(`contatos.${index}.nome`)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Cargo / Rol</label>
                  <input
                    type="text"
                    {...register(`contatos.${index}.cargo_tipo`)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    placeholder="Ej: Propietario / Gestor"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Teléfono</label>
                  <input
                    type="text"
                    {...register(`contatos.${index}.telefone`)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    placeholder="Ej: +34 612 345 678"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      {...register(`contatos.${index}.email`)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="Ej: contacto@empresa.es"
                    />
                  </div>
                  {contatoFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContato(index)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Eliminar contacto"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BLOQUE 4: Cuentas Bancarias */}
        <div className="bg-slate-50/60 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="h-4.5 w-4.5 text-blue-600" />
              Datos Bancarios para Pago de Alquiler
            </h3>
            <button
              type="button"
              onClick={() => appendBanco({ banco: '', iban: '', swift: '', titular_conta: '', metodo_pago: 'Transferir', principal: false })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
            >
              <Plus size={14} />
              Añadir Cuenta Bancaria
            </button>
          </div>

          <div className="space-y-3">
            {bancoFields.map((field, index) => (
              <div key={field.id} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Cuenta #{index + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="radio"
                        name="principal_banco"
                        checked={watchedDadosBancarios?.[index]?.principal || false}
                        onChange={() => handleSetPrincipalBanco(index)}
                        className="text-blue-600"
                      />
                      Cuenta Principal
                    </label>
                    {bancoFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBanco(index)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        title="Eliminar cuenta"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">IBAN *</label>
                    <input
                      type="text"
                      {...register(`dados_bancarios.${index}.iban`)}
                      onChange={e => handleIbanChange(index, e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono uppercase"
                      placeholder="ES91 2100 0418 4502 0005 1332"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Banco</label>
                    <input
                      type="text"
                      {...register(`dados_bancarios.${index}.banco`)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="Ej: CaixaBank"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Titular de la Cuenta</label>
                    <input
                      type="text"
                      {...register(`dados_bancarios.${index}.titular_conta`)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="Ej: PRUJA FORNIELES PARES SL"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};
