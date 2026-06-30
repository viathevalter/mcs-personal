import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/shared/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountrySelector, RegionSelector } from '@/features/master-data/locations/components/LocationSelectors';
import { Building, User, Mail, Phone, MapPin, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ColetaDadosPublicaPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const empresaIdParam = searchParams.get('empresa_id');

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Lead info loaded if editing
  const [leadName, setLeadName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [empresaId, setEmpresaId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    legal_name: '',
    tax_id: '',
    billing_email: '',
    country_id: '',
    region_id: '',
    province: '',
    city: '',
    postal_code: '',
    address_line: '',
  });

  useEffect(() => {
    async function loadLeadData() {
      if (!id) {
        // Mode: Create New Lead
        if (empresaIdParam) {
          setEmpresaId(empresaIdParam);
        } else {
          toast.error('Parâmetros inválidos. O link precisa conter o identificador da empresa.');
        }
        return;
      }

      // Mode: Edit/Update Existing Lead
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('leads')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          setLeadName(data.name || '');
          setCompanyName(data.company_name || '');
          setEmpresaId(data.empresa_id || '');
          
          setFormData({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            company_name: data.company_name || '',
            legal_name: data.legal_name || data.company_name || '',
            tax_id: data.tax_id || '',
            billing_email: data.billing_email || data.email || '',
            country_id: data.country_id || '',
            region_id: data.region_id || '',
            province: data.province || '',
            city: data.city || '',
            postal_code: data.postal_code || '',
            address_line: data.address_line || '',
          });
        }
      } catch (err: any) {
        console.error(err);
        toast.error('Não foi possível carregar as informações do formulário.');
      } finally {
        setIsLoading(false);
      }
    }

    loadLeadData();
  }, [id, empresaIdParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.company_name || !formData.legal_name || !formData.tax_id) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!empresaId) {
      toast.error('Identificador da empresa do grupo não encontrado.');
      return;
    }

    setIsLoading(true);
    try {
      if (id) {
        // Update existing lead
        const { error } = await supabase
          .schema('core_comercial')
          .from('leads')
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company_name: formData.company_name,
            legal_name: formData.legal_name,
            tax_id: formData.tax_id,
            billing_email: formData.billing_email || null,
            country_id: formData.country_id || null,
            region_id: formData.region_id || null,
            province: formData.province || null,
            city: formData.city || null,
            postal_code: formData.postal_code || null,
            address_line: formData.address_line || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        // Insert new lead
        const { error } = await supabase
          .schema('core_comercial')
          .from('leads')
          .insert({
            empresa_id: empresaId,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company_name: formData.company_name,
            legal_name: formData.legal_name,
            tax_id: formData.tax_id,
            billing_email: formData.billing_email || null,
            country_id: formData.country_id || null,
            region_id: formData.region_id || null,
            province: formData.province || null,
            city: formData.city || null,
            postal_code: formData.postal_code || null,
            address_line: formData.address_line || null,
          });

        if (error) throw error;
      }

      setIsSubmitted(true);
      toast.success('Informações enviadas com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao enviar dados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-500/10 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="relative w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="h-20 w-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">Obrigado!</h1>
            <p className="text-slate-400 text-lg">
              Suas informações foram salvas com sucesso.
            </p>
          </div>
          <p className="text-slate-500 text-sm">
            Nossa equipe comercial já recebeu os dados atualizados e dará andamento à elaboração de sua proposta e contrato.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-500/10 via-slate-950 to-slate-950 pointer-events-none" />
      
      <div className="relative w-full max-w-2xl bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-300">
        
        {/* Decorative Top Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-yellow-500 to-amber-500" />
        
        <div className="p-8 sm:p-10 space-y-8">
          
          {/* Header */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-semibold uppercase tracking-wider">
              {id ? 'Atualização cadastral' : 'Novo Cadastro'}
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
              {id ? 'Ficha de Cadastro de Cliente' : 'Ficha de Cadastro de Novo Lead'}
            </h1>
            <p className="text-slate-400 text-sm">
              {id 
                ? `Olá, ${leadName}! Confirme ou complete os dados cadastrais da empresa ${companyName} para darmos início ao contrato.`
                : 'Por favor, preencha os dados abaixo com as informações de sua empresa para gerarmos a proposta comercial.'}
            </p>
          </div>

          {isLoading && !formData.name ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 text-yellow-500 animate-spin" />
              <p className="text-slate-500 text-sm">Carregando formulário...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Section 1: Identification */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Building className="h-5 w-5 text-yellow-500 shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Identificação da Empresa</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name" className="text-slate-300">Nome Comercial / Fantasia *</Label>
                    <Input
                      id="company_name"
                      required
                      placeholder="Ex: Mastercorp Portugal"
                      className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-yellow-500"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="legal_name" className="text-slate-300">Razão Social *</Label>
                    <Input
                      id="legal_name"
                      required
                      placeholder="Ex: Mastercorp S.A."
                      className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-yellow-500"
                      value={formData.legal_name}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_id" className="text-slate-300">NIF / CIF / CPF (Número Fiscal) *</Label>
                  <Input
                    id="tax_id"
                    required
                    placeholder="Ex: 500123456"
                    className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-yellow-500"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  />
                </div>
              </div>

              {/* Section 2: Contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <User className="h-5 w-5 text-yellow-500 shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Contato Principal</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">Nome do Ponto de Contato *</Label>
                  <Input
                    id="name"
                    required
                    placeholder="Ex: Ana Souza"
                    className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-yellow-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">E-mail de Contato *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="Ex: ana@empresa.com"
                        className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 pl-10 focus-visible:ring-yellow-500"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billing_email" className="text-slate-300">E-mail para Faturamento</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <Input
                        id="billing_email"
                        type="email"
                        placeholder="Ex: financeiro@empresa.com"
                        className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 pl-10 focus-visible:ring-yellow-500"
                        value={formData.billing_email}
                        onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-300">Telefone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      id="phone"
                      required
                      placeholder="Ex: +351 912 345 678"
                      className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 pl-10 focus-visible:ring-yellow-500"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Address */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <MapPin className="h-5 w-5 text-yellow-500 shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Endereço de Faturamento</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">País</Label>
                    <CountrySelector
                      value={formData.country_id || null}
                      onChange={(val) => setFormData({ ...formData, country_id: val || '', region_id: '' })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Região</Label>
                    <RegionSelector
                      countryId={formData.country_id || null}
                      value={formData.region_id || null}
                      onChange={(val) => setFormData({ ...formData, region_id: val || '' })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="province" className="text-slate-300">Província</Label>
                    <Input
                      id="province"
                      placeholder="Ex: Madrid"
                      className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-yellow-500"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-slate-300">Cidade</Label>
                    <Input
                      id="city"
                      placeholder="Ex: Lisboa"
                      className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-yellow-500"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code" className="text-slate-300">Código Postal</Label>
                    <Input
                      id="postal_code"
                      placeholder="Ex: 1000-001"
                      className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-yellow-500"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_line" className="text-slate-300">Logradouro / Avenida / Rua e Número</Label>
                  <Input
                    id="address_line"
                    placeholder="Ex: Avenida da Liberdade, nº 123, 4º Andar"
                    className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-yellow-500"
                    value={formData.address_line}
                    onChange={(e) => setFormData({ ...formData, address_line: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold text-base py-6 rounded-xl shadow-lg shadow-yellow-500/10 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Enviando Informações...
                    </>
                  ) : (
                    'Confirmar e Enviar Dados'
                  )}
                </Button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
