import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReplacementPdfData {
  codigo: string;
  title: string;
  created_at: string;
  due_date: string | null;
  clientName: string;
  siteName: string;
  workerName: string;
  workerCodColab: string | null;
  workerFuncion: string;
  reason: string;
  notes: string | null;
}

export function printReplacementDoc(data: ReplacementPdfData) {
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const docDate = format(new Date(data.created_at), "dd/MM/yyyy 'às' HH:mm");
  const targetDate = data.due_date 
    ? format(new Date(data.due_date), "dd/MM/yyyy") 
    : 'Imediato';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
        <meta charset="UTF-8">
        <title>Solicitação de Substituição - ${data.codigo}</title>
        <style>
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .no-print {
                    display: none;
                }
            }
            @page {
                size: A4;
                margin: 20mm;
            }
            body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                color: #1e293b;
                line-height: 1.5;
                font-size: 13px;
                margin: 0;
                padding: 0;
            }
            .header-container {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #6366f1;
                padding-bottom: 15px;
                margin-bottom: 25px;
            }
            .logo-section {
                font-weight: 800;
                font-size: 20px;
                color: #4f46e5;
                letter-spacing: -0.5px;
            }
            .doc-title-section {
                text-align: right;
            }
            .doc-title {
                font-size: 16px;
                font-weight: 700;
                color: #1e293b;
                margin: 0;
            }
            .doc-code {
                font-mono: true;
                font-size: 14px;
                font-weight: 600;
                color: #4f46e5;
                margin-top: 2px;
            }
            .section-title {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #64748b;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 5px;
                margin-top: 25px;
                margin-bottom: 12px;
            }
            .grid-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 20px;
            }
            .info-card {
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 15px;
            }
            .info-row {
                display: flex;
                margin-bottom: 8px;
            }
            .info-row:last-child {
                margin-bottom: 0;
            }
            .info-label {
                font-weight: 600;
                color: #475569;
                width: 140px;
                flex-shrink: 0;
            }
            .info-value {
                color: #0f172a;
            }
            .reason-box {
                background-color: #faf5ff;
                border: 1px solid #e9d5ff;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
            }
            .reason-text {
                font-size: 14px;
                color: #581c87;
                font-weight: 550;
            }
            .notes-text {
                font-style: italic;
                color: #475569;
                margin-top: 8px;
            }
            .signatures-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                margin-top: 60px;
                page-break-inside: avoid;
            }
            .signature-block {
                text-align: center;
            }
            .signature-line {
                border-top: 1px solid #cbd5e1;
                margin-top: 50px;
                margin-bottom: 6px;
            }
            .signature-role {
                font-size: 11px;
                color: #64748b;
                font-weight: 500;
            }
            .footer-info {
                text-align: center;
                font-size: 10px;
                color: #94a3b8;
                margin-top: 80px;
                border-top: 1px solid #f1f5f9;
                padding-top: 10px;
            }
        </style>
        <script>
            window.onload = function() {
                window.print();
            }
        </script>
    </head>
    <body>
        <div class="header-container">
            <div class="logo-section">
                KOTRIK / KOTRILUX
            </div>
            <div class="doc-title-section">
                <h1 class="doc-title">SUBSTITUIÇÃO OPERATIVA (REEMPLAZO)</h1>
                <div class="doc-code">${data.codigo}</div>
            </div>
        </div>

        <div class="section-title">Dados de Registro</div>
        <div class="grid-container">
            <div class="info-card">
                <div class="info-row">
                    <span class="info-label">Cliente:</span>
                    <span class="info-value"><strong>${data.clientName}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Obra / Local:</span>
                    <span class="info-value">${data.siteName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Cargo / Função:</span>
                    <span class="info-value">${data.workerFuncion}</span>
                </div>
            </div>
            <div class="info-card">
                <div class="info-row">
                    <span class="info-label">Data Solicitação:</span>
                    <span class="info-value">${docDate}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Previsão Início:</span>
                    <span class="info-value"><strong>${targetDate}</strong></span>
                </div>
            </div>
        </div>

        <div class="section-title">Trabalhador a Substituir</div>
        <div class="info-card">
            <div class="info-row">
                <span class="info-label">Nome:</span>
                <span class="info-value"><strong>${data.workerName}</strong></span>
            </div>
            ${data.workerCodColab ? `
            <div class="info-row">
                <span class="info-label">Cód. Colaborador:</span>
                <span class="info-value font-mono">${data.workerCodColab}</span>
            </div>
            ` : ''}
            <div class="info-row">
                <span class="info-label">Perfil Original:</span>
                <span class="info-value">${data.workerFuncion}</span>
            </div>
        </div>

        <div class="section-title">Motivação da Substituição</div>
        <div class="reason-box">
            <div class="reason-text">${data.reason}</div>
            ${data.notes ? `<div class="notes-text">Observações adicionais: ${data.notes}</div>` : ''}
        </div>

        <div class="signatures-container">
            <div class="signature-block">
                <div class="signature-line"></div>
                <strong>Direção de Operações</strong>
                <div class="signature-role">Aprovado por Operações</div>
            </div>
            <div class="signature-block">
                <div class="signature-line"></div>
                <strong>Departamento de RH / Contratação</strong>
                <div class="signature-role">Planejamento e Execução</div>
            </div>
        </div>

        <div class="footer-info">
            Documento gerado eletronicamente em ${today}. Kotrik Gestão de Pessoal e Operações.
        </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
