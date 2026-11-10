import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Mail,
  Send,
  Copy,
  Check,
  FileText,
  ExternalLink,
  Sparkles,
  MessageSquare,
  Loader2,
  Paperclip,
  UserCheck,
  ShieldCheck,
  ClipboardList,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/shared/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useMarketingTemplates, type MarketingTemplate } from '@/features/comercial/leads/hooks/useMarketing';
import {
  useCommercialScope,
  ACTIVE_COMMERCIAL_PROFILES,
  getCommercialProfileByUser,
  type CommercialOwnerKey,
  type CommercialOperatorProfile,
} from '@/features/comercial/leads/hooks/useLeads';
import type { Lead } from '@/features/comercial/estimaciones/types';

interface SendMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  queueItemId?: string | null;
  onConfirm: (materialSent: string, emailUsed: string, notes: string) => void;
  onLeadUpdated?: (updatedLead: Lead) => void;
  isSubmitting?: boolean;
}

interface BrandMaterialConfig {
  ownerKey: CommercialOwnerKey;
  companyFull: string;
  brandSubtitle: string;
  primaryColor: string;
  accentColor: string;
  website: string;
  logoPath: string;
  heroImagePath: string;
  presentationPdf: string;
  dossierPdf: string;
  phone: string;
}

const BRAND_MATERIAL_CONFIGS: Record<CommercialOwnerKey, BrandMaterialConfig> = {
  alba: {
    ownerKey: 'alba',
    companyFull: 'Triángulo Servicios Industriales',
    brandSubtitle: 'Fuerza Laboral Especializada para la Industria Europea',
    primaryColor: '#0F172A',
    accentColor: '#D97706',
    website: 'www.triangulolda.com',
    logoPath: '/assets/images/logo-triangulo.png',
    heroImagePath: '/assets/images/triangulo-tig-welder.png',
    presentationPdf: 'Apresentacao-Triangulo-ES-Alba.pdf',
    dossierPdf: 'Dossier-Triangulo-ES-Alba.pdf',
    phone: '+34 937 37 48 30',
  },
  ayslan: {
    ownerKey: 'ayslan',
    companyFull: 'Génio Montagens Industriales',
    brandSubtitle: 'Excelencia en Mano de Obra y Montajes Industriales en Europa',
    primaryColor: '#0A2540',
    accentColor: '#DC2626',
    website: 'www.geniomontagens.com',
    logoPath: '/assets/images/genio/logo_full.png',
    heroImagePath: '/assets/images/genio/hero_empresas.png',
    presentationPdf: 'Apresentacao-Genio-Montagens-ES-Ayslan.pdf',
    dossierPdf: 'Dossier-Genio-Montagens-ES-Ayslan.pdf',
    phone: '+351 913 417 249',
  },
  liseth: {
    ownerKey: 'liseth',
    companyFull: 'Wiseowe Servicios Industriales',
    brandSubtitle: 'Equipos Cualificados de Soldadura, Tubería y Montaje Industrial',
    primaryColor: '#0C192C',
    accentColor: '#EA580C',
    website: 'www.wiseowe.com',
    logoPath: '/assets/images/logo-wiseowe.png',
    heroImagePath: '/assets/images/wise-mkt01-hero.png',
    presentationPdf: 'Apresentacao-Wiseowe-ES-Liseth.pdf',
    dossierPdf: 'Dossier-Wiseowe-ES-Liseth.pdf',
    phone: '+34 937 37 15 40',
  },
  fatumata: {
    ownerKey: 'fatumata',
    companyFull: 'Wiseowe Industrie France',
    brandSubtitle: "Solutions d'Équipes Techniques en Soudure, Tuyauterie et Montage Industriel",
    primaryColor: '#0C192C',
    accentColor: '#EA580C',
    website: 'www.wiseowe.com',
    logoPath: '/assets/images/logo-wiseowe.png',
    heroImagePath: '/assets/images/wise-mkt02-dossier.png',
    presentationPdf: 'Apresentacao-Wiseowe-FR-Fatumata.pdf',
    dossierPdf: 'Dossier-Wiseowe-FR-Fatumata.pdf',
    phone: '+33 1 76 21 06 55',
  },
  alex: {
    ownerKey: 'alex',
    companyFull: 'Luminous Alley — Servicios Industriales',
    brandSubtitle: 'Soluciones de Personal Técnico Homologado y Montaje Industrial',
    primaryColor: '#1E1B4B',
    accentColor: '#2563EB',
    website: 'www.luminousalley.com',
    logoPath: '/assets/images/logo-luminous.png',
    heroImagePath: '/assets/images/luminous-mig-welder.png',
    presentationPdf: 'Apresentacao-Luminous-ES-Alex.pdf',
    dossierPdf: 'Dossier-Luminous-ES-Alex.pdf',
    phone: '+34 937 37 41 80',
  },
  giada: {
    ownerKey: 'giada',
    companyFull: 'Wiseowe Servizi Industriali Italia',
    brandSubtitle: 'Squadre Specializzate in Saldatura, Tubisteria e Montaggio Industriale',
    primaryColor: '#0C192C',
    accentColor: '#EA580C',
    website: 'www.wiseowe.com',
    logoPath: '/assets/images/logo-wiseowe.png',
    heroImagePath: '/assets/images/wise-mkt03-despliegue.png',
    presentationPdf: 'Apresentacao-Wiseowe-IT-Giada.pdf',
    dossierPdf: 'Dossier-Wiseowe-IT-Giada.pdf',
    phone: '+39 02 8295 4100',
  },
};

export type BuiltinMaterialKind = 'apresentacao_executiva' | 'dossier_tecnico' | 'condicoes_cotacao';

interface BuiltinMaterialOption {
  id: BuiltinMaterialKind;
  badge: string;
  title: string;
  description: string;
  subject: string;
  pdfFilename: string;
  secondaryPdfFilename?: string;
  htmlBody: string;
}

function buildMaterialsForCommercial(
  profile: CommercialOperatorProfile,
  brand: BrandMaterialConfig,
  originUrl: string
): BuiltinMaterialOption[] {
  const presUrl = `${originUrl}/assets/materials/${brand.presentationPdf}`;
  const dossierUrl = `${originUrl}/assets/materials/${brand.dossierPdf}`;
  const logoUrl = `${originUrl}${brand.logoPath}`;
  const heroUrl = `${originUrl}${brand.heroImagePath}`;

  if (profile.language === 'fr') {
    return [
      {
        id: 'apresentacao_executiva',
        badge: '1 Page • Impact Rapide',
        title: '1. Présentation Exécutive & Carte des Capacités (PDF)',
        description:
          'Idéal après un 1er appel : synthèse visuelle 16:9 des profils (Soudeurs TIG/MIG/MAG ISO 9606-1, Tuyauteurs, Chaudronniers, Monteurs).',
        subject: `${brand.companyFull} — Présentation Exécutive & Disponibilité d'Équipes Techniques`,
        pdfFilename: brand.presentationPdf,
        htmlBody: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;color:#0f172a;">
  <div style="background:${brand.primaryColor};padding:22px 28px;border-bottom:4px solid ${brand.accentColor};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <img src="${logoUrl}" alt="${brand.companyFull}" style="max-height:42px;background:#ffffff;padding:6px 12px;border-radius:8px;display:block;" />
        </td>
        <td align="right" style="color:#f8fafc;font-size:12px;font-weight:700;">
          🇫🇷 OPÉRATIONS FRANCE & EUROPE<br/>
          <span style="color:#cbd5e1;font-weight:400;font-size:11px;">${brand.website}</span>
        </td>
      </tr>
    </table>
  </div>
  <img src="${heroUrl}" alt="Équipe Industrielle" style="width:100%;max-height:220px;object-fit:cover;display:block;" />
  <div style="padding:26px 28px;">
    <p style="font-size:15px;margin:0 0 12px 0;">Bonjour <strong>{{nome_contato}}</strong>,</p>
    <p style="font-size:14px;line-height:1.65;color:#334155;margin:0 0 16px 0;">
      Suite à notre échange téléphonique, je vous prie de trouver ci-joint la <strong>Présentation Exécutive de ${brand.companyFull}</strong> concernant la mise à disposition rapide de nos équipes techniques qualifiées pour vos chantiers et ateliers de fabrication en <strong>{{empresa}}</strong>.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${brand.accentColor};border-radius:10px;padding:16px;margin:18px 0;">
      <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:${brand.accentColor};letter-spacing:0.5px;margin-bottom:8px;">
         Nos Spécialités Immédiatement Mobilisables
      </div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#1e293b;">
        <li><strong>Soudeurs Homologués ISO 9606-1 :</strong> TIG (141), MIG/MAG (135/136), MMA (111) — Inox, Carbone, Duplex.</li>
        <li><strong>Tuyauteurs Industriels (Isométrie) :</strong> lecture de plans ISO, préfabrication et montage de réseaux process.</li>
        <li><strong>Chaudronniers & Assembleurs au Plan :</strong> traçage, pointage, cuves, appareils à pression et charpente lourde.</li>
        <li><strong>Mécaniciens Monteurs :</strong> alignement d'équipements rotatifs, skids, arrêts d'unités et maintenance lourde.</li>
      </ul>
    </div>
    <!-- EXTRA_NOTE_SLOT -->
    <div style="margin:22px 0;text-align:center;">
      <a href="${presUrl}" target="_blank" style="background:${brand.accentColor};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:700;display:inline-block;">
        📄 Télécharger la Présentation Exécutive (PDF également en pièce jointe)
      </a>
    </div>
    <p style="font-size:13.5px;line-height:1.6;color:#334155;margin:0 0 18px 0;">
      Nous restons à votre entière disposition pour chiffrer vos prochains besoins de renfort d'équipe sous 24 heures.
    </p>
    <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:13px;color:#1e293b;">
      Cordialement,<br/>
      <strong style="font-size:14px;color:${brand.primaryColor};">{{vendedor_nome}}</strong><br/>
      <span style="color:${brand.accentColor};font-weight:600;">Direction Commerciale — ${brand.companyFull}</span><br/>
      📧 <a href="mailto:{{vendedor_email}}" style="color:#2563eb;text-decoration:none;">{{vendedor_email}}</a> &nbsp;|&nbsp; 📞 {{vendedor_telefone}} &nbsp;|&nbsp; 🌐 ${brand.website}
    </div>
  </div>
</div>`,
      },
      {
        id: 'dossier_tecnico',
        badge: '5 Pages • Dossier 360°',
        title: '2. Dossier Technique Corporatif & Homologations (PDF 5 Pages)',
        description:
          'Complet pour Direction Technique & Achats : méthodologie en 4 étapes, conformité légale A1/SIPSI, HSE et matrice de profils.',
        subject: `${brand.companyFull} — Dossier Technique Corporatif & Qualifications ISO 9606`,
        pdfFilename: brand.dossierPdf,
        htmlBody: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;color:#0f172a;">
  <div style="background:${brand.primaryColor};padding:22px 28px;border-bottom:4px solid ${brand.accentColor};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <img src="${logoUrl}" alt="${brand.companyFull}" style="max-height:42px;background:#ffffff;padding:6px 12px;border-radius:8px;display:block;" />
        </td>
        <td align="right" style="color:#f8fafc;font-size:12px;font-weight:700;">
          DOSSIER TECHNIQUE 2026<br/>
          <span style="color:#cbd5e1;font-weight:400;font-size:11px;">ISO 9606-1 • ASME IX • EN 1090</span>
        </td>
      </tr>
    </table>
  </div>
  <img src="${heroUrl}" alt="Dossier Technique" style="width:100%;max-height:210px;object-fit:cover;display:block;" />
  <div style="padding:26px 28px;">
    <p style="font-size:15px;margin:0 0 12px 0;">Bonjour <strong>{{nome_contato}}</strong>,</p>
    <p style="font-size:14px;line-height:1.65;color:#334155;margin:0 0 16px 0;">
      Comme convenu lors de notre conversation téléphonique, vous trouverez en pièce jointe notre <strong>Dossier Technique Corporatif Complet (5 pages)</strong> détaillant nos procédures de qualification, notre conformité sociale et sécurité (HSE) ainsi que notre modèle opérationnel pour <strong>{{empresa}}</strong>.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:18px 0;">
      <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:${brand.primaryColor};margin-bottom:8px;">
        📋 Contenu du Dossier Technique ci-joint :
      </div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#1e293b;">
        <li><strong>Matrice Technique :</strong> Soudeurs qualifiés avec essais CND (VT, PT, MT, UT, RT), Tuyauteurs ISO et Chaudronniers.</li>
        <li><strong>Conformité 100% Garantie :</strong> Certificats A1, déclarations détachement SIPSI, Carte BTP, visites médicales et formations sécurité (N1/N2, CACES).</li>
        <li><strong>Méthodologie en 4 Étapes :</strong> Cahier des charges, sélection sur épreuve pratique, logistique clé en main et suivi en chantier.</li>
      </ul>
    </div>
    <!-- EXTRA_NOTE_SLOT -->
    <div style="margin:22px 0;text-align:center;">
      <a href="${dossierUrl}" target="_blank" style="background:${brand.primaryColor};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:700;display:inline-block;">
        📘 Ouvrir le Dossier Technique Complet (PDF 5 Pages en pièce jointe)
      </a>
    </div>
    <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:13px;color:#1e293b;">
      Sincères salutations,<br/>
      <strong style="font-size:14px;color:${brand.primaryColor};">{{vendedor_nome}}</strong><br/>
      <span style="color:${brand.accentColor};font-weight:600;">Direction Commerciale — ${brand.companyFull}</span><br/>
      📧 <a href="mailto:{{vendedor_email}}" style="color:#2563eb;text-decoration:none;">{{vendedor_email}}</a> &nbsp;|&nbsp; 📞 {{vendedor_telefone}} &nbsp;|&nbsp; 🌐 ${brand.website}
    </div>
  </div>
</div>`,
      },
      {
        id: 'condicoes_cotacao',
        badge: 'Pré-Devis • Tout Compris',
        title: '3. Modèle Horaire "Tout Compris" & Étude de Devis Sur-Mesure',
        description:
          'Explique les 6 éléments inclus dans notre tarif horaire (sans fixer de prix à l’avance) + 4 questions rapides pour établir le devis.',
        subject: `${brand.companyFull} — Conditions "Tout Compris" & Demande de Chiffrage`,
        pdfFilename: brand.dossierPdf,
        secondaryPdfFilename: brand.presentationPdf,
        htmlBody: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;color:#0f172a;">
  <div style="background:${brand.primaryColor};padding:22px 28px;border-bottom:4px solid ${brand.accentColor};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <img src="${logoUrl}" alt="${brand.companyFull}" style="max-height:42px;background:#ffffff;padding:6px 12px;border-radius:8px;display:block;" />
        </td>
        <td align="right" style="color:#f8fafc;font-size:12px;font-weight:700;">
          MODÈLE OPÉRATIONNEL CLÉ EN MAIN<br/>
          <span style="color:#cbd5e1;font-weight:400;font-size:11px;">Tarification Horaire Transparente</span>
        </td>
      </tr>
    </table>
  </div>
  <div style="padding:26px 28px;">
    <p style="font-size:15px;margin:0 0 12px 0;">Bonjour <strong>{{nome_contato}}</strong>,</p>
    <p style="font-size:14px;line-height:1.65;color:#334155;margin:0 0 16px 0;">
      Suite à notre échange téléphonique, je vous détaille le fonctionnement de notre modèle de prestation horaire <strong>« Tout Compris »</strong> ainsi que les informations nécessaires pour vous transmettre une proposition tarifaire ajustée à <strong>{{empresa}}</strong>.
    </p>
    <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:16px;margin:16px 0;">
      <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:${brand.accentColor};margin-bottom:8px;">
        ✅ Ce qui est 100% inclus dans notre Tarif Horaire :
      </div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#1e293b;">
        <li><strong>1. Rémunération & Charges Sociales :</strong> contrats, salaires, congés, assurances RC et attestations A1/SIPSI.</li>
        <li><strong>2. Hébergement Proche du Site :</strong> logements complets réservés et pris en charge par nos soins.</li>
        <li><strong>3. Flotte & Mobilité Quotidienne :</strong> véhicules de société et trajets quotidiens logement ↔ chantier/atelier.</li>
        <li><strong>4. EPI Homologués CE & Outillage :</strong> vêtements ignifugés, cagoules de soudage, chaussures S3 et EPI spécifiques.</li>
        <li><strong>5. Conformité HSE & Médicale :</strong> visites médicales d'aptitude et habilitations sécurité à jour.</li>
        <li><strong>6. Garantie de Remplacement :</strong> remplacement rapide sous 48h/72h si un profil ne correspond pas au standard requis.</li>
      </ul>
    </div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin:16px 0;">
      <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#9a3412;margin-bottom:6px;">
        ⚡ Pour recevoir votre Devis Personnalisé sous 24h, répondez simplement avec :
      </div>
      <ol style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#431407;">
        <li><strong>Profils & Procédés requis :</strong> (ex. 4 Soudeurs TIG/MAG, 2 Tuyauteurs ISO, 2 Chaudronniers)</li>
        <li><strong>Lieu du chantier ou de l'atelier :</strong> (Ville / Département)</li>
        <li><strong>Date de démarrage souhaitée & durée estimée :</strong> (Semaines / Mois)</li>
        <li><strong>Volume horaire hebdomadaire prévu :</strong> (ex. 40h à 50h / semaine)</li>
      </ol>
    </div>
    <!-- EXTRA_NOTE_SLOT -->
    <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:13px;color:#1e293b;">
      Dans l'attente de votre retour,<br/>
      <strong style="font-size:14px;color:${brand.primaryColor};">{{vendedor_nome}}</strong><br/>
      <span style="color:${brand.accentColor};font-weight:600;">Direction Commerciale — ${brand.companyFull}</span><br/>
      📧 <a href="mailto:{{vendedor_email}}" style="color:#2563eb;text-decoration:none;">{{vendedor_email}}</a> &nbsp;|&nbsp; 📞 {{vendedor_telefone}} &nbsp;|&nbsp; 🌐 ${brand.website}
    </div>
  </div>
</div>`,
      },
    ];
  }

  if (profile.language === 'it') {
    return [
      {
        id: 'apresentacao_executiva',
        badge: '1 Pagina • Impatto Rapido',
        title: '1. Presentazione Esecutiva & Carta delle Capacità (PDF)',
        description:
          'Ideale dopo la 1ª chiamata: sintesi visiva 16:9 dei profili (Saldatori TIG/MIG/MAG ISO 9606-1, Tubisti,Carpentieri, Montatori).',
        subject: `${brand.companyFull} — Presentazione Esecutiva & Disponibilità Squadre Tecniche`,
        pdfFilename: brand.presentationPdf,
        htmlBody: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;color:#0f172a;">
  <div style="background:${brand.primaryColor};padding:22px 28px;border-bottom:4px solid ${brand.accentColor};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <img src="${logoUrl}" alt="${brand.companyFull}" style="max-height:42px;background:#ffffff;padding:6px 12px;border-radius:8px;display:block;" />
        </td>
        <td align="right" style="color:#f8fafc;font-size:12px;font-weight:700;">
          🇮🇹 OPERAZIONI ITALIA & EUROPA<br/>
          <span style="color:#cbd5e1;font-weight:400;font-size:11px;">${brand.website}</span>
        </td>
      </tr>
    </table>
  </div>
  <img src="${heroUrl}" alt="Squadra Industriale" style="width:100%;max-height:220px;object-fit:cover;display:block;" />
  <div style="padding:26px 28px;">
    <p style="font-size:15px;margin:0 0 12px 0;">Gentile <strong>{{nome_contato}}</strong>,</p>
    <p style="font-size:14px;line-height:1.65;color:#334155;margin:0 0 16px 0;">
      In seguito al nostro colloquio telefonico, Le trasmetto in allegato la <strong>Presentazione Esecutiva di ${brand.companyFull}</strong> relativa alla fornitura rapida di personale tecnico qualificato per le Vostre officine e cantieri in <strong>{{empresa}}</strong>.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${brand.accentColor};border-radius:10px;padding:16px;margin:18px 0;">
      <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:${brand.accentColor};letter-spacing:0.5px;margin-bottom:8px;">
        ⚡ Profili Tecnici Pronti per la Mobilitazione
      </div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#1e293b;">
        <li><strong>Saldatori Certificati ISO 9606-1:</strong> TIG (141), MIG/MAG (135/136), Elettrodo (111) — Inox, Carbonio, Duplex.</li>
        <li><strong>Tubisti Industriali (Isometria):</strong> lettura disegni isometrici, prefabbricazione, smussatura e montaggio piping.</li>
        <li><strong>Carpentieri Metallici & Caldarai:</strong> tracciatura, assemblaggio su disegno, serbatoi a pressione e carpenteria pesante.</li>
        <li><strong>Montatori Meccanici:</strong> montaggio macchinari, allineamento gruppi rotanti, skid e fermate impianti.</li>
      </ul>
    </div>
    <!-- EXTRA_NOTE_SLOT -->
    <div style="margin:22px 0;text-align:center;">
      <a href="${presUrl}" target="_blank" style="background:${brand.accentColor};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:700;display:inline-block;">
        📄 Scarica la Presentazione Esecutiva (PDF allegato all'e-mail)
      </a>
    </div>
    <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:13px;color:#1e293b;">
      Cordiali saluti,<br/>
      <strong style="font-size:14px;color:${brand.primaryColor};">{{vendedor_nome}}</strong><br/>
      <span style="color:${brand.accentColor};font-weight:600;">Direzione Commerciale — ${brand.companyFull}</span><br/>
      📧 <a href="mailto:{{vendedor_email}}" style="color:#2563eb;text-decoration:none;">{{vendedor_email}}</a> &nbsp;|&nbsp; 📞 {{vendedor_telefone}} &nbsp;|&nbsp; 🌐 ${brand.website}
    </div>
  </div>
</div>`,
      },
      {
        id: 'dossier_tecnico',
        badge: '5 Pagine • Dossier 360°',
        title: '2. Dossier Tecnico Corporativo & Omologazioni (PDF 5 Pagine)',
        description:
          'Completo per Direzione Tecnica e Acquisti: metodologia in 4 fasi, conformità D.Lgs. 81/08 & A1, HSE e matrice profili.',
        subject: `${brand.companyFull} — Dossier Tecnico Corporativo & Qualifiche ISO 9606`,
        pdfFilename: brand.dossierPdf,
        htmlBody: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;color:#0f172a;">
  <div style="background:${brand.primaryColor};padding:22px 28px;border-bottom:4px solid ${brand.accentColor};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <img src="${logoUrl}" alt="${brand.companyFull}" style="max-height:42px;background:#ffffff;padding:6px 12px;border-radius:8px;display:block;" />
        </td>
        <td align="right" style="color:#f8fafc;font-size:12px;font-weight:700;">
          DOSSIER TECNICO 2026<br/>
          <span style="color:#cbd5e1;font-weight:400;font-size:11px;">ISO 9606-1 • ASME IX • EN 1090</span>
        </td>
      </tr>
    </table>
  </div>
  <img src="${heroUrl}" alt="Dossier Tecnico" style="width:100%;max-height:210px;object-fit:cover;display:block;" />
  <div style="padding:26px 28px;">
    <p style="font-size:15px;margin:0 0 12px 0;">Gentile <strong>{{nome_contato}}</strong>,</p>
    <p style="font-size:14px;line-height:1.65;color:#334155;margin:0 0 16px 0;">
      Come concordato telefonicamente, Le invio in allegato il nostro <strong>Dossier Tecnico Corporativo Completo (5 pagine)</strong> con il dettaglio delle qualifiche di saldatura, la conformità normativa (Modelli A1, D.Lgs. 81/08) e il nostro modello operativo per <strong>{{empresa}}</strong>.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:18px 0;">
      <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:${brand.primaryColor};margin-bottom:8px;">
        📋 Punti Chiave del Dossier Tecnico Allegato:
      </div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#1e293b;">
        <li><strong>Matrice delle Competenze:</strong> Saldatori per controlli CND (VT, PT, MT, UT, RT), Tubisti isometrici e Carpentieri.</li>
        <li><strong>Conformità Legale & HSE:</strong> Certificati A1, idoneità sanitaria, formazione sicurezza D.Lgs. 81/08 e assicurazione RC.</li>
        <li><strong>Metodologia in 4 Fasi:</strong> Analisi WPS, prova pratica in cabina, logistica chiavi in mano e coordinamento in cantiere.</li>
      </ul>
    </div>
    <!-- EXTRA_NOTE_SLOT -->
    <div style="margin:22px 0;text-align:center;">
      <a href="${dossierUrl}" target="_blank" style="background:${brand.primaryColor};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:700;display:inline-block;">
        📘 Apri il Dossier Tecnico Completo (PDF 5 Pagine in allegato)
      </a>
    </div>
    <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:13px;color:#1e293b;">
      Cordiali saluti,<br/>
      <strong style="font-size:14px;color:${brand.primaryColor};">{{vendedor_nome}}</strong><br/>
      <span style="color:${brand.accentColor};font-weight:600;">Direzione Commerciale — ${brand.companyFull}</span><br/>
      📧 <a href="mailto:{{vendedor_email}}" style="color:#2563eb;text-decoration:none;">{{vendedor_email}}</a> &nbsp;|&nbsp; 📞 {{vendedor_telefone}} &nbsp;|&nbsp; 🌐 ${brand.website}
    </div>
  </div>
</div>`,
      },
      {
        id: 'condicoes_cotacao',
        badge: 'Pre-Preventivo • Tutto Incluso',
        title: '3. Condizioni "Tutto Incluso" & Raccolta Dati per Preventivo',
        description:
          'Illustra i 6 servizi inclusi nella tariffa oraria (senza vincolare prezzi fissi in anticipo) + 4 domande rapide per quotare.',
        subject: `${brand.companyFull} — Condizioni "Tutto Incluso" & Richiesta Preventivo`,
        pdfFilename: brand.dossierPdf,
        secondaryPdfFilename: brand.presentationPdf,
        htmlBody: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;color:#0f172a;">
  <div style="background:${brand.primaryColor};padding:22px 28px;border-bottom:4px solid ${brand.accentColor};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <img src="${logoUrl}" alt="${brand.companyFull}" style="max-height:42px;background:#ffffff;padding:6px 12px;border-radius:8px;display:block;" />
        </td>
        <td align="right" style="color:#f8fafc;font-size:12px;font-weight:700;">
          MODELLO OPERATIVO CHIAVI IN MANO<br/>
          <span style="color:#cbd5e1;font-weight:400;font-size:11px;">Tariffa Oraria Tutto Incluso</span>
        </td>
      </tr>
    </table>
  </div>
  <div style="padding:26px 28px;">
    <p style="font-size:15px;margin:0 0 12px 0;">Gentile <strong>{{nome_contato}}</strong>,</p>
    <p style="font-size:14px;line-height:1.65;color:#334155;margin:0 0 16px 0;">
      In seguito alla nostra conversazione telefonica, Le illustro cosa comprende la nostra tariffa oraria <strong>« Tutto Incluso »</strong> e i dati necessari per inviarLe un'offerta economica su misura per <strong>{{empresa}}</strong>.
    </p>
    <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:16px;margin:16px 0;">
      <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:${brand.accentColor};margin-bottom:8px;">
        ✅ 6 Voci 100% Incluse nella Nostra Tariffa Oraria:
      </div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#1e293b;">
        <li><strong>1. Retribuzione & Contributi Previdenziali:</strong> stipendi, oneri sociali, TFR, ferie, Modelli A1 e assicurazione RC.</li>
        <li><strong>2. Alloggio Vicino al Cantiere/Officina:</strong> appartamenti attrezzati gestiti e pagati interamente da noi.</li>
        <li><strong>3. Flotta Aziendale & Trasporti:</strong> viaggi internazionali e trasferimenti giornalieri alloggio ↔ stabilimento.</li>
        <li><strong>4. DPI Omologati CE & Attrezzatura:</strong> abbigliamento ignifugo, maschere di saldatura, scarpe S3 e DPI specifici.</li>
        <li><strong>5. Conformità HSE & Idoneità Medica:</strong> visite mediche e attestati di sicurezza D.Lgs. 81/08 aggiornati.</li>
        <li><strong>6. Garanzia di Sostituzione Rapida:</strong> sostituzione entro 48h/72h se un operatore non soddisfa gli standard richiesti.</li>
      </ul>
    </div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin:16px 0;">
      <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#9a3412;margin-bottom:6px;">
        ⚡ Per ricevere il Preventivo Personalizzato entro 24 ore, risponda indicando:
      </div>
      <ol style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#431407;">
        <li><strong>Profili e processi richiesti:</strong> (es. 4 Saldatori TIG/MAG, 2 Tubisti ISO, 2 Carpentieri)</li>
        <li><strong>Località del cantiere o dell'officina:</strong> (Città / Provincia)</li>
        <li><strong>Data di inizio prevista e durata stimata:</strong> (Settimane / Mesi)</li>
        <li><strong>Monte ore settimanale previsto:</strong> (es. 40h - 50h / settimana)</li>
      </ol>
    </div>
    <!-- EXTRA_NOTE_SLOT -->
    <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:13px;color:#1e293b;">
      Restando in attesa di un Suo gentile riscontro,<br/>
      <strong style="font-size:14px;color:${brand.primaryColor};">{{vendedor_nome}}</strong><br/>
      <span style="color:${brand.accentColor};font-weight:600;">Direzione Commerciale — ${brand.companyFull}</span><br/>
      📧 <a href="mailto:{{vendedor_email}}" style="color:#2563eb;text-decoration:none;">{{vendedor_email}}</a> &nbsp;|&nbsp; 📞 {{vendedor_telefone}} &nbsp;|&nbsp; 🌐 ${brand.website}
    </div>
  </div>
</div>`,
      },
    ];
  }

  // Default: Spanish (ES) for Alba (Triángulo), Ayslan (Génio Montagens), Liseth (Wiseowe ES), Alex (Luminous Alley)
  return [
    {
      id: 'apresentacao_executiva',
      badge: '1 Página • Impacto Rápido',
      title: '1. Presentación Ejecutiva & Carta de Capacidades (PDF 16:9)',
      description:
        'Ideal tras la 1ª llamada: resumen visual ejecutivo de especialidades (Soldadores TIG/MIG/MAG ISO 9606-1, Tuberos, Caldereros y Montadores).',
      subject: `${brand.companyFull} — Presentación Ejecutiva y Disponibilidad de Personal Cualificado`,
      pdfFilename: brand.presentationPdf,
      htmlBody: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;color:#0f172a;">
  <div style="background:${brand.primaryColor};padding:22px 28px;border-bottom:4px solid ${brand.accentColor};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <img src="${logoUrl}" alt="${brand.companyFull}" style="max-height:42px;background:#ffffff;padding:6px 12px;border-radius:8px;display:block;" />
        </td>
        <td align="right" style="color:#f8fafc;font-size:12px;font-weight:700;">
          🇪🇸 OPERACIONES ESPAÑA & EUROPA<br/>
          <span style="color:#cbd5e1;font-weight:400;font-size:11px;">${brand.website}</span>
        </td>
      </tr>
    </table>
  </div>
  <img src="${heroUrl}" alt="Equipo Industrial" style="width:100%;max-height:220px;object-fit:cover;display:block;" />
  <div style="padding:26px 28px;">
    <p style="font-size:15px;margin:0 0 12px 0;">Estimado/a <strong>{{nome_contato}}</strong>,</p>
    <p style="font-size:14px;line-height:1.65;color:#334155;margin:0 0 16px 0;">
      Siguiendo nuestra conversación telefónica, le adjunto la <strong>Presentación Ejecutiva de ${brand.companyFull}</strong> respecto a nuestra disponibilidad inmediata de personal técnico homologado para reforzar sus talleres y obras en <strong>{{empresa}}</strong>.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${brand.accentColor};border-radius:10px;padding:16px;margin:18px 0;">
      <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:${brand.accentColor};letter-spacing:0.5px;margin-bottom:8px;">
        ⚡ Especialidades Listas para Movilización
      </div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#1e293b;">
        <li><strong>Soldadores Homologados ISO 9606-1:</strong> TIG (141), MIG/MAG (135/136), Arco Manual (111) — Inox, Carbono, Dúplex.</li>
        <li><strong>Tuberos Industriales (Isométricos):</strong> lectura de planos ISO, prefabricación, biselado y montaje de líneas de proceso.</li>
        <li><strong>Caldereros y Armadores en Plano:</strong> trazado, armado pesado, tanques, recipientes a presión y estructura EN 1090.</li>
        <li><strong>Montadores Mecánicos:</strong> montaje de maquinaria industrial, alineación de equipos rotativos, skids y paradas de planta.</li>
      </ul>
    </div>
    <!-- EXTRA_NOTE_SLOT -->
    <div style="margin:22px 0;text-align:center;">
      <a href="${presUrl}" target="_blank" style="background:${brand.accentColor};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:700;display:inline-block;">
        📄 Descargar Presentación Ejecutiva (PDF también adjunto en este correo)
      </a>
    </div>
    <p style="font-size:13.5px;line-height:1.6;color:#334155;margin:0 0 18px 0;">
      Quedamos a su entera disposición para preparar una propuesta técnica y económica en menos de 24 horas para sus próximos proyectos.
    </p>
    <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:13px;color:#1e293b;">
      Un cordial saludo,<br/>
      <strong style="font-size:14px;color:${brand.primaryColor};">{{vendedor_nome}}</strong><br/>
      <span style="color:${brand.accentColor};font-weight:600;">Departamento Comercial — ${brand.companyFull}</span><br/>
      📧 <a href="mailto:{{vendedor_email}}" style="color:#2563eb;text-decoration:none;">{{vendedor_email}}</a> &nbsp;|&nbsp; 📞 {{vendedor_telefone}} &nbsp;|&nbsp; 🌐 ${brand.website}
    </div>
  </div>
</div>`,
    },
    {
      id: 'dossier_tecnico',
      badge: '5 Páginas • Dossier 360°',
      title: '2. Dossier Técnico Corporativo & Homologaciones (PDF 5 Páginas)',
      description:
        'Completo para Dirección de Operaciones y Compras: metodología en 4 etapas, cumplimiento legal A1/PRL/CAE y matriz técnica.',
      subject: `${brand.companyFull} — Dossier Técnico Corporativo y Homologaciones ISO 9606`,
      pdfFilename: brand.dossierPdf,
      htmlBody: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;color:#0f172a;">
  <div style="background:${brand.primaryColor};padding:22px 28px;border-bottom:4px solid ${brand.accentColor};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <img src="${logoUrl}" alt="${brand.companyFull}" style="max-height:42px;background:#ffffff;padding:6px 12px;border-radius:8px;display:block;" />
        </td>
        <td align="right" style="color:#f8fafc;font-size:12px;font-weight:700;">
          DOSSIER TÉCNICO 2026<br/>
          <span style="color:#cbd5e1;font-weight:400;font-size:11px;">ISO 9606-1 • ASME IX • EN 1090</span>
        </td>
      </tr>
    </table>
  </div>
  <img src="${heroUrl}" alt="Dossier Técnico" style="width:100%;max-height:210px;object-fit:cover;display:block;" />
  <div style="padding:26px 28px;">
    <p style="font-size:15px;margin:0 0 12px 0;">Estimado/a <strong>{{nome_contato}}</strong>,</p>
    <p style="font-size:14px;line-height:1.65;color:#334155;margin:0 0 16px 0;">
      Conforme a nuestra conversación telefónica, le envío adjunto nuestro <strong>Dossier Técnico Corporativo Completo (5 páginas)</strong> con el detalle de nuestras certificaciones de soldadura, cumplimiento documental (PRL/CAE, Certificados A1) y modelo operativo llave en mano para <strong>{{empresa}}</strong>.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:18px 0;">
      <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:${brand.primaryColor};margin-bottom:8px;">
        📋 Resumen Ejecutivo del Dossier Técnico Adjunto:
      </div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#1e293b;">
        <li><strong>Matriz de Especialidades:</strong> Soldadores para ensayos END (VT, PT, MT, UT, RT), Tuberos Isométricos y Caldereros.</li>
        <li><strong>Seguridad Jurídica y PRL 100% al Día:</strong> Certificados A1, alta en Seguridad Social, aptitud médica, formación PRL (20h/60h Metal) y plataformas CAE.</li>
        <li><strong>Metodología en 4 Etapas:</strong> Levantamiento de WPS, selección práctica en cabina, logística integral y seguimiento en obra.</li>
      </ul>
    </div>
    <!-- EXTRA_NOTE_SLOT -->
    <div style="margin:22px 0;text-align:center;">
      <a href="${dossierUrl}" target="_blank" style="background:${brand.primaryColor};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:700;display:inline-block;">
        📘 Abrir Dossier Técnico Completo (PDF 5 Páginas adjunto)
      </a>
    </div>
    <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:13px;color:#1e293b;">
      Atentamente,<br/>
      <strong style="font-size:14px;color:${brand.primaryColor};">{{vendedor_nome}}</strong><br/>
      <span style="color:${brand.accentColor};font-weight:600;">Departamento Comercial — ${brand.companyFull}</span><br/>
      📧 <a href="mailto:{{vendedor_email}}" style="color:#2563eb;text-decoration:none;">{{vendedor_email}}</a> &nbsp;|&nbsp; 📞 {{vendedor_telefone}} &nbsp;|&nbsp; 🌐 ${brand.website}
    </div>
  </div>
</div>`,
    },
    {
      id: 'condicoes_cotacao',
      badge: 'Pre-Presupuesto • Todo Incluido',
      title: '3. Condiciones "Todo Incluido" & Levantamiento para Cotización',
      description:
        'Explica los 6 conceptos incluidos en nuestra tarifa horaria (sin atar precios antes de cotizar) + 4 preguntas rápidas para presupuestar.',
      subject: `${brand.companyFull} — Modelo "Todo Incluido" y Solicitud de Datos para Presupuesto`,
      pdfFilename: brand.dossierPdf,
      secondaryPdfFilename: brand.presentationPdf,
      htmlBody: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;color:#0f172a;">
  <div style="background:${brand.primaryColor};padding:22px 28px;border-bottom:4px solid ${brand.accentColor};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <img src="${logoUrl}" alt="${brand.companyFull}" style="max-height:42px;background:#ffffff;padding:6px 12px;border-radius:8px;display:block;" />
        </td>
        <td align="right" style="color:#f8fafc;font-size:12px;font-weight:700;">
          MODELO OPERATIVO LLAVE EN MANO<br/>
          <span style="color:#cbd5e1;font-weight:400;font-size:11px;">Tarifa Horaria Todo Incluido</span>
        </td>
      </tr>
    </table>
  </div>
  <div style="padding:26px 28px;">
    <p style="font-size:15px;margin:0 0 12px 0;">Estimado/a <strong>{{nome_contato}}</strong>,</p>
    <p style="font-size:14px;line-height:1.65;color:#334155;margin:0 0 16px 0;">
      Siguiendo nuestra conversación telefónica, le detallo el alcance de nuestro modelo de facturación por hora efectiva <strong>« Todo Incluido »</strong> y los datos breves para enviarle una cotización ajustada a las necesidades de <strong>{{empresa}}</strong>.
    </p>
    <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:16px;margin:16px 0;">
      <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:${brand.accentColor};margin-bottom:8px;">
        ✅ 6 Conceptos 100% Incluidos en Nuestra Tarifa Horaria:
      </div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#1e293b;">
        <li><strong>1. Salarios y Seguridad Social al Día:</strong> nóminas, cotizaciones, vacaciones, bajas, certificados A1 y Seguro RC.</li>
        <li><strong>2. Alojamiento Próximo a su Obra/Taller:</strong> viviendas completas gestionadas y costeadas íntegramente por nosotros.</li>
        <li><strong>3. Flota Propia y Transporte Local:</strong> viajes internacionales y desplazamientos diarios vivienda ↔ centro de trabajo.</li>
        <li><strong>4. EPIs Homologados CE y Ropa Ignífuga:</strong> pantallas electrónicas de soldadura, calzado S3 y EPIs específicos.</li>
        <li><strong>5. Gestión PRL / CAE Completa:</strong> reconocimientos médicos, formación PRL Metal y carga en su plataforma documental.</li>
        <li><strong>6. Garantía de Reemplazo Sin Coste:</strong> sustitución en 48h/72h si algún operario no se adapta al estándar técnico exigido.</li>
      </ul>
    </div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin:16px 0;">
      <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#9a3412;margin-bottom:6px;">
        ⚡ Para enviarle su Presupuesto Personalizado en menos de 24h, respóndanos con:
      </div>
      <ol style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#431407;">
        <li><strong>Perfiles y procesos requeridos:</strong> (ej. 4 Soldadores TIG/MAG, 2 Tuberos ISO, 2 Caldereros)</li>
        <li><strong>Ubicación de la obra o taller:</strong> (Ciudad / Provincia)</li>
        <li><strong>Fecha estimada de inicio y duración prevista:</strong> (Semanas / Meses)</li>
        <li><strong>Jornada semanal prevista:</strong> (ej. 40h a 50h / semana)</li>
      </ol>
    </div>
    <!-- EXTRA_NOTE_SLOT -->
    <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:13px;color:#1e293b;">
      Quedamos a la espera de sus comentarios para preparar su cotización,<br/>
      <strong style="font-size:14px;color:${brand.primaryColor};">{{vendedor_nome}}</strong><br/>
      <span style="color:${brand.accentColor};font-weight:600;">Departamento Comercial — ${brand.companyFull}</span><br/>
      📧 <a href="mailto:{{vendedor_email}}" style="color:#2563eb;text-decoration:none;">{{vendedor_email}}</a> &nbsp;|&nbsp; 📞 {{vendedor_telefone}} &nbsp;|&nbsp; 🌐 ${brand.website}
    </div>
  </div>
</div>`,
    },
  ];
}

async function fetchPdfAsBase64(pdfUrl: string): Promise<string | null> {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        if (!res) {
          resolve(null);
          return;
        }
        const base64 = res.includes(',') ? res.split(',')[1] : res;
        resolve(base64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Não foi possível carregar o PDF para anexo Base64:', err);
    return null;
  }
}

export function SendMaterialModal({
  isOpen,
  onClose,
  lead,
  queueItemId,
  onConfirm,
  onLeadUpdated,
  isSubmitting = false,
}: SendMaterialModalProps) {
  const { user } = useAuth();
  const { selectedEmpresaId } = useEmpresa();
  const { isCommercialOperator, loggedCommercialProfile, activeCommercialProfile } = useCommercialScope();
  const { data: dbTemplates = [] } = useMarketingTemplates();

  // Resolve initial commercial operator key based on logged user -> lead.assigned_to -> active scope -> company
  const resolvedDefaultOwnerKey = useMemo<CommercialOwnerKey>(() => {
    if (loggedCommercialProfile) return loggedCommercialProfile.ownerKey;
    if (lead?.assigned_to) {
      const byLeadOwner = getCommercialProfileByUser(lead.assigned_to);
      if (byLeadOwner) return byLeadOwner.ownerKey;
    }
    if (activeCommercialProfile) return activeCommercialProfile.ownerKey;
    if (selectedEmpresaId === 'a798620a-358a-4c6c-9db2-3a507c583cac') return 'alba';
    if (selectedEmpresaId === '4a507974-f922-409f-83c0-9ef8cbf982cb') return 'ayslan';
    if (selectedEmpresaId === 'dae64d51-2181-4510-b14f-e63d2f111a8e') {
      const c = (lead?.country_code || '').toUpperCase();
      if (c === 'FR') return 'fatumata';
      if (c === 'IT') return 'giada';
      return 'liseth';
    }
    return 'alex';
  }, [loggedCommercialProfile, lead?.assigned_to, lead?.country_code, activeCommercialProfile, selectedEmpresaId]);

  const [selectedSenderKey, setSelectedSenderKey] = useState<CommercialOwnerKey>(resolvedDefaultOwnerKey);

  useEffect(() => {
    if (isOpen) {
      setSelectedSenderKey(resolvedDefaultOwnerKey);
    }
  }, [isOpen, resolvedDefaultOwnerKey]);

  const activeSenderProfile = useMemo<CommercialOperatorProfile>(() => {
    return (
      ACTIVE_COMMERCIAL_PROFILES.find((p) => p.ownerKey === selectedSenderKey) ||
      ACTIVE_COMMERCIAL_PROFILES[0]
    );
  }, [selectedSenderKey]);

  const activeBrandConfig = useMemo<BrandMaterialConfig>(() => {
    return BRAND_MATERIAL_CONFIGS[activeSenderProfile.ownerKey] || BRAND_MATERIAL_CONFIGS.alex;
  }, [activeSenderProfile.ownerKey]);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mcs.gestaologinpro.com';

  const builtinMaterials = useMemo<BuiltinMaterialOption[]>(() => {
    return buildMaterialsForCommercial(activeSenderProfile, activeBrandConfig, originUrl);
  }, [activeSenderProfile, activeBrandConfig, originUrl]);

  // Form states
  const [selectedSourceType, setSelectedSourceType] = useState<'builtin' | 'template'>('builtin');
  const [selectedId, setSelectedId] = useState<string>('apresentacao_executiva');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [updateLeadEmail, setUpdateLeadEmail] = useState<boolean>(true);
  const [attachPdfFile, setAttachPdfFile] = useState<boolean>(true);
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailHtml, setEmailHtml] = useState<string>('');
  const [extraNote, setExtraNote] = useState<string>('');

  // UI states
  const [isSendingM365, setIsSendingM365] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const senderEmail = activeSenderProfile.commercialEmail;
  const senderName = activeSenderProfile.displayName;
  const senderPhone = activeSenderProfile.commercialPhone || activeBrandConfig.phone;

  // Sync recipient email when lead changes or modal opens
  useEffect(() => {
    if (lead) {
      setRecipientEmail(lead.email || '');
    }
  }, [lead, isOpen]);

  // Helper to replace dynamic tags
  const renderTemplateTags = (templateText: string) => {
    const defaultContactByLang =
      activeSenderProfile.language === 'fr'
        ? 'Responsable Achats / Production'
        : activeSenderProfile.language === 'it'
          ? 'Responsabile Acquisti / Produzione'
          : 'Responsable de Compras / Producción';
    const defaultCompanyByLang =
      activeSenderProfile.language === 'fr'
        ? 'votre entreprise'
        : activeSenderProfile.language === 'it'
          ? 'la Vostra azienda'
          : 'su empresa';

    const contactName = lead?.name || lead?.company_name || defaultContactByLang;
    const companyName = lead?.company_name || lead?.legal_name || lead?.name || defaultCompanyByLang;

    return templateText
      .replace(/\{\{nome_contato\}\}/gi, contactName)
      .replace(/\{\{nome\}\}/gi, contactName)
      .replace(/\{\{company_name\}\}/gi, companyName)
      .replace(/\{\{empresa\}\}/gi, companyName)
      .replace(/\{\{vendedor_nome\}\}/gi, senderName)
      .replace(/\{\{vendedor_email\}\}/gi, senderEmail)
      .replace(/\{\{vendedor_telefone\}\}/gi, senderPhone);
  };

  // Update Subject & HTML whenever selected material, sender or lead changes
  useEffect(() => {
    if (selectedSourceType === 'builtin') {
      const mat = builtinMaterials.find((m) => m.id === selectedId) || builtinMaterials[0];
      if (!mat) return;
      const compSuffix = lead?.company_name || lead?.name || '';
      const sub = compSuffix ? `${mat.subject} — ${compSuffix}` : mat.subject;
      setEmailSubject(sub);
      setEmailHtml(renderTemplateTags(mat.htmlBody));
    } else {
      const tmpl = dbTemplates.find((t) => t.id === selectedId);
      if (tmpl) {
        setEmailSubject(tmpl.subject ? renderTemplateTags(tmpl.subject) : `${activeBrandConfig.companyFull}`);
        setEmailHtml(renderTemplateTags(tmpl.html_content || ''));
      }
    }
  }, [selectedId, selectedSourceType, builtinMaterials, lead, senderName, senderEmail, senderPhone, dbTemplates]);

  const currentBuiltinMaterial = useMemo(() => {
    if (selectedSourceType !== 'builtin') return null;
    return builtinMaterials.find((m) => m.id === selectedId) || builtinMaterials[0] || null;
  }, [selectedSourceType, builtinMaterials, selectedId]);

  const currentMaterialTitle = useMemo(() => {
    if (selectedSourceType === 'builtin' && currentBuiltinMaterial) {
      return `${currentBuiltinMaterial.title} (${activeBrandConfig.companyFull})`;
    }
    const tmpl = dbTemplates.find((t) => t.id === selectedId);
    return tmpl?.title || 'Template Comercial';
  }, [selectedSourceType, currentBuiltinMaterial, activeBrandConfig.companyFull, selectedId, dbTemplates]);

  // Direct Send via Microsoft 365 Edge Function with PDF Attachment
  const handleSendViaM365 = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Informe um e-mail de destino válido.');
      return;
    }

    try {
      setIsSendingM365(true);

      let finalHtml = emailHtml;
      if (extraNote.trim()) {
        const noteTitle =
          activeSenderProfile.language === 'fr'
            ? 'Note complémentaire suite à notre échange :'
            : activeSenderProfile.language === 'it'
              ? 'Nota aggiuntiva dalla nostra chiamata:'
              : 'Nota adicional de nuestra llamada:';
        const extraBlock = `<div style="margin:16px 0;padding:14px 16px;background-color:#f8fafc;border-left:4px solid ${activeBrandConfig.accentColor};border-radius:8px;font-size:13px;color:#1e293b;"><p style="margin:0;font-weight:700;color:#0f172a;">${noteTitle}</p><p style="margin:5px 0 0 0;line-height:1.5;">${extraNote.replace(/\n/g, '<br/>')}</p></div>`;

        if (finalHtml.includes('<!-- EXTRA_NOTE_SLOT -->')) {
          finalHtml = finalHtml.replace('<!-- EXTRA_NOTE_SLOT -->', extraBlock);
        } else {
          finalHtml += extraBlock;
        }
      } else {
        finalHtml = finalHtml.replace('<!-- EXTRA_NOTE_SLOT -->', '');
      }

      // Build PDF attachments array if enabled
      const attachments: Array<{ name: string; contentType: string; contentBytes: string }> = [];
      if (attachPdfFile && currentBuiltinMaterial) {
        const primaryPdfUrl = `/assets/materials/${currentBuiltinMaterial.pdfFilename}`;
        const primaryB64 = await fetchPdfAsBase64(primaryPdfUrl);
        if (primaryB64) {
          attachments.push({
            name: currentBuiltinMaterial.pdfFilename,
            contentType: 'application/pdf',
            contentBytes: primaryB64,
          });
        }
        if (currentBuiltinMaterial.secondaryPdfFilename) {
          const secPdfUrl = `/assets/materials/${currentBuiltinMaterial.secondaryPdfFilename}`;
          const secB64 = await fetchPdfAsBase64(secPdfUrl);
          if (secB64) {
            attachments.push({
              name: currentBuiltinMaterial.secondaryPdfFilename,
              contentType: 'application/pdf',
              contentBytes: secB64,
            });
          }
        }
      }

      const payload = {
        senderEmail,
        senderName,
        recipientEmail: recipientEmail.trim(),
        subject: emailSubject,
        htmlContent: finalHtml,
        leadId: lead?.id,
        queueItemId: queueItemId || null,
        empresaId: activeSenderProfile.empresaId || selectedEmpresaId,
        updateLeadEmail,
        userId: user?.id || activeSenderProfile.userId,
        materialTitle: currentMaterialTitle,
        attachments,
      };

      const { data, error } = await supabase.functions.invoke('send-commercial-email', {
        body: payload,
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'Falha ao enviar e-mail via Microsoft Graph');
      }

      toast.success(
        `Material enviado via Microsoft 365 (${senderEmail}) para ${recipientEmail}${
          attachments.length > 0 ? ` com ${attachments.length} PDF(s) em anexo!` : '!'
        }`
      );

      if (updateLeadEmail && lead && lead.email !== recipientEmail.trim()) {
        const updated = { ...lead, email: recipientEmail.trim() };
        if (onLeadUpdated) {
          onLeadUpdated(updated);
        }
      }

      const notesSummary = `E-mail M365 enviado: "${currentMaterialTitle}" de ${senderEmail} para ${recipientEmail}${
        attachments.length > 0 ? ` [Anexo: ${attachments.map((a) => a.name).join(', ')}]` : ''
      }.`;
      onConfirm(currentMaterialTitle, recipientEmail, notesSummary);
      onClose();
    } catch (err: any) {
      console.error('Erro ao enviar e-mail comercial via M365:', err);
      toast.error(err.message || 'Erro ao enviar e-mail pelo Microsoft 365. Verifique a caixa do operador.');
    } finally {
      setIsSendingM365(false);
    }
  };

  const handleOpenMailto = () => {
    if (!recipientEmail) {
      toast.error('Informe o e-mail de destino');
      return;
    }
    const plainTextBody = emailHtml
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plainTextBody)}`;
    window.open(mailtoUrl, '_blank');
    toast.success('Cliente de e-mail local aberto!');
  };

  const handleCopyText = () => {
    const plainTextBody = emailHtml
      .replace(/<[^>]+>/g, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    navigator.clipboard.writeText(`${emailSubject}\n\n${plainTextBody}`);
    setCopied(true);
    toast.success('Texto copiado com sucesso!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!lead?.phone) {
      toast.error('Lead não possui telefone cadastrado');
      return;
    }
    const cleanNumber = lead.phone.replace(/\D/g, '');
    const pdfLink = currentBuiltinMaterial
      ? `${originUrl}/assets/materials/${currentBuiltinMaterial.pdfFilename}`
      : activeBrandConfig.website;

    const waMessage =
      activeSenderProfile.language === 'fr'
        ? `Bonjour ${lead.name || ''}, suite à notre échange téléphonique, voici le lien direct vers notre documentation technique (${activeBrandConfig.companyFull}) :\n📄 ${pdfLink}\n\nCordialement,\n${senderName} (${senderEmail})`
        : activeSenderProfile.language === 'it'
          ? `Gentile ${lead.name || ''}, in seguito alla nostra conversazione telefonica, condivido il link diretto alla nostra documentazione tecnica (${activeBrandConfig.companyFull}):\n📄 ${pdfLink}\n\nCordiali saluti,\n${senderName} (${senderEmail})`
          : `Hola ${lead.name || ''}, siguiendo nuestra conversación telefónica, le comparto el enlace directo a nuestra documentación técnica (${activeBrandConfig.companyFull}):\n📄 ${pdfLink}\n\nUn cordial saludo,\n${senderName} (${senderEmail})`;

    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(waMessage)}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSendingM365 && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[94vh] flex flex-col p-0 bg-card border-border text-foreground shadow-2xl overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 pb-3.5 border-b border-border bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex flex-wrap items-center gap-2">
                  Enviar Material Comercial & Dossiê
                  <Badge className="bg-blue-600 text-white border-none text-[10px] flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Microsoft 365 Direto + PDF Anexo
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {lead
                    ? `Empresa: ${lead.company_name || lead.name} • Contato: ${lead.name || 'Decisor'}`
                    : 'Dispare a Apresentação Executiva ou Dossiê Técnico oficial com PDF anexado pela conta M365 do vendedor'}
                </DialogDescription>
              </div>
            </div>

            {/* Remetente M365 Ativo */}
            <div className="flex flex-col sm:items-end text-xs bg-background/80 px-3 py-1.5 rounded-xl border border-border shrink-0">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-emerald-500" />
                {activeSenderProfile.flag} {activeSenderProfile.shortName} • {activeBrandConfig.companyFull}
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                {senderEmail}
              </span>
            </div>
          </div>

          {/* Seletor rápido dos 6 Comerciais (visível para Super Admin / Gestores ou para conferência) */}
          {!isCommercialOperator && (
            <div className="mt-3 pt-2.5 border-t border-border/60 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground mr-1">
                Vendedor / Conta M365:
              </span>
              {ACTIVE_COMMERCIAL_PROFILES.map((prof) => {
                const active = prof.ownerKey === activeSenderProfile.ownerKey;
                return (
                  <button
                    key={prof.ownerKey}
                    type="button"
                    onClick={() => setSelectedSenderKey(prof.ownerKey)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 border ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-background/70 text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <span>{prof.flag}</span>
                    <span>{prof.shortName}</span>
                    <span className={`text-[10px] ${active ? 'text-blue-100' : 'text-muted-foreground/80'}`}>
                      ({prof.empresaName})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Destinatário & Opções de Anexo */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                E-mail de Destino do Decisor (Cliente)
              </Label>
              {lead?.email && lead.email !== recipientEmail && (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                  E-mail atualizado na chamada
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-6">
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Ex: compras@empresa.es ou direction@industrie.fr"
                  className="bg-background text-xs h-9 font-medium"
                  required
                />
              </div>

              <div className="md:col-span-3 flex items-center space-x-2">
                <Checkbox
                  id="updateLeadEmail"
                  checked={updateLeadEmail}
                  onCheckedChange={(checked) => setUpdateLeadEmail(Boolean(checked))}
                />
                <label
                  htmlFor="updateLeadEmail"
                  className="text-[11px] font-medium leading-none text-muted-foreground cursor-pointer"
                >
                  Salvar e-mail no Lead
                </label>
              </div>

              <div className="md:col-span-3 flex items-center space-x-2">
                <Checkbox
                  id="attachPdfFile"
                  checked={attachPdfFile}
                  onCheckedChange={(checked) => setAttachPdfFile(Boolean(checked))}
                />
                <label
                  htmlFor="attachPdfFile"
                  className="text-[11px] font-semibold leading-none text-blue-600 dark:text-blue-400 cursor-pointer flex items-center gap-1"
                >
                  <Paperclip className="w-3 h-3" /> Anexar PDF Oficial
                </label>
              </div>
            </div>
          </div>

          {/* Seleção do Tipo de Material / Template */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Selecione o Material Oficial de {activeBrandConfig.companyFull} ({activeSenderProfile.country}):
              </Label>

              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSourceType('builtin');
                    setSelectedId('apresentacao_executiva');
                  }}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    selectedSourceType === 'builtin'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Materiais Oficiais ({builtinMaterials.length})
                </button>
                {dbTemplates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSourceType('template');
                      if (dbTemplates[0]) setSelectedId(dbTemplates[0].id);
                    }}
                    className={`px-2.5 py-1 rounded font-semibold transition-all ${
                      selectedSourceType === 'template'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Templates MKT ({dbTemplates.length})
                  </button>
                )}
              </div>
            </div>

            {selectedSourceType === 'builtin' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {builtinMaterials.map((mat) => {
                  const isSelected = selectedId === mat.id;
                  const pdfHref = `/assets/materials/${mat.pdfFilename}`;
                  const IconComponent =
                    mat.id === 'apresentacao_executiva'
                      ? Layers
                      : mat.id === 'dossier_tecnico'
                        ? ShieldCheck
                        : ClipboardList;

                  return (
                    <div
                      key={mat.id}
                      onClick={() => setSelectedId(mat.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all text-left flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500 text-foreground shadow-sm ring-1 ring-blue-500'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">
                            <IconComponent className="w-3 h-3" />
                            {mat.badge}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                        </div>
                        <h4 className="text-xs font-bold text-foreground leading-snug mb-1">{mat.title}</h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
                          {mat.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between">
                        <a
                          href={pdfHref}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
                        >
                          <ExternalLink className="w-3 h-3" /> Abrir PDF ({mat.pdfFilename.split('-')[0]})
                        </a>
                        {mat.secondaryPdfFilename && (
                          <a
                            href={`/assets/materials/${mat.secondaryPdfFilename}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            + Apresentação
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {dbTemplates.map((tmpl: MarketingTemplate) => {
                  const isSelected = selectedId === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedId(tmpl.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all text-left ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500 text-foreground shadow-sm ring-1 ring-blue-500'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-foreground truncate">{tmpl.title}</h4>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{tmpl.subject || 'Sem assunto'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assunto & Recado Adicional em Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Assunto do E-mail:</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="text-xs h-9 bg-background font-medium"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Recado Personalizado da Ligação (Opcional):
              </Label>
              <Input
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                placeholder="Ex: Conforme falamos, temos 4 soldadores TIG disponíveis na próxima semana."
                className="text-xs h-9 bg-background"
              />
            </div>
          </div>

          {/* Prévia Visual Rica do E-mail */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Pré-visualização do Corpo do E-mail (HTML Rico):
                </Label>
                {attachPdfFile && currentBuiltinMaterial && (
                  <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-600 dark:text-blue-400 gap-1">
                    <Paperclip className="w-2.5 h-2.5" />
                    Anexo: {currentBuiltinMaterial.pdfFilename}
                    {currentBuiltinMaterial.secondaryPdfFilename ? ' + Apresentação' : ''}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyText}
                  className="h-7 text-xs border-input gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copiar Texto
                </Button>
                {lead?.phone && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleWhatsAppShare}
                    className="h-7 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Enviar Link no WhatsApp
                  </Button>
                )}
              </div>
            </div>

            <div
              className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/70 border border-border text-xs overflow-y-auto max-h-64 shadow-inner"
              dangerouslySetInnerHTML={{
                __html: extraNote.trim()
                  ? emailHtml.replace(
                      '<!-- EXTRA_NOTE_SLOT -->',
                      `<div style="margin:14px 0;padding:12px 14px;background-color:#f8fafc;border-left:4px solid ${activeBrandConfig.accentColor};border-radius:8px;font-size:13px;color:#1e293b;"><strong>Nota:</strong> ${extraNote.replace(/\n/g, '<br/>')}</div>`
                    )
                  : emailHtml,
              }}
            />
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSendingM365}
              className="text-xs"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={handleOpenMailto}
              disabled={isSendingM365}
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
              title="Abrir no cliente local Outlook se preferir"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Abrir no Outlook Local
            </Button>
          </div>

          <Button
            type="button"
            onClick={handleSendViaM365}
            disabled={isSendingM365 || isSubmitting}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-2.5 gap-2 shadow-lg shadow-blue-600/25 transition-all"
          >
            {isSendingM365 ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando via {senderEmail}...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar por {senderEmail} e Avançar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
