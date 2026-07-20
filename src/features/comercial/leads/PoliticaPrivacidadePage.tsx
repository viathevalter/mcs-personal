import { Shield, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function PoliticaPrivacidadePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Navy Header */}
        <div className="bg-[#061f3d] px-8 py-6 border-b border-slate-800 text-center relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-500" />
          <h1 className="text-2xl font-bold text-white tracking-wide uppercase">LoginPro</h1>
          <p className="text-xs text-slate-300 mt-1.5 font-medium tracking-wide">
            Política de Privacidad y Protección de Datos
          </p>
        </div>

        <div className="p-8 space-y-6 text-sm leading-relaxed text-slate-350">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
            <Shield className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold text-slate-100">Protección de Datos (RGPD)</h2>
          </div>

          <p className="text-xs text-slate-400">Última actualización: Julio de 2026</p>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-200">1. Responsable del Tratamiento</h3>
            <p>
              El responsable del tratamiento de los datos recabados en los formularios comerciales y de registro de esta web es <strong>LoginPro Gestión Empresarial S.L.</strong>, con domicilio legal en España. Sus datos serán tratados conforme al Reglamento General de Protección de Datos (RGPD UE 2016/679) y la Ley Orgánica 3/2018 (LOPDGDD).
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-200">2. Finalidad del Tratamiento</h3>
            <p>
              Tratamos la información que nos facilitan las personas interesadas con las siguientes finalidades:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Gestionar y enviar las propuestas comerciales y de presupuesto solicitadas voluntariamente por el usuario.</li>
              <li>Mantener el contacto comercial referente a los servicios de suministro de personal industrial y de construcción.</li>
              <li>Gestionar el envío de comunicaciones comerciales y campañas de e-mail marketing referentes a nuestros perfiles operativos.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-200">3. Conservación de los Datos</h3>
            <p>
              Los datos personales proporcionados se conservarán mientras se mantenga la relación comercial o durante los plazos legalmente exigidos. En caso de que un lead ejerza su derecho de descadastramiento (**Opt-Out**), sus datos de correo se mantendrán bloqueados en una lista de exclusión interna para asegurar que no vuelva a recibir ningún envío comercial.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-200">4. Derechos del Usuario (Derechos ARCO-POL)</h3>
            <p>
              Usted tiene derecho a obtener confirmación sobre si en LoginPro estamos tratando sus datos personales. Puede ejercer sus derechos de:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong>Acceso</strong> a sus datos personales almacenados.</li>
              <li><strong>Rectificación</strong> de datos inexactos.</li>
              <li><strong>Supresión o Cancelación</strong> cuando los datos ya no sean necesarios para los fines que fueron recogidos.</li>
              <li><strong>Oposición o Revocación</strong> del consentimiento para recibir e-mails de marketing (mediante el enlace de descadastro directo que se encuentra en cada e-mail).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-200">5. Medidas de Seguridad</h3>
            <p>
              Adoptamos todas las medidas técnicas y organizativas necesarias para evitar la pérdida, mal uso, alteración, acceso no autorizado y robo de los datos personales facilitados por el usuario.
            </p>
          </section>

          <div className="pt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
            <span>LoginPro © Todos los derechos reservados.</span>
            <Button
              variant="link"
              onClick={() => navigate('/public/termos-uso')}
              className="text-orange-500 hover:text-orange-400 p-0 h-auto flex items-center gap-1"
            >
              <FileText className="h-3 w-3" />
              Términos de Uso
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
