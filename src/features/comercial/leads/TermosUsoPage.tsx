import { FileText, ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function TermosUsoPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Navy Header */}
        <div className="bg-[#061f3d] px-8 py-6 border-b border-slate-800 text-center relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-500" />
          <h1 className="text-2xl font-bold text-white tracking-wide uppercase">LoginPro</h1>
          <p className="text-xs text-slate-300 mt-1.5 font-medium tracking-wide">
            Términos y Condiciones de Uso
          </p>
        </div>

        <div className="p-8 space-y-6 text-sm leading-relaxed text-slate-350">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
            <FileText className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold text-slate-100">Condiciones Generales</h2>
          </div>

          <p className="text-xs text-slate-400">Última actualización: Julio de 2026</p>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-200">1. Objeto y Aceptación</h3>
            <p>
              El presente documento establece los Términos y Condiciones de Uso que regulan el acceso, navegación y utilización de los portales web y servicios de <strong>LoginPro</strong>. Al acceder a esta plataforma o interactuar con nuestros e-mails y formularios, usted acepta plenamente y sin reservas las presentes condiciones.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-200">2. Servicios de Intermediación y Selección</h3>
            <p>
              LoginPro ofrece soluciones especializadas en selección de personal cualificado para los sectores de industria, construcción y calderería. El uso de nuestros formularios públicos tiene como único fin la solicitud de presupuestos comerciales o el registro voluntario de candidatos en nuestros procesos de selección de personal.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-200">3. Uso Correcto de la Plataforma</h3>
            <p>
              El usuario se compromete a hacer uso de los formularios web de manera veraz, aportando exclusivamente datos reales de contacto, identidad y necesidades operativas de la obra. Queda estrictamente prohibido el envío masivo de spam o el uso de identidades falsas.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-200">4. Limitación de Responsabilidad</h3>
            <p>
              LoginPro realiza los mayores esfuerzos para asegurar la disponibilidad de sus servicios y la precisión comercial de los presupuestos estimados. No obstante, las estimaciones iniciales de presupuesto enviadas a través del formulario son de carácter consultivo y están sujetas a posteriores confirmaciones contractuales por parte de nuestro equipo comercial.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-200">5. Ley Aplicable y Jurisdicción</h3>
            <p>
              Estos términos de uso se rigen por la legislación española y comunitaria. Para cualquier controversia derivada del uso del portal web, las partes se someten a la jurisdicción de los Juzgados y Tribunales competentes de España.
            </p>
          </section>

          <div className="pt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
            <span>LoginPro © Todos los derechos reservados.</span>
            <Button
              variant="link"
              onClick={() => navigate('/public/politica-privacidade')}
              className="text-orange-500 hover:text-orange-400 p-0 h-auto flex items-center gap-1"
            >
              <Shield className="h-3 w-3" />
              Política de Privacidad
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
